-- =============================================================================
-- D-Quest — จำกัดเวลาส่งภารกิจ + เก็บพิกัด GPS (ธงเตือน) — 20 มิ.ย. 2026
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย รันซ้ำได้
--
-- 1) ส่งความดีได้เฉพาะ 07:35–16:00 (เวลาไทย) — เช็คฝั่ง server กันแก้เวลาเครื่อง
-- 2) เก็บ lat/lng ตอนส่ง (ถ้านักศึกษาอนุญาต) — ไม่บล็อก แค่ให้ staff ดูประกอบ
-- =============================================================================

-- เก็บพิกัดในตาราง submissions
alter table submissions add column if not exists lat double precision;
alter table submissions add column if not exists lng double precision;

-- ต้องลบ signature เดิม (3 อาร์กิวเมนต์) ก่อน กันชนกับเวอร์ชันใหม่
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

  -- (0) เวลาทำกิจกรรม 07:35–16:00 (เวลาไทย) — ปรับช่วงเวลาได้ที่บรรทัดนี้
  nowt := (now() at time zone 'Asia/Bangkok')::time;
  if nowt < time '07:35' or nowt > time '16:00' then
    raise exception 'ส่งความดีได้เฉพาะเวลา 07:35–16:00 น. เท่านั้น';
  end if;

  -- (1) กันคิวตัน
  select count(*) into pending_cnt from submissions
    where student_id = me() and status = 'pending';
  if pending_cnt >= max_pending then
    raise exception 'คุณมีรายการรอครูตรวจ % รายการแล้ว รอให้ครูตรวจก่อนค่อยส่งใหม่', pending_cnt;
  end if;

  -- (2) เพดานรวมต่อวัน
  select count(*) into today_total from submissions
    where student_id = me() and created_at >= date_trunc('day', now());
  if today_total >= max_per_day then
    raise exception 'วันนี้ส่งความดีครบ % รายการแล้ว พรุ่งนี้ค่อยส่งใหม่นะ', max_per_day;
  end if;

  select id into cur from seasons where status = 'active' order by number desc limit 1;

  -- (3) เพดานต่อประเภท/วัน
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

-- list_pending_submissions: เพิ่ม lat/lng (ต้อง drop ก่อนเพราะ return type เปลี่ยน)
drop function if exists list_pending_submissions();
create or replace function list_pending_submissions()
returns table(sub_id uuid, fullname text, group_name text, deed_label text,
              min_score int, max_score int, description text, photo_path text,
              lat double precision, lng double precision, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'staff only'; end if;
  return query
    select s.id, p.fullname, p.group_name, d.label_th, d.min_score, d.max_score,
           s.description, s.photo_path, s.lat, s.lng, s.created_at
    from submissions s
    join profiles p on p.id = s.student_id
    join deed_types d on d.id = s.deed_type_id
    where s.status = 'pending'
    order by s.created_at asc;
end $$;
grant execute on function list_pending_submissions() to authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
