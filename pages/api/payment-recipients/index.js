// pages/api/payment-recipients/index.js — CRUD บัญชีรับเงินหลายราย
import { getServiceClient } from '../../../lib/supabase'
import { isAdminRequest, unauthorized } from '../../../lib/auth'

export default async function handler(req, res) {
  const db = getServiceClient()

  // ─── GET: ใครก็อ่านได้ (หน้า /pay ต้องใช้) ────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('payment_recipients')
      .select('*')
      .order('is_default', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // ─── POST: เพิ่มบัญชีใหม่ (admin) ─────────────────────────────────────
  if (req.method === 'POST') {
    if (!isAdminRequest(req)) return unauthorized(res)

    const {
      display_name,
      recipient_name,
      account_number = null,
      bank = null,
      promptpay_id = null,
      note = null,
      is_default = false,
      sort_order = 0,
    } = req.body || {}

    if (!display_name?.trim() || !recipient_name?.trim()) {
      return res.status(400).json({ error: 'ต้องระบุชื่อย่อและชื่อบนบัญชี' })
    }

    const { data, error } = await db
      .from('payment_recipients')
      .insert({
        display_name: display_name.trim(),
        recipient_name: recipient_name.trim(),
        account_number,
        bank,
        promptpay_id,
        note,
        is_default,
        sort_order,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
