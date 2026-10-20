-- ==========================================================
-- NEXUS SAC - MVP SISTEMA B2B DE COTIZACIONES
-- 04_seed_data.sql: Datos Semilla de Prueba
-- ==========================================================

-- Limpiar tablas si se re-ejecuta (opcional en entorno de pruebas)
TRUNCATE TABLE public.quotation_items CASCADE;
TRUNCATE TABLE public.quotations CASCADE;
TRUNCATE TABLE public.rates CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 1. Insertar Perfiles de Usuario Demo
INSERT INTO public.profiles (id, email, full_name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'vendedor@nexussac.pe', 'Carlos Mendoza (Ventas)', 'vendedor'),
('22222222-2222-2222-2222-222222222222', 'supervisor@nexussac.pe', 'Elena Ramos (Supervisora Comercial)', 'supervisor'),
('33333333-3333-3333-3333-333333333333', 'admin@nexussac.pe', 'Administrador Nexus SAC', 'administrador')
ON CONFLICT (email) DO NOTHING;

-- 2. Insertar Catálogo de Productos
-- Tipos requeridos: Libros, Revistas, Pruebas
INSERT INTO public.products (id, product_type, name, author, editorial, stock) VALUES
('a0000001-0000-0000-0000-000000000001', 'Libros', 'Gestión Financiera para Empresas B2B', 'Alejandro Morales', 'Editorial Planeta Pro', 85),
('a0000002-0000-0000-0000-000000000002', 'Libros', 'Metodologías Ágiles y Scrum en Negocios', 'Mariana Torres', 'O''Reilly Hispano', 120),
('a0000003-0000-0000-0000-000000000003', 'Libros', 'Derecho Tributario y Regulación SUNAT', 'Dr. Jorge Benavides', 'Gaceta Jurídica', 45),
('a0000004-0000-0000-0000-000000000004', 'Revistas', 'Revista Business Tech Perú - Edición 2026', 'Comité Editorial Nexus', 'Nexus Publishing', 250),
('a0000005-0000-0000-0000-000000000005', 'Revistas', 'Harvard Deusto Marketing & Ventas', 'Varios Autores', 'Deusto Ediciones', 110),
('a0000006-0000-0000-0000-000000000006', 'Pruebas', 'Batería de Evaluación Psicométrica B2B-Pro', 'Instituto de Psicometría', 'Nexus Psicometría', 60),
('a0000007-0000-0000-0000-000000000007', 'Pruebas', 'Test de Competencias Comerciales y Liderazgo', 'Dra. Sofía Valenzuela', 'Talent Metrics', 95)
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar Catálogo de Clientes
-- Validaciones: RUC debe iniciar con 10 o 20, máx 15 caracteres
INSERT INTO public.clients (id, doc_type, full_name, doc_number, address, phone) VALUES
('b0000001-0000-0000-0000-000000000001', 'RUC', 'Corporación Minera del Sur S.A.C.', '20549876541', 'Av. Las Begonias 441, San Isidro, Lima', '+51 1 612-4000'),
('b0000002-0000-0000-0000-000000000002', 'RUC', 'Distribuidora Logística Andina E.I.R.L.', '20601234567', 'Jr. Los Ficus 820, Surquillo, Lima', '+51 1 445-8921'),
('b0000003-0000-0000-0000-000000000003', 'RUC', 'Consultora Financiera Salazar & Asociados', '10458923145', 'Av. Benavides 1570 Of. 602, Miraflores', '+51 987 654 321'),
('b0000004-0000-0000-0000-000000000004', 'DNI', 'Roberto Carlos Díaz Peña', '45891234', 'Calle Los Sauces 142, La Molina', '+51 998 123 456')
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar Catálogo de Tarifas
INSERT INTO public.rates (id, product_id, amount, currency) VALUES
('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 145.00, 'PEN'),
('c0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 180.00, 'PEN'),
('c0000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003', 220.00, 'PEN'),
('c0000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 65.00, 'PEN'),
('c0000005-0000-0000-0000-000000000005', 'a0000005-0000-0000-0000-000000000005', 85.00, 'PEN'),
('c0000006-0000-0000-0000-000000000006', 'a0000006-0000-0000-0000-000000000006', 450.00, 'PEN'),
('c0000007-0000-0000-0000-000000000007', 'a0000007-0000-0000-0000-000000000007', 380.00, 'PEN')
ON CONFLICT (id) DO NOTHING;

-- 5. Insertar Cotizaciones de Ejemplo Inicial
-- Cotización 1 (Aprobada estándar): 2026-0001
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

-- Cotización 2 (Pendiente de Aprobación por descuento especial de 25% > 15%): 2026-0002
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

-- Sincronizar secuencia correlativa al año 2026
INSERT INTO public.quotation_sequences (year_val, current_value)
VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 2)
ON CONFLICT (year_val)
DO UPDATE SET current_value = GREATEST(public.quotation_sequences.current_value, 2);
