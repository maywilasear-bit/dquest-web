-- =============================================================================
-- D-Quest — อาจารย์ให้ D Coin แก่นักศึกษา (งานที่อาจารย์มอบหมาย) — 20 มิ.ย. 2026
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย (create or replace) รันซ้ำได้
--
-- เปลี่ยนวัฒนธรรม "ใช้เด็กฟรี" → "ใช้เด็กโดยชอบธรรม": อาจารย์สั่งงาน แล้วกดให้เหรียญ
-- ให้ "D Coin" เท่านั้น (สกุลสะสม/กาชา) — ไม่แตะ D Score เพื่อให้กระดานแข่งสะอาด 100%
-- ทุกครั้งลง ledger + audit_log (ตรวจย้อนได้: ใครให้ ให้ใคร เพราะอะไร)
-- =============================================================================
create or replace function award_coins(p_student uuid, p_amount int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare giver text;
begin
  if not is_staff() then raise exception 'staff only'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100 then
    raise exception 'จำนวนเหรียญต้องอยู่ระหว่าง 1–100';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'ต้องระบุเหตุผล';
  end if;
  if not exists (select 1 from profiles p where p.id = p_student and p.role = 'student') then
    raise exception 'ผู้รับต้องเป็นนักศึกษา';
  end if;

  select coalesce(display_name, fullname) into giver from profiles where id = me();

  update account_stats set d_coin_balance = d_coin_balance + p_amount, updated_at = now()
    where profile_id = p_student;

  insert into ledger(profile_id, currency, amount, reason, created_by)
    values (p_student, 'dcoin', p_amount, 'งานที่อาจารย์มอบหมาย: ' || p_reason, me());

  insert into notifications(profile_id, type, title, body)
    values (p_student, 'reward', 'ได้รับเหรียญ D จากอาจารย์',
            'ได้รับ ' || p_amount || ' เหรียญ D · ' || p_reason || ' · โดย ' || coalesce(giver, 'เจ้าหน้าที่'));

  insert into audit_log(actor_id, action, target_profile, details)
    values (me(), 'award_coins', p_student, jsonb_build_object('amount', p_amount, 'reason', p_reason));
end $$;
grant execute on function award_coins(uuid, int, text) to authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
