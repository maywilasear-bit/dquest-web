# D-Quest — ชุด AI Prompt ปั้น Avatar เริ่มต้น (ทุกแผนก × ช/ญ)

> ใช้คู่กับ `SKIN_ASSET_SPEC_th.md` · เป้าหมาย: avatar เริ่มต้นที่ระบบ **auto เลือกตามแผนก + ล็อกเพศ** ตอนสมัคร
> เขียน prompt เป็น **ภาษาอังกฤษ** (AI เจนรูปเข้าใจดีกว่า) · ส่วนอธิบายเป็นไทย · ปรับแต่งได้ตามใจ
>
> **กุญแจสำคัญ:** ใช้ "master template" เดียวกันทุกตัว เปลี่ยนแค่ท่อน [OUTFIT] → ทุก avatar จะสไตล์/ท่า/สัดส่วนเหมือนกัน สลับกันแล้วไม่หลุด ยืนบนเวทีพอดี

---

## 0. MASTER TEMPLATE (โครงหลัก — ใช้ทุกตัว)
วาง template นี้ แล้วแทนที่ `[GENDER]` กับ `[OUTFIT]` ตามแต่ละแผนก:

```
full body, head to toe, single [GENDER] Thai vocational student around 17 years old,
anime style, Gacha Life 2 inspired, clean cel-shaded, cute friendly face, big expressive eyes,
standing straight, relaxed A-pose, arms slightly away from body, front view facing viewer,
centered, feet at the very bottom of the frame, full body fully visible and not cropped,
[OUTFIT],
modest school-appropriate wholesome outfit, bold clean outline, soft flat shading,
portrait orientation, isolated character on a fully transparent background, PNG, high quality
```

**[GENDER]** = `male` (ช) หรือ `female` (ญ)

## 0.1 NEGATIVE PROMPT (ใส่ในช่อง negative ทุกครั้ง)
```
background, scenery, floor, ground shadow, multiple characters, cropped, cut-off feet, out of frame,
extra limbs, extra fingers, deformed hands, bad anatomy, text, watermark, logo, signature,
nsfw, revealing or sexy clothing, swimsuit, realistic photo, 3d render, blurry, low quality
```

## 0.2 SETTINGS / เคล็ดให้ทุกตัว "เข้าชุดกัน" (สำคัญมาก)
- **อัตราส่วน:** portrait ~3:4 (เช่น 1024×1450) — ตั้งให้ตรงทุกตัว
- **พื้นหลังโปร่งใส:** เปิดโหมด transparent/PNG (Midjourney ใช้ `--no background` หรือเครื่องมือลบพื้นหลังทีหลัง · DALL·E/SD บอก "transparent background")
- **ความสม่ำเสมอ (ทำตามนี้จะรอด):**
  1. ปั้ม "ตัวอ้างอิง" (ช 1 + ญ 1) ให้ได้ท่า/สัดส่วน/สไตล์ที่ชอบก่อน
  2. **ใช้ seed เดิม + model เดิม + template เดิม** กับทุกตัว เปลี่ยนแค่ [OUTFIT]
  3. ถ้าเครื่องมือรองรับ reference/character-consistency (เช่น `--cref` ของ Midjourney, IP-Adapter ของ SD) → ใช้ตัวอ้างอิงเป็น reference
  4. ครอปให้ **เท้าอยู่ระดับเดียวกันทุกรูป** (baseline เดียว) ก่อนเซฟ

---

## 1. ลุคแต่ละแผนก (แทนที่ [OUTFIT]) — 7 ลุค × ช/ญ
สีในวงเล็บ = สีประจำแผนกในแอป (ให้ชุดมี accent สีนั้นจะเข้าธีม)

### ลุค 1 — ยานยนต์ / เครื่องกล (สีส้ม)
- **ช (male):** `wearing a navy-blue mechanic coverall jumpsuit with rolled-up sleeves, utility tool belt, orange accent stripes, a small wrench in hand`
- **ญ (female):** `wearing a navy-blue mechanic work jacket and trousers with a tied waist, a cute mechanic cap, orange accent stripes, holding a small wrench`

### ลุค 2 — ไฟฟ้า (สีทอง/เหลือง)
- **ช:** `wearing a light-grey electrician work uniform with yellow safety reflective stripes, a tool belt with a multimeter, electric-theme yellow accents`
- **ญ:** `wearing a light-grey electrician uniform blouse and trousers with yellow reflective stripes, holding a multimeter, neat`

### ลุค 3 — อิเล็กทรอนิกส์ (สีเขียว)
- **ช:** `wearing a teal-and-white technician lab coat over a polo shirt, holding a soldering iron, subtle green circuit-board pattern accents`
- **ญ:** `wearing a teal technician lab coat over a blouse, holding a small green circuit board, tidy`

### ลุค 4 — การโรงแรม (สีชมพู/ทอง)
- **ช:** `wearing a crisp white dress shirt with a black vest, bow tie, and formal trousers, elegant hotel-staff look, gold accents`
- **ญ:** `wearing an elegant hotel-hostess uniform: blouse with a vest, a neat knee-length skirt, a small neck scarf, gold/pink accents`

### ลุค 5 — การบัญชี (สีน้ำเงิน)
- **ช:** `wearing business formal: white dress shirt, blue necktie, dark trousers, holding a calculator and a small ledger, professional`
- **ญ:** `wearing business formal: white blouse, a blazer, a modest knee-length skirt, holding a calculator, professional`

### ลุค 6 — ธุรกิจดิจิทัล (สีม่วง)
- **ช:** `wearing smart-casual business: a modern blazer over a clean t-shirt, slim trousers, holding a tablet, trendy startup vibe, purple accents`
- **ญ:** `wearing smart-casual business: a modern blazer with neat trousers, holding a tablet/smartphone, trendy, purple accents`

### ลุค 7 — IT / เกม-แอนิเมชัน (สีเทาสเลต)
- **ช:** `wearing a casual hoodie (or tech polo) with a gaming headset around the neck, holding a laptop, cool geeky tech-student vibe, slate-grey accents`
- **ญ:** `wearing a casual hoodie with a gaming headset around the neck, holding a laptop, cool tech-student vibe, slate-grey accents`

---

## 2. แผนกจริง → ใช้ลุคไหน (ครบ 11 แผนก / 472 คน)
| ลุค | แผนกที่ใช้ |
|---|---|
| 1 ยานยนต์/เครื่องกล | ช่างยนต์ · เทคนิคเครื่องกล |
| 2 ไฟฟ้า | ช่างไฟฟ้ากำลัง · ไฟฟ้า |
| 3 อิเล็กทรอนิกส์ | ช่างอิเล็กทรอนิกส์ · เทคโนโลยีอิเล็กทรอนิกส์ |
| 4 การโรงแรม | การโรงแรม |
| 5 การบัญชี | การบัญชี |
| 6 ธุรกิจดิจิทัล | เทคโนโลยีธุรกิจดิจิทัล |
| 7 IT/เกม-แอนิเมชัน | เทคโนโลยีสารสนเทศ · คอมพิวเตอร์เกมและแอนิเมชัน |

> สายเดียวกันใช้ชุดร่วมได้ (ช่างยนต์ ปวช = เทคนิคเครื่องกล ปวส คือสายเดียวกัน) · ถ้าอยากแยกชุดทุกแผนกจริงๆ ก็ปั้มเพิ่มได้ แต่ 7×2=14 ตัวพอเริ่ม

---

## 3. ตัวอย่างประกอบเต็ม (copy ไปใช้ได้เลย)

**ช่างยนต์ — ชาย:**
```
full body, head to toe, single male Thai vocational student around 17 years old,
anime style, Gacha Life 2 inspired, clean cel-shaded, cute friendly face, big expressive eyes,
standing straight, relaxed A-pose, arms slightly away from body, front view facing viewer,
centered, feet at the very bottom of the frame, full body fully visible and not cropped,
wearing a navy-blue mechanic coverall jumpsuit with rolled-up sleeves, utility tool belt, orange accent stripes, a small wrench in hand,
modest school-appropriate wholesome outfit, bold clean outline, soft flat shading,
portrait orientation, isolated character on a fully transparent background, PNG, high quality
```

**การโรงแรม — หญิง:**
```
full body, head to toe, single female Thai vocational student around 17 years old,
anime style, Gacha Life 2 inspired, clean cel-shaded, cute friendly face, big expressive eyes,
standing straight, relaxed A-pose, arms slightly away from body, front view facing viewer,
centered, feet at the very bottom of the frame, full body fully visible and not cropped,
wearing an elegant hotel-hostess uniform: blouse with a vest, a neat knee-length skirt, a small neck scarf, gold and pink accents,
modest school-appropriate wholesome outfit, bold clean outline, soft flat shading,
portrait orientation, isolated character on a fully transparent background, PNG, high quality
```

---

## 4. แนะนำลำดับการปั้ม
1. ปั้ม **ช 1 + ญ 1** (ลุคไหนก็ได้) จนได้สไตล์/ท่าที่ชอบ → ล็อก seed/model/reference
2. ปั้มที่เหลือ 12 ตัวด้วย template เดิม เปลี่ยนแค่ [OUTFIT]
3. ลบพื้นหลังให้โปร่ง + ครอปเท้าให้ baseline เท่ากัน + เซฟ PNG ~1024×1450 ตั้งชื่อ `skin_<look>_<gender>.png` (เช่น `skin_auto_m.png`)
4. ส่งมาให้ผม **1 รูปก่อน** ผมจะต่อระบบ (bucket + auto map แผนก/เพศ → skin) ให้เห็นจริงบนเวที แล้วค่อยลงครบ 14

> หมายเหตุ: ถ้าได้ลุค/ท่าที่ชอบแล้ว ชุดนี้จะกลายเป็น "avatar เริ่มต้น" ของทุกคน · ส่วน skin หายากๆ (กาชา) ค่อยปั้มทีหลังด้วย template เดียวกัน
