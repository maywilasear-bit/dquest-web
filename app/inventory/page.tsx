"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

const RARITY: Record<string, string> = { common: "ธรรมดา", rare: "หายาก", epic: "อีพิค", legendary: "ตำนาน" };
type Item = { name: string; rarity: string; color: string; qty: number; obtained_at: string };

export default function Inventory() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const [inv, cat] = await Promise.all([
        supabase.rpc("list_inventory"),
        supabase.from("gacha_items").select("id", { count: "exact", head: true }),
      ]);
      setItems((inv.data as Item[]) ?? []);
      setTotal(cat.count ?? 0);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 17rem)", top: "-8rem", background: "radial-gradient(circle, rgba(243,112,33,0.12), transparent 60%)" }} />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="dq-anim flex items-center gap-3">
          <button onClick={() => router.push("/home")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#cbbfb4] hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">กระเป๋า</p>
            <h1 className="text-xl font-bold text-[#faf5ef]">ของสะสม</h1>
          </div>
        </div>

        <div className="dq-anim mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#cbbfb4]">สะสมได้</span>
            <span className="font-semibold text-[#faf5ef]">{items.length} <span className="text-[#8a7d72]">/ {total} แบบ</span></span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#f37021] to-[#e9c75e]" style={{ width: total > 0 ? `${(items.length / total) * 100}%` : "0%" }} />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="dq-anim mt-6 flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-white/5 py-12 text-center" style={{ animationDelay: "140ms" }}>
            <p className="text-sm text-[#8a7d72]">ยังไม่มีของในคลัง</p>
            <button onClick={() => router.push("/gacha")} className="rounded-lg bg-[#f37021] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7d2a]">ไปสุ่มกาชา</button>
          </div>
        ) : (
          <div className="dq-anim mt-4 grid grid-cols-3 gap-3" style={{ animationDelay: "140ms" }}>
            {items.map((it, i) => (
              <div key={it.name + i} className="relative flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                {it.qty > 1 && <span className="absolute right-1.5 top-1.5 rounded-full bg-black/40 px-1.5 text-[10px] font-bold text-[#faf5ef]">×{it.qty}</span>}
                <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `radial-gradient(circle, ${it.color}44, transparent 70%)` }}>
                  <div className="h-10 w-10 rounded-xl" style={{ background: `linear-gradient(145deg, ${it.color}, ${it.color}99)`, boxShadow: `0 0 18px ${it.color}66` }} />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium leading-tight text-[#faf5ef]">{it.name}</p>
                  <p className="text-[10px] font-semibold" style={{ color: it.color }}>{RARITY[it.rarity] ?? it.rarity}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}