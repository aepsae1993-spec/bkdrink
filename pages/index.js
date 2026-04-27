// pages/index.js — Admin Dashboard
import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import {
  Toast, Btn, Card, StatusBadge, SectionHeader,
  ProgressBar, Modal, Input, Loading, Empty,
} from '../components/ui'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const API = (path, opts = {}) =>
  fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('adminToken') || '' : ''}`,
      ...opts.headers,
    },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then((r) => r.json())

const EMOJI_LIST = ['🧑', '👦', '👩', '👧', '🧒', '🧔', '👱', '🙋', '🧑‍💻', '🧑‍🎤']

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setErr('')
    // ทดสอบ token โดย call API ที่ต้อง auth
    const res = await fetch('/api/members', {
      headers: { Authorization: `Bearer ${pw}` },
    })
    if (res.ok) {
      localStorage.setItem('adminToken', pw)
      onLogin(pw)
    } else {
      setErr('รหัสผ่านไม่ถูกต้อง')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16,
    }}>
      <div style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #e2ff5d, #b8ff00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>🧋</div>
          <h1 style={{ color: '#e2ff5d', fontSize: 24, fontWeight: 700 }}>DrinkPay</h1>
          <p style={{ color: '#666', fontSize: 14 }}>Admin Dashboard</p>
        </div>
        <Card>
          <Input
            label="รหัสผ่าน Admin"
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="กรอกรหัสผ่าน..."
          />
          {err && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <Btn onClick={handleLogin} loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
            เข้าสู่ระบบ
          </Btn>
        </Card>
      </div>
    </div>
  )
}

// ─── New Order Modal ──────────────────────────────────────────────────────────
function NewOrderModal({ menu, members, onClose, onCreated }) {
  const [selections, setSelections] = useState({})
  const [deadline, setDeadline] = useState('')
  const [fee, setFee] = useState(30)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const toggle = (mbrId, menuId) => {
    const key = `${mbrId}|${menuId}`
    setSelections(p => ({ ...p, [key]: !p[key] }))
  }

  const handleCreate = async () => {
    const items = Object.entries(selections)
      .filter(([, v]) => v)
      .map(([key]) => {
        const [member_id, menu_item_id] = key.split('|')
        return { member_id, menu_item_id, quantity: 1 }
      })
    if (!items.length) return alert('เลือกรายการน้ำอย่างน้อย 1 รายการ')
    if (!deadline) return alert('กรุณาเลือกวันกำหนดจ่าย')

    setLoading(true)
    const res = await API('/api/orders', {
      method: 'POST',
      body: { deadline, delivery_fee: fee, items, note },
    })
    setLoading(false)

    if (res.error) return alert('เกิดข้อผิดพลาด: ' + res.error)
    onCreated(res)
    onClose()
  }

  const activeMenu = menu.filter(m => m.available)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 12px', overflowY: 'auto',
    }}>
      <div style={{
        background: '#0f0f23', border: '1px solid #2a2a5a', borderRadius: 20,
        padding: 24, maxWidth: 720, width: '100%', animation: 'fadeUp 0.25s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#e2ff5d', margin: 0, fontSize: 18 }}>🧋 สร้างออเดอร์ใหม่</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 22 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>วันกำหนดจ่าย *</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 10, color: '#e2e2ff', fontFamily: "'Sarabun', sans-serif", fontSize: 14 }} />
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>ค่าส่ง (฿)</label>
            <input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} min={0}
              style={{ width: '100%', padding: '10px 12px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 10, color: '#e2e2ff', fontFamily: "'Sarabun', sans-serif", fontSize: 14 }} />
          </div>
          <div style={{ flex: 2, minWidth: 180 }}>
            <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>หมายเหตุ</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="ถ้ามี..."
              style={{ width: '100%', padding: '10px 12px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 10, color: '#e2e2ff', fontFamily: "'Sarabun', sans-serif", fontSize: 14 }} />
          </div>
        </div>

        <p style={{ color: '#aaa', fontSize: 13, marginBottom: 10 }}>เลือกเมนูสำหรับแต่ละคน:</p>
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
            <thead>
              <tr>
                <th style={{ color: '#666', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #1a1a3e', fontWeight: 500 }}>สมาชิก</th>
                {activeMenu.map(m => (
                  <th key={m.id} style={{ color: '#aaa', textAlign: 'center', padding: '8px 6px', borderBottom: '1px solid #1a1a3e', fontWeight: 400 }}>
                    <div>{m.emoji}</div>
                    <div style={{ fontSize: 11 }}>{m.name}</div>
                    <div style={{ color: '#e2ff5d', fontSize: 11 }}>฿{m.price}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(mbr => (
                <tr key={mbr.id}>
                  <td style={{ color: '#e2e2ff', padding: '8px 10px', borderBottom: '1px solid #12122a', whiteSpace: 'nowrap' }}>
                    {mbr.avatar_emoji} {mbr.name}
                  </td>
                  {activeMenu.map(m => {
                    const key = `${mbr.id}|${m.id}`
                    const checked = !!selections[key]
                    return (
                      <td key={m.id} style={{ textAlign: 'center', padding: '8px 6px', borderBottom: '1px solid #12122a' }}>
                        <button onClick={() => toggle(mbr.id, m.id)} style={{
                          width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14,
                          background: checked ? '#e2ff5d' : '#1a1a3e',
                          border: checked ? 'none' : '1px solid #2a2a5a',
                          color: checked ? '#0f0f23' : '#444',
                          transition: 'all 0.12s',
                          fontWeight: 700,
                        }}>
                          {checked ? '✓' : ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="secondary" onClick={onClose}>ยกเลิก</Btn>
          <Btn onClick={handleCreate} loading={loading} style={{ flex: 1, justifyContent: 'center' }}>
            ✅ สร้างออเดอร์ + แจ้ง LINE
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Order Detail Card ────────────────────────────────────────────────────────
function OrderCard({ order, showToast, onDeleted }) {
  const [expanded, setExpanded] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [summaries, setSummaries] = useState(order.memberSummaries || [])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const paid = summaries.filter(s => s.is_paid).length
  const total = summaries.length
  const totalAmt = summaries.reduce((s, m) => s + (m.total_due || 0), 0)

  // ดึงข้อมูลล่าสุดทุกครั้งที่กด expand
  const handleToggle = async () => {
    const opening = !expanded
    setExpanded(opening)
    if (!opening) return

    setLoadingDetail(true)
    const res = await fetch(`/api/orders/${order.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` },
    }).then(r => r.json())
    setLoadingDetail(false)

    if (res.memberSummaries) setSummaries(res.memberSummaries)
  }

  const handleNotify = async (e) => {
    e.stopPropagation()
    setNotifying(true)
    const res = await API('/api/notify', { method: 'POST', body: { orderId: order.id } })
    setNotifying(false)
    if (res.error) return showToast('❌ ' + res.error, 'error')
    showToast(`📣 ส่งแจ้งเตือนสำเร็จ ${res.notified}/${res.total} คน`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await API('/api/orders', { method: 'DELETE', body: { id: order.id } })
    setDeleting(false)
    setConfirmDelete(false)
    if (res.error) return showToast('❌ ' + res.error, 'error')
    showToast('🗑️ ลบออเดอร์แล้ว')
    onDeleted(order.id)
  }

  const paidMembers   = summaries.filter(s => s.is_paid)
  const unpaidMembers = summaries.filter(s => !s.is_paid)

  return (
    <>
      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#0f0f23', border: '1px solid #ef444440',
            borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: '#f87171', margin: '0 0 8px' }}>ลบออเดอร์?</h3>
            <p style={{ color: '#aaa', fontSize: 14, marginBottom: 20 }}>
              {order.order_number} จะถูกลบถาวรพร้อมข้อมูลการจ่ายทั้งหมด
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: '10px', background: 'transparent',
                  border: '1px solid #2a2a5a', color: '#aaa', borderRadius: 10,
                  cursor: 'pointer', fontFamily: "'Sarabun', sans-serif", fontSize: 14,
                }}
              >ยกเลิก</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '10px', background: '#ef4444',
                  border: 'none', color: 'white', borderRadius: 10,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Sarabun', sans-serif", fontSize: 14, fontWeight: 600,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'กำลังลบ...' : 'ลบเลย'}
              </button>
            </div>
          </div>
        </div>
      )}
    <div style={{
      background: '#0f0f23',
      border: `1px solid ${expanded ? '#3a3a6a' : '#1a1a3e'}`,
      borderRadius: 16, marginBottom: 12,
      transition: 'border-color 0.2s',
      overflow: 'hidden',
    }}>
      {/* ── Header (กดได้) ── */}
      <div
        onClick={handleToggle}
        style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ color: '#e2ff5d', fontWeight: 700, fontSize: 15 }}>{order.order_number}</span>
              <StatusBadge status={order.status} />
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              📅 {order.order_date} · ⏰ กำหนด {order.deadline} · 🚚 ฿{order.delivery_fee}
            </div>
            {order.note && <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>💬 {order.note}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#e2ff5d', fontWeight: 700, fontSize: 16 }}>฿{totalAmt.toLocaleString()}</div>
              <div style={{ color: paid === total && total > 0 ? '#10b981' : '#888', fontSize: 12 }}>
                {paid}/{total} จ่ายแล้ว
              </div>
            </div>
            {/* ปุ่มลบ */}
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              title="ลบออเดอร์"
              style={{
                background: 'transparent', border: '1px solid #2a2a5a',
                color: '#666', borderRadius: 8, width: 30, height: 30,
                cursor: 'pointer', fontSize: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a5a'; e.currentTarget.style.color = '#666' }}
            >🗑️</button>
            <span style={{ color: '#444', fontSize: 18, marginTop: 4 }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar value={paid} max={total} color={paid === total && total > 0 ? '#10b981' : '#e2ff5d'} />

        {/* Avatar pills preview */}
        {!expanded && summaries.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
            {summaries.map(s => (
              <span key={s.member_id} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 20,
                background: s.is_paid ? '#10b98122' : '#ef444415',
                color: s.is_paid ? '#10b981' : '#f87171',
                border: `1px solid ${s.is_paid ? '#10b98130' : '#ef444430'}`,
              }}>
                {s.avatar_emoji} {s.member_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1a1a3e', padding: '16px' }} onClick={e => e.stopPropagation()}>

          {loadingDetail ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#666', fontSize: 13 }}>
              <span className="spinner" style={{ display: 'inline-block', marginRight: 8 }} />
              กำลังโหลด...
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ color: '#aaa', fontSize: 13 }}>
                  ✅ จ่ายแล้ว {paid} คน · ⏳ ยังไม่จ่าย {unpaidMembers.length} คน
                </span>
                {order.status !== 'completed' && (
                  <Btn variant="line" size="sm" onClick={handleNotify} loading={notifying}>
                    📣 เตือน LINE
                  </Btn>
                )}
              </div>

              {/* ยังไม่จ่าย */}
              {unpaidMembers.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: '#f87171', fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    ยังไม่จ่าย ({unpaidMembers.length} คน)
                  </div>
                  {unpaidMembers.map(s => (
                    <MemberRow key={s.member_id} s={s} orderId={order.id} />
                  ))}
                </div>
              )}

              {/* จ่ายแล้ว */}
              {paidMembers.length > 0 && (
                <div>
                  <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    จ่ายแล้ว ({paidMembers.length} คน)
                  </div>
                  {paidMembers.map(s => (
                    <MemberRow key={s.member_id} s={s} orderId={order.id} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
    </>
  )
}

// ── Row สมาชิกแต่ละคน ──────────────────────────────────────────────────────────
function MemberRow({ s, orderId }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const payLink = `${appUrl}/pay/${orderId}?token=${s.access_token}`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', borderRadius: 10, marginBottom: 6,
      background: s.is_paid ? '#10b98108' : '#12122a',
      border: `1px solid ${s.is_paid ? '#10b98125' : '#1e1e3a'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{s.avatar_emoji}</span>
        <div>
          <div style={{ color: '#e2e2ff', fontSize: 14, fontWeight: 500 }}>{s.member_name}</div>
          <div style={{ color: '#555', fontSize: 11 }}>
            น้ำ ฿{s.items_total} + ส่ง ฿{s.delivery_share}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ color: '#e2ff5d', fontWeight: 700, fontSize: 15 }}>฿{s.total_due}</span>
        {s.is_paid ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{
              background: '#10b98122', color: '#10b981',
              padding: '2px 9px', borderRadius: 20, fontSize: 12
            }}>✓ จ่ายแล้ว</span>
            {s.slip_url && (
              <a href={s.slip_url} target="_blank" rel="noreferrer"
                style={{ color: '#818cf8', fontSize: 11 }}>🖼 ดูสลิป</a>
            )}
            {s.paid_at && (
              <span style={{ color: '#444', fontSize: 10 }}>
                {new Date(s.paid_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' })}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{
              background: '#ef444415', color: '#f87171',
              padding: '2px 9px', borderRadius: 20, fontSize: 12
            }}>⏳ ยังไม่จ่าย</span>
            <button
              onClick={() => { navigator.clipboard?.writeText(payLink); }}
              title="คัดลอกลิงก์"
              style={{
                background: 'none', border: 'none', color: '#6366f1',
                fontSize: 11, cursor: 'pointer', padding: 0,
              }}
            >
              📋 คัดลอกลิงก์
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ menu, members, onMenuChange, onMembersChange, showToast }) {
  const [editMenuId, setEditMenuId] = useState(null)
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '', emoji: '🧋' })
  const [newMember, setNewMember] = useState({ name: '', line_user_id: '', avatar_emoji: '🧑' })
  const [loading, setLoading] = useState('')

  const updateMenu = async (id, updates) => {
    const res = await API('/api/menu', { method: 'PATCH', body: { id, ...updates } })
    if (res.error) return showToast('❌ ' + res.error, 'error')
    onMenuChange()
    setEditMenuId(null)
    showToast('✅ อัปเดตเมนูแล้ว')
  }

  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) return showToast('กรอกชื่อและราคา', 'error')
    setLoading('addMenu')
    const res = await API('/api/menu', { method: 'POST', body: { ...newMenuItem, price: Number(newMenuItem.price) } })
    setLoading('')
    if (res.error) return showToast('❌ ' + res.error, 'error')
    onMenuChange()
    setNewMenuItem({ name: '', price: '', emoji: '🧋' })
    showToast('✅ เพิ่มเมนูแล้ว')
  }

  const addMember = async () => {
    if (!newMember.name) return showToast('กรอกชื่อสมาชิก', 'error')
    setLoading('addMember')
    const res = await API('/api/members', { method: 'POST', body: newMember })
    setLoading('')
    if (res.error) return showToast('❌ ' + res.error, 'error')
    onMembersChange()
    setNewMember({ name: '', line_user_id: '', avatar_emoji: '🧑' })
    showToast(`✅ เพิ่ม ${newMember.name} แล้ว`)
  }

  return (
    <div>
      {/* ─── เมนูน้ำ ─── */}
      <Card style={{ marginBottom: 14 }}>
        <h3 style={{ color: '#e2ff5d', margin: '0 0 14px', fontSize: 15 }}>🧋 จัดการเมนูน้ำ</h3>
        {menu.map(item => (
          <MenuRow key={item.id} item={item} isEditing={editMenuId === item.id}
            onEdit={() => setEditMenuId(item.id)}
            onSave={(updates) => updateMenu(item.id, updates)}
            onCancel={() => setEditMenuId(null)} />
        ))}
        {/* เพิ่มเมนูใหม่ */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input value={newMenuItem.emoji} onChange={e => setNewMenuItem(p => ({ ...p, emoji: e.target.value }))}
            style={{ width: 50, padding: '8px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 8, color: '#e2e2ff', fontSize: 18, textAlign: 'center' }} />
          <input value={newMenuItem.name} onChange={e => setNewMenuItem(p => ({ ...p, name: e.target.value }))}
            placeholder="ชื่อเมนู" style={{ flex: 1, minWidth: 120, padding: '8px 12px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 8, color: '#e2e2ff', fontFamily: "'Sarabun', sans-serif" }} />
          <input value={newMenuItem.price} onChange={e => setNewMenuItem(p => ({ ...p, price: e.target.value }))}
            placeholder="ราคา" type="number" style={{ width: 80, padding: '8px 10px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 8, color: '#e2e2ff', fontFamily: "'Sarabun', sans-serif" }} />
          <Btn size="sm" onClick={addMenuItem} loading={loading === 'addMenu'}>+ เพิ่ม</Btn>
        </div>
      </Card>

      {/* ─── สมาชิก ─── */}
      <Card style={{ marginBottom: 14 }}>
        <h3 style={{ color: '#e2ff5d', margin: '0 0 14px', fontSize: 15 }}>👥 จัดการสมาชิก</h3>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #12122a' }}>
            <span style={{ fontSize: 14 }}>{m.avatar_emoji} {m.name}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {m.line_user_id ? (
                <span style={{ color: '#06c755', fontSize: 11 }}>✓ LINE</span>
              ) : (
                <span style={{ color: '#555', fontSize: 11 }}>ไม่มี LINE</span>
              )}
              <span style={{ color: '#555', fontSize: 10, fontFamily: 'monospace' }}>
                🔗 {m.access_token?.slice(0, 8)}...
              </span>
            </div>
          </div>
        ))}
        {/* เพิ่มสมาชิก */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <select value={newMember.avatar_emoji} onChange={e => setNewMember(p => ({ ...p, avatar_emoji: e.target.value }))}
            style={{ width: 60, padding: '8px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 8, color: '#e2e2ff', fontSize: 18 }}>
            {EMOJI_LIST.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
            placeholder="ชื่อสมาชิก" style={{ flex: 1, minWidth: 120, padding: '8px 12px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 8, color: '#e2e2ff', fontFamily: "'Sarabun', sans-serif" }} />
          <input value={newMember.line_user_id} onChange={e => setNewMember(p => ({ ...p, line_user_id: e.target.value }))}
            placeholder="LINE User ID (ถ้ามี)" style={{ flex: 2, minWidth: 160, padding: '8px 12px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 8, color: '#e2e2ff', fontFamily: "'Sarabun', sans-serif", fontSize: 13 }} />
          <Btn size="sm" onClick={addMember} loading={loading === 'addMember'}>+ เพิ่ม</Btn>
        </div>
      </Card>

      {/* ─── LINE Config Info ─── */}
      <Card>
        <h3 style={{ color: '#e2ff5d', margin: '0 0 12px', fontSize: 15 }}>📱 LINE OA ข้อมูล</h3>
        <div style={{ background: '#080818', borderRadius: 10, padding: 14, fontSize: 13, color: '#aaa', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 8px', color: '#818cf8' }}>Environment Variables ที่ต้องตั้งใน Vercel:</p>
          {[
            ['LINE_CHANNEL_ACCESS_TOKEN', 'จาก LINE Developers Console'],
            ['LINE_GROUP_ID', 'Group Chat ID (ขึ้นต้นด้วย C หรือ G)'],
            ['ADMIN_PASSWORD', 'รหัสผ่าน Admin'],
            ['NEXT_PUBLIC_SUPABASE_URL', 'จาก Supabase → Settings → API'],
            ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'จาก Supabase → Settings → API'],
            ['SUPABASE_SERVICE_ROLE_KEY', 'จาก Supabase → Settings → API'],
          ].map(([key, desc]) => (
            <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <code style={{ color: '#e2ff5d', background: '#12122a', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>{key}</code>
              <span style={{ color: '#666', fontSize: 12 }}>— {desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function MenuRow({ item, isEditing, onEdit, onSave, onCancel }) {
  const [price, setPrice] = useState(item.price)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #12122a' }}>
      <span style={{ color: item.available ? '#e2e2ff' : '#444', fontSize: 14 }}>
        {item.emoji} {item.name}
      </span>
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)}
            style={{ width: 70, padding: '5px 8px', background: '#1a1a3e', border: '1px solid #2a2a5a', borderRadius: 8, color: '#e2ff5d', fontFamily: "'Sarabun', sans-serif", fontSize: 14 }} />
          <Btn size="sm" onClick={() => onSave({ price: Number(price) })}>✓</Btn>
          <Btn size="sm" variant="secondary" onClick={onCancel}>✕</Btn>
          <Btn size="sm" variant={item.available ? 'danger' : 'secondary'}
            onClick={() => onSave({ available: !item.available })}>
            {item.available ? 'ปิด' : 'เปิด'}
          </Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#e2ff5d', fontWeight: 600 }}>฿{item.price}</span>
          {!item.available && <span style={{ color: '#555', fontSize: 11 }}>ปิด</span>}
          <Btn size="sm" variant="ghost" onClick={onEdit}>✏️</Btn>
        </div>
      )}
    </div>
  )
}

// ─── History Tab — ประวัติการจ่ายเงินทุกคน ─────────────────────────────────────
function HistoryTab({ members, showToast }) {
  const [payments, setPayments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterMember, setFilter]   = useState('all') // 'all' หรือ member_id
  const [search, setSearch]         = useState('')

  useEffect(() => {
    setLoading(true)
    API('/api/payments')
      .then(d => { if (!d.error) setPayments(d) })
      .finally(() => setLoading(false))
  }, [])

  // filter
  const filtered = payments.filter(p => {
    if (filterMember !== 'all' && p.member_name !== filterMember) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        p.member_name?.toLowerCase().includes(s) ||
        p.order_number?.toLowerCase().includes(s) ||
        p.slip_sender?.toLowerCase().includes(s) ||
        p.slip_receiver?.toLowerCase().includes(s) ||
        p.slip_trans_ref?.toLowerCase().includes(s)
      )
    }
    return true
  })

  const totalAmount = filtered.reduce((s, p) => s + (p.amount || 0), 0)

  if (loading) return <Loading />

  return (
    <>
      <SectionHeader title={`ประวัติการจ่ายเงิน (${payments.length})`} />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140, background: '#0f0f23', border: '1px solid #1a1a3e', borderRadius: 12, padding: 12 }}>
          <div style={{ color: '#666', fontSize: 11 }}>รวมยอดจ่าย</div>
          <div style={{ color: '#e2ff5d', fontWeight: 700, fontSize: 20 }}>฿{totalAmount.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: '#0f0f23', border: '1px solid #1a1a3e', borderRadius: 12, padding: 12 }}>
          <div style={{ color: '#666', fontSize: 11 }}>จำนวนรายการ</div>
          <div style={{ color: '#e2e2ff', fontWeight: 700, fontSize: 20 }}>{filtered.length}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: '#0f0f23', border: '1px solid #1a1a3e', borderRadius: 12, padding: 12 }}>
          <div style={{ color: '#666', fontSize: 11 }}>ผ่าน EasySlip</div>
          <div style={{ color: '#10b981', fontWeight: 700, fontSize: 20 }}>{filtered.filter(p => p.slip_verified).length}</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหา ชื่อ / ออเดอร์ / Ref..."
          style={{
            flex: 1, minWidth: 180, padding: '9px 14px', background: '#1a1a3e',
            border: '1px solid #2a2a5a', borderRadius: 10, color: '#e2e2ff',
            fontFamily: "'Sarabun', sans-serif", fontSize: 13,
          }}
        />
        <select
          value={filterMember}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: '9px 14px', background: '#1a1a3e', border: '1px solid #2a2a5a',
            borderRadius: 10, color: '#e2e2ff', fontFamily: "'Sarabun', sans-serif", fontSize: 13,
          }}
        >
          <option value="all">ทุกคน</option>
          {members.map(m => (
            <option key={m.id} value={m.name}>{m.avatar_emoji} {m.name}</option>
          ))}
        </select>
      </div>

      {/* Table — Desktop */}
      <div style={{ background: '#0f0f23', border: '1px solid #1a1a3e', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#080818' }}>
                <th style={thStyle}>เวลา</th>
                <th style={thStyle}>คน</th>
                <th style={thStyle}>ออเดอร์</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>ยอด</th>
                <th style={thStyle}>ผู้โอน</th>
                <th style={thStyle}>ผู้รับ</th>
                <th style={thStyle}>Ref ID</th>
                <th style={thStyle}>สลิป</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#555' }}>ไม่มีข้อมูล</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} style={{ borderTop: '1px solid #12122a' }}>
                    <td style={tdStyle}>
                      <div style={{ color: '#aaa', fontSize: 12 }}>
                        {new Date(p.confirmed_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', timeZone: 'Asia/Bangkok' })}
                      </div>
                      <div style={{ color: '#555', fontSize: 11 }}>
                        {new Date(p.confirmed_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })}
                      </div>
                      {p.slip_date && (
                        <div style={{ color: '#666', fontSize: 10, marginTop: 2 }} title="เวลาบนสลิป">
                          📄 {new Date(p.slip_date).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {p.member_emoji} <span style={{ color: '#e2e2ff' }}>{p.member_name}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: '#e2ff5d', fontWeight: 600, fontSize: 12 }}>{p.order_number}</div>
                      <div style={{ color: '#555', fontSize: 11 }}>{p.order_date}</div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ color: '#e2ff5d', fontWeight: 700 }}>฿{p.amount}</div>
                      {p.slip_amount && p.slip_amount !== p.amount && (
                        <div style={{ color: '#10b981', fontSize: 11 }}>โอน ฿{p.slip_amount}</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#aaa', fontSize: 12 }}>{p.slip_sender || '-'}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#aaa', fontSize: 12 }}>{p.slip_receiver || '-'}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#666', fontSize: 11, fontFamily: 'monospace' }}>
                        {p.slip_trans_ref || '-'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {p.slip_url ? (
                        <a href={p.slip_url} target="_blank" rel="noreferrer"
                          style={{ color: '#818cf8', fontSize: 12 }}>🖼 ดู</a>
                      ) : '-'}
                      {p.slip_verified && <span style={{ color: '#10b981', fontSize: 11, marginLeft: 4 }}>✓</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

const thStyle = {
  textAlign: 'left', padding: '12px 14px',
  color: '#666', fontSize: 11, fontWeight: 500,
  borderBottom: '1px solid #1a1a3e', whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '10px 14px', verticalAlign: 'top', whiteSpace: 'nowrap',
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState(null)
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [menu, setMenu] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('adminToken')
    if (saved) setToken(saved)
    else setLoading(false)
  }, [])

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const [o, m, mbr] = await Promise.all([
      API('/api/orders'),
      API('/api/menu'),
      API('/api/members'),
    ])
    if (!o.error) setOrders(o)
    if (!m.error) setMenu(m)
    if (!mbr.error) setMembers(mbr)
    setLoading(false)
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  if (!token) return <LoginScreen onLogin={t => { setToken(t); setLoading(true) }} />

  const navItems = [
    { key: 'orders', label: 'ออเดอร์', icon: '🧋' },
    { key: 'history', label: 'ประวัติ', icon: '📜' },
    { key: 'members', label: 'สมาชิก', icon: '👥' },
    { key: 'settings', label: 'ตั้งค่า', icon: '⚙️' },
  ]

  return (
    <>
      <Head>
        <title>DrinkPay Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>🧋</text></svg>" />
      </Head>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f0f23, #1a0a3e)', borderBottom: '1px solid #1a1a3e', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #e2ff5d, #b8ff00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧋</div>
          <div>
            <div style={{ color: '#e2ff5d', fontWeight: 700, fontSize: 16 }}>DrinkPay</div>
            <div style={{ color: '#555', fontSize: 11 }}>Admin Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ background: '#e2ff5d22', border: '1px solid #e2ff5d44', color: '#e2ff5d', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>👑 Admin</span>
          <Btn size="sm" variant="ghost" onClick={() => { localStorage.removeItem('adminToken'); setToken(null) }}>ออก</Btn>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#0a0a1e', borderBottom: '1px solid #12122a' }}>
        {navItems.map(item => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{
            flex: 1, padding: '9px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === item.key ? '#e2ff5d' : 'transparent',
            color: tab === item.key ? '#0f0f23' : '#666',
            fontFamily: "'Sarabun', sans-serif", fontWeight: tab === item.key ? 700 : 400,
            fontSize: 13, transition: 'all 0.15s',
          }}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px', maxWidth: 820, margin: '0 auto' }}>
        {loading ? <Loading /> : (
          <>
            {tab === 'orders' && (
              <div className="animate-fadeup">
                <SectionHeader
                  title={`ออเดอร์ทั้งหมด (${orders.length})`}
                  action={
                    <Btn onClick={() => setShowNewOrder(true)}>
                      + สร้างออเดอร์
                    </Btn>
                  }
                />
                {orders.length === 0 ? (
                  <Empty icon="🧋" message="ยังไม่มีออเดอร์ กดสร้างออเดอร์แรกได้เลย!" />
                ) : (
                  orders.map(o => (
                    <OrderCard key={o.id} order={o} showToast={showToast}
                      onDeleted={id => setOrders(prev => prev.filter(o => o.id !== id))} />
                  ))
                )}
              </div>
            )}

            {tab === 'history' && (
              <div className="animate-fadeup">
                <HistoryTab members={members} showToast={showToast} />
              </div>
            )}

            {tab === 'members' && (
              <div className="animate-fadeup">
                <SectionHeader title={`สมาชิก ${members.length} คน`} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {members.map(m => {
                    const totalPaid = orders.reduce((s, o) => {
                      const sum = o.memberSummaries?.find(ms => ms.member_id === m.id)
                      return s + (sum?.is_paid ? sum.total_due : 0)
                    }, 0)
                    const pendingCount = orders.filter(o =>
                      o.memberSummaries?.some(ms => ms.member_id === m.id && !ms.is_paid) &&
                      o.status !== 'completed'
                    ).length

                    return (
                      <Card key={m.id} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 30, marginBottom: 6 }}>{m.avatar_emoji}</div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                        <div style={{ color: '#10b981', fontSize: 12, marginTop: 4 }}>รวม ฿{totalPaid}</div>
                        {pendingCount > 0 && (
                          <div style={{ background: '#ef444422', color: '#f87171', borderRadius: 8, padding: '3px 8px', marginTop: 6, fontSize: 11 }}>
                            ค้าง {pendingCount} ออเดอร์
                          </div>
                        )}
                        {m.line_user_id && <div style={{ color: '#06c755', fontSize: 11, marginTop: 4 }}>✓ LINE</div>}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {tab === 'settings' && (
              <div className="animate-fadeup">
                <SettingsTab
                  menu={menu} members={members}
                  onMenuChange={loadData} onMembersChange={loadData}
                  showToast={showToast}
                />
              </div>
            )}
          </>
        )}
      </div>

      {showNewOrder && (
        <NewOrderModal
          menu={menu} members={members}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => { loadData(); showToast('✅ สร้างออเดอร์แล้ว + ส่ง LINE เรียบร้อย') }}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}
