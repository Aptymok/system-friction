-- =====================================================
-- LIMPIEZA SEGURA (NO ELIMINA FUNCIONES DE EXTENSIONES)
-- =====================================================

-- 1. Desactivar RLS en todas las tablas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 2. Eliminar todas las políticas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. Eliminar todos los triggers (excepto los del sistema)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT trigger_name, event_object_table 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', r.trigger_name, r.event_object_table);
  END LOOP;
END $$;

-- 4. Eliminar todas las tablas (CASCADE elimina secuencias dependientes)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- 5. Eliminar secuencias huérfanas (por si acaso)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', r.sequence_name);
  END LOOP;
END $$;

-- 6. (Opcional) Eliminar extensiones si realmente quieres hacerlo
-- Descomenta las siguientes líneas SOLO si deseas borrar también las extensiones.
-- Esto resolverá el error porque eliminar la extensión vector eliminará sus funciones automáticamente.
-- DROP EXTENSION IF EXISTS vector CASCADE;
-- DROP EXTENSION IF EXISTS pgcrypto CASCADE;

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE 'Limpieza completada. Todas las tablas, políticas, triggers y secuencias han sido eliminados. Las extensiones permanecen intactas.';
END $$;