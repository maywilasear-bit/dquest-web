"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type Person = {
  id: string;
  fullname: string;
  group_name: string | null;
  department: string | null;
  status: string;
};

export default function Register() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Person | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ผู้ใช้เก่า: ถ้ายืนยันตัวตนแล้วให้ข้ามไปเลย
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase
        .from("profiles").select("status").eq("auth_id", data.user.id).maybeSingle();
      if (prof?.status === "active") router.push("/home");
      else if (prof?.status === "pending") setPending(true);
    });
  }, [router]);

  async function search(q: string) {
    setQuery(q);
    setError(null);
    if (q.trim().length < 1) { setResults([]); setSearched(false); return; }
    const supabase = createClient();
    const { data, error } = await supabase.rpc("search_roster", { q: q.trim() });
    setSearched(true);
    if (error) setError(error.message);
    else setResults((data as Person[]) ?? []);
  }

  async function claim() {
    if (!selected) return;
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error: authErr } = await supabase.auth.signInAnonymously();
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    const { error: claimErr } = await supabase.rpc("claim_profile", { target: selected.id });
    if (claimErr) { setError(claimErr.message); setLoading(false); return; }
    setLoading(false); setPending(true);
  }

  async function checkApproved() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: prof } = await supabase
        .from("profiles").select("status").eq("auth_id", data.user.id).maybeSingle();
      if (prof?.status === "active") { router.push("/home"); return; }
    }
    setLoading(false);
    setError("ยังไม่ได้รับการอนุมัติ — รออาจารย์ตรวจสอบสักครู่แล้วลองใหม่");
  }

  // รออนุมัติ
  if (pending) {
    return (
      <Shell>
        <div className="dq-anim flex flex-col items-center text-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f37021]/15 text-[#f37021]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#faf5ef]">ส่งคำขอเรียบร้อย</h1>
            <p className="mt-2 text-sm text-[#ab9d92] max-w-xs">ขั้นต่อไป รอครูที่ปรึกษาอนุมัติตัวตนของคุณ เมื่อได้รับอนุมัติแล้วจึงเข้าใช้งานได้</p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button onClick={checkApproved} disabled={loading}
            className="rounded-lg bg-[#f37021] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(243,112,33,0.6)] transition-all hover:-translate-y-0.5 disabled:opacity-60">
            {loading ? "กำลังตรวจสอบ..." : "ตรวจสอบสถานะ"}
          </button>
        </div>
      </Shell>
    );
  }

  // ยืนยันว่าใช่คุณ
  if (selected) {
    return (
      <Shell>
        <div className="dq-anim flex flex-col gap-6">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">ยืนยันตัวตน</p>
            <h1 className="mt-2 text-2xl font-bold text-[#faf5ef]">ใช่คุณหรือไม่?</h1>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
            <p className="text-lg font-semibold text-[#faf5ef]">{selected.fullname}</p>
            <p className="mt-1 text-sm text-[#ab9d92]">{selected.group_name ?? selected.department}</p>
          </div>
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <div className="flex flex-col gap-3">
            <button onClick={claim} disabled={loading}
              className="dq-press dq-shine rounded-lg bg-[#f37021] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(243,112,33,0.6)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? "กำลังส่งคำขอ..." : "ใช่ นี่คือฉัน"}
            </button>
            <button onClick={() => { setSelected(null); setError(null); }} className="text-sm text-[#8a7d72] hover:text-[#ab9d92]">
              ไม่ใช่ ค้นหาใหม่
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ค้นหาชื่อ
  return (
    <Shell>
      <div className="dq-anim flex flex-col gap-5">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">ลงทะเบียน</p>
          <h1 className="mt-2 text-2xl font-bold text-[#faf5ef]">ค้นหาชื่อของคุณ</h1>
          <p className="mt-2 text-sm text-[#ab9d92]">พิมพ์ชื่อหรือนามสกุลเพื่อค้นหาในระบบ</p>
        </div>
        <input autoFocus value={query} onChange={(e) => search(e.target.value)} placeholder="เช่น กิตติ หรือ ใจดี"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021] focus:bg-white/10" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-col gap-2">
          {results.map((p) => (
            <button key={p.id} onClick={() => { setSelected(p); setResults([]); setQuery(""); }}
              className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-[#f37021]/40 hover:bg-white/10">
              <span>
                <span className="block text-sm font-medium text-[#faf5ef]">{p.fullname}</span>
                <span className="block text-xs text-[#8a7d72]">{p.group_name ?? p.department}</span>
              </span>
              <span className="text-[#6f635a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#f37021]">→</span>
            </button>
          ))}
          {searched && results.length === 0 && !error && (
            <p className="py-4 text-center text-sm text-[#8a7d72]">ไม่พบชื่อนี้ในระบบ ลองพิมพ์ใหม่อีกครั้ง</p>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 17rem)", top: "-8rem", background: "radial-gradient(circle, rgba(243,112,33,0.16), transparent 60%)" }} />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}