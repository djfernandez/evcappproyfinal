-- ==========================================================
-- NEXUS SAC - MVP SISTEMA B2B DE COTIZACIONES
-- 01_schema.sql: Definición de Tablas Principales
-- ==========================================================

-- Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Perfiles de Usuario y Roles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('vendedor', 'supervisor', 'administrador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Catálogo de Productos
-- Campos mínimos: Id autogenerado, Tipo (Libros, Revistas, Pruebas), Nombre, Autor, Editorial, Stock
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

-- 3. Catálogo de Clientes
-- Campos mínimos: Id autogenerado, Tipo doc (DNI o RUC), Nombres/Razón Social, 
-- Numero doc (máx 15 chars, RUC debe iniciar con 10 o 20), Dirección, Teléfono
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_type VARCHAR(10) NOT NULL CHECK (doc_type IN ('DNI', 'RUC')),
    full_name VARCHAR(255) NOT NULL,
    doc_number VARCHAR(15) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Restricción de negocio para validación de RUC y DNI
    CONSTRAINT check_client_doc_number CHECK (
        (doc_type = 'RUC' AND doc_number ~ '^(10|20)[0-9]{9}$') OR
        (doc_type = 'DNI' AND doc_number ~ '^[0-9]{8}$') OR
        (doc_type NOT IN ('RUC', 'DNI') AND length(doc_number) <= 15)
    )
);

-- 4. Catálogo de Tarifas
-- Campos mínimos: Id autogenerado, Id producto, Monto de tarifa, Moneda
CREATE TABLE IF NOT EXISTS public.rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN', 'USD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla auxiliar para secuencias correlativas anuales (ej: 2026 -> 1, 2, 3...)
CREATE TABLE IF NOT EXISTS public.quotation_sequences (
    year_val INTEGER PRIMARY KEY,
    current_value INTEGER NOT NULL DEFAULT 0
);

-- 5. Catálogo de Cotizaciones (Cabecera)
-- Campos mínimos: Id, Id Cliente, Numero cotización (Año-Correlativo reiniciable por año),
-- Fecha, Fecha vencimiento, Referencias, Total, IGV, Estado (pendiente, aprobado, rechazado), Moneda
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

-- 6. Detalle de Cotizaciones (Detalle)
-- Campos mínimos: Id autogenerado, Id Cabecera, Id Producto, Id Tarifa, Cantidad, Precio, Sub Total
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
