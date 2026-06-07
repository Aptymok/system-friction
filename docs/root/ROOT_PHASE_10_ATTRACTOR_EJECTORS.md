# ROOT Phase 10 - Atractor, eyectores y degradacion

## Cierre de fase

Fase 10 queda cerrada como capa de lectura operativa. ROOT ahora prepara una lectura del Atractor sin inventar fuerza, RCE, deuda ni valores direccionales cuando no hay datos visibles suficientes.

## Atractor

Se agrego `src/lib/root/rootAttractorState.ts` como traductor de estado direccional.

La lectura exige soporte visible antes de declarar atractor:

- propuesta o senal con direccion operativa visible
- evidencia conectada con peso direccional declarado
- capa compatible con Atractor o Observatorio Vivo
- exclusion de Sandbox, pruebas, simulaciones y auditoria tecnica como soporte principal

Cuando no existe soporte suficiente, la lectura principal devuelve:

`Sin lectura suficiente.`

La accion recomendada en ese caso es no fortalecer atractor y observar soporte real antes de promover direccion.

## Evidencia direccional

ROOT no trata como soporte de Atractor:

- pruebas
- simulaciones
- sandbox
- evidencia administrativa sin relacion direccional visible
- propuesta aceptada sin ejecucion verificable
- accion ejecutada sin testigo externo
- auditoria tecnica

Una evidencia registrada no equivale por si sola a realidad modificada.

## Eyectores

Se agrego `src/lib/root/rootEjectorDetector.ts` como detector interpretativo.

Cada eyector se expresa con:

- nombre
- que hace
- origen
- gravedad
- capa afectada
- accion recomendada
- estado traducido

Cuando hay indicio pero no hay datos suficientes, se muestra como posible eyector. No se cierra como hecho.

## Superficie modificada

`AcpAttractorFieldView` ahora muestra primero lectura operativa:

- direccion del Atractor
- soporte visible
- patrones que refuerzan
- eyectores activos o posibles
- validacion externa si existe
- riesgo de circuito cerrado si puede declararse
- accion recomendada

Los detalles tecnicos quedan fuera de la lectura principal cuando no gobiernan la decision.

## Limites respetados

No se creo motor nuevo de Atractor.
No se creo calculo real de RCE.
No se creo calculo de Deuda de Realidad.
No se crearon Acciones de Realidad.
No se alimento Atractor con pruebas, simulaciones ni Sandbox.
No se tocaron Supabase, migraciones ni datos productivos.
