// pages/api/payment-settings.js — ตั้งค่าผู้รับเงิน (ชื่อ/เลขบัญชี/พร้อมเพย์)
import { getServiceClient } from '../../lib/supabase'
import { isAdminRequest, unauthorized } from '../../lib/auth'

export default async function handler(req, res) {
  const db = getServiceClient()

  // ─── GET: ใครก็อ่านได้ (หน้า /pay ต้องใช้แสดงข้อมูลรับเงิน) ─────────────
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('payment_settings')
      .select('recipient_name, recipient_account_number, recipient_bank, promptpay_id, note, updated_at')
      .eq('id', 1)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || {})
  }

  // ─── PUT: เฉพาะแอดมิน ──────────────────────────────────────────────────
  if (req.method === 'PUT' || req.method === 'POST') {
    if (!isAdminRequest(req)) return unauthorized(res)

    const {
      recipient_name = null,
      recipient_account_number = null,
      recipient_bank = null,
      promptpay_id = null,
      note = null,
    } = req.body || {}

    const { data, error } = await db
      .from('payment_settings')
      .upsert({
        id: 1,
        recipient_name,
        recipient_account_number,
        recipient_bank,
        promptpay_id,
        note,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
