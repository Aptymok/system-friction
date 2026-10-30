# MIHM · Integración de campos tipados, trayectorias, atractores y ciclos

**Corte:** 2026-10-28 · **Estado:** `RESEARCH_ONLY / P0–P2 ENGINEERING / NOT EMPIRICALLY VALIDATED`.

**Padre:** `SFI-SYSTEM-CONTRACT-1.0`, `SFI-MIHM-FOUNDATION-RESEARCH-0.1`. **Métodos por dominio:** MOP-H, ScoreFriction, PPOI, WorldSpect y SFI Institutional, cada uno con su Φ propio, sin agregación entre métodos. `REDUCED_KERNEL_CONTINUITY` no es Φ canónico. **Expediente:** Case Platform MIHM `619cfd32-7c99-4e45-ab54-175c3f79d48e`. **Objeto:** `SFI-MIHM-TOTAL-AMBITION-CAPABILITY-INVENTORY-20261028`.

## Qué se incorpora realmente en PR #854

`src/lib/mihm/foundationTypedFieldAudit.ts` es una **función pura de auditoría del mismo sistema padre**, no un segundo motor de predicción ni un autor de evidencias. Rechaza que un valor simulado o inferido entre como MEASURED; exige identificadores de nodo y dimensión pertenecientes al modelo, unidades y familia estables, reloj de evento y disponibilidad, fuente admitida en el corte documental y ausencia de duplicados. El cero medido no es dato faltante.

**Familias de campos tipados** (dominios de dimensión, no una nueva familia de Φ): `PHYSICAL`, `INFORMATIONAL`, `OPERATIONAL`, `INSTITUTIONAL`, `ECONOMIC`, `TEMPORAL`, `COGNITIVE`, `DIGITAL`, `ECOLOGICAL`. Cada campo requiere `nodeRef`, `dimensionRef`, `unit`, `observedAt`, `availableAt`, `sourceRef`, `value|null`, estado `MEASURED|MISSING|INFERRED|SIMULATED|CONTRADICTED`. Las unidades distintas **nunca** se suman automáticamente.

**Ontología original preservada:** `NODE, DIMENSION, RELATION, FLOW, CONSTRAINT, STATE, FRICTION, PERTURBATION, TRAJECTORY, ATTRACTOR, TRANSITION, EMERGENCE`. Declarar un tipo no demuestra que el mecanismo haya sido observado. `MIHM-T` sigue siendo la extensión temporal experimental hija del padre.

El auditor devuelve:
- **Trayectoria:** diferencias y tasa por hora entre observaciones fechadas del **mismo nodo/dimensión/unidad**, con dirección de degradación condicionada a límites declarados; no equivale a una ley de evolución.
- **Restricciones:** conteo descriptivo de mediciones que violan un límite declarado; exige unidades compatibles y no infiere daños a usuarios.
- **Propagación:** únicamente `TEMPORAL_ASSOCIATION_CANDIDATE` bajo una relación tipada y series cronológicas suficientes, siempre `causal:false`. Para probar propagación real se requieren mecanismos, retardo, rivales y contrastes.
- **Atractor:** repetición en banda de valores del **mismo nodo**. La estabilidad aparente no identifica un atractor dinámico; requiere historial perturbado, relajación/reversibilidad, regresión a la banda y comparación con alternativas.
- **Proyección:** `projectedState:null` hasta tener dinámica entrenada sin fuga temporal, corte T0, incertidumbre/intervalos y validación independiente.
- **Recursos por ciclo:** `cycleRef`, unidad, importe, marca temporal, fuente y estado para tokens, CPU, llamadas, dinero, energía y otros. Si falta un recibo, devuelve `amount:null`, nunca importe cero ni total con unidades mezcladas.
- **Autoridad:** ningún acto externo, Φ canónico, homeostasis causal ni RETURN se emite por este auditor.

## Alineación explícita de las 21 familias originales

Estado de origen conservado del inventario de Case Platform del 28-oct; estos estados no son promociones nuevas.

| # | Familia original | Puerta de integración y estado |
|---|---|---|
| 1 | Frontera e identidad nodal | MODELO FORMALIZADO: reutilizar nodo y dimensión canónicos; faltan ciclos empíricos unidos |
| 2 | C/E/L/K/R/M, carga y redistribución | FÓRMULAS SIN RECONCILIAR: requiere unidades/proxies y latencia real |
| 3 | IHG/ICE/CRM y matemáticas de intervención | LEGADO CONTRADICHO: sin mutación de historia ni canon |
| 4 | Tres patologías del sistema | HIPÓTESIS DECLARADAS: validar alarmas y falsos positivos |
| 5 | Reequilibrio y cortafuegos estructurales | PROPUESTA HISTÓRICA: no ejecutar contención/desconexión sin autoridad |
| 6 | NTI, integridad y autoridad | COLISIÓN SEMÁNTICA PARCIAL: separar índice de permiso |
| 7 | Metrología, observación mínima y proxies | IMPLEMENTADO PARCIALMENTE: tipar ausencias, fuentes, error y T0 |
| 8 | Incertidumbre/Sobol/Monte Carlo/Lyapunov | HISTÓRICO NO VERIFICADO: semillas, intervalos, pruebas separadas |
| 9 | Trayectorias, atractores y regímenes | EXPERIMENTAL: sólo delta descriptivo y banda, no dinámica probada |
| 10 | Contrafactuales/retrolongitudinal | CÓDIGO Y DOCUMENTOS PARCIALES: evitar fuga de futuro |
| 11 | Resolver multidominio y familia Φ | CANÓNICO CON CÓDIGO: sin promedio entre Φ_H/Φ_S/Φ_F/Φ_W/Φ_SFI |
| 12 | Traducción entre dominios | PROPUESTO PARCIAL: carrier, pérdidas y traducción verificables |
| 13 | Audio, imagen, video y biología | EXPERIMENTOS SIN RÉPLICA INDEPENDIENTE: no usar proxies como equivalentes |
| 14 | Música↔WorldSpect | ESPECIFICACIÓN NO PROBADA END-TO-END: conservar identidad de señales |
| 15 | Integración multisistema/mundo | DATOS HISTÓRICOS PARCIALES: fronteras y horarios heterogéneos |
| 16 | Observación real y asíncrona | RUNTIME FRAGMENTADO: conciliar ciclos, cron, costes y recibos |
| 17 | Predicción, hipótesis y baselines | RETROSPECTIVO ADVERSO: M2 Manhattan perdió contra controles |
| 18 | Intervención mínima gobernada | GOBERNANZA SIN EJECUCIÓN DEL CASO: requiere autoridad |
| 19 | Reality Chain/RETURN/aprendizaje | DISEÑADO, NO CERRADO: mismos case/cycle y T1 auténtico |
| 20 | Ingesta y explicación usable | SUPERFICIES PARCIALES: prueba humana integral pendiente |
| 21 | Transferencia entre dominios/instituciones | HIPÓTESIS: replicación independiente NYC→AGS y otros |

## Universo operativo digital, ciclos y costes

**Consulta real por SFI Personal (2026-10-29T02:59:17Z):** 21 agentes registrados; 9 con ejecución en las últimas 24 horas, 12 sin ejecución reciente pero listos, 0 degradados y 0 sin executor; tres ciclos universales abiertos. Esto sólo demuestra visibilidad de ejecución según recibos de la plataforma. **No** prueba homeostasis ni que los 21 actúen autónomamente cada hora. Tokens, GPU/CPU, API, energía, dinero y costes por ciclo no se retornaron como mediciones: `MISSING/NOT_MEASURED`, jamás 0.

**Ciclos posteriores:** preservar `caseId`, `cycleId`, `agentId`, `methodId`, `sourceId`, versión, T0 (evento + disponible), registro de inferencias, propuesta, autoridad, T1, RETURN y coste/unidad realmente facturado. Registrar también abstenciones, demoras de datos, fallos de egreso y acciones rechazadas por política. No confundir un estado estable con recuperación.

## Puertas restantes P0–P5

**P0:** reconciliar IHG v2 y Monte Carlo históricos con fórmulas versionadas y propietario; proteger null ≠ 0 en callers reales.  
**P1:** fuentes originales medibles, dimensiones y disponibilidad en T0, unidades, sesgo, relojes y recursos con recibos.  
**P2:** ejecutar el selector y cada instrumento relevante sobre datos válidos; clasificar las 21 familias como ejercidas o no, sin equivalencias entre dominios.  
**P3:** comparar proyecciones y decisiones contra M0/otras herramientas con misma información, gasto y holdout, incluyendo M2 que perdió.  
**P4:** mínimo acto reversible dentro de una autorización, y retorno observado de manera independiente.  
**P5:** revisión externa y publicación con reproducción, alternativas, resultados adversos y costes.

**Criterio de bloqueo:** no se podrá declarar «MIHM integrado y validado» porque el contrato de investigación compile o porque un registro permanezca abierto. La última lectura del caso maestro seguía con **0 evidencia canónica, 0 ejecuciones empíricas de instrumento vinculadas y 0 RETURN externos**.


## Existing scientific caller integration — 2026-10-29

Draft increment: `executeMihmTypedFieldForNode` consumes only an explicit persisted graph attribute `mihmTypedFieldAudit={caseRef,cycleRef,input}`. The boundary subject must match the graph node, the cutoff must not be future, and every source record must be in node lineage. Invalid input abstains. Source declarations are not independently verified measurements. Calibration is explicitly `NOT_CALIBRATED`.

The existing JR bounded scientific target list now includes nodes carrying this input even when conventional method competition has no candidate. `executeScientificMethodsForNode` invokes the audit and returns it to the existing `persistScientificMethodExecutions` writer. No second runtime or writer is introduced. Existing persistence currently acknowledges the event writer; exact deep reread verification remains pending and is NOT claimed by this increment.

Preflight:
- Owner: MIHM scientific runtime consumed by JR; existing field scientific execution owner.
- Existing capability inspected: typed audit PR854, foundation gate, scientificMethodRuntime, jrFieldCycle and canonical architecture.
- Absorb vs create decision: extend existing audit/runtime/caller; new file is a test only.
- Authoritative writer: existing persistScientificMethodExecutions / appendEpistemicEvent.
- Persistence/lineage impact: same DERIVED event; preserve full audit, case/cycle refs and declared source lineage.
- Front delta: NONE.
- Back delta: explicit typed input admission and bounded execution through existing caller.
- DB delta: NONE.
- Redundancy removed: no parallel implementation added; PR854 instrument absorbed into this candidate.
- Execution/ROOT boundary: derived screening only; no evidence admission, action, RETURN, calibration, formula or canon promotion.
- Rollback: revert caller integration; retain immutable historical receipts.
- Verification: 17 typed tests and 2 actual-runtime tests passed locally with Node24; canonical architecture, boundaries, typecheck/build and hosted CI remain required before merge. Local snapshot lacks full dependencies and cannot certify those checks.

Production exercise requires a legitimately persisted, source-linked input from the authorized graph owner; none has been fabricated to obtain a successful receipt. Full 21-family inventory, mechanisms, calibration cohort, prospective evaluation and external replication remain open. The completed finite trial had three real reservations and zero processed work; this change does not claim to repair its missing-prediction selector gap.

Independent review found case/cycle attribution could be rebound. Added failing regression, then bound both identity refs to persisted node lineage. Full-suite local rerun required; this does not establish independent source-value verification.

## Executable mechanism expansion — 2026-10-29

The existing `packages/mihm-core` now owns additional versioned computations consumed by the same typed node caller through its optional `mechanisms` envelope. This is experimental software, not a newly ratified canonical method:

- Signed documented legacy IHG, ICE concentration, and local analytical sensitivity. Invalid normalized observations abstain; zero total E leaves ICE unknown. Published contradictory values remain historical claims; the equation is not tuned to reproduce them. At the latency saturation kink, derivatives are undefined/null.
- Simultaneous load redistribution checks identity, nonnegative finite quantities, source load, recipient capacity and numerical load conservation. Operational load conservation is an explicit scenario accounting rule, not a physical energy law or authority to execute.
- Declared linear multinode recurrence with forcing, bounded horizon and finite trajectory checks. Infinity norm less than one proves sufficient contraction of that declared model only. A larger bound is inconclusive, not proof of instability; no real-world attractor or homeostasis is claimed.
- Seeded bounded uniform perturbation of normalized measurements propagates uncertainty through IHG. Reported range/median describe this declared simulation distribution, not empirical confidence intervals or Sobol indices.
- Explicit threshold screening for declared-vs-measured capacity gaps, capacity deterioration with latency increase, and directed reachability from overloaded nodes. Thresholds remain uncalibrated; reachability is not causal sepsis.
- Paired chronological forecast scoring against a control rejects future predictor/outcome availability, invalid dates, duplicate identities, mixed units and nonfinite arithmetic. It computes error differences without certifying model independence, calibration or scientific success.

All optional mechanism parameters must reference a source record both in graph lineage and admitted at the frame cutoff. Missing mechanism inputs remain absent. The same authoritative DERIVED event writer carries results. No route, table, scheduler or permission added. Core additions are backward-compatible; the legacy reduced continuity implementation is not silently redefined.

Independent review exposed arithmetic overflow and temporal source/outcome loopholes; regression tests cover the corrections. Current local suite: 30 passing tests. Native typecheck/build and architectural checks must run on the new head before release. CRM source equation, full audiovisual/cell/world-to-music execution, empirical calibration and independent replication are not implemented by this increment; no total-integration claim is authorized by these changes.

### Persistence and scientific missingness closure

The existing scientific writer now hashes the full execution (including limitations, missingness and source refs), fails closed on duplicate lookup errors, validates duplicate semantic identity, and rereads event identity/name/logbook, contract, fingerprint, executions and lineage before confirming a new write. An ambiguous write is reported unconfirmed and never retried as a new effect. This supersedes the earlier pending persistence note above.

The scientific numeric reader also no longer converts null, booleans or empty strings into zero. A regression demonstrates that four missing relation weights cannot become a constant observed change-point series. Local suite after these additions: 34 passing tests; native CI remains required on the latest head.

## CRM and cultural-input reconciliation — 2026-10-29

Original primary source recovered: `MIHM Libro Blanco v1.pdf`, Library `libfile_77223b7483088191b61327592c7f2e17`, physical PDF page 3, printed v1.5. It explicitly defines CRM=mean(R*K), IHG=mean((C-E)*(1-L)), and ICE=max(E)/sum(E). R is normalized transferred load and K normalized functional connectivity. `calculateMihmNodeState` now computes CRM only with complete valid R/K; otherwise CRM remains null. `arithmeticVersion` selects the v1.5 or v2 documented latency equation explicitly. Original v1.5 inputs do not require the v2 M variable. CRM_C from the separate cultural mapper is not equated to this multinode CRM. Equation reproduction is not empirical verification of the document's forecasts or political narrative.

The existing cultural MIHM agent previously generated scores from text length and fixed constants. It now consumes `mihmMeasurement` with caseId, sourceRef, methodVersion, observedAt, scale and bounded ihg/nti/ldi values. It preserves that provenance as DECLARED/not independently verified in each result and stage lineage. Without measurements, the existing pipeline stops after the failed MIHM stage; it cannot generate downstream claims from fabricated MIHM scores. No second analyzer or external service is introduced.

The Python operational translator now preserves null/boolean/empty measurements as missing. Missing F_s/E_r/V_i produces an insufficient invisibility-risk assessment, not a negative finding. Cultural stage confidence is unknown rather than an unsupported fixed .72. Remaining downstream heuristic positions/probabilities carry explicit SIMULATED/exploratory warnings; this does not certify the cultural model, perform audio/image/video/cell measurement or render world-to-music.

Review corrections: v1.5 no-M input admitted only under v1.5; supplied cultural provenance preserved; absent inputs cannot imply absence of invisibility risk. 42 local tests pass; full native CI required on this new head. No production deployment or new authorization granted.

## Typed instrument compatibility before decision use — 2026-10-29

The existing `instrumentContract` now owns compatibility admission using the existing Phi registry, not a second instrument registry. It preserves each reading and allows explicit CONTEXT links between different Phi families. It rejects arithmetic aggregation/substitution, cross-object/family/version comparisons, inconsistent instrument identity, formula authority/version, semantic role or scale, out-of-range values, future/invalid timestamps, CONFLICTED states and disagreeing values for the same canonical snapshot. Missing values yield INCOMPLETE rather than a numerical result.

The same gate is projected by existing `/api/mihm/state` for its real systemic/world adapters and consumed by the existing typed scientific executor for explicit instrumentReadings/instrumentLinks. It does not fetch private human readings into the public endpoint. A contradiction makes the typed execution ABSTAINED; its inputs and diagnostics remain in the existing derived scientific receipt. An empty set can still support a descriptive typed-field computation but is not admitted as decision-ready instrument evidence.

Signed-IHG latency masking is explicitly blocked for operational interpretation when an overloaded normalized node has positive latency. The historical numeric result remains available for audit; changing M or latency cannot be treated as recovery on this path. No historical formula is silently rewritten.

The gate returns COMPATIBLE_FOR_REVIEW / INCOMPLETE / CONTRADICTED and always decisionAuthorized=false and scientificValidation=false. It is compatibility admission, not an independent calibration certificate, ROOT decision or global replacement of all governance boundaries. Source readings still require existing evidence validation.

Preflight delta: owners instrumentContract/Phi registry, MIHM state read projection and existing typed scientific runtime; writer unchanged; front/DB/scheduler delta NONE; public state adds a read-only compatibility result. Rollback restores prior projection/caller while retaining historical scientific receipts. Local suite46; exact-head native checks required before deployment.

Review correction to this gate: contradictions block decision use, NOT descriptive measurement/simulation. The existing typed execution remains EXECUTED when metrology is valid and retains a contradicted instrumentCompatibility plus decisionUseBlocked=true. Malformed or blocked metrology still abstains. This supersedes the earlier statement that compatibility alone makes the whole execution ABSTAINED.

World Vector retains objectId=snapshot.id and adds snapshotRef plus a canonical global-context comparisonSubjectId from its existing adapter. The compatibility owner recognizes this specific WORLD_VECTOR identity binding for longitudinal comparison; it does not loosen object identity for other instruments. Every snapshot ref remains in the original reading. Local suite47.
