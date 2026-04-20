// pages/api/orders/[orderId]/pay.js
import { getServiceClient } from '../../../../lib/supabase'
import { pushToGroup, buildCompletedMessage } from '../../../../lib/line'
import { uploadToDrive } from '../../../../lib/gdrive'

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
}

export default async function handler(req, res) {
  const { orderId } = req.query
  const db = getServiceClient()

  // ─── GET: ดูรายละเอียดออเดอร์ (ใช้กับ /pay/:orderId page) ─────────────────
  if (req.method === 'GET') {
    const { memberToken } = req.query

    const { data: order, error } = await db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) return res.status(404).json({ error: 'ไม่พบออเดอร์' })

    const { data: summary } = await db
      .from('order_member_summary')
      .select('*')
      .eq('order_id', orderId)

    // ถ้ามี memberToken — กรองเฉพาะคนนั้น
    let memberData = null
    if (memberToken) {
      memberData = summary?.find((s) => s.access_token === memberToken) || null
    }

    return res.status(200).json({
      order,
      memberSummaries: summary || [],
      currentMember: memberData,
    })
  }

  // ─── POST: อัปโหลดสลิป ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { member_token, image_base64, image_filename } = req.body

    if (!member_token || !image_base64) {
      return res.status(400).json({ error: 'ต้องการ member_token และรูปสลิป' })
    }

    // ตรวจสอบ member จาก token
    const { data: member } = await db
      .from('members')
      .select('id, name')
      .eq('access_token', member_token)
      .single()

    if (!member) return res.status(403).json({ error: 'Token ไม่ถูกต้อง' })

    // ตรวจว่าอยู่ในออเดอร์นี้ไหม
    const { data: orderItem } = await db
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .eq('member_id', member.id)
      .single()

    if (!orderItem) return res.status(403).json({ error: 'ไม่ได้อยู่ในออเดอร์นี้' })

    // ตรวจว่าจ่ายแล้วหรือยัง
    const { data: existing } = await db
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .eq('member_id', member.id)
      .single()

    if (existing) return res.status(409).json({ error: 'จ่ายแล้ว' })

    // อัปโหลดสลิปขึ้น Google Drive
    const fileExt = image_filename?.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg'
    const driveFilename = `slip_${orderId}_${member.id}_${Date.now()}.${fileExt}`
    const fileBuffer = Buffer.from(image_base64, 'base64')

    let slip_url, slip_filename
    try {
      const driveResult = await uploadToDrive({
        buffer: fileBuffer,
        filename: driveFilename,
        mimeType,
      })
      slip_url = driveResult.viewUrl
      slip_filename = driveResult.fileName
    } catch (err) {
      console.error('Google Drive upload error:', err)
      return res.status(500).json({ error: 'อัปโหลดสลิปไม่สำเร็จ: ' + err.message })
    }

    // ดึงยอดที่ต้องจ่าย
    const { data: summary } = await db
      .from('order_member_summary')
      .select('total_due')
      .eq('order_id', orderId)
      .eq('member_id', member.id)
      .single()

    // บันทึก payment
    const { error: payErr } = await db.from('payments').insert({
      order_id: orderId,
      member_id: member.id,
      amount: summary?.total_due || 0,
      slip_url,
      slip_filename,
    })

    if (payErr) return res.status(500).json({ error: payErr.message })

    // ─── ตรวจว่าทุกคนจ่ายแล้วหรือยัง ─────────────────────────────────────
    const { data: allSummaries } = await db
      .from('order_member_summary')
      .select('is_paid')
      .eq('order_id', orderId)

    const allPaid = allSummaries?.every((s) => s.is_paid)

    if (allPaid) {
      // อัปเดต status → completed
      await db.from('orders').update({ status: 'completed' }).eq('id', orderId)

      // แจ้ง LINE ว่าครบแล้ว
      const { data: order } = await db.from('orders').select('*').eq('id', orderId).single()
      await pushToGroup(buildCompletedMessage({ order }))
    }

    return res.status(200).json({ success: true, slip_url, allPaid })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
