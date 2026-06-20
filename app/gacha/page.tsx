"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

const COST = 10;
const RARITY: Record<string, string> = { common: "ธรรมดา", rare: "หายาก", epic: "อีพิค", legendary: "ตำนาน" };
type Pull = { name: string; rarity: string; color: string; is_new: boolean; refund: number; balance: number };

export default function Gacha() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState<Pull | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data } = await supabase.rpc("get_home_data");
      if (data) setBalance(Number((data as { d_coin: number }).d_coin));
    })();
  }, [router]);

  async function pull() {
    setError(null); setResult(null); setPulling(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("gacha_pull");
    if (error) {
      setError(error.message.includes("not enough") ? "เหรียญ D ไม่พอ" : error.message);
      setPulling(false);
      return;
    }
    const r = data as Pull;
    setTimeout(() => { setResult(r); setBalance(r.balance); setPulling(false); }, 700);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 20rem)", top: "10%", background: "radial-gradient(circle, rgba(243,112,33,0.16), transparent 60%)" }} />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/home")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#cbbfb4] hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-[#c2a14d]/30 bg-[#c2a14d]/10 py-1.5 pl-1.5 pr-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#e9c75e] to-[#c2a14d] text-[11px] font-bold text-[#3a2e10]">D</span>
            <span className="text-sm font-semibold text-[#e9c75e]">{balance === null ? "…" : balance.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6">
          <div>
            <p className="text-center text-xs font-semibold tracking-[0.25em] text-[#f37021]">กาชา</p>
            <h1 className="mt-1 text-center text-2xl font-bold text-[#faf5ef]">สุ่มรางวัล</h1>
          </div>

          <div className="relative flex h-52 w-52 items-center justify-center">
            {pulling && !result && <div className="h-32 w-32 animate-spin rounded-full border-4 border-white/10 border-t-[#f37021]" />}
            {!pulling && !result && (
              <div className="dq-glow flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#6f635a]">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 12 3l9 5v8l-9 5-9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
              </div>
            )}
            {result && (
              <div className="dq-reveal flex h-40 w-40 items-center justify-center rounded-full"
                style={{ background: `radial-gradient(circle, ${result.color}55, transparent 70%)` }}>
                <div className="h-24 w-24 rounded-2xl"
                  style={{ background: `linear-gradient(145deg, ${result.color}, ${result.color}99)`, boxShadow: `0 0 50px ${result.color}88` }} />
              </div>
            )}
          </div>

          {result && (
            <div className="dq-anim text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: result.color }}>{RARITY[result.rarity] ?? result.rarity}</span>
              <p className="mt-1 text-xl font-bold text-[#faf5ef]">{result.name}</p>
              {result.is_new
                ? <span className="mt-2 inline-block rounded-full bg-[#f37021] px-2.5 py-0.5 text-[11px] font-bold text-white">ใหม่!</span>
                : <span className="mt-2 inline-block rounded-full bg-[#e9c75e]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#e9c75e]">ได้ซ้ำ · คืน +{result.refund} เหรียญ</span>}
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <button onClick={pull} disabled={pulling || (balance !== null && balance < COST)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#ff8636] to-[#ef6a17] px-6 py-4 text-base font-bold text-white shadow-[0_18px_50px_-14px_rgba(243,112,33,0.7)] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0">
          {pulling ? "กำลังสุ่ม..." : result ? "สุ่มอีกครั้ง" : "สุ่ม 1 ครั้ง"}
          <span className="flex items-center gap-1 text-sm font-semibold">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[10px]">D</span>{COST}
          </span>
        </button>
      </div>
    </main>
  );
}