-- =============================================================================
-- D-Quest — Admin รอบ 2: ลบประกาศ + override เพศ (21 มิ.ย. 2026)
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย รันซ้ำได้
-- =============================================================================

-- ลบประกาศ (staff) — แก้ปัญหา "ประกาศลบไม่ได้"
create or replace function admin_delete_announcement(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'staff only'; end if;
  delete from announcements where id = p_id;
  insert into audit_log(actor_id, action, details) values (me(), 'delete_announcement', jsonb_build_object('id', p_id));
end $$;
grant execute on function admin_delete_announcement(uuid) to authenticated;

-- override เพศ (admin) — เผื่อข้อมูลคำนำหน้าผิด (กระทบทรงผมเริ่มต้น/avatar)
create or replace function admin_set_gender(p_profile uuid, p_gender text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_gender not in ('male', 'female', 'unknown') then raise exception 'invalid gender'; end if;
  update profiles set gender = p_gender::gender_t, updated_at = now() where id = p_profile and role = 'student';
  insert into audit_log(actor_id, action, target_profile, details)
    values (me(), 'admin_set_gender', p_profile, jsonb_build_object('gender', p_gender));
end $$;
grant execute on function admin_set_gender(uuid, text) to authenticated;

-- account_info: เพิ่ม gender (คอนโซลบัญชีจะได้โชว์ + สลับได้)
create or replace function admin_account_info(p_profile uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare cur uuid; result json;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select id into cur from seasons where status = 'active' order by number desc limit 1;
  select json_build_object(
    'status', p.status,
    'gender', p.gender,
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

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
