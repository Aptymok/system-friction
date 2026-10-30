# SFI · MIHM P4 · Acceso ROOT gobernado al registro predictivo existente

**Fecha:** 2026-10-30 · **Owner:** SFI Prediction Registry · **MIHM:** Foundation P4 · **Estado:** Integración de código sujeta a CI y despliegue. **Sin nuevo registro, permiso, tabla ni agente.**

## Qué se encontró

- `src/app/api/sfi/predictions/route.ts` ya crea y lee predicciones bajo sesión web de ROOT.
- La conexión ChatGPT ya tiene `operateSfiRoot` autenticado, con `root:operate`, OAuth institucional `root_delegate`, tenant `sfi` y comprobación del perfil soberano en la base de datos. No es suficiente poseer el scope.
- `public.sfi_prediction_entries` y `public.sfi_prediction_verifications` están presentes, ambas con **cero filas** a las 2026-10-30T12:50:04Z.
- El caso científico MIHM ya existe en Case Platform; registro de diagnóstico P4 confirmado como análisis, **no predicción**.
- El gateway carecía de operación para reutilizar el writer predictivo existente. Abrir un nuevo writer por SQL o ensanchar `cases:write` sería un bypass.

## Delta de integración

La operación ya autorizada `operateSfiRoot` expone dos suboperaciones:

- `predictions_list`: lectura limitada del registro predictivo existente, sin mutación.
- `predictions_create_p4`: una predicción cuantitativa prospectiva, confirmada explícitamente y sujeta al mismo gate soberano ROOT y al servicio preexistente `createPredictionEntry`.

Antes de crear, exige caso abierto en `sfi_cases`, referencia de hipótesis MIHM, números finitos, modelo convencional y candidato distintos con mismas fuentes, intervalos válidos, objetivo futuro en no más de 14 días, y cada fuente declarada como capturada y disponible antes del servidor T0. No acepta fechas de registro provistas por el cliente, datos ya observados, retornos, intervenciones ejecutadas ni `created_by` personalizado. El servidor asigna identidad y fecha reales.

**Limitación innegociable:** una huella SHA suministrada por el emisor no certifica por sí sola la respuesta original ni su fecha de publicación. El recibo de registro se identifica como predicción emitida, no como evidencia verificada, cumplimiento, causalidad, homeostasis o RETURN. Para el primer ensayo científico se requerirá adicionalmente una captura oficial reproducible y una verificación externa posterior.

## No cambiar

Se conserva `requireSovereignRoot`, scopes OAuth preexistentes, `routeAllowsPersonalScope`, tablas/RLS, P0–P4, fórmulas, visual grammar y la capa de verificación. No se implementa un cron, ni se exponen operaciones del registro a credenciales personales o tokens estáticos. El gateway no concede roles ni modifica membresías.

## Admisión experimental

1. Tomar una fuente oficial reciente (p. ej. NYC 311), guardar respuesta/huella/horas de disponibilidad observadas. **No usar series retrospectivas sin versión T0**.
2. Calcular dos estimaciones para un mismo día y población con las mismas fuentes; congelar modelo, versiones e intervalos en el recibo.
3. Invocar `operateSfiRoot` con `predictions_create_p4`, confirmación explícita y caso MIHM existente. Verificar por lectura del registro.
4. Una vez transcurrido el objetivo, obtener medición observada real y procesar la verificación por la superficie autorizada. Repetir cohorte antes de declarar habilidad predictiva.

**Estado al escribir este documento:** no hay resultados prospectivos reales. Un `SUCCESS` del build no equivale a despliegue operativo ni a predicción emitida.

## QA

```bash
node --import tsx --test src/lib/mihm/foundationProspectiveScoring.test.ts
```

Los suites MIHM y SFI ya incluyen este test y el build. Revisar la respuesta de `operateSfiRoot/capabilities` en producción, más una lectura `predictions_list`, antes de emitir la primera predicción. 
