-- Secure direct browser access from GitHub Pages.
-- Run after setup_all.sql (or 03_rls_security.sql) in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "Public read for demo" ON public.products;
DROP POLICY IF EXISTS "Public read rates demo" ON public.rates;
DROP POLICY IF EXISTS "Public read for demo mode" ON public.products;
DROP POLICY IF EXISTS "Public read rates for demo mode" ON public.rates;
DROP POLICY IF EXISTS "Public read clients demo" ON public.clients;
DROP POLICY IF EXISTS "Public read quotations demo" ON public.quotations;
DROP POLICY IF EXISTS "Public read quotation_items demo" ON public.quotation_items;
DROP POLICY IF EXISTS "Public read profiles demo" ON public.profiles;
DROP POLICY IF EXISTS "Public read sequences demo" ON public.quotation_sequences;
DROP POLICY IF EXISTS "Public insert quotations demo" ON public.quotations;
DROP POLICY IF EXISTS "Public insert items demo" ON public.quotation_items;
DROP POLICY IF EXISTS "Public update quotations demo" ON public.quotations;
DROP POLICY IF EXISTS "Public insert clients demo" ON public.clients;
DROP POLICY IF EXISTS "Public insert products demo" ON public.products;
DROP POLICY IF EXISTS "Public insert rates demo" ON public.rates;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles modifiable by admins" ON public.profiles;
DROP POLICY IF EXISTS "Products readable by all authenticated" ON public.products;
DROP POLICY IF EXISTS "Products modifiable by admins" ON public.products;
DROP POLICY IF EXISTS "Clients readable by all" ON public.clients;
DROP POLICY IF EXISTS "Clients insertable by authenticated" ON public.clients;
DROP POLICY IF EXISTS "Clients updatable by supervisors or admins" ON public.clients;
DROP POLICY IF EXISTS "Rates readable by all" ON public.rates;
DROP POLICY IF EXISTS "Rates modifiable by admins" ON public.rates;
DROP POLICY IF EXISTS "Quotations viewable according to role" ON public.quotations;
DROP POLICY IF EXISTS "Quotations insertable by staff" ON public.quotations;
DROP POLICY IF EXISTS "Quotations updatable by supervisor or creator" ON public.quotations;
DROP POLICY IF EXISTS "Quotation items readable by associated quotation access" ON public.quotation_items;
DROP POLICY IF EXISTS "Quotation items insertable by staff" ON public.quotation_items;
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Products readable by authenticated users" ON public.products;
DROP POLICY IF EXISTS "Clients readable by authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Clients modifiable by admins" ON public.clients;
DROP POLICY IF EXISTS "Rates readable by authenticated users" ON public.rates;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles modifiable by admins"
ON public.profiles FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

CREATE POLICY "Products readable by authenticated users"
ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Products modifiable by admins"
ON public.products FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

CREATE POLICY "Clients readable by authenticated users"
ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clients modifiable by admins"
ON public.clients FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

CREATE POLICY "Rates readable by authenticated users"
ON public.rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Rates modifiable by admins"
ON public.rates FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

CREATE POLICY "Quotations viewable according to role"
ON public.quotations FOR SELECT TO authenticated
USING (
    public.current_user_role() IN ('supervisor', 'administrador')
    OR created_by = auth.uid()
);

CREATE POLICY "Quotation items readable by associated quotation access"
ON public.quotation_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE q.id = quotation_items.quotation_id
          AND (
              public.current_user_role() IN ('supervisor', 'administrador')
              OR q.created_by = auth.uid()
          )
    )
);

CREATE OR REPLACE FUNCTION public.create_quotation(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_item JSONB;
    v_product public.products%ROWTYPE;
    v_quantity INTEGER;
    v_unit_price NUMERIC(12, 2);
    v_subtotal NUMERIC(12, 2) := 0;
    v_discount_percent NUMERIC(5, 2);
    v_discount_amount NUMERIC(12, 2);
    v_igv NUMERIC(12, 2);
    v_total NUMERIC(12, 2);
    v_status TEXT;
    v_quotation public.quotations%ROWTYPE;
    v_due_date DATE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para crear una cotización.';
    END IF;

    SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    IF v_user_role IS NULL OR v_user_role NOT IN ('vendedor', 'supervisor', 'administrador') THEN
        RAISE EXCEPTION 'El usuario no tiene un perfil de acceso válido.';
    END IF;

    IF COALESCE(jsonb_typeof(p_payload->'items'), '') <> 'array' THEN
        RAISE EXCEPTION 'La cotización debe incluir al menos un producto.';
    END IF;
    IF jsonb_array_length(p_payload->'items') = 0 THEN
        RAISE EXCEPTION 'La cotización debe incluir al menos un producto.';
    END IF;

    v_discount_percent := COALESCE(NULLIF(p_payload->>'discount_percent', '')::NUMERIC, 0);
    IF v_discount_percent < 0 OR v_discount_percent > 100 THEN
        RAISE EXCEPTION 'El descuento debe estar entre 0 y 100.';
    END IF;

    IF COALESCE(p_payload->>'currency', 'PEN') NOT IN ('PEN', 'USD') THEN
        RAISE EXCEPTION 'La moneda debe ser PEN o USD.';
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_quantity := NULLIF(v_item->>'quantity', '')::INTEGER;
        v_unit_price := NULLIF(v_item->>'unit_price', '')::NUMERIC;
        IF v_quantity IS NULL OR v_quantity <= 0 OR v_unit_price IS NULL OR v_unit_price < 0 THEN
            RAISE EXCEPTION 'La cantidad y el precio de cada producto deben ser válidos.';
        END IF;

        SELECT * INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id')::UUID
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Uno de los productos seleccionados ya no existe.';
        END IF;
        IF v_product.stock < v_quantity THEN
            RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: %, solicitado: %.',
                v_product.name, v_product.stock, v_quantity;
        END IF;

        v_subtotal := v_subtotal + (v_quantity * v_unit_price);
    END LOOP;

    v_subtotal := ROUND(v_subtotal, 2);
    v_discount_amount := ROUND(v_subtotal * v_discount_percent / 100, 2);
    v_igv := ROUND((v_subtotal - v_discount_amount) * 0.18, 2);
    v_total := v_subtotal - v_discount_amount + v_igv;
    v_status := CASE WHEN v_discount_percent > 15 THEN 'pendiente' ELSE 'aprobado' END;
    v_due_date := COALESCE(NULLIF(p_payload->>'due_date', '')::DATE, CURRENT_DATE + 15);

    INSERT INTO public.quotations (
        client_id, quotation_date, due_date, references_text, subtotal,
        discount_percent, discount_amount, igv, total, status, currency, created_by
    ) VALUES (
        (p_payload->>'client_id')::UUID,
        COALESCE(NULLIF(p_payload->>'quotation_date', '')::DATE, CURRENT_DATE),
        v_due_date,
        COALESCE(p_payload->>'references_text', ''),
        v_subtotal,
        v_discount_percent,
        v_discount_amount,
        v_igv,
        v_total,
        v_status,
        COALESCE(p_payload->>'currency', 'PEN'),
        v_user_id
    )
    RETURNING * INTO v_quotation;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items')
    LOOP
        INSERT INTO public.quotation_items (
            quotation_id, product_id, rate_id, quantity, unit_price, subtotal
        ) VALUES (
            v_quotation.id,
            (v_item->>'product_id')::UUID,
            NULLIF(v_item->>'rate_id', '')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::NUMERIC,
            ROUND((v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC, 2)
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN v_status = 'pendiente' THEN 'Cotización registrada y enviada a aprobación.'
            ELSE 'Cotización creada y aprobada exitosamente.'
        END,
        'quotation', to_jsonb(v_quotation)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_quotation(
    p_quotation_id UUID,
    p_status TEXT,
    p_approval_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_quotation public.quotations%ROWTYPE;
BEGIN
    SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    IF v_user_id IS NULL OR v_user_role NOT IN ('supervisor', 'administrador') THEN
        RAISE EXCEPTION 'Solo un supervisor o administrador puede revisar cotizaciones.';
    END IF;
    IF p_status NOT IN ('aprobado', 'rechazado') THEN
        RAISE EXCEPTION 'La decisión debe ser aprobado o rechazado.';
    END IF;

    UPDATE public.quotations
    SET status = p_status,
        approved_by = v_user_id,
        approval_notes = COALESCE(p_approval_notes, ''),
        updated_at = NOW()
    WHERE id = p_quotation_id AND status = 'pendiente'
    RETURNING * INTO v_quotation;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cotización no existe o ya fue revisada.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cotización ' || p_status || ' con éxito.',
        'quotation', to_jsonb(v_quotation)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_quotation(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_quotation(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quotation(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_quotation(UUID, TEXT, TEXT) TO authenticated;
