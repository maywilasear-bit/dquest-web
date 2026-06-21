"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Character, parseAvatar, AvatarConfig } from "../../utils/Character";
import { RollingNumber } from "../../utils/RollingNumber";

type Home = {
  name: string; fullname: string; department: string | null; level: string | null;
  d_coin: number; d_score: number; season: string; unread: number; can_checkin: boolean;
};

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<Home | null>(null);
  const [checking, setChecking] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [scoreFrom, setScoreFrom] = useState<number | null>(null);
  const [coinFrom, setCoinFrom] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data: home, error } = await supabase.rpc("get_home_data");
      if (error || !home) { router.push("/"); return; }
      setData(home as Home);
      const { data: prof } = await supabase.from("profiles").select("avatar_key, gender, department, status").eq("auth_id", u.user.id).maybeSingle();
      if (prof?.status === "suspended") { setSuspended(true); setChecking(false); return; }
      setAvatar(parseAvatar(prof?.avatar_key, prof?.department, prof?.gender));
      // เลขวิ่ง: ครั้งแรกของวันวิ่งจาก 0 · วันเดียวกันถ้าค่าเปลี่ยน (ได้/เสีย) วิ่งจากค่าก่อนหน้า · ไม่เปลี่ยน = ไม่วิ่ง
      const h = home as Home;
      const today = new Date().toDateString();
      let st: { date?: string; score?: number; coin?: number } = {};
      try { st = JSON.parse(localStorage.getItem("dq_stats") || "{}"); } catch {}
      const newDay = st.date !== today;
      setScoreFrom(newDay ? 0 : (st.score != null && st.score !== h.d_score ? st.score : h.d_score));
      setCoinFrom(newDay ? 0 : (st.coin != null && st.coin !== h.d_coin ? st.coin : h.d_coin));
      try { localStorage.setItem("dq_stats", JSON.stringify({ date: today, score: h.d_score, coin: h.d_coin })); } catch {}
      setChecking(false);
    })();
  }, [router]);

  function soon(label: string) {
    setToast(label + " — เร็วๆ นี้");
    setTimeout(() => setToast(null), 1800);
  }

  if (suspended) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#16100e] px-6 text-center text-[#f5efe9]">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#e7a18a]">บัญชีถูกระงับ</p>
        <h1 className="text-2xl font-bold text-[#faf5ef]">บัญชีนี้ถูกระงับการใช้งานชั่วคราว</h1>
        <p className="max-w-xs text-sm text-[#8a7d72]">กรุณาติดต่ออาจารย์เพื่อขอข้อมูลเพิ่มเติม</p>
      </main>
    );
  }
  if (checking || !data) {
    return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 20rem)", top: "8%", background: "radial-gradient(circle, rgba(243,112,33,0.16), transparent 60%)" }} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
        {/* HUD */}
        <div className="dq-anim flex items-center justify-between gap-3">
          <button onClick={() => router.push("/profile")} className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-4 transition-colors hover:bg-white/10">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a201b] text-[#8a7d72]"><IconUser className="h-5 w-5" /></span>
            <span className="text-left leading-tight">
              <span className="block max-w-[8rem] truncate text-sm font-semibold text-[#faf5ef]">{data.name}</span>
              <span className="block max-w-[8rem] truncate text-[10px] text-[#8a7d72]">{data.level ?? data.department}</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/inbox")} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#cbbfb4] transition-colors hover:bg-white/10">
              <IconBell className="h-5 w-5" />
              {Number(data.unread) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#f37021] px-1 text-[10px] font-bold text-white">{data.unread}</span>
              )}
            </button>
            <div className="flex items-center gap-1.5 rounded-full border border-[#c2a14d]/30 bg-[#c2a14d]/10 py-1.5 pl-1.5 pr-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#e9c75e] to-[#c2a14d] text-[11px] font-bold text-[#3a2e10]">D</span>
              <RollingNumber value={Number(data.d_coin)} from={coinFrom ?? Number(data.d_coin)} className="text-sm font-semibold text-[#e9c75e]" />
            </div>
          </div>
        </div>

        {/* STAGE */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
          <div className="dq-anim text-center" style={{ animationDelay: "120ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#f37021]">คะแนนความดี</p>
            <p className="dq-count mt-1 text-7xl font-extrabold tracking-tight text-[#faf5ef]" style={{ textShadow: "0 0 50px rgba(243,112,33,0.4)" }}><RollingNumber value={Number(data.d_score)} from={scoreFrom ?? Number(data.d_score)} duration={1100} /></p>
            <p className="mt-1 text-xs text-[#8a7d72]">ซีซั่น: {data.season}</p>
          </div>

          <div className="dq-anim relative flex flex-col items-center" style={{ animationDelay: "240ms" }}>
            <div className="relative flex h-44 w-44 items-end justify-center">
              <div className="dq-glow absolute bottom-1 h-8 w-36 rounded-[50%] bg-[#f37021]/30 blur-xl" />
              {avatar && <Character config={avatar} className="relative h-44 w-auto" />}
            </div>
            <button onClick={() => router.push("/profile")} className="mt-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#8a7d72] transition-colors hover:bg-white/5">ปรับแต่งตัวละคร</button>
          </div>
        </div>

        {/* PRIMARY */}
        <button onClick={() => router.push("/quest")} className="dq-anim dq-press dq-shine flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#ff8636] to-[#ef6a17] px-6 py-4 text-base font-bold text-white shadow-[0_18px_50px_-14px_rgba(243,112,33,0.7)] transition-transform hover:-translate-y-0.5" style={{ animationDelay: "340ms" }}>
          <IconHeart className="h-6 w-6" /> ทำความดี
        </button>

        {/* DAILY CHECK-IN */}
        <button onClick={() => router.push("/checkin")} className="dq-anim mt-3 flex items-center justify-between rounded-xl border border-[#e9c75e]/30 bg-[#e9c75e]/10 px-4 py-3 transition-colors hover:bg-[#e9c75e]/15" style={{ animationDelay: "380ms" }}>
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9c75e]/20 text-[#e9c75e]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </span>
          <span className="text-sm font-semibold text-[#faf5ef]">เช็คอินรายวัน</span>
          </span>
          {data.can_checkin
            ? <span className="flex items-center gap-1.5 text-xs font-semibold text-[#e9c75e]">รับเลย<span className="h-2 w-2 rounded-full bg-[#e9c75e]" /></span>
            : <span className="text-xs text-[#8a7d72]">วันนี้แล้ว</span>}
        </button>

        {/* DOCK */}
        <div className="dq-anim mt-3 grid grid-cols-4 gap-2.5" style={{ animationDelay: "420ms" }}>
          <DockButton label="อันดับ" onClick={() => router.push("/leaderboard")}><IconTrophy className="h-6 w-6" /></DockButton>
          <DockButton label="กาชา" onClick={() => router.push("/gacha")}><IconGift className="h-6 w-6" /></DockButton>
          <DockButton label="กระเป๋า" onClick={() => router.push("/inventory")}><IconBag className="h-6 w-6" /></DockButton>
          <DockButton label="ประกาศ" onClick={() => router.push("/announcements")}><IconMegaphone className="h-6 w-6" /></DockButton>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
          <div className="rounded-full border border-white/10 bg-[#2a201b] px-4 py-2 text-sm text-[#faf5ef] shadow-lg">{toast}</div>
        </div>
      )}
    </main>
  );
}

function DockButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="dq-press flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-3 text-[#cbbfb4] transition-all hover:-translate-y-0.5 hover:border-[#f37021]/40 hover:bg-white/10 hover:text-[#faf5ef]">
      {children}<span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function IconUser({ className = "", strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /></svg>;
}
function IconBell({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
}
function IconHeart({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></svg>;
}
function IconTrophy({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22" /><path d="M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 2.8" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
}
function IconGift({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" /><path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" /></svg>;
}
function IconBag({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function IconMegaphone({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>;
}