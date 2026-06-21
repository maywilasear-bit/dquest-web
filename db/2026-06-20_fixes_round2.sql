-- =============================================================================
-- D-Quest — แก้บั๊กรอบ 2 (21 มิ.ย. 2026)
-- รันทั้งไฟล์ใน Supabase -> SQL Editor -> Run · ปลอดภัย รันซ้ำได้
--
-- 1) แก้ "DELETE requires a WHERE clause" (Supabase บังคับ WHERE)
-- 2) ทำให้ระงับบัญชี (suspended) มีผลจริง — เด็กที่ถูกระงับเล่นไม่ได้
-- 3) Hall of Fame ส่ง avatar ออกมาให้หน้าเว็บวาด
-- 4) audit_log ลบได้ (admin)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) แก้ DELETE ให้มี WHERE
-- -----------------------------------------------------------------------------
create or replace function admin_clear_hof()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  delete from hall_of_fame where id is not null;
  insert into audit_log(actor_id, action, details) values (me(), 'admin_clear_hof', '{}'::jsonb);
end $$;
grant execute on function admin_clear_hof() to authenticated;

create or replace function admin_reset_seasons()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update submissions set season_id = null where season_id is not null;
  update ledger set ref_season = null where ref_season is not null;
  delete from season_scores where id is not null;
  delete from hall_of_fame where id is not null;
  delete from seasons where id is not null;
  insert into seasons(number, theme_label, icon, featured_departments, starts_at, ends_at, status)
    values (1, 'ยานยนต์ / เครื่องกล', '⚙️', array['ช่างยนต์','เทคนิคเครื่องกล'], now(), now() + interval '21 days', 'active');
  insert into audit_log(actor_id, action, details) values (me(), 'admin_reset_seasons', '{}'::jsonb);
  return json_build_object('ok', true);
end $$;
grant execute on function admin_reset_seasons() to authenticated;

-- -----------------------------------------------------------------------------
-- (2) ระงับบัญชีให้มีผลจริง: ตัวช่วยเช็ค "บัญชีใช้งานอยู่" + ใส่ด่านใน RPC หลัก
-- -----------------------------------------------------------------------------
create or replace function am_active() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select p.status = 'active' from profiles p where p.auth_id = auth.uid()), false)
$$;
grant execute on function am_active() to anon, authenticated;

-- submit_deed (เหมือนเดิมทุกอย่าง + ด่าน am_active)
drop function if exists submit_deed(int, text, text);
create or replace function submit_deed(
  p_deed int, p_photo text, p_desc text,
  p_lat double precision default null, p_lng double precision default null
)
returns submissions language plpgsql security definer set search_path = public as $$
declare
  s submissions;
  cap int; used int; cur uuid; pending_cnt int; today_total int; nowt time;
  max_pending constant int := 10;
  max_per_day constant int := 20;
begin
  if my_role() <> 'student' then raise exception 'students only'; end if;
  if not am_active() then raise exception 'บัญชีถูกระงับ — ติดต่ออาจารย์'; end if;

  nowt := (now() at time zone 'Asia/Bangkok')::time;
  if nowt < time '07:35' or nowt > time '16:00' then
    raise exception 'ส่งความดีได้เฉพาะเวลา 07:35–16:00 น. เท่านั้น';
  end if;

  select count(*) into pending_cnt from submissions
    where student_id = me() and status = 'pending';
  if pending_cnt >= max_pending then
    raise exception 'คุณมีรายการรอครูตรวจ % รายการแล้ว รอให้ครูตรวจก่อนค่อยส่งใหม่', pending_cnt;
  end if;

  select count(*) into today_total from submissions
    where student_id = me() and created_at >= date_trunc('day', now());
  if today_total >= max_per_day then
    raise exception 'วันนี้ส่งความดีครบ % รายการแล้ว พรุ่งนี้ค่อยส่งใหม่นะ', max_per_day;
  end if;

  select id into cur from seasons where status = 'active' order by number desc limit 1;

  select daily_cap into cap from deed_types where id = p_deed and active;
  if cap is not null then
    select count(*) into used from submissions
      where student_id = me() and deed_type_id = p_deed and created_at >= date_trunc('day', now());
    if used >= cap then
      raise exception 'ความดีประเภทนี้วันนี้ส่งครบ % รายการแล้ว ลองประเภทอื่นดูนะ', cap;
    end if;
  end if;

  insert into submissions(student_id, deed_type_id, season_id, photo_path, description, lat, lng)
    values (me(), p_deed, cur, p_photo, p_desc, p_lat, p_lng) returning * into s;
  return s;
end $$;
grant execute on function submit_deed(int, text, text, double precision, double precision) to authenticated;

-- daily_checkin (เหมือนเดิม + ด่าน am_active)
create or replace function daily_checkin()
returns json language plpgsql security definer set search_path = public as $$
declare me_id uuid; a record; today date; new_streak int; reward int; new_bal int;
  cyc int[] := array[10,10,15,15,20,20,50];
begin
  select id into me_id from profiles where auth_id = auth.uid();
  if me_id is null then raise exception 'not active'; end if;
  if not am_active() then raise exception 'บัญชีถูกระงับ — ติดต่ออาจารย์'; end if;
  today := (now() at time zone 'Asia/Bangkok')::date;
  select last_checkin, checkin_streak, d_coin_balance into a from account_stats where profile_id = me_id for update;
  if a.last_checkin = today then
    return json_build_object('ok', false, 'streak', a.checkin_streak, 'd_coin', coalesce(a.d_coin_balance,0));
  end if;
  if a.last_checkin = today - 1 then new_streak := a.checkin_streak + 1; else new_streak := 1; end if;
  reward := cyc[((new_streak - 1) % 7) + 1];
  new_bal := coalesce(a.d_coin_balance,0) + reward;
  update account_stats set d_coin_balance = new_bal, last_checkin = today, checkin_streak = new_streak where profile_id = me_id;
  insert into ledger(profile_id, currency, amount, reason) values (me_id, 'dcoin', reward, 'daily_checkin');
  return json_build_object('ok', true, 'reward', reward, 'streak', new_streak, 'd_coin', new_bal);
end $$;
grant execute on function daily_checkin() to authenticated;

-- gacha_pull (เหมือนเดิม + ด่าน am_active)
create or replace function gacha_pull()
returns json language plpgsql security definer set search_path = public as $$
declare
  me_id uuid; cost int := 10; bal int; total int; r int;
  won_id int; won_name text; won_rarity text; won_color text; is_new boolean; refund int := 0;
begin
  me_id := me();
  if me_id is null then raise exception 'not active'; end if;
  if my_role() <> 'student' then raise exception 'students only'; end if;
  if not am_active() then raise exception 'บัญชีถูกระงับ — ติดต่ออาจารย์'; end if;
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
-- (3) Hall of Fame ส่ง avatar ออกมา (วาดตัวละครในหน้า /hall)
-- -----------------------------------------------------------------------------
create or replace function get_hall_of_fame()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(s) order by s.number desc), '[]'::json)
  from (
    select
      se.number, se.theme_label, se.icon,
      array_to_string(se.featured_departments, ' / ') as dept_label,
      (select coalesce(json_agg(json_build_object(
                 'rank', h.rank, 'name', coalesce(h.displayname_snapshot, h.realname_snapshot),
                 'realname', h.realname_snapshot, 'score', h.d_score, 'avatar', h.avatar_snapshot) order by h.rank), '[]'::json)
       from hall_of_fame h where h.season_id = se.id and h.scope = 'college') as college,
      (select coalesce(json_agg(json_build_object(
                 'rank', h.rank, 'name', coalesce(h.displayname_snapshot, h.realname_snapshot),
                 'realname', h.realname_snapshot, 'score', h.d_score, 'avatar', h.avatar_snapshot) order by h.rank), '[]'::json)
       from hall_of_fame h where h.season_id = se.id and h.scope = 'department') as department
    from seasons se
    where se.status = 'ended'
      and exists (select 1 from hall_of_fame h2 where h2.season_id = se.id)
  ) s
$$;
grant execute on function get_hall_of_fame() to authenticated;

-- -----------------------------------------------------------------------------
-- (4) audit_log ลบได้ (admin) — มีถามยืนยันเข้มในหน้าเว็บ
-- -----------------------------------------------------------------------------
create or replace function admin_clear_audit()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  delete from audit_log where id is not null;
end $$;
grant execute on function admin_clear_audit() to authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
