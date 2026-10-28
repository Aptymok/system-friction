# MIHM v2.0 — auditoría aritmética de legado (P0, NO adopción)

**Fecha de auditoría:** 2026-10-28. **Programa:** `SFI-MIHM-FOUNDATION-001`. **Fuente primaria:** `MIHM_v2_final.pdf`, manuscrito de 23 febrero 2026, tablas 2/6, ecuación (6), sección 6 y Listing 1. **Código de contraste:** `src/lib/mihm/historicalV2Arithmetic.test.ts`.

## Qué se hizo

Se transcribieron los valores publicados de `C,E,L,M` para cinco nodos basales y seis nodos posteriores, sin atribuirlos a observaciones independientes. Se reprodujo estrictamente la función incluida en el propio manuscrito:

`L_eff = min(L * (1+(1-M)),1)`
`IHG = mean((C-E)*(1-L_eff))`

La auditoría **no** adopta la fórmula como matemática canónica ni revalida la procedencia de cada proxy original.

| Contraste | Afirmación del manuscrito | Resultado reproducido desde los propios vectores y fórmula |
|---|---:|---:|
| IHG basal (5 nodos, M=1) | −0.410 | +0.066640 |
| IHG posterior (6 nodos, M_N5=0.5, M_N6=0.7) | −0.620 | +0.0278333 |
| IHG×NTI (NTI=0.351) | −0.218 | +0.0097695 |
| Efecto de reducir L_N6 de 0.85 a 0.43 | mejora ~+0.12 | **−0.040425** de cambio IHG |
| ICE posterior (simplificado) | 0.208 | 0.96/4.61 = 0.208243 |
| NTI con los componentes impresos | 0.351 | 0.351 |

No todo está equivocado: ICE y el promedio de NTI sí coinciden aritméticamente con esos componentes. **Pero concordancia aritmética no demuestra que los proxies tengan validez empírica.**

## Control de rangos y colapso 2030

Para `C,E,L,M ∈ [0,1]`, cada sumando `(C-E)*(1-L_eff)` está en `[-1,1]`; por ello la media también está en `[-1,1]`. El criterio estricto `IHG < -1` del código Monte Carlo **nunca puede activarse** bajo esas restricciones. Queda solamente la condición alternativa `E_1 > 0.98`, cuya probabilidad depende del generador de perturbaciones y no equivale a «colapso multisistémico antes de 2030». Las afirmaciones >70% y 31% del manuscrito no están reconciliadas con el código y no deben utilizarse como probabilidades calibradas.

El manuscrito presenta una ruta de trabajo hasta 2030, **no una observación del año 2030**, y la supervivencia/homeostasis de un sistema real no se mide en esta prueba.

## Disposición científica

- **OBSERVED_DOCUMENTARY:** la fórmula, tablas y afirmaciones son material histórico fuente.
- **DERIVED:** incompatibilidades numéricas y demostración de imposibilidad de `IHG < -1` bajo los límites publicados.
- **UNKNOWN:** origen y licitud de cada proxy, reglas originales de calibración, representatividad, versiones históricas de fuentes y si otra función realmente generó las cifras impresas.
- **NOT_VALIDATED:** probabilidad de colapso 2030, efectividad de AMT/PAC, causalidad, ventaja frente a modelos históricos.
- **DO NOT MUTATE:** no sustituir retroactivamente IHG histórico ni cambiar Phi, ROOT, autorización o políticas operativas.

**Siguiente prueba:** recuperar fuentes originales con corte temporal, documentar unidades y restricciones, especificar un modelo comparador con igual información, congelar un endpoint prospectivo de viabilidad y probar mecanismos falsables en una cohorte externa, manteniendo los errores originales accesibles.

## Antecedentes rivales útiles (no equivalencias ni certificación de novedad)

- Control predictivo basado en datos con garantías y estabilidad: https://doi.org/10.1146/annurev-control-030323-024328
- Inferencia activa conjunta de percepción y acción: https://doi.org/10.1371/journal.pcbi.1013180
- Detección mediante selección secuencial de observaciones con costos: https://doi.org/10.1109/JSEN.2024.3399456
- Gemelos digitales con IA, monitoreo y optimización: https://doi.org/10.1007/s40684-025-00750-z
- Resiliencia a largo plazo y riesgo dependiente de múltiples futuros: https://doi.org/10.1038/s44287-026-00322-6

**Novedad potencial a probar, no presumir:** selección conjunta y justificada de la siguiente medición y perturbación reversible bajo restricciones de viabilidad multinodo, trazabilidad de evidencia, límites institucionales y RETURN empírico. **2030 es horizonte de evaluación, no pronóstico demostrado.**
