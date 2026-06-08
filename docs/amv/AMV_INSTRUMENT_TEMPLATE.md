# AMV Instrument Template

Usa este archivo como plantilla para declarar un nuevo instrumento observable. No crees una pantalla antes de tener esta spec.

```ts
import { AMV_DEFAULT_POLICY } from '@/lib/amv/core/amvDecisionPolicy'
import type { AmvDashboardSpec } from '@/lib/amv/core/dashboardSpecTypes'

export const exampleDashboardSpec = {
  id: 'example.dashboard',
  instrumentId: 'example.instrument',
  scope: 'example',
  title: 'Example como instrumento AMV',
  visibleFormat: ['evento', 'resultado', 'efecto', 'ventana', 'ruta_unica'],
  lanes: ['field', 'amv'],
  observationModes: ['focus', 'diagnostic', 'prospective'],
  fieldOperators: ['signal', 'verification', 'closure'],
  outputModes: ['field_reading', 'decision_record'],
  reportRegimes: ['contemplative', 'dissonant'],
  observableObjects: ['senal', 'evidencia', 'decision', 'accion'],
  focusVariables: ['riesgo', 'ejecucion'],
  evidenceTrust: ['verified', 'declared', 'inferred'],
  instrument: {
    id: 'example.instrument',
    name: 'Example',
    ontologicalQuestion: 'Que fenomeno observable debe responder este instrumento?',
    observedObject: 'Objeto observado',
    scope: 'example',
    observationModes: ['focus', 'diagnostic', 'prospective'],
    fieldOperators: ['signal', 'verification', 'closure'],
    outputModes: ['field_reading', 'decision_record'],
    reportRegimes: ['contemplative', 'dissonant'],
    observableObjects: ['senal', 'evidencia', 'decision', 'accion'],
    focusVariables: ['riesgo', 'ejecucion'],
    evidenceTrust: ['verified', 'declared', 'inferred'],
    archiveLayers: ['living_observatory', 'technical_audit'],
    sources: [
      {
        id: 'exampleSource',
        label: 'Fuente visible',
        trust: 'derived',
        reason: 'Por que esta fuente puede sostener lectura.',
      },
    ],
    tables: [
      {
        id: 'context.seed',
        label: 'Contexto visible',
        purpose: 'Lectura sin escritura.',
        trust: 'derived',
        access: 'read',
      },
    ],
    metrics: [
      {
        id: 'exampleMetric',
        label: 'Metrica observable',
        meaning: 'Que decision permite.',
        source: 'exampleSource',
        requiredEvidence: 'Evidencia minima necesaria.',
      },
    ],
    requiredAgents: ['amv'],
    allowedActions: [
      {
        id: 'example.observe',
        label: 'Observar',
        consequence: 'Conserva ruta unica.',
        risk: 'low',
        requiresRootApproval: false,
      },
    ],
    prohibitedActions: [
      {
        id: 'example.write',
        label: 'Escribir datos',
        consequence: 'Fuera del contrato de declaracion.',
        risk: 'hard_stop',
        requiresRootApproval: true,
      },
    ],
    panels: [
      {
        id: 'example.field',
        title: 'Campo',
        question: 'Que esta pasando?',
        observationMode: 'focus',
        fieldOperators: ['signal', 'verification'],
        outputModes: ['field_reading'],
        reportRegimes: ['contemplative'],
        observableObjects: ['senal', 'evidencia'],
        focusVariables: ['riesgo'],
        evidenceTrust: ['verified', 'declared'],
        observes: 'Senales visibles.',
        sources: ['exampleSource'],
        metrics: ['exampleMetric'],
        actions: ['example.observe'],
        risk: 'low',
        minimumEvidence: 'Fuente declarada.',
        emptyState: 'Sin lectura suficiente.',
      },
    ],
    risk: 'low',
    minimumEvidence: 'Fuente visible y politica AMV.',
    amvBriefing: 'Que debe saber AMV antes de responder.',
    responsePolicy: {
      ...AMV_DEFAULT_POLICY,
      visibleStructure: ['evento', 'resultado', 'efecto', 'ventana', 'ruta_unica'],
      forbiddenClaims: ['accion ejecutada sin evidencia'],
      uncertaintyLabel: 'sin lectura suficiente',
    },
  },
  panels: [
    {
      id: 'example.field',
      title: 'Campo',
      question: 'Que esta pasando?',
      observationMode: 'focus',
      fieldOperators: ['signal', 'verification'],
      outputModes: ['field_reading'],
      reportRegimes: ['contemplative'],
      observableObjects: ['senal', 'evidencia'],
      focusVariables: ['riesgo'],
      evidenceTrust: ['verified', 'declared'],
      observes: 'Senales visibles.',
      sources: ['exampleSource'],
      metrics: ['exampleMetric'],
      actions: ['example.observe'],
      risk: 'low',
      minimumEvidence: 'Fuente declarada.',
      emptyState: 'Sin lectura suficiente.',
      lane: 'field',
      order: 10,
      renderMode: 'summary',
    },
  ],
} satisfies AmvDashboardSpec
```

## Pasos para registrar

1. Crear el scope runtime en `src/lib/amv/scopes/<scope>/`.
2. Crear `<scope>DashboardSpec.ts` con `AmvDashboardSpec`.
3. Agregar el scope a `scopeRegistry.ts`.
4. Agregar el instrumento a `instrumentRegistry.ts`.
5. Agregar la spec a `dashboardRegistry.ts`.
6. Renderizar con `ScopedDashboardShell` solo si se necesita superficie visual existente o autorizada.

## Limites

- No crear otro chat.
- No crear otro AMV.
- No tocar Supabase por declarar un instrumento.
- No declarar metricas sin fuente.
- No declarar acciones reales sin evidencia minima y aprobacion correspondiente.
- No promover `unknown`.
- No usar `simulated` o `sandbox` para regimen.
- No mostrar `inferred` salvo que cambie ruta, riesgo o cierre.
- No tratar `fieldOperators`, `outputModes` o `reportRegimes` como autorizacion de ejecucion.
- No tratar `dashboard_state` como permiso para crear dashboards.
