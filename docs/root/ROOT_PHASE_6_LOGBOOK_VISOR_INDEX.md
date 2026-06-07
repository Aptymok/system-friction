# ROOT Phase 6 - Bitacora / Indice / Visor

## Alcance cerrado

Fase 6 unifica la lectura de Bitacora, Indice y Visor sin crear un dashboard nuevo.

Se agrego `src/lib/root/rootLogbookTranslator.ts` para traducir entradas visibles a un formato operativo:

- fecha o ausencia de timestamp visible
- origen
- por que importa
- capa
- nodo afectado
- patron alimentado
- objetivo tocado
- evidencia adjunta
- peso general
- peso direccional
- que falta
- accion abierta

## Integracion

Se actualizo `src/observatory/components/root/VisorMode.tsx` para usar un acordeon de bitacora dentro del Visor existente. Las acciones del acordeon abren el chat con contexto, pero no registran, ejecutan ni promueven evidencia.

Se ajustaron:

- `src/observatory/components/root/VisorSidebar.tsx`
- `src/observatory/components/root/visorTypes.ts`
- `src/observatory/components/root/VisorGoldenNode.tsx`

El indice ahora orienta la lectura y deja claro que el chat sigue libre.

## Reglas respetadas

- No se duplico el Visor.
- No se creo una carpeta `components/visor` paralela porque los componentes reales viven en `components/root`.
- No se tocaron Supabase, migraciones ni datos.
- La bitacora no convierte una entrada en hecho cerrado sin evidencia y criterio de cierre.

## Pendiente fuera de esta fase

Botones como "Ver evidencia", "Ir al nodo afectado" y "Ver en Atlas" abren contexto conversacional. No navegan ni ejecutan acciones reales todavia.
