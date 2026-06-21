"use client";

// ตู้กาชาปอง D-Quest — โดมแก้ว · แคปซูลสองสี · ลูกบิดทอง · ช่องจ่าย
// cranking=true: ลูกบิดหมุน + แคปซูลในโดมขยับแรง (ใช้คู่กับ .gc-shake ที่ครอบจากหน้า)
// spinKey: เปลี่ยนค่าเพื่อรีสตาร์ทอนิเมชันลูกบิดทุกครั้งที่บิด

const CAPS = ["#f37021", "#e9c75e", "#5bb3a6", "#e07a9b", "#8a7fc7", "#d6645f", "#6fa8dc", "#7cc36b"];
const GX = 130;
const GY = 92;
// ตำแหน่งแคปซูลในโดม (เทียบจากจุดศูนย์กลางโดม)
const POS: [number, number][] = [
  [-38, 18], [0, 30], [38, 16], [-22, -8], [20, -6], [-2, -26],
  [-46, -18], [44, -22], [12, 44], [-20, 40], [30, 42], [-2, 8],
];

function Cap({ id, cx, cy, r, color }: { id: number; cx: number; cy: number; r: number; color: string }) {
  const cream = "#efe6d8";
  return (
    <g>
      <clipPath id={`gm-cap-${id}`}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath={`url(#gm-cap-${id})`}>
        <rect x={cx - r} y={cy - r} width={2 * r} height={r} fill={color} />
        <rect x={cx - r} y={cy} width={2 * r} height={r} fill={cream} />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="rgba(0,0,0,0.12)" strokeWidth={1.2} />
      <ellipse cx={cx - r * 0.35} cy={cy - r * 0.45} rx={r * 0.32} ry={r * 0.2} fill="rgba(255,255,255,0.55)" />
    </g>
  );
}

export function GachaMachine({ cranking = false, spinKey = 0, className }: { cranking?: boolean; spinKey?: number; className?: string }) {
  return (
    <svg viewBox="0 0 260 330" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gm-glass" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(120,90,60,0.10)" />
        </radialGradient>
        <linearGradient id="gm-collar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3d784" />
          <stop offset="50%" stopColor="#e9c75e" />
          <stop offset="100%" stopColor="#b8923f" />
        </linearGradient>
        <linearGradient id="gm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c211b" />
          <stop offset="100%" stopColor="#1a120e" />
        </linearGradient>
        <radialGradient id="gm-knob" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fbf3df" />
          <stop offset="55%" stopColor="#e9c75e" />
          <stop offset="100%" stopColor="#a87f33" />
        </radialGradient>
        <linearGradient id="gm-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2c22" />
          <stop offset="100%" stopColor="#241a14" />
        </linearGradient>
      </defs>

      {/* เงาพื้น */}
      <ellipse cx="130" cy="312" rx="86" ry="13" fill="rgba(0,0,0,0.35)" />

      {/* ตัวตู้ */}
      <rect x="52" y="150" width="156" height="150" rx="26" fill="url(#gm-body)" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
      <rect x="74" y="166" width="112" height="30" rx="9" fill="url(#gm-plate)" stroke="rgba(233,199,94,0.35)" strokeWidth="1" />
      <text x="130" y="186" fontFamily="Arial,Helvetica,sans-serif" fontSize="15" fontWeight="800" letterSpacing="2" fill="#e9c75e" textAnchor="middle">D·QUEST</text>
      <rect x="171" y="214" width="20" height="6" rx="3" fill="#0f0a08" stroke="rgba(233,199,94,0.3)" strokeWidth="0.8" />

      {/* ลูกบิด (หมุนตอน crank) */}
      <g key={spinKey} className={cranking ? "gc-knob-turn" : undefined}>
        <circle cx="130" cy="232" r="22" fill="url(#gm-knob)" stroke="#8a6a2c" strokeWidth="1.5" />
        <rect x="116" y="229" width="28" height="6" rx="3" fill="#7c5e28" />
        <rect x="127" y="218" width="6" height="28" rx="3" fill="#7c5e28" />
        <circle cx="130" cy="232" r="4.5" fill="#5e4720" />
        <ellipse cx="123" cy="225" rx="6" ry="4" fill="rgba(255,255,255,0.5)" />
      </g>

      {/* ช่องจ่าย + ขา */}
      <rect x="100" y="266" width="60" height="26" rx="8" fill="#0f0a08" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <rect x="106" y="270" width="48" height="14" rx="5" fill="rgba(243,112,33,0.12)" />
      <rect x="62" y="296" width="20" height="12" rx="4" fill="#15100c" />
      <rect x="178" y="296" width="20" height="12" rx="4" fill="#15100c" />

      {/* ปลอกคอโลหะ */}
      <ellipse cx="130" cy="150" rx="78" ry="20" fill="url(#gm-collar)" stroke="#8a6a2c" strokeWidth="1" />
      <ellipse cx="130" cy="146" rx="70" ry="15" fill="#1a120e" />

      {/* โดมแก้ว: แคปซูลด้านใน (ขยับ) แล้วทับด้วยกระจก */}
      <g className={cranking ? "gc-jiggle-fast" : "gc-jiggle"}>
        {POS.map(([dx, dy], i) => (
          <Cap key={i} id={i} cx={GX + dx} cy={GY + dy} r={14} color={CAPS[i % CAPS.length]} />
        ))}
      </g>
      <circle cx={GX} cy={GY} r={80} fill="url(#gm-glass)" stroke="rgba(255,255,255,0.30)" strokeWidth="2" />
      <ellipse cx={GX - 30} cy={GY - 34} rx="22" ry="32" fill="rgba(255,255,255,0.22)" transform={`rotate(-25 ${GX - 30} ${GY - 34})`} />
      <ellipse cx={GX + 34} cy={GY + 30} rx="9" ry="16" fill="rgba(255,255,255,0.10)" transform={`rotate(-25 ${GX + 34} ${GY + 30})`} />
      <rect x={GX - 12} y={GY - 80 - 7} width="24" height="12" rx="5" fill="url(#gm-collar)" />
    </svg>
  );
}
