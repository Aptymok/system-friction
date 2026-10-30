# MIHM fundacional · P1 — metrología, procedencia y cuatro relojes de observación

**Corte:** 2026-10-30. **Padre:** `SFI-MIHM-FOUNDATION-001`. **Instrumento de auditoría:** `SFI-MIHM-FOUNDATION-P1-SOURCE-METROLOGY-0.1`. **Estado:** `DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED`. **No es:** calibración dinámica, límite de viabilidad, modelo causal, Φ canónico, pronóstico en vivo, aprendizaje certificado o RETURN.

## 1. Pregunta y alcance

¿Los cuatro agregados históricos usados por MIHM P0 miden realmente la entidad, escala, frontera, unidad y momento que decimos? ¿Es legítimo tratarlos como predictores disponibles en sus fechas originales? El objetivo P1 es **rechazar silencios de procedencia antes de pasar a P2**, no producir nuevos umbrales ni reentrenar el P0.

Fuente interna congelada: `docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json`. SHA-256 del archivo: `41e384e3199ca8d6878b39cdca51425b82e01a4d5fec6121d6494d53c5ceacc5`; 365 días, 1,460 valores de cuatro dimensiones. Se conservan 3 huellas SHA-256 declaradas para las respuestas del proveedor, pero **no hay copias originales completas de esas respuestas** en el archivo ni artefactos conservados en el run fuente. Los hashes de respuestas se verifican como identificadores de procedencia, **no** se recalculan desde bytes originales independientes. GitHub Actions `40196382569` empezó `2026-10-25T13:10:13Z`, completó correctamente, y no conserva artefactos de descarga de las respuestas originales. Un run `SUCCESS` no verifica por sí mismo el contenido o la fecha de publicación de cada registro.

## 2. Diccionario metrológico revisado con fuente pública

| Campo histórico | Dataset oficial y reloj de evento | Entidad contada | Unidad tipada para P1 | Soporte espacial | Cadencia publicada |
| --- | --- | --- | --- | --- | --- |
| `service311` | [NYC 311](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9/about_data), `created_date` | Fila de solicitud dirigida a agencia; no persona ni incidencia distinta | `service_request_records/day` | Borough Manhattan | Diaria; susceptible de revisiones |
| `fdnyCount` | [FDNY Starfire Fire Incident Dispatch](https://data.cityofnewyork.us/Public-Safety/Fire-Incident-Dispatch-Data/8m42-w767/about_data), `incident_datetime` | Fila del conjunto de despacho de incidentes; no recuento independientemente deduplicado por incidente | `fire_incident_dispatch_rows/day` | Borough de incidente Manhattan | **Anual**, automatización no declarada |
| `cbdEntries` | [MTA Daily Ridership and Traffic](https://catalog.data.gov/dataset/mta-daily-ridership-and-traffic-beginning-2020), `date` + `mode` | Estimación diaria de entradas de vehículos al área CBD | `estimated_vehicle_entries/day` | CBD, no borough completo | Diaria; sujeta a revisiones |
| `crzEntries` | Misma fuente MTA, `mode='CRZ Entries'` | Estimación diaria de entradas a la zona gravada, excluyendo trayectos que permanecen en vialidades exentas | `estimated_vehicle_entries/day` | CRZ anidada en el CBD | Diaria; sujeta a revisiones |

**Precisión terminológica:** P0 etiquetaba `fdnyCount` como “despachos/día”. P1 especifica que se cuentan *filas de Fire Incident Dispatch* mediante `count(*)`, sin afirmar deduplicación por `starfire_incident_id`. Los valores originales, fórmulas históricas y umbrales P0 permanecen intactos. La actualización anual de FDNY incluye una publicación fechada el 5-oct-2026 en los metadatos consultados, posterior al intervalo estudiado (hasta 30-sep-2026); no se puede convertir automáticamente un valor de septiembre en una observación disponible en septiembre.

Fuentes consultadas: [311](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9/about_data), [FDNY](https://data.cityofnewyork.us/Public-Safety/Fire-Incident-Dispatch-Data/8m42-w767/about_data), [MTA / Data.gov](https://catalog.data.gov/dataset/mta-daily-ridership-and-traffic-beginning-2020), [CRZ Vehicle Entries](https://data.ny.gov/Transportation/MTA-Congestion-Relief-Zone-Vehicle-Entries-Beginni/t6yz-b64h).

## 3. Cuatro relojes que NO se deben confundir

1. **Evento:** `created_date`, `incident_datetime` o `date`. Señala cuándo ocurrió o se atribuyó un conteo.
2. **Publicación/disponibilidad:** cuándo el proveedor realmente hizo accesible ese valor y versión. **DESCONOCIDA para cada T0**. La cadencia “diaria” o “anual” no demuestra la versión disponible en una fecha dada.
3. **Captura SFI:** obtención retrospectiva del proveedor mediante workflow GitHub el 25-oct-2026. Documentada a nivel run; las respuestas originales y su horario individual de llegada no están archivados íntegramente.
4. **Evaluación/reproducción:** el cálculo P0/P1 hecho sobre el archivo congelado. No debe reescribir relojes 1–3.

Las columnas de tipo `Floating Timestamp` y el truncamiento `date_trunc_ymd` no proporcionan por sí solos una certificación independiente de zona horaria de todos los registros. Se preservan las fechas calendario originales, sin convertirlas implícitamente a una supuesta UTC universal.

## 4. Auditoría reproducible de estructura del archivo

- **Cobertura:** 365 días consecutivos, desde 2025-10-01 hasta 2026-09-30, sin fecha repetida ni hueco.
- **Integridad de agregados:** cuatro series con 365 enteros no negativos. No hay nulos ni ceros en esta instantánea histórica. Esto **no prueba** que la fuente original nunca tuvo registros omitidos, que no hubiera valores revisados ni que se midiera la población completa.
- **Volumen:** 1,460 valores diarios; 3 solicitudes agregadas a fuentes públicas (311, FDNY, MTA × 2 modos).
- **Geografía:** 311 y FDNY = borough Manhattan. CBD y CRZ = perímetros anidados; **no sumar los cuatro indicadores**, no usar el mismo denominador ni declarar causalidad intersistema.
- **Coherencia física del anidamiento:** en los 365 días `CRZ Entries <= CBD Entries`. `CBD−CRZ` representa entradas por vías excluidas en el marco del conjunto; no constituye pérdida económica ni fricción.

| Dimensión | Mínimo | Máximo | Disponibilidad histórica en fecha de evento |
| --- | ---: | ---: | --- |
| 311, solicitudes diarias | 1,124 | 3,275 | NO VERIFICADA |
| FDNY, filas diarias | 341 | 887 | NO VERIFICADA; publicación anual |
| CBD, entradas estimadas diarias | 72,721 | 621,682 | NO VERIFICADA |
| CRZ, entradas estimadas diarias | 64,681 | 557,587 | NO VERIFICADA |

Los conteos de fuente son recuentos agregados `count(*)` o estimaciones de proveedor; **no se recomputaron desde las filas crudas**. Los metadatos oficiales respaldan la interpretación de campos, pero no dan acceso a una bitácora de *cada* versión histórica.

## 5. Gating P1 y reparación de falsos positivos

`src/lib/mihm/foundationSourceMetrology.ts` añade un auditor **puro** dentro de MIHM, con entradas congeladas y un diccionario explícito. Rechaza:

- Fecha inexistente, duplicada, ausente o fuera del intervalo.
- Medición `null`, negativa, fraccional o impropiamente tipada; `0` legítimo se conserva como cero.
- Consulta a dataset equivocado, filtro espacial alterado, modo MTA sustituido, límite de respuesta duplicado, huellas inválidas, procedencia del workflow falsa o contabilización de fuentes inconsistente.
- `CRZ > CBD`, cambio de frontera o promoción del archivo a `VERIFIED` sin evidencia.

Un `PASS` de metrología indica **solo coherencia documental interna**, no exactitud empírica ni verdad histórica retrospectiva. La salida mantiene explícitamente `sourceValuesIndependentlyRecomputed=false`, `historicalForecastAsOfVerified=false`, `homeostasisEstablished=false`, `productionPromotionAllowed=false`.

## 6. P1 alcanzado y lo que sigue bloqueado

**Logrado:** esquema verificable, unidades distintas, mecanismos de actualización identificados, fronteras preservadas, tres consultas SQL/SoQL inspeccionables, cardinalidad y completitud internas controladas, fecha de la captura documental identificada, pruebas de abstención y reproducibilidad. **No logrado:** respuesta cruda y versión original de cada proveedor a cada T0, especificación confirmada del corte horario, conteos recomputados desde filas originales, deduplicación independiente de FDNY y evaluación prospectiva.

**Decisión:** P1 documental completado con **vintage gate bloqueado**. No se autoriza que el próximo paso P2 utilice relaciones estimadas retrospectivamente como si fueran predicciones emitidas en vivo. P2 puede estudiar dinámicas como hipótesis exploratoria, pero para validar pronósticos requiere primero un plan de recopilación contemporánea con snapshot, hash, `receivedAt`, `availableAt` y un recibo de salida realmente emitida antes de observar el resultado. Sin nuevos permisos, cron o reescritura de observaciones.

## Reproducción

```bash
node --import tsx scripts/research/mihm-foundation-p1-metrology.ts
node --import tsx --test src/lib/mihm/foundationSourceMetrology.test.ts
```

La salida congelada está en `docs/research/evidence/MIHM-FOUNDATION-P1-SOURCE-METROLOGY-2026-10-30.json`. `P0` permanece byte a byte intacto en el repositorio.
