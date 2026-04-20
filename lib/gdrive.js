// lib/gdrive.js — อัปโหลดไฟล์ขึ้น Google Drive ด้วย Service Account

// ─── สร้าง JWT token สำหรับ Service Account ──────────────────────────────────
async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  // Vercel เก็บ private_key เป็น string — แปลง \n กลับเป็น newline จริง
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !privateKey) {
    throw new Error('ไม่พบ GOOGLE_SERVICE_ACCOUNT_EMAIL หรือ GOOGLE_PRIVATE_KEY')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Sign ด้วย RS256 — ใช้ Web Crypto API (Node 18+ / Edge runtime)
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryKey = Buffer.from(keyData, 'base64')

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput)
  )

  const jwt = `${signingInput}.${Buffer.from(signature).toString('base64url')}`

  // แลก JWT เป็น Access Token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    throw new Error('ขอ Access Token ไม่สำเร็จ: ' + JSON.stringify(tokenData))
  }

  return tokenData.access_token
}

// ─── อัปโหลดไฟล์ขึ้น Google Drive ────────────────────────────────────────────
export async function uploadToDrive({ buffer, filename, mimeType = 'image/jpeg' }) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) throw new Error('ไม่พบ GOOGLE_DRIVE_FOLDER_ID')

  const accessToken = await getAccessToken()

  // สร้าง multipart body
  const metadata = JSON.stringify({
    name: filename,
    parents: [folderId],
  })

  const boundary = '-------drinkpay_boundary'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metaPart =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    metadata

  const filePart =
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`

  // ประกอบ multipart
  const metaBuffer = Buffer.from(metaPart)
  const filePartHeader = Buffer.from(filePart)
  const closeBuffer = Buffer.from(closeDelimiter)
  const body = Buffer.concat([metaBuffer, filePartHeader, buffer, closeBuffer])

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      body,
    }
  )

  const uploadData = await uploadRes.json()

  if (!uploadRes.ok) {
    throw new Error('อัปโหลดไม่สำเร็จ: ' + JSON.stringify(uploadData))
  }

  // ทำไฟล์เป็น Public อ่านได้ (เพื่อดูสลิปใน Admin)
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  })

  return {
    fileId: uploadData.id,
    fileName: uploadData.name,
    // ลิงก์ดูภาพตรงๆ (ใช้แสดงสลิปใน Admin)
    viewUrl: `https://drive.google.com/file/d/${uploadData.id}/view`,
    // ลิงก์ embed รูปภาพ (ใช้แสดง preview)
    thumbUrl: `https://drive.google.com/thumbnail?id=${uploadData.id}&sz=w400`,
  }
}
