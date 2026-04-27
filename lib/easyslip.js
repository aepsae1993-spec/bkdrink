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

  // Log full response เพื่อ debug (จะเห็นใน Vercel Functions logs)
  console.log('[EasySlip] HTTP', res.status, JSON.stringify(data).slice(0, 500))

  // ─── ดึง slip data จาก response ──────────────────────────────────────────
  // EasySlip ตอบกลับมาหลายรูปแบบ ลอง extract ทีละแบบ
  const slipData =
    data.data ||           // { status: 200, data: {...} }
    (data.amount ? data : null) ||  // { amount: {...}, sender: ... }
    null

  // ─── ถ้าหา slip data ไม่เจอเลย = ล้มเหลวจริง ────────────────────────────
  if (!slipData) {
    return {
      success: false,
      error: data.message || data.error?.message || data.raw || `Error ${res.status}`,
      raw: data,
    }
  }

  // ─── parse fields ────────────────────────────────────────────────────────
  const amount   = parseFloat(slipData.amount?.amount ?? slipData.amount ?? 0)
  const sender   = slipData.sender?.account?.name?.th || slipData.sender?.account?.name?.en || null
  const receiver = slipData.receiver?.account?.name?.th || slipData.receiver?.account?.name?.en || null
  const transRef = slipData.transRef || null
  const date     = slipData.date || null

  // ถ้ายอดเป็น 0 หรืออ่านไม่ออก = ไม่ใช่สลิป
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
    raw: slipData,
  }
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
