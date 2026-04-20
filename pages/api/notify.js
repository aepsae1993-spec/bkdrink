// pages/api/notify.js
// ─── ใช้ได้ 2 แบบ:
//   1. Admin กดปุ่มส่งแจ้งเตือนใน UI
//   2. Vercel Cron รัน daily เพื่อตรวจ overdue
import { getServiceClient } from '../../lib/supabase'
import { isAdminRequest, isCronRequest, unauthorized } from '../../lib/auth'
import {
  pushToUser,
  multicast,
  buildReminderMessage,
} from '../../lib/line'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const isCron = isCronRequest(req)
  const isAdmin = isAdminRequest(req)

  if (!isCron && !isAdmin) return unauthorized(res)

  const db = getServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://drinkpay.vercel.app'
  const { orderId, type = 'reminder' } = req.body || {}

  let ordersToNotify = []

  if (orderId) {
    // ─── ส่งเฉพาะออเดอร์ที่ระบุ ─────────────────────────────────────────
    const { data } = await db.from('orders').select('*').eq('id', orderId).single()
    if (data) ordersToNotify = [data]
  } else if (isCron || type === 'overdue') {
    // ─── Cron: หาออเดอร์ที่เกินกำหนดวันนี้ ───────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    // อัปเดต status ที่เกินกำหนด
    await db.rpc('mark_overdue_orders')

    const { data } = await db
      .from('orders')
      .select('*')
      .in('status', ['active', 'overdue'])
      .lte('deadline', today)

    ordersToNotify = data || []
  }

  if (!ordersToNotify.length) {
    return res.status(200).json({ message: 'ไม่มีออเดอร์ที่ต้องแจ้งเตือน', notified: 0 })
  }

  const results = []

  for (const order of ordersToNotify) {
    // ดึงคนที่ยังไม่จ่าย
    const { data: unpaid } = await db
      .from('order_member_summary')
      .select('*')
      .eq('order_id', order.id)
      .eq('is_paid', false)

    if (!unpaid?.length) continue

    // ส่งทีละคน (เพื่อให้ลิงก์ถูกต้องต่อคน)
    for (const member of unpaid) {
      const msg = buildReminderMessage({ order, memberSummary: member, appUrl })

      let lineResult = { ok: false }

      if (member.line_user_id) {
        lineResult = await pushToUser(member.line_user_id, msg)
      }

      // Log
      await db.from('notification_logs').insert({
        order_id: order.id,
        type: order.status === 'overdue' ? 'overdue' : 'reminder',
        sent_to: member.line_user_id || `member:${member.member_id}`,
        message_preview: msg.text?.slice(0, 200),
        success: lineResult.ok,
      })

      results.push({
        memberId: member.member_id,
        memberName: member.member_name,
        orderId: order.id,
        sent: lineResult.ok,
      })
    }
  }

  return res.status(200).json({
    notified: results.filter((r) => r.sent).length,
    total: results.length,
    results,
  })
}
