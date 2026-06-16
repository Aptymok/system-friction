# SFI-PSI / SMLI-P Operational Integration

## Que se agrego

Se agrego SFI Lab como instrumento operativo real para convertir archivo o senal textual en:

archivo / senal -> ingesta -> normalizacion -> reaparicion -> nodo SFI -> variables SFI -> hipotesis -> reporte -> campana -> assets media.

La implementacion es deterministica cuando no hay proveedores externos y no marca resultados simulados como generacion real.

## Rutas nuevas

- `/sfi-lab`: herramienta operativa con input de texto, upload de archivo, selector de modo, resultados, historial local y export JSON/Markdown.

## Endpoints nuevos

- `POST /api/sfi/lab/analyze`
  - Acepta JSON, `text/plain` o `multipart/form-data`.
  - Campos: `text`, `file`, `mode`, `source`, `tags`.
  - Devuelve `analysisId`, `reappearances`, `signals`, `nodes`, `sfiVector`, `hypotheses`, `recommendations`, `campaign`, `mediaPlan`.

- `POST /api/sfi/lab/report`
  - Acepta `analysis`, `analysisId` o texto nuevo.
  - Devuelve Markdown y JSON estructurado.

- `POST /api/sfi/lab/media-plan`
  - Acepta `analysis`, `analysisId` o texto nuevo.
  - Devuelve `imagePrompts`, `videoPrompts`, `audioDirection`, `shotList`, `publishPlan`.
  - Si `generate: true`, usa el runtime existente de media SFI con prioridad provider.

## Tipos nuevos

Archivo principal: `src/lib/sfi-psi/types.ts`

- `SfiEvent`
- `SfiReappearance`
- `SfiSignal`
- `SfiNode`
- `SfiRegime`
- `SfiVector`
- `SfiHypothesis`
- `SfiLabAnalysis`
- `SfiCampaignProposal`
- `SfiMediaPlan`

La jerarquia operativa es:

event -> reappearance -> signal -> node -> regime.

## Variables SFI

Archivo: `src/lib/sfi-psi/vector.ts`

Calcula 12 variables:

- `P` persistence
- `C` coherence
- `D` direction
- `F` friction
- `A` absorption
- `R` reciprocity
- `V` visibility
- `H` habitability
- `E` expansion
- `U` utility
- `T` tolerance
- `X` extraction

Habitability no se modela como salud. Se calcula como persistencia bajo baja coherencia:

`H = P * (1 - C) * survivalStatus`

Tambien calcula:

- `SFI_CONFIRMATION_SCORE`
- `SFI_AMBIGUOUS_PERSISTENCE_SCORE`

## Deteccion deterministica

Archivo: `src/lib/sfi-psi/analyzer.ts`

El analizador:

- normaliza texto
- extrae tokens
- detecta repeticiones simples
- detecta ecos semanticos por similitud Jaccard
- forma senales
- forma nodos solo si hay recurrencia suficiente, identidad y span temporal cuando existen timestamps
- devuelve `weak_signal` o `insufficient_longitudinal_data` cuando falta evidencia

`dataMode` puede ser:

- `real_input`
- `deterministic_demo`
- `provider_enriched`

## Persistencia

Archivo: `src/lib/sfi-psi/store.ts`

Si existen `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, intenta guardar en Supabase. Si no existe configuracion o falla la escritura, usa fallback local en memoria y lo declara en `persistence.storage`.

Migracion:

- `supabase/migrations/20260616143000_create_sfi_lab_operational_tables.sql`

Tablas:

- `sfi_lab_analyses`
- `sfi_reappearances`
- `sfi_signals`
- `sfi_nodes`
- `sfi_hypotheses`
- `sfi_reports`

Campos minimos de `sfi_nodes` incluidos:

- `id`
- `analysis_id`
- `name`
- `status`
- `first_seen`
- `last_seen`
- `persistence`
- `coherence`
- `friction`
- `visibility`
- `utility`
- `sfi_vector`
- `created_at`

## Campana y media

Archivos:

- `src/lib/sfi-psi/campaign.ts`
- `src/lib/sfi-psi/report.ts`

La campana genera:

- campana sugerida
- publico probable
- formato recomendado
- 3 posts
- 3 captions
- 3 visual prompts
- 1 guion de video corto
- 1 propuesta Medium/LinkedIn
- hashtags sobrios

El lenguaje evita prometer viralidad y usa hipotesis, senal debil, nodo emergente, probabilidad de persistencia y ventana de observacion.

## Providers

Prioridad:

1. Hugging Face
2. Google
3. local deterministic fallback

Variables utiles:

- `HUGGINGFACE_API_TOKEN` o `HF_TOKEN`
- `HF_IMAGE_MODEL`
- `HF_VIDEO_MODEL` o `HF_VIDEO_MODELS`
- `GOOGLE_API_KEY` o `GEMINI_API_KEY`
- `GOOGLE_IMAGE_MODEL`
- `GOOGLE_VIDEO_MODEL`
- `SFI_MEDIA_PROVIDER=auto`
- `SFI_VIDEO_PROVIDER=auto`

`/api/sfi/media/render` ahora devuelve placeholders con `status: "requires_provider"` cuando faltan providers o falla la generacion externa.

## Prueba manual

1. Abrir `/sfi-lab`.
2. Pegar texto con retornos observables, por ejemplo tres lineas con fechas y patrones repetidos.
3. Seleccionar `Detectar señales`.
4. Presionar `Analyze`.
5. Revisar tarjetas de reapariciones, senales, nodos, vector SFI, hipotesis, campana y media plan.
6. Presionar `Generate Report`.
7. Copiar o exportar JSON/Markdown.
8. Presionar `Generate Media Plan`.
9. Para probar media binaria, llamar `POST /api/sfi/lab/media-plan` con `generate: true` y providers configurados.

## Limitaciones

- El upload procesa texto local cuando el archivo es `.txt`, `.md`, `.json` o MIME `text/*`; otros archivos quedan como metadata hasta integrar parsers especializados.
- La persistencia Supabase requiere aplicar la migracion.
- Sin providers externos no se genera imagen/video real; se devuelven prompts, storyboard y placeholders honestos.
- La deteccion semantica es deterministica y simple; no usa embeddings ni LLM remoto.
