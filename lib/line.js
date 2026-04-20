// lib/line.js — LINE Messaging API helpers

const LINE_API = 'https://api.line.me/v2/bot/message'

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
}

// ─── ส่งหา Group/Chat ───────────────────────────────────────────────────────
export async function pushToGroup(message) {
  if (!process.env.LINE_GROUP_ID) {
    console.warn('[LINE] LINE_GROUP_ID ไม่ได้ตั้งค่า')
    return { ok: false, reason: 'no group id' }
  }

  const res = await fetch(`${LINE_API}/push`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: process.env.LINE_GROUP_ID,
      messages: [buildFlexOrText(message)],
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) console.error('[LINE] pushToGroup error:', body)
  return { ok: res.ok, status: res.status, body }
}

// ─── ส่งหาคนเดียว (ต้องมี lineUserId) ──────────────────────────────────────
export async function pushToUser(lineUserId, message) {
  if (!lineUserId) return { ok: false, reason: 'no line user id' }

  const res = await fetch(`${LINE_API}/push`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: lineUserId,
      messages: [buildFlexOrText(message)],
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) console.error('[LINE] pushToUser error:', body)
  return { ok: res.ok, status: res.status, body }
}

// ─── Multicast — ส่งหลายคนพร้อมกัน (max 500 คน) ────────────────────────────
export async function multicast(lineUserIds, message) {
  const validIds = lineUserIds.filter(Boolean)
  if (!validIds.length) return { ok: false, reason: 'no valid user ids' }

  const res = await fetch(`${LINE_API}/multicast`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: validIds,
      messages: [buildFlexOrText(message)],
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) console.error('[LINE] multicast error:', body)
  return { ok: res.ok, status: res.status, body }
}

// ─── สร้างข้อความสำหรับออเดอร์ใหม่ ──────────────────────────────────────────
export function buildNewOrderMessage({ order, memberSummaries, appUrl }) {
  const deadline = new Date(order.deadline).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const lines = memberSummaries.map(
    (s) => `👤 ${s.member_name}: ฿${s.total_due}`
  ).join('\n')

  return {
    type: 'text',
    text: [
      `🧋 ออเดอร์น้ำใหม่! ${order.order_number}`,
      `📅 วันที่: ${order.order_date}`,
      `⏰ กำหนดจ่าย: ${deadline}`,
      `🚚 ค่าส่งรวม: ฿${order.delivery_fee}`,
      ``,
      `💰 ยอดที่ต้องจ่าย:`,
      lines,
      ``,
      `📎 อัปโหลดสลิปได้ที่:`,
      `${appUrl}/pay/${order.id}`,
    ].join('\n'),
  }
}

// ─── ข้อความเตือนคนที่ยังไม่จ่าย ─────────────────────────────────────────────
export function buildReminderMessage({ order, memberSummary, appUrl }) {
  const deadline = new Date(order.deadline).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const isOverdue = order.status === 'overdue'

  return {
    type: 'text',
    text: [
      isOverdue ? `🔴 เกินกำหนดแล้ว!` : `⚠️ เตือนการจ่ายค่าน้ำ`,
      ``,
      `ออเดอร์: ${order.order_number}`,
      `ยอดที่ต้องจ่าย: ฿${memberSummary.total_due}`,
      `กำหนด: ${deadline}`,
      isOverdue ? `\n❗ กรุณาจ่ายโดยด่วน` : '',
      ``,
      `📎 อัปโหลดสลิป: ${appUrl}/pay/${order.id}`,
    ].filter((l) => l !== undefined).join('\n'),
  }
}

// ─── ข้อความสรุปเมื่อทุกคนจ่ายแล้ว ──────────────────────────────────────────
export function buildCompletedMessage({ order }) {
  return {
    type: 'text',
    text: [
      `✅ ออเดอร์ ${order.order_number} เสร็จสิ้น!`,
      `ทุกคนจ่ายครบแล้ว 🎉`,
    ].join('\n'),
  }
}

// ─── Internal: เลือก text หรือ flex ─────────────────────────────────────────
function buildFlexOrText(message) {
  // ใช้ text สำหรับความเรียบง่าย (สามารถ upgrade เป็น flex message ได้)
  if (typeof message === 'string') return { type: 'text', text: message }
  return message
}
