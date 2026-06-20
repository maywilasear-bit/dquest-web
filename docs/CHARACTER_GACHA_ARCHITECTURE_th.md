# D-Quest — สถาปัตยกรรมตัวละคร + กาชา (ภาชนะ → Gacha Life 2)

> เป้าหมาย: วาง **Base/ภาชนะ** ให้ดีพอ "โต" ไปเป็นระบบแต่งตัวระดับ Gacha Life 2 + กาชา Fragment เต็มสูตรได้ โดยไม่ต้องรื้อโครงเดิม · เอกสารนี้คือพิมพ์เขียวของ north star (อ้างอิงสเปกจาก Custom.txt ของภูมิ)
>
> สถานะ: **เฟส 3.0 — ภาชนะตัวละครพร้อม** (slot/layer + ตัวแก้ไขขั้นต้น) · กาชา Fragment = ออกแบบไว้ ยังไม่ลงมือ

---

## 1. หลักคิด
ทุกอย่างของตัวละครเก็บเป็น **ชุดข้อมูลเดียว (JSON)** แบบ **slot-based + layered** ไม่ใช่พารามิเตอร์ตายตัว — เพิ่มไอเท็ม/ช่อง/การปรับแต่งใหม่ = ลงทะเบียนเพิ่ม ไม่กระทบของเดิม

## 2. โมเดลข้อมูลปัจจุบัน (`utils/Character.tsx`)
```ts
AvatarConfig = {
  v: 2,                          // เวอร์ชัน (ไว้ migrate)
  body: { skin },                // ฐานร่างกาย (อนาคต: height, proportions, tint)
  slots: {
    hairBack, hairFront, eyes,   // ใช้งานแล้ว
    top, bottom, shoes,          // ใช้งานแล้ว (เสื้อ/กางเกง/รองเท้า)
    headAcc, faceAcc, neck, back // ช่องเผื่ออนาคต (มีในโมเดล+ลำดับ layer แล้ว)
  }
}
// แต่ละ slot = { item: string, color?: string, tf?: {x,y,sx,sy,rot} } | null
```
- เก็บใน `profiles.avatar_key` (text/JSON) · เขียนผ่าน RPC `set_avatar` เท่านั้น (RLS)
- `parseAvatar()` รองรับ **migrate ของเก่า v1** (`{skin,style,hair,outfit}`) → v2 อัตโนมัติ
- snapshot ตอนจบซีซั่น เก็บ `avatar_key` ลง `hall_of_fame.avatar_snapshot` แล้ว (แช่แข็งหน้าตา)

## 3. ลำดับ Layer (z-order) ปัจจุบัน
เงา → back(อนาคต) → **hairBack** → ขา/รองเท้า → แขน+มือ → คอ → **เสื้อ(top)** → หัว+หู → ตา/แก้ม/ปาก → **hairFront** → headAcc/faceAcc(อนาคต)
- ผม **แยกหน้า/หลัง** ตั้งแต่ตอนนี้ (เหมือน Gacha Life: Front/Back/Rear Hair)
- ไอเท็มอยู่ใน registry `HAIR_BACK` / `HAIR_FRONT` (เพิ่มทรงใหม่ = เพิ่ม key เดียว)
- ทุก slot ห่อด้วย `<g transform>` แล้ว → รองรับ position/scale/rotate ต่อชิ้นทันทีที่เปิดใช้

## 4. แผนขยายไป Gacha Life 2 (ตาม Custom.txt)
ภาชนะนี้รองรับสิ่งเหล่านี้โดย "เติม" ไม่ใช่ "รื้อ":

| ความสามารถเป้าหมาย | รองรับด้วย |
|---|---|
| Front/Back/Rear Hair, Ponytail/Ahoge | เพิ่ม slot ผม + ไอเท็มใน registry |
| ตา/รูม่านตา/คิ้ว/จมูก/ปาก/แก้ม แยกสี-ตำแหน่ง | แตก slot ใบหน้าเพิ่ม (มี eyes แล้ว) |
| Body base: ส่วนสูง/สัดส่วน/หู/หาง/ปีก | `body` ขยายฟิลด์ + slot back/ears/tail |
| เสื้อชั้นใน/แจ็คเก็ต/แขน/เข็มขัด/กระโปรง/ถุงเท้า | เพิ่ม slot เสื้อผ้า (มี top/bottom/shoes แล้ว) |
| อุปกรณ์เสริม หัว/หน้า/คอ/แขน/เอว/หลัง/ขา | slot อุปกรณ์ (headAcc/faceAcc/neck/back มีแล้ว) |
| Transform ต่อชิ้น (X/Y/Scale/Rotate/Skew/Flip) | `tf` ใน slot + `<g transform>` (วางโครงแล้ว) |
| Color slider (HSB/custom) | UI เพิ่ม — โมเดลเก็บ `color` ต่อ slot แล้ว |
| หลายตัวละคร/พรีเซ็ต/undo-redo | เก็บหลาย AvatarConfig + history (โมเดลเป็น JSON ก้อนเดียว ทำได้) |
| Pose / Studio | เพิ่มชั้น `pose` ใน config + ปรับ transform กลุ่มแขน-ขา |

## 5. แผนกาชา Fragment (ยังไม่ลงมือ — ออกแบบไว้)
> เปลี่ยนจากกาชาง่าย (4 ระดับ/10 เหรียญ ที่ใช้อยู่) ไปเป็นระบบ Fragment เต็มสูตร เมื่อพร้อม

**สกุลเงิน/ต้นทุน:** D Coin · สุ่ม 1 ครั้ง = 5 D Coin (ตายตัว)
**ผลลัพธ์ต่อพุล:** เช็ก Full Skin ก่อน (โอกาสต่ำมาก) ไม่ได้ค่อยได้ Fragment
**ระดับ:** N(1★) · R(2-3★) · SR(4★) · SSR(5★) · UR(6★) — แต่ละสกินต้องใช้ Fragment ระดับเดียวกันจำนวนหนึ่งเพื่ออัญเชิญ (UR ~300–500 ชิ้น)
**อัตราดรอป (ต่อพุล):** Fragment N64/R22/SR9/SSR2.5/UR0.9% · Full Skin N2.0/R0.7/SR0.25/SSR0.05/UR0.01%
**Pity:** Soft เริ่ม pull 45 (+0.15–0.25%/พุล) · Hard SSR ทุก ~85–95 · UR ทุก ~200–220 · ต้องโชว์ตัวนับ
**Refinery (หลอมเศษ):** N→R→SR→SSR→UR แบบ progressive มี loss + ค่าธรรมเนียม D Coin (เช่น 18N→1R loss10% +10coin · 15R→1SR · 12SR→1SSR · 10SSR→1UR · สูตรพิเศษ 30N+10R→1SR)
**เศษเหลือ/ซ้ำ:** เก็บต่อ / ขายคืนเป็น D Coin เล็กน้อย / ใช้ใน Refinery · ไม่มีขายสกินตรงๆ

**Schema ที่จะเพิ่ม (ร่าง):**
`skins`(id, code, name, rarity, slot, fragment_cost, render_ref) · `fragments`(profile_id, rarity, qty) · `owned_skins`(profile_id, skin_id) · `gacha_pulls`(log + pity counter ต่อ profile) · RPC: `gacha_pull` (อัปเกรดให้คืน fragment/skin + pity), `refine_fragments`, `summon_skin`

**เชื่อมกับตัวละคร:** Full Skin / ไอเท็มที่ได้ = ลง registry + เปิดให้สวมใน slot → ปิดลูป "สุ่มได้ → ใส่เห็นจริง"

---

## 6. ลำดับงานแนะนำ (จากภาชนะ → north star)
1. ✅ ภาชนะตัวละคร slot/layer + ตัวแก้ไขขั้นต้น (ผม/ผิว/สีชุด)
2. เพิ่ม **Transform UI** (เลื่อน/ย่อ/หมุนต่อชิ้น) + แตก slot เสื้อผ้า/ใบหน้าเพิ่ม
3. กาชา Fragment + Refinery + Pity (ตาม §5) → ดรอปไอเท็มลง slot
4. หลายตัวละคร/พรีเซ็ต/undo + Pose/Studio (ปลายทาง Gacha Life 2)

> ทุกขั้น "เติม" บนภาชนะเดิม — นี่คือเหตุผลที่ต้องวาง Base ให้ถูกตั้งแต่ตอนนี้
