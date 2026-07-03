# Observatory WSV Contract

## Estado

Contrato visual y operativo para `/observatory`.

## Proposito

Este documento fija la regla de representacion del diagrama inferior de `/observatory`.

El panel inferior identificado como `WSV COMPONENTES` representa exclusivamente la composicion del World Spect Vector por dominio WorldVector/WorldSpect.

No representa MIHM, IHG, NTI ni LDI. No debe rellenarse con indicadores core cuando falten dominios.

## Regla principal

`/observatory` puede mostrar indicadores core en gauges, pero el radar inferior de dominios debe usar solo `state.domainBreakdown`.

```text
coreIndicators -> gauges superiores/laterales
state.domainBreakdown -> radar WSV por dominio
```

## Fuente de datos

La fuente canonica del radar WSV es:

```text
WorldSpect snapshot
  -> deriveWorldVectorObservation()
  -> domain_values
  -> buildSfiWorldInterfaceState()
  -> state.domainBreakdown
  -> SfiObservatoryHero
```

El componente visual no debe reconstruir dominios por su cuenta. La reconstruccion corresponde a la capa WorldVector.

## Dominios WSV

Dominios esperados:

- `CULTURAL`
- `ECONOMY`
- `GEO_DIGITAL`
- `GEOPOLITICAL`
- `BIO`
- `CLIMATE`
- `INSTITUTIONAL`
- `MEMETIC`
- `TECH`
- `AFFECTIVE`

El sistema puede mostrar un subconjunto si el snapshot no tiene suficiente evidencia, pero no debe sustituir dominios ausentes con indicadores MIHM.

## Comportamiento permitido

Si hay 3 o mas dominios con valor usable:

- mostrar radar WSV;
- mostrar valor por dominio;
- mostrar confianza;
- mostrar numero de fuentes;
- mostrar brecha al nucleo;
- mostrar brecha al optimo;
- mostrar interpretacion por tooltip o click.

Si hay menos de 3 dominios con valor usable:

- mostrar `WSV DOMAIN SOURCE GAP`;
- explicar que faltan dominios WorldVector;
- no renderizar radar MIHM;
- no usar IHG, NTI o LDI como sustituto visual.

## Separacion semantica

WSV significa persistencia vectorial del campo observado.

Un valor alto no implica bienestar. Puede indicar activacion, saturacion, atencion colectiva, persistencia de tension o proximidad al optimo aparente del eje.

IHG, NTI y LDI son indicadores sistemicos internos/core. Pueden acompanar la lectura, pero no componen el radar WSV.

## Reglas de interfaz

1. El mapa no debe depender del radar.
2. El radar no debe modificar el mapa.
3. El radar debe consumir `state.domainBreakdown`.
4. El radar debe mostrar brecha real cuando no haya dominios suficientes.
5. El radar debe tener tooltips o interaccion por click/tap.
6. Los tooltips deben distinguir valor alto, valor bajo, confianza y fuente.
7. El texto debe evitar frases como `good performance`, `equilibrio general` o `sistema sano` si no existe evidencia.

## Contrato de tooltip

Cada dominio debe poder desplegar:

```text
DOMINIO
Valor: 0-100
Banda: urgencia | criticidad media | adecuacion relativa | saturacion / optimo aparente
Confianza: 0-100% o no disponible
Fuentes: n
Brecha al nucleo: value
Brecha al optimo: 1 - value
Interpretacion: lectura contextual sin asumir bienestar
```

## Criterio de cierre

El contrato se cumple cuando:

- `/observatory` muestra mapa sin ruptura;
- el panel inferior muestra WSV por dominio;
- no hay fallback visual a MIHM;
- los dominios se reconstruyen desde WorldSpect cuando `sources` venga incompleto;
- los tooltips despliegan valor e interpretacion;
- Vercel pasa sobre `main`.

## Relacion con rutas

- `/observatory`: visualiza WSV, mapa e indicadores operativos.
- `/field`: aplica evaluacion y seguimiento MOPH.
- `/studio`: laboratorio creativo-operativo.
- `/root`: consola de gobernanza.

## Cierre

El radar WSV debe ser un instrumento de observacion del campo, no una decoracion ni un fallback de MIHM.
