# ROOT Phase 8 - Twin / AMV como agente activo

## Alcance cerrado

Fase 8 convierte la cola visible del Twin / AMV en lectura de propuestas operativas. No cambia reglas de decision, no ejecuta acciones y no crea Acciones de Realidad.

Se agrego:

- `src/lib/root/rootTwinProposalTranslator.ts`

El traductor devuelve para cada propuesta:

- titulo operativo
- motivo
- evidencia que la sostiene
- nodo afectado
- atractor afectado si existe
- consecuencia si se acepta
- consecuencia si se rechaza
- estado traducido
- fecha
- caducidad si existe
- resultado si existe
- aprendizaje derivado si existe
- que falta
- accion recomendada
- tipo operativo: propuesta, mutacion, evidencia, accion pendiente o accion ejecutada
- capa ROOT

## Integracion

Se actualizo:

- `src/observatory/components/root/AcpProposalConsole.tsx`

La consola sigue siendo la misma superficie. No se creo dashboard nuevo ni pantalla paralela.

## Reglas respetadas

- Propuesta aceptada no se trata como accion ejecutada.
- Accion ejecutada no se trata como evidencia externa si no hay testigo visible.
- Intencion no es decision.
- Decision no es realidad modificada.
- Twin no ejecuta.
- Twin no bloquea decision raiz.
- Twin declara ausencia de evidencia cuando falta.
- Twin diferencia propuesta, mutacion, evidencia, accion pendiente y accion ejecutada.

## Pendiente fuera de esta fase

No se implemento motor de Acciones de Realidad ni verificacion externa. No se calculo RCE ni deuda real. La consola solo traduce y orienta la decision existente.
