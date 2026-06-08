# ROOT Phase 13 - ROOT AMV Interface + Legacy Route Rewire

## Que implemente

- Conecte el panel conversacional visible de ROOT al runtime scoped AMV existente.
- ROOT ahora inicia sesion AMV con `POST /api/amv/session` usando `scope=root`.
- ROOT envia preguntas visibles a `POST /api/amv` con `scope=root`, `message` y `selectedContext`.
- Cambie la interfaz visible de "Chat Twin", "Twin / AMV" y chat paralelo del modo de lectura a AMV.
- La respuesta visible de AMV usa la compresion del runtime: evento, resultado, efecto, ventana y ruta unica.
- Cambie los estados MIHM sin objeto focal a lectura basal visible:
  - `MIHM basal · Aptymok / n_0`
  - `MIHM basal · sin evidencia nueva`

## Archivos creados

- `docs/root/ROOT_PHASE_13_ROOT_AMV_INTERFACE.md`

## Archivos modificados

- `src/observatory/components/root/RootDashboardClient.tsx`
- `src/observatory/components/root/TwinInteractionPanel.tsx`
- `src/observatory/components/root/GlobalMetricsView.tsx`
- `src/observatory/components/root/AcpProposalConsole.tsx`
- `src/observatory/components/root/VisorMode.tsx`
- `src/observatory/components/root/VisorChat.tsx`
- `src/observatory/components/root/VisorSidebar.tsx`
- `src/observatory/components/root/VisorGoldenNode.tsx`
- `src/observatory/components/root/visorHooks.ts`
- `src/lib/root/rootFieldState.ts`
- `src/lib/root/rootMihmTranslator.ts`
- `src/lib/root/rootTwinProposalTranslator.ts`
- `src/lib/amv/scopes/root/rootScope.ts`
- `src/lib/amv/scopes/root/rootDashboardSpec.ts`

## Rutas que usa ROOT ahora

- `POST /api/amv/session`
  - Body: `{ "scope": "root" }`
  - Uso: sesion inicial y briefing diario disponible.
- `POST /api/amv`
  - Body: `{ "scope": "root", "message": "...", "selectedContext": {} }`
  - Uso: interlocutor principal AMV en ROOT.

## Rutas legacy que siguen vivas

- `POST /api/amv/respond`
- `POST /api/amv/field-response`
- `POST /api/liturgia/amv`

## Consumidores legacy encontrados

- `/api/amv/respond`
  - `src/observatory/components/terminal/AMVChat.tsx`
- `/api/amv/field-response`
  - `src/observatory/components/field/SfiCognitiveCanvasTerminal.tsx`
- `/api/liturgia/amv`
  - `src/observatory/components/root/LiturgiaDiagnosticPanel.tsx`
  - `src/observatory/components/field/SfiCognitiveField.tsx`
  - `src/observatory/components/field/SfiFieldShell.tsx`
  - `src/observatory/components/field/fieldOntology.ts`

## Candidatas a eliminar

- Ninguna ruta legacy queda segura para borrar en Fase 13 porque todas tienen consumidores vivos fuera del panel AMV principal de ROOT.
- `POST /api/amv/respond` queda como candidata prioritaria a migrar o clausurar cuando `src/observatory/components/terminal/AMVChat.tsx` deje de consumirla.
- `POST /api/amv/field-response` queda candidata a migracion posterior del terminal/campo hacia AMV scoped.
- `POST /api/liturgia/amv` queda candidata a aislamiento posterior porque aun alimenta LiturgiaDiagnosticPanel y campo.

## Como verificar

```powershell
npm run typecheck
npm run check:boundaries
npm run build
```

Prueba manual con servidor local:

```powershell
$body = @{ scope = "root"; message = "que ruta domina ahora"; selectedContext = @{} } | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/amv -ContentType "application/json" -Body $body
```

En `/root`, abrir AMV y confirmar que la respuesta se muestra como:

- evento
- resultado
- efecto
- ventana
- ruta unica

Nota: en la verificacion local sin sesion autenticada, `/root` redirigio a `/login`. Se verifico el endpoint scoped en el dev server y respondio `ok: true`, `scope: root` y respuesta comprimida.

## Comandos ejecutados

- `rg -n "FASE 13|Fase 13|AMV|TwinInteractionPanel|/api/amv/respond|/api/amv/field-response|/api/liturgia/amv|Chat Twin|Twin / AMV|Visor Chat|sin objeto" -S .`
- `rg -n "ROOT Fase 0-2|ROOT/VISOR conversational|publish flow|Fase 12|AMV" C:\Users\juan.marin\.codex\memories\MEMORY.md`
- `Get-Content -LiteralPath constitution.md -TotalCount 220`
- `Get-Content -LiteralPath phases.md -TotalCount 260`
- `Get-Content` sobre componentes ROOT, rutas AMV y runtime AMV.
- `rg -n "Chat Twin|Twin / AMV|Visor Chat|ROOT VISOR / Chat|sin objeto|sin objeto observado|/api/ai" src\observatory\components\root src\lib\root src\lib\amv -S`
- `rg -n "/api/amv/respond|/api/amv/field-response|/api/liturgia/amv" src docs package.json -S`
- `npm run typecheck`
- `npm run check:boundaries`
- `npm run build`
- `Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c','npm run dev -- --port 3023') -WorkingDirectory 'D:\system friction' -WindowStyle Hidden`
- Browser: `http://localhost:3023/root` redirigio a `/login` sin sesion autenticada.
- Browser/API: `POST http://localhost:3023/api/amv` con `{ "scope": "root", "message": "que ruta domina ahora", "selectedContext": {} }`.

## Riesgos

- `TwinInteractionPanel.tsx` conserva el nombre de archivo y export para no romper imports, pero su UI y fetch ahora son AMV.
- El modo de lectura libre conserva nombres internos de tipos `visor` para minimizar riesgo, pero el submit visible ya usa `/api/amv`.
- Las rutas legacy no se borraron porque aun tienen consumidores reales.
- `ArtifactRoutingPanel` y observaciones de campo siguen usando `/api/twin/propose`; no son chat AMV principal y no se migraron en esta fase para no mezclar propuestas ACP con el runtime scoped.
- La verificacion visual autenticada de `/root` queda pendiente de una sesion valida; el endpoint AMV scoped fue verificado localmente.
