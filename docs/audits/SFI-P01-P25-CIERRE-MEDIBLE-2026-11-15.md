# SFI — Registro de cierre verificable P01–P25

**Corte de fuentes:** 2026-11-15 UTC. **Repositorio consultado:** `Aptymok/system-friction`, HEAD observado `4e25d7a6276c6c875fd22a3b9b0ca489abc237ea`.

**Propósito:** Anexo operacional y medible del inventario de auditoría; no sustituye `docs/program/SFI-MASTER-PROGRAM.md`, SFI-00 ni los 205 requisitos del controlador. Los objetivos de cierre de P01–P25 aquí expresados son DECLARED a petición del fundador; una declaración no certifica su cumplimiento.

**Una sola medida y ninguna etiqueta subjetiva:** cada P tiene cuatro entregables de cierre de 25 puntos. **% = 25 × entregables certificados**; cada casilla se marca sólo con observación suficiente de todo su contenido. Las tareas cuya implementación existe pero carece de prueba integral permanecen pendientes. **0% significa ninguna de las cuatro casillas acreditada en este anexo, no ausencia de código ni progreso real nulo.** No son porcentajes de tiempo, esfuerzo, líneas de código ni estimaciones intuitivas. Son coberturas estrictas del checklist declarado en este archivo. Para convertirlos en certificación institucional, los recibos deben reconciliarse con el controlador y obtener RETURN. Los cuatro pesos iguales son una regla explícita de seguimiento, no una medición empírica de esfuerzo.

**Estados de las casillas:** [x] VERIFICADO en lectura de fuente viva; [ ] NO CERRADO / no observado íntegramente. Se incluyen archivos existentes identificados en el árbol de GitHub. Los cambios en ellos son instrucciones de trabajo, no afirmaciones de que falte todo su contenido.

**Evidencia transversal observada:** workflow SFI Verify SUCCESS en `4e25d7a6`; controller 43 recibos, 40 promovidos y 3 inválidos; producción identificada en `19b416b2` (13 commits atrás); Supabase `sfi_attractors` tiene `vector.desiredState`; SFI ROOT informa 21 agentes y 8 activos/24h en reporte; Continuity Hourly SUCCESS. Estas pruebas no se extrapolan a todos los programas.

## P01 · Memoria institucional — 0% acreditado

**100% declarado:** Ante cualquier reinicio SFI recupera prioridades, decisiones y pendientes, reconcilia cambios y publica un recibo de continuidad sin intervención manual.

- [ ] **25% · E1:** Modificar `src/lib/continuity/runtime.ts` y `src/core/memory/InstitutionalMemoryWriter.ts` para leer el último estado canónico, detectar versiones obsoletas y preservar precedencia.
- [ ] **50% · E2:** Extender `scripts/qa-sfi-mem002-single-writer.ts` con prueba de dos ciclos y conflicto de versiones.
- [ ] **75% · E3:** Ejecutar `.github/workflows/sfi-continuity-hourly.yml` con lectura posterior del registro persistido y comparación del estado.
- [ ] **100% · E4:** Guardar recibo reconstruible de reinicio + aprendizaje y comprobar una reanudación sin prompt.

## P02 · Persistencia íntegra — 0% acreditado

**100% declarado:** Los almacenes canónicos admiten escritura/lectura, recuperación y conciliación sin duplicados ni pérdidas verificadas.

- [ ] **25% · E1:** Revisar y corregir `src/lib/persistence/dataPlaneContinuityStore.ts` y `src/lib/persistence/continuityRecovery.ts` para rutas primarias y recuperación.
- [ ] **50% · E2:** Extender `scripts/data-continuity-audit.mjs` y `scripts/db/neon-data-plane-baseline-reconcile.sql` con diferencias por registro.
- [ ] **75% · E3:** Ejecutar prueba de recuperación y divergencia Supabase/Neon sin destructividad en producción.
- [ ] **100% · E4:** Persistir evidencia de reconciliación, anomalías restantes y lectura independiente.

## P03 · Autodesarrollo gobernado — 0% acreditado

**100% declarado:** Una anomalía real activa detección, asignación, reparación autorizada, QA, RETURN y continuidad sin orden rutinaria.

- [ ] **25% · E1:** Revisar `scripts/sfi-self-development.mjs` y `src/lib/continuity/operationalAutoAdvance.ts` para recuperación y dueño existente.
- [ ] **50% · E2:** Extender `.github/workflows/sfi-self-development.yml` con discriminación entre detección, asignación y reparación efectiva.
- [ ] **75% · E3:** Ejecutar caso real de fallo reversible con reparación y regresión verificadas.
- [ ] **100% · E4:** Registrar RETURN y aprendizaje posterior con costos y límites de autoridad.

## P04 · Anclaje temporal independiente — 0% acreditado

**100% declarado:** Un tercero reconstruye la secuencia de evidencia, predicción, intervención y RETURN mediante relojes y fuentes distinguibles.

- [ ] **25% · E1:** Auditar y corregir `src/lib/sfi/cognitive-runtime/agents/temporalResolver.ts` y las marcas temporales de evidencia.
- [ ] **50% · E2:** Extender `.github/workflows/mihmt-timeline-clocks-review.yml` con casos de desorden, retraso y fuentes rivales.
- [ ] **75% · E3:** Ejecutar reconstrucción temporal reproducible de un expediente persistido.
- [ ] **100% · E4:** Conservar los artefactos de reconstrucción y una revisión independiente.

## P05 · Reality Chain — 0% acreditado

**100% declarado:** Un expediente real enlaza fuente, evidencia, decisión, permiso, ejecución, persistencia y resultado sin enlaces inventados.

- [ ] **25% · E1:** Revisar `src/core/case-platform/closurePolicy.ts` y `src/core/case-platform/operational.ts` para exigir cadena completa.
- [ ] **50% · E2:** Extender `scripts/qa-sfi-reality-chain-intake.ts` y `scripts/qa-sfi-reality-chain-three-screen.ts` con rechazo de enlaces faltantes.
- [ ] **75% · E3:** Ejecutar un caso real desde `src/app/reality-chain/page.tsx` y sus escritores canónicos.
- [ ] **100% · E4:** Reconstruir el expediente desde datos persistidos y validar un RETURN observado.

## P06 · MIHM contrastado — 0% acreditado

**100% declarado:** La matemática queda reconciliada y una predicción prospectiva MIHM se compara con rivales bajo protocolo prerregistrado.

- [ ] **25% · E1:** Auditar `packages/mihm-core/src/index.ts` y `src/lib/evaluator/derivedMihmRuntime.ts` contra fórmulas/ausencias.
- [ ] **50% · E2:** Completar `packages/mihm-core/src/integrated.test.ts` y `scripts/qa-sfi-mihm-foundation-missingness.ts` con igualdad entre consumidores.
- [ ] **75% · E3:** Ejecutar `docs/research/SFI-MIHM-FOUNDATION-P4-PROSPECTIVE-2026-10-30.md` con T0 congelado y rivales.
- [ ] **100% · E4:** Registrar outcomes, diferencias, intervalos y RETURN no retrospectivo.

## P07 · Teoría refutable — 0% acreditado

**100% declarado:** Las proposiciones SFI producen predicciones contrastables, rivales y criterios de refutación aplicados.

- [ ] **25% · E1:** Editar `docs/canon/08_HYPOTHESES_PROPOSITIONS_PREDICTIONS.md` para anclar hipótesis concretas y rivales por caso.
- [ ] **50% · E2:** Vincular preregistro y resultado en `src/lib/sfi/predictions/verificationService.ts` sin permitir edición posterior de T0.
- [ ] **75% · E3:** Ejecutar al menos un contraste observacional donde pueda ganar el rival.
- [ ] **100% · E4:** Documentar falsación/no falsación, procedencia y revisión externa.

## P08 · Experimentos de IA — 0% acreditado

**100% declarado:** Se mide de forma reproducible el efecto incremental de memoria, agentes y cooperación frente a controles.

- [ ] **25% · E1:** Completar protocolo en `docs/research/SFI-THREE-EXPERIMENTS-CONVERGENCE.md` con cohortes y controles.
- [ ] **50% · E2:** Implementar ensayos pareados en `scripts/cognitive-olympics/case-lab/run.mjs` y pruebas en `run.test.mjs`.
- [ ] **75% · E3:** Ejecutar repeticiones con y sin memoria y con y sin agentes, conservando gastos y tareas idénticas.
- [ ] **100% · E4:** Publicar datos, tamaños de efecto, incertidumbre y RETURN de revisión independiente.

## P09 · Superficies convergentes — 0% acreditado

**100% declarado:** ROOT, Case, Lab, Observatory y Studio comparten propietarios y estados sin contradicción y sin segunda autoridad.

- [ ] **25% · E1:** Corregir conexiones del estado en `src/lib/root/operationalWorkboard.ts` y `src/components/sfi/SfiOperatingWorkspace.tsx`.
- [ ] **50% · E2:** Ampliar `scripts/qa-sfi-root-reports-runtime.ts` con comprobaciones entre superficies y estados de ausencia.
- [ ] **75% · E3:** Probar navegación, permisos y actualización real en producción para ROOT/Case/Lab/Studio/Observatory.
- [ ] **100% · E4:** Archivar matriz de lecturas equivalentes y resolución de contradicciones.

## P10 · Publicación científica reproducible — 0% acreditado

**100% declarado:** Un objeto de investigación tiene versión, insumos accesibles, métodos ejecutables, citación y reproducibilidad por terceros.

- [ ] **25% · E1:** Revisar `docs/research/README.md` y `src/app/api/root/method-lab/research/route.ts` para paquete de reproducción.
- [ ] **50% · E2:** Extender `scripts/qa-sfi-research-metadata.mjs` y `scripts/qa-sfi-publications-hub.ts` con requisitos de citación.
- [ ] **75% · E3:** Publicar un paquete con datos permitidos, script ejecutable y referencia estable.
- [ ] **100% · E4:** Obtener ejecución o revisión independiente y persistir su RETURN.

## P11 · Propiedad intelectual administrada — 0% acreditado

**100% declarado:** Cada activo clave dispone de titularidad, autorización, licencia o restricción y actos de protección documentados cuando correspondan.

- [ ] **25% · E1:** Inventariar software, marcas, métodos, imágenes y datos con fuentes de titularidad en `docs/program/SFI-INSTITUTIONAL-AUTHORITY-PLANE-2026.md`.
- [ ] **50% · E2:** Cruzar derechos y permisos de publicación con `src/lib/public/institutionProfile.ts` y el control de activos públicos.
- [ ] **75% · E3:** Resolver actos jurídicos necesarios con documentos y titulares reales, sin crear registros ficticios.
- [ ] **100% · E4:** Guardar evidencias de licencias/solicitudes/resoluciones y revisión jurídica.

## P12 · Inventario institucional reconciliado — 0% acreditado

**100% declarado:** Existe corte auditable de activos, obligaciones, código, costes, derechos y conocimiento sin omisiones materiales conocidas.

- [ ] **25% · E1:** Reconciliar control de activos del `docs/program/SFI-MASTER-PROGRAM.md` con repositorios y bases activas.
- [ ] **50% · E2:** Añadir auditoría de activos y duplicados a `scripts/data-continuity-audit.mjs` o reutilizar el inventariador institucional existente.
- [ ] **75% · E3:** Contrastar facturación real de Vercel, Supabase y proveedores con `src/lib/operations/sfiCostMeter.ts`.
- [ ] **100% · E4:** Persistir corte fechado con fuentes, responsables, derechos, costos y excepciones.

## P13 · Discovery medido — 0% acreditado

**100% declarado:** Una búsqueda externa por problemas y métodos, sin marca SFI, puede recuperar y distinguir el objeto institucional.

- [ ] **25% · E1:** Corregir dueño actual en `src/lib/discovery/**` y sincronizar `src/app/sitemap.ts` y `public/ai-index.json` donde proceda.
- [ ] **50% · E2:** Extender `scripts/qa-sfi-discovery-integrity.ts` y `scripts/qa-sfi-discovery-operational.ts` con búsquedas y estados MISSING.
- [ ] **75% · E3:** Ejecutar corpus no marcado en proveedores reales y conservar resultados/fecha/fuentes.
- [ ] **100% · E4:** Registrar tasas UDR/ECR/ACR y RETURN de recuperación independiente.

## P14 · Primer objeto Reality Chain — 0% acreditado

**100% declarado:** Existe un artefacto científico independiente de MIHM ejecutable, verificable y revisable por terceros.

- [ ] **25% · E1:** Definir paquete concreto de Reality Chain en `docs/research/README.md` y usar `src/core/case-platform/reportAssembler.ts`.
- [ ] **50% · E2:** Añadir fixture de reproducción y QA a `scripts/qa-sfi-reality-chain-three-screen.ts`.
- [ ] **75% · E3:** Publicar caso desidentificado, método, datos autorizados y script de reconstrucción.
- [ ] **100% · E4:** Obtener reproducción externa, fallos documentados y RETURN.

## P15 · Validación externa independiente — 0% acreditado

**100% declarado:** Al menos un tercero verifica, critica o utiliza un resultado SFI y queda evidencia auténtica del contraste.

- [ ] **25% · E1:** Preparar paquete de revisión desde `src/app/api/root/method-lab/research/route.ts` con límites de divulgación.
- [ ] **50% · E2:** Instrumentar admisión de devolución en `src/core/case-platform/sourceIntake.ts`, evitando autoverificación.
- [ ] **75% · E3:** Solicitar y obtener revisión de un tercero real sobre un objeto definido.
- [ ] **100% · E4:** Registrar identidad/fuente permitida, crítica, respuesta institucional y RETURN verificable.

## P16 · Recuperación y atribución repetibles — 0% acreditado

**100% declarado:** Buscadores y modelos encuentran la institución y atribuyen objetos concretos a referencias correctas en mediciones repetidas.

- [ ] **25% · E1:** Alinear perfil `src/lib/public/institutionProfile.ts`, `public/ai-index.json` y `src/app/sitemap.ts`.
- [ ] **50% · E2:** Agregar batería de consultas en `scripts/qa-sfi-discovery-exposure.ts` sin inferir respuesta de modelos no consultados.
- [ ] **75% · E3:** Repetir pruebas con fecha, proveedor y query, distinguiendo no observado de cero.
- [ ] **100% · E4:** Persistir series comparables y citas erróneas/correctas con RETURN externo.

## P17 · Caso + Lab + RETURN completo — 0% acreditado

**100% declarado:** Un caso real atraviesa formulación, evidencia, simulación separada, decisión, ejecución y resultado observado.

- [ ] **25% · E1:** Conectar `src/core/case-platform/operational.ts` con `src/lib/method-lab/experimentPersistence.ts` sin mezclar simulación y efecto.
- [ ] **50% · E2:** Extender `scripts/qa-sfi-case-platform-operational-v1.ts` y `scripts/qa-sfi-method-lab-convergence.ts`.
- [ ] **75% · E3:** Ejecutar expediente real autorizado de extremo a extremo.
- [ ] **100% · E4:** Archivar medición posterior, comparación y cierre reconstruible.

## P18 · Predicciones atómicas — 0% acreditado

**100% declarado:** Verificaciones contradictorias/concurrentes no pueden corromper predicciones ni su resultado persistido.

- [ ] **25% · E1:** Conservar y revisar `src/lib/sfi/predictions/verificationService.ts` y migración `supabase/migrations/20261115013822_sfi_prediction_verification_atomic_integrity.sql`.
- [ ] **50% · E2:** Ejecutar `scripts/qa-sfi-prediction-verification-atomic.test.ts` y `src/lib/sfi/predictions/agents/verificationConsistency.test.ts` sobre la revisión exacta.
- [ ] **75% · E3:** Probar dos verificadores concurrentes sobre servicio productivo autorizado.
- [ ] **100% · E4:** Releer filas/versiones y registrar RETURN con contradicciones controladas.

## P19 · Paridad matemática y missingness — 0% acreditado

**100% declarado:** Todos los consumidores usan fórmulas equivalentes y ningún dato ausente se convierte silenciosamente en cero.

- [ ] **25% · E1:** Comparar `packages/mihm-core/src/index.ts` y `src/lib/evaluator/derivedMihmRuntime.ts` con implementación Python existente o localizar su owner antes de editar.
- [ ] **50% · E2:** Extender `src/lib/evaluator/scoreFrictionVectorDerivation.test.ts` con vectores mixtos y ausentes.
- [ ] **75% · E3:** Ejecutar comparación de resultados en API/consumidores reales, no sólo función unitaria.
- [ ] **100% · E4:** Guardar tabla de diferencias aceptadas/rechazadas y verificación productiva.

## P20 · Agentes trazables — 25% acreditado

**100% declarado:** Los 21 agentes de ROOT tienen identidad, executor, recibos temporales atribuibles y fallos visibles.

- [x] **25% · E1:** HECHO: verificar por lectura de ROOT que hay 21 agentes registrados y 8 con ejecución observada en 24 horas.
- [ ] **50% · E2:** Reconciliar `src/lib/root/telemetry/agentRegistry.ts` con `src/lib/sfi/cognitive-runtime/observedRuntime.ts`; ejecutar `scripts/qa-sfi-root-reports-runtime.ts` con escenarios de recibo nulo y ejecución real.
- [ ] **75% · E3:** Comprobar los 21 expedientes en la interfaz de ROOT desplegada, sin atribuir actividad a todos.
- [ ] **100% · E4:** Persistir comparativo entre registro, runtime y recibos de ejecución.

## P21 · Memoria maestra mantenida — 0% acreditado

**100% declarado:** La memoria original se reconcilia incrementalmente, elimina desactualización conceptual sin borrar historia y se refresca automáticamente.

- [ ] **25% · E1:** Verificar ubicación y owner de la memoria maestra original antes de editar; conectar `src/lib/continuity/runtime.ts` al escritor existente.
- [ ] **50% · E2:** Ampliar `scripts/qa-sfi-mem002-postgres.ts` con conflicto y supersesión.
- [ ] **75% · E3:** Demostrar dos actualizaciones programadas sucesivas del archivo original y readback.
- [ ] **100% · E4:** Conservar hashes/recibos de ambas sincronizaciones y detección de obsolescencia.

## P22 · Atractor institucional verificable — 25% acreditado

**100% declarado:** El estado deseado autorizado permanece recuperable y cada dimensión se contrasta con evidencia persistida, sin equiparar declaración a logro.

- [x] **25% · E1:** HECHO: restaurado el registro `sfi_attractors` con `vector.desiredState` por migración `supabase/migrations/20261115025751_restore_existing_institutional_attractor_declaration.sql`.
- [ ] **50% · E2:** Ajustar si procede `src/lib/institution/institutionalAttractor.ts` y `src/lib/reports/scheduledAgentReports.ts` para reportes posteriores a recuperación.
- [ ] **75% · E3:** Verificar un reporte nuevo y su lectura productiva desde ROOT, con dimensiones MISSING explícitas.
- [ ] **100% · E4:** Obtener observación externa o transaccional real de dimensiones e incorporar RETURN.

## P23 · IG/H histórica auditada — 0% acreditado

**100% declarado:** Toda cifra IHG histórica publicada tiene fórmula, insumos, versión y rectificación rastreable si no se reproduce.

- [ ] **25% · E1:** Auditar fuentes en `docs/research/SFI-MIHM-V2-LEGACY-ARITHMETIC-AUDIT-2026-10-28.md`.
- [ ] **50% · E2:** Implementar tabla de correspondencia por cita/publicación en `scripts/qa-sfi-research-metadata.mjs` o test específico.
- [ ] **75% · E3:** Volver a calcular afirmaciones con datos originales y marcar sin datos cuando aplique.
- [ ] **100% · E4:** Publicar correcciones versionadas y prueba independiente de trazabilidad.

## P24 · Certificación integral de producción — 25% acreditado

**100% declarado:** Los controles, despliegues, rutas, efectos y RETURN demuestran el cierre real de los requisitos sin invalidaciones.

- [x] **25% · E1:** HECHO: confirmar `SFI Verify` SUCCESS y compilación sobre HEAD `4e25d7a6`.
- [ ] **50% · E2:** Revalidar WS-03-004/006 y obtener observación externa WS-03-008 en `docs/program/SFI-COMPLETION-RECEIPTS.json` mediante verificador independiente.
- [ ] **75% · E3:** Lanzar despliegue controlado con `.github/workflows/sfi-vercel-prebuilt-production.yml` cuando los gates lo permitan; comprobar SHA exacto.
- [ ] **100% · E4:** Ejecutar `scripts/qa-sfi-production-observatory-smoke.mjs` y cerrar RETURN productivo firmado por evidencia.

## P25 · Independencia acotada del fundador — 25% acreditado

**100% declarado:** Durante un periodo definido SFI sostiene continuidad, detecta fallos, se corrige, conserva aprendizaje, respeta autoridad y costos sin instrucción manual rutinaria.

- [x] **25% · E1:** HECHO: verificar ejecución `SUCCESS` del workflow de continuidad nativa en `4e25d7a6`.
- [ ] **50% · E2:** Revisar `src/lib/continuity/operationalAutoAdvance.ts` y `scripts/sfi-self-development.mjs`; ampliar `.github/workflows/sfi-self-development.yml` y `scripts/qa-fi001-autonomy.ts` con caso de incidente real.
- [ ] **75% · E3:** Ejecutar un periodo de ausencia del fundador con incidentes y recuperación documentados.
- [ ] **100% · E4:** Reconciliar `src/lib/operations/resourceSelfObservation.ts` con facturas reales y evaluar aprendizaje/RETURN posterior.

## Bloqueos transversales y próximas pruebas

1. WS-03-004 y WS-03-006: volver a validar alcance cambiado, sin fabricar recibos.
2. WS-03-008: observar comportamiento público independiente de false-zero.
3. Producción: no promover un SHA sin CI exacto y controles de publicación.
4. P22: el reporte del 14-nov previo a la recuperación carecía de desiredState; comprobar un reporte posterior, no recuperar por segunda vez.
5. Conectar cada P al requisito canónico del controlador para que esta matriz deje de ser un anexo de auditoría y pueda gobernar avance en tiempo real.

**No incluido como avance:** tareas en planificación, simulaciones, despliegues READY de SHA anterior, ejecución interna sin outcome externo y certificados invalidados.
