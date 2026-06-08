# ROOT Phase 12 - AMV Core + Scoped Runtime

## Que implemente

- Cree AMV como runtime reutilizable por scopes en `src/lib/amv`.
- Separe core, registry, agents boundary y primer scope `root`.
- Agregue `/api/amv` para ejecutar AMV con `{ scope, message, selectedContext }`.
- Reemplace `/api/amv/session` por un inicio de sesion scoped sin escritura en base de datos.
- ROOT queda como primer scope, pero AMV no pertenece a ROOT.

## Que archivos cree

- `src/lib/amv/core/amvRuntime.ts`
- `src/lib/amv/core/amvTypes.ts`
- `src/lib/amv/core/amvResponseCompressor.ts`
- `src/lib/amv/core/amvDecisionPolicy.ts`
- `src/lib/amv/core/amvSourceTrust.ts`
- `src/lib/amv/core/amvDailyBriefing.ts`
- `src/lib/amv/registry/scopeRegistry.ts`
- `src/lib/amv/scopes/root/rootScope.ts`
- `src/lib/amv/scopes/root/rootContextBuilder.ts`
- `src/lib/amv/scopes/root/rootDashboardSpec.ts`
- `src/lib/amv/scopes/root/rootActions.ts`
- `src/lib/amv/agents/index.ts`
- `src/app/api/amv/route.ts`
- `docs/root/ROOT_PHASE_12_AMV_CORE_SCOPED_RUNTIME.md`

## Que archivos modifique

- `src/app/api/amv/session/route.ts`

## Que rutas nuevas existen

- `POST /api/amv`

Body:

```json
{
  "scope": "root",
  "message": "que ruta domina ahora",
  "selectedContext": {}
}
```

## Que rutas viejas siguen vivas

- `POST /api/amv/session`
- `POST /api/amv/respond`
- `POST /api/amv/field-response`
- `POST /api/liturgia/amv`

## Que quedo sin tocar

- Python.
- Supabase schema.
- Migraciones.
- `/api/amv/respond`.
- `/api/amv/field-response`.
- `/api/liturgia/amv`.
- Agentes existentes en `src/agents/*`; se referencian como adapters, no se movieron.

## Como verificar

```powershell
npm run typecheck
npm run check:boundaries
npm run build
```

Prueba manual:

```powershell
$body = @{ scope = "root"; message = "revisa riesgo y cierre"; selectedContext = @{} } | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/amv -ContentType "application/json" -Body $body
```

## Comandos ejecutados

- `rg -n "rootFieldState|rootAttractorState|rootEjectorDetector|rootWsvTranslator|rootMihmTranslator|rootGovernanceTranslator|rootLogbookTranslator|rootTwinProposalTranslator|/api/amv|AMV|amv" -S src docs package.json tsconfig.json`
- `rg --files src\agents src\observatory src\app\api docs\root`
- `git status --short`
- `rg -n "ROOT/VISOR conversational|AMV|rootFieldState|public landing|publish" C:\Users\juan.marin\.codex\memories\MEMORY.md`
- `Get-Content` sobre agentes AMV/ROOT y rutas AMV existentes.
- `New-Item -ItemType Directory -Force -Path src\lib\amv\core,src\lib\amv\agents,src\lib\amv\scopes\root,src\lib\amv\registry,docs\root`
- `npm run typecheck`
- `npm run check:boundaries`
- `npm run build`
- `Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c','npm run dev -- --port 3021')`
- `Invoke-RestMethod -Method Post -Uri http://localhost:3021/api/amv -ContentType 'application/json' -Body $body`
- `Get-NetTCPConnection -LocalPort 3021`
- `Stop-Process` sobre el listener temporal de `3021`

## Riesgos

- `rootFieldState` y traductores ROOT son adapters nuevos porque no existian como modulos previos con esos nombres.
- `patternengine`, `world-spectrum` y `stochastic-engine` quedan declarados como deferred adapters para no disparar llamadas DB/API desde el runtime base.
- `/api/amv/session` cambia de kernel legacy a runtime scoped; si algun consumidor esperaba la forma exacta del kernel generico, debe ajustarse.
- El runtime calcula con heuristicas locales y contexto seleccionado; no persiste ni consulta Supabase por diseno de esta fase.
- `npm run build` pasa, pero conserva warnings existentes de Turbopack sobre tracing amplio en `src/lib/worldspect/runWorldSpectrum.ts`; no fueron introducidos por AMV Phase 12.
