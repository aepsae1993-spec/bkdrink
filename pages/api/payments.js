// pages/api/payments.js — ดึงประวัติการจ่ายเงินทั้งหมด (Admin)
import { getServiceClient } from '../../lib/supabase'
import { isAdminRequest, unauthorized } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdminRequest(req))  return unauthorized(res)

  const db = getServiceClient()

  // ดึง payment ทั้งหมด
  const { data: payments, error } = await db
    .from('payments')
    .select('*')
    .order('confirmed_at', { ascending: false })

  if (error) {
    console.error('payments fetch error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!payments?.length) {
    return res.status(200).json([])
  }

  // ดึง members + orders มา join ใน memory
  const memberIds = [...new Set(payments.map(p => p.member_id).filter(Boolean))]
  const orderIds  = [...new Set(payments.map(p => p.order_id).filter(Boolean))]

  const [{ data: members }, { data: orders }] = await Promise.all([
    db.from('members').select('id, name, avatar_emoji').in('id', memberIds),
    db.from('orders').select('id, order_number, order_date').in('id', orderIds),
  ])

  const memberMap = Object.fromEntries((members || []).map(m => [m.id, m]))
  const orderMap  = Object.fromEntries((orders  || []).map(o => [o.id, o]))

  // flatten structure
  const result = payments.map(p => {
    const m = memberMap[p.member_id] || {}
    const o = orderMap[p.order_id] || {}
    return {
      id: p.id,
      amount: p.amount,
      slip_url: p.slip_url,
      slip_amount: p.slip_amount,
      slip_sender: p.slip_sender,
      slip_receiver: p.slip_receiver,
      slip_trans_ref: p.slip_trans_ref,
      slip_date: p.slip_date,
      slip_verified: p.slip_verified,
      confirmed_at: p.confirmed_at,
      member_name: m.name || '-',
      member_emoji: m.avatar_emoji || '🧑',
      order_number: o.order_number || '-',
      order_date: o.order_date || '-',
    }
  })

  return res.status(200).json(result)
}

