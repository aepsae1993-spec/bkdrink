// pages/pay/[orderId].js
import { useState, useEffect } from 'react'
import Head from 'next/head'

const S = {
  bg:'#080818', card:'#0f0f23', card2:'#12122a', border:'#1a1a3e',
  border2:'#2a2a5a', accent:'#e2ff5d', text:'#e2e2ff', muted:'#888',
  dim:'#555', green:'#10b981', red:'#ef4444',
}

function Toast({ msg, type='success', onClose }) {
  useEffect(() => { const t=setTimeout(onClose,3500); return ()=>clearTimeout(t) },[])
  const color = type==='error'?'#f87171':'#e2ff5d'
  return (
    <div style={{
      position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',
      zIndex:9999,background:'#0f0f23',color,padding:'12px 20px',
      borderRadius:12,fontSize:14,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
      border:`1px solid ${color}44`,whiteSpace:'nowrap',fontFamily:"'Sarabun',sans-serif",
    }}>{msg}</div>
  )
}

export default function PayPage() {
  const [data,setData]         = useState(null)
  const [error,setError]       = useState('')
  const [loading,setLoading]   = useState(true)
  const [uploading,setUploading] = useState(false)
  const [file,setFile]         = useState(null)
  const [preview,setPreview]   = useState(null)
  const [done,setDone]         = useState(false)
  const [verifiedSlip,setVerifiedSlip] = useState(null)
  const [toast,setToast]       = useState(null)
  const [token,setToken]       = useState(null)
  const [orderId,setOrderId]   = useState(null)

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const t   = params.get('token')
    const oid = window.location.pathname.split('/pay/')[1]?.split('?')[0]
    setToken(t); setOrderId(oid)
    if(!oid){setError('ลิงก์ไม่ถูกต้อง');setLoading(false);return}
    fetch(`/api/orders/${oid}?memberToken=${t||''}`)
      .then(r=>r.json())
      .then(d=>{if(d.error)setError(d.error);else setData(d)})
      .catch(()=>setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(()=>setLoading(false))
  },[])

  const handleFile=(e)=>{
    const f=e.target.files[0]; if(!f)return
    if(f.size>5*1024*1024){setToast({msg:'ไฟล์ใหญ่เกิน 5MB',type:'error'});return}
    setFile(f)
    const r=new FileReader(); r.onload=ev=>setPreview(ev.target.result); r.readAsDataURL(f)
  }

  const handleUpload=async()=>{
    if(!file)return; setUploading(true)
    const reader=new FileReader(); reader.readAsDataURL(file)
    reader.onload=async(ev)=>{
      const base64=ev.target.result.split(',')[1]
      const res=await fetch(`/api/orders/${orderId}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({member_token:token,image_base64:base64,image_filename:file.name}),
      }).then(r=>r.json())
      setUploading(false)
      if(res.error){
        setToast({msg:'❌ '+res.error,type:'error'})
      } else {
        setDone(true)
        if(res.slipInfo)setVerifiedSlip(res.slipInfo)
        setToast({msg:res.allPaid?'🎉 ทุกคนจ่ายครบแล้ว!':'✅ ตรวจสอบสลิปและบันทึกเรียบร้อย!'})
      }
    }
  }

  const member       = data?.currentMember
  const order        = data?.order
  const memberItems  = data?.memberItems||[]
  const allSummaries = data?.memberSummaries||[]
  const alreadyPaid  = member?.is_paid
  const paidCount    = allSummaries.filter(s=>s.is_paid).length
  const meUrl        = token ? `/me?token=${token}` : null

  return (
    <>
      <Head>
        <title>DrinkPay — จ่ายค่าน้ำ</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${S.bg};color:${S.text};font-family:'Sarabun',sans-serif;min-height:100vh}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{width:18px;height:18px;border:2px solid #2a2a5a;border-top-color:#e2ff5d;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
      `}</style>

      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#0f0f23,#1a0a3e)',borderBottom:`1px solid ${S.border}`,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:22}}>🧋</span>
            <span style={{color:S.accent,fontWeight:700,fontSize:16}}>DrinkPay</span>
          </div>
          {meUrl&&(
            <a href={meUrl} style={{background:'#1a1a3e',border:`1px solid ${S.border2}`,color:S.accent,padding:'7px 14px',borderRadius:10,fontSize:13,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:5}}>
              📊 ยอดค้างของฉัน
            </a>
          )}
        </div>

        <div style={{flex:1,padding:16,maxWidth:480,margin:'0 auto',width:'100%'}}>

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

              {/* ── ยอดออเดอร์นี้ ── */}
              {member?(
                <div style={{
                  background:alreadyPaid||done?'linear-gradient(135deg,#0a1a0a,#0a2a0a)':'linear-gradient(135deg,#1a1a3e,#12122a)',
                  border:`1px solid ${alreadyPaid||done?'#10b98140':S.border2}`,
                  borderRadius:18,padding:22,marginBottom:16,textAlign:'center',
                }}>
                  <div style={{fontSize:36,marginBottom:6}}>{member.avatar_emoji}</div>
                  <div style={{color:S.text,fontWeight:700,fontSize:18,marginBottom:2}}>{member.member_name}</div>
                  {/* รายการเมนูที่สั่ง */}
                  <div style={{marginBottom:14}}>
                    {memberItems.length>0?(
                      <div style={{background:'#12122a',borderRadius:10,padding:'10px 14px',marginBottom:8}}>
                        {memberItems.map((item,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:i<memberItems.length-1?'1px solid #1a1a3e':'none'}}>
                            <span style={{color:S.text,fontSize:13}}>{item.emoji} {item.name}{item.quantity>1?' x'+item.quantity:''}</span>
                            <span style={{color:S.accent,fontSize:13,fontWeight:600}}>฿{item.subtotal}</span>
                          </div>
                        ))}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:6,marginTop:4,borderTop:'1px solid #2a2a5a'}}>
                          <span style={{color:S.muted,fontSize:12}}>🚚 ค่าส่ง (หาร)</span>
                          <span style={{color:S.muted,fontSize:12}}>฿{member.delivery_share}</span>
                        </div>
                      </div>
                    ):(
                      <div style={{color:S.dim,fontSize:12}}>น้ำ ฿{member.items_total} + ค่าส่ง ฿{member.delivery_share}</div>
                    )}
                  </div>
                  {alreadyPaid||done?(
                    <>
                      <div style={{fontSize:40,marginBottom:6}}>✅</div>
                      <div style={{color:S.green,fontSize:18,fontWeight:700}}>จ่ายแล้ว!</div>
                      <div style={{color:S.dim,fontSize:13,marginTop:4}}>ออเดอร์ {order?.order_number}</div>
                    </>
                  ):(
                    <>
                      <div style={{color:S.accent,fontSize:40,fontWeight:700}}>฿{member.total_due}</div>
                      <div style={{color:S.muted,fontSize:13,marginTop:4}}>
                        {order?.order_number} · กำหนด {order?.deadline}
                        {order?.status==='overdue'&&<span style={{color:'#f87171'}}> ⚠️ เกินกำหนด</span>}
                      </div>
                    </>
                  )}
                </div>
              ):(
                <div style={{background:'#1a0a0a',border:'1px solid #ef444430',borderRadius:14,padding:16,marginBottom:16,textAlign:'center'}}>
                  <p style={{color:'#f87171',fontSize:14}}>⚠️ ไม่พบข้อมูลของคุณ กรุณาใช้ลิงก์ที่ได้รับจาก LINE</p>
                </div>
              )}

              {/* ── อัปโหลดสลิป ── */}
              {/* ── ข้อมูลสลิปที่ตรวจสอบเจอ ── */}
              {verifiedSlip&&!verifiedSlip.fallback&&(
                <div style={{
                  background:'linear-gradient(135deg,#0a1a14,#0a2418)',
                  border:'1px solid #10b98140',
                  borderRadius:14,padding:16,marginBottom:16,
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                    <span style={{fontSize:16}}>🔍</span>
                    <span style={{color:S.green,fontWeight:600,fontSize:13}}>ตรวจสอบสลิปกับธนาคารเรียบร้อย</span>
                  </div>
                  {verifiedSlip.amount&&(
                    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}>
                      <span style={{color:S.muted}}>ยอดในสลิป</span>
                      <span style={{color:S.accent,fontWeight:700}}>฿{verifiedSlip.amount}</span>
                    </div>
                  )}
                  {verifiedSlip.sender&&(
                    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}>
                      <span style={{color:S.muted}}>ผู้โอน</span>
                      <span style={{color:S.text}}>{verifiedSlip.sender}</span>
                    </div>
                  )}
                  {verifiedSlip.receiver&&(
                    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}>
                      <span style={{color:S.muted}}>ผู้รับ</span>
                      <span style={{color:S.text}}>{verifiedSlip.receiver}</span>
                    </div>
                  )}
                  {verifiedSlip.transRef&&(
                    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:11}}>
                      <span style={{color:S.dim}}>Ref</span>
                      <span style={{color:S.dim,fontFamily:'monospace'}}>{verifiedSlip.transRef}</span>
                    </div>
                  )}
                </div>
              )}

              {member&&!alreadyPaid&&!done&&(
                <div style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:18,marginBottom:16}}>
                  <p style={{color:S.muted,fontSize:13,marginBottom:12}}>📎 อัปโหลดสลิปเพื่อยืนยันการจ่าย</p>
                  <label style={{
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    border:`2px dashed ${preview?S.green:S.border2}`,borderRadius:14,padding:24,
                    cursor:'pointer',marginBottom:12,background:preview?'#10b98108':S.card2,
                    minHeight:150,transition:'all .2s',
                  }}>
                    {preview
                      ?<img src={preview} alt="slip" style={{maxWidth:'100%',maxHeight:200,borderRadius:10,objectFit:'contain'}}/>
                      :<>
                        <span style={{fontSize:32,marginBottom:8}}>🖼️</span>
                        <span style={{color:S.muted,fontSize:14}}>แตะเพื่อเลือกรูปสลิป</span>
                        <span style={{color:S.dim,fontSize:12,marginTop:4}}>PNG / JPG (max 5MB)</span>
                      </>
                    }
                    <input type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
                  </label>
                  <button onClick={handleUpload} disabled={!file||uploading} style={{
                    width:'100%',padding:14,
                    background:file&&!uploading?S.green:S.card2,
                    border:'none',color:file?'white':S.dim,borderRadius:12,
                    cursor:file?'pointer':'not-allowed',
                    fontFamily:"'Sarabun',sans-serif",fontWeight:700,fontSize:16,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  }}>
                    {uploading?<><span className="spinner"/>กำลังอัปโหลด...</>:file?'✅ ยืนยันการจ่าย':'เลือกสลิปก่อน'}
                  </button>
                </div>
              )}

              {/* ── ปุ่มดูยอดค้างทั้งหมด ── */}
              {meUrl&&(
                <a href={meUrl} style={{
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  padding:'13px',background:'#1a1a3e',border:`1px solid ${S.border2}`,
                  borderRadius:14,color:S.accent,fontWeight:600,fontSize:15,
                  textDecoration:'none',marginBottom:16,
                }}>
                  📊 ดูยอดค้างรวมทุกออเดอร์ของฉัน
                </a>
              )}

              {/* ── สถานะทุกคนในออเดอร์นี้ ── */}
              <div style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:14,padding:16}}>
                <p style={{color:S.muted,fontSize:13,marginBottom:10}}>สถานะออเดอร์นี้ · {paidCount}/{allSummaries.length} จ่ายแล้ว</p>
                {allSummaries.map((s,i)=>(
                  <div key={s.member_id} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'9px 0',borderBottom:i<allSummaries.length-1?`1px solid ${S.border}`:'none',
                  }}>
                    <span style={{fontSize:14,color:s.is_paid?S.muted:S.text}}>{s.avatar_emoji} {s.member_name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{color:s.is_paid?S.dim:S.accent,fontSize:13}}>฿{s.total_due}</span>
                      {s.is_paid
                        ?<span style={{color:S.green,fontSize:13,fontWeight:600}}>✓</span>
                        :<span style={{color:S.red,fontSize:10}}>●</span>
                      }
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>

      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </>
  )
}
