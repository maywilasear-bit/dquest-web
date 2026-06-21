"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type Ann = { id: string; title: string; body: string | null; author_name: string; created_at: string };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

export default function Announcements() {
  const router = useRouter();
  const [items, setItems] = useState<Ann[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [del, setDel] = useState<string | null>(null);

  const loadAnn = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("list_announcements");
    setItems((data as Ann[]) ?? []);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data: prof } = await supabase.from("profiles").select("role").eq("auth_id", u.user.id).maybeSingle();
      setIsStaff(prof?.role === "teacher" || prof?.role === "admin");
      await loadAnn();
      setLoading(false);
    })();
  }, [router, loadAnn]);

  async function post() {
    if (!title.trim()) return;
    setPosting(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("post_announcement", { p_title: title.trim(), p_body: body.trim() || null });
    if (error) { setError(error.message); setPosting(false); return; }
    setTitle(""); setBody("");
    await loadAnn();
    setPosting(false);
  }

  async function deleteAnn(id: string) {
    if (!window.confirm("ลบประกาศนี้?")) return;
    setDel(id); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_delete_announcement", { p_id: id });
    setDel(null);
    if (error) { setError(error.message); return; }
    setItems((it) => it.filter((x) => x.id !== id));
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 17rem)", top: "-8rem", background: "radial-gradient(circle, rgba(243,112,33,0.12), transparent 60%)" }} />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="dq-anim flex items-center gap-3">
          <button onClick={() => router.push(isStaff ? "/staff" : "/home")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#cbbfb4] hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">ประกาศ</p>
            <h1 className="text-xl font-bold text-[#faf5ef]">ข่าวจากวิทยาลัย</h1>
          </div>
        </div>

        {isStaff && (
          <div className="dq-anim mt-5 rounded-xl border border-[#f37021]/30 bg-[#f37021]/5 p-4" style={{ animationDelay: "80ms" }}>
            <p className="mb-2 text-xs font-semibold text-[#f37021]">เขียนประกาศใหม่</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="หัวข้อ"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021]" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="รายละเอียด (ไม่บังคับ)"
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021]" />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <button onClick={post} disabled={posting || !title.trim()}
              className="mt-2 w-full rounded-lg bg-[#f37021] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-40">
              {posting ? "กำลังประกาศ..." : "ประกาศ"}
            </button>
          </div>
        )}

        <div className="dq-anim mt-5 flex flex-col gap-3" style={{ animationDelay: "140ms" }}>
          {items.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center text-sm text-[#8a7d72]">ยังไม่มีประกาศ</div>
          )}
          {items.map((a) => (
            <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f37021]/15 text-[#f37021]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#faf5ef]">{a.title}</p>
                  {a.body && <p className="mt-1 whitespace-pre-wrap text-sm text-[#ab9d92]">{a.body}</p>}
                  <p className="mt-2 text-xs text-[#6f635a]">{a.author_name} · {timeAgo(a.created_at)}</p>
                </div>
                {isStaff && (
                  <button onClick={() => deleteAnn(a.id)} disabled={del === a.id}
                    className="shrink-0 text-xs text-[#8a7d72] hover:text-[#e7a18a] disabled:opacity-50">{del === a.id ? "..." : "ลบ"}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}