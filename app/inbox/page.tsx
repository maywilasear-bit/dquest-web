"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type Notif = { id: string; type: string | null; title: string | null; body: string | null; is_read: boolean; created_at: string };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}
function clean(s: string | null) {
  return (s ?? "").replace(/[✅❌🎉⭐]/g, "").trim();
}

export default function Inbox() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data } = await supabase.from("notifications")
        .select("id, type, title, body, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems((data as Notif[]) ?? []);
      setLoading(false);
      await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    })();
  }, [router]);

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;

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
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">กล่องข้อความ</p>
            <h1 className="text-xl font-bold text-[#faf5ef]">การแจ้งเตือน</h1>
          </div>
        </div>

        <div className="dq-anim mt-5 flex flex-col gap-2.5" style={{ animationDelay: "100ms" }}>
          {items.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center text-sm text-[#8a7d72]">ยังไม่มีข้อความ</div>
          )}
          {items.map((n) => {
            const approved = n.type === "approved";
            const rejected = n.type === "rejected";
            return (
              <div key={n.id} className={`flex gap-3 rounded-xl border p-4 ${!n.is_read ? "border-[#f37021]/30 bg-[#f37021]/5" : "border-white/10 bg-white/5"}`}>
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${approved ? "bg-[#f37021]/15 text-[#f37021]" : rejected ? "bg-red-500/15 text-red-400" : "bg-white/10 text-[#cbbfb4]"}`}>
                  {approved ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : rejected ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#faf5ef]">{clean(n.title)}</p>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f37021]" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-[#ab9d92]">{clean(n.body)}</p>}
                  <p className="mt-1.5 text-xs text-[#6f635a]">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}