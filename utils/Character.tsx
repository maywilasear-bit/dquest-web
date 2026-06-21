"use client";

import React from "react";

// =============================================================================
// D-Quest Character — "ภาชนะ" แบบ slot/layer (เป้า: โตไปเป็น Gacha Life 2)
//
// โครงสร้างข้อมูลเป็น versioned + slot-based: แต่ละส่วน (ผมหน้า/ผมหลัง/ตา/เสื้อ/
// กางเกง/รองเท้า + slot อุปกรณ์เสริมเผื่ออนาคต) เก็บแยกกัน มี item + สี + transform
// อิสระต่อกัน · renderer วาดทีละ layer ตาม z-order · เพิ่มไอเท็ม/ช่องใหม่ = ลงทะเบียน
// ใน registry แล้วเปิด slot — ไม่ต้องรื้อ
// (ดูแผนขยายเต็มใน docs/CHARACTER_GACHA_ARCHITECTURE_th.md)
// =============================================================================

export type Transform = { x?: number; y?: number; sx?: number; sy?: number; rot?: number };
export type Slot = { item: string; color?: string; tf?: Transform } | null;
export type AvatarConfig = {
  v: 2;
  body: { skin: string };
  skinImg?: string | null;   // URL รูป skin เต็มตัว (ถ้ามี = แสดงแทนตัว geometric) — สำหรับ skin จาก AI/กาชา
  slots: {
    hairBack?: Slot; hairFront?: Slot; eyes?: Slot;
    top?: Slot; bottom?: Slot; shoes?: Slot;
    // ช่องอุปกรณ์เสริม (เผื่ออนาคต — มีในโมเดล/ลำดับ layer แล้ว แต่ยังไม่มีไอเท็ม):
    headAcc?: Slot; faceAcc?: Slot; neck?: Slot; back?: Slot;
  };
};

// ---- palettes (ใช้ในตัวแก้ไข) ----
export const SKIN_TONES = ["#f2cda4", "#e8b98c", "#d99a6c", "#c2854f", "#9c6336"];
export const HAIR_COLORS = ["#1a120c", "#2a1d14", "#4a3115", "#7a4a1e", "#b5853f", "#6a6a72"];
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

function shade(hex: string, f: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function tfStr(t?: Transform): string | undefined {
  if (!t) return undefined;
  const parts: string[] = [];
  if (t.x || t.y) parts.push(`translate(${t.x ?? 0} ${t.y ?? 0})`);
  if (t.rot) parts.push(`rotate(${t.rot} 60 85)`);
  if (t.sx != null || t.sy != null) parts.push(`scale(${t.sx ?? 1} ${t.sy ?? 1})`);
  return parts.length ? parts.join(" ") : undefined;
}

// ---- ITEM REGISTRIES (เพิ่มทรง/ไอเท็มใหม่ที่นี่) ----
function backBlob(c: string) {
  return <path d="M27,56 C25,4 95,4 93,56 C93,74 80,82 60,82 C40,82 27,74 27,56 Z" fill={c} />;
}
const HAIR_BACK: Record<string, (c: string) => React.ReactNode> = {
  short: (c) => backBlob(c),
  spiky: (c) => backBlob(c),
  bun: (c) => backBlob(c),
  medium: (c) => (<>
    <path d="M31,60 Q26,82 31,96 Q37,100 43,93 Q45,76 44,60 Z" fill={c} />
    <path d="M89,60 Q94,82 89,96 Q83,100 77,93 Q75,76 76,60 Z" fill={c} />
    {backBlob(c)}
  </>),
  long: (c) => (<>
    <path d="M30,58 Q22,92 28,124 Q35,130 43,122 Q45,90 44,60 Z" fill={c} />
    <path d="M90,58 Q98,92 92,124 Q85,130 77,122 Q75,90 76,60 Z" fill={c} />
    {backBlob(c)}
  </>),
};
function frontCap(c: string) {
  return <path d="M24,66 C22,6 98,6 96,66 C90,60 85,59 80,61 Q75,53 66,57 Q60,52 54,57 Q45,53 40,61 C35,59 30,60 24,66 Z" fill={c} />;
}
const HAIR_FRONT: Record<string, (c: string) => React.ReactNode> = {
  short: (c) => frontCap(c),
  medium: (c) => frontCap(c),
  long: (c) => frontCap(c),
  bun: (c) => (<><circle cx="60" cy="17" r="13" fill={c} />{frontCap(c)}</>),
  spiky: (c) => <path d="M24,62 C22,6 98,6 96,62 L90,50 L83,60 L75,49 L66,59 L58,49 L49,59 L41,49 L33,60 L24,52 Z" fill={c} />,
};

// ---- default / parse / migrate ----
export function defaultAvatar(department?: string | null, gender?: string | null): AvatarConfig {
  const style = gender === "female" ? "long" : "short";
  const hair = HAIR_COLORS[1];
  const outfit = (department && DEPT_OUTFIT[department]) || OUTFIT_COLORS[0];
  return {
    v: 2,
    body: { skin: SKIN_TONES[1] },
    slots: {
      hairBack: { item: style, color: hair },
      hairFront: { item: style, color: hair },
      eyes: { item: "basic", color: "#2b2320" },
      top: { item: "shirt", color: outfit },
      bottom: { item: "pants", color: "#37303a" },
      shoes: { item: "shoes", color: "#1c181d" },
      headAcc: null, faceAcc: null, neck: null, back: null,
    },
  };
}

export function parseAvatar(key: string | null | undefined, department?: string | null, gender?: string | null): AvatarConfig {
  const d = defaultAvatar(department, gender);
  if (!key) return d;
  try {
    const o = JSON.parse(key);
    if (o && o.v === 2 && o.slots) {
      return { v: 2, body: { skin: o.body?.skin ?? d.body.skin }, skinImg: o.skinImg ?? null, slots: { ...d.slots, ...o.slots } };
    }
    // migrate ของเก่า v1: {skin, style, hair, outfit}
    if (o && (o.skin || o.style || o.hair || o.outfit)) {
      const style = typeof o.style === "string" ? o.style : "short";
      const hair = typeof o.hair === "string" ? o.hair : HAIR_COLORS[1];
      return {
        v: 2,
        body: { skin: typeof o.skin === "string" ? o.skin : d.body.skin },
        slots: {
          ...d.slots,
          hairBack: { item: style, color: hair },
          hairFront: { item: style, color: hair },
          top: { item: "shirt", color: typeof o.outfit === "string" ? o.outfit : OUTFIT_COLORS[0] },
        },
      };
    }
    return d;
  } catch {
    return d;
  }
}

// ---- accessors (ให้ตัวแก้ไขใช้ง่าย โดยไม่ต้องรู้โครงสร้าง slot) ----
export function hairStyleOf(c: AvatarConfig): string { return c.slots.hairFront?.item ?? "short"; }
export function hairColorOf(c: AvatarConfig): string { return c.slots.hairFront?.color ?? HAIR_COLORS[1]; }
export function outfitOf(c: AvatarConfig): string { return c.slots.top?.color ?? OUTFIT_COLORS[0]; }
export function withSkin(c: AvatarConfig, skin: string): AvatarConfig { return { ...c, body: { ...c.body, skin } }; }
export function withHairStyle(c: AvatarConfig, style: string): AvatarConfig {
  const col = hairColorOf(c);
  return { ...c, slots: { ...c.slots, hairFront: { item: style, color: col }, hairBack: { item: style, color: col } } };
}
export function withHairColor(c: AvatarConfig, color: string): AvatarConfig {
  const style = hairStyleOf(c);
  return { ...c, slots: { ...c.slots, hairFront: { item: style, color }, hairBack: { item: style, color } } };
}
export function withOutfit(c: AvatarConfig, color: string): AvatarConfig {
  return { ...c, slots: { ...c.slots, top: { item: c.slots.top?.item ?? "shirt", color } } };
}

// ---- renderer (วาดทีละ layer จากล่างขึ้นบน) ----
export function Character({ config, className = "", style: cssStyle }: { config: AvatarConfig; className?: string; style?: React.CSSProperties }) {
  // ถ้ามี skin รูปเต็มตัว (จาก AI/กาชา) → แสดงรูปนั้นแทนตัว geometric
  if (config.skinImg) {
    return (
      <svg viewBox="0 0 120 170" className={className} style={cssStyle} xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="60" cy="161" rx="35" ry="6" fill="#000" opacity="0.32" />
        <image href={config.skinImg} x="6" y="2" width="108" height="164" preserveAspectRatio="xMidYMax meet" />
      </svg>
    );
  }
  const skin = config.body?.skin ?? SKIN_TONES[1];
  const top = config.slots?.top?.color ?? OUTFIT_COLORS[0];
  const bottom = config.slots?.bottom?.color ?? "#37303a";
  const shoe = config.slots?.shoes?.color ?? "#1c181d";
  const hb = config.slots?.hairBack;
  const hf = config.slots?.hairFront;
  return (
    <svg viewBox="0 0 120 170" className={className} style={cssStyle} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="161" rx="35" ry="6" fill="#000" opacity="0.32" />
      {/* slot: back accessory (ปีก/ผ้าคลุม) — อนาคต */}
      {hb?.item && <g transform={tfStr(hb.tf)}>{HAIR_BACK[hb.item]?.(hb.color ?? HAIR_COLORS[1])}</g>}
      {/* legs + shoes (bottom / shoes slot) */}
      <rect x="48" y="128" width="11" height="27" rx="4" fill={bottom} />
      <rect x="61" y="128" width="11" height="27" rx="4" fill={bottom} />
      <rect x="45" y="151" width="16" height="9" rx="3.5" fill={shoe} />
      <rect x="59" y="151" width="16" height="9" rx="3.5" fill={shoe} />
      {/* arms (top slot) + hands (skin) */}
      <rect x="29" y="96" width="12" height="27" rx="6" fill={top} />
      <circle cx="35" cy="124" r="6.5" fill={skin} />
      <rect x="79" y="96" width="12" height="27" rx="6" fill={top} />
      <circle cx="85" cy="124" r="6.5" fill={skin} />
      {/* neck */}
      <rect x="52" y="82" width="16" height="11" rx="3" fill={shade(skin, 0.93)} />
      {/* torso (top slot) + collar */}
      <path d="M40,98 Q36,92 47,91 L73,91 Q84,92 80,98 L83,126 Q83,131 78,131 L42,131 Q37,131 37,126 Z" fill={top} />
      <path d="M52,92 Q60,99 68,92" fill="none" stroke={shade(top, 0.78)} strokeWidth="2.5" />
      {/* head (body base) */}
      <circle cx="30" cy="60" r="5.5" fill={skin} />
      <circle cx="90" cy="60" r="5.5" fill={skin} />
      <circle cx="60" cy="56" r="32" fill={skin} />
      {/* face (eyes slot color) */}
      <ellipse cx="49" cy="62" rx="3.5" ry="4.7" fill={config.slots?.eyes?.color ?? "#2b2320"} />
      <ellipse cx="71" cy="62" rx="3.5" ry="4.7" fill={config.slots?.eyes?.color ?? "#2b2320"} />
      <circle cx="50.3" cy="60.2" r="1.2" fill="#fff" />
      <circle cx="72.3" cy="60.2" r="1.2" fill="#fff" />
      <ellipse cx="42" cy="69" rx="4" ry="2.4" fill="#e8896f" opacity="0.32" />
      <ellipse cx="78" cy="69" rx="4" ry="2.4" fill="#e8896f" opacity="0.32" />
      <path d="M55,73 Q60,77 65,73" fill="none" stroke="#2b2320" strokeWidth="2" strokeLinecap="round" />
      {/* slot: front hair */}
      {hf?.item && <g transform={tfStr(hf.tf)}>{HAIR_FRONT[hf.item]?.(hf.color ?? HAIR_COLORS[1])}</g>}
      {/* slot: headAcc / faceAcc (หมวก/แว่น) — อนาคต */}
    </svg>
  );
}
