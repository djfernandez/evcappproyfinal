-- ==========================================================
-- NEXUS SAC - MVP SISTEMA B2B DE COTIZACIONES
-- SETUP COMPLETO: SCHEMA + TRIGGERS + RLS + SEED DATA
-- Ejecuta este script completo en el SQL Editor de tu proyecto Supabase
-- ==========================================================

-- 1. TABLAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('vendedor', 'supervisor', 'administrador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('Libros', 'Revistas', 'Pruebas')),
    name VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    editorial VARCHAR(255) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_type VARCHAR(10) NOT NULL CHECK (doc_type IN ('DNI', 'RUC')),
    full_name VARCHAR(255) NOT NULL,
    doc_number VARCHAR(15) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_client_doc_number CHECK (
        (doc_type = 'RUC' AND doc_number ~ '^(10|20)[0-9]{9}$') OR
        (doc_type = 'DNI' AND doc_number ~ '^[0-9]{8}$') OR
        (doc_type NOT IN ('RUC', 'DNI') AND length(doc_number) <= 15)
    )
);

CREATE TABLE IF NOT EXISTS public.rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN', 'USD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.quotation_sequences (
    year_val INTEGER PRIMARY KEY,
    current_value INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    quotation_number VARCHAR(50) UNIQUE,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    references_text TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    igv NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (igv >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN', 'USD')),
    created_by UUID REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    approval_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    rate_id UUID REFERENCES public.rates(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TRIGGERS Y FUNCIONES
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_rates_updated_at ON public.rates;
CREATE TRIGGER set_rates_updated_at BEFORE UPDATE ON public.rates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_quotations_updated_at ON public.quotations;
CREATE TRIGGER set_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_year INTEGER;
    next_correlative INTEGER;
BEGIN
    IF NEW.quotation_number IS NULL OR trim(NEW.quotation_number) = '' THEN
        current_year := EXTRACT(YEAR FROM COALESCE(NEW.quotation_date, CURRENT_DATE))::INTEGER;

        INSERT INTO public.quotation_sequences (year_val, current_value)
        VALUES (current_year, 1)
        ON CONFLICT (year_val)
        DO UPDATE SET current_value = public.quotation_sequences.current_value + 1
        RETURNING current_value INTO next_correlative;

        NEW.quotation_number := current_year || '-' || LPAD(next_correlative::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_quotation_number ON public.quotations;
CREATE TRIGGER trg_generate_quotation_number
BEFORE INSERT ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.generate_quotation_number();

-- 3. RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for demo" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public read rates demo" ON public.rates FOR SELECT USING (true);
CREATE POLICY "Public read clients demo" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public read quotations demo" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "Public read quotation_items demo" ON public.quotation_items FOR SELECT USING (true);
CREATE POLICY "Public read profiles demo" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read sequences demo" ON public.quotation_sequences FOR ALL USING (true);
CREATE POLICY "Public insert quotations demo" ON public.quotations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert items demo" ON public.quotation_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update quotations demo" ON public.quotations FOR UPDATE USING (true);
CREATE POLICY "Public insert clients demo" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert products demo" ON public.products FOR ALL USING (true);
CREATE POLICY "Public insert rates demo" ON public.rates FOR ALL USING (true);

-- 4. SEED DATA
INSERT INTO public.profiles (id, email, full_name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'vendedor@nexussac.pe', 'Carlos Mendoza (Ventas)', 'vendedor'),
('22222222-2222-2222-2222-222222222222', 'supervisor@nexussac.pe', 'Elena Ramos (Supervisora Comercial)', 'supervisor'),
('33333333-3333-3333-3333-333333333333', 'admin@nexussac.pe', 'Administrador Nexus SAC', 'administrador')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.products (id, product_type, name, author, editorial, stock) VALUES
('a0000001-0000-0000-0000-000000000001', 'Libros', 'Gestión Financiera para Empresas B2B', 'Alejandro Morales', 'Editorial Planeta Pro', 85),
('a0000002-0000-0000-0000-000000000002', 'Libros', 'Metodologías Ágiles y Scrum en Negocios', 'Mariana Torres', 'O''Reilly Hispano', 120),
('a0000003-0000-0000-0000-000000000003', 'Libros', 'Derecho Tributario y Regulación SUNAT', 'Dr. Jorge Benavides', 'Gaceta Jurídica', 45),
('a0000004-0000-0000-0000-000000000004', 'Revistas', 'Revista Business Tech Perú - Edición 2026', 'Comité Editorial Nexus', 'Nexus Publishing', 250),
('a0000005-0000-0000-0000-000000000005', 'Revistas', 'Harvard Deusto Marketing & Ventas', 'Varios Autores', 'Deusto Ediciones', 110),
('a0000006-0000-0000-0000-000000000006', 'Pruebas', 'Batería de Evaluación Psicométrica B2B-Pro', 'Instituto de Psicometría', 'Nexus Psicometría', 60),
('a0000007-0000-0000-0000-000000000007', 'Pruebas', 'Test de Competencias Comerciales y Liderazgo', 'Dra. Sofía Valenzuela', 'Talent Metrics', 95)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clients (id, doc_type, full_name, doc_number, address, phone) VALUES
('b0000001-0000-0000-0000-000000000001', 'RUC', 'Corporación Minera del Sur S.A.C.', '20549876541', 'Av. Las Begonias 441, San Isidro, Lima', '+51 1 612-4000'),
('b0000002-0000-0000-0000-000000000002', 'RUC', 'Distribuidora Logística Andina E.I.R.L.', '20601234567', 'Jr. Los Ficus 820, Surquillo, Lima', '+51 1 445-8921'),
('b0000003-0000-0000-0000-000000000003', 'RUC', 'Consultora Financiera Salazar & Asociados', '10458923145', 'Av. Benavides 1570 Of. 602, Miraflores', '+51 987 654 321'),
('b0000004-0000-0000-0000-000000000004', 'DNI', 'Roberto Carlos Díaz Peña', '45891234', 'Calle Los Sauces 142, La Molina', '+51 998 123 456')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rates (id, product_id, amount, currency) VALUES
('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 145.00, 'PEN'),
('c0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 180.00, 'PEN'),
('c0000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003', 220.00, 'PEN'),
('c0000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 65.00, 'PEN'),
('c0000005-0000-0000-0000-000000000005', 'a0000005-0000-0000-0000-000000000005', 85.00, 'PEN'),
('c0000006-0000-0000-0000-000000000006', 'a0000006-0000-0000-0000-000000000006', 450.00, 'PEN'),
('c0000007-0000-0000-0000-000000000007', 'a0000007-0000-0000-0000-000000000007', 380.00, 'PEN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quotations (
    id, client_id, quotation_number, quotation_date, due_date,
    references_text, subtotal, discount_percent, discount_amount,
    igv, total, status, currency, created_by
) VALUES (
    'd0000001-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000001',
    '2026-0001',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '15 days',
    'Capacitación anual del departamento contable',
    1450.00,
    5.00,
    72.50,
    247.95,
    1625.45,
    'aprobado',
    'PEN',
    '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quotation_items (
    quotation_id, product_id, rate_id, quantity, unit_price, subtotal
) VALUES (
    'd0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    10,
    145.00,
    1450.00
);

INSERT INTO public.quotations (
    id, client_id, quotation_number, quotation_date, due_date,
    references_text, subtotal, discount_percent, discount_amount,
    igv, total, status, currency, created_by
) VALUES (
    'd0000002-0000-0000-0000-000000000002',
    'b0000002-0000-0000-0000-000000000002',
    '2026-0002',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 days',
    'Pedido corporativo por volumen de pruebas psicométricas (Descuento 25% solicitado)',
    4500.00,
    25.00,
    1125.00,
    607.50,
    3982.50,
    'pendiente',
    'PEN',
    '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quotation_items (
    quotation_id, product_id, rate_id, quantity, unit_price, subtotal
) VALUES (
    'd0000002-0000-0000-0000-000000000002',
    'a0000006-0000-0000-0000-000000000006',
    'c0000006-0000-0000-0000-000000000006',
    10,
    450.00,
    4500.00
);

INSERT INTO public.quotation_sequences (year_val, current_value)
VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 2)
ON CONFLICT (year_val)
DO UPDATE SET current_value = GREATEST(public.quotation_sequences.current_value, 2);
