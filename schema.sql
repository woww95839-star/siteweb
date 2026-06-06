-- ============================================================
-- SokPlus - Schéma PostgreSQL Complet
-- Plateforme B2B E-Commerce Algérienne
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'client', 'staff');
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment', 'return', 'damaged');
CREATE TYPE order_status AS ENUM ('draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
CREATE TYPE payment_method AS ENUM ('cash', 'cheque', 'virement', 'credit');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');
CREATE TYPE promo_type AS ENUM ('percent', 'fixed', 'free_shipping');
CREATE TYPE promo_target AS ENUM ('all', 'category', 'product', 'client');

-- ============================================================
-- TABLE: users
-- ============================================================

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role NOT NULL DEFAULT 'staff',
    full_name     VARCHAR(255) NOT NULL,
    full_name_ar  VARCHAR(255),
    phone         VARCHAR(20),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================
-- TABLE: clients
-- ============================================================

CREATE TABLE clients (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    company_name     VARCHAR(255) NOT NULL,
    company_name_ar  VARCHAR(255),
    nif              VARCHAR(15),
    nis              VARCHAR(15),
    rc               VARCHAR(20),
    ai               VARCHAR(15),
    address          TEXT,
    address_ar       TEXT,
    wilaya_code      SMALLINT CHECK (wilaya_code BETWEEN 1 AND 58),
    phone            VARCHAR(20),
    fax              VARCHAR(20),
    email            VARCHAR(255),
    credit_limit     DECIMAL(14, 2) DEFAULT 0.00,
    is_validated     BOOLEAN NOT NULL DEFAULT FALSE,
    validation_date  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_company_name ON clients USING gin(to_tsvector('simple', company_name));
CREATE INDEX idx_clients_nif ON clients(nif) WHERE nif IS NOT NULL;
CREATE INDEX idx_clients_wilaya ON clients(wilaya_code);
CREATE INDEX idx_clients_validated ON clients(is_validated);

-- ============================================================
-- TABLE: suppliers
-- ============================================================

CREATE TABLE suppliers (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name     VARCHAR(255) NOT NULL,
    company_name_ar  VARCHAR(255),
    contact_name     VARCHAR(255),
    phone            VARCHAR(20),
    email            VARCHAR(255),
    address          TEXT,
    wilaya_code      SMALLINT CHECK (wilaya_code BETWEEN 1 AND 58),
    nif              VARCHAR(15),
    nis              VARCHAR(15),
    bank_account     VARCHAR(50),
    notes            TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_company_name ON suppliers(company_name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_wilaya ON suppliers(wilaya_code);

-- ============================================================
-- TABLE: categories
-- ============================================================

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_fr     VARCHAR(150) NOT NULL,
    name_ar     VARCHAR(150),
    parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
    slug        VARCHAR(200) UNIQUE NOT NULL,
    icon        VARCHAR(100),
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- ============================================================
-- TABLE: products
-- ============================================================

CREATE TABLE products (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku              VARCHAR(50) UNIQUE NOT NULL,
    barcode          VARCHAR(50),
    name_fr          VARCHAR(255) NOT NULL,
    name_ar          VARCHAR(255),
    description_fr   TEXT,
    description_ar   TEXT,
    category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand            VARCHAR(100),
    unit_of_measure  VARCHAR(30) DEFAULT 'unité',
    purchase_price   DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    selling_price    DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    wholesale_price  DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    min_wholesale_qty INT DEFAULT 1,
    profit_margin    DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN selling_price > 0
            THEN ROUND(((selling_price - purchase_price) / selling_price) * 100, 2)
            ELSE 0
        END
    ) STORED,
    tva_rate         DECIMAL(4, 2) NOT NULL DEFAULT 19.00,
    weight           DECIMAL(8, 3),
    images           JSONB DEFAULT '[]'::jsonb,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_selling_price ON products(selling_price);
CREATE INDEX idx_products_name_fr ON products USING gin(to_tsvector('simple', name_fr));
CREATE INDEX idx_products_name_ar ON products USING gin(to_tsvector('simple', coalesce(name_ar, '')));

-- ============================================================
-- TABLE: stock
-- ============================================================

CREATE TABLE stock (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id               UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    quantity_available       INT NOT NULL DEFAULT 0,
    quantity_reserved        INT NOT NULL DEFAULT 0,
    quantity_alert_threshold INT NOT NULL DEFAULT 5,
    warehouse_location       VARCHAR(100),
    last_updated             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_product_id ON stock(product_id);
CREATE INDEX idx_stock_low_stock ON stock(product_id) 
    WHERE (quantity_available - quantity_reserved) <= quantity_alert_threshold;

-- ============================================================
-- TABLE: stock_movements
-- ============================================================

CREATE TABLE stock_movements (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type  movement_type NOT NULL,
    quantity       INT NOT NULL,
    unit_cost      DECIMAL(12, 2),
    reference_id   UUID,
    reference_type VARCHAR(50),
    notes          TEXT,
    notes_ar       TEXT,
    performed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_id, reference_type);

-- ============================================================
-- TABLE: orders
-- ============================================================

CREATE TABLE orders (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number     VARCHAR(20) UNIQUE NOT NULL,
    client_id        UUID NOT NULL REFERENCES clients(id),
    status           order_status NOT NULL DEFAULT 'draft',
    subtotal_ht      DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tva_amount       DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    timbre_fiscal    DECIMAL(12, 2) NOT NULL DEFAULT 50.00,
    total_ttc        DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_method   payment_method,
    payment_status   payment_status NOT NULL DEFAULT 'pending',
    notes            TEXT,
    notes_ar         TEXT,
    shipping_address TEXT,
    delivered_at     TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_created_by ON orders(created_by);

-- ============================================================
-- TABLE: order_items
-- ============================================================

CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    quantity        INT NOT NULL CHECK (quantity > 0),
    unit_price_ht   DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    tva_rate        DECIMAL(4, 2) NOT NULL DEFAULT 19.00,
    line_total_ht   DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND(quantity * unit_price_ht * (1 - discount_percent / 100), 2)
    ) STORED,
    profit_amount   DECIMAL(12, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================================
-- TABLE: invoices
-- ============================================================

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number  VARCHAR(20) UNIQUE NOT NULL,
    order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
    client_id       UUID NOT NULL REFERENCES clients(id),
    invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE,
    total_ht        DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tva_amount      DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    timbre_fiscal   DECIMAL(12, 2) NOT NULL DEFAULT 50.00,
    total_ttc       DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    pdf_url         TEXT,
    qr_code_data    TEXT,
    is_proforma     BOOLEAN NOT NULL DEFAULT FALSE,
    status          invoice_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- ============================================================
-- TABLE: promotions
-- ============================================================

CREATE TABLE promotions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_fr           VARCHAR(255) NOT NULL,
    name_ar           VARCHAR(255),
    type              promo_type NOT NULL,
    value             DECIMAL(10, 2) NOT NULL,
    min_order_amount  DECIMAL(12, 2) DEFAULT 0.00,
    applicable_to     promo_target NOT NULL DEFAULT 'all',
    target_id         UUID,
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_promotions_is_active ON promotions(is_active);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotions_target ON promotions(applicable_to, target_id);

-- ============================================================
-- TABLE: promo_codes
-- ============================================================

CREATE TABLE promo_codes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code          VARCHAR(50) UNIQUE NOT NULL,
    promotion_id  UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    max_uses      INT,
    current_uses  INT NOT NULL DEFAULT 0,
    expires_at    TIMESTAMPTZ,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code) WHERE is_active = TRUE;
CREATE INDEX idx_promo_codes_promotion_id ON promo_codes(promotion_id);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title_fr    VARCHAR(255),
    title_ar    VARCHAR(255),
    message_fr  TEXT,
    message_ar  TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- TABLE: activity_logs
-- ============================================================

CREATE TABLE activity_logs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    action         VARCHAR(100) NOT NULL,
    resource_type  VARCHAR(50),
    resource_id    UUID,
    ip_address     INET,
    user_agent     TEXT,
    metadata       JSONB DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================
-- TABLE: settings
-- ============================================================

CREATE TABLE settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    value_type  VARCHAR(20) NOT NULL DEFAULT 'string',
    category    VARCHAR(50),
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settings_category ON settings(category);

-- ============================================================
-- TABLE: refresh_tokens (pour l'auth JWT)
-- ============================================================

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_revoked  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash) WHERE is_revoked = FALSE;

-- ============================================================
-- SEQUENCES pour numérotation algérienne
-- ============================================================

CREATE SEQUENCE order_number_seq START 1;
CREATE SEQUENCE invoice_number_seq START 1;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Trigger: updated_at auto-update
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_products
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_orders
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger: auto-génération order_number (format CMD-2024-001)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := 'CMD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Trigger: auto-génération invoice_number (format FAC-2024-001)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'FAC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Trigger: mise à jour stock lors d'un mouvement
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type IN ('in', 'return') THEN
        UPDATE stock
        SET quantity_available = quantity_available + NEW.quantity,
            last_updated = NOW()
        WHERE product_id = NEW.product_id;
    ELSIF NEW.movement_type IN ('out', 'damaged') THEN
        UPDATE stock
        SET quantity_available = GREATEST(0, quantity_available - NEW.quantity),
            last_updated = NOW()
        WHERE product_id = NEW.product_id;
    ELSIF NEW.movement_type = 'adjustment' THEN
        UPDATE stock
        SET quantity_available = GREATEST(0, quantity_available + NEW.quantity),
            last_updated = NOW()
        WHERE product_id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock
    AFTER INSERT ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_stock_on_movement();

-- Trigger: réservation stock sur order_items INSERT
CREATE OR REPLACE FUNCTION reserve_stock_on_order_item()
RETURNS TRIGGER AS $$
DECLARE
    v_status order_status;
BEGIN
    SELECT status INTO v_status FROM orders WHERE id = NEW.order_id;
    IF v_status IN ('confirmed', 'processing') THEN
        UPDATE stock
        SET quantity_reserved = quantity_reserved + NEW.quantity,
            last_updated = NOW()
        WHERE product_id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserve_stock_insert
    AFTER INSERT ON order_items
    FOR EACH ROW EXECUTE FUNCTION reserve_stock_on_order_item();

-- Trigger: libération réservation sur order_items DELETE
CREATE OR REPLACE FUNCTION release_stock_on_order_item_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_status order_status;
BEGIN
    SELECT status INTO v_status FROM orders WHERE id = OLD.order_id;
    IF v_status IN ('confirmed', 'processing') THEN
        UPDATE stock
        SET quantity_reserved = GREATEST(0, quantity_reserved - OLD.quantity),
            last_updated = NOW()
        WHERE product_id = OLD.product_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_release_stock_delete
    AFTER DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION release_stock_on_order_item_delete();

-- Trigger: recalcul totaux commande après modification order_items
CREATE OR REPLACE FUNCTION recalculate_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id UUID;
    v_subtotal_ht DECIMAL(12,2);
    v_tva_amount  DECIMAL(12,2);
    v_total_ttc   DECIMAL(12,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_order_id := OLD.order_id;
    ELSE
        v_order_id := NEW.order_id;
    END IF;

    SELECT
        COALESCE(SUM(oi.line_total_ht), 0),
        COALESCE(SUM(oi.line_total_ht * oi.tva_rate / 100), 0)
    INTO v_subtotal_ht, v_tva_amount
    FROM order_items oi
    WHERE oi.order_id = v_order_id;

    SELECT v_subtotal_ht + v_tva_amount + timbre_fiscal INTO v_total_ttc
    FROM orders WHERE id = v_order_id;

    UPDATE orders
    SET subtotal_ht = v_subtotal_ht,
        tva_amount  = v_tva_amount,
        total_ttc   = v_subtotal_ht + v_tva_amount + timbre_fiscal,
        updated_at  = NOW()
    WHERE id = v_order_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_totals_insert
    AFTER INSERT OR UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION recalculate_order_totals();

CREATE TRIGGER trg_recalculate_totals_delete
    AFTER DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION recalculate_order_totals();

-- Trigger: créer entrée stock lors de l'insertion d'un produit
CREATE OR REPLACE FUNCTION create_stock_entry()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO stock (product_id, quantity_available, quantity_reserved, quantity_alert_threshold)
    VALUES (NEW.id, 0, 0, 5)
    ON CONFLICT (product_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_stock_entry
    AFTER INSERT ON products
    FOR EACH ROW EXECUTE FUNCTION create_stock_entry();

-- ============================================================
-- VIEWS UTILES
-- ============================================================

CREATE OR REPLACE VIEW v_products_with_stock AS
SELECT
    p.id,
    p.sku,
    p.barcode,
    p.name_fr,
    p.name_ar,
    p.category_id,
    c.name_fr AS category_name,
    p.brand,
    p.selling_price,
    p.wholesale_price,
    p.purchase_price,
    p.profit_margin,
    p.tva_rate,
    p.is_active,
    s.quantity_available,
    s.quantity_reserved,
    (s.quantity_available - s.quantity_reserved) AS quantity_free,
    s.quantity_alert_threshold,
    CASE
        WHEN (s.quantity_available - s.quantity_reserved) <= 0 THEN 'out_of_stock'
        WHEN (s.quantity_available - s.quantity_reserved) <= s.quantity_alert_threshold THEN 'low_stock'
        ELSE 'in_stock'
    END AS stock_status
FROM products p
LEFT JOIN stock s ON s.product_id = p.id
LEFT JOIN categories c ON c.id = p.category_id;

CREATE OR REPLACE VIEW v_orders_summary AS
SELECT
    o.id,
    o.order_number,
    o.status,
    o.payment_status,
    o.payment_method,
    o.subtotal_ht,
    o.tva_amount,
    o.timbre_fiscal,
    o.total_ttc,
    o.created_at,
    o.delivered_at,
    c.company_name AS client_name,
    c.company_name_ar AS client_name_ar,
    c.wilaya_code,
    u.full_name AS created_by_name
FROM orders o
JOIN clients c ON c.id = o.client_id
LEFT JOIN users u ON u.id = o.created_by;
