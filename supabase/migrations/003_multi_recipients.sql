-- ============================================
-- 003 — Multi recipients + per-order recipient selection
-- วิธีใช้: ไปที่ Supabase Dashboard → SQL Editor → paste แล้วกด Run
-- ============================================

-- ── ตารางบัญชีรับเงินหลายราย ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,                -- ชื่อย่อสำหรับเลือก เช่น "เอ" / "บัญชีออฟฟิศ"
  recipient_name TEXT NOT NULL,              -- ชื่อจริงบนบัญชี (ใช้ตรวจสลิป)
  account_number TEXT,
  bank TEXT,
  promptpay_id TEXT,
  note TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ย้ายข้อมูลจาก payment_settings (singleton) มาเป็น row แรก ──────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_settings') THEN
    INSERT INTO payment_recipients (display_name, recipient_name, account_number, bank, promptpay_id, note, is_default, sort_order)
    SELECT
      COALESCE(NULLIF(recipient_name, ''), 'บัญชีหลัก'),
      COALESCE(NULLIF(recipient_name, ''), 'บัญชีหลัก'),
      recipient_account_number,
      recipient_bank,
      promptpay_id,
      note,
      TRUE,
      0
    FROM payment_settings
    WHERE id = 1
      AND (recipient_name IS NOT NULL
        OR recipient_account_number IS NOT NULL
        OR promptpay_id IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM payment_recipients);

    DROP TABLE payment_settings;
  END IF;
END $$;

-- ── Order อ้างอิงผู้รับเงิน (nullable; ของเดิมยังไม่มี) ────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES payment_recipients(id) ON DELETE SET NULL;

-- ── อัปเดต view ให้พ่วง recipient ─────────────────────────────────────────
CREATE OR REPLACE VIEW order_member_summary AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.order_date,
  o.deadline,
  o.delivery_fee,
  o.status,
  o.recipient_id,
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
GROUP BY o.id, o.order_number, o.order_date, o.deadline, o.delivery_fee, o.status, o.recipient_id,
         m.id, m.name, m.line_user_id, m.access_token, m.avatar_emoji,
         p.id, p.slip_url, p.confirmed_at;

-- ── RLS: ใครก็อ่านได้ (หน้า /pay ต้องใช้แสดงข้อมูล) ───────────────────────
ALTER TABLE payment_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read payment_recipients" ON payment_recipients;
CREATE POLICY "Public read payment_recipients"
  ON payment_recipients FOR SELECT USING (true);

-- ── Trigger: บังคับให้ default มีได้แค่หนึ่งบัญชี ──────────────────────────
CREATE OR REPLACE FUNCTION enforce_single_default_recipient()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE payment_recipients
       SET is_default = FALSE
     WHERE id <> NEW.id
       AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_recipients_single_default ON payment_recipients;
CREATE TRIGGER payment_recipients_single_default
  AFTER INSERT OR UPDATE OF is_default ON payment_recipients
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION enforce_single_default_recipient();
