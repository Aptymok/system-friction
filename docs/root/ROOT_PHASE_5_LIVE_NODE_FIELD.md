# ROOT Phase 5 - Campo de Nodos vivo

## Alcance cerrado

Fase 5 prepara el Campo de Nodos como lectura viva de nodos existentes. No crea nodos, no promueve evidencia, no toca datos productivos y no cambia la estetica global.

Se agrego `src/lib/root/rootNodeTranslator.ts` como capa unica para traducir cada nodo visible a:

- nombre operativo
- funcion
- cluster
- estado traducido
- peso general cuando existe dato visible
- peso direccional cuando aplica
- dependencias visibles
- consecuencia si degrada
- accion recomendada
- capa ROOT segun Fase 2

## Integracion

Se conecto el traductor en:

- `src/observatory/components/root/NodeClusterSurface.tsx`
- `src/observatory/components/root/AcpFieldRegimeView.tsx`

`AcpFieldRegimeView` es la vista que actualmente renderiza el campo principal en ROOT. Por eso se conecto alli ademas del componente probable listado para evitar crear una pantalla paralela.

## Reglas respetadas

- La puerta dorada del Visor queda declarada como puerta, no como nodo observable.
- Los pesos no se inventan: si no existe peso declarado o evidencia visible, el traductor devuelve ausencia explicita.
- Sandbox, auditoria, archivo, observatorio vivo y atractor se separan usando los clasificadores de Fase 2.
- Propuestas, pruebas y simulaciones no se tratan como ejecucion real.

## Pendiente fuera de esta fase

No se implemento Campo de Nodos nuevo ni se rehicieron layouts. Cualquier accion de realidad, limpieza de datos o promocion de evidencia pertenece a fases posteriores o a trabajo separado.
