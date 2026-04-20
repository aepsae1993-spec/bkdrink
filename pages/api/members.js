// pages/api/members.js
import { getServiceClient } from '../../lib/supabase'
import { isAdminRequest, unauthorized } from '../../lib/auth'

export default async function handler(req, res) {
  const db = getServiceClient()

  // GET: ดึงสมาชิกทั้งหมด (ซ่อน line_user_id จาก public)
  if (req.method === 'GET') {
    const isAdmin = isAdminRequest(req)

    const { data, error } = await db
      .from('members')
      .select(
        isAdmin
          ? 'id, name, line_user_id, access_token, avatar_emoji, is_admin, created_at'
          : 'id, name, avatar_emoji, is_admin'
      )
      .order('created_at')

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (!isAdminRequest(req)) return unauthorized(res)

  // POST: เพิ่มสมาชิก
  if (req.method === 'POST') {
    const { name, line_user_id, avatar_emoji, is_admin } = req.body
    if (!name) return res.status(400).json({ error: 'ต้องการ name' })

    const { data, error } = await db
      .from('members')
      .insert({ name, line_user_id, avatar_emoji: avatar_emoji || '🧑', is_admin: !!is_admin })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  // PATCH: แก้ไขสมาชิก
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'ต้องการ id' })

    const { data, error } = await db
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE: ลบสมาชิก
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ต้องการ id' })

    const { error } = await db.from('members').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
