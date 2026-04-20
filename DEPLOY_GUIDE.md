# 🧋 DrinkPay — คู่มือ Deploy ฉบับสมบูรณ์

ระบบแจ้งเตือนค่าน้ำ + LINE OA สำหรับกลุ่ม 10 คน

---

## 🗺️ ภาพรวมระบบ

```
[Admin กดสร้างออเดอร์]
        ↓
[Next.js API บน Vercel]
        ↓
[บันทึกใน Supabase]
        ↓
[ส่งข้อความ LINE OA → Group + รายคน]
        ↓
[สมาชิกกดลิงก์ → หน้า /pay/:id → อัปสลิป]
        ↓
[ทุกคนจ่าย → แจ้งเตือน "ครบแล้ว!" ใน LINE]

[Vercel Cron 09:00 ทุกวัน]
        ↓
[ตรวจออเดอร์เกินกำหนด → ส่งเตือนคนที่ยังไม่จ่าย]
```

---

## ขั้นตอนที่ 1 — ตั้งค่า Supabase (Database + Storage)

### 1.1 สร้าง Project
1. ไปที่ https://supabase.com → Sign up ฟรี
2. กด **New Project** → ตั้งชื่อ `drinkpay` → เลือก region ใกล้ที่สุด (Singapore)
3. รอ ~2 นาที

### 1.2 รัน SQL Schema
1. ไปที่ **SQL Editor** (เมนูซ้าย)
2. กด **New Query**
3. คัดลอกเนื้อหาทั้งหมดจาก `supabase/migrations/001_schema.sql`
4. กด **Run** (ปุ่มสีเขียว)
5. ✅ ควรเห็น "Success" ทุก statement

### 1.3 สร้าง Storage Bucket
1. ไปที่ **Storage** → **New Bucket**
2. ตั้งชื่อ: `slips`
3. เลือก **Public bucket** ✅ (เพื่อให้ดูสลิปได้)
4. กด **Save**

### 1.4 เก็บ API Keys
ไปที่ **Settings → API** คัดลอกค่าเหล่านี้:
- `Project URL` → ใช้เป็น `NEXT_PUBLIC_SUPABASE_URL`
- `anon` / `public` key → ใช้เป็น `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → ใช้เป็น `SUPABASE_SERVICE_ROLE_KEY`

---

## ขั้นตอนที่ 2 — ตั้งค่า LINE OA

### 2.1 เปิดใช้ Messaging API
1. ไปที่ https://developers.line.biz
2. เลือก Provider และ Channel ของ LINE OA คุณ
3. ไปแท็บ **Messaging API**
4. กด **Issue** Channel Access Token (Long-lived)
5. คัดลอก token → ใช้เป็น `LINE_CHANNEL_ACCESS_TOKEN`

### 2.2 ปิด Auto-reply
ใน LINE Official Account Manager:
- **Chat Settings** → ปิด **Auto-reply messages**
- ปิด **Greeting messages** (ถ้าไม่ต้องการ)

### 2.3 หา Group ID (สำหรับส่ง Broadcast)

**วิธีง่ายที่สุด — ใช้ Webhook:**
1. ใน LINE Developers → **Webhook URL**: ใส่ `https://your-app.vercel.app/api/webhook` (หลัง deploy)
2. เชิญ LINE OA เข้า Group LINE ของกลุ่ม
3. พิมพ์ข้อความใดก็ได้ใน Group
4. Webhook จะ log `groupId` ใน Vercel logs
5. คัดลอก Group ID → ใช้เป็น `LINE_GROUP_ID`

> 💡 **ทางเลือก**: ใช้เครื่องมือ https://www.line-bot.com/get-id เพื่อดู Group ID

### 2.4 หา User ID ของสมาชิกแต่ละคน (สำหรับ 1:1 push)
1. ให้สมาชิกแต่ละคน **Add เป็นเพื่อน** กับ LINE OA ก่อน
2. เมื่อ Add แล้ว Webhook จะได้รับ `userId` → เก็บไว้ใน members table
3. หรือใช้ LINE Login / LIFF ในอนาคต

---

## ขั้นตอนที่ 3 — Deploy บน Vercel

### 3.1 เตรียม Repository
```bash
# แตกไฟล์ drinkpay.zip แล้วรัน:
cd drinkpay
git init
git add .
git commit -m "Initial DrinkPay"

# Push ขึ้น GitHub
gh repo create drinkpay --private --push
# หรือสร้าง repo ใน github.com แล้ว git remote add origin ... && git push
```

### 3.2 Import ใน Vercel
1. ไปที่ https://vercel.com → **New Project**
2. Import จาก GitHub → เลือก repo `drinkpay`
3. Framework: **Next.js** (auto-detect)
4. กด **Deploy** (รอบแรกจะ fail เพราะยังไม่ได้ใส่ env)

### 3.3 ตั้ง Environment Variables
ใน Vercel → **Settings → Environment Variables** ใส่ทั้งหมดนี้:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJ... (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJ... (service role key) |
| `LINE_CHANNEL_ACCESS_TOKEN` | token จาก LINE Developers |
| `LINE_GROUP_ID` | Cxxxxxxxxx (Group ID) |
| `ADMIN_PASSWORD` | รหัสผ่านที่คุณตั้ง (เก็บไว้!) |
| `NEXT_PUBLIC_APP_URL` | https://drinkpay.vercel.app |

### 3.4 Redeploy
ใน Vercel → **Deployments** → กด **Redeploy** บน deployment ล่าสุด

✅ เมื่อ build สำเร็จ เว็บพร้อมใช้งาน!

---

## ขั้นตอนที่ 4 — ตั้งค่าหน้าแรก

### 4.1 เข้าระบบ Admin
1. เปิด `https://drinkpay.vercel.app`
2. ใส่ `ADMIN_PASSWORD` ที่ตั้งไว้
3. กด **เข้าสู่ระบบ**

### 4.2 เพิ่มสมาชิก
ไปที่ **⚙️ ตั้งค่า → จัดการสมาชิก**:
- ใส่ชื่อ + เลือก emoji
- ใส่ LINE User ID (ถ้ามี) เพื่อรับแจ้งเตือนรายคน
- กด **+ เพิ่ม** ทีละคน (10 คน)

### 4.3 ตรวจสอบเมนูน้ำ
ระบบมีเมนูเริ่มต้น: กาแฟ ชานม โกโก้ ชาเขียว น้ำส้ม ชามะนาว
- แก้ราคาได้ที่ **⚙️ ตั้งค่า → จัดการเมนูน้ำ**
- กด ✏️ แล้วแก้ราคา → กด ✓

### 4.4 แชร์ลิงก์ให้สมาชิก
ลิงก์สำหรับ User ทั่วไป:
```
https://drinkpay.vercel.app/pay/[ORDER_ID]?token=[ACCESS_TOKEN]
```
ลิงก์นี้จะถูก **ส่งอัตโนมัติทาง LINE** ทุกครั้งที่สร้างออเดอร์ใหม่

---

## ขั้นตอนที่ 5 — Vercel Cron (แจ้งเตือนอัตโนมัติ)

ไฟล์ `vercel.json` ตั้งค่า Cron ไว้แล้ว:
```json
{ "crons": [{ "path": "/api/notify", "schedule": "0 9 * * *" }] }
```
→ ทุกวัน **09:00 UTC** (16:00 ไทย) ระบบจะ:
1. ตรวจออเดอร์ที่เกินกำหนด → เปลี่ยน status เป็น `overdue`
2. ส่งแจ้งเตือน LINE ให้คนที่ยังไม่จ่าย

> ⚠️ Vercel Cron ใช้ได้บน **Hobby plan** (ฟรี) แต่จำกัดที่ 1 cron job

---

## 🔄 การใช้งานประจำวัน

### สำหรับ Admin:
1. เปิด `https://drinkpay.vercel.app`
2. Login ด้วย Admin Password
3. กด **+ สร้างออเดอร์**
4. เลือกรายการน้ำให้แต่ละคน + ตั้งวันกำหนดจ่าย
5. กด **✅ สร้างออเดอร์ + แจ้ง LINE** → ระบบส่ง LINE อัตโนมัติ
6. ดูสถานะการจ่ายได้แบบ Real-time
7. กด **📣 แจ้งเตือน LINE** ถ้าต้องการส่งเตือนด้วยตนเอง

### สำหรับสมาชิก:
1. รับข้อความ LINE จากบอท
2. เห็นยอดที่ต้องจ่าย พร้อมลิงก์
3. กดลิงก์ → หน้าเว็บแสดงยอด
4. โอนเงิน → ถ่ายรูปสลิป → อัปโหลด
5. กด **✅ ยืนยันการจ่าย**

---

## 🐛 แก้ปัญหาที่พบบ่อย

### LINE ไม่ส่งข้อความ
- ตรวจ `LINE_CHANNEL_ACCESS_TOKEN` ถูกต้องไหม
- ตรวจ `LINE_GROUP_ID` ขึ้นต้นด้วย `C` หรือ `G`
- บอทต้อง **เป็นสมาชิก** ของ Group แล้ว
- ดู logs ใน Vercel → Functions tab

### อัปโหลดสลิปไม่ได้
- ตรวจ Supabase Storage bucket ชื่อ `slips` มีอยู่
- ตรวจว่า bucket เป็น **Public**
- ตรวจ `SUPABASE_SERVICE_ROLE_KEY` ถูกต้อง

### Login ไม่ผ่าน
- `ADMIN_PASSWORD` ต้องตรงกับที่ตั้งใน Vercel Environment Variables
- หลังแก้ env ต้อง **Redeploy** ใหม่

### Cron ไม่ทำงาน
- ตรวจ Vercel plan (ต้องมีอย่างน้อย Hobby)
- Cron ทำงาน 09:00 UTC = 16:00 น. ไทย
- แก้ schedule ใน `vercel.json` ได้ตามต้องการ

---

## 📁 โครงสร้างไฟล์

```
drinkpay/
├── pages/
│   ├── index.js              ← Admin Dashboard
│   ├── pay/[orderId].js      ← หน้าจ่ายเงินของสมาชิก
│   └── api/
│       ├── menu.js           ← CRUD เมนูน้ำ
│       ├── members.js        ← CRUD สมาชิก
│       ├── notify.js         ← ส่งแจ้งเตือน LINE + Cron
│       └── orders/
│           ├── index.js      ← สร้าง/ดูออเดอร์
│           └── [orderId]/
│               └── pay.js    ← อัปโหลดสลิป
├── lib/
│   ├── supabase.js           ← Supabase client
│   ├── line.js               ← LINE Messaging helpers
│   └── auth.js               ← Auth helpers
├── components/
│   └── ui.js                 ← Reusable UI components
├── supabase/migrations/
│   └── 001_schema.sql        ← Database schema (รัน 1 ครั้ง)
├── .env.example              ← Template environment variables
├── vercel.json               ← Cron config
└── package.json
```

---

## 💡 Tips เพิ่มเติม

**หา LINE User ID ของสมาชิก:**
เพิ่ม route `/api/webhook` แล้วตั้ง Webhook URL ใน LINE Developers จากนั้นให้สมาชิก Add บอทเป็นเพื่อนและส่งข้อความ → ดู userId ใน Vercel logs

**เปลี่ยนเวลาแจ้งเตือน:**
แก้ `vercel.json`:
```json
"schedule": "0 2 * * *"   ← 09:00 ไทย (UTC+7)
"schedule": "0 9 * * *"   ← 16:00 ไทย (UTC+7)  ← ค่าปัจจุบัน
```

**Custom Domain:**
ใน Vercel → Settings → Domains → เพิ่ม domain ของตัวเอง
อย่าลืมอัปเดต `NEXT_PUBLIC_APP_URL` ด้วย
