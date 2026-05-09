// pages/api/payment-recipients/[id].js — แก้ไข/ลบบัญชี
import { getServiceClient } from '../../../lib/supabase'
import { isAdminRequest, unauthorized } from '../../../lib/auth'

export default async function handler(req, res) {
  const db = getServiceClient()
  const { id } = req.query

  if (!id) return res.status(400).json({ error: 'ต้องการ id' })
  if (!isAdminRequest(req)) return unauthorized(res)

  // ─── PATCH/PUT: แก้ไข ─────────────────────────────────────────────────
  if (req.method === 'PATCH' || req.method === 'PUT') {
    const allowed = [
      'display_name', 'recipient_name', 'account_number',
      'bank', 'promptpay_id', 'note', 'is_default', 'sort_order',
    ]
    const updates = {}
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key]
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'ไม่มีฟิลด์ที่ต้องแก้' })
    }
    updates.updated_at = new Date().toISOString()

    const { data, error } = await db
      .from('payment_recipients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ─── DELETE ──────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { error } = await db
      .from('payment_recipients')
      .delete()
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
