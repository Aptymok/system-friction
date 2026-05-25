# Observation Truth Policy

La capa de fuente evita ambiguedad operativa.

No cambia la direccion del campo. No responde a criticas externas. Solo declara de donde viene cada lectura.

## 1. Lectura local

Usa senal del usuario, patron, nodo, bitacora y matriz vectorial.

No representa el mundo externo.

## 2. MIHM interno

Usa variables disponibles del asset o del campo.

Si faltan variables, no las inventa.

## 3. WorldSpect local

Prepara decisiones que dependen del mundo.

No afirma datos externos.

## 4. WorldSpect externo

Solo existe cuando hay fuente, API, URL y timestamp externo.

## 5. Social return

Solo existe cuando hay metricas reales de plataforma.

## 6. Simulacion

Debe marcarse como `SIMULATED`.

## 7. Fuente faltante

Si no hay origen, mostrar:

`origen faltante`

## Regla

Ninguna lectura puede presentarse como externa si `sourceState` no es `WORLDSPECT_EXTERNAL` o `SOCIAL_RETURN`.

Si el usuario pide mundo, tendencia, metrica, plataforma o alcance externo y la fuente no es externa, la lectura se degrada a:

`Lectura local. Fuente externa no conectada.`
