# SFI LAB CHECKPOINT

## 00. Estado actual

### Implementado
- `/terminal` monta un laboratorio full viewport con campo nodal, WorldSpect strip, cuadro de mando contextual, rail de proceso e input inferior.
- Existe flujo localStorage pre-registro y persistencia post-pago/licencia.
- Existe modelo de clusters en `src/observatory/laboratory/laboratoryClusters.ts`.
- Existe grafo por intención, cluster activo, proceso, modo visual y perfil comunicacional.
- Existen modos visuales CLUSTER / HIERARCHY / MESH / RADIAL / TEMPORAL / WORLD.
- Existe WorldSpect global consumible desde `/api/worldspect/global`.
- Existe ruta cron/readiness `/api/cron/worldspect`.
- Existe capa IA server-side con fallback `local_stub`.
- Existe `communicationProfile` local para saturación, trazabilidad y frases rechazadas.
- Existe QA base en `LABORATORY_UX_QA.md`.

### Parcial
- El campo ya tiene jerarquía nodal y procesos, pero aún no usa simulación física D3 ni arrastre persistente.
- Los ghost logs son ambientales y derivados de eventos de UI; falta conectarlos a bitácora persistente como fuente principal.
- Los modos de vista reorganizan geometría de forma determinista; falta ponderación avanzada por matriz vectorial completa.
- WorldSpect consume última medición global, pero la escritura cron real todavía depende de infraestructura externa.

### Pendiente
- Persistir selección de modo visual post-pago como evento trazable.
- Conectar selección de nodo/proceso con inspector técnico completo sin crear panel adicional.
- Integrar eventos reales de bitácora/AMV como fuente principal de ghost logs.
- Añadir nodos emergentes conectables/descartables con máximo 3 flotantes.
- Verificación visual automatizada con navegador cuando Playwright esté disponible.

### Bloqueado
- OAuth write y publicación real permanecen bloqueados.
- Monte Carlo, Salón Eidelón y Laboratorio avanzado no entran en esta fase.
- Métricas sociales automáticas dependen de tokens read-only reales.

## 01. Fase base — Campo nodal

Verificar:
- `/terminal` full viewport.
- Sin “Dashboard”.
- Sin “Neural Cognitive Graph”.
- Sin card lateral dominante.
- Campo visible con o sin asset activo.
- Input inferior operativo.
- Nodos emergentes solo por señal real.

Estado:
- Implementado en composición principal.
- Pendiente: emergentes conectables con acciones conectar / descartar / observar.

## 02. Fase estética — Campo Cognitivo SFI

Verificar:
- Estética alineada a `sfi_campo_cognitivo_v2_completo.html`.
- Líneas finas.
- Ruido sutil.
- Ghost logs discretos.
- Paleta sobria.
- No saturación visual.
- No look genérico SaaS.

Estado:
- Implementado parcialmente: fondo `#080808`, dorado SFI, ruido sutil, líneas finas, respiración de nodos, input inferior reactivo, ghost logs discretos.
- Pendiente: memoria atmosférica basada exclusivamente en eventos reales persistidos.

## 03. Fase nodal — Organización tipo sf-lab

Verificar:
- Modos de vista.
- Clusters.
- Jerarquía.
- Temporalidad.
- World view.
- Selección de nodo.
- Conexión visible entre nodos.
- Procesos del cluster activo.

Estado:
- Implementado: modos CLUSTER / HIERARCHY / MESH / RADIAL / TEMPORAL / WORLD, enlaces ACTIVE / LATENT / CRITICAL / RESONANT / DEGRADED, selección de cluster/proceso y procesos conectados.
- Pendiente: zoom/pan real y arrastre de nodos.

## 04. Fase agente — Pensamientos no simulados

Verificar:
- Pensamiento solo si existe evidencia.
- `rewrite_blocked` visible cuando aplique.
- `communicationProfile` actualizado.
- Frases rechazadas guardadas.
- Saturación detectada.
- Trazabilidad presente.

Estado:
- Implementado parcialmente: el agente visible responde con texto comprimido; `communicationProfile` detecta saturación, trazabilidad y frases rechazadas.
- Pendiente: bloquear cualquier ghost log que no provenga de bitácora, evento real o bloqueo real.

## 05. Fase WorldSpect

Verificar:
- `/api/worldspect/global` OK.
- `/api/cron/worldspect` OK.
- Strip global visible.
- No domina la pantalla.
- Se integra como clima del sistema, no como dashboard.

Estado:
- Implementado: strip basal, endpoint global y endpoint cron/readiness.
- Pendiente: cron de escritura real del snapshot global con fuentes verificadas.

## 06. Fase QA

Verificar:
- `npm run build` OK.
- `npx tsc --noEmit` OK.
- `/terminal` responde 200.
- `/terminal` sin sesión redirige o entra en modo local según regla vigente.
- `/terminal` con sesión carga.
- No etiquetas prohibidas iniciales.
- Responsive mínimo.

Estado:
- `npx tsc --noEmit` y `npm run build` deben correr en cada checkpoint.
- `/terminal` responde 200 en modo local vigente.
- Búsqueda de etiquetas prohibidas se mantiene limpia en componentes iniciales del laboratorio.

## 07. Delta pendiente

### Falta implementar
- Zoom/pan y selección espacial de nodos sin D3.
- Nodos emergentes conectables.
- Snapshot visual/export local sin crear dashboard.
- Bitácora persistente como fuente primaria de ghost logs.
- Test visual automatizado con navegador.

### Debe refactorizarse
- El shell conserva componentes legacy no renderizados por seguridad de transición; deben retirarse cuando ATLAS/Laboratory cubra todas las acciones.
- Algunos nombres internos siguen existiendo en APIs históricas, pero no deben aparecer como primera vista.

### Debe mantenerse
- LocalStorage pre-pago.
- Persistencia Supabase solo después de cuenta/licencia.
- WorldSpect como medición global, no lectura local.
- IA solo server-side.
- No publicación automática.
- AMV visible sin “Veo / Significa / Sigue” por defecto.

### No debe agregarse todavía
- OAuth write.
- Monte Carlo profundo.
- Dashboard paralelo.
- Salón Eidelón.
- Laboratorio avanzado externo.
- Métricas sociales simuladas.

## Criterio de aceptación

`/terminal` se considera laboratorio nodal real cuando la primera impresión sea:

> un laboratorio nodal vivo de System Friction

y no:

> un dashboard con nodos
