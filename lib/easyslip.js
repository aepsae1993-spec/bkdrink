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
