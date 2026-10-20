-- ==========================================================
-- NEXUS SAC - MVP SISTEMA B2B DE COTIZACIONES
-- 03_rls_security.sql: Seguridad a Nivel de Fila (RLS)
-- ==========================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Función de ayuda para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Políticas para Perfiles (profiles)
-- Todos los autenticados pueden ver perfiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Solo administradores pueden crear o modificar perfiles
CREATE POLICY "Profiles modifiable by admins"
ON public.profiles FOR ALL
TO authenticated
USING (public.current_user_role() = 'administrador');

-- 2. Políticas para Productos (products)
-- Vendedores, supervisores y administradores pueden consultar productos
CREATE POLICY "Products readable by all authenticated"
ON public.products FOR SELECT
TO authenticated
USING (true);

-- Solo administradores pueden insertar/actualizar/eliminar productos
CREATE POLICY "Products modifiable by admins"
ON public.products FOR ALL
TO authenticated
USING (public.current_user_role() = 'administrador');

-- 3. Políticas para Clientes (clients)
-- Todos los usuarios autenticados pueden consultar y crear clientes
CREATE POLICY "Clients readable by all"
ON public.clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Clients insertable by authenticated"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Clients updatable by supervisors or admins"
ON public.clients FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('supervisor', 'administrador'));

-- 4. Políticas para Tarifas (rates)
CREATE POLICY "Rates readable by all"
ON public.rates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Rates modifiable by admins"
ON public.rates FOR ALL
TO authenticated
USING (public.current_user_role() = 'administrador');

-- 5. Políticas para Cotizaciones (quotations)
-- Lectura: Vendedores ven sus propias cotizaciones, supervisores y administradores ven todas
CREATE POLICY "Quotations viewable according to role"
ON public.quotations FOR SELECT
TO authenticated
USING (
    public.current_user_role() IN ('supervisor', 'administrador')
    OR created_by = auth.uid()
);

-- Creación: Vendedores, supervisores y administradores pueden crear
CREATE POLICY "Quotations insertable by staff"
ON public.quotations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Modificación/Aprobación:
-- Vendedores pueden modificar solo si está pendiente y es suya; supervisores/admins pueden aprobar/rechazar
CREATE POLICY "Quotations updatable by supervisor or creator"
ON public.quotations FOR UPDATE
TO authenticated
USING (
    public.current_user_role() IN ('supervisor', 'administrador')
    OR (created_by = auth.uid() AND status = 'pendiente')
);

-- 6. Políticas para Detalle de Cotizaciones (quotation_items)
CREATE POLICY "Quotation items readable by associated quotation access"
ON public.quotation_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.id = quotation_items.quotation_id
        AND (
            public.current_user_role() IN ('supervisor', 'administrador')
            OR q.created_by = auth.uid()
        )
    )
);

CREATE POLICY "Quotation items insertable by staff"
ON public.quotation_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Para desarrollo y MVP con API Node.js mediante Service Role o Anon Key con bypass controlado:
-- Permitir acceso a lectura si se usa la clave pública del backend en modo MVP
CREATE POLICY "Public read for demo mode"
ON public.products FOR SELECT
TO anon USING (true);

CREATE POLICY "Public read rates for demo mode"
ON public.rates FOR SELECT
TO anon USING (true);
