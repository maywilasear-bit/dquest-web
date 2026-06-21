-- =============================================================================
-- D-Quest — Admin console: คุมบัญชี/ซีซั่น/HoF แบบอิสระ (20 มิ.ย. 2026)
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย (create or replace) รันซ้ำได้
-- ทุกฟังก์ชัน admin-only + ลง audit_log (audit เก็บถาวร ลบไม่ได้ = ความโปร่งใส)
-- =============================================================================

-- ---------- เลือกดูบัญชีตามหมวด (ทั้งหมด/ยังไม่สมัคร/ใช้งานอยู่) ----------
create or replace function admin_list_students(p_status text default 'all', q text default '')
returns table(id uuid, fullname text, group_name text, status profile_status_t)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
    select p.id, p.fullname, p.group_name, p.status
    from profiles p
    where p.role = 'student'
      and (p_status = 'all' or p.status::text = p_status)
      and (q = '' or p.fullname ilike '%' || q || '%')
    order by p.group_name nulls last, p.fullname
    limit 80;
end $$;
grant execute on function admin_list_students(text, text) to authenticated;

-- ---------- ข้อมูลบัญชีรายคน (ค่าปัจจุบัน) ----------
create or replace function admin_account_info(p_profile uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare cur uuid; result json;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select id into cur from seasons where status = 'active' order by number desc limit 1;
  select json_build_object(
    'status', p.status,
    'display_name', p.display_name,
    'd_coin', coalesce(a.d_coin_balance, 0),
    'behavior', coalesce(a.behavior_points, 0),
    'd_score', coalesce((select ss.d_score from season_scores ss where ss.profile_id = p_profile and ss.season_id = cur), 0),
    'inv_count', coalesce((select count(*) from inventory i where i.profile_id = p_profile), 0)
  ) into result
  from profiles p left join account_stats a on a.profile_id = p.id
  where p.id = p_profile;
  return result;
end $$;
grant execute on function admin_account_info(uuid) to authenticated;

-- ---------- ตั้งค่า D Score / D Coin / ความประพฤติ (อิสระ ไม่จำกัด) ----------
create or replace function admin_set_stat(p_profile uuid, p_field text, p_value int)
returns void language plpgsql security definer set search_path = public as $$
declare cur uuid; old_v int;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_field = 'dscore' then
    select id into cur from seasons where status = 'active' order by number desc limit 1;
    if cur is null then raise exception 'no active season'; end if;
    insert into season_scores(profile_id, season_id, d_score) values (p_profile, cur, p_value)
      on conflict (profile_id, season_id) do update set d_score = excluded.d_score, updated_at = now();
  elsif p_field = 'dcoin' then
    select d_coin_balance into old_v from account_stats where profile_id = p_profile;
    update account_stats set d_coin_balance = p_value, updated_at = now() where profile_id = p_profile;
    insert into ledger(profile_id, currency, amount, reason, created_by)
      values (p_profile, 'dcoin', p_value - coalesce(old_v, 0), 'admin set balance', me());
  elsif p_field = 'behavior' then
    update account_stats set behavior_points = p_value, updated_at = now() where profile_id = p_profile;  -- ไม่ clamp (อิสระ)
  else
    raise exception 'invalid field';
  end if;
  insert into audit_log(actor_id, action, target_profile, details)
    values (me(), 'admin_set_' || p_field, p_profile, jsonb_build_object('value', p_value));
end $$;
grant execute on function admin_set_stat(uuid, text, int) to authenticated;

-- ---------- ล้างของในกระเป๋า ----------
create or replace function admin_clear_inventory(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  delete from inventory where profile_id = p_profile;
  insert into audit_log(actor_id, action, target_profile, details)
    values (me(), 'admin_clear_inventory', p_profile, '{}'::jsonb);
end $$;
grant execute on function admin_clear_inventory(uuid) to authenticated;

-- ---------- ระงับ / ปลดระงับบัญชี ----------
create or replace function admin_set_status(p_profile uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'invalid status'; end if;
  update profiles set status = p_status::profile_status_t, updated_at = now()
    where id = p_profile and role = 'student';
  insert into audit_log(actor_id, action, target_profile, details)
    values (me(), 'admin_set_status', p_profile, jsonb_build_object('status', p_status));
end $$;
grant execute on function admin_set_status(uuid, text) to authenticated;

-- ---------- ล้าง Hall of Fame ทั้งหมด ----------
create or replace function admin_clear_hof()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  delete from hall_of_fame;
  insert into audit_log(actor_id, action, details) values (me(), 'admin_clear_hof', '{}'::jsonb);
end $$;
grant execute on function admin_clear_hof() to authenticated;

-- ---------- RESET ระบบซีซั่นกลับไปซีซั่น 1 (ล้าง D Score ทุกคน + HoF) ----------
-- ใช้ตอนขึ้นเทอมใหม่/รีเซ็ตทดสอบ · destructive — ในหน้าเว็บมีถามยืนยัน
create or replace function admin_reset_seasons()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  -- ปลด FK ก่อน (submissions/ledger อ้าง season)
  update submissions set season_id = null where season_id is not null;
  update ledger set ref_season = null where ref_season is not null;
  delete from season_scores;     -- ล้าง D Score ทุกคนทุกซีซั่น
  delete from hall_of_fame;       -- ล้างแชมป์เก่า
  delete from seasons;            -- ลบซีซั่นทั้งหมด
  insert into seasons(number, theme_label, icon, featured_departments, starts_at, ends_at, status)
    values (1, 'ยานยนต์ / เครื่องกล', '⚙️', array['ช่างยนต์','เทคนิคเครื่องกล'], now(), now() + interval '21 days', 'active');
  insert into audit_log(actor_id, action, details) values (me(), 'admin_reset_seasons', '{}'::jsonb);
  return json_build_object('ok', true);
end $$;
grant execute on function admin_reset_seasons() to authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- (D Coin + ของในกระเป๋า "ไม่" ถูกแตะโดย reset_seasons — ถาวรตามเดิม)
-- =============================================================================
