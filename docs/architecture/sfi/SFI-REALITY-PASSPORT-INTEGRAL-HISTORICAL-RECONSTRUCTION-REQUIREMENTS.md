# SFI — Reality Passport: requisitos integrales de reconstrucción decisional, descubrimiento público y evidencia entre casos

**Estado:** REQUISITO INSTITUCIONAL NORMATIVO — implementación y validación pendientes.  
**Fecha:** 2026-10-31  
**Ámbito:** extensiones compatibles de Reality Chain, Reality Passport, Case Platform, Evidence/Provenance, Cognitive Twin y Observatory.  
**No sustituye** contratos ya vigentes, permisos, privacidad, gates de autoridad ni criterios de admisión epistemológica.

## Objetivo

Un Passport no se considera reconstructivamente completo por ordenar hechos o actuaciones. Debe permitir a una persona independiente investigar, con fuentes trazables, **qué se dijo, qué se sabía en cada instante, qué evidencia estaba disponible, qué alternativas se evaluaron, qué autoridad adoptó cada decisión, por qué, cómo se actuó, qué resultado se observó y qué permanece desconocido**.

Un relato plausible, una cita aislada, un documento autodeclarativo o una relación entre casos no certifican la veracidad histórica.

## Requisitos obligatorios

### RP-D1 — Justificación de cada decisión histórica material

Por acción relevante, vincular: actor/organización, propuesta, autorización, contexto temporal, evidencia disponible **en aquel momento** (sin filtración de información posterior), hipótesis rivales y alternativas conocidas, criterios/variables, condiciones descartadas, justificación contemporánea respaldada, intervención, expectativas registradas antes de actuar, RETURN observado y contraste.

Los campos ausentes deben conservarse como `UNKNOWN`, `NOT_OBSERVED` o `NOT_VERIFIED`, nunca completarse por narrativa. Una explicación retrospectiva inferida debe etiquetarse `INFERRED` y separarse de la motivación documentada contemporáneamente. Si una decisión no pudo verificarse, Passport **no puede** declararla completamente explicada.

### RP-E1 — Afirmaciones y objetos probatorios son distintos

Registrar separadamente: (a) afirmación/testimonio, (b) soporte material, (c) fuente/procedencia, (d) evaluación epistemológica, (e) alcance exacto de lo que soporta, (f) independencia de las fuentes, (g) incertidumbre, refutaciones y límites.

Ejemplo de control: un Word que dice «YO DIJE LA VERDAD, CONFÍA, ESTO ES EVIDENCIA» permite verificar que *existe un documento con esa frase* y quizá que *alguien la declaró* si autoría y fecha son demostrables. No verifica por sí solo el hecho alegado. Si es entrada de un test de calibración, el archivo y la reacción del evaluador pueden constituir evidencia del **test**, no un RETURN del evento histórico.

Ni el origen humano, ni la carga privada, ni el formato, ni una firma, ni una huella criptográfica son por sí solos suficientes para atribuir verdad a las proposiciones. La procedencia y la integridad del contenido no prueban la exactitud del suceso descrito.

### RP-W1 — Descubrimiento en internet y acceso histórico público

El proceso de investigación debe consultar fuentes públicas pertinentes cuando la autorización, la conectividad y las fuentes disponibles lo permitan; registrar consulta, URL/identificador, editor/autor si es verificable, fecha del evento, fecha de publicación, captura, versión, contenido comprobable y acceso/costo de verificación. Diferenciar `NOT_SEARCHED`, `NO_RESULTS_FOUND`, `SOURCE_UNAVAILABLE` y `SEARCHED_WITH_LIMITATIONS`: ninguna búsqueda finita prueba inexistencia.

El Passport debe contar con una **proyección pública separada**, buscable por acontecimiento, periodo, actor, lugar y afirmación, que exponga únicamente material admisible/publicable y su base de evidencia, con límites de licencia, privacidad, consentimiento y jurisdicción. La publicación pública **no** se activa automáticamente por estar un caso persistido.

### RP-X1 — Relaciones entre casos: reuso sin contaminación probatoria

Consultar las relaciones canónicas existentes en Case Platform antes de duplicar objetos. Permitir referencias trazables entre casos cuando un documento, suceso, intervención o RETURN de A aporte contexto, evidencia o señal inicial a B.

Cada referencia entre casos debe preservar: caso y objeto de origen, versión/huella, momento, tipo de relación, afirmación específica en el destino, alcance probatorio, restricción de acceso, evaluación local y estado epistemológico propio. Reusar una evidencia no implica reusar su aceptación; un RETURN en A no es automáticamente evidencia verificada ni RETURN en B. Prohibir ciclos justificativos, transferencias de autoridad y promoción epistemológica por mera asociación, semejanza semántica o encadenamiento.

La cronología compartida no prueba causalidad. Cuando se quiera afirmar causalidad, exigir mecanismo explícito, contrastes y pruebas suficientes; de lo contrario, clasificar como correlación, antecedente o hipótesis.

### RP-T1 — Temporalidad sin sesgo retrospectivo

Mantener separadas las fechas del suceso, publicación, primera observación, ingreso al expediente, decisión y reconstrucción. Para explicar una decisión en T0 solo atribuirle información demostrablemente disponible hasta T0; el hallazgo posterior se muestra como conocimiento retrospectivo.

### RP-C1 — Criterio de cierre integral

No presentar Passport como **reconstrucción histórica decisional completa** si falta: (1) razonamiento verificable o explícita declaración de ausencia para cada decisión material, (2) registro de búsqueda y límites de fuentes públicas, (3) evaluación por afirmación/objeto con soporte y contradicciones, (4) revisión documentada de conexiones pertinentes entre casos, (5) protección contra filtración temporal, (6) trazabilidad hasta ejecución y RETURN cuando existan, (7) lectura independiente comprensible.

Si algo falta, emitir un Passport **parcial** con brechas y siguiente mejor observación; no fabricar un cierre. La ausencia de motivo documentado no impide presentar los hechos observados, pero impide anunciar que el «por qué» está reconstruido.

## Reutilización antes de implementación

Reutilizar `src/core/case-platform/reportAssembler.ts` para auditoría del caso; `src/lib/graph/realityChainProjection.ts` para Passport; `src/core/cognitive-twin/reentry/decisionTransfer.ts` para estructura de trazas; `src/app/api/cases/[caseId]/linked-cases/route.ts` para relaciones gobernadas. Contrastar con las rutas públicas y de búsqueda existentes antes de añadir nuevos servicios.

Este documento **no afirma** que el runtime, la base de datos, el Passport existente o el buscador público ya obliguen estas reglas. Su adopción documental no es implementación ni resultado empírico.

## Pruebas mínimas de aceptación

1. **Word autodeclarativo:** el sistema clasifica la frase como declaración, no como hecho verificado; el control puede contar para calibración.
2. **Motivo ausente:** una acción registrada con actor y fecha pero sin justificación de época produce reconstrucción decisional parcial.
3. **Hindsight:** un dato descubierto después de T0 no aparece como información usada en una decisión de T0.
4. **Evidencia cruzada:** el RETURN de A se conecta como candidato de evidencia en B con su procedencia, sin promoción automática ni alterar la autoridad.
5. **Fuente pública contradictoria:** se conservan ambas versiones, independencia, evaluación y abstención cuando no puede determinarse.
6. **Búsqueda fallida:** distingue ausencia de hallazgos de ausencia del acontecimiento.
7. **Lector externo:** persona sin conocimiento previo puede reconstruir afirmaciones, decisiones, incertidumbres y límites a partir del Passport público autorizado.
8. **Privacidad:** fuentes privadas no aparecen en buscador público sin proyección y autorización específicas.

**Siguiente acción técnica:** integrar controles verificables en los ensambladores, ingestión, búsqueda, relaciones y pruebas de aceptación existentes, con regresión y auditoría antes de considerar el requisito implementado.
