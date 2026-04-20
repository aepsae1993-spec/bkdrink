// pages/api/notify.js
import { getServiceClient } from '../../lib/supabase'
import { isAdminRequest, isCronRequest, unauthorized } from '../../lib/auth'
import { pushToGroup, pushToUser, buildReminderMessage, buildGroupReminderMessage } from '../../lib/line'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const isCron  = isCronRequest(req)
  const isAdmin = isAdminRequest(req)
  if (!isCron && !isAdmin) return unauthorized(res)

  const db     = getServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://drinkpay.vercel.app'
  const { orderId, type = 'reminder' } = req.body || {}

  let ordersToNotify = []

  if (orderId) {
    const { data } = await db.from('orders').select('*').eq('id', orderId).single()
    if (data) ordersToNotify = [data]
  } else if (isCron || type === 'overdue') {
    await db.rpc('mark_overdue_orders')
    const today = new Date().toISOString().split('T')[0]
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
    // ดึงทุกคนที่ยังไม่จ่าย
    const { data: unpaid } = await db
      .from('order_member_summary')
      .select('*')
      .eq('order_id', order.id)
      .eq('is_paid', false)

    if (!unpaid?.length) continue

    // ─── 1. ส่ง Group 1 ข้อความ รวมทุกคนที่ยังไม่จ่าย + ลิงก์รายคน ──────────
    const groupMsg = buildGroupReminderMessage({ order, unpaidMembers: unpaid, appUrl })
    const groupResult = await pushToGroup(groupMsg)

    await db.from('notification_logs').insert({
      order_id: order.id,
      type: order.status === 'overdue' ? 'overdue' : 'reminder',
      sent_to: 'group',
      message_preview: groupMsg.text?.slice(0, 200),
      success: groupResult.ok,
    })

    // ─── 2. ส่ง 1:1 เพิ่มเติม เฉพาะคนที่มี line_user_id ────────────────────
    for (const member of unpaid) {
      if (!member.line_user_id) {
        results.push({ memberId: member.member_id, memberName: member.member_name, sent: false, channel: 'no-line-id' })
        continue
      }

      const dmMsg = buildReminderMessage({ order, memberSummary: member, appUrl })
      const dmResult = await pushToUser(member.line_user_id, dmMsg)

      results.push({
        memberId: member.member_id,
        memberName: member.member_name,
        sent: dmResult.ok,
        channel: '1:1',
      })
    }

    // นับ group เป็น 1 success ด้วย
    results.push({ memberId: 'group', memberName: 'Group', sent: groupResult.ok, channel: 'group' })
  }

  return res.status(200).json({
    notified: results.filter(r => r.sent).length,
    total: results.length,
    results,
  })
}

