-- ==========================================================
-- NEXUS SAC - MVP SISTEMA B2B DE COTIZACIONES
-- 02_triggers.sql: Funciones y Triggers para Correlativo Anual
-- ==========================================================

-- Función para actualizar columnas updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de actualización de fecha
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_rates_updated_at ON public.rates;
CREATE TRIGGER set_rates_updated_at
BEFORE UPDATE ON public.rates
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_quotations_updated_at ON public.quotations;
CREATE TRIGGER set_quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- Función y Trigger para generar el Número Correlativo Anual (ej: 2026-0001)
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    next_correlative INTEGER;
BEGIN
    -- Solo generar si quotation_number no fue provisto explícitamente
    IF NEW.quotation_number IS NULL OR trim(NEW.quotation_number) = '' THEN
        -- Obtener el año de la fecha de la cotización (o año actual si no se definió)
        current_year := EXTRACT(YEAR FROM COALESCE(NEW.quotation_date, CURRENT_DATE))::INTEGER;

        -- Mantener el contador por delante de los números ya guardados.
        INSERT INTO public.quotation_sequences (year_val, current_value)
        VALUES (
            current_year,
            COALESCE((
                SELECT MAX(substring(quotation_number FROM '^[0-9]{4}-([0-9]+)$')::INTEGER)
                FROM public.quotations
                WHERE quotation_number ~ ('^' || current_year::TEXT || '-[0-9]+$')
            ), 0) + 1
        )
        ON CONFLICT (year_val)
        DO UPDATE SET current_value = GREATEST(
            public.quotation_sequences.current_value,
            EXCLUDED.current_value - 1
        ) + 1
        RETURNING current_value INTO next_correlative;

        -- Formato requerido: AÑO-CORRELATIVO con padding de 4 dígitos (ej: 2026-0001)
        NEW.quotation_number := current_year || '-' || LPAD(next_correlative::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asociar a la tabla quotations
DROP TRIGGER IF EXISTS trg_generate_quotation_number ON public.quotations;
CREATE TRIGGER trg_generate_quotation_number
BEFORE INSERT ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.generate_quotation_number();
