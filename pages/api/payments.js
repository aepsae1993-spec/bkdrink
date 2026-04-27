// pages/api/payments.js — ดึงประวัติการจ่ายเงินทั้งหมด (Admin)
import { getServiceClient } from '../../lib/supabase'
import { isAdminRequest, unauthorized } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdminRequest(req))  return unauthorized(res)

  const db = getServiceClient()

  // ดึง payment ทั้งหมด + ชื่อสมาชิก + เลขออเดอร์
  const { data, error } = await db
    .from('payments')
    .select(`
      id,
      amount,
      slip_url,
      slip_amount,
      slip_sender,
      slip_receiver,
      slip_trans_ref,
      slip_date,
      slip_verified,
      confirmed_at,
      members ( name, avatar_emoji ),
      orders ( order_number, order_date )
    `)
    .order('confirmed_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // flatten structure
  const payments = (data || []).map(p => ({
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
    member_name: p.members?.name || '-',
    member_emoji: p.members?.avatar_emoji || '🧑',
    order_number: p.orders?.order_number || '-',
    order_date: p.orders?.order_date || '-',
  }))

  return res.status(200).json(payments)
}
