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

