import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#16100e] text-[#f5efe9]">
      {/* แสงเรืองด้านหลัง */}
      <div
        className="dq-glow pointer-events-none absolute h-[42rem] w-[42rem] rounded-full blur-3xl"
        style={{ left: "-8rem", top: "2rem", background: "radial-gradient(circle, rgba(243,112,33,0.20), transparent 60%)" }}
      />
      <div
        className="dq-glow pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ right: "-6rem", bottom: "-6rem", background: "radial-gradient(circle, rgba(140,30,30,0.28), transparent 60%)", animationDelay: "2s" }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* เส้น accent บนสุด */}
        <div className="h-1 bg-gradient-to-r from-[#f37021] via-[#7a1f1f] to-transparent" />

        {/* หัวเว็บ */}
        <header className="dq-anim px-6 sm:px-10 lg:px-16 pt-6">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            {/* ▼ ตราวิทยาลัย — เปลี่ยนเป็นรูปจริงทีหลัง */}
            <div className="w-12 h-12 rounded-full border-2 border-[#9c5a2e] flex items-center justify-center shrink-0">
              <span className="text-[#cbb29c] text-[10px] font-bold tracking-wider">NICEC</span>
            </div>
            <div className="leading-tight">
              <div className="text-base sm:text-lg font-semibold text-[#f7f1ea]">วิทยาลัยการอาชีพนายายอาม</div>
              <div className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-[#8a7d72]">
                Nayaiam Industrial &amp; Community Education College
              </div>
            </div>
          </div>
          <div className="max-w-5xl mx-auto mt-5 border-t border-white/10" />
        </header>

        {/* เนื้อหา */}
        <section className="flex-1 px-6 sm:px-10 lg:px-16 flex items-center">
          <div className="max-w-5xl mx-auto w-full py-16 sm:py-24">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-5">
                <span className="dq-grow block h-px bg-[#f37021]" />
                <span className="dq-anim text-xs font-semibold tracking-[0.2em] text-[#f37021]" style={{ animationDelay: "150ms" }}>
                  แพลตฟอร์มกิจกรรมนักศึกษา
                </span>
              </div>

              <h1 className="dq-anim text-6xl sm:text-7xl font-bold tracking-tight text-[#faf5ef]" style={{ animationDelay: "250ms" }}>
                D-Quest
              </h1>
              <p className="dq-anim mt-3 text-2xl sm:text-3xl font-semibold text-[#f0e8df]" style={{ animationDelay: "370ms" }}>
                สะสมความดี แลกของรางวัล
              </p>

              <p className="dq-anim mt-6 text-[15px] sm:text-base leading-relaxed text-[#ab9d92] max-w-md" style={{ animationDelay: "490ms" }}>
                ทำความดีในรั้ววิทยาลัย บันทึกเป็นแต้มผ่านการตรวจจากอาจารย์
                สะสมไว้แลกรางวัล และร่วมแข่งขันจัดอันดับประจำซีซั่นของแต่ละแผนก
              </p>

              <div className="dq-anim mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8a7d72]" style={{ animationDelay: "610ms" }}>
                <span>วิชาทักษะเยี่ยม</span><span className="text-[#f37021]">·</span>
                <span>เปี่ยมจริยธรรม</span><span className="text-[#f37021]">·</span>
                <span>ล้ำเลิศสามัคคี</span><span className="text-[#f37021]">·</span>
                <span>มีศรีสง่างาม</span>
              </div>
            </div>
          </div>
        </section>

        {/* ส่วนท้าย + ปุ่ม */}
        <footer className="dq-anim px-6 sm:px-10 lg:px-16 pb-8" style={{ animationDelay: "500ms" }}>
          <div className="max-w-5xl mx-auto border-t border-white/10 pt-5 flex items-end justify-between gap-4">
            <p className="text-[11px] text-[#8a7d72] leading-relaxed hidden sm:block">
              191 หมู่ 13 ต.นายายอาม อ.นายายอาม จ.จันทบุรี 22160
              <br />
              nicec.ac.th
            </p>
            <Link
              href="/register"
              className="group ml-auto inline-flex items-center gap-2 bg-[#f37021] hover:bg-[#ff7d2a] text-white text-sm font-semibold px-7 py-3.5 rounded-lg shadow-[0_12px_40px_-12px_rgba(243,112,33,0.6)] hover:-translate-y-0.5 transition-all duration-200"
            >
              เริ่มต้น
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}