// pages/me.js — หน้าดูยอดค้างของตัวเอง
// เข้าได้จาก: /me?token=ACCESS_TOKEN

import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function MePage() {
  const [data, setData]     = useState(null)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(true)
  const [token, setToken]   = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    setToken(t)

    if (!t) {
      setError('ไม่พบ token กรุณาใช้ลิงก์ที่ได้รับจาก LINE')
      setLoading(false)
      return
    }

    fetch(`/api/me?token=${t}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const pendingOrders   = data?.pendingOrders   || []
  const completedOrders = data?.completedOrders || []
  const totalPending    = pendingOrders.reduce((s, o) => s + o.total_due, 0)

  return (
    <>
      <Head>
        <title>DrinkPay — ยอดของฉัน</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080818; color: #e2e2ff; font-family: 'Sarabun', sans-serif; min-height: 100vh; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .spinner { width:20px; height:20px; border:2px solid #2a2a5a; border-top-color:#e2ff5d; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f0f23,#1a0a3e)', borderBottom: '1px solid #1a1a3e', padding: '14px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 28 }}>🧋</div>
        <div style={{ color: '#e2ff5d', fontWeight: 700, fontSize: 16 }}>DrinkPay</div>
        <div style={{ color: '#555', fontSize: 12 }}>ยอดค้างของฉัน</div>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <span className="spinner" />
            <p style={{ color: '#666', marginTop: 12, fontSize: 14 }}>กำลังโหลด...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
            <p style={{ color: '#f87171', fontSize: 15 }}>{error}</p>
          </div>
        )}

        {data && !loading && (
          <div style={{ animation: 'fadeUp .3s ease' }}>

            {/* Profile */}
            <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
              <div style={{ fontSize: 48 }}>{data.member.avatar_emoji}</div>
              <div style={{ color: '#e2e2ff', fontWeight: 700, fontSize: 20, marginTop: 8 }}>{data.member.name}</div>
            </div>

            {/* Summary Card */}
            <div style={{
              background: totalPending > 0 ? 'linear-gradient(135deg,#1a0a0a,#2a0a0a)' : 'linear-gradient(135deg,#0a1a0a,#0a2a0a)',
              border: `1px solid ${totalPending > 0 ? '#ef444440' : '#10b98140'}`,
              borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center',
            }}>
              {totalPending > 0 ? (
                <>
                  <div style={{ color: '#f87171', fontSize: 13, marginBottom: 4 }}>ยอดค้างทั้งหมด</div>
                  <div style={{ color: '#f87171', fontSize: 40, fontWeight: 700 }}>฿{totalPending.toLocaleString()}</div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>{pendingOrders.length} ออเดอร์ที่ยังไม่จ่าย</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                  <div style={{ color: '#10b981', fontSize: 18, fontWeight: 700 }}>จ่ายครบหมดแล้ว!</div>
                  <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>ไม่มียอดค้าง</div>
                </>
              )}
            </div>

            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: '#f87171', fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  ยังไม่จ่าย ({pendingOrders.length} ออเดอร์)
                </div>
                {pendingOrders.map(o => (
                  <div key={o.order_id} style={{
                    background: '#0f0f23', border: '1px solid #ef444430',
                    borderRadius: 14, padding: 16, marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ color: '#e2ff5d', fontWeight: 700, fontSize: 14 }}>{o.order_number}</div>
                        <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                          📅 {o.order_date}
                        </div>
                        <div style={{ color: o.status === 'overdue' ? '#f87171' : '#aaa', fontSize: 12, marginTop: 2 }}>
                          ⏰ กำหนด {o.deadline} {o.status === 'overdue' ? '⚠️ เกินกำหนด' : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#f87171', fontWeight: 700, fontSize: 22 }}>฿{o.total_due}</div>
                        <div style={{ color: '#555', fontSize: 11 }}>น้ำ ฿{o.items_total} + ส่ง ฿{o.delivery_share}</div>
                      </div>
                    </div>
                    <a
                      href={`${appUrl}/pay/${o.order_id}?token=${token}`}
                      style={{
                        display: 'block', textAlign: 'center', padding: '10px',
                        background: '#10b981', color: 'white', borderRadius: 10,
                        fontWeight: 600, fontSize: 15, textDecoration: 'none',
                      }}
                    >
                      📎 อัปโหลดสลิปเลย
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <div>
                <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  จ่ายแล้ว ({completedOrders.length} ออเดอร์)
                </div>
                {completedOrders.map(o => (
                  <div key={o.order_id} style={{
                    background: '#0f0f23', border: '1px solid #10b98120',
                    borderRadius: 14, padding: 14, marginBottom: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ color: '#aaa', fontWeight: 600, fontSize: 13 }}>{o.order_number}</div>
                      <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
                        {o.paid_at ? `จ่ายเมื่อ ${new Date(o.paid_at).toLocaleDateString('th-TH')}` : o.order_date}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#aaa', fontSize: 14 }}>฿{o.total_due}</span>
                      <span style={{ color: '#10b981', fontSize: 13 }}>✓</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </>
  )
}
