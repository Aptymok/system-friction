# SFI · Reconciliación de continuidad y absorción de capacidades — 2026-11-01

Estado: AUDITORÍA PARCIAL VERIFICADA EN CÓDIGO, NO MIGRACIÓN COMPLETA.
Objetivo vigente: preservar capacidades históricas útiles e integrarlas mediante propietarios canónicos existentes; revelar lo no encontrado sin inventar sustituciones ni eliminar evidencia.

## Regla institucional existente
`docs/canon/15_COMPATIBILITY_DEPRECATION_MIGRATION.md` exige resolver cada capacidad como DIRECT_ALIAS, CONTEXTUAL_ALIAS, TRANSFORM_REQUIRED, HISTORICAL_ONLY, UNRESOLVED o PROHIBITED. Solo DIRECT_ALIAS admite redirección automática. La eliminación requiere auditoría de uso, verificación de migración, plan de reversión y aprobación de gobernanza.

## Recuperado / observaciones verificadas en main

| Superficie heredada o transversal | Ubicación / evidencia | Capacidad a conservar | Propietario de destino a contrastar | Estado |
| --- | --- | --- | --- | --- |
| Friccionauta, interfaz | `src/components/sfi/SfiFriccionautaPanel.tsx`; montada desde `SfiRootWorkspace.tsx` | Conversación en contexto institucional, visibilidad de planos de memoria y continuidad | ROOT + Cognitive Twin; decidir si la UI actual tiene sustituto real | UNRESOLVED — aún montada; no declarar absorbida |
| Friccionauta, API | `src/app/api/root/friccionauta/route.ts` | Recuperación cruzada de contexto, ejecución de LLM, recibos `sfi_cognitive_twin_runs`, guardado de hallazgos | Cognitive Twin + enrutador LLM + eventos canónicos | UNRESOLVED — no eliminar escritor ni endpoint sin paridad comprobada |
| Protección de Friccionauta en QA | `scripts/qa-sfi-root-reports-runtime.ts` | Comprobación de contrato y superficies de lectura | QA del propietario canónico tras migración | OBSERVED — pruebas exigen su presencia; no confundir test verde con necesidad actual |
| Memoria Cognitive Twin | `src/core/cognitive-twin/evidenceIngestion.ts`; `src/lib/institution/institutionalCycle.ts` | Ingesta persistente de evidencia institucional y sincronización | Cognitive Twin / Cognitive Spine | IMPLEMENTED, eficacia longitudinal NOT_OBSERVED aquí |
| Memoria temporal/RETURN | `src/lib/sfi/universalCalibrationState.ts`; `src/lib/world-observatory/hypothesisLearningProfile.ts` | Lineage, contraste cronológico y aprendizaje de hipótesis | Universal Cycle + Observatory + MIHM | IMPLEMENTED, circuito longitudinal compartido NOT_OBSERVED aquí |
| MIHM shadow operacional | `src/lib/continuity/operationalAutoAdvance.ts`; `src/lib/continuity/shadowObserver.ts` | Captura de ventana y etapas tras ejecución; no elegibilidad certificada | MIHM + libro de eventos | INTEGRATED; persistencia en ejecución real NO VERIFICADA EN ESTA AUDITORÍA |
| Compatibilidad de ejecución cognitiva | `src/lib/sfi/cognitive-runtime/manualExecution.ts`; `executionContracts.ts`; endpoints ROOT/external/MCP | Entrada de solicitudes históricas sin darles autoridad adicional | Runtime cognitivo canónico | UNRESOLVED — revisar usos y contratos antes de retirar adaptadores |
| MIHM implementaciones múltiples | `src/agents/maker-mihm.ts`, `src/experimental/store/maker-mihm.ts`, `services/python/sfi_engine/mihm.py`, `packages/mihm-core/src/index.ts` | Instrumentos, cálculos y trazabilidad | Method Resolver y MIHM core | UNRESOLVED — coincidencia nominal NO demuestra redundancia |
| Política LLM Google | `src/lib/ai/providerRouter.ts`; PR #870 | Selección Gemini-only y rechazo de fallback fuera de política | Enrutador canónico | INTEGRATED; inferencia auténtica y gasto/cuota NOT_OBSERVED aquí |

## NO ENCONTRADO / no demostrado

- Un inventario exhaustivo de todas las superficies antiguas con confirmación de propietario nuevo: NO ENCONTRADO.
- Evidencia de migración completa de conversaciones y hallazgos de Friccionauta a la memoria canónica: NO ENCONTRADO.
- Una prueba de extremo a extremo Gemini auténtico → contexto de memoria preexistente → registro de ejecución → recuperación posterior → contraste de RETURN: NO ENCONTRADO.
- Prueba de que MIHM mejora una política de decisión frente a controles con outcomes independientes: NO ENCONTRADO.
- Autorización vigente de eliminación masiva de archivos, escritoras de historia o rutas públicas de legado: NO ENCONTRADO.
- Evidencia suficiente para declarar equivalencia funcional y apagar Friccionauta: NO ENCONTRADO.

## Criterios de cierre para cualquier absorción

1. Inventariar caller, escritura, lectura, autoridad, contrato histórico, recibo y test de cada superficie.
2. Vincular cada función a propietario canónico EXISTENTE; no crear sustituto por semejanza nominal.
3. Ejecutar paridad sobre entradas persistidas reales y comprobar que no se pierde información ni autoridad.
4. Actualizar consumidores y QA solo después de probar la ruta sustituta.
5. Conservar acceso histórico de solo lectura donde sea necesario; retirar escritor duplicado únicamente tras validación.
6. Registrar retorno verificable de la migración y su reversión.
7. Si falta cualquiera de los anteriores: UNRESOLVED, NO ENCONTRADO o BLOCKED; no declarar ABSORBED.

## Próxima decisión técnica

Prioridad de auditoría: dependencia Friccionauta ↔ Cognitive Twin/ROOT y los adaptadores de ejecución cognitiva; posteriormente familias múltiples MIHM. Esta nota no autoriza borrado ni acredita paridad. Se prohíbe convertir este inventario parcial en cierre institucional.
