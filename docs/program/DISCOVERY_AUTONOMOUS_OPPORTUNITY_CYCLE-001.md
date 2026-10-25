# SFI · Discovery Mesh — ciclo de investigación autónoma sin dependencia de LLM

**Fecha:** 2026-10-20
**Estado:** implementación propuesta en PR, NO desplegada/no verificada en producción
**Dueños reutilizados:** WS-03 Discovery Mesh; Prospect Radar; World; Cognitive Runtime; ROOT; Method Lab; Case Platform; Cognitive Spine.
**No se establece otro canon, otro agente, un scheduler adicional, una BD de oportunidades paralela ni una autoridad autónoma de publicación.**

## Declaración de diseño institucional

El organismo persistente es SFI. Los LLM son proveedores sustituibles de capacidades cognitivas; su texto no es memoria institucional ni autoridad por sí solo. Observación determinista y continuidad deben funcionar sin ninguno. Un cambio de modelo **no** borra objetos, hipótesis, resultados, costos, citas, decisiones ni secuencias temporales.

El ciclo institucional aspirado es:

```
OBJETIVO VIGENTE + CONTEXTO / HISTORIA / COMPETENCIAS
  -> Discovery Mesh (encontrabilidad / realidad / señales externas)
  -> Prospect Radar / World / búsqueda de investigación (fuentes verificables)
  -> objeto de investigación / oportunidad con hipótesis y rivales
  -> evaluación de mérito, necesidad, viabilidad, derechos y tiempo
  -> propuesta de análisis, colaboración, experimento o estudio
  -> ejecución de tareas rutinarias por capacidades AUTORIZADAS
  -> comprobante de acción y RETURN externo cuando corresponda
  -> contraste de predicción/resultado y costo
  -> candidato de aprendizaje y revisión; nunca promoción automática
  -> reorientación del siguiente ciclo fundada en evidencia
```

Las fases técnicas no se suponen completadas sólo porque tengan contrato. En el corte 2026-10-20, Discovery tenía cinco corridas y las últimas tres tenían disponibilidad UNAVAILABLE; Prospect Radar tenía dos corridas, 45 fuentes y dos informes preliminares; commercial_opportunities tenía cero filas. Cognitive Runtime registró 0/21 ejecuciones de agentes en las últimas 24 h y el aprendizaje universal promovido estaba vacío. Son cifras de lectura acotada, no metas ni evidencia de autonomía completa.

## Cambio de esta primera integración

Se agrega **un paso semanal opcional** al cron ya existente `/api/cron/continuity-report`. Solo corre después del cortacircuito GENERAL; no se ejecuta en la rama restringida. Reusa `runNoKeyProspectRadar()`, RSS gratuito de Bing/Google, las tablas y fuentes existentes y los instrumentos de selección de oferta ya instalados. No requiere una llamada LLM: `allowModelSynthesis:false` obliga al modo determinista incluso si existe Ollama.

Flags requeridas conjuntamente:
- `SFI_SCHEDULED_EGRESS_MODE=enabled` (circuito general explícitamente autorizado por Operaciones/costo).
- `SFI_DISCOVERY_OPPORTUNITY_RESEARCH=enabled` (opt-in específico; por defecto no ejecuta el nuevo scan).

La comprobación de `prospect_research_runs` limita nuevas exploraciones automáticas a no más de una por 7 días en el camino secuencial habitual; **no es una exclusión transaccional bajo concurrencia**. Antes de activar en producción con múltiples ejecutores se requiere idempotencia atómica y cuota de solicitudes probada.

El informe es `projected_not_validated`. La selección de empresas desde titulares está especialmente expuesta a falsa atribución: ningún candidato encontrado se convierte por defecto en cliente, oportunidad calificada, hecho de empresa, contacto válido ni prueba de causalidad. El resultado de la ejecución distingue `PUBLIC_SIGNALS_TO_VALIDATE`, `NO_PUBLIC_SIGNALS`, `PERSISTENCE_UNVERIFIED`, `FAILED`, `SKIPPED_RECENT` y `DISABLED`. `UNAVAILABLE` en búsqueda propia de Discovery no se debe etiquetar como recuperación exitosa por el mero hecho de persistir el fallo.

Este primer paso **no escanea subvenciones, convocatorias científicas, alianzas académicas, compras públicas, papers ni licitaciones**: esos instrumentos tienen reglas de elegibilidad y fuente distintas y no deben forzarse dentro de un campo `company` del radar comercial. Su integración con los owners de investigación World/Method Lab/Research Hub deberá definirse con fuentes oficiales, cierres de plazo y acreditación; no se inventan con RSS empresarial. Un reporte del radar puede identificar un asunto interesante pero nunca debe afirmarse que SFI obtuvo una oportunidad comercial real sin verificación.

## Límites de operación

Puede, con fuente:
- investigar señales públicas y preparar un dossier interno;
- registrar evidencia, inferencias, incertidumbre, fuente/fecha y costo;
- cambiar prioridades de análisis y solicitar otras capacidades ya admitidas;
- formular propuestas y experimentos de bajo riesgo dentro de la autoridad vigente;
- abstenerse y registrar motivos cuando la evidencia es insuficiente.

No puede inferir ni autoejecutar:
- contactar terceros, publicar, gastar, contratar, modificar acceso/servidores/canon, cambiar reglas de MIHM/MIHM-T, o reasignar soberanía;
- decir que hubo RETURN si sólo hubo una lectura/crawling;
- convertir un texto generativo o consenso de modelos en verdad.

Un cambio de modelo debe conservar el mismo paquete de contexto/contrato, registrarse como ejecución distinta, y aceptar `NO_PROVIDER` con tareas de observación y cómputo determinista habilitadas.

## Criterios para la activación real

1. QA y typecheck de la rama; revisión del cortacircuito de costo, cuotas, fuentes RSS y persistencia.
2. Confirmar que una ejecución restringida sigue sin disparar Prospect Radar y no inventa retrieval cuando el proveedor no responde.
3. Activación explícita de ambos flags por la operación responsable; no usar flags como bypass de autoridad.
4. En el primer cron, verificar el retorno y la fila en `prospect_research_runs`, fuentes originales y `prospect_opportunity_reports`. Una respuesta de modelo no es un recibo.
5. Repetir en segundo cron y verificar abstención semanal, costo/cadencia sin duplicación.
6. Reforzar bloqueo de simultaneidad/idempotencia antes de autonomía de mayor frecuencia.
7. Separar investigaciones científicas y convocatorias oficiales del radar de empresas; conectar hallazgos con Hypothesis/Case/Method Lab y mantener linaje de revisión hasta un RETURN observable.
8. Sólo entonces medir rendimiento: señales con fuente, falsos positivos, propuestas útiles, decisiones y retornos observados; no visitas web como clientes.

**La unión de todos los circuitos —incluido aprendizaje admitido que modifica la siguiente decisión— sigue PENDIENTE de validación de extremo a extremo.**
