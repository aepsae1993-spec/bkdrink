// lib/easyslip.js — ตรวจสอบสลิปกับ EasySlip API (เชื่อมธนาคารจริง)

const EASYSLIP_URL = 'https://api.easyslip.com/v2/verify/bank'

export async function verifySlipWithEasySlip({ buffer, mimeType = 'image/jpeg' }) {
  const apiKey = process.env.EASYSLIP_API_KEY
  if (!apiKey) throw new Error('ไม่พบ EASYSLIP_API_KEY')

  const formData = new FormData()
  const blob     = new Blob([buffer], { type: mimeType })
  formData.append('image', blob, 'slip.jpg')

  const res = await fetch(EASYSLIP_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  console.log('[EasySlip] HTTP', res.status, JSON.stringify(data).slice(0, 800))

  // ─── ตรวจ success flag ──────────────────────────────────────────────────
  // EasySlip v2 ตอบ: { success: true, message: "...", data: { amountInSlip, rawSlip: {...} } }
  if (!data.success && !data.data) {
    return {
      success: false,
      error: data.message || data.error?.message || data.raw || `Error ${res.status}`,
      raw: data,
    }
  }

  // ─── ดึง slip data จาก rawSlip ──────────────────────────────────────────
  const rawSlip = data.data?.rawSlip || data.rawSlip || data.data || {}

  // ─── parse amount ───────────────────────────────────────────────────────
  const amount = parseFloat(
    rawSlip.amount?.amount ??
    data.data?.amountInSlip ??
    0
  )

  const sender   = rawSlip.sender?.account?.name?.th
                || rawSlip.sender?.account?.name?.en
                || null
  const receiver = rawSlip.receiver?.account?.name?.th
                || rawSlip.receiver?.account?.name?.en
                || null
  const transRef = rawSlip.transRef || null
  const date     = rawSlip.date || null

  console.log('[EasySlip] parsed: amount=', amount, 'sender=', sender, 'transRef=', transRef)

  if (!amount || amount <= 0) {
    return {
      success: false,
      error: 'ไม่พบยอดเงินในสลิป',
      raw: data,
    }
  }

  return {
    success: true,
    amount,
    sender,
    receiver,
    transRef,
    date,
    raw: rawSlip,
  }
}

// ─── normalize ชื่อ/เลขบัญชี เพื่อเทียบ ─────────────────────────────────────
// ลบคำนำหน้า, ช่องว่าง, จุด, ขีด, ดอกจันที่ใช้ปิดข้อมูล (mask) ออก
export function normalizeName(s) {
  if (!s) return ''
  return String(s)
    .toLowerCase()
    .replace(/^(นาย|นาง|น\.?ส\.?|นางสาว|ด\.?ช\.?|ด\.?ญ\.?|mr\.?|mrs\.?|miss|ms\.?|บจก\.?|บมจ\.?)\s*/gi, '')
    .replace(/[\s\.\-_]/g, '')
    .trim()
}

export function normalizeAccountNumber(s) {
  if (!s) return ''
  return String(s).replace(/[^0-9xX]/g, '').toLowerCase()
}

// คืน true ถ้า "ชื่อบนสลิป" สอดคล้องกับ "ชื่อที่ตั้งไว้"
// - ถ้าหนึ่งฝั่งเป็นซับสตริงของอีกฝั่ง → match
// - ถ้าสลิปมี mask (x หรือ *) → เทียบเป็น pattern (x = ตัวอักษรอะไรก็ได้)
export function namesMatch(slipName, expectedName) {
  const a = normalizeName(slipName)
  const b = normalizeName(expectedName)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true

  // เผื่อสลิปมาแบบ mask "นายสมxxxxใจดี"
  if (/[x*]/i.test(a)) {
    const pattern = a.replace(/[x*]/gi, '.').replace(/[.*+?^${}()|[\]\\]/g, m => m === '.' ? '.' : '\\' + m)
    try { if (new RegExp(pattern).test(b)) return true } catch {}
  }
  return false
}

// คืน true ถ้าเลขบัญชีบนสลิปตรงกับที่ตั้งไว้
// สลิปมักจะ mask เป็น "xxx-x-x1234-x" → เทียบเฉพาะหลักท้าย ๆ ที่เห็น
export function accountsMatch(slipAcc, expectedAcc) {
  const a = normalizeAccountNumber(slipAcc)
  const b = normalizeAccountNumber(expectedAcc)
  if (!a || !b) return false
  if (a === b) return true

  // ถ้าสลิป mask: เทียบตำแหน่งตัวเลขที่ไม่ใช่ x
  if (a.length === b.length && /x/i.test(a)) {
    for (let i = 0; i < a.length; i++) {
      if (a[i].toLowerCase() === 'x') continue
      if (a[i] !== b[i]) return false
    }
    return true
  }

  // เทียบเฉพาะตัวเลขที่ไม่ mask ในสลิป (ดูว่า "ลงท้าย/มีอยู่ใน" ที่ตั้งไว้)
  const digitsOnly = a.replace(/x/gi, '')
  if (digitsOnly.length >= 4 && b.includes(digitsOnly)) return true
  return false
}

// ─── ตรวจว่าผ่านเกณฑ์ของระบบ DrinkPay ──────────────────────────────────────────
export function checkSlipAgainstOrder({ slipResult, expectedAmount }) {
  if (!slipResult.success) {
    return { approved: false, reason: slipResult.error || 'อ่านสลิปไม่สำเร็จ' }
  }
  if (slipResult.amount < expectedAmount) {
    return {
      approved: false,
      reason: `ยอดในสลิป ฿${slipResult.amount} น้อยกว่าที่ต้องจ่าย ฿${expectedAmount}`,
    }
  }
  return { approved: true, reason: 'ตรวจสอบสำเร็จ' }
}
