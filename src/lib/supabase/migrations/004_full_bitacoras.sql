    -- Bitácora Colectiva (Variables Macro)
CREATE TABLE IF NOT EXISTS public.bitacora_colectiva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT,
    entropy_level FLOAT,
    global_pulse JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bitácora de Usuario (Trazabilidad Conductual)
CREATE TABLE IF NOT EXISTS public.bitacora_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action_type TEXT,
    ihg_snapshot FLOAT,
    nti_snapshot FLOAT,
    decision_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) para el Nodo Soberano
ALTER TABLE public.bitacora_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven su propia bitácora" ON public.bitacora_usuario
    FOR SELECT USING (auth.uid() = user_id);