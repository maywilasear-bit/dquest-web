"use client";

import { useEffect, useRef, useState } from "react";

// เลขวิ่ง (count-up/down) แบบ easeOut
// - mount: ถ้าให้ `from` ต่างจาก value → วิ่งจาก from ไป value · ถ้าไม่ให้/เท่ากัน → โชว์ทันที
// - หลัง mount: ทุกครั้งที่ value เปลี่ยน จะวิ่งจากค่าก่อนหน้าไปค่าใหม่เอง
export function RollingNumber({
  value, from, duration = 900, className, style,
}: { value: number; from?: number; duration?: number; className?: string; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(from ?? value);
  const prev = useRef(from ?? value);

  useEffect(() => {
    const start = prev.current;
    prev.current = value;
    if (start === value) { setDisplay(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(start + (value - start) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className} style={style}>{display.toLocaleString()}</span>;
}
