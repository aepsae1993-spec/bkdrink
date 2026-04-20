// pages/api/orders/index.js
import { getServiceClient } from '../../../lib/supabase'
import { isAdminRequest, unauthorized } from '../../../lib/auth'
import { pushToGroup, multicast, buildNewOrderMessage } from '../../../lib/line'

export default async function handler(req, res) {
  const db = getServiceClient()

  // ─── GET: ดึงออเดอร์ทั้งหมด ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: orders, error: ordersErr } = await db
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersErr) return res.status(500).json({ error: ordersErr.message })

    // ดึง summary แต่ละออเดอร์
    const ordersWithSummary = await Promise.all(
      orders.map(async (order) => {
        const { data: summary } = await db
          .from('order_member_summary')
          .select('*')
          .eq('order_id', order.id)

        return { ...order, memberSummaries: summary || [] }
      })
    )

    return res.status(200).json(ordersWithSummary)
  }

  // ─── POST: สร้างออเดอร์ใหม่ ───────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!isAdminRequest(req)) return unauthorized(res)

    const { deadline, delivery_fee, items, note } = req.body
    // items = [{ member_id, menu_item_id, quantity }]

    if (!deadline || !items?.length) {
      return res.status(400).json({ error: 'ต้องการ deadline และ items' })
    }

    // 1. สร้างออเดอร์
    const { data: order, error: orderErr } = await db
      .from('orders')
      .insert({
        deadline,
        delivery_fee: delivery_fee || 30,
        note,
        order_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (orderErr) return res.status(500).json({ error: orderErr.message })

    // 2. ดึงราคาเมนูปัจจุบัน snapshot
    const menuIds = [...new Set(items.map((i) => i.menu_item_id))]
    const { data: menuItems } = await db
      .from('menu_items')
      .select('id, price')
      .in('id', menuIds)

    const priceMap = Object.fromEntries(menuItems.map((m) => [m.id, m.price]))

    // 3. เพิ่ม order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      member_id: item.member_id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity || 1,
      unit_price: priceMap[item.menu_item_id] || 0,
    }))

    const { error: itemsErr } = await db.from('order_items').insert(orderItems)
    if (itemsErr) return res.status(500).json({ error: itemsErr.message })

    // 4. ดึง member summary เพื่อส่ง LINE
    const { data: summary } = await db
      .from('order_member_summary')
      .select('*')
      .eq('order_id', order.id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://drinkpay.vercel.app'
    const lineMsg = buildNewOrderMessage({ order, memberSummaries: summary || [], appUrl })

    // 5. ส่งแจ้งเตือน LINE — ส่ง Group ครั้งเดียวเท่านั้น
    const lineResult = await pushToGroup(lineMsg)

    // 6. Log notification
    await db.from('notification_logs').insert({
      order_id: order.id,
      type: 'new_order',
      sent_to: 'group',
      message_preview: lineMsg.text?.slice(0, 200),
      success: lineResult.ok,
    })

    return res.status(201).json({
      order: { ...order, memberSummaries: summary },
      lineNotified: lineResult.ok,
    })
  }

  // ─── DELETE: ลบออเดอร์ ───────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!isAdminRequest(req)) return unauthorized(res)

    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ต้องการ id' })

    // ลบ cascade (order_items, payments ถูกลบตาม ON DELETE CASCADE)
    const { error } = await db.from('orders').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
