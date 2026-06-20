-- =============================================================================
-- D-Quest — ตัวกรองชื่อเล่นฝั่ง server (20 มิ.ย. 2026)
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย (create or replace) รันซ้ำได้
--
-- ทำไมต้องฝั่ง server: ตัวกรองในหน้าเว็บ (client) ผู้ใช้ข้ามได้ด้วยการเรียก RPC ตรง
-- การตรวจใน SECURITY DEFINER นี้ "บังคับเสมอ" แก้ชื่อทางไหนก็ผ่านด่านนี้
-- สำคัญขึ้นเพราะชื่อเล่นโผล่บนกระดานสาธารณะ + ถูกแช่แข็งถาวรใน Hall of Fame
--
-- หมายเหตุ: รายการคำด้านล่างปรับเพิ่ม/ลดได้ตามต้องการ
-- =============================================================================
create or replace function set_display_name(new_name text)
returns void language plpgsql security definer set search_path = public as $$
declare
  cleaned text;
  norm    text;
  w       text;
  bad     text[] := array[
    -- ไทย (คำหยาบรุนแรง)
    'เหี้ย','เหี้ยะ','สัส','สาด','สัด','ควย','คอย','หี','เย็ด','แตด','ระยำ',
    'ดอกทอง','กระหรี่','กะหรี่','แม่ง','มึงตาย','จัญไร','เงี่ยน','ส้นตีน','ไอ้สัตว์','ชาติหมา',
    -- อังกฤษ (รวมการสะกดเลี่ยง)
    'fuck','fuk','fck','shit','sht','bitch','cunt','dick','pussy','asshole',
    'bastard','nigger','nigga','whore','slut','porn','sex'
  ];
begin
  if me() is null then raise exception 'not active'; end if;

  cleaned := btrim(new_name);
  if cleaned is null or char_length(cleaned) < 2 then
    raise exception 'ชื่อสั้นเกินไป (อย่างน้อย 2 ตัวอักษร)';
  end if;
  if char_length(cleaned) > 20 then
    raise exception 'ชื่อยาวเกินไป (ไม่เกิน 20 ตัวอักษร)';
  end if;

  -- normalize: ตัดช่องว่างทั้งหมด + ตัวพิมพ์เล็ก เพื่อกันเลี่ยงด้วยการเว้นวรรค
  norm := lower(regexp_replace(cleaned, '\s', '', 'g'));
  foreach w in array bad loop
    if position(w in norm) > 0 then
      raise exception 'ชื่อนี้มีคำไม่เหมาะสม กรุณาตั้งใหม่';
    end if;
  end loop;

  update profiles set display_name = cleaned, updated_at = now() where id = me();
end $$;
grant execute on function set_display_name(text) to anon, authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
