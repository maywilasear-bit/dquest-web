"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type Champ = { rank: number; name: string; realname: string | null; score: number };
type HofSeason = {
  number: number;
  theme_label: string;
  icon: string | null;
  dept_label: string;
  college: Champ[];
  department: Champ[];
};

export default function HallOfFame() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<HofSeason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data } = await supabase.rpc("get_hall_of_fame");
      setSeasons((data as HofSeason[]) ?? []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 17rem)", top: "-8rem", background: "radial-gradient(circle, rgba(233,199,94,0.12), transparent 60%)" }} />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="dq-anim flex items-center gap-3">
          <button onClick={() => router.push("/leaderboard")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#cbbfb4] hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#e9c75e]">หอเกียรติยศ</p>
            <h1 className="text-xl font-bold text-[#faf5ef]">แชมป์ประจำซีซั่น</h1>
          </div>
        </div>

        {seasons.length === 0 && (
          <div className="dq-anim mt-6 rounded-xl border border-white/10 bg-white/5 py-12 px-5 text-center text-sm text-[#8a7d72]" style={{ animationDelay: "100ms" }}>
            ยังไม่มีแชมป์ — เมื่อจบซีซั่นแรก รายชื่อผู้ชนะจะถูกสลักไว้ที่นี่ถาวร
          </div>
        )}

        <div className="mt-5 flex flex-col gap-6">
          {seasons.map((s, i) => (
            <div key={s.number} className="dq-anim rounded-2xl border border-white/10 bg-white/5 p-5" style={{ animationDelay: `${100 + i * 80}ms` }}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-[11px] text-[#8a7d72]">ซีซั่น {s.number}</p>
                  <p className="text-sm font-bold text-[#faf5ef]">{s.theme_label}</p>
                </div>
              </div>

              {s.department.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#e9c75e]/30 bg-[#e9c75e]/10 p-4">
                  <p className="text-[11px] font-semibold tracking-wide text-[#e9c75e]">แชมป์แผนก · {s.dept_label}</p>
                  {s.department.map((c, k) => (
                    <div key={k} className="mt-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#faf5ef]">{c.name}</p>
                        {c.realname && c.realname !== c.name && <p className="truncate text-xs text-[#8a7d72]">{c.realname}</p>}
                      </div>
                      <span className="shrink-0 text-sm font-bold text-[#e9c75e]">{Number(c.score).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-4 mb-2 text-[11px] font-semibold tracking-wide text-[#cbbfb4]">อันดับวิทยาลัย</p>
              <div className="flex flex-col gap-2">
                {s.college.length === 0 && <p className="text-xs text-[#6f635a]">ไม่มีผู้เข้าแข่งในซีซั่นนี้</p>}
                {s.college.map((c, k) => (
                  <div key={k} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <RankBadge rank={c.rank} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#faf5ef]">{c.name}</p>
                      {c.realname && c.realname !== c.name && <p className="truncate text-xs text-[#8a7d72]">{c.realname}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-[#e9c75e]">{Number(c.score).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
