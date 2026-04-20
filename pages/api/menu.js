// pages/api/menu.js
import { getServiceClient } from '../../lib/supabase'
import { isAdminRequest, unauthorized } from '../../lib/auth'

export default async function handler(req, res) {
  const db = getServiceClient()

  // ─── GET: ดึงเมนูทั้งหมด ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('menu_items')
      .select('*')
      .order('sort_order')

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ─── POST/PUT/DELETE: ต้องเป็น Admin ─────────────────────────────────────
  if (!isAdminRequest(req)) return unauthorized(res)

  // POST: เพิ่มเมนูใหม่
  if (req.method === 'POST') {
    const { name, price, emoji, sort_order } = req.body
    if (!name || price == null) {
      return res.status(400).json({ error: 'name และ price จำเป็น' })
    }

    const { data, error } = await db
      .from('menu_items')
      .insert({ name, price, emoji: emoji || '🧋', sort_order: sort_order || 0 })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  // PATCH: แก้ไขเมนู (id ใน body)
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'ต้องการ id' })

    const { data, error } = await db
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE: ลบเมนู
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ต้องการ id' })

    const { error } = await db.from('menu_items').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
