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
  const [accFilter, setAccFilter] = useState<"all" | "unclaimed" | "active">("active");
  const [accList, setAccList] = useState<{ id: string; fullname: string; group_name: string | null; status: string }[]>([]);
  const [accQ, setAccQ] = useState("");
  const [accSel, setAccSel] = useState<{ id: string; fullname: string } | null>(null);
  const [accInfo, setAccInfo] = useState<{ status: string; gender: string; display_name: string | null; d_coin: number; behavior: number; d_score: number; inv_count: number } | null>(null);
  const [accEdit, setAccEdit] = useState({ dscore: "0", dcoin: "0", behavior: "100" });
  const [accMsg, setAccMsg] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<{ action: string; actor_name: string; target_name: string; created_at: string }[]>([]);
  const [deeds, setDeeds] = useState<{ id: number; label_th: string; min_score: number; max_score: number; daily_cap: number | null; active: boolean }[]>([]);
  const [deedSel, setDeedSel] = useState<{ id: number | null; label: string; min: string; max: string; cap: string; active: boolean } | null>(null);
  const [tStart, setTStart] = useState("07:35");
  const [tEnd, setTEnd] = useState("16:00");
  const [cfgMsg, setCfgMsg] = useState<string | null>(null);
  const [cfgLoaded, setCfgLoaded] = useState(false);

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
  async function loadAccounts(filter: "all" | "unclaimed" | "active", q = accQ) {
    setAccFilter(filter); setAccSel(null); setAccInfo(null); setAccMsg(null);
    const supabase = createClient();
    const { data } = await supabase.rpc("admin_list_students", { p_status: filter, q: q.trim() });
    setAccList((data as { id: string; fullname: string; group_name: string | null; status: string }[]) ?? []);
  }
  async function openAccount(s: { id: string; fullname: string }) {
    setAccSel(s); setAccInfo(null); setAccMsg(null);
    const supabase = createClient();
    const { data } = await supabase.rpc("admin_account_info", { p_profile: s.id });
    const info = data as { status: string; gender: string; display_name: string | null; d_coin: number; behavior: number; d_score: number; inv_count: number } | null;
    setAccInfo(info);
    if (info) setAccEdit({ dscore: String(info.d_score), dcoin: String(info.d_coin), behavior: String(info.behavior) });
  }
  async function refreshInfo() {
    if (!accSel) return;
    const supabase = createClient();
    const { data } = await supabase.rpc("admin_account_info", { p_profile: accSel.id });
    const info = data as { status: string; gender: string; display_name: string | null; d_coin: number; behavior: number; d_score: number; inv_count: number } | null;
    setAccInfo(info);
    if (info) setAccEdit({ dscore: String(info.d_score), dcoin: String(info.d_coin), behavior: String(info.behavior) });
  }
  async function setStat(field: "dscore" | "dcoin" | "behavior", value: number) {
    if (!accSel || Number.isNaN(value)) return;
    setBusy("stat"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_stat", { p_profile: accSel.id, p_field: field, p_value: value });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setAccMsg("บันทึกแล้ว"); await refreshInfo();
  }
  async function clearInv() {
    if (!accSel || !window.confirm(`ล้างของในกระเป๋าของ "${accSel.fullname}" ทั้งหมด?`)) return;
    setBusy("inv"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_clear_inventory", { p_profile: accSel.id });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setAccMsg("ล้างกระเป๋าแล้ว"); await refreshInfo();
  }
  async function setAccStatus(status: "active" | "suspended") {
    if (!accSel) return;
    setBusy("status"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_status", { p_profile: accSel.id, p_status: status });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setAccMsg(status === "suspended" ? "ระงับบัญชีแล้ว" : "ปลดระงับแล้ว"); await refreshInfo();
  }
  async function resetClaimAcc() {
    if (!accSel || !window.confirm(`ปลดการอ้างสิทธิ์ของ "${accSel.fullname}"? ต้องสมัครใหม่`)) return;
    setBusy("rc"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_reset_claim", { p_profile: accSel.id });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setAccMsg("ปลดสิทธิ์แล้ว"); await refreshInfo();
  }
  async function setGender(g: "male" | "female") {
    if (!accSel) return;
    setBusy("gender"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_gender", { p_profile: accSel.id, p_gender: g });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setAccMsg("เปลี่ยนเพศแล้ว"); await refreshInfo();
  }
  async function doResetSeasons() {
    if (!window.confirm("RESET ซีซั่นกลับไปซีซั่น 1?\nจะล้าง D Score ของทุกคน + Hall of Fame ทั้งหมด (เหรียญ/ของไม่หาย) — ย้อนกลับไม่ได้")) return;
    setBusy("rs"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_reset_seasons");
    setBusy(null);
    if (error) { setError(error.message); return; }
    setSeasonMsg("รีเซ็ตกลับซีซั่น 1 แล้ว · D Score ทุกคน + HoF ถูกล้าง");
  }
  async function doClearHof() {
    if (!window.confirm("ล้าง Hall of Fame ทั้งหมด?")) return;
    setBusy("hof"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_clear_hof");
    setBusy(null);
    if (error) { setError(error.message); return; }
    setSeasonMsg("ล้าง Hall of Fame แล้ว");
  }
  async function loadAudit() {
    const supabase = createClient();
    const { data } = await supabase.rpc("admin_recent_audit", { p_limit: 50 });
    setAuditRows((data as { action: string; actor_name: string; target_name: string; created_at: string }[]) ?? []);
  }
  async function doClearAudit() {
    if (window.prompt('พิมพ์ "ลบ" เพื่อยืนยันล้างประวัติทั้งหมด (ย้อนกลับไม่ได้)') !== "ลบ") return;
    setBusy("audit"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_clear_audit");
    setBusy(null);
    if (error) { setError(error.message); return; }
    setAuditRows([]);
  }
  async function loadSettings() {
    const supabase = createClient();
    const [d, sg] = await Promise.all([supabase.rpc("admin_list_deeds"), supabase.rpc("get_settings")]);
    setDeeds((d.data as typeof deeds) ?? []);
    const cfg = (sg.data as Record<string, string>) ?? {};
    if (cfg.quest_start) setTStart(cfg.quest_start);
    if (cfg.quest_end) setTEnd(cfg.quest_end);
    setDeedSel(null); setCfgLoaded(true); setCfgMsg(null);
  }
  function selectDeed(d: { id: number; label_th: string; min_score: number; max_score: number; daily_cap: number | null; active: boolean }) {
    setDeedSel({ id: d.id, label: d.label_th, min: String(d.min_score), max: String(d.max_score), cap: d.daily_cap == null ? "" : String(d.daily_cap), active: d.active });
    setCfgMsg(null);
  }
  async function saveDeed() {
    if (!deedSel) return;
    setBusy("deed"); setError(null);
    const supabase = createClient();
    const cap = deedSel.cap.trim() === "" ? null : Number(deedSel.cap);
    const { error } = await supabase.rpc("admin_save_deed", { p_id: deedSel.id, p_label: deedSel.label.trim(), p_min: Number(deedSel.min), p_max: Number(deedSel.max), p_cap: cap, p_active: deedSel.active });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setCfgMsg("บันทึกแล้ว"); await loadSettings();
  }
  async function deleteDeed() {
    if (!deedSel || deedSel.id == null) { setDeedSel(null); return; }
    if (!window.confirm("ลบประเภทความดีนี้?")) return;
    setBusy("deeddel"); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_delete_deed", { p_id: deedSel.id });
    setBusy(null);
    if (error) { setError(error.message); return; }
    setCfgMsg("ลบแล้ว"); await loadSettings();
  }
  async function saveWindow() {
    setBusy("win"); setError(null);
    const supabase = createClient();
    const e1 = await supabase.rpc("admin_set_setting", { p_key: "quest_start", p_value: tStart });
    const e2 = await supabase.rpc("admin_set_setting", { p_key: "quest_end", p_value: tEnd });
    setBusy(null);
    if (e1.error || e2.error) { setError((e1.error || e2.error)!.message); return; }
    setCfgMsg("บันทึกช่วงเวลาแล้ว");
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
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              <button onClick={doResetSeasons} disabled={busy === "rs"} className="rounded-lg border border-[#b5482f]/50 px-3 py-1.5 text-xs font-semibold text-[#e7a18a] hover:bg-[#7a1f1f]/20 disabled:opacity-50">{busy === "rs" ? "..." : "RESET กลับซีซั่น 1"}</button>
              <button onClick={doClearHof} disabled={busy === "hof"} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-[#ab9d92] hover:bg-white/5 disabled:opacity-50">{busy === "hof" ? "..." : "ล้าง Hall of Fame"}</button>
            </div>
          </div>
        )}

        {role === "admin" && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold tracking-wide text-[#cbbfb4]">จัดการบัญชีนักศึกษา</p>
            {!accSel ? (
              <>
                <div className="mt-2 flex gap-2">
                  <ScopeBtn active={accFilter === "active"} onClick={() => loadAccounts("active")}>ใช้งานอยู่</ScopeBtn>
                  <ScopeBtn active={accFilter === "unclaimed"} onClick={() => loadAccounts("unclaimed")}>ยังไม่สมัคร</ScopeBtn>
                  <ScopeBtn active={accFilter === "all"} onClick={() => loadAccounts("all")}>ทั้งหมด</ScopeBtn>
                </div>
                <input value={accQ} onChange={(e) => setAccQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadAccounts(accFilter, accQ); }} placeholder="ค้นชื่อ แล้วกด Enter"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021]" />
                <div className="mt-2 flex max-h-72 flex-col gap-1.5 overflow-y-auto">
                  {accList.length === 0 && <p className="text-xs text-[#6f635a]">เลือกหมวดหรือค้นชื่อเพื่อแสดงรายชื่อ</p>}
                  {accList.map((s) => (
                    <button key={s.id} onClick={() => openAccount(s)} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-[#faf5ef]">{s.fullname}</span>
                        <span className="block truncate text-xs text-[#8a7d72]">{s.group_name} · {STATUS_LABEL[s.status] ?? s.status}</span>
                      </span>
                      <span className="shrink-0 text-[#6f635a]">→</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-[#faf5ef]">{accSel.fullname}</p>
                  <button onClick={() => { setAccSel(null); setAccInfo(null); }} className="shrink-0 text-xs text-[#8a7d72] hover:text-[#ab9d92]">← กลับ</button>
                </div>
                {!accInfo ? <p className="mt-2 text-xs text-[#6f635a]">กำลังโหลด...</p> : (
                  <>
                    <p className="mt-1 text-xs text-[#8a7d72]">สถานะ: {STATUS_LABEL[accInfo.status] ?? accInfo.status} · ชื่อเล่น: {accInfo.display_name ?? "—"}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-24 shrink-0 text-xs text-[#cbbfb4]">เพศ</span>
                      <button onClick={() => setGender("male")} disabled={busy === "gender"} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${accInfo.gender === "male" ? "bg-[#3f7cc2] text-white" : "border border-white/10 text-[#cbbfb4] hover:bg-white/5"}`}>ชาย</button>
                      <button onClick={() => setGender("female")} disabled={busy === "gender"} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${accInfo.gender === "female" ? "bg-[#c44b8a] text-white" : "border border-white/10 text-[#cbbfb4] hover:bg-white/5"}`}>หญิง</button>
                    </div>
                    <StatEdit label="D Score" value={accEdit.dscore} onChange={(v) => setAccEdit((e) => ({ ...e, dscore: v }))} onSet={() => setStat("dscore", Number(accEdit.dscore))} busy={busy === "stat"} />
                    <StatEdit label="D Coin" value={accEdit.dcoin} onChange={(v) => setAccEdit((e) => ({ ...e, dcoin: v }))} onSet={() => setStat("dcoin", Number(accEdit.dcoin))} busy={busy === "stat"} />
                    <StatEdit label="ความประพฤติ" value={accEdit.behavior} onChange={(v) => setAccEdit((e) => ({ ...e, behavior: v }))} onSet={() => setStat("behavior", Number(accEdit.behavior))} busy={busy === "stat"} />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-[#cbbfb4]">ของในกระเป๋า: {accInfo.inv_count} ชิ้น</span>
                      <button onClick={clearInv} disabled={busy === "inv"} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-[#ab9d92] hover:bg-white/5 disabled:opacity-50">ล้างกระเป๋า</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {accInfo.status === "suspended"
                        ? <button onClick={() => setAccStatus("active")} disabled={busy === "status"} className="rounded-lg border border-[#4c9e6a]/40 px-3 py-1.5 text-xs font-semibold text-[#7dd87d] hover:bg-white/5 disabled:opacity-50">ปลดระงับ</button>
                        : <button onClick={() => setAccStatus("suspended")} disabled={busy === "status"} className="rounded-lg border border-[#e7a18a]/40 px-3 py-1.5 text-xs font-semibold text-[#e7a18a] hover:bg-white/5 disabled:opacity-50">ระงับบัญชี</button>}
                      <button onClick={resetClaimAcc} disabled={busy === "rc"} className="rounded-lg border border-[#e7a18a]/40 px-3 py-1.5 text-xs font-semibold text-[#e7a18a] hover:bg-white/5 disabled:opacity-50">ปลดการอ้างสิทธิ์</button>
                    </div>
                    {accMsg && <p className="mt-2 text-sm text-[#7dd87d]">{accMsg}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {role === "admin" && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-[#cbbfb4]">ประวัติการกระทำ · ตรวจย้อนได้</p>
              <div className="flex items-center gap-3">
                <button onClick={loadAudit} className="text-xs text-[#f37021] hover:underline">โหลด</button>
                {auditRows.length > 0 && <button onClick={doClearAudit} disabled={busy === "audit"} className="text-xs text-[#e7a18a] hover:underline disabled:opacity-50">ล้างประวัติ</button>}
              </div>
            </div>
            {auditRows.length === 0 ? (
              <p className="mt-2 text-xs text-[#6f635a]">กด “โหลด” เพื่อดูประวัติล่าสุด</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#8a7d72]">
                      <th className="pb-2 pr-2 font-medium">การกระทำ</th>
                      <th className="pb-2 pr-2 font-medium">ผู้ทำ</th>
                      <th className="pb-2 pr-2 font-medium">เป้าหมาย</th>
                      <th className="pb-2 font-medium whitespace-nowrap">เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((a, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="py-1.5 pr-2 text-[#faf5ef]">{ACTION_LABEL[a.action] ?? a.action}</td>
                        <td className="py-1.5 pr-2 text-[#cbbfb4]">{a.actor_name}</td>
                        <td className="py-1.5 pr-2 text-[#cbbfb4]">{a.target_name}</td>
                        <td className="py-1.5 text-[#6f635a] whitespace-nowrap">{timeAgoTH(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {role === "admin" && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-[#cbbfb4]">ตั้งค่าเศรษฐกิจ</p>
              <button onClick={loadSettings} className="text-xs text-[#f37021] hover:underline">{cfgLoaded ? "รีเฟรช" : "โหลด"}</button>
            </div>
            {cfgMsg && <p className="mt-2 text-sm text-[#7dd87d]">{cfgMsg}</p>}
            {!cfgLoaded ? (
              <p className="mt-2 text-xs text-[#6f635a]">กด “โหลด” เพื่อแก้ช่วงเวลา + ประเภทความดี</p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                <div>
                  <p className="text-xs text-[#8a7d72]">ช่วงเวลาส่งความดีได้ (เวลาไทย)</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#faf5ef]" />
                    <span className="text-[#8a7d72]">–</span>
                    <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#faf5ef]" />
                    <button onClick={saveWindow} disabled={busy === "win"} className="ml-auto rounded-lg bg-[#f37021] px-4 py-2 text-xs font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-50">บันทึก</button>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#8a7d72]">ประเภทความดี</p>
                    {!deedSel && <button onClick={() => setDeedSel({ id: null, label: "", min: "1", max: "3", cap: "", active: true })} className="text-xs text-[#f37021] hover:underline">+ เพิ่ม</button>}
                  </div>
                  {!deedSel ? (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {deeds.map((d) => (
                        <button key={d.id} onClick={() => selectDeed(d)} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10">
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-[#faf5ef]">{d.label_th}{!d.active && <span className="ml-1 text-[10px] text-[#8a7d72]">(ปิด)</span>}</span>
                            <span className="block text-xs text-[#8a7d72]">{d.min_score}–{d.max_score} คะแนน · เพดาน {d.daily_cap ?? "ไม่จำกัด"}/วัน</span>
                          </span>
                          <span className="shrink-0 text-[#6f635a]">→</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      <input value={deedSel.label} onChange={(e) => setDeedSel({ ...deedSel, label: e.target.value })} placeholder="ชื่อประเภท เช่น เก็บขยะ" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#faf5ef] placeholder:text-[#6f635a]" />
                      <div className="flex items-center gap-2 text-xs text-[#cbbfb4]">
                        <span className="w-20 shrink-0">คะแนน</span>
                        <input type="number" value={deedSel.min} onChange={(e) => setDeedSel({ ...deedSel, min: e.target.value })} className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[#e9c75e]" />
                        <span>–</span>
                        <input type="number" value={deedSel.max} onChange={(e) => setDeedSel({ ...deedSel, max: e.target.value })} className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[#e9c75e]" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#cbbfb4]">
                        <span className="w-20 shrink-0">เพดาน/วัน</span>
                        <input type="number" value={deedSel.cap} onChange={(e) => setDeedSel({ ...deedSel, cap: e.target.value })} placeholder="ว่าง = ไม่จำกัด" className="w-36 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[#faf5ef] placeholder:text-[#6f635a]" />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[#cbbfb4]">
                        <input type="checkbox" checked={deedSel.active} onChange={(e) => setDeedSel({ ...deedSel, active: e.target.checked })} /> เปิดใช้งาน
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <button onClick={saveDeed} disabled={busy === "deed"} className="rounded-lg bg-[#f37021] px-4 py-2 text-xs font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-50">บันทึก</button>
                        {deedSel.id != null && <button onClick={deleteDeed} disabled={busy === "deeddel"} className="rounded-lg border border-[#e7a18a]/40 px-3 py-2 text-xs font-semibold text-[#e7a18a] hover:bg-[#7a1f1f]/20 disabled:opacity-50">ลบ</button>}
                        <button onClick={() => setDeedSel(null)} className="text-xs text-[#8a7d72] hover:text-[#ab9d92]">ยกเลิก</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
function StatEdit({ label, value, onChange, onSet, busy }: { label: string; value: string; onChange: (v: string) => void; onSet: () => void; busy: boolean }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-[#cbbfb4]">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm text-[#e9c75e] outline-none focus:border-[#f37021]" />
      <button onClick={onSet} disabled={busy} className="rounded-lg bg-[#f37021] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-50">ตั้งค่า</button>
    </div>
  );
}

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
