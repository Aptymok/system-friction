# MIHM · Prerregistro: disipación de procedencia en transformaciones sucesivas

| Campo | Valor |
|---|---|
| ID | `[POR ASIGNAR]` (verificar que no colisione con la numeración SFI-DT / SFI-EXP existente) |
| Versión | 0.2 — CANDIDATO, NO CONGELADO, NO EJECUTADO |
| Institución | System Friction Institute |
| Autoridad | ACP. Ningún cambio de estado sin su aprobación explícita |
| Relación con C-1 | Extiende SFI-EXP-C1 (1 salto) a k saltos. Su ejecución depende de la compuerta de la sección 11 |
| Efecto sobre el canon | Ninguno. No modifica Φ_H, Φ_S, Φ_F, Φ_W, Φ_SFI ni las definiciones vigentes de IHG, NTI, LDI, ξ |

Etiquetas epistémicas usadas en este documento:
- **[M]** medido o definido por construcción.
- **[S]** supuesto o valor propuesto, sujeto a fijación antes del congelamiento.
- **[POR FIJAR]** valor que debe decidirse antes de congelar y no puede cambiarse después.

> **Estado de incorporación a SFI (revisión documental):** candidato aportado por el investigador, **NO CONGELADO / NO EJECUTADO**. En main existen `src/lib/events/eventStore.ts`, `src/lib/events/atomicAppend.ts` y `scripts/qa-sfi-mem002-postgres.ts`; su existencia no certifica la compuerta T1–T7. No se localizó por búsqueda literal el registro `SFI-EXP-C1` o `SFI-COLLAB-005`; las referencias son dependencias declaradas pendientes de reconciliación con sus identidades persistentes. Los criterios [POR FIJAR] y la autoridad ACP permanecen abiertos. No constituye un experimento realizado ni un RETURN.

---

## 1. Pregunta

Cuando un registro pasa por transformaciones sucesivas (resumen, compactación, relevo entre instancias), ¿se pierde o se fabrica información verificable de manera que el número de transformaciones, controlando tipo de operación y características del contenido, mejore la predicción de esa pérdida frente a alternativas más simples?

## 2. Hipótesis

- **H0.** Un modelo de disipación por saltos no predice la pérdida en documentos no usados para ajustarlo mejor que el modelo de conservación constante ni que un modelo basado solo en covariables del contenido y de la operación.
- **H1.** La pérdida acumulada D(k) crece con k hasta una asíntota D∞ ≤ 1, y ese modelo predice fuera de muestra mejor que los comparadores de la sección 7.
- **H2 (exploratoria).** La pérdida depende más del tipo y la calidad de la operación que de su cantidad. Un resultado compatible con H2 es tan informativo como uno compatible con H1.

## 3. Unidades y variables

**Documento original (O).** Texto con procedencia verificable, descompuesto en una **clave de afirmaciones** A = {a₁…a_n}. Cada afirmación es atómica y se clasifica por tipo: fecha, sujeto, cantidad, restricción, decisión, referencia, relación causal. Cada una lleva una marca `crítica` (sí/no) fijada antes de cualquier transformación.

**Registro transformado T_k.** Resultado tras k transformaciones. T₀ = O.

**Métricas (todas [M], calculadas por evaluación ciega, sección 8):**

```
D(k) = proporción de afirmaciones de A ausentes o alteradas en T_k
Dc(k) = igual que D, restringida a afirmaciones críticas
F(k) = nº de afirmaciones de T_k sin respaldo en O / nº total de afirmaciones de T_k
V(k) = proporción de errores presentes en O que T_k corrige de forma verificable
       (solo si O contiene errores sembrados o conocidos; si no, V no se reporta)
```

**Regla.** D y F son dimensiones distintas y no se combinan en un índice. La omisión y la fabricación tienen causas y costos diferentes. Un registro puede tener D baja y F alta.

## 4. Modelo candidato

```
D(k) = D∞ · (1 − e^(−λ·k)),    0 ≤ D∞ ≤ 1,  λ ≥ 0
```

- D∞ es la pérdida asintótica. Se estima, no se fija.
- λ es la tasa de disipación por salto. Se estima con intervalo, no se fija.
- Caso nulo contenido en el modelo: D∞ = 0.
- Se ajusta como **modelo no lineal mixto**: documento como efecto aleatorio; tipo de operación y transformador como efectos fijos. Así k no queda confundido con el tipo de operación.

Relación con MIHM: la magnitud se registra como componente experimental **LDI_procedencia**, separada de `LDI_temporal` (`calculateLdiFromAge`, por horas) y del LDI institucional. Cualquier equivalencia entre ellos exige un método interinstrumento versionado y aprobado, conforme a `docs/MIHM_PHI_CANON.md`. Este estudio no lo establece.

## 5. Diseño

### 5.1 Documentos
- Mínimo piloto: 6 documentos. Protocolo principal: 20–30 documentos [S], tamaño final recalculado con la varianza del piloto (sección 9).
- Estratificación por longitud y densidad de afirmaciones críticas.
- Partición por **documento**, no por cadena: el 50 % [S] para ajuste, el 50 % para evaluación confirmatoria. Ninguna variante de un documento cruza la partición.

### 5.2 Cadenas
- Valores de k: 0, 1, 2, 4 [S].
- Cada documento recorre al menos 3 cadenas con **orden de operaciones aleatorizado** (semilla registrada).
- Operaciones: resumen, compactación, relevo a instancia sin contexto. El tipo de cada salto se registra.
- Se conserva, por cada paso: texto de entrada, instrucción exacta, modelo, versión, temperatura y parámetros, marca de tiempo, hash SHA-256 de la salida.
- **k = 0 con re-evaluación del original**: mide el piso de error del evaluador. Todo D inferior a ese piso se trata como ruido.

### 5.3 Contaminación y confidencialidad
- Los documentos deben ser posteriores al corte de conocimiento de los transformadores, o sintéticos con clave conocida, o internos no publicados.
- **Ningún documento confidencial de INEGI ni de terceros.** Solo material público, propio de SFI o sintético.

## 6. Predicciones fijadas antes de medir

Se registran en el congelamiento (sección 12), con números, y no se editan después:

```
P1: D∞ estimada ∈ [POR FIJAR]
P2: λ_resumen vs λ_relevo: [POR FIJAR dirección y magnitud]
P3: F(k) crece con k en cadenas con relevo a instancia sin contexto: [POR FIJAR]
```

## 7. Comparadores

Todos reciben información equivalente y presupuesto de ajuste comparable. Todos predicen D(k) **sin observar T_k**:

1. **Conservación constante.** D(k) = d₀ (sin dependencia de k).
2. **Lineal en k.** D(k) = min(1, β·k).
3. **Covariables.** D = f(tipo de operación, longitud, densidad de críticas), sin k.
4. **Modelo candidato con covariables.** Asíntota más tipo de operación.

La evaluación directa de T_k contra O es la **medición**, no un comparador.

## 8. Evaluación

- Dos evaluadores humanos, ciegos al número de saltos y al transformador. Adjudicación de discrepancias por un tercero.
- **Condición de validez:** acuerdo entre evaluadores κ ≥ 0.70 [S] en el conjunto de ajuste. Si no se alcanza, se revisa la clave de afirmaciones antes de continuar.
- Un evaluador-IA puede usarse como **segunda lectura** y se reporta su acuerdo con los humanos. Nunca decide la etiqueta final: de lo contrario hay circularidad entre transformador y evaluador.
- Cada decisión del evaluador queda registrada con su justificación.

## 9. Análisis

- **Variable principal:** error de predicción de D en documentos de evaluación (RMSE [S]), por modelo.
- **Umbral de éxito de H1:** el candidato reduce el error al menos [POR FIJAR]% frente al mejor comparador, con intervalo de confianza al 95 % que excluya cero.
- **Potencia y tamaño de muestra:** se calculan por simulación a partir de la varianza entre documentos y entre cadenas observada en el piloto. No se fija antes del piloto.
- Intervalos por bootstrap por documento, 1000 remuestreos [S].
- Se reportan siempre: λ y D∞ con intervalo; estabilidad de λ entre tipos de operación; F(k) por separado; Dc(k) por separado.
- Todo análisis no listado aquí se etiqueta **exploratorio** y no sostiene conclusiones.

## 10. Criterios de refutación

La hipótesis se debilita o se rechaza si ocurre cualquiera de estos hechos:

1. El candidato no supera al mejor comparador según el umbral de la sección 9.
2. λ es inestable entre tipos de operación, de forma que no existe un valor útil por salto.
3. La covariable "tipo de operación" explica más varianza que k (soporta H2, no H1).
4. El κ entre evaluadores no alcanza el umbral y no se corrige.
5. El efecto desaparece al controlar contaminación.

Se reportan igualmente: cadenas sin pérdida observable y cadenas con V(k) > 0 (mejora tras una transformación).

## 11. Compuerta previa de integridad (obligatoria)

Antes de congelar este protocolo debe estar resuelta la prueba de integridad del registro de eventos, por decisión vigente de SFI-COLLAB-005 / MEM-002. El orden es:

```
T1–T7 sobre eventStore  →  piloto C-1  →  este protocolo
```

Pruebas críticas para este estudio:
- **T2:** un fallo de lectura nunca produce una cadena válida.
- **T5:** más de 500 eventos.
- **T6:** escrituras concurrentes y bifurcaciones.

Mientras T2, T5 y T6 no estén verificadas con resultados reproducibles, ninguna medición de pérdida es admisible como evidencia.

## 12. Congelamiento

El protocolo pasa de CANDIDATO a CONGELADO únicamente cuando:

1. Estén completos todos los campos `[POR FIJAR]`.
2. La compuerta de la sección 11 esté cerrada.
3. Se cree un commit con este archivo y se registre su SHA-256 y su hash de commit en este mismo documento (sección 15).
4. El ACP apruebe el congelamiento.

Después del congelamiento, todo cambio se registra como **desviación** (sección 14), con fecha, motivo y efecto sobre el análisis. No se reescribe el texto congelado.

## 13. Reporte de resultados (RETURN)

Formato final de entrega:

| Sección | Contenido |
|---|---|
| A. Resuelto | Qué quedó respondido, con intervalo |
| B. Ejecutado | Qué se corrió realmente, con hashes |
| C. Persistido | Qué quedó registrado y dónde |
| D. Adverso | Resultados contrarios a H1, F(k), cadenas con mejora |
| E. Bloqueado | Qué no pudo medirse y por qué |
| F. Estado científico | Exploratorio / Confirmatorio, y límites |

## 14. Registro de desviaciones

| Fecha | Cambio | Motivo | Efecto en el análisis |
|---|---|---|---|
| — | — | — | — |

## 15. Registro de congelamiento

```
commit:    [pendiente]
sha256:    [pendiente]
fecha:     [pendiente]
aprobado:  [pendiente — ACP]
```

## 16. Límites declarados

- La forma exponencial con asíntota es una hipótesis de comportamiento, no una ley.
- "Disipación" designa aquí contabilidad de información. No se afirma equivalencia con energía física sin medición física.
- No se promete novedad: la fidelidad de resúmenes y el linaje de datos tienen literatura previa. La contribución a evaluar es la medición de la tasa por salto con preregistro y separación de omisión y fabricación.
- Ninguna simulación se presenta como observación.