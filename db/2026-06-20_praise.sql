-- =============================================================================
-- D-Quest — ชั้นคำชม/การยอมรับ ตอนครูอนุมัติ (20 มิ.ย. 2026)
-- รันใน Supabase -> SQL Editor -> Run · ปลอดภัย (create or replace) รันซ้ำได้
--
-- ทำไม: งานวิจัยชี้ว่า "คำชมที่เน้นน้ำใจ/นิสัย" เสริมแรงจูงใจภายใน ส่วนการบอกแค่
-- "ได้กี่แต้ม" ทำให้เด็กมองว่าทำเพื่อแต้ม → แจ้งเตือนนำด้วยคำชม แล้วค่อยตามด้วยแต้ม
-- (คงตรรกะคะแนน/เหรียญ/ledger/season_scores/audit เดิมครบทุกบรรทัด)
-- =============================================================================
create or replace function review_submission(p_sub uuid, decision text, p_score int default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  s submissions;
  reviewer text;
  praise text;
  praises text[] := array[
    'น้ำใจงามมาก ขอบคุณที่ช่วยดูแลส่วนรวม',
    'เป็นแบบอย่างที่ดีให้เพื่อนๆ เลย',
    'โรงเรียนน่าอยู่ขึ้นเพราะคนอย่างคุณ',
    'ความตั้งใจของคุณมีค่ามากนะ',
    'ขอบคุณที่ลงมือทำจริง ไม่ใช่แค่พูด',
    'ทำดีแบบนี้ต่อไปนะ น่าภูมิใจมาก'
  ];
begin
  if not is_staff() then raise exception 'staff only'; end if;
  select * into s from submissions where id = p_sub;
  if not found then raise exception 'submission not found'; end if;
  if s.status <> 'pending' then raise exception 'already reviewed'; end if;

  select coalesce(display_name, fullname) into reviewer from profiles where id = me();
  praise := praises[1 + floor(random() * array_length(praises, 1))::int];

  if decision = 'approve' then
    if p_score is null then raise exception 'score required'; end if;
    update submissions set status='approved', score_awarded=p_score, coin_awarded=p_score,
           reviewed_by=me(), reviewed_at=now(), review_note=p_note where id=p_sub;
    insert into ledger(profile_id,currency,amount,reason,ref_submission,ref_season,created_by)
      values (s.student_id,'dscore',p_score,'deed approved',p_sub,s.season_id,me()),
             (s.student_id,'dcoin', p_score,'deed approved',p_sub,s.season_id,me());
    insert into season_scores(profile_id,season_id,d_score)
      values (s.student_id, s.season_id, p_score)
      on conflict (profile_id, season_id)
      do update set d_score = season_scores.d_score + excluded.d_score, updated_at = now();
    update account_stats set d_coin_balance = d_coin_balance + p_score, updated_at = now()
      where profile_id = s.student_id;
    -- คำชม = หัวข้อหลัก (เด่น/ตัวหนาในกล่องข้อความ) · แต้ม = บรรทัดรองที่จางลง (ยังแสดงอยู่ แต่ไม่เด่นกว่าน้ำใจ)
    insert into notifications(profile_id,type,title,body,ref_submission)
      values (s.student_id,'approved', praise,
              'ได้รับ ' || p_score || ' D Score + ' || p_score || ' D Coin · ตรวจโดย ' || coalesce(reviewer,'เจ้าหน้าที่'), p_sub);
  elsif decision = 'reject' then
    update submissions set status='rejected', reviewed_by=me(), reviewed_at=now(), review_note=p_note where id=p_sub;
    insert into notifications(profile_id,type,title,body,ref_submission)
      values (s.student_id,'rejected','รายงานนี้ยังไม่ผ่าน',
              coalesce(p_note,'ลองใหม่อีกครั้งนะ') || ' · โดย ' || coalesce(reviewer,'เจ้าหน้าที่'), p_sub);
  else
    raise exception 'decision must be approve or reject';
  end if;

  insert into audit_log(actor_id, action, target_profile, details)
    values (me(), 'review_'||decision, s.student_id, jsonb_build_object('submission', p_sub, 'score', p_score));
end $$;
grant execute on function review_submission(uuid, text, int, text) to authenticated;

-- =============================================================================
-- เสร็จ — ควรขึ้น "Success. No rows returned"
-- =============================================================================
