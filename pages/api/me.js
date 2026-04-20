// pages/api/me.js — ดึงข้อมูลยอดค้างของสมาชิก 1 คน ด้วย access_token
import { getServiceClient } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'ต้องการ token' })

  const db = getServiceClient()

  // หา member จาก token
  const { data: member, error: memberErr } = await db
    .from('members')
    .select('id, name, avatar_emoji')
    .eq('access_token', token)
    .single()

  if (memberErr || !member) {
    return res.status(403).json({ error: 'Token ไม่ถูกต้อง' })
  }

  // ดึงออเดอร์ทั้งหมดที่ member คนนี้อยู่
  const { data: summaries } = await db
    .from('order_member_summary')
    .select('*')
    .eq('member_id', member.id)
    .order('order_date', { ascending: false })

  const pendingOrders   = (summaries || []).filter(s => !s.is_paid)
  const completedOrders = (summaries || []).filter(s =>  s.is_paid)

  return res.status(200).json({ member, pendingOrders, completedOrders })
}
