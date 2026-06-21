"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type DeedType = { id: number; label_th: string; min_score: number; max_score: number };

export default function Quest() {
  const router = useRouter();
  const [types, setTypes] = useState<DeedType[]>([]);
  const [deedId, setDeedId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/"); return; }
      const { data } = await supabase.rpc("list_deed_types");
      setTypes((data as DeedType[]) ?? []);
    })();
  }, [router]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!deedId || !file) return;
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.push("/"); return; }
    // ย่อ + บีบอัดรูปฝั่งเครื่องก่อนอัป (กันพื้นที่ Storage เต็ม — แผน §6.4)
    const blob = await compressImage(file);
    const path = `${u.user.id}/${Date.now()}.jpg`;
    const up = await supabase.storage.from("deed-photos").upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) { setError("อัปโหลดรูปไม่สำเร็จ: " + up.error.message); setLoading(false); return; }
    const pos = await getPosition();   // เก็บพิกัด (ถ้าอนุญาต) — ไม่บล็อกถ้าปฏิเสธ
    const { error } = await supabase.rpc("submit_deed", { p_deed: deedId, p_photo: path, p_desc: desc, p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null });
    if (error) { setError(error.message); setLoading(false); return; }
    setLoading(false); setDone(true);
  }

  if (done) {
    return (
      <Shell>
        <div className="dq-anim flex flex-col items-center text-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f37021]/15 text-[#f37021]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#faf5ef]">ขอบคุณที่ทำความดีวันนี้</h1>
            <p className="mt-2 text-sm text-[#ab9d92] max-w-xs">สิ่งเล็กๆ ที่คุณลงมือทำ ทำให้ส่วนรวมดีขึ้นจริงๆ · รอครูตรวจสักครู่ แล้วคะแนนกับเหรียญจะเข้า</p>
          </div>
          <button onClick={() => router.push("/home")} className="rounded-lg bg-[#f37021] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(243,112,33,0.6)] transition-all hover:-translate-y-0.5">กลับหน้าหลัก</button>
        </div>
      </Shell>
    );
  }

  const canSubmit = deedId !== null && file !== null && !loading;

  return (
    <Shell>
      <div className="dq-anim flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/home")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#cbbfb4] hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f37021]">ทำความดี</p>
            <h1 className="text-xl font-bold text-[#faf5ef]">บันทึกความดีของคุณ</h1>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[#cbbfb4]">เลือกประเภท</p>
          {types.map((t) => (
            <button key={t.id} onClick={() => setDeedId(t.id)}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${deedId === t.id ? "border-[#f37021] bg-[#f37021]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
              <span className="pr-2 text-sm font-medium text-[#faf5ef]">{t.label_th}</span>
              <span className="shrink-0 text-xs font-semibold text-[#e9c75e]">{t.min_score}–{t.max_score} คะแนน</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[#cbbfb4]">รูปถ่าย</p>
          <label className="flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/5 transition-colors hover:bg-white/10">
            {preview ? (
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-[#8a7d72]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></svg>
                <span className="text-sm">เพิ่มรูปถ่าย</span>
              </span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={pickFile} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[#cbbfb4]">รายละเอียด (ไม่บังคับ)</p>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="เล่าสั้นๆ ว่าทำอะไร ที่ไหน"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#faf5ef] placeholder:text-[#6f635a] outline-none focus:border-[#f37021] focus:bg-white/10" />
        </div>

        {!withinHours() && (
          <p className="rounded-lg border border-[#e9c75e]/30 bg-[#e9c75e]/10 px-3 py-2 text-xs text-[#e9c75e]">ส่งความดีได้เฉพาะเวลา 07:35–16:00 น. เท่านั้น</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button onClick={submit} disabled={!canSubmit || !withinHours()}
          className="rounded-lg bg-[#f37021] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(243,112,33,0.6)] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0">
          {loading ? "กำลังส่ง..." : "ส่งให้ครูตรวจ"}
        </button>
      </div>
    </Shell>
  );
}

// ย่อรูปให้ด้านยาวสุดไม่เกิน maxDim แล้วบีบอัดเป็น JPEG — ลดขนาดไฟล์ลงมาก
async function compressImage(file: File, maxDim = 1280, quality = 0.72): Promise<Blob> {
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });
    let w = img.width, h = img.height;
    if (w >= h && w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
    else if (h > w && h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file; // ถ้าบีบอัดไม่ได้ ใช้ไฟล์เดิม (ไม่ให้พังการส่ง)
  }
}

// ส่งได้เฉพาะ 07:35–16:00 (ใช้เวลาเครื่อง; server เป็นด่านจริงอีกชั้น)
function withinHours(): boolean {
  const n = new Date();
  const m = n.getHours() * 60 + n.getMinutes();
  return m >= 7 * 60 + 35 && m <= 16 * 60;
}

// ขอพิกัดจากเบราว์เซอร์ — คืน null ถ้าไม่อนุญาต/ไม่รองรับ (ไม่ทำให้ส่งไม่ได้)
function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      <div className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ left: "calc(50% - 17rem)", top: "-8rem", background: "radial-gradient(circle, rgba(243,112,33,0.14), transparent 60%)" }} />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-5 py-8">{children}</div>
    </main>
  );
}