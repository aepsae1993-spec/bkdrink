// lib/auth.js

// ─── ตรวจว่าเป็น Admin ──────────────────────────────────────────────────────
export function isAdminRequest(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '').trim()
  return token === process.env.ADMIN_PASSWORD
}

// ─── ตอบ 401 ──────────────────────────────────────────────────────────────
export function unauthorized(res, message = 'Unauthorized') {
  return res.status(401).json({ error: message })
}

// ─── ตอบ 403 ──────────────────────────────────────────────────────────────
export function forbidden(res, message = 'Forbidden') {
  return res.status(403).json({ error: message })
}

// ─── Verify cron secret (สำหรับ Vercel Cron) ────────────────────────────────
export function isCronRequest(req) {
  const secret = req.headers['x-cron-secret'] || req.query.secret
  return secret === process.env.ADMIN_PASSWORD
}
