# SFI — reconciliación exhaustiva de 43 ramas, 24–25 octubre de 2026

**Repositorios**: `Aptymok/system-friction`. **Destino exclusivo de integración**: `work/reality-chain-integration-20261024`. **Rama productiva**: `main` (no se borrará ni promoverá silenciosamente). **Fuente**: inventario GitHub REST de 43 ramas, comparaciones `compare_commits` contra destino y blobs exactos de los archivos; recibo de limpieza [40160574174](https://github.com/Aptymok/system-friction/actions/runs/40160574174).

## Significado verificable de los estados

- **INTEGRADA / CONTENIDA · ELIMINADA**: el commit cabeza histórico es antecesor del destino; la referencia remota fue eliminada, pero los objetos Git se conservan por ascendencia. El árbol final de trabajo prevaleció sobre el contenido antiguo.
- **PARCIAL PRESENTE**: componentes identificados ya coinciden por SHA de blob; diferencias restantes pueden ser versiones anteriores, cambios no combinados o regresiones. No eliminar aún la rama ni declarar aceptación de la capacidad completa.
- **RESCATADA**: archivos ausentes se incorporaron al destino; requieren prueba y cableado. Una fuente en árbol no prueba ejecución real.
- **PENDIENTE / ALTO RIESGO**: se conserva hasta comparar código, regresiones, migraciones y límites de autoridad. Una rama divergente no es prueba de que toda su función falte.

## Inventario original — 43 de 43

| Rama original | ¿Qué agregó o contenía? | Decisión comprobada | Motivo y condición |
|---|---|---|---|
| `main` | Rama productiva histórica; código desplegable, políticas e identidad institucional | **BASE (conservar)** | No se altera ni elimina mientras sea rama predeterminada. |
| `work/reality-chain-integration-20261024` | C01–C20: Reality Chain, API/Passport, agentes, Timeline, Case Platform, análisis y pruebas | **DESTINO (conservar)** | Conservar las implementaciones nuevas; reconciliar por función y no sobrescribirlas. |
| `feat/adaptive-attractor-reconfiguration-20261022` | ScoreFriction adaptive_plan, propuestas de reconfiguración y ruteo de agentes | **PENDIENTE SELECCIÓN** | Difiere en regimeWatch/router; sólo trasladar criterios y permisos no subsumidos. |
| `feat/attractor-72h-contest-case-intake-20261021` | Hipótesis condicional 72 h, contestabilidad y criterios de admisión de casos | **PENDIENTE SELECCIÓN** | Parte de exploración ya coincide; reconciliar pruebas/guardas de intake. |
| `feat/institutional-evolution-cognitive-inactivity-20261021` | Diagnóstico de inactividad cognitiva y evolución institucional | **PARCIAL PRESENTE** | Los cuatro módulos nucleares coinciden por blob; revisar cambios de router. |
| `feat/intake-generated-hypothesis-criteria-20261021` | Intake con hipótesis derivadas, interfaces personales y Method Lab | **PARCIAL PRESENTE** | Seis archivos exactos en destino; comparar únicamente QA divergente. |
| `feat/method-lab-independent-review-dossier-p3` | Dossier de revisión independiente de investigación y pruebas | **PARCIAL PRESENTE** | Módulo/prueba idénticos; documento no publicado fue retirado por política de divulgación, no reintroducir sin control. |
| `feat/method-lab-possibility-field-20261021` | Campo de posibilidades y ramas hipotéticas del Method Lab | **PARCIAL PRESENTE** | UI y engine de ramas idénticos; diferenciales en exploración y QA. |
| `feat/reality-chain-private-reconciliation-20261024` | Comparación determinista del plan con eventos, control de cobertura | **INTEGRADA · ELIMINADA** | Módulos ya idénticos; historia incorporada en commit de reconciliación. |
| `feat/research-assurance-p1-p5` | Assurance y evaluación metodológica P1–P5 | **PARCIAL PRESENTE** | Contrato actual ampliado; proteger garantías y revisar regresiones antes de integrar versión antigua. |
| `feat/synthetic-research-review-smoketest-20261022` | Prueba sintética de revisión y fixture cognitivo | **PARCIAL PRESENTE** | Dos runners idénticos; revisar CI antigua sin sustituir CI más nueva. |
| `feat/825-chronos-executable-ci-receipt` | Recibo CI para CHRONOS con ejecución sintética reproducible | **PARCIAL PRESENTE** | Runner, prueba y guía idénticos; CI actual tiene más etapas. |
| `feature/discovery-model-independent-opportunity-cycle-20261020` | Radar sin LLM: investigación opt-in, RSS, persistencia con abstención | **RESCATADA · VALIDACIÓN EN CURSO** | Se recuperaron documento y módulo ausentes; se adaptó firma de actor y bloqueo explícito de LLM. Sin habilitar cron. |
| `fix/access-authentication-20261021` | Callback de invitación, acceso, recuperación y passkeys | **INTEGRADA · ELIMINADA** | 13 archivos coinciden exactamente en destino; no cambiar Auth nuevamente. |
| `fix/adaptive-72h-sedimentation-gates-20261022` | Guardas de sedimentación de hipótesis y efecto diferido | **INTEGRADA · ELIMINADA** | Los tres archivos del cambio coinciden exactamente con destino. |
| `fix/adaptive-case-evidence-provenance-20261022` | Exigencias de procedencia del caso/observación | **PENDIENTE REVISIÓN** | Cambios históricos a watch/test difieren; no reemplazar validación más nueva. |
| `fix/adaptive-material-action-boundary-20261022` | Impide ejecución material sin autoridad sobre propuestas adaptativas | **PARCIAL PRESENTE** | Router y su QA coinciden; analizar diferencia de ScoreFriction. |
| `fix/assurance-verify-contents-20261022` | Control de contenido y restricciones de assurance en CI | **PARCIAL PRESENTE** | Módulo y pruebas coinciden; preservar pipeline CI posterior. |
| `fix/ci-discovery-p8-locked-operational-20261021` | Regresión de integración visual Discovery P8 | **PRESENTE · LIMPIEZA PENDIENTE** | QA idéntica; historia contenida pero la eliminación inicial no tuvo confirmación. |
| `fix/continuity-outbox-drain-20261022` | Drenaje limitado de PRIMARY/Neon, controles de cron | **PARCIAL PRESENTE** | Workflow igual; QA y lógica de reconciliación posteriores difieren. Requiere pruebas de data plane. |
| `fix/empirical-contrast-idempotence-20261022` | Fingerprint de RETURN, RPC transaccional y test de concurrencia | **ALTO RIESGO · POR INTEGRAR** | Migraciones y pruebas exclusivas ausentes del árbol actual; no desplegar SQL sin validar permisos/contratos. |
| `fix/evidence-inventory-method-lab-20261021` | Inventario institucional de evidencia, panel y lectores | **PARCIAL PRESENTE** | Siete componentes nucleares coinciden; diferencias sólo de paquete y montaje de Method Lab. |
| `fix/explicit-llm-off-cognitive-20261021` | Cognitive runtime con opt-out de modelo y política LLM | **PARCIAL PRESENTE** | Política/pruebas exactas; verificar cambio al ejecutor sin perder controles actuales. |
| `fix/mem003-tenant-members-semantic-recovery` | Rescate semántico de membresías y autoridad multi-tenant | **PARCIAL PRESENTE** | Cinco módulos/pruebas exactos; recuperación específica divergente de código reciente. |
| `fix/method-lab-disclosure-guard-20261022` | Restricción de lectura y divulgación de reportes Method Lab | **INTEGRADA · ELIMINADA** | Nueve archivos exactos; conservar restricción de auditoría. |
| `fix/p0-paged-fingerprint-recovery-20261023` | Huellas de recuperación paginadas con fallos seguros | **CONTENIDA · ELIMINADA** | Cero commits exclusivos; historia ya antecesora. |
| `fix/root-schedule-projection-20261023` | Proyección fiel del cron de continuidad | **CONTENIDA · ELIMINADA** | Cero commits exclusivos; historia ya antecesora. |
| `fix/world-criterion-evidence-adjudication-20261022` | Criterios y decisión de evidencia en World | **INTEGRADA · ELIMINADA** | Tres archivos coinciden; historia preservada. |
| `fix/world-cron-hypothesis-resume-gates-20261022` | Reanudación de hipótesis bajo guardas de cron World | **INTEGRADA · ELIMINADA** | Cron y prueba exactos; historia preservada. |
| `fix/world-partial-resume-cooldown-20261022` | Cooldown ante resultados World parciales | **PARCIAL PRESENTE** | Ruta idéntica; QA histórica distinta. |
| `fix/world-repeat-retry-evidence-gate-20261022` | Suspensión de reintentos repetidos sin observación nueva | **RESCATADA · CABLEADO PENDIENTE** | Helper ausente restaurado; falta confirmar instalación en cron/OAuth actual. |
| `fix/804-recovery-journal-drain` | Coordinación del diario de continuidad y QA | **PARCIAL PRESENTE** | QA de coordinación coincide; cron/recovery posteriores diferentes. |
| `fix/825-return-contrast-idempotency-20261022` | Evitar duplicación de RETURN por input semántico idéntico | **PARCIAL PRESENTE** | Tres archivos núcleo idénticos; CI divergente (preferir nueva). |
| `release/continuity-outbox-gate-20261022` | Disparador histórico de despliegue de continuidad | **HISTORIA · ELIMINADA** | Solo cambia marcador de deploy; no reintroducir trigger productivo antiguo. |
| `release/mem003-tenant-parity-20261022` | Disparador histórico de liberación de membresías | **HISTORIA · ELIMINADA** | Preservado como padre Git; no sobrescribir el trigger moderno. |
| `release/p4-return-contrast-idempotency-20261022` | Disparador de liberación P4 | **INTEGRADA · ELIMINADA** | Marcador de deploy idéntico a destino, historia preservada. |
| `release/security-restrict-method-lab-audit-20261022` | Disparador de liberación de restricción de auditoría | **HISTORIA · ELIMINADA** | No repetir despliegue antiguo ni alterar controles de acceso. |
| `release/sfi-assurance-integrity-20261022` | Disparador de liberación de assurance | **HISTORIA · ELIMINADA** | No repetir despliegue antiguo, conservar historia. |
| `work/reality-chain-case-inspector-20261023` | Inspector visual de casos Reality Chain | **PARCIAL PRESENTE** | Componente idéntico; Workbench destino tiene cambios posteriores. |
| `work/reality-chain-generic-ingestion-20261023` | Contrato de ingesta gobernada y fronteras OAuth | **INTEGRADA · ELIMINADA** | Documento perdido recuperado y ancestro Git preservado. |
| `work/reality-chain-integrity-20261023` | Integridad básica de Reality Chain | **CONTENIDA · ELIMINADA** | Cero commits exclusivos. |
| `work/reality-chain-multitenant-governed-sync-20261023` | Sync gobernado multi-tenant para Reality Chain | **INTEGRADA · ELIMINADA** | Script y prueba Python ya idénticos; historia incorporada. |
| `work/timeline-canonical-cases-projects-20261024` | Timeline canónico de casos y proyectos | **CONTENIDA · ELIMINADA** | Cero commits exclusivos. |

## Orden de integración seguro

1. **Integridad y autoridad**: no sustituir `main`, RLS, OAuth, delegación, identidad ni clasificación de evidencia; conservar comparaciones y pruebas.
2. **Continuidad**: validar migraciones idempotentes de `fix/empirical-contrast-idempotence` y divergencias de outbox/journal en PG aislado antes de instalar cualquier SQL. No aceptar green CI como certificado de espejo.
3. **Ejecución cognitiva**: analizar ScoreFriction, ruteo, reintentos World e hipótesis de 72 h, incorporando sólo control adicional, sin reemplazar contratos modernos.
4. **Observación e investigación**: Discovery opt-in deterministic sin LLM, Method Lab y evidencia; conservar seguridad de divulgación. Cotejar las líneas de tiempo con fuentes.
5. **Cliente y SFI web**: validar ROOT, Reality Chain, Passport y lectura de caso con roles y recibos reales.
6. **CI y limpieza**: `typecheck`, build, PostgreSQL aislado, Timeline, pruebas específicas y finalmente borrado solo tras ascendencia, coincidencia exacta de SHA y constancia de decisión.

**Criterio que no se debe falsificar:** que una rama esté integrada como historia Git no significa que su parche se haya incorporado al árbol actual, ni que la capacidad se haya verificado en producción. Ninguna rama divergente se borrará como «funcionalmente resuelta» por el único hecho de conservar sus commits. Una rama que ya no sea necesaria puede preservarse como historia antes de su eliminación, pero su exclusión del árbol activo debe tener motivo documentado. El objetivo de reducción de referencias no justifica perder capacidad, derechos, autoridad ni evidencia.

**Barrera operacional actual**: PRIMARY/Neon divergen y KXTXR no tiene un canario C07 ni informe C19 recuperado. La reconciliación de ramas no modifica esos datos. No fusionar `main`, no publicar, no gastar, no promover RETURN durante esta limpieza.


## Archivo inmutable y limpieza posterior (verificación del 25-oct)

- Commit `4b80c0ce27ffb8abbe4405c0fe04a49dd257aa23` incorpora como padres Git los **17 HEAD divergentes restantes** sin reemplazar el árbol moderno; los 17 commits y sus archivos originales son navegables por historia, incluso si se borra la referencia corta.
- SFI Verify exact-head `40161124588`: **SUCCESS**. No demuestra aún equivalencia funcional de cada variante antigua ni funcionamiento productivo.
- Permanecen **rutas con estado de aceptación pendiente**: ScoreFriction/adaptive, evidencia/calibración, outbox/membresía, investigación independiente y deduplicación SQL. No ejecutar migraciones antiguas ni reemplazar código de autorización por versiones pasadas durante la limpieza.
- Las capacidades realmente agregadas al árbol moderno incluyen la recuperación opt-in del ciclo Discovery (sin LLM), el guard de reintentos de World y el contrato documental de ingesta gobernada. El código adicional de migraciones de fingerprint/RETURN y algunos tests del histórico están conservados en ancestros, **no instalados**.
- **La eliminación de una referencia remota es higiene de Git, no certificado de cobertura funcional**. El programa C01–C20, la paridad Supabase/Neon y las pruebas de cliente siguen abiertos.
- A partir de esta auditoría, las decisiones históricas PENDIENTE de la tabla significan **conservar la versión activa actual y archivar la alternativa**, no restaurar un parche antiguo a ciegas. Cualquier cambio posterior precisa diff por función, pruebas y autoridad.
