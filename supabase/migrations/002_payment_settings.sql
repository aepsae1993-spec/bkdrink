-- ============================================
-- 002 — Payment recipient settings + delivery_fee 0 support
-- วิธีใช้: ไปที่ Supabase Dashboard → SQL Editor → paste แล้วกด Run
-- ============================================

-- ── ตารางตั้งค่าผู้รับเงิน (มีแถวเดียว) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  recipient_name TEXT,
  recipient_account_number TEXT,
  recipient_bank TEXT,
  promptpay_id TEXT,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payment_settings_singleton CHECK (id = 1)
);

INSERT INTO payment_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read payment_settings" ON payment_settings;
CREATE POLICY "Public read payment_settings"
  ON payment_settings FOR SELECT USING (true);

-- ── อนุญาตค่าส่ง 0 บาท (ของเดิม default 30 ยังคงอยู่) ──────────────────────
ALTER TABLE orders
  ALTER COLUMN delivery_fee DROP DEFAULT;
ALTER TABLE orders
  ALTER COLUMN delivery_fee SET DEFAULT 0;

-- ป้องกันค่าลบ
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_delivery_fee_nonneg;
ALTER TABLE orders
  ADD CONSTRAINT orders_delivery_fee_nonneg CHECK (delivery_fee >= 0);

-- ── อัปเดต view ให้รองรับค่าส่ง 0 (CEIL(0/n)=0 อยู่แล้ว แต่กัน NULL กรณีไม่มีคน) ──
CREATE OR REPLACE VIEW order_member_summary AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.order_date,
  o.deadline,
  o.delivery_fee,
  o.status,
  m.id AS member_id,
  m.name AS member_name,
  m.line_user_id,
  m.access_token,
  m.avatar_emoji,
  COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS items_total,
  COUNT(DISTINCT oi.id) AS item_count,
  COALESCE(
    CEIL(
      o.delivery_fee::FLOAT /
      NULLIF((SELECT COUNT(DISTINCT member_id) FROM order_items WHERE order_id = o.id), 0)
    )::INTEGER,
    0
  ) AS delivery_share,
  COALESCE(SUM(oi.quantity * oi.unit_price), 0) +
  COALESCE(
    CEIL(
      o.delivery_fee::FLOAT /
      NULLIF((SELECT COUNT(DISTINCT member_id) FROM order_items WHERE order_id = o.id), 0)
    )::INTEGER,
    0
  ) AS total_due,
  p.id IS NOT NULL AS is_paid,
  p.slip_url,
  p.confirmed_at AS paid_at
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN members m ON m.id = oi.member_id
LEFT JOIN payments p ON p.order_id = o.id AND p.member_id = m.id
GROUP BY o.id, o.order_number, o.order_date, o.deadline, o.delivery_fee, o.status,
         m.id, m.name, m.line_user_id, m.access_token, m.avatar_emoji,
         p.id, p.slip_url, p.confirmed_at;
