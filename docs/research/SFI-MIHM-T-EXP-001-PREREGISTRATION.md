# SFI MIHM-T EXP-001 — Borrador de preregistro experimental

**Institución:** System Friction Institute (SFI)  
**Estado:** `DRAFT_UNFROZEN` — DOCUMENTADO, NO PREREGISTRADO, NO EJECUTADO  
**Fecha del borrador:** 2026-10-10  
**Clase epistémica:** `HYPOTHESIZED / PROPOSED`  
**Tipo de experimento propuesto:** `MODEL_COMPARISON` (contrato existente de Method Lab)  
**Autoridad:** no modifica MIHM canónico, no autoriza intervención sobre organizaciones, no afirma validación.  
**Objetivo externo:** investigar valor incremental real antes de ofrecer el instrumento a una organización de Nueva York.

> Este documento conserva una propuesta de investigación. **No** es el preregistro congelado en Method Lab, no tiene comprobante externo OSF y no incluye un resultado experimental. Parámetros pendientes de fijar están señalados explícitamente. No debe etiquetarse como `PREREGISTERED` ni `CONFIRMATORY` hasta completar, fechar y congelar todas las decisiones previas a revelar los casos.

## 1. Pregunta y justificación

**Pregunta:** ¿La representación explícita de memorias latentes, relaciones entre relojes operativos y efectos de una intervención sobre trayectorias viables permite distinguir intervenciones agravantes mejor que un análisis convencional con la misma información inicial?

**Problema observable:** sistemas digitales, institucionales y materiales pueden intercambiar señales, decisiones y consecuencias en tiempos diferentes. La diferencia entre relojes no implica por sí misma fricción perjudicial. La hipótesis concierne a restricciones de interacción: una acción puede activar dependencias heredadas, llegar fuera de una ventana útil o alterar el conjunto de estados futuros alcanzables.

**Contribución candidata de SFI:** representación y contraste *multinodal* de historia latente + estructura de relojes + respuesta a intervención, con procedencia de Reality Chain, sin afirmar que ello constituye una nueva ley universal.

**Alternativas previas que deben reconocerse:** análisis causal y de seguridad convencional, teoría de control/viabilidad, sistemas distribuidos, teoría de eventos, gestión de incidentes, análisis de cambios de régimen y control estadístico. La explicación general `x(t+1)=f(x(t),u(t),c(t),h(t))` por sí sola no diferencia MIHM de esas disciplinas.

## 2. Reutilización del SFI existente — NO construir sistema paralelo

| Capacidad existente | Función en el experimento | Restricción |
|---|---|---|
| MIHM, `packages/mihm-core`, selección metodológica | Estados, nodos, perturbaciones, método primario según objeto | No sustituir variables canónicas ni agregar un Φ universal |
| `docs/architecture/sfi/MIHM-DIMENSIONAL-TRANSFER-MODEL-0.md` | Representación **experimental** `𝒯(dᵢ → dⱼ, t, τ)` para una transferencia con dirección, desfase, atenuación, contexto e incertidumbre | No es ley física ni transferencia calibrada |
| `src/lib/mihm/fieldScientificReading.ts` | Coordenadas de secuencia, ciclo, recurrencia, fase, permanencia y cronología; relaciones y capacidad empírica | Valores ausentes continúan ausentes |
| `src/lib/graph/realityChainProjection.ts` | WORLD → CAPTURE → EVIDENCE → ... → AUTHORITY → ACTION → RETURN → CONTRAST | Proyección no equivale a verdad canónica |
| `src/lib/graph/knowledgeTimeContrast.ts` | Separar cuándo ocurrió, cuándo se conoció y cuándo se actualizó un registro | Prohibido usar conocimiento posterior en T₀ |
| `src/lib/method-lab/experimentContract.ts` y `preregistrationExport.ts` | Congelar hipótesis, corte T₀, variantes, control, señal esperada, falsación, reglas de parada y RETURN | Exportar no implica preregistro externo |
| `chronos_olympics` | Prueba histórica/replay bajo condiciones selladas; potencial evaluación posterior | Ejecutabilidad o simulación no equivalen a validación empírica |

Método canónico para cada objeto deberá resolverse antes de la ejecución. Este archivo no crea un nuevo método primario ni una segunda base de datos.

## 3. Modelo falsable candidato y variables

Para la relación dirigida `i → j`, proponer el objeto de observación:

`T_ij = {estado_fuente, estado_receptor, señal, dirección, t_evento, t_registro, t_conocido, t_autorizado, t_ejecutado, t_return, dependencia_latente, intervención, restricción, evidencia, incertidumbre}`.

Los tiempos pueden ser intervalos, orden parcial o `UNKNOWN`, no timestamps inventados.

**Restricción distintiva propuesta para MIHM-T:** una intervención solo puede activar una dependencia histórica `h` si el mecanismo `(u, h, estado_receptor) → efecto` estaba representado por evidencia o hipótesis explícita **admisible antes de T₀**. Un término de interacción `u × h` o `u × reloj` sin mecanismo y datos temporalmente admisibles no recibe una ventaja automática. No pueden agregarse dependencias post hoc al puntaje confirmatorio.

**Tres campos obligatorios para cada intervención candidata:**

1. **Reversibilidad:** reversible / parcialmente reversible / irreversible / desconocida; bajo condiciones y horizonte declarados. No confundir código revertible con consecuencia material revertible.
2. **Efecto sobre estados alcanzables:** conserva / expande / restringe / desconocido, relativo a restricciones y modelo de viabilidad especificados; si no hay datos suficientes, `UNKNOWN`. No presentar una simulación de alcanzabilidad como hecho observado.
3. **Dependencias latentes activadas:** identificador de dependencia, vía causal candidata, evidencia disponible al corte, y estatus OBSERVED / DECLARED / INFERRED / UNKNOWN. Si solo se supo después, sirve para explicación retrospectiva, no para predicción válida en T₀.

**Definición operativa provisional de intervención agravante:** una intervención asociada con incremento posterior de pérdida, exposición, propagación o restricción del espacio viable, medido con un resultado predefinido. La asociación temporal no prueba causalidad. Para atribución causal se requiere estrategia de identificación independiente y alternativas rivales.

**Señal débil persistente:** desviación reiterada definida por detector, ventana, línea base, recurrencia y relevancia preestablecidas. La mera repetición no demuestra que sea precursora. Registrar también ventanas sin crisis para estimar falsas alarmas.

## 4. Hipótesis rivales

**H1 (incremento del modelo):** en incidentes delimitados donde existan dependencias históricas y relaciones temporales observables antes de T₀, el modelo MIHM-T produce una mejora fuera de muestra frente al modelo convencional al identificar intervenciones que agravan una transición, medida por la regla principal y el umbral congelados antes de evaluar los casos reservados.

**H0 (nula):** añadir memoria latente estructurada y acoplamiento temporal explícito no mejora el desempeño fuera de muestra del análisis convencional con igual información admisible, o introduce falsas alarmas/costos que neutralizan su beneficio.

**Hipótesis mecanística secundaria:** algunas intervenciones aparentemente correctivas activan código, reglas, recursos o dependencias dormidas y modifican la propagación. Su existencia debe ser inferible desde T₀ para contar como anticipación; hallarla luego solo sirve a reconstrucción.

No suponer que el análisis convencional predice siempre que revertir restaura el sistema. Esa sería una caricatura del comparador. Debe permitirse al analista convencional emplear las mismas evidencias e historia disponibles y formular sus propios riesgos.

## 5. Diseño comparativo y prevención de filtración retrospectiva

**Caso de calibración:** Knight Capital (2012) se utiliza exclusivamente para diseñar codificaciones y ensayar la consistencia; resultado conocido, **no** cuenta para capacidad predictiva.

**Casos reservados:** mínimo tres episodios documentados con cronologías reconstruibles, de los cuales al menos uno no debe culminar en pérdida material significativa. Candidatos **NO ADMITIDOS AÚN**: Cloudflare 2019, GitLab 2017, CrowdStrike 2024, Flash Crash 2010. Elegibilidad, completitud de datos, independencia y condición de no desastre siguen **PENDIENTES**; nombrarlos no constituye verificación ni prueba ciega.

**T₀ por episodio:** instante y zona horaria elegidos por regla previa; guardar lista exacta de documentos, versiones y contenido legalmente disponible entonces, con procedencia. Las investigaciones publicadas después de T₀ son material de evaluación diferida, nunca evidencia admisible para la predicción.

**Cegamiento:** mantener un custodio independiente de los resultados, con evidencia posterior segregada; proporcionar a ambos modelos el mismo conjunto informativo de T₀. No es cegamiento auténtico si los analistas reconocen el incidente, su desenlace o han leído sus postmortems. En ese caso, marcar `RETROSPECTIVE / LEAKAGE_RISK` y excluir de puntuaciones confirmatorias. Si todos los casos históricos son reconocibles, obtener casos no publicados o una cohorte prospectiva bajo convenio antes de reclamar validación predictiva.

**Brazos:**
- **M0 — Control convencional competente:** análisis de incidentes, seguridad, controles de cambio y dependencias con los mismos registros disponibles, sin obligación de usar vocabulario MIHM.
- **M1 — MIHM-T candidato:** mismas fuentes y límites que M0; representación explícita de rutas de activación latentes pre-T₀, relojes heterogéneos, estados de relaciones e intervención sobre viabilidad.
- **Ablaciones exploratorias:** M1 sin historia latente; M1 sin relaciones temporales. Su utilidad será estimar dónde se encuentra el posible valor incremental, no justificarlo narrativamente.

**Salida congelada por caso y brazo:** opción de intervención propuesta, riesgo declarado de agravamiento, evento concreto pronosticado, horizonte, incertidumbre, mecanismos y evidencia; abstención permitida con costo evaluado. Sin salida anterior a revelar el desenlace, el episodio no es confirmatorio.

## 6. Medición, reglas de comparación y falsación

**Resultado primario candidato:** error de predicción calibrada del evento `INTERVENCIÓN_AGRAVA` definido de forma idéntica en ambos brazos, por ejemplo Brier score cuando exista una verdad de referencia válida y una probabilidad predeclarada. No sumar resultados heterogéneos ni asignar `0` a lo desconocido.

**Secundarios:** sensibilidad para intervenciones agravantes; tasa de falsas alarmas en controles sin desastre; anticipación temporal válida antes del evento; proporción de abstenciones; calidad de procedencia; costo de observación y carga operativa; integridad de reconstrucción; cambios en conjuntos de estados alcanzables cuando sean estimables.

**Criterio de refutación:** H1 no recibe apoyo si M1 no supera a M0 en el criterio primario bajo un umbral fijado antes de examinar resultados, si sus falsas alarmas exceden tolerancia preregistrada, o si las supuestas dependencias latentes solo pudieron incorporarse con información post-T₀. También falla la pretensión de generalización si el efecto no se reproduce en nuevos dominios.

**Aún faltan para la congelación:** operacionalización exacta de `INTERVENCIÓN_AGRAVA`, horizonte por clase de caso, métrica primaria definitiva, margen mínimo de mejora, tolerancias de error, manejo de datos censurados, estrategia de inferencia y tamaño de muestra basado en potencia/precisión. **Con tres casos solamente puede realizarse un piloto metodológico, no inferencia confirmatoria generalizable.** No elegir umbrales después de leer los resultados.

**Reglas de parada:** detener un brazo cuando falten evidencias temporalmente admisibles, se descubra filtración del desenlace, se detecten identificadores rotos o no pueda determinarse el resultado de referencia. Mantener recibo de bloqueo y causas; no imputar éxito.

## 7. Registro de calibración: Knight Capital, sin uso confirmatorio

**Fuente primaria:** SEC Administrative Order, Release No. 34-70694, 16-oct-2013: https://www.sec.gov/litigation/admin/2013/34-70694.pdf (ver también https://www.sec.gov/Archives/edgar/data/1569391/000119312513401173/d613486dex101.htm).

- **Párr. 14–16 (documentado):** Power Peg dejó de utilizarse en 2003; se desplazó la función de conteo en 2005; código nuevo RLP se instaló en siete de ocho servidores; el octavo conservó Power Peg defectuoso.
- **Párr. 17 (documentado):** 212 órdenes principales generaron millones de órdenes secundarias y aproximadamente **cuatro millones de ejecuciones**, 154 valores, más de 397 millones de acciones y aproximadamente 45 minutos de operación errónea; pérdida del orden de 460 millones USD. **Órdenes ≠ ejecuciones.**
- **Párr. 19 y siguiente (documentado):** 97 correos BNET antes de la apertura, desde aprox. 8:01, no diseñados como alertas; no se actuó sobre ellos. No llamarlos estadísticamente señales débiles sin línea base de falsos positivos.
- **Párr. 27 (documentado):** durante la respuesta, Knight quitó el nuevo código RLP de los siete servidores que funcionaban; la SEC documentó que **agravó** el problema al activar el comportamiento heredado en ellos.
- **Costo de intervenir de 8:01 a 9:30:** `UNKNOWN`. La ausencia de ejecución bursátil atribuible al episodio antes de la apertura no implica costo de intervención cero.
- **~10 millones USD/minuto:** mera división retrospectiva de pérdida final entre duración; NO tasa observada, NO ahorro por minuto y NO ganancia MIHM.
- **Hora exacta de cierre del incidente:** no inferir 10:15 como timestamp oficialmente establecido sin fuente directa; usar ventana documentada ~45 minutos.
- **Reconstrucción de causalidad:** distinguir mecanismos documentados por SEC de nuevas inferencias del analista.
- **Predicción:** `NOT_ELIGIBLE`, desenlace y causa conocidos antes de este borrador.

## 8. Realidad Chain, tiempo y RETURN

Para cada afirmación conservar:
1. tiempo del suceso o intervalo de validez;
2. tiempo de captura/registro;
3. tiempo en que la información estaba disponible para un decisor;
4. tiempo de autorización;
5. tiempo de ejecución;
6. tiempo del RETURN observable;
7. fuente, versión y estado epistemológico;
8. hipótesis rivales, contraevidencia y limitación.

No retroproyectar una evidencia conocida en T₁ sobre las condiciones cognitivas de T₀. `ACTION RESPONSE ≠ PERSISTED STATE`. `SIMULATED ≠ OBSERVED`. Una decisión formalmente válida puede tener un margen temporal reducido sin ser automáticamente incorrecta. La cadena conserva también decisiones que resultaron acertadas y eventos sin desastre.

## 9. Ruta institucional

1. **Fundamento:** MIHM + modelo experimental de transferencia dimensional + lectura temporal existente + Reality Chain.
2. **Pilotaje retrospectivo:** Knight solo para fijar codificación, rivales y límites; prueba de consistencia y búsqueda de fallos.
3. **Preregistro congelado:** completar parámetros pendientes, seleccionar cohorte admisible y generar comprobante Method Lab previo a liberar resultados.
4. **Contraste independiente:** analistas ciegos, eventos con y sin desastre, comparador competente; registrar falsación y abstenciones.
5. **Uso institucional futuro:** reto acotado, con acceso legítimo a una decisión real y mínima perturbación; no vender una plataforma por anticipado.
6. **Dirección Manhattan/New York:** buscar una entidad financiera, de infraestructura o académica interesada en probar si esta lectura añade capacidad de decisión, citabilidad o reducción de riesgo. Sin afirmar aceptación, colaboración ni beneficio comercial hasta observarlo.

Si el modelo no demuestra ventaja, el resultado institucional válido es `NO_INCREMENTAL_VALUE` y no se despliega como mecanismo de decisión.

## 10. Pendientes abiertos y criterio de cierre

| Tema | Estado al redactar | Condición para avanzar |
|---|---|---|
| Documento | DRAFT_UNFROZEN | Revisión metodológica y trazabilidad de fuentes |
| Función predictiva M1 | HYPOTHESIZED | Definir mecanismos y predicciones pre-T₀ por caso |
| Comparador M0 | PROPOSED | Congelar misma información y capacidad analítica |
| Knight | CALIBRATION_ONLY | No usar en pruebas confirmatorias |
| Casos reservados | NOT_ADMITTED | Verificar cronologías, elegibilidad, independencia y cegamiento |
| Umbrales y muestra | UNKNOWN | Fijarlos por regla anterior al desenlace |
| Experimento Method Lab | NOT_EXECUTED | Registrar T₀, entradas, brazos, RETURN, recibos y autoridad |
| Verificación externa | NOT_OBSERVED | Obtener resultados con procedencia y comparación independiente |
| Promoción MIHM canónico | NOT_AUTHORIZED | Solo después de validación y decisión gobernada |

### Referencias internas, no nuevos contratos

- [Transferencia dimensional MIHM — experimental](../architecture/sfi/MIHM-DIMENSIONAL-TRANSFER-MODEL-0.md)
- [Selección de método MIHM — canon](../canon/05_MIHM_METHOD_SELECTION.md)
- [Familia Phi — canon](../canon/06_MIHM_PHI_FAMILY.md)
- [Hipótesis, proposiciones y predicciones — canon](../canon/08_HYPOTHESES_PROPOSITIONS_PREDICTIONS.md)
- [Preregistro/ejecución Method Lab](../../src/lib/method-lab/experimentContract.ts)
- [Exportación de preregistro](../../src/lib/method-lab/preregistrationExport.ts)
- [Referencia de protocolo experimental preexistente](./decision-transfer/SFI-DT-EXP-001-FREEZE-CURRENT.md)

**Regla editorial:** este es un borrador de trabajo vivo, no un resultado, no un reporte de laboratorio, no una publicación científica y no una afirmación de preregistro externo.

---

## Documentary convergence follow-up (NON-NORMATIVE)

**Shared research tracking:** [SFI · Three-Experiment Convergence — LCI / SFI-DT / MIHM-T / PEMS](./SFI-THREE-EXPERIMENTS-CONVERGENCE.md).

MIHM-T's distinctive object is the **bounded system trajectory**, not the individual's decision structure (SFI-DT) or the artificial-agent developmental lineage (LCI). The candidate PEMS property asks which relations, historical dependencies, temporal coordinates and hard invariants must persist for a defined trajectory-reconstruction/intervention task. There is **no universal accepted percent difference**; per-task loss, unit, error costs, falsification and non-negotiable authority/evidence invariants must be fixed before test.

The master follow-up matrix records `X-01`, `X-02`, `X-03`, `X-04`, `X-07`, `X-08` and `X-09`. This tracking note does **not** freeze missing MIHM-T preregistration fields, authorize a confirmatory run, equate cross-method Phi variables or create a live Research Hub entry. The scientific status remains `DRAFT_UNFROZEN`.
