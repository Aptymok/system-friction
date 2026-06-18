# SFI Operational Closure QA

Fecha: 2026-06-18

Issue: https://github.com/Aptymok/system-friction/issues/82

## Criterios cubiertos

1. World vectors no requieren evidencia de usuario nuevo para pasar QA.
2. Cada vector declara `world_external`, `sfi_internal`, `user_internal` y `case_internal`.
3. User/case ausente se reporta como `user_not_calibrated`, no como falla de mundo.
4. Ningun vector puede reclamar calibracion de usuario sin evidencia user/case.
5. `/world-vector` consume `/api/worldspect/longitudinal`.
6. `/world-vector` muestra timeline, atractores, oportunidades y Evidence Trace Explorer.
7. `/api/worldspect/attractors` devuelve clusters derivados de snapshots con `evidence_basis`.
8. `/api/worldspect/opportunities` devuelve aperturas observables con `basis.evidence_refs`.
9. AMV responde con evidencia usada, evidencia faltante, claims permitidos y bloqueados.
10. Sin objeto, ScoreFriction no genera intervencion.
11. Objetos audio/image/video sin analizador devuelven `analysis_unavailable`.
12. El reporte formal incluye objeto, tipo, claims, analizadores y warnings.
13. ROOT consume capas operacionales y muestra `Operational organism`.
14. Fallbacks/degraded se exponen como warnings, no como exito real.

## Comandos

```powershell
npm run typecheck
npm run build
node scripts/qa-worldspect-traceability.mjs
node scripts/qa-worldvector-observatory.mjs
node scripts/qa-sfi-operational-closure.mjs
```

## Resultado esperado

Todos los scripts deben devolver `ok: true`.

Si Supabase falla por certificado local o corporativo, el sistema debe reportar `history_unavailable`, `supabase_ok=false` o warnings equivalentes. La correccion ambiental permitida es configurar `NODE_EXTRA_CA_CERTS` con la CA correspondiente. No usar `NODE_TLS_REJECT_UNAUTHORIZED=0` como solucion permanente.

## Frase de control

SFI does not claim what it cannot trace.
