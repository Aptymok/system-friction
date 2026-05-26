# REPO AUDIT - System Friction

Fecha: 2026-05-19  
Repo local: `D:\system friction`  
Branch auditada: `main`

## A. Rutas reales en `src/app`

- `/` -> `src/app/page.tsx`, redirige a `/landing`.
- `/landing` -> `src/app/(public)/landing/page.tsx`.
- `/start` -> `src/app/(public)/start/page.tsx`.
- `/login` -> `src/app/(auth)/login/page.tsx`.
- `/register`, `/forgot`, `/reset`, `/verify`, `/setup-profile` bajo `src/app/(auth)`.
- `/terminal` -> `src/app/(terminal)/terminal/page.tsx`.
- `/terminal/link/[token]` -> magic link terminal.
- `/root` -> `src/app/root/page.tsx`.
- `/user` -> `src/app/user/page.tsx`.
- `/unauthorized` -> `src/app/unauthorized/page.tsx`.

## B. Componentes reales usados por `/terminal`

`/terminal` renderiza actualmente:

- `src/app/(terminal)/terminal/page.tsx`
- `src/observatory/components/field/SfiFieldShell.tsx`
- `src/observatory/components/field/SfiCognitiveField.tsx`
- `src/observatory/components/field/FieldCommandInput.tsx`
- `src/observatory/components/field/FieldNodeInspector.tsx`
- `src/observatory/components/field/fieldOntology.ts`
- `src/observatory/hooks/useTelemetryPulse.ts`
- `src/observatory/store/nodeStore.ts`

Componentes terminal heredados que existen pero ya no dominan `/terminal`:

- `src/observatory/components/root/LiturgiaDiagnosticPanel.tsx`
- `src/observatory/components/terminal/AMVChat.tsx`
- `src/observatory/components/terminal/ConsoleColumn.tsx`
- `src/observatory/components/terminal/MemoryColumn.tsx`
- `src/observatory/components/terminal/StateColumn.tsx`
- `src/components/terminal/*`

## C. APIs existentes

Operacionales conectadas al campo:

- `POST /api/liturgia/amv`
- `POST /api/bitacora/regenerate`
- `POST /api/calendar/phenomenological`
- `GET|POST /api/media/drafts`
- `POST /api/social/resonance`
- `GET|POST /api/sfi/assets`
- `POST /api/sfi/assets/[asset_id]/measurements`
- `GET /api/node/bootstrap`

Otras APIs presentes:

- `POST /api/mihm`
- `POST /api/mihm/process`
- `POST /api/audit`
- `POST /api/cognitive-twin`
- `GET|POST /api/project-manager`
- `GET|POST /api/social/calendar`
- `POST /api/auth/threshold`
- `GET|POST /api/subscription`
- `POST /api/admin/*`

## D. Archivos AMV

- `src/app/api/liturgia/amv/route.ts`
- `src/agents/amv.ts`
- `src/agents/systemPrompt.ts`
- `src/observatory/components/terminal/AMVChat.tsx` (heredado)

Estado: `/api/liturgia/amv` usa respuesta interna minima, persiste mensajes/eventos cuando hay sesion/nodo, y no llama proveedor externo desde cliente.

## E. Archivos de patrones

- `src/agents/patternengine.ts`
- `src/app/api/admin/ingest-patterns/route.ts`
- `src/observatory/components/field/fieldOntology.ts`

Falta consolidar un catalogo operativo minimo visible para FIELD_LAYER. Se agrega en esta fase.

## F. Archivos de memoria

- `src/lib/memory/facts.ts`
- `src/lib/memory/embeddings.ts`
- `src/lib/types.ts`
- `src/lib/server/sfiAssets.ts`
- `src/app/api/node/bootstrap/route.ts`
- `src/app/api/cognitive-twin/route.ts`

## G. Archivos de auditoria

- `src/app/api/audit/route.ts`
- `src/agents/auditor.ts`
- `src/agents/longitudinal.ts`
- `src/lib/supabase/migrations/01_full_script.sql`
- `src/lib/supabase/migrations/05_sfi_eval_assets.sql`

## H. Archivos MIHM

- `src/app/api/mihm/route.ts`
- `src/app/api/mihm/process/route.ts`
- `src/agents/maker-mihm.ts`

Estado: MIHM existe como backend/API, pero no estaba representado como nodo activo estable del campo. Se agrega nodo MIHM en esta fase.

## I. Persistencia Supabase actual

Lecturas y escrituras reales:

- `node/bootstrap` lee usuario, perfil, nodo, licencia, entitlements, assets y memoria.
- `sfi/assets` crea/lista assets bajo RLS.
- `sfi/assets/[asset_id]/measurements` inserta mediciones y logbook.
- `liturgia/amv` persiste `amv_messages`, `amv_sessions`, `cognitive_event_stream` y posible memoria.
- `bitacora/regenerate` persiste `cognitive_event_stream` y puede crear `media_drafts`.
- `media/drafts` lee/crea drafts.
- `social/resonance` registra eventos sociales y `cognitive_event_stream`.

## J. Duplicaciones o piezas heredadas

- Hay dos familias visuales: `observatory/components/root` y `observatory/components/field`.
- Hay componentes terminal heredados que pueden seguir como archivo historico, pero `/terminal` ya debe operar por `SfiFieldShell`.
- `LiturgiaDiagnosticPanel` sigue existiendo como panel operativo anterior; no debe volver a ser root de `/terminal`.

## K. Features declaradas pero no conectadas completamente

- MIHM: endpoint presente; faltaba nodo operativo visible.
- Pattern engine: agente presente; faltaba modelo minimo de patrones FIELD_LAYER.
- Neural reorganization: declarada conceptualmente; faltaba sandbox/propuesta minima no destructiva.
- Bitacora 10 ciclos: endpoints persistentes presentes; faltaba bitacora local visible/append-only del campo.
- Low friction route: inferencia existe parcialmente en `inferOperationalReading`; faltaba salida FIELD_LAYER simple.

## L. Build e imports

Estado antes de esta fase: ultimo commit reporto `npx tsc --noEmit` y `npm run build` OK.  
Estado despues de esta fase: ver cierre de ejecucion.
