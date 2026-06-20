-- =============================================================================
-- D-Quest — แก้ 4 จุดที่หลุดจากแผน (20 มิ.ย. 2026)
-- รันทั้งไฟล์นี้ครั้งเดียวใน Supabase -> SQL Editor -> New query -> วาง -> Run
-- ปลอดภัย: เป็น create or replace / drop if exists ทั้งหมด รันซ้ำได้ไม่พัง
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FIX 1 — คิวอนุมัติกรองตามครูที่ปรึกษา + อนุมัติทั้งกลุ่ม (แผน §3.3)
--   ครู: เห็นเฉพาะลูกศิษย์ของตัวเอง (student.advisor = ชื่อเต็มของครู)
--   admin: เห็นทุกคน · ครูกด "ดูทั้งหมด" เพื่อช่วยกลุ่มอื่นได้ (p_all = true)
-- -----------------------------------------------------------------------------

-- ลบเวอร์ชันเดิม (ไม่มีพารามิเตอร์) ทิ้งก่อน กันชนกับเวอร์ชันใหม่
drop function if exists list_pending_claims();

create or replace function list_pending_claims(p_all boolean default false)
returns table(claim_id uuid, profile_id uuid, fullname text, group_name text,
              department text, advisor text, requested_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare my_fullname text; am_admin boolean;
begin
  if not is_staff() then raise exception 'staff only'; end if;
  select p.fullname, (p.role = 'admin') into my_fullname, am_admin from profiles p where p.id = me();
  return query
    select c.id, p.id, p.fullname, p.group_name, p.department, p.advisor, c.requested_at
    from claims c
    join profiles p on p.id = c.profile_id
    where c.status = 'pending'
      and (am_admin or p_all or p.advisor = my_fullname)   -- ครู = เฉพาะลูกศิษย์ตัวเอง
    order by p.group_name nulls last, c.requested_at asc;
end $$;
grant execute on function list_pending_claims(boolean) to authenticated;

-- อนุมัติหลายคำขอพร้อมกัน (ปุ่ม "อนุมัติทั้งกลุ่ม")
create or replace function approve_claims_bulk(p_claim_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare cid uuid; c claims; n int := 0;
begin
  if not is_staff() then raise exception 'staff only'; end if;
  foreach cid in array p_claim_ids loop
    select * into c from claims where id = cid and status = 'pending';
    if found then
      update profiles set auth_id = c.claim_auth_id, status = 'active', updated_at = now()
        where id = c.profile_id;
      update claims set status = 'approved', decided_by = me(), decided_at = now()
        where id = cid;
      insert into audit_log(actor_id, action, target_profile, details)
        values (me(), 'approve_claim_bulk', c.profile_id, jsonb_build_object('claim', cid));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
grant execute on function approve_claims_bulk(uuid[]) to authenticated;


-- -----------------------------------------------------------------------------
-- FIX 2 — กาชาให้ตรงเศรษฐกิจของแผน (แผน §2.5/§7)
--   ราคา 50 -> 10 เหรียญ · ได้ของซ้ำ = คืนเหรียญเล็กน้อยตามระดับ
--   (คง 4 ระดับเดิมไว้เป็นการปรับปรุงที่บันทึกใน Decisions Log)
-- -----------------------------------------------------------------------------
create or replace function gacha_pull()
returns json language plpgsql security definer set search_path = public as $$
declare
  me_id uuid; cost int := 10; bal int; total int; r int;
  won_id int; won_name text; won_rarity text; won_color text; is_new boolean; refund int := 0;
begin
  me_id := me();
  if me_id is null then raise exception 'not active'; end if;
  if my_role() <> 'student' then raise exception 'students only'; end if;
  select d_coin_balance into bal from account_stats where profile_id = me_id;
  if coalesce(bal,0) < cost then raise exception 'not enough coins'; end if;

  update account_stats set d_coin_balance = d_coin_balance - cost, updated_at = now() where profile_id = me_id;
  insert into ledger(profile_id, currency, amount, reason, created_by)
    values (me_id, 'dcoin', -cost, 'gacha pull', me_id);

  select sum(weight) into total from gacha_items where active;
  r := floor(random() * total)::int;
  select id, name, rarity, color into won_id, won_name, won_rarity, won_color
  from (select gi.id, gi.name, gi.rarity, gi.color, sum(gi.weight) over (order by gi.id) as cum
        from gacha_items gi where gi.active) g
  where g.cum > r order by g.cum limit 1;

  insert into inventory(profile_id, item_id, qty) values (me_id, won_id, 1)
    on conflict (profile_id, item_id) do update set qty = inventory.qty + 1, obtained_at = now()
    returning (qty = 1) into is_new;

  -- ได้ซ้ำ -> คืนเหรียญเล็กน้อย (น้อยกว่าราคาเสมอ)
  if not is_new then
    refund := case won_rarity when 'legendary' then 8 when 'epic' then 6 when 'rare' then 4 else 2 end;
    update account_stats set d_coin_balance = d_coin_balance + refund, updated_at = now() where profile_id = me_id;
    insert into ledger(profile_id, currency, amount, reason, created_by)
      values (me_id, 'dcoin', refund, 'gacha duplicate refund', me_id);
  end if;

  return json_build_object('name', won_name, 'rarity', won_rarity, 'color', won_color,
    'is_new', is_new, 'refund', refund,
    'balance', (select d_coin_balance from account_stats where profile_id = me_id));
end $$;
grant execute on function gacha_pull() to authenticated;


-- -----------------------------------------------------------------------------
-- FIX 3 — ลบรูปหลังตรวจ: ให้ staff ลบไฟล์ใน bucket deed-photos ได้ (แผน §6.4)
--   (การบีบอัด/ย่อรูปก่อนอัป ทำฝั่งหน้าเว็บแล้วในหน้า quest)
-- -----------------------------------------------------------------------------
drop policy if exists "deed_photos_delete" on storage.objects;
create policy "deed_photos_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'deed-photos'
  and exists (select 1 from profiles where auth_id = auth.uid() and role in ('teacher','admin'))
);

-- -----------------------------------------------------------------------------
-- FIX 5 — บั๊ก column ambiguous ในฟังก์ชันเดิมของ schema (เจอตอนเทสต์ปุ่มปฏิเสธ)
--   reject_claim เขียน "note = note" → พารามิเตอร์ชนชื่อคอลัมน์ → ระบุ reject_claim.note
-- -----------------------------------------------------------------------------
create or replace function reject_claim(claim_id uuid, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c claims;
begin
  if not is_staff() then raise exception 'staff only'; end if;
  select * into c from claims where id = claim_id;
  if not found then raise exception 'claim not found'; end if;
  update claims set status = 'rejected', decided_by = me(), decided_at = now(),
                    note = reject_claim.note
    where id = claim_id;
  update profiles set status = 'unclaimed' where id = c.profile_id and auth_id is null;
end $$;
grant execute on function reject_claim(uuid, text) to anon, authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- FIX 4 (keep-alive) ไม่ต้องรัน SQL — ตั้งใน GitHub (ดู .github/workflows/keepalive.yml)
-- =============================================================================
