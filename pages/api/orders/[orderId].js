// pages/api/orders/[orderId].js
// รวม GET order detail + POST upload slip ไว้ที่เดียว
import { getServiceClient } from '../../../lib/supabase'
import { pushToGroup, buildCompletedMessage } from '../../../lib/line'
import { uploadViaAppsScript } from '../../../lib/appsscript'
import { verifySlipWithEasySlip, checkSlipAgainstOrder } from '../../../lib/easyslip'

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
}

export default async function handler(req, res) {
  const { orderId } = req.query
  const db = getServiceClient()

  // ─── GET: ดึงรายละเอียดออเดอร์ ───────────────────────────────────────────
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

    let memberData = null
    let memberItems = []

    if (memberToken) {
      memberData = summary?.find((s) => s.access_token === memberToken) || null

      // ดึงรายการเมนูที่ member คนนี้สั่ง
      if (memberData) {
        const { data: items } = await db
          .from('order_items')
          .select('quantity, unit_price, menu_items(name, emoji)')
          .eq('order_id', orderId)
          .eq('member_id', memberData.member_id)

        memberItems = (items || []).map(i => ({
          name:       i.menu_items?.name || 'เมนู',
          emoji:      i.menu_items?.emoji || '🧋',
          quantity:   i.quantity,
          unit_price: i.unit_price,
          subtotal:   i.quantity * i.unit_price,
        }))
      }
    }

    return res.status(200).json({
      order,
      memberSummaries: summary || [],
      currentMember: memberData,
      memberItems,
    })
  }

  // ─── POST: อัปโหลดสลิป ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { member_token, image_base64, image_filename } = req.body

    if (!member_token || !image_base64) {
      return res.status(400).json({ error: 'ต้องการ member_token และรูปสลิป' })
    }

    // ตรวจ token → หา member
    const { data: member, error: memberErr } = await db
      .from('members')
      .select('id, name')
      .eq('access_token', member_token)
      .single()

    if (memberErr || !member) {
      return res.status(403).json({ error: 'Token ไม่ถูกต้อง' })
    }

    // ตรวจว่าอยู่ในออเดอร์นี้
    const { data: orderItem } = await db
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .eq('member_id', member.id)
      .single()

    if (!orderItem) {
      return res.status(403).json({ error: 'ไม่ได้อยู่ในออเดอร์นี้' })
    }

    // ตรวจว่าจ่ายแล้วยัง
    const { data: existing } = await db
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .eq('member_id', member.id)
      .single()

    if (existing) return res.status(409).json({ error: 'จ่ายแล้ว' })

    // ดึงยอดที่ต้องจ่าย (ดึงก่อนเพื่อใช้ตรวจสลิป)
    const { data: summary } = await db
      .from('order_member_summary')
      .select('total_due')
      .eq('order_id', orderId)
      .eq('member_id', member.id)
      .single()

    const expectedAmount = summary?.total_due || 0
    const fileExt    = (image_filename?.split('.').pop() || 'jpg').toLowerCase()
    const mimeType   = fileExt === 'png' ? 'image/png' : 'image/jpeg'
    const fileBuffer = Buffer.from(image_base64, 'base64')

    // ─── ตรวจสอบสลิปกับ EasySlip API ──────────────────────────────────────
    let slipInfo = null
    try {
      const slipResult = await verifySlipWithEasySlip({ buffer: fileBuffer, mimeType })

      if (!slipResult.success) {
        return res.status(400).json({ error: 'โปรดอัพสลิปที่ถูกต้อง' })
      }

      if (slipResult.amount < expectedAmount) {
        return res.status(400).json({ error: 'กรุณาโอนให้ครบ' })
      }

      slipInfo = {
        amount:    slipResult.amount,
        sender:    slipResult.sender,
        receiver:  slipResult.receiver,
        transRef:  slipResult.transRef,
        date:      slipResult.date,
      }
    } catch (err) {
      console.error('EasySlip error:', err)
      slipInfo = { error: err.message, fallback: true }
    }

    // ─── อัปโหลดสลิปขึ้น Google Drive ────────────────────────────────────
    const filename = `slip_${orderId}_${member.id}_${Date.now()}.${fileExt}`
    let slip_url, slip_filename
    try {
      const result  = await uploadViaAppsScript({ buffer: fileBuffer, filename, mimeType })
      slip_url      = result.viewUrl
      slip_filename = result.fileName
    } catch (err) {
      console.error('Apps Script upload error:', err)
      return res.status(500).json({ error: 'อัปโหลดสลิปไม่สำเร็จ: ' + err.message })
    }

    // บันทึก payment
    const { error: payErr } = await db.from('payments').insert({
      order_id: orderId,
      member_id: member.id,
      amount: expectedAmount,
      slip_url,
      slip_filename,
    })

    if (payErr) return res.status(500).json({ error: payErr.message })

    // ตรวจว่าทุกคนจ่ายครบยัง
    const { data: allSummaries } = await db
      .from('order_member_summary')
      .select('is_paid')
      .eq('order_id', orderId)

    const allPaid = allSummaries?.every((s) => s.is_paid)

    if (allPaid) {
      await db.from('orders').update({ status: 'completed' }).eq('id', orderId)
      const { data: orderData } = await db.from('orders').select('*').eq('id', orderId).single()
      await pushToGroup(buildCompletedMessage({ order: orderData }))
    }

    return res.status(200).json({ success: true, slip_url, allPaid, slipInfo })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
