# ROOT Phase 14 - Scope Registry + Dashboard Spec Generator

## Que implemente

- Cree tipos comunes para instrumentos observables y dashboard specs AMV.
- Agregue registro de instrumentos y registro de dashboards.
- Extendi el registro de scopes para poder consultar el instrumento asociado a un scope.
- Converti `rootDashboardSpec` en la primera spec completa de instrumento + dashboard.
- Cree componentes genericos para renderizar paneles desde una spec, sin crear otro dashboard completo ni otro chat.

## Archivos creados

- `src/lib/amv/core/dashboardSpecTypes.ts`
- `src/lib/amv/core/instrumentTypes.ts`
- `src/lib/amv/registry/instrumentRegistry.ts`
- `src/lib/amv/registry/dashboardRegistry.ts`
- `src/observatory/components/amv/ScopedDashboardShell.tsx`
- `src/observatory/components/amv/AmvPanelRenderer.tsx`
- `docs/amv/AMV_SCOPE_CONTRACT.md`
- `docs/amv/AMV_INSTRUMENT_TEMPLATE.md`
- `docs/root/ROOT_PHASE_14_SCOPE_DASHBOARD_REGISTRY.md`

## Archivos modificados

- `src/lib/amv/registry/scopeRegistry.ts`
- `src/lib/amv/scopes/root/rootDashboardSpec.ts`

`RootDashboardClient.tsx` no se modifico en esta fase porque ROOT ya consume AMV visible desde Fase 13 y no hacia falta insertar otro shell visual.

## Como se declara un instrumento

Un instrumento se declara como `AmvInstrumentDefinition` dentro de una `AmvDashboardSpec`.

Debe incluir:

- pregunta ontologica
- objeto observado
- scope
- fuentes
- tablas
- metricas
- agentes requeridos
- acciones permitidas
- acciones prohibidas
- paneles
- riesgo
- evidencia minima
- briefing AMV
- response policy

ROOT queda declarado en:

```txt
src/lib/amv/scopes/root/rootDashboardSpec.ts
```

## Como se renderiza un dashboard desde spec

`ScopedDashboardShell` recibe una `AmvDashboardSpec`.

El shell:

1. muestra el scope, titulo y pregunta ontologica;
2. ordena `spec.panels` por `order`;
3. renderiza cada panel con `AmvPanelRenderer`;
4. no crea runtime, chat, rutas ni acciones.

Esto permite que un futuro instrumento tenga superficie visual desde spec sin nacer como pantalla aislada.

## Que no se toco

- Supabase.
- Python.
- Migraciones.
- Rutas legacy.
- `/api/amv`.
- `/api/amv/session`.
- Componentes legacy fuera del contrato.

## Riesgos

- ROOT ahora tiene una spec mas estricta; futuros cambios deben actualizar instrumento, dashboard y scope juntos.
- Los componentes `ScopedDashboardShell` y `AmvPanelRenderer` son infraestructura, no reemplazo visual de ROOT.
- La spec ROOT contiene declaraciones conservadoras con fuentes derivadas/degradadas donde no hay evidencia observada directa.
- ScoreFriction y otros instrumentos aun no estan registrados; deben declararse desde plantilla antes de crear UI.

## Verificacion

```powershell
npm run typecheck
npm run check:boundaries
npm run build
```
