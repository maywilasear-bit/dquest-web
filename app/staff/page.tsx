"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";

type Claim = { claim_id: string; profile_id: string; fullname: string; group_name: string | null; department: string | null; advisor: string | null };
type Sub = { sub_id: string; fullname: string; group_name: string | null; deed_label: string; min_score: number; max_score: number; description: string | null; photo_path: string | null; lat: number | null; lng: number | null; created_at: string };

export default function Staff() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [role, setRole] = useState<"teacher" | "admin" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"claims" | "deeds" | "award">("claims");
  const [showAll, setShowAll] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [seasonMsg, setSeasonMsg] = useState<string | null>(null);
  const [awardQ, setAwardQ] = useState("");
  const [awardResults, setAwardResults] = useState<{ id: string; fullname: string; group_name: string | null }[]>([]);
  const [awardSel, setAwardSel] = useState<{ id: string; fullname: string } | null>(null);
  const [awardAmount, setAwardAmount] = useState(10);
  const [awardReason, setAwardReason] = useState("");
  const [awardMsg, setAwardMsg] = useState<string | null>(null);
  const [resetQ, setResetQ] = useState("");
  const [resetResults, setResetResults] = useState<{ id: string; fullname: string; group_name: string | null; status: string }[]>([]);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<{ action: string; actor_name: string; target_name: string; created_at: string }[]>([]);

  const loadClaims = useCallback(async (all: boolean) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("list_pending_claims", { p_all: all });
    if (error) setError(error.message);
    else setClaims((data as Claim[]) ?? []);
  }, []);

  const loadSubs = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("list_pending_submissions");
    const list = (data as Sub[]) ?? [];
    setSubs(list);
    const sc: Record<string, number> = {};
    const urls: Record<string, string> = {};
    for (const x of list) {
      sc[x.sub_id] = x.min_score;
      if (x.photo_path) urls[x.sub_id] = supabase.storage.from("deed-photos").getPublicUrl(x.photo_path).data.publicUrl;
    }
    setScores(sc);
    setPhotoUrls(urls);
  }, []);

  const load = useCallback(async (all: boolean) => {
    await Promise.all([loadClaims(all), loadSubs()]);
  }, [loadClaims, loadSubs]);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setAuthed(false); return; }
    const { data: prof } = await supabase.from("profiles").select("role").eq("auth_id", data.user.id).maybeSingle();
    if (prof?.role === "teacher" || prof?.role === "admin") {
      setAuthed(true);
      setRole(prof.role);
      const all = prof.role === "admin";   // admin เห็นทุกกลุ่มเป็นค่าเริ่มต้น
      setShowAll(all);
      await load(all);
    } else { setAuthed(false); setError("บัญชีนี้ไม่มีสิทธิ์เจ้าหน้าที่"); }
  }, [load]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  async function login() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("เข้าสู่ระบบไม่สำเร็จ — ตรวจอีเมลและรหัสผ่าน"); return; }
    checkAuth();
  }
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setClaims([]); setSubs([]); setAuthed(false); setRole(null);
  }
  async function toggleScope(all: boolean) {
    setShowAll(all);
    await loadClaims(all);
  }
  async function decideClaim(id: string, approve: boolean) {
    setBusy(id); setError(null);
    const supabase = createClient();
    const { error } = approve
      ? await supabase.rpc("approve_claim", { claim_id: id })
      : await supabase.rpc("reject_claim", { claim_id: id, note: "ปฏิเสธโดยเจ้าหน้าที่" });
    if (error) setError(error.message);
    else setClaims((c) => c.filter((x) => x.claim_id !== id));
    setBusy(null);
  }
  async function approveGroup(groupName: string, groupClaims: Claim[]) {
    const ids = groupClaims.map((c) => c.claim_id);
    setBusy("group:" + groupName); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("approve_claims_bulk", { p_claim_ids: ids });
    if (error) setError(error.message);
    else setClaims((c) => c.filter((x) => !ids.includes(x.claim_id)));
    setBusy(null);
  }
  async function reviewSub(s: Sub, approve: boolean) {
    setBusy(s.sub_id); setError(null);
    const supabase = createClient();
    const { error } = approve
      ? await supabase.rpc("review_submission", { p_sub: s.sub_id, decision: "approve", p_score: scores[s.sub_id] })
      : await supabase.rpc("review_submission", { p_sub: s.sub_id, decision: "reject", p_note: "ไม่ผ่าน" });
    if (error) { setError(error.message); setBusy(null); return; }
    // ลบรูปออกจาก Storage หลังตรวจเสร็จ (กันพื้นที่เต็ม — แผน §6.4)
    if (s.photo_path) await supabase.storage.from("deed-photos").remove([s.photo_path]);
    setSubs((list) => list.filter((x) => x.sub_id !== s.sub_id));
    setBusy(null);
  }
  async function searchStudents(q: string) {
    setAwardQ(q); setAwardMsg(null);
    if (q.trim().length < 1) { setAwardResults([]); return; }
    const supabase = createClient();
    const { data } = await supabase.rpc("search_roster", { q: q.trim() });
    setAwardResults((data as { id: string; fullname: string; group_name: string | null }[]) ?? []);
  }
  async function doAward() {
    if (!awardSel || !awardReason.trim()) { setError("กรอกเหตุผลก่อนให้เหรียญ"); return; }
    setBusy("award"); setError(null); setAwardMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("award_coins", { p_student: awardSel.id, p_amount: awardAmount, p_reason: awardReason.trim() });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setAwardMsg(`ให้ ${awardAmount} เหรียญ D แก่ ${awardSel.fullname} แล้ว`);
    setAwardSel(null); setAwardQ(""); setAwardResults([]); setAwardReason("");
  }
  async function adminSearch(q: string) {
    setResetQ(q); setResetMsg(null);
    if (q.trim().length < 1) { setResetResults([]); return; }
    const supabase = createClient();
    const { data } = await supabase.rpc("search_roster", { q: q.trim() });
    setResetResults((data as { id: string; fullname: string; group_name: string | null; status: string }[]) ?? []);
  }
  async function doReset(r: { id: string; fullname: string }) {
    if (!window.confirm(`ปลดการอ้างสิทธิ์ของ "${r.fullname}"?\nบัญชีนี้จะต้องค้นชื่อสมัครใหม่`)) return;
    setBusy("reset:" + r.id); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_reset_claim", { p_profile: r.id });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setResetMsg(`ปลดสิทธิ์ของ ${r.fullname} แล้ว — ให้เขาค้นชื่อสมัครใหม่`);
    setResetResults((rs) => rs.map((x) => x.id === r.id ? { ...x, status: "unclaimed" } : x));
  }
  async function loadAudit() {
    const supabase = createClient();
    const { data } = await supabase.rpc("admin_recent_audit", { p_limit: 50 });
    setAuditRows((data as { action: string; actor_name: string; target_name: string; created_at: string }[]) ?? []);
  }
  async function doEndSeason() {
    setBusy("season"); setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("end_season");
    if (error) { setError(error.message); setBusy(null); return; }
    const r = data as { ended_season: number; new_season: number; new_theme: string };
    setSeasonMsg(`จบซีซั่น ${r.ended_season} แล้ว · เริ่มซีซั่น ${r.new_season}: ${r.new_theme} (D Score รีเซ็ตแล้ว)`);
    setConfirmEnd(false);
    setBusy(null);
  }

  if (authed === null) return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;

  if (!authed) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
        <div className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ left: "calc(50% - 17rem)", top: "-8rem", background: "radial-gradient(circle, rgba(243,112,33,0.16), transparent 60%)" }} />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="dq-anim w-full max-w-sm flex flex-col gap-5">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">สำหรับเจ้าหน้าที่</p>
              <h1 className="mt-2 text-2xl font-bold text-[#faf5ef]">เข้าสู่ระบบ</h1>
              <p className="mt-2 text-sm text-[#ab9d92]">อาจารย์ / ผู้ดูแลระบบ</p>
            </div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="อีเมล"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021] focus:bg-white/10" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="รหัสผ่าน"
              onKeyDown={(e) => { if (e.key === "Enter") login(); }}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021] focus:bg-white/10" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button onClick={login} disabled={loading}
              className="rounded-lg bg-[#f37021] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(243,112,33,0.6)] transition-all hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const groups = groupByOrder(claims, (c) => c.group_name ?? c.department ?? "อื่นๆ");

  return (
    <main className="min-h-screen bg-[#16100e] text-[#f5efe9]">
      <div className="h-1 bg-gradient-to-r from-[#f37021] via-[#7a1f1f] to-transparent" />
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">แผงเจ้าหน้าที่</p>
            <h1 className="mt-1 text-2xl font-bold text-[#faf5ef]">D-Quest</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => load(showAll)} className="text-sm text-[#f37021] hover:underline">รีเฟรช</button>
            <button onClick={logout} className="text-sm text-[#8a7d72] hover:text-[#ab9d92]">ออกจากระบบ</button>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <TabBtn active={tab === "claims"} onClick={() => setTab("claims")}>ยืนยันตัวตน ({claims.length})</TabBtn>
          <TabBtn active={tab === "deeds"} onClick={() => setTab("deeds")}>ตรวจความดี ({subs.length})</TabBtn>
          <TabBtn active={tab === "award"} onClick={() => setTab("award")}>ให้เหรียญ</TabBtn>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {tab === "claims" && (
          <>
            {role === "teacher" && (
              <div className="mt-4 flex items-center gap-2">
                <ScopeBtn active={!showAll} onClick={() => toggleScope(false)}>เฉพาะกลุ่มของฉัน</ScopeBtn>
                <ScopeBtn active={showAll} onClick={() => toggleScope(true)}>ดูทั้งหมด</ScopeBtn>
              </div>
            )}
            <div className="mt-4 flex flex-col gap-6">
              {claims.length === 0 && (
                <Empty>{showAll || role === "admin" ? "ไม่มีคำขอที่รออนุมัติ" : "ไม่มีคำขอจากลูกศิษย์ของคุณ — ลองกด “ดูทั้งหมด” เพื่อช่วยกลุ่มอื่น"}</Empty>
              )}
              {groups.map(([gname, gclaims]) => (
                <div key={gname}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs font-semibold text-[#cbbfb4]">
                      {gname} <span className="text-[#6f635a]">· {gclaims.length} คน</span>
                    </p>
                    {gclaims.length > 1 && (
                      <button onClick={() => approveGroup(gname, gclaims)} disabled={busy !== null}
                        className="shrink-0 rounded-lg bg-[#f37021]/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-50">
                        {busy === "group:" + gname ? "กำลังอนุมัติ..." : `อนุมัติทั้งกลุ่ม (${gclaims.length})`}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {gclaims.map((c) => (
                      <div key={c.claim_id} className="dq-anim rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#faf5ef]">{c.fullname}</p>
                          {c.advisor && <p className="truncate text-xs text-[#6f635a]">ครูที่ปรึกษา: {c.advisor}</p>}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => decideClaim(c.claim_id, false)} disabled={busy !== null} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-[#ab9d92] hover:bg-white/5 disabled:opacity-50">ปฏิเสธ</button>
                          <button onClick={() => decideClaim(c.claim_id, true)} disabled={busy !== null} className="rounded-lg bg-[#f37021] px-4 py-2 text-xs font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-50">{busy === c.claim_id ? "..." : "อนุมัติ"}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "deeds" && (
          <div className="mt-4 flex flex-col gap-3">
            {subs.length === 0 && <Empty>ไม่มีความดีที่รอตรวจ</Empty>}
            {subs.map((s) => (
              <div key={s.sub_id} className="dq-anim overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {photoUrls[s.sub_id] && <img src={photoUrls[s.sub_id]} alt="deed" className="aspect-video w-full object-cover" />}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#faf5ef]">{s.fullname}</p>
                      <p className="truncate text-xs text-[#8a7d72]">{s.group_name}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-[#cbbfb4]">{s.deed_label}</span>
                  </div>
                  {s.description && <p className="mt-2 text-sm text-[#ab9d92]">{s.description}</p>}
                  <LocFlag lat={s.lat} lng={s.lng} />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8a7d72]">คะแนน ({s.min_score}–{s.max_score})</span>
                      <input type="number" min={s.min_score} max={s.max_score} value={scores[s.sub_id] ?? s.min_score}
                        onChange={(e) => setScores((m) => ({ ...m, [s.sub_id]: Number(e.target.value) }))}
                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm text-[#e9c75e] outline-none focus:border-[#f37021]" />
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => reviewSub(s, false)} disabled={busy === s.sub_id} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-[#ab9d92] hover:bg-white/5 disabled:opacity-50">ปฏิเสธ</button>
                      <button onClick={() => reviewSub(s, true)} disabled={busy === s.sub_id} className="rounded-lg bg-[#f37021] px-4 py-2 text-xs font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-50">{busy === s.sub_id ? "..." : "อนุมัติ"}</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "award" && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-[#8a7d72]">ค้นชื่อนักศึกษาที่ช่วยงาน แล้วให้เหรียญ D เป็นการตอบแทน — ไม่กระทบกระดานแข่ง (ทุกครั้งบันทึกตรวจย้อนได้)</p>
            {!awardSel ? (
              <>
                <input value={awardQ} onChange={(e) => searchStudents(e.target.value)} autoFocus placeholder="พิมพ์ชื่อนักศึกษา"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021]" />
                {awardMsg && <p className="text-sm text-[#7dd87d]">{awardMsg}</p>}
                <div className="flex flex-col gap-2">
                  {awardResults.map((r) => (
                    <button key={r.id} onClick={() => { setAwardSel({ id: r.id, fullname: r.fullname }); setAwardResults([]); }}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-[#f37021]/40 hover:bg-white/10">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[#faf5ef]">{r.fullname}</span>
                        <span className="block truncate text-xs text-[#8a7d72]">{r.group_name}</span>
                      </span>
                      <span className="shrink-0 text-[#6f635a]">→</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-[#faf5ef]">{awardSel.fullname}</p>
                  <button onClick={() => setAwardSel(null)} className="shrink-0 text-xs text-[#8a7d72] hover:text-[#ab9d92]">เปลี่ยนคน</button>
                </div>
                <div className="mt-3 flex gap-2">
                  {[5, 10, 20, 50].map((n) => (
                    <button key={n} onClick={() => setAwardAmount(n)}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${awardAmount === n ? "bg-[#e9c75e] text-[#16100e]" : "border border-white/10 text-[#cbbfb4] hover:bg-white/5"}`}>{n}</button>
                  ))}
                </div>
                <input value={awardReason} onChange={(e) => setAwardReason(e.target.value)} placeholder="เหตุผล เช่น ช่วยยกของ / จัดห้อง / ทำความสะอาด"
                  className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021]" />
                <button onClick={doAward} disabled={busy === "award"}
                  className="mt-3 w-full rounded-lg bg-[#f37021] py-2.5 text-sm font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-50">
                  {busy === "award" ? "กำลังให้..." : `ให้ ${awardAmount} เหรียญ D`}
                </button>
              </div>
            )}
          </div>
        )}

        {role === "admin" && (
          <div className="mt-8 rounded-xl border border-[#7a1f1f]/40 bg-[#7a1f1f]/10 p-4">
            <p className="text-xs font-semibold tracking-wide text-[#e7a18a]">ผู้ดูแลระบบ · จัดการซีซั่น</p>
            <p className="mt-1 text-xs text-[#8a7d72]">จบซีซั่นปัจจุบัน: บันทึก Top 3 วิทยาลัย + แชมป์แผนกลงหอเกียรติยศ แล้วเริ่มซีซั่นใหม่ · D Score รีเซ็ต · เหรียญ/ของในกระเป๋าไม่หาย</p>
            {seasonMsg && <p className="mt-2 text-sm text-[#7dd87d]">{seasonMsg}</p>}
            {!confirmEnd ? (
              <button onClick={() => setConfirmEnd(true)} className="mt-3 rounded-lg border border-[#e7a18a]/40 px-4 py-2 text-xs font-semibold text-[#e7a18a] transition-colors hover:bg-[#7a1f1f]/20">จบซีซั่นนี้ &amp; เริ่มใหม่</button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#cbbfb4]">แน่ใจไหม? ย้อนกลับไม่ได้</span>
                <button onClick={doEndSeason} disabled={busy !== null} className="rounded-lg bg-[#b5482f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c5543a] disabled:opacity-50">{busy === "season" ? "กำลังจบ..." : "ยืนยันจบซีซั่น"}</button>
                <button onClick={() => setConfirmEnd(false)} className="text-xs text-[#8a7d72] hover:text-[#ab9d92]">ยกเลิก</button>
              </div>
            )}
          </div>
        )}

        {role === "admin" && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold tracking-wide text-[#cbbfb4]">จัดการบัญชี · แก้เคสสมัครผิด/สวมชื่อ</p>
            <p className="mt-1 text-xs text-[#8a7d72]">ปลดการอ้างสิทธิ์ → นักศึกษาคนนั้นต้องค้นชื่อสมัครใหม่ (ใช้ตอนมีคนกดผิดคน)</p>
            <input value={resetQ} onChange={(e) => adminSearch(e.target.value)} placeholder="ค้นชื่อนักศึกษา"
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021]" />
            {resetMsg && <p className="mt-2 text-sm text-[#7dd87d]">{resetMsg}</p>}
            <div className="mt-2 flex flex-col gap-2">
              {resetResults.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-[#faf5ef]">{r.fullname}</span>
                    <span className="block truncate text-xs text-[#8a7d72]">{r.group_name} · {STATUS_LABEL[r.status] ?? r.status}</span>
                  </span>
                  {r.status !== "unclaimed"
                    ? <button onClick={() => doReset(r)} disabled={busy === "reset:" + r.id} className="shrink-0 rounded-lg border border-[#e7a18a]/40 px-3 py-1.5 text-xs font-semibold text-[#e7a18a] hover:bg-[#7a1f1f]/20 disabled:opacity-50">{busy === "reset:" + r.id ? "..." : "ปลดสิทธิ์"}</button>
                    : <span className="shrink-0 text-xs text-[#6f635a]">ยังไม่สมัคร</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {role === "admin" && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-[#cbbfb4]">ประวัติการกระทำ · ตรวจย้อนได้</p>
              <button onClick={loadAudit} className="text-xs text-[#f37021] hover:underline">โหลด</button>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {auditRows.length === 0 && <p className="text-xs text-[#6f635a]">กด “โหลด” เพื่อดูประวัติล่าสุด</p>}
              {auditRows.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-[#cbbfb4]"><span className="text-[#faf5ef]">{ACTION_LABEL[a.action] ?? a.action}</span> · {a.actor_name}{a.target_name !== "—" ? " → " + a.target_name : ""}</span>
                  <span className="shrink-0 text-[#6f635a]">{timeAgoTH(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-[#6f635a]">D-Quest · แผงเจ้าหน้าที่</p>
      </div>
    </main>
  );
}

// พิกัดวิทยาลัย — ใส่ค่าจริงเพื่อเปิดธง "นอกพื้นที่"
// วิธีหา: เปิด Google Maps → คลิกขวาที่วิทยาลัย → คลิกตัวเลขชุดแรกเพื่อก๊อป แล้วใส่เป็น { lat: ..., lng: ... }
const CAMPUS: { lat: number; lng: number } | null = null;
const CAMPUS_RADIUS_M = 300;
function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function LocFlag({ lat, lng }: { lat: number | null; lng: number | null }) {
  if (lat == null || lng == null) return <p className="mt-2 text-xs text-[#6f635a]">ไม่มีข้อมูลตำแหน่ง</p>;
  const far = CAMPUS ? distM(CAMPUS, { lat, lng }) > CAMPUS_RADIUS_M : null;
  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[#60a5fa] hover:underline">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
        ดูตำแหน่ง
      </a>
      {far === true && <span className="rounded-full bg-[#f37021]/15 px-2 py-0.5 font-medium text-[#f3a06a]">นอกพื้นที่</span>}
      {far === false && <span className="rounded-full bg-[#4c9e6a]/15 px-2 py-0.5 font-medium text-[#7dd87d]">ในพื้นที่</span>}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = { unclaimed: "ยังไม่สมัคร", pending: "รออนุมัติ", active: "ใช้งานอยู่", suspended: "ระงับ" };
const ACTION_LABEL: Record<string, string> = {
  approve_claim: "อนุมัติตัวตน", approve_claim_bulk: "อนุมัติตัวตน(กลุ่ม)", reject_claim: "ปฏิเสธตัวตน",
  review_approve: "อนุมัติความดี", review_reject: "ปฏิเสธความดี", award_coins: "ให้เหรียญ",
  reset_claim: "ปลดการอ้างสิทธิ์", season_rollover: "เปลี่ยนซีซั่น", end_season: "จบซีซั่น", adjust_behavior: "ปรับพฤติกรรม",
};
function timeAgoTH(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีก่อน`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ก่อน`;
  return `${Math.floor(h / 24)} วันก่อน`;
}

function groupByOrder<T>(arr: T[], key: (x: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const x of arr) {
    const k = key(x);
    const bucket = map.get(k);
    if (bucket) bucket.push(x); else map.set(k, [x]);
  }
  return Array.from(map.entries());
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active ? "bg-[#f37021] text-white" : "border border-white/10 bg-white/5 text-[#cbbfb4] hover:bg-white/10"}`}>{children}</button>;
}
function ScopeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-[#f37021]/15 text-[#f37021] border border-[#f37021]/40" : "border border-white/10 text-[#8a7d72] hover:bg-white/5"}`}>{children}</button>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 py-10 px-4 text-center text-sm text-[#8a7d72]">{children}</div>;
}
