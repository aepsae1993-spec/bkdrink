-- ============================================
-- 004 — GRANT Data API access (ป้องกัน policy เปลี่ยน 30 ต.ค. 2026)
-- วิธีใช้: ไปที่ Supabase Dashboard → SQL Editor → paste แล้วกด Run
-- ============================================
-- หมายเหตุ:
-- - แอปนี้ใช้ service_role ผ่าน API routes เป็นหลัก ไม่ได้เรียก anon โดยตรง
-- - service_role บายพาส RLS อยู่แล้ว แต่ต้องมี GRANT ระดับ table ด้วย
--   เพื่อรองรับ Supabase policy ใหม่
-- - anon มีให้แค่ SELECT บางตารางที่ไม่ sensitive (เผื่อใช้งานในอนาคต)
-- ============================================

-- ── ตารางทั้งหมด: ให้ service_role ทำได้ทุกอย่าง ─────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON members             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_items          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items         TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments            TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_logs   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_recipients  TO service_role;

-- View ก็ต้อง GRANT ด้วย
GRANT SELECT ON order_member_summary TO service_role;

-- ── anon: อ่านได้เฉพาะตารางที่ไม่กระทบความเป็นส่วนตัว (ตอนนี้ไม่ได้ใช้) ──
GRANT SELECT ON menu_items          TO anon;
GRANT SELECT ON payment_recipients  TO anon;

-- ── authenticated: เผื่อในอนาคตเปิดให้ user login ผ่าน Supabase Auth ────
GRANT SELECT ON menu_items          TO authenticated;
GRANT SELECT ON payment_recipients  TO authenticated;

-- ── Default privileges: ตารางที่สร้างใหม่ใน public schema ภายหลัง ───────
-- ให้ service_role ได้สิทธิ์ทุกอย่างอัตโนมัติ
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
