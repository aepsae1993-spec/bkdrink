// pages/api/orders/[orderId]/pay.js
import { getServiceClient } from '../../../../lib/supabase'
import { pushToGroup, buildCompletedMessage } from '../../../../lib/line'

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

    // Upload สลิปไป Supabase Storage
    const fileExt = image_filename?.split('.').pop() || 'jpg'
    const fileName = `${orderId}/${member.id}_${Date.now()}.${fileExt}`
    const fileBuffer = Buffer.from(image_base64, 'base64')

    const { error: uploadError } = await db.storage
      .from('slips')
      .upload(fileName, fileBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return res.status(500).json({ error: 'อัปโหลดรูปไม่สำเร็จ: ' + uploadError.message })
    }

    // Public URL
    const { data: urlData } = db.storage.from('slips').getPublicUrl(fileName)
    const slip_url = urlData.publicUrl

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
      slip_filename: fileName,
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
