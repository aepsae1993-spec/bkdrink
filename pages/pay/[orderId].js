// pages/pay/[orderId].js — หน้าสำหรับสมาชิกอัปโหลดสลิป
// เข้าถึงได้จาก: /pay/:orderId?token=ACCESS_TOKEN

import { useState, useEffect } from 'react'
import Head from 'next/head'
import { Toast, Loading } from '../../components/ui'

export default function PayPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState(null)
  const [token, setToken] = useState(null)
  const [orderId, setOrderId] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    const oid = window.location.pathname.split('/pay/')[1]?.split('?')[0]

    setToken(t)
    setOrderId(oid)

    if (!oid) {
      setError('ลิงก์ไม่ถูกต้อง')
      setLoading(false)
      return
    }

    fetch(`/api/orders/${oid}?memberToken=${t || ''}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setToast({ msg: 'ไฟล์ใหญ่เกิน 5MB', type: 'error' })
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_token: token,
          image_base64: base64,
          image_filename: file.name,
        }),
      }).then(r => r.json())

      setUploading(false)
      if (res.error) {
        setToast({ msg: '❌ ' + res.error, type: 'error' })
      } else {
        setDone(true)
        if (res.allPaid) {
          setToast({ msg: '🎉 ทุกคนจ่ายครบแล้ว!' })
        } else {
          setToast({ msg: '✅ ยืนยันการจ่ายเรียบร้อย!' })
        }
      }
    }
  }

  const member = data?.currentMember
  const order = data?.order
  const allSummaries = data?.memberSummaries || []
  const alreadyPaid = member?.is_paid

  return (
    <>
      <Head>
        <title>DrinkPay — จ่ายค่าน้ำ</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#080818', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f0f23, #1a0a3e)', borderBottom: '1px solid #1a1a3e', padding: '14px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28 }}>🧋</div>
          <div style={{ color: '#e2ff5d', fontWeight: 700, fontSize: 16 }}>DrinkPay</div>
        </div>

        <div style={{ flex: 1, padding: 16, maxWidth: 480, margin: '0 auto', width: '100%' }}>
          {loading && <Loading message="กำลังโหลด..." />}

          {error && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
              <p style={{ color: '#f87171', fontSize: 15 }}>{error}</p>
            </div>
          )}

          {data && !loading && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              {/* Order Info */}
              <div style={{ background: '#0f0f23', border: '1px solid #1a1a3e', borderRadius: 16, padding: 18, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#aaa', fontSize: 13 }}>ออเดอร์</span>
                  <span style={{ color: '#e2ff5d', fontWeight: 700 }}>{order?.order_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#aaa', fontSize: 13 }}>วันที่</span>
                  <span style={{ color: '#e2e2ff', fontSize: 13 }}>{order?.order_date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#aaa', fontSize: 13 }}>กำหนดจ่าย</span>
                  <span style={{ color: order?.status === 'overdue' ? '#f87171' : '#e2e2ff', fontSize: 13, fontWeight: 600 }}>
                    {order?.deadline} {order?.status === 'overdue' ? '⚠️ เกินกำหนด' : ''}
                  </span>
                </div>
              </div>

              {/* My Amount */}
              {member ? (
                <div style={{ background: 'linear-gradient(135deg, #1a1a3e, #12122a)', border: '1px solid #2a2a5a', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{member.avatar_emoji}</div>
                  <div style={{ color: '#e2e2ff', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{member.member_name}</div>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>น้ำ ฿{member.items_total} + ค่าส่ง ฿{member.delivery_share}</div>
                  <div style={{ color: '#e2ff5d', fontSize: 36, fontWeight: 700 }}>฿{member.total_due}</div>
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>ยอดที่ต้องจ่าย</div>
                </div>
              ) : (
                <div style={{ background: '#1a0a0a', border: '1px solid #ef444430', borderRadius: 14, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                  <p style={{ color: '#f87171', fontSize: 14 }}>⚠️ ไม่พบข้อมูลของคุณ กรุณาใช้ลิงก์ที่ได้รับจาก LINE</p>
                </div>
              )}

              {/* Upload Section */}
              {member && !alreadyPaid && !done && (
                <div style={{ background: '#0f0f23', border: '1px solid #1a1a3e', borderRadius: 16, padding: 18, marginBottom: 16 }}>
                  <h3 style={{ color: '#e2e2ff', fontSize: 15, margin: '0 0 14px' }}>📎 อัปโหลดสลิป</h3>

                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: `2px dashed ${preview ? '#10b981' : '#2a2a5a'}`,
                    borderRadius: 14, padding: 24, cursor: 'pointer', marginBottom: 14,
                    background: preview ? '#10b98108' : '#12122a', transition: 'all 0.2s',
                    minHeight: 160,
                  }}>
                    {preview ? (
                      <img src={preview} alt="slip" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, objectFit: 'contain' }} />
                    ) : (
                      <>
                        <span style={{ fontSize: 36, marginBottom: 8 }}>🖼️</span>
                        <span style={{ color: '#aaa', fontSize: 14 }}>แตะเพื่อเลือกรูปสลิป</span>
                        <span style={{ color: '#555', fontSize: 12, marginTop: 4 }}>PNG / JPG / JPEG (max 5MB)</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                  </label>

                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    style={{
                      width: '100%', padding: 14,
                      background: file && !uploading ? '#10b981' : '#1a1a3e',
                      border: 'none', color: file ? 'white' : '#555',
                      borderRadius: 12, cursor: file ? 'pointer' : 'not-allowed',
                      fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 16,
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {uploading ? <><span className="spinner" /> กำลังอัปโหลด...</> : file ? '✅ ยืนยันการจ่าย' : 'เลือกสลิปก่อน'}
                  </button>
                </div>
              )}

              {/* Already Paid */}
              {(alreadyPaid || done) && (
                <div style={{ background: '#10b98115', border: '1px solid #10b98140', borderRadius: 16, padding: 24, marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                  <div style={{ color: '#10b981', fontSize: 18, fontWeight: 700 }}>จ่ายเรียบร้อยแล้ว!</div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 6 }}>ขอบคุณสำหรับการชำระเงิน</div>
                </div>
              )}

              {/* All Members Status */}
              <div style={{ background: '#0f0f23', border: '1px solid #1a1a3e', borderRadius: 14, padding: 16 }}>
                <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 10px' }}>สถานะทั้งหมด ({allSummaries.filter(s => s.is_paid).length}/{allSummaries.length} จ่ายแล้ว)</p>
                {allSummaries.map(s => (
                  <div key={s.member_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #12122a' }}>
                    <span style={{ fontSize: 14 }}>{s.avatar_emoji} {s.member_name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#e2ff5d', fontSize: 13 }}>฿{s.total_due}</span>
                      {s.is_paid ? (
                        <span style={{ color: '#10b981', fontSize: 12 }}>✓</span>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: 12 }}>●</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}
