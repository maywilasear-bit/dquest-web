-- =============================================================================
-- D-Quest — บันทึกหน้าตาตัวละคร (20 มิ.ย. 2026)
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย (create or replace) รันซ้ำได้
--
-- เก็บค่าหน้าตา (ผิว/ทรงผม/สีผม/สีชุด) เป็น JSON ในคอลัมน์ profiles.avatar_key
-- เขียนผ่านฟังก์ชันนี้เท่านั้น (RLS ไม่ให้ user แก้ profiles ตรงๆ)
-- หน้าเว็บอ่าน avatar_key เองได้ (RLS อนุญาตให้ผู้ล็อกอินอ่าน profiles)
-- =============================================================================
create or replace function set_avatar(p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if me() is null then raise exception 'not active'; end if;
  if p_key is not null and char_length(p_key) > 400 then
    raise exception 'avatar config too large';
  end if;
  update profiles set avatar_key = p_key, updated_at = now() where id = me();
end $$;
grant execute on function set_avatar(text) to anon, authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
