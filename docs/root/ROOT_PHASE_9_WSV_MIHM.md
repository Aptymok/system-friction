# ROOT Phase 9 - WSV y MIHM interpretables

## Alcance cerrado

Fase 9 traduce WSV y MIHM como lecturas interpretables en ROOT. No crea lectura simulada, no hardcodea valores y no modifica fuentes de datos.

Se agregaron:

- `src/lib/root/rootWsvTranslator.ts`
- `src/lib/root/rootMihmTranslator.ts`

## WSV

El traductor WSV responde:

- como esta el mundo observado hoy
- fuentes activas
- fuente degradada si existe
- campo dominante
- ultima lectura real
- integridad
- implicacion operativa para Aptymok

Si no hay lectura del dia, usa la ultima lectura disponible o declara lectura pendiente. WSV nunca se presenta solo como "OK".

## MIHM

El traductor MIHM responde:

- objeto observado
- IHG con lectura humana
- NTI con lectura humana
- LDI con lectura humana
- PHI con lectura humana
- regimen resultante
- direccion
- nivel de confianza
- que falta

Si MIHM no declara objeto observado, no muestra indicadores como regimen valido y declara lectura incompleta.

## Integracion

Se actualizo:

- `src/observatory/components/root/GlobalMetricsView.tsx`
- `src/observatory/components/root/RootDashboardClient.tsx`
- `src/lib/root/rootFieldState.ts`

La vista de metricas ahora muestra WSV y MIHM como lectura humana. Los chips superiores usan la misma traduccion para evitar estados crudos o lectura tipo OK.

## Reglas respetadas

- No se hardcodearon valores, timestamps, RCE, deuda ni conteos.
- No se creo lectura simulada.
- No se interpreto MIHM sin objeto observado como decision valida.
- WSV degradado declara implicacion.
- RCE queda en fallback explicito porque no hay modelo suficiente de acciones verificadas y decisiones aceptadas.

## Pendiente fuera de esta fase

No se implemento Fase 10. No hay motor de atractores, eyectores, deuda real ni conversion de realidad. Esos modelos requieren fases posteriores y evidencia verificable.
