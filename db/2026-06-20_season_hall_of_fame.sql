-- =============================================================================
-- D-Quest — เฟส 2: ระบบจบซีซั่น + Hall of Fame (20 มิ.ย. 2026)
-- รันทั้งไฟล์นี้ครั้งเดียวใน Supabase -> SQL Editor -> New query -> วาง -> Run
-- ปลอดภัย: create or replace ทั้งหมด รันซ้ำได้
--
-- กลไก: admin กด "จบซีซั่น" -> แช่แข็ง Top 3 วิทยาลัย + แชมป์แผนก ลง hall_of_fame
--        -> ปิดซีซั่นเดิม (ended) -> เปิดซีซั่นใหม่ (วนธีม 1-7) -> D Score รีเซ็ตเอง
--        (ซีซั่นใหม่ = season_scores ชุดใหม่เริ่มที่ 0) · D Coin/ของในกระเป๋า "ไม่" แตะ
-- =============================================================================

-- -----------------------------------------------------------------------------
-- get_hall_of_fame() — ดึงแชมป์ที่แช่แข็งไว้ ต่อซีซั่น (สำหรับหน้าหอเกียรติยศ)
--   language sql -> ปลอดภัยจากบั๊ก column ambiguous
-- -----------------------------------------------------------------------------
create or replace function get_hall_of_fame()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(s) order by s.number desc), '[]'::json)
  from (
    select
      se.number,
      se.theme_label,
      se.icon,
      array_to_string(se.featured_departments, ' / ') as dept_label,
      (select coalesce(json_agg(json_build_object(
                 'rank', h.rank,
                 'name', coalesce(h.displayname_snapshot, h.realname_snapshot),
                 'realname', h.realname_snapshot,
                 'score', h.d_score) order by h.rank), '[]'::json)
       from hall_of_fame h where h.season_id = se.id and h.scope = 'college') as college,
      (select coalesce(json_agg(json_build_object(
                 'rank', h.rank,
                 'name', coalesce(h.displayname_snapshot, h.realname_snapshot),
                 'realname', h.realname_snapshot,
                 'score', h.d_score) order by h.rank), '[]'::json)
       from hall_of_fame h where h.season_id = se.id and h.scope = 'department') as department
    from seasons se
    where se.status = 'ended'
      and exists (select 1 from hall_of_fame h2 where h2.season_id = se.id)
  ) s
$$;
grant execute on function get_hall_of_fame() to authenticated;


-- -----------------------------------------------------------------------------
-- end_season() — admin เท่านั้น: แช่แข็งแชมป์ + ปิดซีซั่น + เปิดซีซั่นใหม่
-- -----------------------------------------------------------------------------
create or replace function end_season()
returns json language plpgsql security definer set search_path = public as $$
declare
  cur       seasons;
  next_num  int;
  t         jsonb;
  new_theme text;
  themes    jsonb := '[
    {"label":"ยานยนต์ / เครื่องกล","icon":"⚙️","deps":["ช่างยนต์","เทคนิคเครื่องกล"]},
    {"label":"ไฟฟ้า","icon":"⚡","deps":["ช่างไฟฟ้ากำลัง","ไฟฟ้า"]},
    {"label":"อิเล็กทรอนิกส์","icon":"💡","deps":["ช่างอิเล็กทรอนิกส์","เทคโนโลยีอิเล็กทรอนิกส์"]},
    {"label":"การโรงแรม","icon":"🏨","deps":["การโรงแรม"]},
    {"label":"การบัญชี","icon":"📊","deps":["การบัญชี"]},
    {"label":"ธุรกิจดิจิทัล","icon":"📱","deps":["เทคโนโลยีธุรกิจดิจิทัล"]},
    {"label":"IT / เกม-แอนิเมชัน","icon":"💻","deps":["เทคโนโลยีสารสนเทศ","คอมพิวเตอร์เกมและแอนิเมชัน"]}
  ]'::jsonb;
begin
  if not is_admin() then raise exception 'admin only'; end if;

  select * into cur from seasons where status = 'active' order by number desc limit 1;
  if not found then raise exception 'no active season'; end if;

  -- แช่แข็ง Top 3 วิทยาลัย
  insert into hall_of_fame(season_id, scope, rank, profile_id, avatar_snapshot, displayname_snapshot, realname_snapshot, d_score)
  select cur.id, 'college'::board_scope_t, x.rk, x.profile_id, p.avatar_key, p.display_name, p.realname, x.d_score
  from (
    select ss.profile_id, ss.d_score, rank() over (order by ss.d_score desc) as rk
    from season_scores ss
    join profiles p2 on p2.id = ss.profile_id
    where ss.season_id = cur.id and p2.role = 'student' and ss.d_score > 0
  ) x
  join profiles p on p.id = x.profile_id
  where x.rk <= 3;

  -- แช่แข็งแชมป์แผนก (อันดับ 1 ของแผนกที่ featured ในซีซั่นนี้)
  insert into hall_of_fame(season_id, scope, rank, profile_id, avatar_snapshot, displayname_snapshot, realname_snapshot, d_score)
  select cur.id, 'department'::board_scope_t, x.rk, x.profile_id, p.avatar_key, p.display_name, p.realname, x.d_score
  from (
    select ss.profile_id, ss.d_score, rank() over (order by ss.d_score desc) as rk
    from season_scores ss
    join profiles p2 on p2.id = ss.profile_id
    where ss.season_id = cur.id and p2.role = 'student' and ss.d_score > 0
      and p2.department = any(cur.featured_departments)
  ) x
  join profiles p on p.id = x.profile_id
  where x.rk = 1;

  -- ปิดซีซั่นเดิม
  update seasons set status = 'ended' where id = cur.id;

  -- เปิดซีซั่นใหม่ (วนธีม 1..7)
  next_num  := cur.number + 1;
  t         := themes -> ((next_num - 1) % 7);   -- jsonb array 0-indexed
  new_theme := t ->> 'label';

  insert into seasons(number, theme_label, icon, featured_departments, starts_at, ends_at, status)
  values (
    next_num,
    new_theme,
    t ->> 'icon',
    array(select jsonb_array_elements_text(t -> 'deps')),
    now(),
    now() + interval '21 days',
    'active'
  );

  insert into audit_log(actor_id, action, details)
    values (me(), 'end_season', jsonb_build_object('ended', cur.number, 'started', next_num, 'theme', new_theme));

  return json_build_object('ended_season', cur.number, 'new_season', next_num, 'new_theme', new_theme);
end $$;
grant execute on function end_season() to authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
