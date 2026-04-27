// lib/easyslip.js — ตรวจสอบสลิปกับ EasySlip API (เชื่อมธนาคารจริง)

const EASYSLIP_URL = 'https://api.easyslip.com/v2/verify/bank'

export async function verifySlipWithEasySlip({ buffer, mimeType = 'image/jpeg' }) {
  const apiKey = process.env.EASYSLIP_API_KEY
  if (!apiKey) throw new Error('ไม่พบ EASYSLIP_API_KEY')

  // EasySlip รับเป็น multipart/form-data ฟิลด์ "image"
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

  if (!res.ok || data.status !== 200) {
    return {
      success: false,
      error: data.message || data.error || `EasySlip Error (${res.status})`,
      raw: data,
    }
  }

  // ดึงข้อมูลที่ต้องการจาก response
  const slip   = data.data || {}
  const amount = parseFloat(slip.amount?.amount || 0)
  const sender = slip.sender?.account?.name?.th || slip.sender?.account?.name?.en || null
  const receiver = slip.receiver?.account?.name?.th || slip.receiver?.account?.name?.en || null
  const transRef = slip.transRef || null
  const date = slip.date || null

  return {
    success: true,
    amount,
    sender,
    receiver,
    transRef,
    date,
    raw: slip,
  }
}

// ─── ตรวจว่าผ่านเกณฑ์ของระบบ DrinkPay ──────────────────────────────────────────
export function checkSlipAgainstOrder({ slipResult, expectedAmount }) {
  if (!slipResult.success) {
    return { approved: false, reason: slipResult.error || 'อ่านสลิปไม่สำเร็จ' }
  }

  // ยอดต้องเท่ากับหรือมากกว่ายอดที่ต้องจ่าย
  if (slipResult.amount < expectedAmount) {
    return {
      approved: false,
      reason: `ยอดในสลิป ฿${slipResult.amount} น้อยกว่าที่ต้องจ่าย ฿${expectedAmount}`,
    }
  }

  return {
    approved: true,
    reason: 'ตรวจสอบสำเร็จ',
  }
}
