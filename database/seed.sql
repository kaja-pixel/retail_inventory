-- ==============================================================================
-- SkillForge Retail Inventory & Stock Management System
-- Seed Data
-- ==============================================================================

-- 1. SEED ROLES
INSERT INTO roles (id, name, description) VALUES
(1, 'SUPER_ADMIN', 'Super Administrator with full system control, user management, and audit access'),
(2, 'ADMIN', 'Inventory Manager with full product and stock control permissions'),
(3, 'STAFF', 'Staff member with read-only product access and assigned operational duties')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- 2. SEED USERS
-- Default passwords:
-- superadmin@skillforge.com : SuperAdmin123!
-- admin@skillforge.com      : Admin123!
-- staff@skillforge.com      : Staff123!
INSERT INTO users (id, full_name, email, password_hash, role_id, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Eleanor Vance', 'superadmin@skillforge.com', '$2b$10$BlPCtfcDo0YCs5tj/5WcAOWrJI0nsIKqMtOZHAC5cGv22tOEXiy6C', 1, 'ACTIVE'),
('22222222-2222-2222-2222-222222222222', 'Marcus Sterling', 'admin@skillforge.com', '$2b$10$kg8MdyzHKktqiyUpoPhfd.DrK6vg8.NuULSmOGEoGyW2hvgoGCCRu', 2, 'ACTIVE'),
('33333333-3333-3333-3333-333333333333', 'Sophia Lin', 'staff@skillforge.com', '$2b$10$VoJT7nCmlYM.J73YevDP0eBV3SOjTEr9tCiz3m8QPeFvdmFuoyHSu', 3, 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- 3. SEED CATEGORIES
INSERT INTO categories (id, name, description) VALUES
(1, 'Electronics', 'Consumer electronics, accessories, and computing equipment'),
(2, 'Groceries', 'Packaged food items, beverages, and pantry staples'),
(3, 'Apparel', 'Clothing, footwear, and accessories'),
(4, 'Office Supplies', 'Stationery, paper products, and desk accessories'),
(5, 'Home & Kitchen', 'Kitchen appliances, cookware, and home essentials')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- 4. SEED PRODUCTS
-- Variety of products: in-stock, low-stock, out-of-stock
INSERT INTO products (id, name, sku, category_id, description, unit_price, stock_quantity, low_stock_threshold, created_by, updated_by) VALUES
('a0000000-0000-0000-0000-000000000001', 'Wireless Noise-Canceling Headphones', 'ELEC-WNC-001', 1, 'Premium over-ear wireless headphones with active noise cancellation.', 149.99, 45, 10, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000002', 'USB-C Fast Charging Cable 2M', 'ELEC-USB-002', 1, 'Braided nylon USB-C fast charging cable with 100W PD delivery.', 14.50, 8, 15, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000003', 'Ergonomic Vertical Mouse', 'ELEC-MOU-003', 1, 'Wireless ergonomic mouse reducing wrist strain, 4000 DPI sensor.', 39.99, 0, 5, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000004', 'Organic Colombian Whole Bean Coffee 1kg', 'GROC-COF-001', 2, 'Medium roast single-origin 100% Arabica coffee beans.', 24.99, 60, 20, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000005', 'Extra Virgin Olive Oil 750ml', 'GROC-OIL-002', 2, 'Cold-pressed extra virgin olive oil from Mediterranean olives.', 18.75, 5, 12, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000006', 'Organic Green Tea (50 Bags)', 'GROC-TEA-003', 2, 'Steamed organic green tea rich in antioxidants.', 9.50, 110, 25, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000007', 'Classic Crewneck Cotton T-Shirt L', 'APP-TSH-001', 3, 'Heavyweight 100% combed cotton unisex crewneck t-shirt.', 22.00, 75, 20, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000008', 'Merino Wool Athletic Socks (3-Pack)', 'APP-SOX-002', 3, 'Moisture-wicking, breathable merino wool cushion athletic socks.', 19.99, 4, 15, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000009', 'Heavy Duty Gel Pens 0.7mm (Pack of 12)', 'OFF-PEN-001', 4, 'Smooth flowing archival gel ink pens in rich black.', 12.99, 85, 30, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000010', 'A4 Recycled Multipurpose Copy Paper 500 Sheets', 'OFF-PPR-002', 4, 'Bright white 80gsm copy paper made with 100% post-consumer recycled pulp.', 7.99, 0, 10, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000011', 'Cast Iron Skillet 10-Inch', 'KIT-SKI-001', 5, 'Pre-seasoned cast iron skillet with heavy heat retention.', 34.50, 32, 8, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000012', 'Stainless Steel Electric Kettle 1.7L', 'KIT-KET-002', 5, 'Rapid boil cordless electric kettle with auto shut-off protection.', 42.00, 18, 5, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (sku) DO NOTHING;

-- 5. SEED INITIAL TRANSACTIONS
INSERT INTO inventory_transactions (product_id, user_id, transaction_type, quantity_change, previous_quantity, new_quantity, reason, notes) VALUES
('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'INITIAL', 45, 0, 45, 'Initial Inventory Setup', 'Initial stock on system setup'),
('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'INITIAL', 8, 0, 8, 'Initial Inventory Setup', 'Initial stock batch'),
('a0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'INITIAL', 0, 0, 0, 'Initial Inventory Setup', 'Out of stock on arrival'),
('a0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'INITIAL', 60, 0, 60, 'Initial Inventory Setup', 'Received shipment pallet #12'),
('a0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'DAMAGE', -5, 10, 5, 'Spillage in Transit', 'Broken bottles discarded safely'),
('a0000000-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222', 'SALE', -11, 15, 4, 'Bulk Order Fulfillment', 'Shipped to regional retail store');

-- 6. SEED NOTIFICATIONS
INSERT INTO notifications (user_id, type, title, message, link) VALUES
('11111111-1111-1111-1111-111111111111', 'SYSTEM_ALERT', 'System Initialized', 'SkillForge Retail Inventory System successfully initialized and operational.', '/dashboard'),
('22222222-2222-2222-2222-222222222222', 'LOW_STOCK', 'Low Stock: USB-C Fast Charging Cable 2M', 'SKU ELEC-USB-002 currently has 8 units remaining (Threshold: 15).', '/products'),
('22222222-2222-2222-2222-222222222222', 'OUT_OF_STOCK', 'Out of Stock: Ergonomic Vertical Mouse', 'SKU ELEC-MOU-003 is completely out of stock.', '/products'),
('22222222-2222-2222-2222-222222222222', 'LOW_STOCK', 'Low Stock: Extra Virgin Olive Oil 750ml', 'SKU GROC-OIL-002 currently has 5 units remaining (Threshold: 12).', '/products'),
('33333333-3333-3333-3333-333333333333', 'LOW_STOCK', 'Low Stock Alert: Merino Wool Athletic Socks', 'SKU APP-SOX-002 currently has 4 units left in inventory.', '/products');

-- 7. SEED AUDIT LOGS
INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, details, ip_address) VALUES
('11111111-1111-1111-1111-111111111111', 'superadmin@skillforge.com', 'SYSTEM_INIT', 'SYSTEM', 'SYSTEM', '{"event": "System database initialized with baseline roles and seed users"}'::jsonb, '127.0.0.1'),
('11111111-1111-1111-1111-111111111111', 'superadmin@skillforge.com', 'USER_REGISTER', 'USER', '22222222-2222-2222-2222-222222222222', '{"role": "ADMIN", "email": "admin@skillforge.com"}'::jsonb, '127.0.0.1'),
('11111111-1111-1111-1111-111111111111', 'superadmin@skillforge.com', 'USER_REGISTER', 'USER', '33333333-3333-3333-3333-333333333333', '{"role": "STAFF", "email": "staff@skillforge.com"}'::jsonb, '127.0.0.1');

