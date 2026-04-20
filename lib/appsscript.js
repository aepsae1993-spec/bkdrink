// lib/appsscript.js — อัปโหลดสลิปผ่าน Google Apps Script → Google Drive

export async function uploadViaAppsScript({ buffer, filename, mimeType = 'image/jpeg' }) {
  const scriptUrl = process.env.APPS_SCRIPT_URL
  const secret    = process.env.APPS_SCRIPT_SECRET

  if (!scriptUrl) throw new Error('ไม่พบ APPS_SCRIPT_URL')
  if (!secret)    throw new Error('ไม่พบ APPS_SCRIPT_SECRET')

  const base64 = buffer.toString('base64')

  const res = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, base64, mimeType, secret }),
  })

  // Apps Script redirect — follow แล้วอ่าน JSON
  const data = await res.json().catch(async () => {
    const text = await res.text()
    throw new Error('Apps Script ตอบกลับไม่ใช่ JSON: ' + text.slice(0, 200))
  })

  if (!data.success) {
    throw new Error('Apps Script error: ' + (data.error || JSON.stringify(data)))
  }

  return {
    fileId:   data.fileId,
    fileName: filename,
    viewUrl:  data.viewUrl,
  }
}
