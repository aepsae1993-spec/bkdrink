// pages/me.js — หน้าดูยอดค้างของตัวเองทุกออเดอร์
import { useState, useEffect } from 'react'
import Head from 'next/head'

const S = {
  bg:'#080818',card:'#0f0f23',card2:'#12122a',border:'#1a1a3e',
  border2:'#2a2a5a',accent:'#e2ff5d',text:'#e2e2ff',muted:'#888',
  dim:'#555',green:'#10b981',red:'#ef4444',
}

export default function MePage() {
  const [data,setData]       = useState(null)
  const [error,setError]     = useState('')
  const [loading,setLoading] = useState(true)
  const [token,setToken]     = useState(null)

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    setToken(t)
    if(!t){setError('ไม่พบ token กรุณาใช้ลิงก์ที่ได้รับจาก LINE');setLoading(false);return}
    fetch(`/api/me?token=${t}`)
      .then(r=>r.json())
      .then(d=>{if(d.error)setError(d.error);else setData(d)})
      .catch(()=>setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(()=>setLoading(false))
  },[])

  const pending   = data?.pendingOrders  ||[]
  const completed = data?.completedOrders||[]
  const totalDebt = pending.reduce((s,o)=>s+o.total_due,0)

  return (
    <>
      <Head>
        <title>DrinkPay — ยอดค้างของฉัน</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${S.bg};color:${S.text};font-family:'Sarabun',sans-serif;min-height:100vh}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{width:20px;height:20px;border:2px solid #2a2a5a;border-top-color:#e2ff5d;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
        .pay-btn:hover{opacity:.85}
      `}</style>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0f0f23,#1a0a3e)',borderBottom:`1px solid ${S.border}`,padding:'12px 16px',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:22}}>🧋</span>
        <div>
          <div style={{color:S.accent,fontWeight:700,fontSize:16}}>DrinkPay</div>
          <div style={{color:S.dim,fontSize:11}}>ยอดค้างของฉัน</div>
        </div>
      </div>

      <div style={{padding:16,maxWidth:480,margin:'0 auto',width:'100%'}}>

        {loading&&(
          <div style={{textAlign:'center',padding:48}}>
            <span className="spinner"/>
            <p style={{color:S.dim,marginTop:12,fontSize:14}}>กำลังโหลด...</p>
          </div>
        )}

        {error&&(
          <div style={{textAlign:'center',padding:48}}>
            <div style={{fontSize:40,marginBottom:12}}>😕</div>
            <p style={{color:'#f87171',fontSize:15}}>{error}</p>
          </div>
        )}

        {data&&!loading&&(
          <div style={{animation:'fadeUp .3s ease'}}>

            {/* Profile + Summary */}
            <div style={{
              background:totalDebt>0?'linear-gradient(135deg,#1a0a0a,#220a0a)':'linear-gradient(135deg,#0a1a0a,#0a220a)',
              border:`1px solid ${totalDebt>0?'#ef444435':'#10b98135'}`,
              borderRadius:18,padding:22,marginBottom:20,textAlign:'center',
            }}>
              <div style={{fontSize:44,marginBottom:6}}>{data.member.avatar_emoji}</div>
              <div style={{color:S.text,fontWeight:700,fontSize:20,marginBottom:12}}>{data.member.name}</div>

              {totalDebt>0?(
                <>
                  <div style={{color:'#f87171',fontSize:13,marginBottom:4}}>ยอดค้างทั้งหมด</div>
                  <div style={{color:'#f87171',fontSize:42,fontWeight:700,lineHeight:1}}>฿{totalDebt.toLocaleString()}</div>
                  <div style={{color:S.dim,fontSize:13,marginTop:6}}>{pending.length} ออเดอร์ที่ยังไม่จ่าย</div>
                </>
              ):(
                <>
                  <div style={{fontSize:36,marginBottom:8}}>✅</div>
                  <div style={{color:S.green,fontSize:18,fontWeight:700}}>ไม่มียอดค้าง</div>
                  <div style={{color:S.dim,fontSize:13,marginTop:4}}>จ่ายครบทุกออเดอร์แล้ว</div>
                </>
              )}
            </div>

            {/* ── ออเดอร์ที่ยังไม่จ่าย ── */}
            {pending.length>0&&(
              <div style={{marginBottom:24}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:S.red,display:'inline-block'}}/>
                  <span style={{color:'#f87171',fontSize:13,fontWeight:600}}>ยังไม่จ่าย ({pending.length} ออเดอร์)</span>
                </div>

                {pending.map(o=>(
                  <div key={o.order_id} style={{
                    background:S.card,border:`1px solid #ef444430`,
                    borderRadius:14,padding:16,marginBottom:10,
                  }}>
                    {/* Order header */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div>
                        <div style={{color:S.accent,fontWeight:700,fontSize:14}}>{o.order_number}</div>
                        <div style={{color:S.dim,fontSize:11,marginTop:2}}>📅 {o.order_date}</div>
                        <div style={{
                          color:o.status==='overdue'?'#f87171':S.muted,
                          fontSize:11,marginTop:2,
                        }}>
                          ⏰ กำหนด {o.deadline}{o.status==='overdue'?' ⚠️ เกินกำหนด':''}
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{color:'#f87171',fontWeight:700,fontSize:24}}>฿{o.total_due}</div>
                        <div style={{color:S.dim,fontSize:11,marginTop:2}}>น้ำ ฿{o.items_total} + ส่ง ฿{o.delivery_share}</div>
                      </div>
                    </div>

                    {/* ปุ่มไปอัปสลิปออเดอร์นี้ */}
                    <a
                      href={`/pay/${o.order_id}?token=${token}`}
                      className="pay-btn"
                      style={{
                        display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                        padding:'11px',background:S.green,color:'white',
                        borderRadius:10,fontWeight:600,fontSize:15,
                        textDecoration:'none',transition:'opacity .15s',
                      }}
                    >
                      📎 อัปโหลดสลิปออเดอร์นี้
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* ── ประวัติที่จ่ายแล้ว ── */}
            {completed.length>0&&(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:S.green,display:'inline-block'}}/>
                  <span style={{color:S.green,fontSize:13,fontWeight:600}}>จ่ายแล้ว ({completed.length} ออเดอร์)</span>
                </div>

                {completed.map(o=>(
                  <div key={o.order_id} style={{
                    background:S.card,border:`1px solid #10b98120`,
                    borderRadius:12,padding:14,marginBottom:8,
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                  }}>
                    <div>
                      <div style={{color:S.muted,fontWeight:600,fontSize:13}}>{o.order_number}</div>
                      <div style={{color:S.dim,fontSize:11,marginTop:3}}>📅 {o.order_date}</div>
                      {o.paid_at&&(
                        <div style={{color:S.dim,fontSize:11,marginTop:1}}>
                          ✓ จ่ายเมื่อ {new Date(o.paid_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Bangkok'})}
                        </div>
                      )}
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{color:S.dim,fontSize:15,fontWeight:600}}>฿{o.total_due}</div>
                      <div style={{color:S.green,fontSize:18}}>✓</div>
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
