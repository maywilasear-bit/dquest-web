"use client";

import React from "react";

export type AvatarConfig = { skin: string; style: string; hair: string; outfit: string };

export const SKIN_TONES = ["#f2cda4", "#e8b98c", "#d99a6c", "#c2854f", "#9c6336"];
export const HAIR_COLORS = ["#1a120c", "#3a281a", "#5a3a1e", "#8a5a2e", "#b5853f", "#6a6a72"];
export const HAIR_STYLES = ["short", "medium", "long", "bun", "spiky"] as const;
export const HAIR_LABELS: Record<string, string> = { short: "สั้น", medium: "กลาง", long: "ยาว", bun: "มวยผม", spiky: "ตั้ง" };
export const OUTFIT_COLORS = ["#f37021", "#e0a92e", "#4c9e6a", "#3f7cc2", "#9b59b6", "#c44b8a", "#d14b4b", "#5b6470"];

const DEPT_OUTFIT: Record<string, string> = {
  "ช่างยนต์": "#f37021", "เทคนิคเครื่องกล": "#f37021",
  "ช่างไฟฟ้ากำลัง": "#e0a92e", "ไฟฟ้า": "#e0a92e",
  "ช่างอิเล็กทรอนิกส์": "#4c9e6a", "เทคโนโลยีอิเล็กทรอนิกส์": "#4c9e6a",
  "การบัญชี": "#3f7cc2",
  "เทคโนโลยีธุรกิจดิจิทัล": "#9b59b6",
  "การโรงแรม": "#c44b8a",
  "เทคโนโลยีสารสนเทศ": "#5b6470", "คอมพิวเตอร์เกมและแอนิเมชัน": "#5b6470",
};

export function defaultAvatar(department?: string | null, gender?: string | null): AvatarConfig {
  return {
    skin: SKIN_TONES[1],
    style: gender === "female" ? "long" : "short",
    hair: HAIR_COLORS[1],
    outfit: (department && DEPT_OUTFIT[department]) || "#f37021",
  };
}

export function parseAvatar(key: string | null | undefined, department?: string | null, gender?: string | null): AvatarConfig {
  const d = defaultAvatar(department, gender);
  if (!key) return d;
  try {
    const o = JSON.parse(key);
    return {
      skin: typeof o.skin === "string" ? o.skin : d.skin,
      style: typeof o.style === "string" ? o.style : d.style,
      hair: typeof o.hair === "string" ? o.hair : d.hair,
      outfit: typeof o.outfit === "string" ? o.outfit : d.outfit,
    };
  } catch {
    return d;
  }
}

function Hair({ style, hair }: { style: string; hair: string }) {
  const cap = <path d="M27,55 C27,23 93,23 93,55 L93,49 Q83,54 74,50 Q67,55 60,50 Q53,55 46,50 Q37,54 27,49 Z" fill={hair} />;
  if (style === "medium")
    return (<>
      <path d="M24,54 C24,22 96,22 96,54 L96,78 Q92,74 90,60 L90,52 Q60,40 30,52 L30,60 Q28,74 24,78 Z" fill={hair} />{cap}
    </>);
  if (style === "long")
    return (<>
      <path d="M22,54 C22,20 98,20 98,54 L98,104 Q92,98 89,72 L89,52 Q60,38 31,52 L31,72 Q28,98 22,104 Z" fill={hair} />{cap}
    </>);
  if (style === "bun") return (<><circle cx="60" cy="24" r="12" fill={hair} />{cap}</>);
  if (style === "spiky")
    return <path d="M27,55 C27,23 93,23 93,55 L93,48 L88,40 L82,47 L74,38 L66,46 L60,37 L54,46 L46,38 L38,47 L32,40 L27,48 Z" fill={hair} />;
  return cap;
}

export function Character({ config, className = "", style: cssStyle }: { config: AvatarConfig; className?: string; style?: React.CSSProperties }) {
  const { skin, style, hair, outfit } = config;
  const pants = "#37303a", shoe = "#1c181d";
  return (
    <svg viewBox="0 0 120 170" className={className} style={cssStyle} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="161" rx="35" ry="6" fill="#000" opacity="0.32" />
      <rect x="48" y="128" width="11" height="27" rx="4" fill={pants} />
      <rect x="61" y="128" width="11" height="27" rx="4" fill={pants} />
      <rect x="45" y="151" width="16" height="9" rx="3.5" fill={shoe} />
      <rect x="59" y="151" width="16" height="9" rx="3.5" fill={shoe} />
      <rect x="29" y="96" width="12" height="27" rx="6" fill={outfit} />
      <circle cx="35" cy="124" r="6.5" fill={skin} />
      <rect x="79" y="96" width="12" height="27" rx="6" fill={outfit} />
      <circle cx="85" cy="124" r="6.5" fill={skin} />
      <rect x="52" y="82" width="16" height="11" rx="3" fill={skin} />
      <path d="M40,98 Q36,92 47,91 L73,91 Q84,92 80,98 L83,126 Q83,131 78,131 L42,131 Q37,131 37,126 Z" fill={outfit} />
      <path d="M52,92 Q60,100 68,92" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      <circle cx="29" cy="60" r="6" fill={skin} />
      <circle cx="91" cy="60" r="6" fill={skin} />
      <circle cx="60" cy="56" r="32" fill={skin} />
      <Hair style={style} hair={hair} />
      <ellipse cx="49" cy="60" rx="3.4" ry="4.6" fill="#2b2320" />
      <ellipse cx="71" cy="60" rx="3.4" ry="4.6" fill="#2b2320" />
      <circle cx="50.2" cy="58.4" r="1.1" fill="#fff" />
      <circle cx="72.2" cy="58.4" r="1.1" fill="#fff" />
      <ellipse cx="42" cy="67" rx="4" ry="2.4" fill="#e8896f" opacity="0.32" />
      <ellipse cx="78" cy="67" rx="4" ry="2.4" fill="#e8896f" opacity="0.32" />
      <path d="M55,71 Q60,75 65,71" fill="none" stroke="#2b2320" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
