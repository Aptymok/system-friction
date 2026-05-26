# System Friction Institute · Documento Técnico
## SFI · CAMPO COGNITIVO D3.js
**Especificación Revisada + Plan de Fases de Ejecución**
aptymok/system-friction · branch: main
Versión 1.0-rev
Fecha 2026-05-19
Autor Juan Antonio Marín Liera (Aptymok)
Estado DOCUMENTO DE TRABAJO — EJECUCIÓN ACTIVA
⚠ Nota sobre acceso al repositorio
El repositorio aptymok/system-friction (branch: main) no es accesible vía crawl público ni API sin autenticación. Este documento fue construido sobre el estado documentado del sistema: EIDELON frontend (D3.js Campo Cognitivo), AMV v3.2 (R12-mod, R16, R17), ontology manager, Flask/Railway backend (ScoreFriction), CORS fix pendiente en Field Graph, y arquitectura general del monorepo SFI. Cualquier divergencia con el estado actual del repo debe resolverse con una auditoría directa del árbol de archivos antes de ejecutar la Fase 0.
## Parte I
REVISIÓN PUNTO A PUNTO — ADECUACIONES Y EXPANSIONES
## ## PUNTO0
Base Estructural y Conceptual
Adecuar
Expandir
Pre-requisito crítico
Confirma — sin cambios
121 nodos base, >300 aristas, renderizado contextual por cluster activo. Tipos de nodos: system, cognitive_twin, user, cluster, metric, pattern, intermediate, emergent. Bitácora inmutable con hash SHA-256 encadenado. Motor de expansión AMV con condiciones de consistencia y evidencia.
Adecuar — alineación con AMV v3.2
El "motor de expansión" nombrado en el Punto 0 corresponde exactamente al AMV v3.2 ya implementado (con R12-mod: Asiento Cognitivo Primario, R16: Clúster de Fidelidad, R17: Redistribución de Fricción). La especificación debe referirse a él como AMV v3.2 explícitamente en todos los puntos subsecuentes para evitar duplicación de lógica. No se re-implementa; se extiende.
Expandir — schema de nodos como contrato de datos
El "tipo define forma, color, tamaño y comportamiento" es insuficiente como contrato. Se requiere un schema JSON canónico:
{
  "node_id": "string (uuid)",
  "label": "string",
  "type": "system|cognitive_twin|user|cluster|metric|pattern|intermediate|emergent",
  "cluster_id": "string",
  "is_intermediate": false,
  "profile": "sfi|cognitive_twin|shared",
  "metrics": {},           // mapa de métricas asociadas
  "created_at": "ISO8601",
  "origin": "manual|amv_expansion|twin_prediction|sandbox",
  "hash_prev": "sha256",   // hash del nodo anterior en la cadena
  "hash_self": "sha256"    // sha256(node_id + label + created_at + hash_prev)
}
Este schema debe estar en schema/node.schema.json y ser la única fuente de verdad para frontend y backend.
Crítico — CORS fix es bloqueante
El fix CORS del Campo Cognitivo D3.js es el bloqueo más inmediato antes de cualquier desarrollo adicional. La regla de origen Access-Control-Allow-Origin en el FastAPI backend debe permitir la URL del frontend exacta (no wildcard en producción). Esto es la primera tarea de la Fase 0.
## PUNTO1
Pensamientos del Agente como Notificaciones Cognitivas
Sólido
Expandir
Confirma — especificación funcional correcta
El formato SFI | TIPO | DESCRIPCIÓN | OBSERVACIÓN DEL AGENTE es correcto y coherente con la voz clínica de la arquitectura. Las condiciones de activación (contradicción, evasión, post-intervención, cuello de botella) son bien definidas. La restricción de no generar pensamientos en vacío, periódicamente o por simulación es fundamental: confirma.
Adecuar — tipos de pensamiento ampliar a 7
Se añade tipo FIDELIDAD (derivado de R16 — cuando el agente detecta que el usuario opera fuera del Clúster de Fidelidad definido) y REDISTRIBUCION (R17 — cuando hay detección de fricción redistributiva entre nodos). Esto mantiene coherencia con las reglas de gobernanza existentes del AMV v3.2.
Expandir — umbral mínimo de 3 evidencias antes de generar CONTRADICCIÓN
La especificación menciona "al menos 3 evidencias de contradicción" solo en la auditoría. Debe formalizarse como regla del motor:
IF tipo == "CONTRADICCION":
    REQUIRE contradiction_evidence_count >= 3
    REQUIRE last_evidence_timestamp within 7 days
    REQUIRE evidence_types contains >= 2 distinct types
       (declaración verbal / acción documentada / omisión temporal)
Sin estas condiciones, el agente no genera el pensamiento. Se registra un evento PENSAMIENTO_INHIBIDO en bitácora indicando qué faltó.
Expandir — persistencia visual diferenciada por antigüedad
El modal del pensamiento debe degradar visualmente con el tiempo transcurrido desde su generación:
• 0-24h: borde dorado, opacidad 1.0 — pensamiento activo
• 24-72h: borde ámbar, opacidad 0.75 — pendiente
• >72h sin respuesta del usuario: borde gris, opacidad 0.5 + etiqueta SIN_RESPUESTA
El agente registra en bitácora el tiempo de respuesta del usuario. Este dato alimenta el indice_confianza del Punto 3.
## PUNTO 02
Clusters, Formas, Cambio de Perfil — Cognitive Twin
Sólido
Adecuar
Confirma — tabla de tipos y formas coherente
La tipología visual propuesta (hexágono SFI, círculo doble borde Cognitive Twin, cuadrado usuario, rombo métricas, triángulo patrones, estrella emergente) es funcional y diferenciada. Confirma. Las aristas por tipo (sólida, doble, discontinua) son correctas.
Adecuar — el nodo raíz en arquitectura SFI es "Asiento Cognitivo Primario"
El documento dice "nodo raíz: System Friction Institute". En la arquitectura real del AMV v3.2 (R12-mod), el nodo de control es el Asiento Cognitivo Primario (ACP) — Juan Antonio como punto de falla único. El nodo visible para el usuario puede llamarse "System Friction Institute", pero internamente debe mapear a node_type: "cognitive_primary_seat" con flag especial is_acp: true. Si ACP está ausente (modo ciego), el grafo renderiza en estado degradado con overlay de advertencia. Esta es una regla de gobernanza no negociable (R12-mod).
Adecuar — Cognitive Twin hereda sub-bitácora no separada
El documento propone "su propia sub-bitácora". Correcto, pero con precisión: es una vista filtrada de la bitácora global, no una base de datos separada. Columna profile en la bitácora global filtra cognitive_twin. Esto evita divergencia de integridad entre dos almacenes.
Expandir — modo ciego del sistema
Faltaba en la especificación. Cuando ACP (Juan Antonio) está ausente del sistema por más de N horas (configurable, default 48h), el grafo entra en Modo Ciego:
• Overlay semitransparente oscuro sobre el canvas
• Texto central en mono: SISTEMA EN MODO CIEGO — ASIENTO COGNITIVO PRIMARIO INACTIVO
• El agente no genera pensamientos, no ejecuta Monte Carlo, no acepta comandos de expansión
• Solo permite consulta de bitácora en modo lectura
• Al retornar ACP, se genera evento RETORNO_ACP en bitácora y el sistema se reactiva
## PUNTO3
Monte Carlo y Atractores Retrocausales
Sólido
Expandir
Alto costo computacional
Confirma — condición de umbral (0.75) y world_spect correctos
La fórmula de activación (indice_confianza * 0.4 + indice_evidencia * 0.4 + experiencia_documentada * 0.2) > 0.75 es coherente con la arquitectura CFI existente. Los seis factores del world_spect (Wmacro, Wcosmos, Wsocial, Wcultural, Wsemantic, Wfactual) son correctos. El formato de salida narrativo es adecuado.
Adecuar — 50,000 proyecciones es inviable en frontend, mover a backend worker
50,000 simulaciones Monte Carlo no deben ejecutarse síncronamente en una request HTTP. La arquitectura correcta:
• Frontend envía tarea → Backend encola en worker (Celery o background task)
• Worker ejecuta las 50,000 iteraciones asíncronamente
• Frontend hace polling o recibe webhook con resultado
• Tiempo máximo de respuesta en backend: 5 segundos (especificado en auditoría global)
Para cumplir: implementar en NumPy vectorizado (no loop Python puro), con semilla PRNG fija para reproducibilidad.
Expandir — cálculo del atractor retrocausal
"Combinación de variables del world_spect ponderadas" no tiene suficiente precisión técnica. Se define:
R_retrocausal = Σᵢ ( wᵢ · Φᵢ(objetivo) · P(éxito | wᵢ, bitácora) )

donde:
  wᵢ = peso dinámico del factor i según objetivo
  Φᵢ = potencial del factor i (heredado de Cognitive Field Theory)
  P(éxito | wᵢ, bitácora) = percentil 50 de las 50,000 proyecciones
                             condicionado al perfil histórico del usuario

El atractor es el punto en el espacio (objetivo, world_spect) de mayor
densidad de trayectorias convergentes. Coordenadas: (R_retrocausal, t_opsimal),
donde t_opsimal es el número de tics operativos hasta convergencia.
Expandir — integración con IHG/NTI existentes
El backend ScoreFriction ya computa IHG y NTI. Los índices indice_confianza e indice_evidencia del Punto 3 deben derivarse de IHG y NTI respectivamente, no ser variables nuevas independientes. Mapeo:
• indice_confianza ← IHG_normalizado (escala 0-1, donde IHG=0 → 0.5, IHG=-1 → 0.0, IHG=+1 → 1.0)
• indice_evidencia ← NTI (ya en escala 0-1)
• experiencia_documentada ← LDI_normalizado Esto evita fragmentación del modelo de datos y aprovecha el backend existente.
## PUNTO4
Nodos Emergentes Predichos por Cognitive Twin
Sólido
Adecuar menor
Confirma — lógica de detección y threshold correcto
Frecuencia >3 en últimos 10 eventos como umbral de generación. Estructura del nodo propuesto (nombre, tipo emergent, conexiones, criticidad 1-5, justificación). Panel de aceptación/rechazo/edición. Archivado de propuestas rechazadas en histórico. Todo correcto.
Adecuar — "últimos 10 eventos" debe ser configurable y con ventana temporal
El umbral "últimos 10 eventos" puede no capturar patrones espaciados en el tiempo. Se propone ventana combinada:
GENERAR nodo_emergente IF:
  (frecuencia_patron >= 3 EN últimos 10 eventos)
  OR
  (frecuencia_patron >= 5 EN últimas 72 horas)
  OR
  (frecuencia_patron >= 2 AND criticidad_patron >= 4)
El parámetro frecuencia_min debe ser configurable desde la interfaz del ACP (no hardcoded).
Expandir — nodo emergente tiene estado de ciclo de vida
Un nodo emergente no es solo propuesto/aceptado/rechazado. Ciclo completo:
• PROPUESTO: generado por Twin, visible en panel
• EN_REVISION: usuario lo abrió pero no decidió
• ACEPTADO: se materializa en grafo, tipo cambia a permanente
• MODIFICADO: aceptado con edición del usuario
• RECHAZADO: archivado, pero el patrón que lo originó sigue rastreándose
• REINTENTAR: Twin puede reproponerlo si el patrón persiste >5 ocurrencias adicionales
Cada transición de estado se registra en bitácora.
## PUNTO5
Campo Visual — Diferenciación de Nodos
Sólido
Expandir performance
Confirma — reglas visuales coherentes
Nodos informativos (≥32px, opacidad 1.0, interactuables). Nodos intermedios (12px, gris, ocultos en modo normal, solo debug). Aristas punteadas para intermedios en modo debug. Evaluación dinámica de conexiones con propuesta al usuario. Correcto en su totalidad.
Expandir — estrategia de nivel de detalle (LOD) para 121 nodos
El objetivo de ≤200ms de renderizado con 121 nodos + intermedios requiere una estrategia explícita:
• Zoom ≥80%: renderizar todos los nodos con labels y bordes completos
• Zoom 40%-80%: renderizar solo nodos informativos, intermedios colapsados a un único nodo fantasma por cluster
• Zoom <40%: renderizar solo nodos de tipo system, cluster, metric (máximo 20 nodos visibles)
D3.js con Canvas renderer (no SVG puro) para los niveles de zoom bajo. SVG solo para zoom alto (interacción detallada).
Adecuar — 200ms para renderizado es en Canvas, no SVG
Con 121 nodos SVG puros + animaciones + DOM events, 200ms puede no ser alcanzable en hardware promedio. La estrategia: SVG para nodos activos (interacción), Canvas layer superpuesto para nodos de fondo y aristas de baja importancia. La mezcla SVG+Canvas es la solución probada para grafos de este tamaño en D3.js.
## PUNTO6
Sandbox de Pruebas para Evolución Estructural
Sólido
Expandir aislamiento
Confirma — lógica de solicitud, ejecución e informe correcta
La solicitud estructurada al usuario con tiempo/recursos propuestos, entorno paralelo, simulación Monte Carlo (10,000 iteraciones en sandbox), informe antes/después, y adopción/descarte. Correcto. El aislamiento del sandbox respecto a producción es fundamental y bien identificado.
Expandir — snapshot del grafo como mecanismo de aislamiento
El "entorno paralelo" se implementa como un snapshot inmutable del estado actual del grafo (nodos + aristas + métricas) guardado con timestamp y hash de integridad. El sandbox opera sobre esta copia en memoria (o en una colección separada del store). Al finalizar, si el usuario acepta, se aplica un diff contra el estado actual de producción (no una sustitución total, para capturar cambios que ocurrieron durante el sandbox). Si el usuario descarta, el snapshot se archiva en bitácora con marca sandbox_descartado y no afecta producción.
Adecuar — Monte Carlo en sandbox: 10,000 iteraciones, no 50,000
La especificación es correcta en este punto (10k para sandbox). Confirmar que el worker de Monte Carlo acepta un parámetro n_iterations para usar el mismo motor con diferente escala.
## PUNTO7
Bitácora Completa y Accesible
Sólido
Expandir buscador
Confirma — estructura de entrada, inmutabilidad por hash encadenado, exportación, buscador semántico correcto
El schema de la entrada (timestamp ISO8601, perfil, tipo_evento, contenido JSON, hash SHA-256, firma_agente opcional), la vista de línea de tiempo con expansión, el botón "Explicar" vía agente, la exportación JSON/CSV, y la auditoría de integridad periódica son correctos y bien especificados.
Expandir — buscador semántico con embeddings, no solo keywords
"El usuario puede preguntar ¿cuándo me contradije?" requiere búsqueda semántica, no keyword matching. Implementación:
• Cada entrada de bitácora se embebe en un vector (usando embeddings ligeros, ej. all-MiniLM-L6-v2 o el API de Anthropic)
• La consulta del usuario también se embebe en el momento
• Se computa similitud coseno para ranking
• Los top-5 resultados más similares se pasan al agente para generar la respuesta narrativa
Esto es fundamental para que el buscador funcione con preguntas naturales en español.
Adecuar — "firma_agente con clave privada" es sobrengeniería inicial
La firma criptográfica del agente (clave privada/pública) es el estado ideal pero no el estado inicial. Para la primera implementación, la integridad se garantiza solo con hash encadenado. La firma criptográfica se añade en iteración posterior cuando el sistema tenga identidad de agente persistente. Marcar como TODO v2 en el código.
## PUNTO8
Project Manager — Calendario y Ruta Futura
Adecuar
Expandir
Confirma — calendario con hitos sugeridos/usuario, vista Gantt, arrastre de hitos
La estructura de componentes (vista mes/semana/día, hitos con probabilidad Monte Carlo, dependencias, Gantt simple, recálculo de rutas al reprogramar) es correcta.
Adecuar — A* sobre el grafo: los nodos son conceptuales, no geolocalizados
A* en el contexto del grafo cognitivo SFI no opera sobre distancia espacial sino sobre costo de activación (deuda de ejecución acumulada + NTI + peso de arista). La función de costo:
costo(nodo_i → nodo_j) = (deuda_ejecucion_j * 0.4)
                         + ((1 - NTI_j) * 0.35)
                         + (1 - peso_arista(i,j) * 0.25)

heuristica(nodo_j, objetivo) = distancia_semantica(embedding_j, embedding_objetivo)
El "A*" opera sobre este costo, no sobre distancia euclidiana. El objetivo B se embebe semánticamente para computar la heurística.
Expandir — "tics operativos" deben tener conversión a tiempo real explícita
Un tic operativo = unidad de trabajo atómica estimada para el perfil de usuario. Se calibra en la sesión inicial: el usuario declara disponibilidad de horas/semana y el agente ajusta el factor de conversión. La conversión aparece en el UI como etiqueta configurable: "1 tic = ~2h según tu disponibilidad actual".
## PUNTO9
Análisis con MIHM
Sólido
Expandir extractores
Adecuar variables
Confirma — lógica de variables visibles/ocultas, narrativa quirúrgica, umbral afirmativo
El MIHM normalizado con extractores por tipo de archivo, la separación entre variables sensibles y no sensibles, el lenguaje afirmativo basado en umbrales (sin "quizás", "podría"), y la solicitud de confirmación antes de revelar variables sensibles: todo correcto y coherente con el MIHM v2.0 existente.
Adecuar — conectar con MIHM v2.0 existente, no reimplementar
El MIHM v2.0 (36 páginas LaTeX, con NTI como corrector multiplicativo de IHG, IRCI como umbral geomecánico, Monte Carlo condicional con IC 95%) ya existe. El Punto 9 no reimplementa MIHM: conecta el frontend de análisis de archivos al motor MIHM v2.0 como extractor de variables de entrada. Los extractores nuevos (texto, imagen, URL, JSON) son preprocesadores que producen el vector homeostático de entrada para MIHM, que luego ejecuta su propio pipeline.
Expandir — extractor de imagen requiere decisión arquitectónica
"Composición emocional (si hay API de análisis visual)" es vago. Decisión concreta: para MVP, el extractor de imagen solo usa metadatos EXIF (timestamp, geolocalización, dispositivo, software) y hash perceptual para comparar con imágenes previas del usuario (detectar si el usuario reutiliza evidencia). El análisis emocional visual se marca como TODO v2 y se integra como módulo opcional (Anthropic Vision API o similar).
PUNTO 10
Conexión a Redes Sociales + Campaña Proyectada
Fase tardía
Adecuar prioridad
Adecuar — este punto pertenece a Fase 6, no antes
La implementación de OAuth, proyección de campaña por red social, y dashboard de seguimiento con métricas de plataforma requiere que todos los puntos anteriores (0-9) estén estables. El riesgo de implementar esto antes es alto: depende de Monte Carlo funcional (P3), MIHM conectado (P9), world_spect ponderado dinámicamente (P3), y bitácora con integridad (P7). Mover a Fase 6 como bloque completo.
Confirma — especificación funcional correcta cuando se implemente
El flujo OAuth, la ponderación dinámica de world_spect por red social (Instagram: Wsocial=0.4; LinkedIn: Wfactual=0.35), el desglose por red social, y la aprobación explícita del usuario antes de cada posteo son correctos. El dashboard cognitivo con nodo central = objetivo y nodos orbitando = redes sociales es coherente con el campo cognitivo D3.js existente.
Expandir — aprobación explícita de posteo como transacción firmada
Cuando el usuario aprueba un posteo, se genera una entrada en bitácora con:
• tipo_evento: APROBACION_POSTEO
• Red social, contenido exacto, timestamp, resultado de la API
• Hash de la aprobación firmada por el usuario (clic confirmado con segundo click en modal de confirmación)
Esto previene posteos accidentales y genera evidencia auditable de consentimiento.
PUNTO 11
Dashboard de Seguimiento en el Campo Cognitivo
Sólido
Expandir performance
Confirma — force-directed graph, reacomodo dinámico, nodo centro fijo, panel lateral, nodos exógenos
Todo el Punto 11 es correcto y coherente con el Campo Cognitivo D3.js existente. El reacomodo cada 10 segundos con transición animada, la fuerza de atracción ponderada por importancia, el panel lateral con opciones de intervención/bitácora/sandbox, y la interacción de arrastre manual son correctos.
Expandir — 60 FPS con 121 nodos requiere WebGL o Canvas, no SVG puro
60 FPS constantes con 121 nodos animados, 300 aristas, y actualizaciones cada 10s no son alcanzables con SVG solo. Estrategia:
• Capa base: Canvas 2D (D3.js + Canvas) para aristas y nodos de fondo
• Capa interactiva: SVG solo para nodos activos/hovered (máx 15 simultáneamente)
• requestAnimationFrame con throttle a 30 FPS en background, 60 FPS solo cuando hay interacción activa
• Web Worker para cálculos de force layout (no bloquear el hilo principal)
Adecuar — "cada 10 segundos" debe ser event-driven en mayoría de casos
El reacomodo periódico cada 10 segundos consumirá ciclos de CPU innecesariamente. Regla correcta: el grafo se reacomoda solo cuando se detecta un cambio relevante (nuevo nodo emergente aceptado, cambio en métrica de importancia >15%, nuevo pensamiento del agente generado). El polling de 10s se usa como fallback únicamente.
Parte II
MAPA DE DEPENDENCIAS ENTRE PUNTOS
Las dependencias determinan el orden de implementación. Ningún punto puede ejecutarse sin que sus dependencias estén verificadas como funcionales.

Punto	Depende de	Bloquea a	Criticidad
P0 — Base + Schema	CORS fix (bloqueante primario)	Todos	CRÍTICO
P5 — Campo Visual	P0 (schema de nodos)	P2, P11	ALTO
P2 — Clusters + ACP	P0, P5	P1, P4, P11	ALTO
P7 — Bitácora	P0	P1, P3, P4, P6, P8	ALTO
P1 — Pensamientos	P2, P7	P4, P6	MEDIO
P3 — Monte Carlo	P7, IHG/NTI backend	P8, P10	MEDIO
P4 — Emergentes	P1, P2	P11	MEDIO
P6 — Sandbox	P1, P7	—	MEDIO
P8 — Project Mgr	P3, P7	—	NORMAL
P9 — MIHM	P7, MIHM v2.0 backend	P10	NORMAL
P11 — Dashboard	P2, P4, P5	P10	NORMAL
P10 — Redes Sociales	P3, P9, P11	—	BAJO (Fase 6)
Parte III
FASES DE EJECUCIÓN — OBJETIVOS PUNTUALES
Estado de partida: EIDELON frontend (D3.js Campo Cognitivo parcial), AMV v3.2 activo, Flask/Railway backend operativo, CORS pendiente, systemfriction.org en Jekyll/GitHub Pages.

FASE 0
ESTABILIZACIÓN Y FUNDAMENTOS TÉCNICOS
Duración estimada: 2 semanas
Dependencias: NINGUNA — punto de partida
Riesgo: BLOQUEANTE si no se resuelve CORS
Objetivos puntuales
F0.1 — Resolver CORS en FastAPI backend: configurar Access-Control-Allow-Origin con URL exacta del frontend (no wildcard en producción). Verificar con curl + browser. Bloqueante absoluto.
F0.2 — Auditoría completa del árbol de archivos del repo aptymok/system-friction: mapear qué existe, qué está roto, qué es redundante. Producir REPO_AUDIT.md con inventario.
F0.3 — Definir y publicar schema/node.schema.json como contrato canónico de datos. Todos los módulos (frontend, backend, AMV) deben validar contra este schema.
F0.4 — Establecer schema de la bitácora (schema/log.schema.json) con campos obligatorios: timestamp, perfil, tipo_evento, contenido, hash_sha256, hash_prev. Implementar función de encadenamiento de hashes.
F0.5 — Conectar el endpoint IHG/NTI del backend ScoreFriction al módulo de índices del AMV v3.2 para derivar indice_confianza e indice_evidencia desde las variables CFI existentes.
F0.6 — Establecer variables de entorno del proyecto (.env.example): URLs de frontend/backend, umbrales configurables (MC_THRESHOLD, EMERGENT_MIN_FREQ, BLIND_MODE_HOURS, ACP_TIMEOUT_HOURS).
Prueba: CORS funcional
Prueba: schema validado en ambos lados
Prueba: bitácora registra evento con hash correcto
Prueba: IHG/NTI devuelven valores desde backend existente
FASE 1
CAMPO COGNITIVO BASE — NODOS, ARISTAS, TIPOLOGÍA VISUAL
Duración estimada: 3 semanas
Puntos: P0, P5, P2 (parcial)
Dependencia: Fase 0 completada
Objetivos puntuales
F1.1 — Implementar el renderizado D3.js de 121 nodos con tipología visual completa: forma por tipo (hexágono, círculo doble borde, cuadrado, rombo, triángulo, estrella, punto), color por cluster, tamaño por tipo. Todo derivado del node.schema.json.
F1.2 — Implementar las tres tipologías de aristas: sólida (stroke-width:2px) para conexiones funcionales fuertes, doble trazo para dependencias críticas, discontinua (dasharray:5,5) para conexiones inciertas. Grosor variable por peso de relación.
F1.3 — Implementar estrategia LOD (nivel de detalle): zoom alto → SVG interactivo completo; zoom medio → intermedios colapsados; zoom bajo → solo nodos de alto nivel. Sin degradación visual abrupta (transición gradual).
F1.4 — Implementar modo debug: al activar desde settings, nodos intermedios (is_intermediate:true) aparecen con opacidad 0.5 y sus aristas como punteadas finas. Al desactivar, desaparecen sin recargar el grafo.
F1.5 — Implementar el nodo raíz ACP ("System Friction Institute" visible, cognitive_primary_seat internamente). Al hacer clic: selector "Ver perfil: [SFI] [Cognitive Twin]". El selector cambia el estado del grafo globalmente.
F1.6 — Implementar Modo Ciego: si ACP_TIMEOUT transcurrido, renderizar overlay con mensaje canónico y desactivar todas las acciones de escritura. Al retornar ACP, registrar RETORNO_ACP en bitácora y reactivar.
F1.7 — Verificar rendimiento: renderizado inicial de 121 nodos en Canvas layer + SVG activos ≤200ms. Fuerza layout en Web Worker, sin bloqueo del hilo principal.
Prueba: cada tipo de nodo tiene forma/color correcto
Prueba: debug mode muestra exactamente los is_intermediate=true
Prueba: renderizado ≤200ms en hardware estándar
Prueba: Modo Ciego activa/desactiva correctamente
FASE 2
BITÁCORA OPERATIVA + PENSAMIENTOS DEL AGENTE
Duración estimada: 3 semanas
Puntos: P7, P1
Dependencia: Fase 0 + Fase 1
Objetivos puntuales
F2.1 — Implementar el store de bitácora con inmutabilidad garantizada por hash encadenado SHA-256. Verificar que ningún endpoint exponga métodos PUT/DELETE sobre entradas. La bitácora es append-only.
F2.2 — Implementar la vista de línea de tiempo en la interfaz: lista vertical de eventos con timestamp, tipo_evento coloreado, y expansión de contenido al clic. Filtros por fecha, tipo, perfil (sfi/cognitive_twin).
F2.3 — Implementar el buscador semántico de bitácora con embeddings. Pipeline: query del usuario → embedding → similitud coseno contra entradas embebidas → top-5 → narrativa del agente.
F2.4 — Implementar el motor de pensamientos del agente (AMV extension): detección de contradicción (≥3 evidencias, ventana 7 días, ≥2 tipos distintos), detección de patrón de evasión, post-intervención, cuello de botella. Tipos adicionales: FIDELIDAD (R16) y REDISTRIBUCION (R17).
F2.5 — Implementar el modal de pensamiento en el frontend: borde pulsante en el nodo origen, modal persistente con formato SFI | TIPO | DESCRIPCIÓN | OBSERVACIÓN, botón cierre (X), botón "Archivar en bitácora". Degradación visual por antigüedad (0-24h / 24-72h / >72h).
F2.6 — Implementar registro de eventos PENSAMIENTO_INHIBIDO: cuando el agente detecta condición parcial pero no alcanza umbral, debe registrar qué faltó para generar el pensamiento. Visible en bitácora con filtro específico.
F2.7 — Exportación de bitácora: endpoint que genera JSON y CSV descargables con todos los eventos del usuario. Sin incluir variables marcadas como sensibles en el export por defecto (opt-in explícito del usuario).
Prueba: inmutabilidad — intento de DELETE falla con 405
Prueba: hash encadenado válido en 100 entradas consecutivas
Prueba: pensamiento solo genera con ≥3 contradicciones
Prueba: buscador semántico responde en ≤2s
Prueba: modal de pensamiento persiste hasta cierre manual
FASE 3
COGNITIVE TWIN — PERFIL, NODOS EMERGENTES
Duración estimada: 3 semanas
Puntos: P2 (completo), P4
Dependencia: Fase 1 + Fase 2
Objetivos puntuales
F3.1 — Implementar el cambio de perfil SFI ↔ Cognitive Twin completo: al seleccionar Twin, el grafo muestra solo nodos con profile: "cognitive_twin" o "shared". El motor SFI continúa ejecutándose en background. El cambio se registra en bitácora con tipo_evento: CAMBIO_PERFIL.
F3.2 — Implementar el motor de predicción del Cognitive Twin: análisis de bitácora buscando patrones recurrentes con ventana combinada (≥3 en últimos 10 eventos, OR ≥5 en últimas 72h, OR ≥2 con criticidad≥4). Generación del nodo emergente propuesto con estructura completa.
F3.3 — Implementar el panel "Nodos emergentes sugeridos" en perfil Twin: lista de nodos propuestos con nombre, conexiones, criticidad (badge 1-5), justificación, y botones [Aceptar] [Rechazar] [Editar]. El estado del nodo sigue el ciclo de vida definido (PROPUESTO → ACEPTADO/RECHAZADO/MODIFICADO).
F3.4 — Implementar la materialización del nodo aceptado en el grafo: el nodo estrella semitransparente se vuelve opaco, se anclan sus aristas, y se registra en bitácora con origin: "twin_prediction" y el usuario que lo aceptó.
F3.5 — Implementar la lógica de reintento: si un nodo fue rechazado pero el patrón que lo originó acumula >5 ocurrencias adicionales, el Twin lo reproponerá automáticamente con la nueva frecuencia en el justificación.
F3.6 — Verificar que la bitácora global refleje eventos de ambos perfiles con columna profile correctamente filtrable. Los eventos del Twin no contaminan la vista SFI y viceversa.
Prueba: cambio de perfil no muestra nodos del sistema puro en Twin
Prueba: nodo emergente generado solo con evidencia de patrón real
Prueba: edición de nodo emergente registrada en bitácora
Prueba: ciclo de vida completo del nodo emergente funcional
FASE 4
MONTE CARLO — PROYECCIONES, ATRACTORES, WORLD_SPECT
Duración estimada: 3 semanas
Puntos: P3
Dependencia: Fase 0 (IHG/NTI) + Fase 2 (bitácora)
Objetivos puntuales
F4.1 — Implementar la evaluación de precondición Monte Carlo: computar (IHG_norm * 0.4 + NTI * 0.4 + LDI_norm * 0.2) en cada sesión. Si <0.75, bloquear ejecución y registrar MC_INHIBIDO en bitácora con los valores de cada componente.
F4.2 — Implementar el worker de Monte Carlo (Celery o FastAPI background task): aceptar parámetros objetivo_embedding, world_spect_weights, n_iterations, prng_seed. Ejecutar N proyecciones vectorizadas con NumPy. Devolver percentiles 10/50/90 y coordenadas del atractor.
F4.3 — Implementar la función del atractor retrocausal: computar R_retrocausal = Σᵢ(wᵢ · Φᵢ · P(éxito|wᵢ, bitácora)). El resultado es un punto en el espacio (objetivo, world_spect) de máxima densidad de trayectorias convergentes.
F4.4 — Implementar ajuste dinámico de pesos world_spect por tipo de objetivo: detectar el dominio del objetivo (ventas, crecimiento personal, educativo, institucional) y ajustar pesos automáticamente. Pesos configurables por el ACP si el dominio no coincide con los defaults.
F4.5 — Implementar la narrativa de salida del agente: generar mensaje con XS% de probabilidad, Wmacro/Wfactual explícitos, número de tics operativos, y lista de acciones sugeridas. Lenguaje afirmativo, sin ambigüedades. Persistir en bitácora con tipo_evento: PROYECCION_MC y hash del objetivo + pesos usados.
F4.6 — Verificar reproducibilidad: misma semilla PRNG + mismo objetivo + mismo perfil de usuario = misma proyección. Test automatizado que corre la misma simulación dos veces y compara resultados bit a bit.
Prueba: MC bloqueado si índice <0.75
Prueba: 50,000 iteraciones ≤5s en backend
Prueba: reproducibilidad con semilla fija
Prueba: pesos ajustan correctamente por dominio de objetivo
FASE 5
SANDBOX + PROJECT MANAGER + MIHM CONECTADO
Duración estimada: 4 semanas
Puntos: P6, P8, P9
Dependencia: Fases 2, 3, 4 completadas
Objetivos puntuales
F5.1 — Implementar el sistema de snapshot del grafo: serialización completa del estado (nodos + aristas + métricas) con timestamp y hash SHA-256. Almacenamiento inmutable como entrada en bitácora con tipo_evento: SNAPSHOT_SANDBOX.
F5.2 — Implementar la solicitud de sandbox del agente: generación del mensaje estructurado con tiempo/recursos propuestos + beneficio esperado. Panel de notificación con [Aceptar] [Denegar] [Modificar tiempo/recursos].
F5.3 — Implementar la ejecución aislada del sandbox: operaciones sobre el snapshot, no sobre producción. Al finalizar, ejecutar Monte Carlo (10,000 iter.) sobre el estado modificado y generar informe comparativo "Antes vs Después" en métricas clave.
F5.4 — Implementar la adopción de sandbox: si el usuario acepta, computar diff entre snapshot y estado actual de producción y aplicar solo los cambios del sandbox que no colisionen. Si descarta, archivar snapshot con resultado_aprobado: false.
F5.5 — Implementar el Project Manager: vista de calendario (mes/semana/día), hitos sugeridos por el agente con probabilidad Monte Carlo, hitos del usuario, dependencias entre hitos, vista Gantt simplificada. Arrastre de hitos con recálculo de dependencias y notificación de pensamiento del agente.
F5.6 — Implementar la ruta A→B con A* modificado: función de costo basada en deuda de ejecución + NTI + peso de arista. Heurística semántica por embedding del objetivo. Conversión de tics operativos a tiempo real según disponibilidad declarada del usuario.
F5.7 — Conectar frontend de análisis de archivos al motor MIHM v2.0: preprocesadores por tipo (texto→frecuencia de negaciones + ambigüedad + coherencia temporal; imagen→metadatos EXIF + hash perceptual; URL→sentimiento + factibilidad; JSON→extracción de variables CFI). Output del preprocesador = vector homeostático de entrada para MIHM.
F5.8 — Implementar la selección de variables visibles vs ocultas del MIHM: lista configurable de variables_sensibles en backend. Confirmación explícita del usuario antes de revelar. Registro en bitácora de cada solicitud de variables sensibles.
Prueba: sandbox no afecta producción hasta adopción
Prueba: diff de adopción no sobrescribe cambios concurrentes
Prueba: A* retorna ruta válida con recursos actuales
Prueba: MIHM no extrae variables sin extractor correspondiente
Prueba: variables sensibles ocultas por defecto y protegidas por confirmación
FASE 6
DASHBOARD INTEGRADO + REDES SOCIALES + CAMPAÑA
Duración estimada: 4 semanas
Puntos: P11, P10
Dependencia: Fase 5 completada + Todos los puntos previos estables
Objetivos puntuales
F6.1 — Implementar el Dashboard cognitivo unificado: force-directed graph D3.js con Canvas layer (aristas + fondo) + SVG layer (nodos activos). Web Worker para cálculos de layout. throttle a 30 FPS en background, 60 FPS en interacción activa. Nodo centro fijo en (400,300).
F6.2 — Implementar el reacomodo event-driven: el grafo se reacomoda con transición animada (800ms ease-in-out) solo cuando hay un cambio relevante detectado. El polling de 10s como fallback de baja prioridad.
F6.3 — Implementar nodos exógenos: conexión a APIs públicas de tendencias (o extracción de world_spect en bitácora). Visualizados con línea discontinua y badge de fuente verificable (URL, timestamp).
F6.4 — Implementar el panel lateral de nodo: al clic, mostrar detalles (tipo, métricas, pensamientos asociados), opciones [Solicitar intervención] [Ver en bitácora] [Ejecutar sandbox sobre este nodo]. Opción de fijar posición manual del nodo.
F6.5 — Implementar el flujo OAuth para redes sociales: solicitud de permiso al usuario con scope explícito (solo lectura para análisis, lectura+escritura para posteo). Almacenamiento de tokens encriptados con rotación automática.
F6.6 — Implementar la proyección de campaña: pipeline completo MIHM (perfil usuario + redes sociales) → Monte Carlo (50,000 iter., pesos world_spect por red) → desglose horarios/formatos/frecuencia por red. Output estructurado como evento de bitácora + visualización en grafo cognitivo.
F6.7 — Implementar la aprobación de posteo: doble confirmación (clic en botón + confirmación en modal), transacción firmada en bitácora con hash del contenido exacto. El agente no puede postear sin este flujo completado.
F6.8 — Implementar la recopilación de métricas de campaña: dashboard cognitivo con nodo central = objetivo y nodos orbitando = redes sociales + métricas (CTR, conversiones, alcance). Resumen final de campaña con distancia recorrida hacia el objetivo y nuevos próximos pasos sugeridos por el agente.
Prueba: 60 FPS en interacción activa con 121 nodos
Prueba: agente no postea sin doble confirmación
Prueba: tokens OAuth encriptados y no expuestos en logs
Prueba: métricas de campaña citan fuente y timestamp de API
Prueba: nodo exógeno tiene URL verificable
FASE 7
AUDITORÍA INTEGRAL + ESTABILIZACIÓN + DEPLOYMENT
Duración estimada: 2 semanas
Puntos: Pipeline de auditoría global (todos)
Dependencia: Fases 0–6 completadas
Objetivos puntuales
F7.1 — Ejecutar el pipeline de auditoría global completo para cada punto (1-11): prueba unitaria de especificación, prueba de integridad de bitácora, prueba de no simulación, prueba de seguridad de variables sensibles, prueba de consistencia SFI/Twin, prueba de rendimiento Monte Carlo ≤5s, prueba de usabilidad.
F7.2 — Resolver todos los TODO v2 marcados durante las fases o documentarlos formalmente como deuda técnica en TECH_DEBT.md con prioridad y estimado de esfuerzo.
F7.3 — Auditoría de integridad de bitácora: recalcular todos los hashes encadenados desde el primer evento y comparar con los almacenados. Cualquier divergencia es un bug crítico.
F7.4 — Prueba de carga: simular 50 sesiones concurrentes con 50,000 proyecciones Monte Carlo cada una. El backend no debe degradarse más del 20% en throughput promedio.
F7.5 — Deployment final a producción: GitHub Pages (frontend estático EIDELON), Railway (backend Flask/FastAPI). Configurar CI/CD básico (GitHub Actions) para deploy automático en push a main con tests de humo.
F7.6 — Documentar el sistema completo en ARCHITECTURE.md: diagrama de componentes, flujo de datos, reglas de gobernanza activas (R12-mod, R16, R17), glosario de variables CFI, y guía de operación para el ACP.
Prueba: pipeline auditoría global sin fallos
Prueba: integridad de hashes al 100%
Prueba: carga concurrente ≤20% degradación
Deploy: frontend + backend funcionando en producción
∎ FINAL FINAL — Sistema Completo Operativo
Al completar la Fase 7, el sistema SFI Campo Cognitivo estará completamente operativo con los siguientes 11 subsistemas integrados, auditados y desplegados. El siguiente cuadro es el estado final de referencia: cada punto verificado, cada fase acreditada, cada regla de gobernanza activa.

Subsistema	Fase de entrega	Estado objetivo	Gobernanza activa
P0 — Base Estructural + Schema Canónico	Fase 0	OPERATIVO	R12-mod (ACP), CORS fix
P1 — Pensamientos Cognitivos del Agente	Fase 2	OPERATIVO	R16 (Fidelidad), R17 (Redistribución)
P2 — Clusters + Tipología Visual + ACP	Fase 1 + 3	OPERATIVO	R12-mod (Modo Ciego)
P3 — Monte Carlo + Atractores Retrocausales	Fase 4	OPERATIVO	Umbral 0.75, IHG/NTI/LDI integrados
P4 — Nodos Emergentes Cognitive Twin	Fase 3	OPERATIVO	Ciclo de vida 6 estados, reintento automático
P5 — Campo Visual: LOD + Debug Mode	Fase 1	OPERATIVO	LOD 3 niveles, Canvas+SVG
P6 — Sandbox Estructural	Fase 5	OPERATIVO	Snapshot inmutable, aislamiento total
P7 — Bitácora Inmutable + Buscador Semántico	Fase 2	OPERATIVO	SHA-256 encadenado, append-only
P8 — Project Manager + Ruta A→B	Fase 5	OPERATIVO	A* con costo CFI, tics operativos calibrados
P9 — MIHM Conectado + Análisis de Archivos	Fase 5	OPERATIVO	MIHM v2.0, variables sensibles protegidas
P10 — Redes Sociales + Campaña Proyectada	Fase 6	OPERATIVO	OAuth, doble confirmación de posteo
P11 — Dashboard Cognitivo Integrado	Fase 6	OPERATIVO	60 FPS, event-driven, Web Worker
Línea de tiempo comprimida
Fase	Semanas	Semanas acumuladas	Hito verificable
Fase 0 — Fundamentos	2	S1-S2	CORS resuelto, schemas publicados, IHG/NTI conectados
Fase 1 — Campo Visual	3	S3-S5	121 nodos renderizados, LOD funcional, Modo Ciego activo
Fase 2 — Bitácora + Pensamientos	3	S6-S8	Bitácora inmutable, pensamientos del agente generándose
Fase 3 — Cognitive Twin	3	S9-S11	Perfil Twin funcional, nodos emergentes propuestos
Fase 4 — Monte Carlo	3	S12-S14	50k proyecciones ≤5s, atractor retrocausal computado
Fase 5 — Sandbox + PM + MIHM	4	S15-S18	Sandbox aislado, ruta A→B, MIHM v2.0 conectado
Fase 6 — Dashboard + RRSS	4	S19-S22	Dashboard 60 FPS, OAuth, campaña proyectada
Fase 7 — Auditoría + Deploy	2	S23-S24	Pipeline auditoría global aprobado, producción activa
REGLAS DE GOBERNANZA NO NEGOCIABLES — R12-mod: El sistema no funciona sin el Asiento Cognitivo Primario (Juan Antonio) como nodo central. Ausencia > threshold → Modo Ciego. R16: El Clúster de Fidelidad detecta y registra desviaciones del usuario respecto a su propio patrón declarado. R17: La Redistribución de Fricción genera pensamiento del agente cuando hay fricción no procesada acumulada entre nodos. Estas tres reglas son invariantes en toda la arquitectura y no pueden ser desactivadas por ningún usuario, incluyendo el ACP.

SFI · CAMPO COGNITIVO · Especificación v1.0-rev
aptymok/system-friction · 2026-05-19
Asiento Cognitivo Primario: Juan Antonio Marín Liera