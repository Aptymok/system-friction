---
layout: doc
title: Catálogo de patrones
published: 2026-03-01
version: "1.0"
stability: activo
type: core · catálogo
related:
  - url: /docs/core-nti/
    num: "core-nti"
    title: NTI · Auto-auditoría
    sub: "El instrumento de medición del propio ecosistema."
  - url: /mihm/
    num: "MIHM"
    title: Motor de validación
    sub: "Estado activo del ecosistema."
---

# Catálogo de patrones

Este documento formaliza los patrones identificados en System Friction
y los mapea a sus variables MIHM correspondientes.

Un patrón es una configuración recurrente observable en sistemas
distintos. No es una metáfora. Es una estructura funcional que
produce los mismos efectos bajo condiciones similares.

---

## Patrón: Umbral Dual

**Definición:** Todo sistema crítico opera simultáneamente con dos umbrales:
el que declara (oficial) y el que importa (real). La distancia entre ambos
es la zona donde opera la fricción sistémica.

**Condiciones de aparición:** Sistema con métricas de cumplimiento formalizadas.
Actores con incentivo para mantener la distancia invisible.

| Variable MIHM | Ecuación | Proxy observable |
|---|---|---|
| `L_i` latencia | LDI = t_acción / t_referencia | Días entre alerta técnica y acción correctiva |
| `E_i` carga | Δ_umbral = (oficial − real) / real | Porcentaje de desviación no reportada |
| `M_i` coherencia | M = 1 − |declarado − observable| / declarado | Ratio declaraciones / incidentes verificados |

**Condición de refutación:** Si en 90 días post-observación el IHG
sube > 0.30 sin intervención documentada, el patrón no aplica
o la variable K_invisible domina.

---

## Patrón: Latencia Política

**Definición:** La latencia no es un problema técnico. Es una variable
de ajuste político: los tiempos de respuesta se expanden cuando
la acción implica consecuencias institucionales indeseadas.

**Condiciones de aparición:** Presente en sistemas con actores con poder
de veto informal sobre la ejecución. L_i > 0.6 sostenida en el tiempo.

| Variable MIHM | Ecuación | Proxy observable |
|---|---|---|
| `L_i^eff` latencia efectiva | L_eff = L × (1 + (1 − M_i)) | L_i ajustada por coherencia discurso-función |
| `M_i` coherencia | M = ausencia_funcional_en_mesa / total_reuniones | Secretario ausente / reuniones totales |

**Condición de refutación:** Si L_i baja < 0.40 sin cambio en la
composición de actores decisores, la latencia era técnica, no política.

---

## Patrón: Coherencia Discurso-Función (M_i)

**Definición:** El diferencial entre lo que el sistema declara que hace
y lo que hace operativamente. Cuando M_i < 0.6, la latencia efectiva
supera a la latencia medida: L_eff > L_i.

**Condiciones de aparición:** Observable en actos públicos: funcionario
declara control total mientras el indicador operativo muestra degradación.

| Variable MIHM | Ecuación | Proxy observable |
|---|---|---|
| `M_i` | M = 1 − (días_declaración_tranquilizadora / días_incidente_verificado) | Comunicados oficiales vs eventos verificados en mismas fechas |

**Condición de refutación:** Si M_i < 0.5 durante > 30 días sin
deterioro de IHG, el patrón no produce fricción sistémica medible
en ese nodo.

---

## Patrón: Equilibrio Implícito (U_P)

**Definición:** Estabilidad sostenida por un acuerdo no documentado.
No genera señal detectable hasta la fractura. El colapso es abrupto,
no gradual.

**Condiciones de aparición:** ICC concentrado (> 0.65). Variable K_invisible
domina sobre K_i medible.

| Variable MIHM | Ecuación | Proxy observable |
|---|---|---|
| `K_invisible` | K_inv = estabilidad_operativa / (E_i × L_i) bajo acuerdo | Ratio de baja incidencia sin explicación institucional |
| `U_P` función de utilidad del pacto | U_P = V_logística + V_industrial − C_conflicto | Beneficio neto del corredor para todos los actores |
| N6 exógeno | Activar cuando K_invisible colapsa en < 24h | Bloqueos, extorsión, interrupción logística |

**Condición de refutación:** Si después de la fractura el IHG
no baja > 0.15 en 48h, el equilibrio no era implícito sino
estructuralmente sólido.

---

## Patrón: Agua Rentada / Extracción No Registrada

**Definición:** Recurso con concesión oficial que opera bajo acuerdos
extrajurídicos. Los indicadores oficiales describen un sistema que
ya no opera como se describe.

**Condiciones de aparición:** E_N4 > 0.85. Brecha entre extracción
concesionada y consumo eléctrico de bombeo.

| Variable MIHM | Ecuación | Proxy observable |
|---|---|---|
| `E_i` acuífero | E = extracción_real / recarga_anual | kWh bombeo CFE / factor de conversión m³ |
| `ICC` conocimiento | ICC = Σ_j f_j² | Concentración del conocimiento sobre pozos no reportados |

**Condición de refutación:** Si variación en consumo eléctrico de
bombeo es < 5% frente a concesión registrada, la brecha no es
operativamente significativa.

**Límite de aplicación:** Este catálogo es acumulativo.
Los patrones no son mutuamente excluyentes ni jerárquicos.
Un nodo puede activar simultáneamente Umbral Dual, Latencia
Política y Equilibrio Implícito. La interacción entre patrones
no está formalizada en v1.0.

Versión: 1.0 · Estabilidad: activo (se expande con cada nodo nuevo)