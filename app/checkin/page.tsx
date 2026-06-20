"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type Status = { can_claim: boolean; streak: number; eff_streak: number; today_reward: number; d_coin: number; cycle: number[] };

export default function CheckIn() {
  const router = useRouter();
  const [s, setS] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [reward, setReward] = useState<number | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.push("/"); return; }
    const { data } = await supabase.rpc("get_checkin_status");
    if (!data) { router.push("/"); return; }
    setS(data as Status); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function claim() {
    if (!s || !s.can_claim || claiming) return;
    setClaiming(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("daily_checkin");
    setClaiming(false);
    if (error || !data?.ok) { await load(); return; }
    setReward(data.reward);
    setS((prev) => prev ? { ...prev, can_claim: false, streak: data.streak, d_coin: data.d_coin } : prev);
  }

  if (loading || !s) return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;
  const activeIndex = (s.eff_streak - 1) % 7;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 16rem)", top: "-9rem", background: "radial-gradient(circle, rgba(233,199,94,0.12), transparent 60%)" }} />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="dq-anim flex items-center gap-3">
          <button onClick={() => router.push("/home")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#cbbfb4] hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#e9c75e]">เช็คอินรายวัน</p>
            <h1 className="text-xl font-bold text-[#faf5ef]">รับเหรียญประจำวัน</h1>
          </div>
        </div>

        <div className="dq-anim mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9c75e]/15 text-[#e9c75e]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            </span>
            <div>
              <p className="text-2xl font-bold text-[#faf5ef]">{s.streak} วัน</p>
              <p className="text-xs text-[#8a7d72]">เช็คอินต่อเนื่อง</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[#e9c75e]">{Number(s.d_coin).toLocaleString()}</p>
            <p className="text-xs text-[#8a7d72]">เหรียญ D</p>
          </div>
        </div>

        <p className="dq-anim mt-6 mb-3 text-sm font-medium text-[#cbbfb4]" style={{ animationDelay: "140ms" }}>รางวัล 7 วัน</p>
        <div className="dq-anim grid grid-cols-4 gap-2.5" style={{ animationDelay: "160ms" }}>
          {s.cycle.map((amt, i) => {
            const isActive = i === activeIndex; const isBig = i === 6;
            return (
              <div key={i} className={`relative flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${
                isActive && s.can_claim ? "border-[#e9c75e] bg-[#e9c75e]/10" :
                isActive && !s.can_claim ? "border-[#f37021]/40 bg-[#f37021]/5" :
                "border-white/10 bg-white/5"} ${isBig ? "col-span-2" : ""}`}>
                <span className="text-[10px] text-[#8a7d72]">วัน {i + 1}{isBig ? " · โบนัส" : ""}</span>
                <span className={`text-base font-bold ${isBig ? "text-[#e9c75e]" : "text-[#f5efe9]"}`}>+{amt}</span>
                {isActive && !s.can_claim && (
                  <span className="absolute right-1.5 top-1.5 text-[#f37021]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="dq-anim mt-7" style={{ animationDelay: "220ms" }}>
          {s.can_claim ? (
            <button onClick={claim} disabled={claiming}
              className="w-full rounded-xl bg-[#e9c75e] py-4 text-base font-bold text-[#16100e] transition-colors hover:bg-[#f0d27a] disabled:opacity-60">
              {claiming ? "กำลังรับ..." : `รับ +${s.today_reward} เหรียญ`}
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 py-4 text-center">
              <p className="text-sm font-semibold text-[#cbbfb4]">เช็คอินวันนี้แล้ว</p>
              <p className="mt-0.5 text-xs text-[#8a7d72]">กลับมารับอีกครั้งพรุ่งนี้</p>
            </div>
          )}
        </div>
      </div>

      {reward !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setReward(null)}>
          <div className="dq-reveal flex w-full max-w-xs flex-col items-center rounded-2xl border border-[#e9c75e]/30 bg-[#1d150f] p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e9c75e]/15 text-[#e9c75e]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h3.25a1.75 1.75 0 0 1 0 3.5H9.5"/></svg>
            </span>
            <p className="mt-4 text-3xl font-bold text-[#e9c75e]">+{reward}</p>
            <p className="mt-1 text-sm text-[#cbbfb4]">เหรียญ D</p>
            <button onClick={() => setReward(null)} className="mt-6 w-full rounded-lg bg-white/10 py-2.5 text-sm font-semibold text-[#f5efe9] hover:bg-white/15">เยี่ยม!</button>
          </div>
        </div>
      )}
    </main>
  );
}