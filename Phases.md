Sí. Te lo doy como artefacto operativo, no como teoría. Esto está diseñado para que cada fase tenga: **prompt**, **matriz de verificación**, **archivos probables a modificar** y **límites operativos**.

No lo conviertas todavía en “haz todo de golpe”. Esto debe ejecutarse fase por fase. La primera ejecución real debería ser Fase 0–2 únicamente.

# MATRIZ EJECUTABLE DE ROOT

## Fase 0 → Fase 13

### Aptymok / System Friction Institute

---

# FASE 0 — Congelamiento de criterio

## PROMPT

```txt
Actúa sobre el repositorio Aptymok/system-friction únicamente para diagnosticar y alinear ROOT con la Constitución Operativa de ROOT y sus Anexos I–XXIX.

No implementes nuevas funciones visuales.
No rediseñes ROOT.
No agregues tarjetas, dashboards, componentes nuevos ni rutas nuevas.
No modifiques lógica de negocio.

Objetivo de esta fase:
congelar criterio y generar un reporte de alineación.

Debes revisar los componentes ROOT existentes y producir un archivo de diagnóstico que indique:
1. Qué componentes existen.
2. Qué sección de ROOT alimenta cada uno.
3. Qué capa toca: Archivo SFI, Observatorio Vivo, Atractor, Sandbox, Auditoría Técnica.
4. Qué fase futura debe modificarlos.
5. Qué lenguaje técnico aparece hoy en UI principal.
6. Qué elementos no pueden traducirse todavía.

Usa la Constitución Operativa como ley rectora:
ROOT traduce antes de mostrar.
ROOT es sólo para Aptymok.
ROOT no mezcla Archivo, Vivo, Atractor, Sandbox ni Auditoría.
ROOT no muestra lenguaje técnico en la vista principal.

Entrega:
- Un reporte markdown en docs/root/ROOT_PHASE_0_ALIGNMENT.md
- No hagas cambios visuales.
- No cambies datos.
- No cambies schema.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                                            |
| ------------------- | --------------------------------------------------------------------------------------- |
| Objetivo            | Congelar criterio. ROOT queda gobernado por Constitución + Anexos I–XXIX.               |
| Qué debe pasar      | Se genera un reporte de alineación.                                                     |
| Qué no debe pasar   | No se rediseña, no se agregan componentes, no se cambia UI.                             |
| Verificación humana | Aptymok puede leer el reporte y entender qué existe, qué fase lo toca y qué capa ocupa. |
| Cierre              | Existe `docs/root/ROOT_PHASE_0_ALIGNMENT.md`.                                           |
| Falla si            | Codex cambia componentes visuales, crea pantallas, edita UI o implementa fases futuras. |

## ARCHIVOS QUE DEBEN MODIFICARSE

```txt
docs/root/ROOT_PHASE_0_ALIGNMENT.md
```

Si no existe la carpeta:

```txt
docs/root/
```

## ARCHIVOS QUE PUEDEN LEERSE, NO MODIFICARSE

```txt
src/observatory/components/root/RootDashboardClient.tsx
src/observatory/components/root/RootOperationsConsole.tsx
src/observatory/components/root/AcpProposalConsole.tsx
src/observatory/components/root/AcpFieldRegimeView.tsx
src/observatory/components/root/AcpAttractorFieldView.tsx
src/observatory/components/root/GlobalMetricsView.tsx
src/observatory/components/root/NodeClusterSurface.tsx
src/observatory/components/root/SystemOverridePanel.tsx
src/observatory/components/root/LiturgiaDiagnosticPanel.tsx

src/observatory/components/visor/VisorMode.tsx
src/observatory/components/visor/VisorChat.tsx
src/observatory/components/visor/VisorSidebar.tsx
src/observatory/components/visor/VisorGoldenNode.tsx
src/observatory/components/visor/visorHooks.ts
src/observatory/components/visor/visorTypes.ts

src/lib/root/governanceRuntime.ts
src/lib/root/twinState.ts
src/lib/root/aiProviderRouter.ts
src/lib/root/fieldMatrixBuilder.ts

src/app/root/page.tsx
src/app/root/layout.tsx

src/app/api/root/me/route.ts
src/app/api/root/state/route.ts
src/app/api/root/evidence/route.ts

data/sfi/sf_static_dataset.compact.json
data/sfi/sf_docs_frontmatter.json
src/observatory/field/catalog/sfStaticDataset.ts
src/observatory/field/catalog/sfDocumentCatalog.ts
```

## LÍMITES OPERATIVOS

```txt
No implementar.
No corregir UI.
No tocar Supabase.
No tocar migraciones.
No crear endpoints.
No cambiar prompts del Visor.
No modificar lógica del Twin.
Sólo diagnosticar y mapear.
```

---

# FASE 1 — Inventario traducido

## PROMPT

```txt
Implementa Fase 1 de ROOT: Inventario traducido.

Objetivo:
crear una capa documental y opcionalmente una constante interna que traduzca cada componente existente de ROOT a lenguaje operativo.

No cambies todavía la UI principal.
No rediseñes.
No crees nuevas pantallas.
No cambies lógica de datos.

Debes producir un inventario traducido con este formato por elemento:

Elemento existente:
Nombre operativo:
Para qué sirve:
Dónde debe verse:
Sección ROOT:
Capa:
Estado actual:
Problema:
Decisión: permanecer / editar / ocultar / aislar / archivar
Fase que lo modifica:

Incluye como mínimo:
RootDashboardClient
VisorMode
VisorChat
VisorSidebar
VisorGoldenNode
RootOperationsConsole
AcpProposalConsole
AcpFieldRegimeView
AcpAttractorFieldView
GlobalMetricsView
NodeClusterSurface
SystemOverridePanel
LiturgiaDiagnosticPanel
ThresholdAccess
RoleGate
governanceRuntime
aiProviderRouter
twinState
fieldMatrixBuilder
ontology / Atlas
WorldSpect
MIHM
Archivo SFI
Bitácora
Atlas
Sandbox
Auditoría Técnica
Carpeta Negra
Calendario
Acciones de Realidad
Conversión de Realidad
Agentes

Entrega:
- docs/root/ROOT_PHASE_1_TRANSLATED_INVENTORY.md
- Opcional: src/lib/root/rootOperationalInventory.ts si ya existe patrón similar.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                                           |
| ------------------- | -------------------------------------------------------------------------------------- |
| Objetivo            | Traducir todo lo existente a función humana.                                           |
| Qué debe pasar      | Cada pieza tiene nombre operativo, función, sección, capa y decisión.                  |
| Qué no debe pasar   | No se implementan cambios visuales todavía.                                            |
| Verificación humana | Aptymok entiende para qué sirve cada cosa sin saber programación.                      |
| Cierre              | Inventario completo en markdown.                                                       |
| Falla si            | Quedan componentes sin traducir o se usan nombres técnicos como explicación principal. |

## ARCHIVOS QUE DEBEN MODIFICARSE

```txt
docs/root/ROOT_PHASE_1_TRANSLATED_INVENTORY.md
```

Opcional sólo si ayuda a fases posteriores:

```txt
src/lib/root/rootOperationalInventory.ts
```

## ARCHIVOS QUE PUEDEN LEERSE

Los mismos de Fase 0, más:

```txt
docs/ROOT-OPS-001.md
docs/FIELD_PERSIST_DECOMPOSITION.md
docs/THREAT_MODEL.md
docs/RISK_REGISTER.md
docs/PROCESS_MAP.md
docs/API_ROUTE_INVENTORY.md
docs/REPO_FORENSIC_AUDIT.md
```

## LÍMITES OPERATIVOS

```txt
No tocar UI.
No tocar base de datos.
No crear nuevas rutas.
No hardcodear métricas.
No borrar pruebas.
No mover datos todavía.
Sólo inventariar y traducir.
```

---

# FASE 2 — Separación de capas

## PROMPT

```txt
Implementa Fase 2 de ROOT: Separación de capas.

Objetivo:
crear una capa de clasificación operativa que separe Archivo SFI, Observatorio Vivo, Atractor, Sandbox y Auditoría Técnica.

No rediseñes ROOT completo.
No agregues dashboards nuevos.
No borres datos.
No modifiques Supabase todavía.

Debes crear funciones puras de clasificación para que cualquier elemento visible pueda responder:
- Esto es Archivo.
- Esto está Vivo.
- Esto afecta Atractor.
- Esto es Sandbox.
- Esto es Auditoría.

La clasificación debe aplicar a:
nodos, evidencias, propuestas, mutaciones, patrones, documentos, eventos, métricas, WSV, MIHM, auditoría y pruebas.

Reglas:
- Archivo SFI: catálogo, documentos fundacionales, patrones históricos, datasets estáticos.
- Observatorio Vivo: evidencias activas, señales recientes, mutaciones abiertas, WSV reciente, MIHM reciente.
- Atractor: sólo elementos con peso direccional.
- Sandbox: pruebas, simulaciones, test, elementos sin origen verificable.
- Auditoría: logs técnicos, eventos de lectura, trazabilidad.

Entrega:
- src/lib/root/rootLayers.ts
- src/lib/root/rootLayerLabels.ts
- tests o archivo de ejemplos si el repo usa tests
- docs/root/ROOT_PHASE_2_LAYER_SEPARATION.md

No modifiques visualmente componentes salvo para preparar imports o comentarios si es necesario.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                             |
| ------------------- | -------------------------------------------------------- |
| Objetivo            | Separar Archivo / Vivo / Atractor / Sandbox / Auditoría. |
| Qué debe pasar      | Existe una función central de clasificación.             |
| Qué no debe pasar   | No se borra nada. No se mueve data real todavía.         |
| Verificación humana | Se puede explicar por qué cada elemento cae en una capa. |
| Cierre              | Los clasificadores existen y están documentados.         |
| Falla si            | Archivo se confunde con Vivo o pruebas afectan Atractor. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/lib/root/rootLayers.ts
src/lib/root/rootLayerLabels.ts
docs/root/ROOT_PHASE_2_LAYER_SEPARATION.md
```

Si existe carpeta de tests:

```txt
src/lib/root/rootLayers.test.ts
```

## ARCHIVOS QUE PUEDEN SER TOCADOS SÓLO PARA IMPORT PREPARATORIO

```txt
src/observatory/components/root/GlobalMetricsView.tsx
src/observatory/components/root/RootDashboardClient.tsx
src/observatory/components/visor/VisorChat.tsx
```

## LÍMITES OPERATIVOS

```txt
No modificar diseño global.
No cambiar base de datos.
No ejecutar limpieza.
No cambiar números.
No hardcodear “156/120/127” como vivo.
No crear capa visual nueva si aún no es necesaria.
```

---

# FASE 3 — Traducción de estados

## PROMPT

```txt
Implementa Fase 3 de ROOT: Traducción de estados.

Objetivo:
crear una capa única que traduzca estados internos a lenguaje operativo de usuario.

Estados a traducir:
observed, partial, simulated, queued, degraded, active, stable, critical, vigente, caducado, sandbox, blocked, accepted, proposed, rejected, failed, verified, pending.

Cada traducción debe devolver:
- label operativo
- explicación humana
- implicación
- acción recomendada
- gravedad opcional

Ejemplos:
queued → Pendiente sin cierre. Empieza a perder fuerza si permanece abierto. Acción: cerrar, ejecutar o archivar.
simulated → Simulación. No usar como evidencia real. Acción: mover a Sandbox o reobservar.
blocked → Bloqueado por regla visible. Acción: revisar evidencia, fase o aprobación raíz.

Aplica esta traducción donde hoy se muestren estados crudos en ROOT, especialmente:
propuestas, mutaciones, WSV, evidencias, nodos, gobernanza y auditoría visible.

Entrega:
- src/lib/root/rootStateTranslator.ts
- src/lib/root/rootStateTranslator.test.ts si aplica
- docs/root/ROOT_PHASE_3_STATE_TRANSLATION.md
- Cambios mínimos en componentes para usar traducción.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| Objetivo            | Ningún estado técnico aparece sin traducción.                          |
| Qué debe pasar      | Estados internos tienen lectura humana.                                |
| Qué no debe pasar   | No cambiar valores reales ni ocultar linaje.                           |
| Verificación humana | Aptymok entiende estado, implicación y acción.                         |
| Cierre              | Componentes ROOT principales usan traductor de estados.                |
| Falla si            | Aparece `queued`, `simulated`, `blocked_by_governance` sin traducción. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/lib/root/rootStateTranslator.ts
docs/root/ROOT_PHASE_3_STATE_TRANSLATION.md
```

Posibles componentes:

```txt
src/observatory/components/root/AcpProposalConsole.tsx
src/observatory/components/root/RootOperationsConsole.tsx
src/observatory/components/root/GlobalMetricsView.tsx
src/observatory/components/root/AcpFieldRegimeView.tsx
src/observatory/components/root/NodeClusterSurface.tsx
src/observatory/components/visor/VisorChat.tsx
```

## LÍMITES OPERATIVOS

```txt
No inventar estados.
No ocultar estados técnicos de auditoría secundaria.
No convertir simulación en evidencia.
No modificar reglas de negocio.
Sólo traducir y mostrar implicación.
```

---

# FASE 4 — Estado del Campo

## PROMPT

```txt
Implementa Fase 4 de ROOT: Estado del Campo.

Objetivo:
reconstruir la pantalla inicial de ROOT para responder ocho preguntas:

1. ¿Cómo está mi sistema hoy?
2. ¿Qué está vivo?
3. ¿Qué está degradado?
4. ¿Qué está contaminando?
5. ¿Qué debo observar?
6. ¿Qué debo cerrar?
7. ¿Qué propone el Twin / AMV?
8. ¿Qué cambió desde la última vez?

Debe incluir:
- Régimen actual traducido.
- WSV traducido con timestamp real.
- MIHM traducido sólo si declara objeto observado.
- Alertas priorizadas.
- Mutaciones abiertas.
- Eyectores activos.
- Delta de sesión.
- Propuesta principal del Twin.
- Conversión de Realidad / RCE si ya hay datos suficientes; si no, mostrar “sin lectura suficiente”.
- Deuda de Realidad si existe; si no, mostrar “sin deuda registrada”.
- Riesgo de circuito cerrado si aplica.

No hardcodear valores.
No mostrar datos simulados como reales.
No mezclar Archivo con Observatorio Vivo.

Entrega:
- Adaptar RootDashboardClient o GlobalMetricsView.
- Crear helpers si hace falta: rootFieldState.ts
- docs/root/ROOT_PHASE_4_FIELD_STATE.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                              |
| ------------------- | --------------------------------------------------------- |
| Objetivo            | La entrada de ROOT responde qué pasa hoy.                 |
| Qué debe pasar      | Pantalla inicial contesta ocho preguntas.                 |
| Qué no debe pasar   | No mostrar conteos sin interpretación.                    |
| Verificación humana | En menos de un minuto se entiende qué mirar/cerrar.       |
| Cierre              | Estado del Campo usable sin Supabase/GitHub.              |
| Falla si            | La pantalla obliga a interpretar tablas o conteos crudos. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/root/RootDashboardClient.tsx
src/observatory/components/root/GlobalMetricsView.tsx
src/lib/root/rootFieldState.ts
docs/root/ROOT_PHASE_4_FIELD_STATE.md
```

Posibles lecturas:

```txt
src/lib/root/rootLayers.ts
src/lib/root/rootStateTranslator.ts
src/lib/root/twinState.ts
src/lib/root/governanceRuntime.ts
```

## LÍMITES OPERATIVOS

```txt
No rediseñar toda la UI.
No agregar otra página.
No hardcodear WSV/MIHM.
No mostrar MIHM sin objeto observado.
No mostrar WSV como OK.
No saturar pantalla con más de 1 crítica, 2 altas, 3 medias.
```

---

# FASE 5 — Campo de Nodos vivo

## PROMPT

```txt
Implementa Fase 5 de ROOT: Campo de Nodos vivo.

Objetivo:
convertir el campo visual de nodos en instrumento de observación.

Cada nodo visible debe poder mostrar:
- Nombre operativo.
- Función.
- Cluster.
- Estado traducido.
- Peso general.
- Peso direccional si aplica.
- Dependencias.
- Consecuencia si se degrada.
- Acción recomendada.
- Capa: Archivo / Vivo / Atractor / Sandbox / Auditoría.

El campo debe distinguir:
- Nodo base.
- Nodo evidencia.
- Nodo prueba.
- Nodo de catálogo.
- Nodo activo.
- Nodo con validación externa requerida.
- Nodo que afecta atractor.

El nodo dorado no pertenece al campo.
Debe moverse o tratarse como puerta fija del Visor, no como nodo observable.

No rediseñar el universo visual.
Aumentar resolución operativa, no estética.

Entrega:
- Ajustar NodeClusterSurface.
- Ajustar o crear rootNodeTranslator.ts.
- Ajustar VisorGoldenNode sólo para que no compita semánticamente con el campo.
- docs/root/ROOT_PHASE_5_LIVE_NODE_FIELD.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                        |
| ------------------- | ------------------------------------------------------------------- |
| Objetivo            | Los nodos explican función, peso, consecuencia y acción.            |
| Qué debe pasar      | Cada nodo visible tiene lectura operativa.                          |
| Qué no debe pasar   | No rediseñar todo el campo ni crear universo nuevo.                 |
| Verificación humana | Al abrir un nodo, Aptymok entiende para qué sirve.                  |
| Cierre              | Campo deja de ser decoración.                                       |
| Falla si            | Los nodos siguen siendo puntos conectados sin función comprensible. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/root/NodeClusterSurface.tsx
src/observatory/components/visor/VisorGoldenNode.tsx
src/lib/root/rootNodeTranslator.ts
docs/root/ROOT_PHASE_5_LIVE_NODE_FIELD.md
```

Posibles:

```txt
src/lib/root/fieldMatrixBuilder.ts
src/lib/root/rootLayers.ts
src/lib/root/rootStateTranslator.ts
```

## LÍMITES OPERATIVOS

```txt
No crear otro grafo paralelo.
No mezclar nodo dorado con nodos observables.
No usar pruebas como nodos vivos.
No inventar pesos si no hay datos; marcar “sin asignar”.
No hacer rediseño estético mayor.
```

---

# FASE 6 — Bitácora / Índice / Visor como un solo componente

## PROMPT

```txt
Implementa Fase 6 de ROOT: Bitácora, Índice y Visor como un solo componente navegable.

Objetivo:
unificar Bitácora e Índice en un panel acordeón que el Visor pueda referenciar.

Cada entrada debe mostrar:
Fecha
Origen
Por qué importa
Capa
Nodo afectado
Patrón que alimenta
Objetivo que toca
Evidencia adjunta
Peso general
Peso direccional si aplica
Qué falta
Acción abierta

Eliminar dependencia del botón “preguntar por esto”.
El usuario puede preguntar libremente.
Pero cada entrada debe poder abrirse y referenciarse desde el chat:
Abrir entrada relacionada
Ver evidencia
Ir al nodo afectado
Ver en Atlas

No limitar el chat por la sección seleccionada.
El índice orienta; no restringe.

Entrega:
- Ajustar VisorSidebar / VisorMode.
- Crear componente RootLogbookAccordion si no existe equivalente.
- Adaptar VisorChat para referencias navegables si existe estructura.
- docs/root/ROOT_PHASE_6_LOGBOOK_VISOR_INDEX.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                    |
| ------------------- | --------------------------------------------------------------- |
| Objetivo            | Bitácora, Índice y Visor funcionan como una experiencia.        |
| Qué debe pasar      | Bitácora es acordeón con entradas útiles.                       |
| Qué no debe pasar   | No obligar a usar botón “preguntar por esto”.                   |
| Verificación humana | Una entrada se entiende sin pedir explicación.                  |
| Cierre              | Panel único navegable operativo.                                |
| Falla si            | Bitácora sigue mostrando “runtime / sólo lectura” sin utilidad. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/visor/VisorSidebar.tsx
src/observatory/components/visor/VisorMode.tsx
src/observatory/components/visor/VisorChat.tsx
src/observatory/components/visor/RootLogbookAccordion.tsx
docs/root/ROOT_PHASE_6_LOGBOOK_VISOR_INDEX.md
```

Posibles:

```txt
src/observatory/components/visor/visorTypes.ts
src/observatory/components/visor/visorHooks.ts
src/lib/root/rootStateTranslator.ts
src/lib/root/rootLayers.ts
```

## LÍMITES OPERATIVOS

```txt
No crear dos bitácoras.
No limitar chat por índice.
No borrar entradas.
No transformar auditoría técnica en bitácora sustantiva sin filtro.
No mostrar datos crudos como entrada principal.
```

---

# FASE 7 — Chat libre del Visor

## PROMPT

```txt
Implementa Fase 7 de ROOT: Chat libre del Visor.

Objetivo:
el Visor debe responder libremente desde la memoria visible de ROOT, separando:
- registrado
- no registrado
- conocimiento general
- inferencia
- señal nueva
- evidencia posible
- patrón candidato
- señal corporal/personal

Reglas:
No inventar evidencia.
No repetir en cada respuesta que no ejecuta.
No depender del índice seleccionado.
No tratar conocimiento general como bitácora.
No tratar señal nueva como patrón.
No tratar intención como evidencia externa.

Cuando algo está registrado:
responder con fecha, origen, capa, estado, qué sostiene y qué falta.

Cuando no está registrado:
decir que no hay registro y preguntar si se explora o se deja fuera.

Cuando es conocimiento general:
responder como conocimiento general y aclarar que no entra al sistema salvo decisión raíz.

Cuando parece registrable:
ofrecer registrarlo como señal nueva, no como evidencia real.

Entrega:
- Ajustar prompt/conducta de VisorChat.
- Ajustar aiProviderRouter si ahí se define contexto.
- Añadir reglas en visorTypes si aplica.
- docs/root/ROOT_PHASE_7_FREE_VISOR_CHAT.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| Objetivo            | Visor responde libremente y separa registro/conocimiento/inferencia.        |
| Qué debe pasar      | Preguntas fuera de índice reciben respuesta útil.                           |
| Qué no debe pasar   | No inventa evidencia ni repite modo.                                        |
| Verificación humana | Pregunta “dolor de muela” responde como señal nueva + conocimiento general. |
| Cierre              | Visor opera como interlocutor, no buscador limitado.                        |
| Falla si            | Responde siempre lo mismo o sólo sobre la sección activa.                   |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/visor/VisorChat.tsx
src/lib/root/aiProviderRouter.ts
src/observatory/components/visor/visorTypes.ts
docs/root/ROOT_PHASE_7_FREE_VISOR_CHAT.md
```

Posibles:

```txt
src/observatory/components/visor/visorHooks.ts
src/lib/root/rootVisorPrompt.ts
src/lib/root/rootConversationClassifier.ts
```

## LÍMITES OPERATIVOS

```txt
No permitir que Visor ejecute acciones si está en modo sólo lectura.
No inventar memoria.
No registrar automáticamente sin confirmación.
No diagnosticar médicamente.
No convertir señales corporales en atractor.
```

---

# FASE 8 — Twin / AMV como agente activo

## PROMPT

```txt
Implementa Fase 8 de ROOT: Twin / AMV como agente activo.

Objetivo:
hacer que el Twin deje de mostrar propuestas sueltas y pase a mostrar propuestas con razón, evidencia, consecuencia, aprendizaje y estado ejecutable.

Cada propuesta debe mostrar:
Título operativo
Motivo
Evidencia que la sostiene
Nodo afectado
Atractor afectado
Acción de Realidad asociada si aplica
Consecuencia si se acepta
Consecuencia si se rechaza
Estado traducido
Fecha
Caducidad
Resultado
Aprendizaje derivado
Deuda de realidad si no se ejecuta

El Twin debe distinguir:
propuesta aceptada ≠ acción ejecutada
acción ejecutada ≠ evidencia externa
intención ≠ decisión
decisión ≠ realidad modificada

Debe detectar contradicciones internas del operador raíz según Anexo XVI.
Debe manejar señales personales según Anexo XXI.
Debe proponer acciones verificables según Anexo XIX.
Debe conocer roles de agentes según Anexo XX.

Entrega:
- Ajustar AcpProposalConsole.
- Ajustar twinState.
- Crear rootTwinProposalTranslator.ts.
- docs/root/ROOT_PHASE_8_TWIN_AGENT.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                             |
| ------------------- | ------------------------------------------------------------------------ |
| Objetivo            | Twin propone, cuestiona y aprende operativamente.                        |
| Qué debe pasar      | Cada propuesta tiene consecuencia, evidencia, acción y caducidad.        |
| Qué no debe pasar   | No bloquear decisión raíz. No proponer sobre vacío.                      |
| Verificación humana | Aptymok entiende qué cambia si acepta o rechaza.                         |
| Cierre              | Ninguna propuesta queda en cola sin explicación.                         |
| Falla si            | Propuestas siguen como `accepted/proposed/low` sin traducción ni efecto. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/root/AcpProposalConsole.tsx
src/lib/root/twinState.ts
src/lib/root/rootTwinProposalTranslator.ts
docs/root/ROOT_PHASE_8_TWIN_AGENT.md
```

Posibles:

```txt
src/observatory/components/root/AcpFieldRegimeView.tsx
src/observatory/components/root/AcpAttractorFieldView.tsx
src/lib/root/rootStateTranslator.ts
src/lib/root/rootLayers.ts
```

## LÍMITES OPERATIVOS

```txt
Twin no ejecuta.
Twin no bloquea decisión raíz.
Twin no repite propuesta rechazada sin nueva evidencia.
Twin no trata aceptado como ejecutado.
Twin no usa intención como evidencia externa.
```

---

# FASE 9 — WSV y MIHM como lecturas interpretables

## PROMPT

```txt
Implementa Fase 9 de ROOT: WSV y MIHM como lecturas interpretables.

Objetivo:
mostrar WSV y MIHM como lecturas operativas, no como números ni estados crudos.

WSV debe mostrar:
Estado general
Fuentes activas
Fuente degradada
Campo dominante
Última lectura real
Integridad
Implicación operativa para Aptymok

MIHM debe mostrar:
Objeto observado
IHG con lectura
NTI con lectura
LDI con lectura
PHI con lectura
Régimen resultante
Dirección
Nivel de confianza
Qué falta

Reglas:
WSV nunca dice sólo OK.
MIHM nunca muestra indicadores sin objeto observado.
No hardcodear valores.
No usar simulación como evidencia real.
Si WSV no tiene lectura del día, decir “lectura pendiente” o “última lectura disponible”.
Si MIHM no declara objeto, decir “no puede interpretarse”.

Entrega:
- Ajustar componentes WSV/MIHM en RootDashboardClient o GlobalMetricsView.
- Crear rootWsvTranslator.ts y rootMihmTranslator.ts.
- docs/root/ROOT_PHASE_9_WSV_MIHM.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                            |
| ------------------- | ------------------------------------------------------- |
| Objetivo            | WSV y MIHM sirven para decidir.                         |
| Qué debe pasar      | Toda lectura tiene objeto/timestamp/estado/implicación. |
| Qué no debe pasar   | No números sueltos, no OK, no hardcode.                 |
| Verificación humana | Aptymok entiende cómo está el mundo y qué mide MIHM.    |
| Cierre              | WSV/MIHM traducidos.                                    |
| Falla si            | MIHM aparece sin objeto o WSV aparece como OK.          |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/lib/root/rootWsvTranslator.ts
src/lib/root/rootMihmTranslator.ts
src/observatory/components/root/GlobalMetricsView.tsx
src/observatory/components/root/RootDashboardClient.tsx
docs/root/ROOT_PHASE_9_WSV_MIHM.md
```

Posibles:

```txt
src/lib/worldspect/*
src/app/api/worldspect/*
src/app/api/mihm/*
```

Sólo leer o adaptar consumo si ya existe.

## LÍMITES OPERATIVOS

```txt
No crear datos falsos.
No simular lectura diaria.
No hardcodear timestamp.
No tratar fuente degradada como limpia.
No mostrar MIHM si no hay objeto observado.
```

---

# FASE 10 — Atractor, eyectores y degradación

## PROMPT

```txt
Implementa Fase 10 de ROOT: Atractor, eyectores y degradación.

Objetivo:
hacer visible la dirección real del sistema y lo que la desvía.

Atractor debe mostrar:
Atractor activo
Dirección actual
Fuerza de estabilización
Peso direccional de evidencias
Evidencias que lo sostienen
Patrones que lo refuerzan
Eyectores que lo desvían
RCE si aplica
Validación externa
Riesgo de circuito cerrado
Acción verificable recomendada

Eyectores deben mostrar:
Nombre
Qué hacen
Origen
Gravedad
Capa afectada
Acción recomendada

Debe aplicar:
Anexo II peso direccional
Anexo XIV negación sostenida
Anexo XV densidad de observación
Anexo XVII fuerza del atractor
Anexo XIX conversión de realidad
Anexo XXII verificación externa
Anexo XXV circuito cerrado

Entrega:
- Ajustar AcpAttractorFieldView.
- Crear rootAttractorState.ts.
- Crear rootEjectorDetector.ts.
- docs/root/ROOT_PHASE_10_ATTRACTOR_EJECTORS.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                       |
| ------------------- | ------------------------------------------------------------------ |
| Objetivo            | Dirección, fuerza y desviaciones visibles.                         |
| Qué debe pasar      | Atractor distingue provisional/activo/latente/circuito cerrado.    |
| Qué no debe pasar   | No meter pruebas ni evidencia administrativa sin peso direccional. |
| Verificación humana | Aptymok entiende hacia dónde va y qué lo desvía.                   |
| Cierre              | Todo elemento del atractor tiene peso direccional y validación.    |
| Falla si            | Atractor sigue como etiqueta o campo visual sin consecuencia.      |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/root/AcpAttractorFieldView.tsx
src/lib/root/rootAttractorState.ts
src/lib/root/rootEjectorDetector.ts
docs/root/ROOT_PHASE_10_ATTRACTOR_EJECTORS.md
```

Posibles:

```txt
src/lib/root/twinState.ts
src/lib/root/rootLayers.ts
src/lib/root/rootStateTranslator.ts
src/observatory/components/root/GlobalMetricsView.tsx
```

## LÍMITES OPERATIVOS

```txt
No fortalecer atractor sin Acción de Realidad verificada.
No usar prueba como evidencia direccional.
No ocultar circuito cerrado.
No permitir que aceptado cuente como ejecutado.
No eliminar evidencias negadas; mover a Archivo Cuestionado.
```

---

# FASE 11 — Gobernanza, acceso y operaciones

## PROMPT PARA CODEX

Lee primero, en este orden:

1. docs/root/CODEX_START.md
2. docs/root/AGENT_RULES.md
3. Phases.md
4. Constitution.md
5. docs/root/ROOT_PHASE_0_ALIGNMENT.md
6. docs/root/ROOT_PHASE_1_TRANSLATED_INVENTORY.md
7. docs/root/ROOT_PHASE_2_LAYER_SEPARATION.md
8. docs/root/ROOT_PHASE_3_STATE_TRANSLATION.md
9. docs/root/ROOT_PHASE_4_FIELD_STATE.md
10. docs/root/ROOT_PHASE_5_LIVE_NODE_FIELD.md
11. docs/root/ROOT_PHASE_6_LOGBOOK_VISOR_INDEX.md
12. docs/root/ROOT_PHASE_7_FREE_VISOR_CHAT.md
13. docs/root/ROOT_PHASE_8_TWIN_AGENT.md
14. docs/root/ROOT_PHASE_9_WSV_MIHM.md
15. docs/root/ROOT_PHASE_10_ATTRACTOR_EJECTORS.md, si ya existe.

Implementa únicamente Fase 11 de ROOT:

Gobernanza, acceso y operaciones.

No ejecutes Fase 12 ni Fase 13.

Objetivo:
cerrar la capa de control operativo de ROOT sin volverla críptica.

ROOT debe traducir:

- acceso
- bloqueos
- operaciones abiertas
- reconciliación
- override manual
- auditoría técnica
- agentes internos
- continuidad de sesión

a lenguaje operativo para Aptymok.

ROOT no debe mostrar primero lenguaje técnico como:

- blocked_by_governance
- root_required
- Unauthorized
- payload
- runtime
- table health
- endpoint
- audit event

Si aparece, debe estar en auditoría secundaria, no en la experiencia principal.

---

## 1. ACCESO ROOT / UMBRAL

ROOT es sólo para Aptymok.

Traducir ThresholdAccess / RoleGate como:

“Umbral ROOT”

Debe mostrar:

- acceso permitido
- acceso bloqueado
- razón del bloqueo
- acción siguiente
- si falta sesión
- si falta rol raíz
- si la sesión expiró
- si hubo recarga por seguridad

Forma correcta:

“Acceso bloqueado porque esta sesión no tiene permiso raíz.”

Forma incorrecta:

“Unauthorized”
“root_required”
“RoleGate failed”

No convertir ROOT en multiusuario.

No modificar permisos productivos salvo traducción visual o helper interpretativo.

---

## 2. BLOQUEOS DE GOBERNANZA

Crear o ajustar un traductor operativo de gobernanza:

src/lib/root/rootGovernanceTranslator.ts

Debe traducir bloqueos internos a frases humanas.

Ejemplos:

blocked_by_governance →
“Bloqueado por regla de gobernanza.”

missing_evidence →
“Bloqueado porque falta evidencia.”

simulation_detected →
“Bloqueado porque es simulación.”

attractor_risk →
“Bloqueado porque puede afectar el atractor.”

root_approval_required →
“Bloqueado porque requiere aprobación raíz.”

phase_not_authorized →
“Bloqueado porque esta fase no autoriza esta operación.”

unknown_block →
“Bloqueado, pero falta razón visible. Revisar auditoría.”

Cada bloqueo debe mostrar:

- estado
- razón
- consecuencia
- acción siguiente
- capa afectada
- fase relacionada si existe

No debe aparecer blocked_by_governance sin traducción.

---

## 3. CENTRO DE OPERACIONES

Ajustar RootOperationsConsole para que las operaciones abiertas se lean como operaciones, no como tablas.

Cada operación abierta debe mostrar:

- nombre operativo
- estado traducido
- razón
- consecuencia
- acción siguiente
- fecha
- fase relacionada
- capa afectada
- si requiere cierre
- si requiere evidencia
- si requiere aprobación raíz
- si debe ir a Sandbox

No mostrar como lectura principal:

- nombres de tabla
- hashes
- payloads
- endpoints
- columnas internas

Eso puede quedar en auditoría o linaje secundario.

La lectura humana debe responder:

“¿Qué está abierto?”
“¿Por qué sigue abierto?”
“¿Qué pasa si no lo cierro?”
“¿Qué debo hacer?”

---

## 4. RECONCILIACIÓN

Preparar lectura de reconciliación:

propuesta → ejecución → evidencia → cierre

No crear Acciones de Realidad todavía.

Sólo traducir si una operación está en alguno de estos estados:

- propuesta sin ejecución
- propuesta aceptada
- ejecución preparada
- evidencia registrada
- cierre pendiente
- cierre completado
- cierre bloqueado

Reglas:

- propuesta aceptada no es acción ejecutada
- acción preparada no es evidencia externa
- evidencia registrada no siempre modifica realidad
- cierre administrativo no equivale a validación externa

Mostrar:

“Esta propuesta fue aceptada, pero no hay ejecución verificable.”
“Esta operación tiene evidencia registrada, pero falta cierre.”
“Esta acción está preparada, pero no ejecutada.”

---

## 5. OVERRIDE MANUAL

Ajustar SystemOverridePanel.

El override manual debe ser una excepción controlada, no botón mágico.

Debe requerir:

- tipo de override
- justificación
- elemento afectado
- riesgo estimado
- consecuencia
- duración si aplica
- confirmación raíz

Si no existe backend suficiente para ejecutar override real, NO inventarlo.
Sólo preparar la lectura visual / operativa.

Tipos posibles:

- sobre evidencia
- sobre bloqueo
- sobre atractor
- sobre régimen
- sobre deuda
- sobre override previo

Cada override debe mostrar advertencia:

“Esta anulación modifica una regla del sistema. Debe dejar justificación.”

No permitir override sin justificación visible.

No permitir que agentes hagan override.

Sólo Aptymok puede solicitar override.

---

## 6. RIESGO DEL TWIN ANTES DE OVERRIDE

Si existe Twin o lectura de propuesta disponible, mostrar riesgo antes del override:

- bajo
- medio
- alto
- sin lectura suficiente

Ejemplo:

“Riesgo medio: esta operación puede debilitar separación entre Observatorio Vivo y Atractor.”

Si no hay datos suficientes:

“No hay lectura suficiente para estimar riesgo. No se debe tratar como seguro.”

No inventar riesgo numérico.

---

## 7. REGISTRO DE AGENTES INTERNOS

Ajustar AcpAgentRegistryPanel.

Renombrar visualmente:

“ACP Agent Registry”

a:

“Agentes internos de ROOT”

o:

“Registro de roles internos”

La lectura debe dejar claro:

- ningún agente tiene autoridad externa
- ningún agente ejecuta fuera de ROOT sin decisión raíz
- ningún agente modifica Constitución
- ningún agente sustituye a Aptymok
- cada agente sólo observa, propone, traduce, verifica o prepara

Cada agente debe mostrar, si hay datos suficientes:

- nombre operativo
- función
- qué observa
- qué puede proponer
- qué no puede hacer
- qué evidencia genera
- qué capa toca
- estado traducido
- acción siguiente si existe

Ejemplos de nombres operativos:

Twin / AMV →
“Interlocutor operativo”

Visor →
“Intérprete de memoria visible”

WSV →
“Lectura del mundo observado”

MIHM →
“Lectura homeostática”

Codex →
“Agente técnico de implementación”

Calendario →
“Reloj operativo”

Governance →
“Regla de control”

No crear agentes nuevos salvo traducción de los que ya existan.

---

## 8. CONTINUIDAD DE SESIÓN / RECARGA CASTROSA

Agregar a Fase 11 una lectura operativa de continuidad de sesión.

Problema observado por Aptymok:
Cada vez que Aptymok cambia de pestaña, se va del navegador o vuelve a ROOT, la página recarga o pierde estado visible. Esto genera fricción operativa alta porque interrumpe la observación continua, rompe el flujo del Visor y obliga a reconstruir contexto.

Objetivo:
ROOT debe preservar continuidad visual y operativa cuando Aptymok cambia de pestaña o vuelve al navegador.

Requisitos:

- No recargar innecesariamente ROOT al cambiar de pestaña.
- Preservar modo activo: ROOT normal / Visor / Freeze / sección seleccionada.
- Preservar panel abierto.
- Preservar acordeón abierto.
- Preservar scroll cuando sea razonable.
- Preservar conversación visible del Visor cuando sea posible.
- No perder contexto local si Aptymok cambia temporalmente de pestaña.
- Si por seguridad o sesión expirada debe recargar, mostrar frase clara:
  “ROOT recargó porque la sesión cambió o expiró.”
- Si no hay razón real para recargar, evitarlo.
- No crear persistencia insegura.
- No guardar datos sensibles en localStorage.
- Usar sessionStorage o estado de URL sólo para estado visual no sensible, si aplica.
- No tocar autenticación productiva salvo lectura mínima.
- No cambiar permisos.
- No tocar Supabase.
- No tocar migraciones.

Lecturas operativas esperadas:

“Continuidad de observación: activa.”

“Continuidad de observación: interrumpida por recarga.”

“ROOT perdió estado visual al cambiar de pestaña. Esto debe corregirse porque afecta uso real.”

Si no puede corregirse completamente en esta fase, documentar:

- causa probable
- archivo responsable
- qué queda pendiente
- cómo reproducirlo
- qué NO se tocó por seguridad

Esto no es bug visual menor.
Es pérdida de continuidad observacional.

---

## 9. AUDITORÍA TÉCNICA

La auditoría técnica puede existir, pero no gobierna la vista principal.

Debe moverse visualmente a lectura secundaria cuando aparezca como:

- logs
- endpoints
- table health
- payload
- hashes
- raw events
- internal runtime
- Supabase status

La vista principal siempre debe decir primero:

“qué significa”
“qué afecta”
“qué hacer”

Sólo después puede mostrar linaje técnico.

---

## 10. ARCHIVOS QUE PUEDE MODIFICAR

Archivos probables:

src/lib/root/rootGovernanceTranslator.ts
src/lib/root/rootAgentRoleTranslator.ts
src/observatory/components/root/SystemOverridePanel.tsx
src/observatory/components/root/RootOperationsConsole.tsx
src/observatory/components/root/AcpAgentRegistryPanel.tsx
src/observatory/components/root/ThresholdAccess.tsx
src/observatory/components/root/RoleGate.tsx
src/observatory/components/root/RootDashboardClient.tsx
src/observatory/components/root/VisorMode.tsx
src/observatory/components/root/VisorChat.tsx
src/observatory/components/root/VisorSidebar.tsx
docs/root/ROOT_PHASE_11_GOVERNANCE_OPERATIONS.md

Sólo si existen y son responsables:

src/lib/root/governanceRuntime.ts
src/lib/root/server.ts
src/app/api/root/me/route.ts
src/app/api/root/state/route.ts

No tocar migraciones.
No tocar Supabase.
No tocar datos reales.

---

## 11. ENTREGABLE OBLIGATORIO

Crear o actualizar:

docs/root/ROOT_PHASE_11_GOVERNANCE_OPERATIONS.md

Debe incluir:

- archivos modificados
- qué cerró Fase 11
- cómo se tradujeron bloqueos
- cómo quedó el override
- cómo quedó el registro de agentes internos
- qué se hizo sobre continuidad de sesión
- qué NO se tocó por límite operativo
- riesgos detectados
- cómo verificar localmente

---

## 12. LÍMITES OPERATIVOS

No ejecutar Fase 12 ni Fase 13.
No limpiar datos.
No borrar memoria.
No mover pruebas a Sandbox todavía.
No tocar Supabase.
No tocar migraciones.
No cambiar permisos productivos.
No convertir ROOT en multiusuario.
No crear override sin justificación.
No crear ejecución autónoma de agentes.
No permitir autoridad externa a agentes.
No hardcodear métricas.
No crear cálculos falsos de RCE/deuda.
No crear Acciones de Realidad reales.
No cambiar Constitution.md ni Phases.md.
No rediseñar estética global.
No crear dashboards duplicados.

MATRIZ DE VERIFICACIÓN FASE 11
Objetivo:
ROOT traduce gobernanza, acceso, operaciones, override, agentes internos y continuidad de sesión.

Debe pasar:
- Todo bloqueo aparece con razón humana.
- Ninguna operación abierta aparece sólo como tabla o payload.
- Override exige justificación.
- Agentes internos no tienen autoridad externa.
- ROOT conserva mejor estado visual al cambiar de pestaña o documenta la causa si no puede corregirse.

No debe pasar:
- Mostrar blocked_by_governance como lectura principal.
- Convertir ROOT en multiusuario.
- Dar ejecución autónoma a agentes.
- Tocar Supabase.
- Tocar migraciones.
- Crear Acciones de Realidad.
- Hacer limpieza de datos.
- Calcular RCE/deuda sin modelo visible.

Verificación humana:
Aptymok puede entender:
- por qué algo está bloqueado
- qué operación sigue abierta
- qué agente hace qué
- qué significa override
- por qué ROOT recarga o cómo se preserva continuidad

Cierre:
Fase 11 cierra cuando operaciones, bloqueos, override, agentes y continuidad quedan en lenguaje operativo.

Falla si:
- aparece blocked_by_governance sin traducción
- aparece Unauthorized sin lectura humana
- ACP Agent Registry sigue como título principal sin traducción
- override parece botón libre
- la recarga al cambiar de pestaña queda ignorada sin documentación

Y para Codex, si ya está ejecutando 10–11, puedes pasarle sólo este suplemento:

SUPLEMENTO FASE 11:

Además de lo ya indicado para Fase 11, integra continuidad de sesión:

ROOT recarga o pierde estado visible cuando Aptymok cambia de pestaña o vuelve al navegador. Esto debe tratarse como fricción operativa de continuidad observacional.

Debe corregirse si es posible sin tocar autenticación productiva ni guardar datos sensibles. Si no se corrige totalmente, documentar causa probable y pendiente en ROOT_PHASE_11_GOVERNANCE_OPERATIONS.md.

Preservar cuando sea posible:
- modo activo
- Visor abierto/cerrado
- panel seleccionado
- acordeón abierto
- scroll
- conversación visible del Visor

No usar localStorage para datos sensibles.
No tocar Supabase.
No tocar migraciones.
No cambiar permisos.


---

# FASE 12 — Limpieza y estabilización

## PROMPT

```txt
Implementa Fase 12 de ROOT: Limpieza y estabilización.

Objetivo:
limpiar contaminación sin perder memoria.

No borrar información real.
No borrar evidencia sin respaldo.
No limpiar por estética.

Debe reclasificar:
Pruebas técnicas → Sandbox.
Evidencias de test → Sandbox.
Simulaciones → Sandbox.
Registros sin origen → Sandbox.
Nodos de prueba → Sandbox.
Propuestas experimentales → Sandbox.
Patrones no vivos → Archivo.
Evidencias cerradas → Archivo.
Documentos técnicos → Archivo / Auditoría.
Registros fundacionales → Archivo.
Evidencias negadas tres veces → Archivo Cuestionado.
Patrones sin densidad suficiente → Archivo.
Acciones fallidas/rechazos → Observatorio Vivo como señales, no como fracaso.

Debe permanecer en Observatorio Vivo:
señales activas
evidencias vigentes
mutaciones abiertas
WSV reciente
MIHM reciente con objeto
patrones candidatos actuales
acciones de realidad pendientes
deuda de realidad
alertas activas

Entrega:
- Crear rootCleanupPlan.ts o reporte si no se autoriza tocar datos.
- docs/root/ROOT_PHASE_12_CLEANUP_PLAN.md
- Si se autoriza, preparar migración o script idempotente; NO ejecutarlo automáticamente.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                 |
| ------------------- | ------------------------------------------------------------ |
| Objetivo            | Campo limpio sin perder trazabilidad.                        |
| Qué debe pasar      | Pruebas aisladas, archivo separado, vivo preservado.         |
| Qué no debe pasar   | No borrar memoria real ni evidencia sustantiva.              |
| Verificación humana | Se entiende qué fue aislado y por qué.                       |
| Cierre              | Campo activo ya no contiene basura técnica.                  |
| Falla si            | Pruebas siguen afectando atractor o se borra evidencia real. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
docs/root/ROOT_PHASE_12_CLEANUP_PLAN.md
src/lib/root/rootCleanupPlan.ts
```

Sólo si se autoriza:

```txt
supabase/migrations/[timestamp]_root_cleanup_layers.sql
scripts/root-cleanup-plan.ts
```

## LÍMITES OPERATIVOS

```txt
No ejecutar limpieza destructiva.
No borrar datos.
No mover datos en producción sin revisión.
No aislar evidencia cultural real como prueba.
No mezclar Archivo Cuestionado con Sandbox.
```

---

# FASE 13 — Verificación final

## PROMPT

```txt
Implementa Fase 13 de ROOT: Verificación final.

Objetivo:
crear un protocolo de prueba humana para confirmar que ROOT sirve para decidir sin saber programación.

No agregar funciones nuevas.
No rediseñar.
No abrir fases nuevas.

Debe crear un documento de verificación con preguntas humanas:

¿Qué está pasando hoy?
¿Qué está vivo?
¿Qué está degradado?
¿Qué contamina el sistema?
¿Qué debo cerrar?
¿Qué debo observar?
¿Qué propone el Twin?
¿Cómo está el mundo observado?
¿Qué lectura homeostática existe?
¿Hacia dónde va mi atractor?
¿Qué eyectores están activos?
¿Qué es prueba?
¿Qué es archivo?
¿Qué es evidencia real?
¿Qué acción verificable convierte dirección en realidad externa?
¿Qué RCE tengo?
¿Qué deuda de realidad existe?
¿Hay circuito cerrado?
¿Qué agente falló o está degradado?
¿Qué vence próximamente?
¿Qué no sabe el sistema?

También debe incluir pruebas de casos:
- Pregunta libre fuera de índice.
- Señal corporal aislada.
- Propuesta aceptada sin ejecución.
- WSV degradado.
- MIHM sin objeto.
- Evidencia de prueba en campo.
- Override manual.
- Atractor con baja validación externa.
- Acción de Realidad verificada.

Entrega:
- docs/root/ROOT_PHASE_13_HUMAN_VERIFICATION.md
- Checklist final.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                    |
| ------------------- | ----------------------------------------------- |
| Objetivo            | Confirmar que ROOT sirve para decidir.          |
| Qué debe pasar      | Se prueba con preguntas humanas.                |
| Qué no debe pasar   | No crear nuevas funciones durante verificación. |
| Verificación humana | Aptymok puede usar ROOT sin GitHub/Supabase.    |
| Cierre              | Checklist aprobado.                             |
| Falla si            | Necesita nombres técnicos para entender ROOT.   |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
docs/root/ROOT_PHASE_13_HUMAN_VERIFICATION.md
```

Opcional si hay sistema de tests/e2e:

```txt
tests/root/root-human-verification.spec.ts
```

## LÍMITES OPERATIVOS

```txt
No implementar nuevas funciones.
No rediseñar UI.
No corregir fases previas dentro de Fase 13 sin documentar regresión.
No declarar terminado si falla una pregunta humana central.
```

---

# ORDEN REAL DE EJECUCIÓN

No ejecutes 0–13 completo.

La primera instrucción real a Codex debe ser:

```txt
Ejecuta Fase 0, Fase 1 y Fase 2 únicamente.
```

Porque esas tres fases cierran la raíz:

```txt
criterio
inventario
separación de capas
```

Después se revisa.

Luego:

```txt
Fase 3–4
```

Después:

```txt
Fase 5–7
```

Después:

```txt
Fase 8–11
```

Después:

```txt
Fase 12–13
```

# LÍMITE GLOBAL PARA TODAS LAS FASES

```txt
ROOT es para Aptymok.
ROOT traduce antes de mostrar.
ROOT no habla como backend.
ROOT no muestra nombres técnicos en vista principal.
ROOT no mezcla Archivo, Vivo, Atractor, Sandbox ni Auditoría.
ROOT no trata intención como evidencia externa.
ROOT no trata propuesta aceptada como acción ejecutada.
ROOT no fortalece atractor sin Acción de Realidad verificable.
ROOT no usa pruebas para sostener régimen.
ROOT no hardcodea WSV, MIHM, RCE, deuda ni métricas.
ROOT no crea pantallas duplicadas si existe componente equivalente.
ROOT no avanza por parches.
ROOT no borra memoria real.
ROOT no toca Supabase productivo sin autorización explícita.
ROOT no permite que Codex modifique Constitución, Anexos o Fases sin permiso raíz.
```

# DICTAMEN

Esto ya es ejecutable.

No como “construye todo”.

Como control de implementación faseada.

La primera pieza que te recomiendo usar ahora es:

```txt
FASE 0–2
Congelamiento de criterio
Inventario traducido
Separación de capas
```

Eso prepara el sistema para todo lo demás sin romperlo.
