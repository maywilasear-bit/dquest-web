"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type Row = { rk: number; name: string; detail: string | null; score: number; is_me: boolean };
type Board = {
  season: string; dept_label: string;
  college: Row[]; department: Row[];
  my_college: { rank: number; score: number } | null;
  my_dept: { rank: number; score: number } | null;
};

export default function Leaderboard() {
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<"college" | "dept">("college");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data } = await supabase.rpc("get_leaderboards");
      setBoard(data as Board);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;

  const rows = tab === "college" ? board?.college ?? [] : board?.department ?? [];
  const mine = tab === "college" ? board?.my_college : board?.my_dept;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 17rem)", top: "-8rem", background: "radial-gradient(circle, rgba(243,112,33,0.14), transparent 60%)" }} />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="dq-anim flex items-center gap-3">
          <button onClick={() => router.push("/home")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#cbbfb4] hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">อันดับ</p>
            <h1 className="text-xl font-bold text-[#faf5ef]">ซีซั่น: {board?.season}</h1>
          </div>
        </div>

        <div className="dq-anim mt-5 flex gap-2" style={{ animationDelay: "100ms" }}>
          <button onClick={() => setTab("college")} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === "college" ? "bg-[#f37021] text-white" : "border border-white/10 bg-white/5 text-[#cbbfb4] hover:bg-white/10"}`}>ทั้งวิทยาลัย</button>
          <button onClick={() => setTab("dept")} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === "dept" ? "bg-[#f37021] text-white" : "border border-white/10 bg-white/5 text-[#cbbfb4] hover:bg-white/10"}`}>แผนกประจำซีซั่น</button>
        </div>
        {tab === "dept" && <p className="mt-2 text-center text-xs text-[#8a7d72]">{board?.dept_label}</p>}

        <div className="dq-anim mt-4 flex flex-col gap-2" style={{ animationDelay: "180ms" }}>
          {rows.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 py-10 text-center text-sm text-[#8a7d72]">ยังไม่มีอันดับ — เริ่มทำความดีเพื่อขึ้นกระดาน!</div>
          )}
          {rows.map((r) => (
            <div key={`${r.rk}-${r.name}`} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${r.is_me ? "border-[#f37021] bg-[#f37021]/10" : "border-white/10 bg-white/5"}`}>
              <RankBadge rank={r.rk} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#faf5ef]">{r.name}{r.is_me && <span className="ml-1.5 text-xs text-[#f37021]">(คุณ)</span>}</p>
                {r.detail && <p className="truncate text-xs text-[#8a7d72]">{r.detail}</p>}
              </div>
              <span className="shrink-0 text-sm font-bold text-[#e9c75e]">{Number(r.score).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {mine && (
          <div className="dq-anim mt-4 flex items-center justify-between rounded-xl border border-[#f37021]/30 bg-[#f37021]/5 px-4 py-3">
            <span className="text-sm text-[#cbbfb4]">อันดับของคุณ</span>
            <span className="text-sm font-semibold text-[#faf5ef]">#{mine.rank} · <span className="text-[#e9c75e]">{Number(mine.score).toLocaleString()} คะแนน</span></span>
          </div>
        )}
      </div>
    </main>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: "bg-gradient-to-b from-[#f4d03f] to-[#c2a14d] text-[#3a2e10]",
    2: "bg-gradient-to-b from-[#dadada] to-[#a8a8a8] text-[#2a2a2a]",
    3: "bg-gradient-to-b from-[#d8915a] to-[#a8693a] text-[#2a1a0e]",
  };
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${styles[rank] ?? "bg-white/5 text-[#8a7d72]"}`}>{rank}</span>
  );
}