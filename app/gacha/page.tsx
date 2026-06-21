"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { RollingNumber } from "../../utils/RollingNumber";
import { GachaMachine } from "../../utils/GachaMachine";

const COST = 10;
const RARITY: Record<string, string> = { common: "ธรรมดา", rare: "หายาก", epic: "อีพิค", legendary: "ตำนาน" };
type Pull = { name: string; rarity: string; color: string; is_new: boolean; refund: number; balance: number };
type Phase = "idle" | "crank" | "capsule" | "opening" | "done";

export default function Gacha() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Pull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spin, setSpin] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data } = await supabase.rpc("get_home_data");
      if (data) setBalance(Number((data as { d_coin: number }).d_coin));
    })();
    const t = timers.current;
    return () => { t.forEach((id) => clearTimeout(id)); };
  }, [router]);

  function after(ms: number, fn: () => void) {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }

  async function pull() {
    if (phase !== "idle" && phase !== "done") return;
    if (balance !== null && balance < COST) { setError("เหรียญ D ไม่พอ — ทำความดีรับเพิ่มก่อนนะ"); return; }
    setError(null); setResult(null);
    setSpin((s) => s + 1);
    setPhase("crank");
    const supabase = createClient();
    const t0 = Date.now();
    const { data, error: e } = await supabase.rpc("gacha_pull");
    if (e) {
      setError(e.message.includes("not enough") ? "เหรียญ D ไม่พอ — ทำความดีรับเพิ่มก่อนนะ" : e.message);
      setPhase("idle");
      return;
    }
    const r = data as Pull;
    const wait = Math.max(0, 1350 - (Date.now() - t0)); // ให้ตู้บิดครบจังหวะก่อน
    after(wait, () => { setResult(r); setPhase("capsule"); });
  }

  function openCapsule() {
    if (phase !== "capsule") return;
    setPhase("opening");
    after(780, () => { if (result) setBalance(result.balance); setPhase("done"); });
  }

  function again() {
    if (phase !== "done") return;
    setResult(null); setError(null); setPhase("idle");
  }

  const lowBalance = balance !== null && balance < COST;
  const r = result;
  const color = r?.color ?? "#e9c75e";
  const isHigh = r?.rarity === "legendary" || r?.rarity === "epic";
  const focus = phase === "capsule" || phase === "opening" || phase === "done";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[40rem] w-[40rem] rounded-full blur-3xl transition-colors duration-700"
        style={{ left: "calc(50% - 20rem)", top: "6%", background: `radial-gradient(circle, ${(phase === "done" || phase === "opening") ? color + "33" : "rgba(243,112,33,0.16)"}, transparent 60%)` }} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
        {/* แถบบน */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/home")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#cbbfb4] hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-[#c2a14d]/30 bg-[#c2a14d]/10 py-1.5 pl-1.5 pr-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#e9c75e] to-[#c2a14d] text-[11px] font-bold text-[#3a2e10]">D</span>
            {balance === null
              ? <span className="text-sm font-semibold text-[#e9c75e]">…</span>
              : <RollingNumber value={balance} duration={650} className="text-sm font-semibold text-[#e9c75e]" />}
          </div>
        </div>

        {/* หัวเรื่อง */}
        <div className="mt-2 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-[#f37021]">กาชาปอง</p>
          <h1 className="mt-1 text-2xl font-bold text-[#faf5ef]">ตู้สุ่มรางวัล</h1>
        </div>

        {/* เวที */}
        <div className="relative flex flex-1 items-center justify-center">
          {/* ตัวตู้ (idle + crank) */}
          <div className={`relative transition-all duration-500 ${focus ? "scale-90 opacity-20 blur-sm" : "opacity-100"}`}>
            <div className={phase === "crank" ? "gc-shake" : "dq-float"}>
              <GachaMachine cranking={phase === "crank"} spinKey={spin} className="h-[21rem] w-auto" />
            </div>
            {phase === "crank" && (
              <div key={spin} className="gc-coin-in absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-b from-[#f3d784] to-[#c2a14d] text-[10px] font-bold text-[#3a2e10]" style={{ marginTop: "1.4rem" }}>D</div>
            )}
          </div>

          {/* โฟกัส: แคปซูล / เปิด / ผลลัพธ์ */}
          {focus && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {(phase === "opening" || phase === "done") && <Burst color={color} />}
              {phase === "opening" && <div className="gc-flash pointer-events-none absolute inset-0 bg-white" />}

              {/* แคปซูลรอเปิด */}
              {phase === "capsule" && (
                <button onClick={openCapsule} className="group relative z-10 flex flex-col items-center">
                  <div className="gc-drop">
                    <div className="gc-wiggle dq-press">
                      <CapsuleSVG color={color} part="whole" size={148} />
                    </div>
                  </div>
                  <p className="mt-7 animate-pulse text-sm font-semibold text-[#e9c75e]">แตะแคปซูลเพื่อเปิด!</p>
                </button>
              )}

              {/* เปิด: สองซีกกระเด็น + ประกาย */}
              {phase === "opening" && (
                <>
                  <div className="gc-half-top absolute" style={{ left: "50%", top: "50%", marginLeft: -74, marginTop: -74 }}><CapsuleSVG color={color} part="top" size={148} /></div>
                  <div className="gc-half-bottom absolute" style={{ left: "50%", top: "50%", marginLeft: -74, marginTop: -74 }}><CapsuleSVG color={color} part="bottom" size={148} /></div>
                  <Sparks color={color} />
                </>
              )}

              {/* รางวัล */}
              {(phase === "opening" || phase === "done") && (
                <div className="relative z-10 gc-prize"><Prize color={color} /></div>
              )}

              {phase === "done" && isHigh && <Confetti color={color} />}
            </div>
          )}
        </div>

        {/* การ์ดผลลัพธ์ */}
        {phase === "done" && r && (
          <div className="dq-anim mb-4 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color }}>{RARITY[r.rarity] ?? r.rarity}</span>
            <p className="mt-1 text-xl font-bold text-[#faf5ef]">{r.name}</p>
            {r.is_new
              ? <span className="mt-2 inline-block rounded-full bg-[#f37021] px-2.5 py-0.5 text-[11px] font-bold text-white">ใหม่!</span>
              : <span className="mt-2 inline-block rounded-full bg-[#e9c75e]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#e9c75e]">ได้ซ้ำ · คืน +{r.refund} เหรียญ</span>}
          </div>
        )}

        {error && <p className="mb-3 text-center text-sm text-red-400">{error}</p>}

        {/* ปุ่ม */}
        <div className="pb-1">
          {phase === "capsule" ? (
            <p className="py-4 text-center text-sm text-[#8a7d72]">แตะแคปซูลด้านบนเพื่อเปิด</p>
          ) : phase === "opening" ? (
            <div className="py-7" />
          ) : (
            <button onClick={phase === "done" ? again : pull} disabled={phase === "crank" || (phase !== "done" && lowBalance)}
              className="dq-press dq-shine flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#ff8636] to-[#ef6a17] px-6 py-4 text-base font-bold text-white shadow-[0_18px_50px_-14px_rgba(243,112,33,0.7)] transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0">
              {phase === "crank" ? "กำลังบิด..." : phase === "done" ? "สุ่มอีกครั้ง" : lowBalance ? "เหรียญไม่พอ" : "บิดกาชา"}
              {phase !== "crank" && (
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[10px]">D</span>{COST}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

/* ---------- ชิ้นส่วนภาพ ---------- */

function CapsuleSVG({ color, part = "whole", size = 140 }: { color: string; part?: "whole" | "top" | "bottom"; size?: number }) {
  const cream = "#efe6d8";
  const id = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.45))" }}>
      <defs>
        <clipPath id={`cap-${id}`}><circle cx="50" cy="50" r="42" /></clipPath>
      </defs>
      {part === "whole" && (
        <>
          <g clipPath={`url(#cap-${id})`}>
            <rect x="8" y="8" width="84" height="42" fill={color} />
            <rect x="8" y="50" width="84" height="42" fill={cream} />
          </g>
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
          <rect x="6" y="45" width="88" height="10" rx="3" fill="rgba(0,0,0,0.10)" />
          <line x1="8" y1="50" x2="92" y2="50" stroke="rgba(0,0,0,0.16)" strokeWidth="1.6" />
          <ellipse cx="36" cy="32" rx="13" ry="8" fill="rgba(255,255,255,0.6)" transform="rotate(-24 36 32)" />
        </>
      )}
      {part === "top" && (
        <>
          <path d="M 8 50 A 42 42 0 0 1 92 50 Z" fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
          <rect x="6" y="45" width="88" height="9" rx="3" fill={color} stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
          <ellipse cx="36" cy="32" rx="13" ry="8" fill="rgba(255,255,255,0.55)" transform="rotate(-24 36 32)" />
        </>
      )}
      {part === "bottom" && (
        <>
          <path d="M 8 50 A 42 42 0 0 0 92 50 Z" fill={cream} stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
          <rect x="6" y="46" width="88" height="9" rx="3" fill="#dfd4c4" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
        </>
      )}
    </svg>
  );
}

function Burst({ color }: { color: string }) {
  const rays = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="dq-reveal relative" style={{ width: 320, height: 320 }}>
        <svg viewBox="0 0 320 320" className="gc-rays-spin h-full w-full">
          {rays.map((i) => {
            const a = (i * 22.5 * Math.PI) / 180;
            const cx = 160, cy = 160;
            const x1 = cx + Math.cos(a) * 46, y1 = cy + Math.sin(a) * 46;
            const x2 = cx + Math.cos(a) * 150, y2 = cy + Math.sin(a) * 150;
            const w = i % 2 === 0 ? 8 : 3.5;
            const ax = Math.cos(a + Math.PI / 2), ay = Math.sin(a + Math.PI / 2);
            const d = `M ${x1 + ax * w} ${y1 + ay * w} L ${x2 + ax * 1.5} ${y2 + ay * 1.5} L ${x2 - ax * 1.5} ${y2 - ay * 1.5} L ${x1 - ax * w} ${y1 - ay * w} Z`;
            return <path key={i} d={d} fill={color} opacity={i % 2 === 0 ? 0.5 : 0.22} />;
          })}
          <circle cx="160" cy="160" r="96" fill="none" stroke={color} strokeWidth="3" opacity="0.45" />
          <circle cx="160" cy="160" r="120" fill="none" stroke={color} strokeWidth="1.5" opacity="0.28" />
        </svg>
        <div className="gc-burst absolute rounded-full border-2" style={{ inset: 64, borderColor: color }} />
      </div>
    </div>
  );
}

function Prize({ color }: { color: string }) {
  const light = useMemo(() => lighten(color, 0.55), [color]);
  const id = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" style={{ filter: `drop-shadow(0 0 26px ${color})` }}>
      <defs>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <g transform="rotate(45 75 75)">
        <rect x="44" y="44" width="62" height="62" rx="15" fill={`url(#gem-${id})`} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      </g>
      <ellipse cx="62" cy="60" rx="13" ry="7" fill="rgba(255,255,255,0.55)" transform="rotate(-30 62 60)" />
      <path d="M110 42 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

function Sparks({ color }: { color: string }) {
  const parts = useMemo(
    () => Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 95 + Math.random() * 75;
      const s = 5 + Math.random() * 5;
      return { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, delay: Math.random() * 0.12, s, c: i % 3 === 0 ? "#ffffff" : color };
    }),
    [color]
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {parts.map((p, i) => (
        <span key={i} className="gc-spark absolute block rounded-full"
          style={{ width: p.s, height: p.s, background: p.c, marginLeft: -p.s / 2, marginTop: -p.s / 2, "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, animationDelay: `${p.delay}s` } as React.CSSProperties} />
      ))}
    </div>
  );
}

function Confetti({ color }: { color: string }) {
  const cols = [color, "#e9c75e", "#ffffff", "#f37021"];
  const bits = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      left: Math.random() * 100, delay: Math.random() * 0.7, c: cols[i % cols.length],
      w: 5 + Math.random() * 5, h: 8 + Math.random() * 7, dur: 1.5 + Math.random(),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <span key={i} className="gc-confetti absolute top-0 block"
          style={{ left: `${b.left}%`, width: b.w, height: b.h, background: b.c, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, borderRadius: 1 }} />
      ))}
    </div>
  );
}

function lighten(hex: string, amt = 0.5): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#ffffff";
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  const f = (c: number) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}
