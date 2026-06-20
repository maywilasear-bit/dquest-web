"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type Profile = {
  display_name: string | null; realname: string; fullname: string;
  department: string | null; level: string | null; group_name: string | null;
  d_coin: number; behavior: number; d_score: number; season: string;
};

const BLOCKED = ["เหี้ย", "สัส", "ควย", "fuck", "shit"]; // ขยายเพิ่มได้
function validName(n: string): string | null {
  const t = n.trim();
  if (t.length < 2) return "ชื่อสั้นเกินไป (อย่างน้อย 2 ตัวอักษร)";
  if (t.length > 20) return "ชื่อยาวเกินไป (ไม่เกิน 20 ตัวอักษร)";
  if (BLOCKED.some((w) => t.toLowerCase().includes(w))) return "ชื่อมีคำไม่เหมาะสม";
  return null;
}

export default function Profile() {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data } = await supabase.rpc("get_profile");
      if (!data) { router.push("/"); return; }
      const prof = data as Profile;
      setP(prof); setName(prof.display_name ?? ""); setLoading(false);
    })();
  }, [router]);

  async function save() {
    const v = validName(name);
    if (v) { setErr(v); setMsg(null); return; }
    setSaving(true); setErr(null); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_display_name", { new_name: name.trim() });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setMsg("บันทึกชื่อเล่นแล้ว");
    setP((prev) => prev ? { ...prev, display_name: name.trim() } : prev);
  }

  if (loading || !p) return <main className="min-h-screen flex items-center justify-center bg-[#16100e] text-[#8a7d72]">กำลังโหลด...</main>;

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
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">โปรไฟล์</p>
            <h1 className="text-xl font-bold text-[#faf5ef]">ข้อมูลของฉัน</h1>
          </div>
        </div>

        <div className="dq-anim mt-5 flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center" style={{ animationDelay: "80ms" }}>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2a201b] text-[#6f635a]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /></svg>
          </div>
          <p className="mt-3 text-lg font-bold text-[#faf5ef]">{p.display_name || p.realname}</p>
          {p.display_name && <p className="text-xs text-[#8a7d72]">{p.realname}</p>}
          <p className="mt-1 text-xs text-[#8a7d72]">{[p.level, p.department].filter(Boolean).join(" · ")}</p>
        </div>

        <div className="dq-anim mt-3 grid grid-cols-3 gap-3" style={{ animationDelay: "140ms" }}>
          <Stat label="คะแนนความดี" value={Number(p.d_score).toLocaleString()} color="#f37021" />
          <Stat label="เหรียญ D" value={Number(p.d_coin).toLocaleString()} color="#e9c75e" />
          <Stat label="ความประพฤติ" value={String(p.behavior)} color="#60a5fa" />
        </div>

        <div className="dq-anim mt-3 rounded-xl border border-white/10 bg-white/5 p-4" style={{ animationDelay: "200ms" }}>
          <p className="mb-2 text-sm font-medium text-[#cbbfb4]">ตั้งชื่อเล่น</p>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => { setName(e.target.value); setErr(null); setMsg(null); }} placeholder="ชื่อเล่นของคุณ" maxLength={20}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021]" />
            <button onClick={save} disabled={saving} className="rounded-lg bg-[#f37021] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7d2a] disabled:opacity-50">{saving ? "..." : "บันทึก"}</button>
          </div>
          {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
          {msg && <p className="mt-2 text-sm text-[#7dd87d]">{msg}</p>}
          <p className="mt-2 text-xs text-[#6f635a]">ชื่อจริงจะแสดงควบคู่เสมอ</p>
        </div>

        <div className="dq-anim mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 opacity-70" style={{ animationDelay: "260ms" }}>
          <div>
            <p className="text-sm font-medium text-[#cbbfb4]">ปรับแต่งตัวละคร</p>
            <p className="text-xs text-[#6f635a]">เลือกหน้าตา / ใช้ของจากกาชา</p>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-[#8a7d72]">เร็วๆ นี้</span>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center">
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] leading-tight text-[#8a7d72]">{label}</span>
    </div>
  );
}