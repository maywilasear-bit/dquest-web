-- =============================================================================
-- D-Quest — เครื่องมือ admin: ปลดการอ้างสิทธิ์ + ดูประวัติการกระทำ (20 มิ.ย. 2026)
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย (create or replace) รันซ้ำได้
--
-- 1) admin_reset_claim: แก้เคส "สมัครผิดคน/สวมชื่อ" — ปลดบัญชีออกจาก roster row
--    ให้กลับเป็น unclaimed เพื่อให้เจ้าตัวจริงค้นชื่อสมัครใหม่ได้ (แผน §9 เฟส 0)
-- 2) admin_recent_audit: ดูว่าใครทำอะไร (อนุมัติ/ให้เหรียญ/ปลดสิทธิ์/เปลี่ยนซีซั่น)
-- =============================================================================

-- ---------- ปลดการอ้างสิทธิ์ (admin เท่านั้น) ----------
create or replace function admin_reset_claim(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if not exists (select 1 from profiles p where p.id = p_profile and p.role = 'student') then
    raise exception 'ต้องเป็นบัญชีนักศึกษา';
  end if;
  update profiles set auth_id = null, status = 'unclaimed', updated_at = now() where id = p_profile;
  update claims set status = 'rejected', decided_by = me(), decided_at = now(), note = 'ปลดโดยผู้ดูแล'
    where profile_id = p_profile and status in ('pending', 'approved');
  insert into audit_log(actor_id, action, target_profile, details)
    values (me(), 'reset_claim', p_profile, '{}'::jsonb);
end $$;
grant execute on function admin_reset_claim(uuid) to authenticated;

-- ---------- ดูประวัติการกระทำล่าสุด (admin เท่านั้น) ----------
create or replace function admin_recent_audit(p_limit int default 50)
returns table(action text, actor_name text, target_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
    select a.action,
           coalesce(act.display_name, act.fullname, 'ระบบ/อัตโนมัติ') as actor_name,
           coalesce(tgt.fullname, '—') as target_name,
           a.created_at
    from audit_log a
    left join profiles act on act.id = a.actor_id
    left join profiles tgt on tgt.id = a.target_profile
    order by a.created_at desc
    limit p_limit;
end $$;
grant execute on function admin_recent_audit(int) to authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
