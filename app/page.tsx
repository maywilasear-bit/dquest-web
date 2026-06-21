import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      {/* ambient glows */}
      <div className="dq-glow pointer-events-none absolute h-[44rem] w-[44rem] rounded-full blur-3xl"
        style={{ left: "-10rem", top: "-6rem", background: "radial-gradient(circle, rgba(243,112,33,0.22), transparent 60%)" }} />
      <div className="dq-glow pointer-events-none absolute h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{ right: "-8rem", bottom: "-8rem", background: "radial-gradient(circle, rgba(140,30,30,0.30), transparent 60%)", animationDelay: "2s" }} />
      <div className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ right: "6%", top: "14%", background: "radial-gradient(circle, rgba(233,199,94,0.13), transparent 60%)", animationDelay: "1s" }} />
      {/* texture + accent line */}
      <div className="dq-texture pointer-events-none absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f37021] via-[#8c1e1e] to-transparent" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* masthead */}
        <header className="dq-anim px-6 pt-6 sm:px-10 lg:px-16">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#9c5a2e]">
              <span className="text-[10px] font-bold tracking-wider text-[#cbb29c]">NICEC</span>
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold text-[#f7f1ea] sm:text-lg">วิทยาลัยการอาชีพนายายอาม</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#8a7d72] sm:text-xs">Nayaiam Industrial &amp; Community Education College</div>
            </div>
          </div>
          <div className="mx-auto mt-5 max-w-6xl border-t border-white/10" />
        </header>

        {/* hero */}
        <section className="flex flex-1 items-center px-6 sm:px-10 lg:px-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col-reverse items-center gap-10 py-12 lg:flex-row lg:justify-between lg:py-0">
            <div className="max-w-xl text-center lg:text-left">
              <div className="dq-anim flex items-center justify-center gap-3 lg:justify-start" style={{ animationDelay: "100ms" }}>
                <span className="dq-grow block h-px bg-[#f37021]" />
                <span className="text-xs font-semibold tracking-[0.25em] text-[#f37021]">แพลตฟอร์มกิจกรรมนักศึกษา</span>
              </div>
              <h1 className="dq-pop mt-5 text-6xl font-extrabold tracking-tight text-[#faf5ef] sm:text-7xl"
                style={{ animationDelay: "200ms", textShadow: "0 0 60px rgba(243,112,33,0.25)" }}>D-Quest</h1>
              <p className="dq-anim mt-3 text-2xl font-semibold text-[#f0e8df] sm:text-3xl" style={{ animationDelay: "340ms" }}>สะสมความดี แลกของรางวัล</p>
              <p className="dq-anim mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-[#ab9d92] lg:mx-0" style={{ animationDelay: "460ms" }}>
                ทำความดีในรั้ววิทยาลัย บันทึกเป็นแต้มผ่านการตรวจจากอาจารย์ สะสมไว้แลกรางวัล และร่วมแข่งขันจัดอันดับประจำซีซั่นของแต่ละแผนก
              </p>
              <div className="dq-anim mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[#8a7d72] lg:justify-start" style={{ animationDelay: "580ms" }}>
                <span>วิชาทักษะเยี่ยม</span><span className="text-[#f37021]">·</span>
                <span>เปี่ยมจริยธรรม</span><span className="text-[#f37021]">·</span>
                <span>ล้ำเลิศสามัคคี</span><span className="text-[#f37021]">·</span>
                <span>มีศรีสง่างาม</span>
              </div>
            </div>
            <div className="dq-pop shrink-0" style={{ animationDelay: "260ms" }}>
              <Medallion />
            </div>
          </div>
        </section>

        {/* footer */}
        <footer className="dq-anim px-6 pb-8 sm:px-10 lg:px-16" style={{ animationDelay: "640ms" }}>
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
            <p className="text-center text-[11px] leading-relaxed text-[#8a7d72] sm:text-left">
              191 หมู่ 13 ต.นายายอาม อ.นายายอาม จ.จันทบุรี 22160 · nicec.ac.th
            </p>
            <Link href="/register"
              className="dq-press dq-shine group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#ff8a3d] to-[#ef6a17] px-8 py-3.5 text-sm font-bold text-white shadow-[0_16px_44px_-12px_rgba(243,112,33,0.7)] transition-transform hover:-translate-y-0.5">
              เริ่มต้น <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Medallion() {
  return (
    <div className="dq-float relative h-56 w-56 sm:h-72 sm:w-72">
      <div className="dq-glow absolute inset-0 rounded-full blur-2xl" style={{ background: "radial-gradient(circle, rgba(233,199,94,0.35), transparent 65%)" }} />
      <div className="dq-spin-slow absolute inset-[4%] rounded-full border border-dashed border-[#e9c75e]/25" />
      <div className="absolute inset-[12%] rounded-full border border-[#e9c75e]/15" />
      <svg viewBox="0 0 240 240" className="relative h-full w-full">
        <defs>
          <linearGradient id="coinG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6da7e" />
            <stop offset="55%" stopColor="#e9c75e" />
            <stop offset="100%" stopColor="#b8862b" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="120" r="74" fill="url(#coinG)" />
        <circle cx="120" cy="120" r="74" fill="none" stroke="#fff3cf" strokeOpacity="0.55" strokeWidth="2" />
        <circle cx="120" cy="120" r="60" fill="none" stroke="#a8761f" strokeOpacity="0.5" strokeWidth="2" />
        <text x="120" y="150" fontFamily="sans-serif" fontSize="82" fontWeight="800" fill="#5a3e0e" textAnchor="middle">D</text>
      </svg>
      <span className="dq-twinkle absolute h-1.5 w-1.5 rounded-full bg-[#e9c75e]" style={{ top: "11%", right: "7%" }} />
      <span className="dq-twinkle absolute h-1 w-1 rounded-full bg-[#f37021]" style={{ bottom: "30%", left: "3%", animationDelay: "1s" }} />
      <span className="dq-twinkle absolute h-1.5 w-1.5 rounded-full bg-[#e9c75e]" style={{ bottom: "11%", right: "22%", animationDelay: "0.5s" }} />
      <span className="dq-twinkle absolute h-1 w-1 rounded-full bg-white" style={{ top: "20%", left: "15%", animationDelay: "1.5s" }} />
    </div>
  );
}
