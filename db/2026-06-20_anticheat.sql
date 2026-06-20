-- =============================================================================
-- D-Quest — กันโกง/กันคิวตรวจตัน (แผน §7) — 20 มิ.ย. 2026
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย (create or replace) รันซ้ำได้
--
-- ปัญหา: "เก็บของคืน" และ "ความดีพิเศษ" ไม่มีเพดานต่อวัน + ไม่มีเพดานรวม
--        -> นักศึกษาคนเดียวสแปมส่งได้ไม่จำกัด คิวครู 2 คนตันทันที
-- แก้:   (1) จำกัดรายการ "รอตรวจ" ต่อคน  (2) เพดานรวมต่อวัน  (3) คงเพดานต่อประเภท
--        (4) ตั้งเพดานให้ 2 ประเภทที่ยังว่าง
-- =============================================================================

-- (4) ตั้งเพดานต่อวันให้ประเภทที่ยังไม่มี (เผื่อกันสแปมแต้มสูง — แก้ตัวเลขได้)
update deed_types set daily_cap = 3 where code = 'found_item' and daily_cap is null;
update deed_types set daily_cap = 2 where code = 'special'    and daily_cap is null;

-- (1)+(2)+(3) อัปเกรด submit_deed
create or replace function submit_deed(p_deed int, p_photo text, p_desc text)
returns submissions language plpgsql security definer set search_path = public as $$
declare
  s submissions;
  cap int; used int; cur uuid; pending_cnt int; today_total int;
  max_pending constant int := 10;   -- รายการรอตรวจสูงสุดต่อคน (กันคิวตัน)
  max_per_day constant int := 20;   -- ส่งรวมสูงสุดต่อวัน (กันสแปม)
begin
  if my_role() <> 'student' then raise exception 'students only'; end if;

  -- (1) กันคิวตัน: ห้ามค้างรอตรวจเกินกำหนด
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

  -- (3) เพดานต่อประเภท/วัน (ถ้าตั้งไว้)
  select daily_cap into cap from deed_types where id = p_deed and active;
  if cap is not null then
    select count(*) into used from submissions
      where student_id = me() and deed_type_id = p_deed and created_at >= date_trunc('day', now());
    if used >= cap then
      raise exception 'ความดีประเภทนี้วันนี้ส่งครบ % รายการแล้ว ลองประเภทอื่นดูนะ', cap;
    end if;
  end if;

  insert into submissions(student_id, deed_type_id, season_id, photo_path, description)
    values (me(), p_deed, cur, p_photo, p_desc) returning * into s;
  return s;
end $$;
grant execute on function submit_deed(int, text, text) to authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- ปรับตัวเลข: max_pending / max_per_day ในฟังก์ชัน · daily_cap รายประเภทในตาราง deed_types
-- =============================================================================
