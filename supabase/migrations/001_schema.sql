-- ============================================
-- DrinkPay — Supabase Database Schema
-- วิธีใช้: ไปที่ Supabase Dashboard → SQL Editor → paste แล้วกด Run
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MEMBERS
-- ============================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  line_user_id TEXT UNIQUE,          -- LINE User ID สำหรับ push message
  access_token TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT, -- unique link token
  avatar_emoji TEXT DEFAULT '🧑',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MENU
-- ============================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  emoji TEXT DEFAULT '🧋',
  available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,  -- เช่น ORD-20260420-001
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline DATE NOT NULL,
  delivery_fee INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'overdue', 'completed')),
  note TEXT,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS (รายการน้ำในออเดอร์)
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,         -- snapshot ราคา ณ เวลาสั่ง
  UNIQUE(order_id, member_id, menu_item_id)
);

-- ============================================
-- PAYMENTS (การจ่ายเงิน)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  slip_url TEXT,                        -- URL ใน Supabase Storage
  slip_filename TEXT,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_by UUID REFERENCES members(id), -- admin ที่ confirm (ถ้ามี)
  UNIQUE(order_id, member_id)
);

-- ============================================
-- NOTIFICATION LOG
-- ============================================
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  type TEXT NOT NULL CHECK (type IN ('new_order', 'reminder', 'overdue')),
  sent_to TEXT,                         -- 'group' or LINE user ID
  message_preview TEXT,
  success BOOLEAN DEFAULT TRUE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VIEWS — ข้อมูลสรุปสำหรับ query ง่ายๆ
-- ============================================

-- สรุปยอดต่อคนต่อออเดอร์
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
  -- ค่าส่งหารจำนวนคนในออเดอร์
  CEIL(
    o.delivery_fee::FLOAT / 
    NULLIF((SELECT COUNT(DISTINCT member_id) FROM order_items WHERE order_id = o.id), 0)
  )::INTEGER AS delivery_share,
  COALESCE(SUM(oi.quantity * oi.unit_price), 0) + 
  CEIL(
    o.delivery_fee::FLOAT / 
    NULLIF((SELECT COUNT(DISTINCT member_id) FROM order_items WHERE order_id = o.id), 0)
  )::INTEGER AS total_due,
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

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
  seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num
  FROM orders
  WHERE TO_CHAR(order_date, 'YYYYMMDD') = today_str;
  
  NEW.order_number := 'ORD-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- Auto-update overdue orders (รัน cron หรือ call จาก API)
CREATE OR REPLACE FUNCTION mark_overdue_orders()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE orders
  SET status = 'overdue'
  WHERE status = 'active'
    AND deadline < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- anon key: อ่านได้อย่างเดียว (frontend)
CREATE POLICY "Public read menu" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public read order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Public read members" ON members FOR SELECT USING (true);
CREATE POLICY "Public read payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Public read summary" ON order_member_summary FOR SELECT USING (true);

-- service_role key (backend API): full access — ใช้ใน API routes
-- (service role bypass RLS โดยอัตโนมัติ)

-- ============================================
-- SEED DATA — ข้อมูลเริ่มต้น
-- ============================================
INSERT INTO menu_items (name, price, emoji, sort_order) VALUES
  ('กาแฟ', 45, '☕', 1),
  ('ชานม', 50, '🧋', 2),
  ('โกโก้', 45, '🍫', 3),
  ('ชาเขียว', 50, '🍵', 4),
  ('น้ำส้ม', 40, '🍊', 5),
  ('ชามะนาว', 40, '🍋', 6);

-- หมายเหตุ: ใส่สมาชิกจริงใน Admin panel หลัง deploy
