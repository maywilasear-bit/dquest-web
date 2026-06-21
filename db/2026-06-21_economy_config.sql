-- =============================================================================
-- D-Quest — ตั้งค่าเศรษฐกิจในเว็บ: ช่วงเวลา + ประเภทความดี (21 มิ.ย. 2026)
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย รันซ้ำได้
-- =============================================================================

-- ---------- ตารางตั้งค่าทั่วไป (key/value) ----------
create table if not exists app_settings (key text primary key, value text);
insert into app_settings(key, value) values ('quest_start', '07:35'), ('quest_end', '16:00')
  on conflict (key) do nothing;
alter table app_settings enable row level security;
drop policy if exists p_settings_read on app_settings;
create policy p_settings_read on app_settings for select to authenticated using (true);

create or replace function get_settings()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_object_agg(key, value), '{}'::json) from app_settings
$$;
grant execute on function get_settings() to authenticated;

create or replace function admin_set_setting(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  insert into app_settings(key, value) values (p_key, p_value)
    on conflict (key) do update set value = excluded.value;
  insert into audit_log(actor_id, action, details) values (me(), 'set_setting', jsonb_build_object('key', p_key, 'value', p_value));
end $$;
grant execute on function admin_set_setting(text, text) to authenticated;

-- ---------- จัดการประเภทความดี (CRUD) ----------
create or replace function admin_list_deeds()
returns table(id int, code text, label_th text, min_score int, max_score int, daily_cap int, active boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query select d.id, d.code, d.label_th, d.min_score, d.max_score, d.daily_cap, d.active
               from deed_types d order by d.sort, d.id;
end $$;
grant execute on function admin_list_deeds() to authenticated;

-- บันทึก (p_id null = เพิ่มใหม่, มีค่า = แก้ไข) · code สร้างอัตโนมัติตอนเพิ่ม
create or replace function admin_save_deed(p_id int, p_label text, p_min int, p_max int, p_cap int, p_active boolean)
returns int language plpgsql security definer set search_path = public as $$
declare new_id int;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_label is null or btrim(p_label) = '' then raise exception 'ต้องมีชื่อประเภท'; end if;
  if p_min < 0 or p_max < p_min then raise exception 'ช่วงคะแนนไม่ถูกต้อง'; end if;
  if p_id is null then
    insert into deed_types(code, label_th, min_score, max_score, daily_cap, active)
      values ('deed_' || extract(epoch from now())::bigint, p_label, p_min, p_max, p_cap, coalesce(p_active, true))
      returning id into new_id;
  else
    update deed_types set label_th = p_label, min_score = p_min, max_score = p_max,
           daily_cap = p_cap, active = coalesce(p_active, true)
      where id = p_id returning id into new_id;
  end if;
  insert into audit_log(actor_id, action, details) values (me(), 'save_deed', jsonb_build_object('id', new_id, 'label', p_label));
  return new_id;
end $$;
grant execute on function admin_save_deed(int, text, int, int, int, boolean) to authenticated;

-- ลบ — ถ้ามีการส่งแล้ว (FK) จะปิดใช้งานแทน (กันประวัติพัง)
create or replace function admin_delete_deed(p_id int)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if exists (select 1 from submissions s where s.deed_type_id = p_id) then
    update deed_types set active = false where id = p_id;
    insert into audit_log(actor_id, action, details) values (me(), 'deactivate_deed', jsonb_build_object('id', p_id));
    return 'deactivated';
  else
    delete from deed_types where id = p_id;
    insert into audit_log(actor_id, action, details) values (me(), 'delete_deed', jsonb_build_object('id', p_id));
    return 'deleted';
  end if;
end $$;
grant execute on function admin_delete_deed(int) to authenticated;

-- ---------- submit_deed: อ่านช่วงเวลาจาก settings (ปรับในเว็บได้) ----------
drop function if exists submit_deed(int, text, text);
create or replace function submit_deed(
  p_deed int, p_photo text, p_desc text,
  p_lat double precision default null, p_lng double precision default null
)
returns submissions language plpgsql security definer set search_path = public as $$
declare
  s submissions;
  cap int; used int; cur uuid; pending_cnt int; today_total int; nowt time; t_start time; t_end time;
  max_pending constant int := 10;
  max_per_day constant int := 20;
begin
  if my_role() <> 'student' then raise exception 'students only'; end if;
  if not am_active() then raise exception 'บัญชีถูกระงับ — ติดต่ออาจารย์'; end if;

  select coalesce((select value from app_settings where key = 'quest_start'), '07:35')::time into t_start;
  select coalesce((select value from app_settings where key = 'quest_end'), '16:00')::time into t_end;
  nowt := (now() at time zone 'Asia/Bangkok')::time;
  if nowt < t_start or nowt > t_end then
    raise exception 'ส่งความดีได้เฉพาะเวลา % – % น. เท่านั้น', to_char(t_start, 'HH24:MI'), to_char(t_end, 'HH24:MI');
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

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
