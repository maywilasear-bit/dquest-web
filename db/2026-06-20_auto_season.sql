-- =============================================================================
-- D-Quest — รีเซ็ตซีซั่นอัตโนมัติเมื่อครบกำหนด (20 มิ.ย. 2026)
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย (create or replace) รันซ้ำได้
--
-- เดิม: admin กด "จบซีซั่น" เองเท่านั้น
-- ใหม่: GitHub Action (keep-alive) เรียก end_season_if_due() รายวัน → ถ้าเลย ends_at
--       แล้วจะ rollover ให้เอง (snapshot แชมป์ + ปิดซีซั่น + เปิดใหม่ + D Score รีเซ็ต)
-- ปลอดภัยแม้เปิดให้เรียกได้: ทำงานเฉพาะตอน "ครบกำหนดจริง" เท่านั้น บังคับเร่งไม่ได้
-- =============================================================================

-- ---------- ตรรกะ rollover กลาง (ภายใน — ไม่ grant ให้ client เรียกตรง) ----------
create or replace function _rollover_season()
returns json language plpgsql security definer set search_path = public as $$
declare
  cur seasons; next_num int; t jsonb; new_theme text;
  themes jsonb := '[
    {"label":"ยานยนต์ / เครื่องกล","icon":"⚙️","deps":["ช่างยนต์","เทคนิคเครื่องกล"]},
    {"label":"ไฟฟ้า","icon":"⚡","deps":["ช่างไฟฟ้ากำลัง","ไฟฟ้า"]},
    {"label":"อิเล็กทรอนิกส์","icon":"💡","deps":["ช่างอิเล็กทรอนิกส์","เทคโนโลยีอิเล็กทรอนิกส์"]},
    {"label":"การโรงแรม","icon":"🏨","deps":["การโรงแรม"]},
    {"label":"การบัญชี","icon":"📊","deps":["การบัญชี"]},
    {"label":"ธุรกิจดิจิทัล","icon":"📱","deps":["เทคโนโลยีธุรกิจดิจิทัล"]},
    {"label":"IT / เกม-แอนิเมชัน","icon":"💻","deps":["เทคโนโลยีสารสนเทศ","คอมพิวเตอร์เกมและแอนิเมชัน"]}
  ]'::jsonb;
begin
  select * into cur from seasons where status = 'active' order by number desc limit 1;
  if not found then return json_build_object('ok', false, 'reason', 'no active season'); end if;

  -- แช่แข็ง Top 3 วิทยาลัย
  insert into hall_of_fame(season_id, scope, rank, profile_id, avatar_snapshot, displayname_snapshot, realname_snapshot, d_score)
  select cur.id, 'college'::board_scope_t, x.rk, x.profile_id, p.avatar_key, p.display_name, p.realname, x.d_score
  from (
    select ss.profile_id, ss.d_score, rank() over (order by ss.d_score desc) as rk
    from season_scores ss join profiles p2 on p2.id = ss.profile_id
    where ss.season_id = cur.id and p2.role = 'student' and ss.d_score > 0
  ) x join profiles p on p.id = x.profile_id
  where x.rk <= 3;

  -- แช่แข็งแชมป์แผนก (อันดับ 1 ของแผนก featured)
  insert into hall_of_fame(season_id, scope, rank, profile_id, avatar_snapshot, displayname_snapshot, realname_snapshot, d_score)
  select cur.id, 'department'::board_scope_t, x.rk, x.profile_id, p.avatar_key, p.display_name, p.realname, x.d_score
  from (
    select ss.profile_id, ss.d_score, rank() over (order by ss.d_score desc) as rk
    from season_scores ss join profiles p2 on p2.id = ss.profile_id
    where ss.season_id = cur.id and p2.role = 'student' and ss.d_score > 0
      and p2.department = any(cur.featured_departments)
  ) x join profiles p on p.id = x.profile_id
  where x.rk = 1;

  update seasons set status = 'ended' where id = cur.id;

  next_num  := cur.number + 1;
  t         := themes -> ((next_num - 1) % 7);
  new_theme := t ->> 'label';

  insert into seasons(number, theme_label, icon, featured_departments, starts_at, ends_at, status)
  values (next_num, new_theme, t ->> 'icon',
          array(select jsonb_array_elements_text(t -> 'deps')),
          now(), now() + interval '21 days', 'active');

  insert into audit_log(actor_id, action, details)
    values (me(), 'season_rollover', jsonb_build_object('ended', cur.number, 'started', next_num, 'theme', new_theme));

  return json_build_object('ok', true, 'ended_season', cur.number, 'new_season', next_num, 'new_theme', new_theme);
end $$;
-- ล็อกให้เรียกตรงไม่ได้ (กันนักศึกษาบังคับรีเซ็ตซีซั่น) — เรียกได้เฉพาะผ่าน end_season / end_season_if_due
revoke all on function _rollover_season() from public, anon, authenticated;

-- ---------- admin กดจบเอง (เหมือนเดิม แต่ใช้ตรรกะกลาง) ----------
create or replace function end_season()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return _rollover_season();
end $$;
grant execute on function end_season() to authenticated;

-- ---------- ตรวจอัตโนมัติ: roll เฉพาะเมื่อเลย ends_at แล้ว ----------
create or replace function end_season_if_due()
returns json language plpgsql security definer set search_path = public as $$
declare cur seasons;
begin
  select * into cur from seasons where status = 'active' order by number desc limit 1;
  if not found then return json_build_object('ok', false, 'reason', 'no active season'); end if;
  if cur.ends_at > now() then
    return json_build_object('ok', false, 'reason', 'not due', 'ends_at', cur.ends_at);
  end if;
  return _rollover_season();
end $$;
-- เปิดให้เรียกได้ (ปลอดภัย: ทำงานเฉพาะตอนครบกำหนด บังคับเร่งไม่ได้)
grant execute on function end_season_if_due() to anon, authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- GitHub Action (keepalive.yml) จะเรียก end_season_if_due() รายวันให้เอง
-- =============================================================================
