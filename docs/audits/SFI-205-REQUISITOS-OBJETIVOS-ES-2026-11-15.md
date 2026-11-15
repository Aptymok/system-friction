# SFI — 205 entradas de cierre: significado explícito en español

**Fuente:** ejecución real del controlador de cierre GitHub 43671545054; SHA `4e25d7a6276c6c875fd22a3b9b0ca489abc237ea`.
**Nota epistemológica:** esta interpretación operativa en español es una propuesta trazada; el texto literal en inglés y la fuente primaria conservan autoridad. Entre los 205 hay requisitos, fragmentos y notas históricas; no todos son obligaciones independientes.

## Diccionario

- **MASTER:** Criterio de cierre, ruta docs/program/SFI-MASTER-PROGRAM.md
- **WS:** Frente de trabajo, ruta docs/program/workstreams/
- **LEGACY154:** Fragmento extraído del documento histórico del expediente #154
- **ISSUE154:** Requisito o fragmento de la incidencia #154
- **CTRL405:** Directiva aceptada por ROOT en #405
- **RETURN:** Observación posterior atribuible; la ejecución sola no prueba el resultado
- **SATISFIED:** Recibo aceptado por el controlador
- **IN_PROGRESS:** Trayectoria activa, cierre incompleto
- **PARTIAL:** Código o evidencia parcial sin cierre
- **EXTERNAL_ACTION:** Requiere hecho externo observado
- **MISSING:** No localizado por el clasificador; no equivale a inexistencia
- **INVALID:** Recibo rechazado, no genera cierre

## Catálogo traducido y referenciado

### MASTER-01 — SATISFIED
**Objetivo o significado contextual:** Permitir que una pregunta sistémica ingrese mediante una señal independiente del dominio.
**Texto original extraído:** a systemic question can enter through a domain-neutral signal contract;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### MASTER-02 — SATISFIED
**Objetivo o significado contextual:** Seleccionar las capacidades iniciales mínimas necesarias para una tarea.
**Texto original extraído:** MetaOrchestrator can choose a minimum initial capability set;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### MASTER-03 — SATISFIED
**Objetivo o significado contextual:** Permitir que una capacidad en ejecución solicite otra durante su operación.
**Texto original extraído:** an executing capability can request another capability at runtime;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### MASTER-04 — IN_PROGRESS
**Objetivo o significado contextual:** Reservar a SFI, y no al modelo solicitante, la admisión, denegación o aplazamiento de una solicitud.
**Texto original extraído:** SFI, not the requesting model, admits/denies/defers the request;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-05 — SATISFIED
**Objetivo o significado contextual:** Seleccionar el modelo suficiente con menor coste y recursos adecuados para cada operación.
**Texto original extraído:** the minimum sufficient model is selected per operation;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### MASTER-06 — IN_PROGRESS
**Objetivo o significado contextual:** Poder incorporar o retirar modelos avanzados sin rediseñar la arquitectura.
**Texto original extraído:** adding/removing a frontier model does not require architecture redesign;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-07 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir que una salida de modelo se convierta en observación por herencia.
**Texto original extraído:** model output cannot become observation by inheritance;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-08 — IN_PROGRESS
**Objetivo o significado contextual:** Mantener el estado del Gemelo Cognitivo fuera del contexto volátil del modelo.
**Texto original extraído:** Twin state remains external to model context;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-09 — IN_PROGRESS
**Objetivo o significado contextual:** Reproducir y comparar experimentos en Method Lab sin contaminar las observaciones.
**Texto original extraído:** Method Lab can reproduce and compare experiments without contaminating observation;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-10 — IN_PROGRESS
**Objetivo o significado contextual:** Mostrar en ROOT sólo obligaciones humanas que realmente requieren decisión.
**Texto original extraído:** ROOT exposes only actionable human obligations as required decisions;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-11 — IN_PROGRESS
**Objetivo o significado contextual:** Preservar la autoridad y procedencia de toda acción material.
**Texto original extraído:** every consequential action preserves authority lineage;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-12 — IN_PROGRESS
**Objetivo o significado contextual:** Exigir un camino de observación posterior para cada predicción.
**Texto original extraído:** predictions have an explicit RETURN path;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-13 — IN_PROGRESS
**Objetivo o significado contextual:** Permitir aceptar, rechazar o reemplazar aprendizajes sin reescribir silenciosamente el historial.
**Texto original extraído:** learning is promoted/rejected/superseded without destructive history rewrite;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-14 — IN_PROGRESS
**Objetivo o significado contextual:** Publicar una sola vez el objeto canónico y distribuir representaciones coherentes.
**Texto original extraído:** a canonical public object is published once and projected into machine/search/distribution representations;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-15 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar la misma identidad institucional en los nodos externos.
**Texto original extraído:** external nodes point to the same canonical identity;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-07`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-07; update #766 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-16 — SATISFIED
**Objetivo o significado contextual:** Permitir descubrimiento público de SFI por un cliente autónomo sin darle autoridad de ejecución.
**Texto original extraído:** an autonomous client can discover SFI through a read-only public MCP without receiving execution authority;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### MASTER-17 — IN_PROGRESS
**Objetivo o significado contextual:** Limitar a clientes autenticados únicamente a los permisos concedidos.
**Texto original extraído:** an authenticated client can use only explicitly granted scopes;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-18 — SATISFIED
**Objetivo o significado contextual:** Permitir a investigadores reconstruir resultados mediante metadatos e identidades académicas legítimas.
**Texto original extraído:** a researcher can reconstruct outputs through metadata/DOI/author identity;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### MASTER-19 — SATISFIED
**Objetivo o significado contextual:** Permitir encontrar a SFI mediante búsquedas de problemas, sin mencionar el nombre SFI.
**Texto original extraído:** a human or search/AI system can discover SFI through unbranded problem-space queries;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### MASTER-20 — SATISFIED
**Objetivo o significado contextual:** Medir Discovery Mesh con sus indicadores de recuperación, identidad y distribución definidos.
**Texto original extraído:** Discovery Mesh performance is measured with UDR/EIC/IRD/ACR/ECR/MPD/ERR;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### MASTER-21 — IN_PROGRESS
**Objetivo o significado contextual:** Admitir sistemas observados no digitales mediante el mismo núcleo de observación.
**Texto original extraído:** a non-digital observed system can enter the same observation kernel;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-22 — IN_PROGRESS
**Objetivo o significado contextual:** Ejecutar audio en espacios efímeros y conservar sólo evidencia técnica y metadatos autorizados.
**Texto original extraído:** material audio can execute in an ephemeral workspace while SFI persists only appropriate references, hashes, metrics and lineage;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-23 — IN_PROGRESS
**Objetivo o significado contextual:** Separar jurídicamente el banco de instrumentos del banco de referencias culturales.
**Texto original extraído:** Instrument Bank and Cultural Reference Bank remain legally and methodologically separate;
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### MASTER-24 — IN_PROGRESS
**Objetivo o significado contextual:** Hacer cumplir los invariantes en integración continua y verificar su efecto real en producción.
**Texto original extraído:** CI enforces these invariants and production RETURN verifies them.
**Fuente del requisito:** [docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/SFI-MASTER-PROGRAM.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-001 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar o verificar los eventos preexistentes de plan y puntos de control de RETURN (fragmento contextual).
**Texto original extraído:** existing checkpoints/RETURN plan events.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-002 — IN_PROGRESS
**Objetivo o significado contextual:** Preservar los 21 identificadores de agente existentes y su significado histórico.
**Texto original extraído:** preserve current 21 IDs and historical semantics;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-003 — IN_PROGRESS
**Objetivo o significado contextual:** Validar los modos epistemológicos, herramientas, modelos, límites de autoridad, orquestación y retorno de cada agente.
**Texto original extraído:** validate epistemic mode, tools, model requirements, authority ceiling, orchestration and RETURN rules;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-004 — IN_PROGRESS
**Objetivo o significado contextual:** No otorgar nuevas facultades por defecto.
**Texto original extraído:** expose no new authority by default;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-005 — IN_PROGRESS
**Objetivo o significado contextual:** Incorporar una prueba de contrato al sistema de integración continua.
**Texto original extraído:** add CI contract gate.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-006 — IN_PROGRESS
**Objetivo o significado contextual:** Registrar y emitir solicitudes de capacidad y las decisiones tomadas sobre ellas.
**Texto original extraído:** persist/emit requests and dispositions;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-007 — IN_PROGRESS
**Objetivo o significado contextual:** Verificar que existe el pasaporte de capacidad requerido.
**Texto original extraído:** verify passport existence;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-008 — IN_PROGRESS
**Objetivo o significado contextual:** Comprobar alcance, autoridad, evidencia, presupuesto y profundidad antes de admitir una solicitud.
**Texto original extraído:** verify scope/authority/evidence/budget/depth;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-009 — IN_PROGRESS
**Objetivo o significado contextual:** Implementar las seis disposiciones posibles: admitir, denegar, aplazar, ya satisfecho, requiere autoridad humana y requiere evidencia.
**Texto original extraído:** support `ADMIT`, `DENY`, `DEFER`, `ALREADY_SATISFIED`, `HUMAN_AUTHORITY_REQUIRED`, `EVIDENCE_REQUIRED`;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-010 — IN_PROGRESS
**Objetivo o significado contextual:** Emitir eventos que permitan reconstruir la procedencia de decisiones.
**Texto original extraído:** emit lineage events;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-011 — IN_PROGRESS
**Objetivo o significado contextual:** Nunca considerar una petición del modelo como autorización.
**Texto original extraído:** never treat a model request as authorization.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-012 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar los contratos de ejecución externa ya existentes (fragmento contextual).
**Texto original extraído:** existing external execution contracts.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-013 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir la promoción implícita de salidas de modelo a evidencia (fragmento de prohibición).
**Texto original extraído:** implicit promotion of model output to evidence;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-014 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir autoridad de ejecución externa concedida por defecto (fragmento de prohibición).
**Texto original extraído:** default external execution authority;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-015 — IN_PROGRESS
**Objetivo o significado contextual:** Respetar los controles de gobernanza de IA (fragmento contextual).
**Texto original extraído:** AI governance gates;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-016 — IN_PROGRESS
**Objetivo o significado contextual:** Bloquear ejecución cuando el intermediario de capacidades deniegue la solicitud.
**Texto original extraído:** request alone cannot execute if broker denies;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-017 — IN_PROGRESS
**Objetivo o significado contextual:** Cambiar a un modelo disponible sin alterar el estado epistemológico ni los permisos.
**Texto original extraído:** unavailable frontier model falls back without changing epistemic/authority state;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-018 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir que un modelo obtenga más autoridad que el límite de su pasaporte.
**Texto original extraído:** no model can obtain authority above passport ceiling;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-019 — IN_PROGRESS
**Objetivo o significado contextual:** Preservar la separación entre evidencia observada y salida de modelo.
**Texto original extraído:** evidence/model output distinction remains intact;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-020 — IN_PROGRESS
**Objetivo o significado contextual:** Mantener compatibilidad con los modos de operación explícitos y automáticos existentes.
**Texto original extraído:** existing explicit/auto behavior remains compatible.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-021 — IN_PROGRESS
**Objetivo o significado contextual:** Verificar que se selecciona modelo individualmente para cada operación.
**Texto original extraído:** per-operation model selection is implemented;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-022 — IN_PROGRESS
**Objetivo o significado contextual:** Persistir la genealogía de eventos de ejecución.
**Texto original extraído:** event lineage is persisted;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-023 — IN_PROGRESS
**Objetivo o significado contextual:** Evitar duplicar propietarios institucionales existentes.
**Texto original extraído:** no existing institutional owner is duplicated;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-024 — SATISFIED
**Objetivo o significado contextual:** Comprobar desde SFI-00 la operación integrada en producción o en entorno de ejecución autorizado.
**Texto original extraído:** SFI-00 observes the merged behavior in production or the appropriate runtime environment.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-025 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar el propietario original del grafo de tareas (fragmento de propiedad).
**Texto original extraído:** existing task-graph implementation: task-graph owner;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-026 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar el propietario transversal de eventos de procedencia (fragmento de propiedad).
**Texto original extraído:** `epistemic_events`: transversal lineage/event owner.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-027 — SATISFIED
**Objetivo o significado contextual:** No permitir que EvidenceHunter se presente como observador; mantener sus salidas como inferencias (corrección histórica).
**Texto original extraído:** **P1 — EvidenceHunter epistemic boundary:** passport outputs now derive from `executionContractForAgent()` rather than coarse runtime layer. `evidence_hunter` cannot inherit `OBSERVATION`; its allowed outputs remain `INFERENCE`, `RECOMMENDATION`, `NOT_EXECUTED`.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-028 — SATISFIED
**Objetivo o significado contextual:** Exigir RETURN como evidencia de entrada para el agente de calibración de realidad (corrección histórica).
**Texto original extraído:** **P1 — reality calibration RETURN:** `reality_calibration` now requires `RETURN` in `input.requiredEvidenceClasses`. This is an input evidence precondition and remains distinct from a future RETURN obligation.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-029 — SATISFIED
**Objetivo o significado contextual:** Rechazar pasaportes que eliminen la confirmación humana exigida por la fuente (corrección histórica).
**Texto original extraído:** **P2 — human confirmation validation:** `validateCognitivePassportAgainstSource()` rejects a passport that weakens `source.humanApprovalRequired`, with deterministic `CONFIRMATION_REQUIREMENT_MISMATCH` output.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-030 — IN_PROGRESS
**Objetivo o significado contextual:** Limitar autoridades conservadoras a lectura o recomendación.
**Texto original extraído:** conservative authority ceilings limited to `READ` / `RECOMMEND`;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-031 — IN_PROGRESS
**Objetivo o significado contextual:** No emitir autoridad de herramientas desde un pasaporte.
**Texto original extraído:** zero tool authority minted by passports;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-032 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar los campos de retorno, seguridad y orquestación del contrato congelado.
**Texto original extraído:** RETURN/security/orchestration fields from the frozen contract;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-033 — IN_PROGRESS
**Objetivo o significado contextual:** No añadir facultades de concesión de capacidades en ese alcance.
**Texto original extraído:** no capability grant semantics added;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-034 — IN_PROGRESS
**Objetivo o significado contextual:** No añadir autoridad de ejecución externa en ese alcance.
**Texto original extraído:** no external execution authority added.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-035 — IN_PROGRESS
**Objetivo o significado contextual:** Verificar topología paralela durante aseguramiento.
**Texto original extraído:** verify parallel topology;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-036 — IN_PROGRESS
**Objetivo o significado contextual:** Ejecutar el control de registro de pasaportes cognitivos.
**Texto original extraído:** `SFI cognitive passport registry` gate;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-037 — IN_PROGRESS
**Objetivo o significado contextual:** Preservar una vía de retorno de cierre universal.
**Texto original extraído:** universal closure RETURN fallback;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-038 — SATISFIED
**Objetivo o significado contextual:** Registrar la ausencia de defectos pendientes conocidos en Slice A después de pruebas (constatación histórica, no objetivo nuevo).
**Texto original extraído:** no remaining Slice A implementation defect is established after the four review corrections and successful implementation QA;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-039 — SATISFIED
**Objetivo o significado contextual:** No sustituir las pruebas oficiales con el estado de vistas previas de plataformas (constatación histórica).
**Texto original extraído:** Netlify preview status is not used as a substitute for canonical SFI Verify; Vercel preview had independently reported ready on the earlier head;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-040 — SATISFIED
**Objetivo o significado contextual:** Mantener la incidencia #366 bajo los frentes WS-03/WS-08 (dependencia histórica).
**Texto original extraído:** baseline issue `#366` remains outside WS-01 ownership and under WS-03/WS-08 sequencing;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-041 — IN_PROGRESS
**Objetivo o significado contextual:** Reservar a SFI-00 la autoridad de integración (regla de gobernanza).
**Texto original extraído:** SFI-00 remains sole merge/integration authority;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-042 — IN_PROGRESS
**Objetivo o significado contextual:** No iniciar Slice B hasta que Slice A esté integrada en main (dependencia histórica).
**Texto original extraído:** Slice B remains blocked while `#367` is open; it must start only from a `main` containing admitted Slice A.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-043 — IN_PROGRESS
**Objetivo o significado contextual:** Exigir que el modo epistemológico corresponda a la capa original de cada agente.
**Texto original extraído:** **P1 — source-layer epistemic mode:** source validation now requires `passport.epistemicMode === EPISTEMIC_MODE_BY_LAYER[source.layer]`; a simulation passport cannot be relabeled as observational.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-044 — SATISFIED
**Objetivo o significado contextual:** Derivar condiciones obligatorias de RETURN de la fuente y rechazar su debilitamiento.
**Texto original extraído:** **P1 — source-derived RETURN block:** projection and validation share one `returnContractFor(source)` derivation; `required`, `condition`, and `falsificationCondition` cannot be weakened for RETURN-required agents.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-045 — SATISFIED
**Objetivo o significado contextual:** No permitir que un pasaporte esconda entradas requeridas por la fuente.
**Texto original extraído:** **P2 — source-required inputs:** `input.required` must match the normalized `source.sourceTables` dependency set; required dependencies cannot be hidden by passport mutation.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-046 — SATISFIED
**Objetivo o significado contextual:** Rechazar cuando un simulador social se autodeclare observador (prueba histórica).
**Texto original extraído:** `social_field_simulator` mutated `SIMULATE -> OBSERVE` is rejected with `EPISTEMIC_MODE_MISMATCH`;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-047 — SATISFIED
**Objetivo o significado contextual:** Rechazar cuando agentes de trayectoria o ejecución eliminen sus obligaciones de RETURN (prueba histórica).
**Texto original extraído:** `trajectory_agent` and `project_execution_manager` cannot drop or weaken their RETURN block and produce `RETURN_CONTRACT_MISMATCH`;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-048 — SATISFIED
**Objetivo o significado contextual:** Rechazar cuando el observador borre sus entradas requeridas (prueba histórica).
**Texto original extraído:** `field_observer` cannot clear source-required inputs and produces `INPUT_REQUIRED_CONTRACT_MISMATCH`.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-01-049 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar el resultado histórico de la ejecución satisfactoria indicada; no tratarla como prueba actual.
**Texto original extraído:** `SFI Verify` #2331 / run `33922716236`: `SUCCESS`;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-050 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar el resultado histórico del control de pasaportes; no tratarlo como prueba actual.
**Texto original extraído:** cognitive passport registry gate: `PASS`;
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-051 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar el resultado histórico de OAuth externo; no tratarlo como prueba actual.
**Texto original extraído:** `SFI External OAuth` #330: `SUCCESS`.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-052 — IN_PROGRESS
**Objetivo o significado contextual:** Consolidar en un propietario los requisitos de modelo por operación (corrección histórica).
**Texto original extraído:** **Canonical model-requirements owner consolidated.** `operationModelRequirementsForAgent()` is the complete canonical operation-requirements projection. `llmRequirementsForAgent()` derives the narrower provider-router shape from that same canonical object. `agentLlmClient.ts` consumes `llmRequirementsForAgent(agentId)` directly; the local `requirementsForAgent()` wrapper/owner was removed.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-053 — IN_PROGRESS
**Objetivo o significado contextual:** Comparar todo el contrato de salida contra la fuente, incluidos esquema y políticas de incertidumbre.
**Texto original extraído:** **Complete output policy locked to source.** Source validation compares the full projected output block, including schema reference, allowed epistemic classes, confidence policy, missing-data policy, and contradiction policy. Stored/overridden passports cannot weaken `MISSING_REMAINS_MISSING` semantics or substitute an unrelated confidence policy.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-054 — IN_PROGRESS
**Objetivo o significado contextual:** Rechazar divergencias de requisitos completos de razonamiento, coste, privacidad, proveedor y capacidades.
**Texto original extraído:** **Complete model-requirements projection locked.** Source validation rejects drift in reasoning, structured output, web, multimodal, computer, code, minimum context, latency, cost, privacy, provider allowlist, and provider denylist. Passport storage/override does not create model-routing authority.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-055 — IN_PROGRESS
**Objetivo o significado contextual:** No permitir agregar ni ocultar recursos respecto de los permitidos y prohibidos.
**Texto original extraído:** **Complete resource contract locked.** `allowedResources` must equal the source `readsMemory` projection; resources cannot be added or hidden. `forbiddenResources` must preserve the frozen prohibitions `service_role`, `raw_secrets`, and `unscoped_external_execution`.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-056 — IN_PROGRESS
**Objetivo o significado contextual:** Bloquear la alteración de políticas de evidencia, ausencia y observación.
**Texto original extraído:** **Canonical source-policy set locked.** `input.sourcePolicies` must equal the frozen set `EVIDENCE_BEFORE_INFERENCE`, `MODEL_OUTPUT_NEVER_OBSERVATION_BY_INHERITANCE`, and `MISSING_REMAINS_MISSING`; empty, arbitrary, duplicate, or incomplete policy sets fail validation.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-01; update #760 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-01-057 — SATISFIED
**Objetivo o significado contextual:** Conservar los invariantes de fuente y retorno ya establecidos.
**Texto original extraído:** **Prior source invariants retained.** EvidenceHunter remains non-observational; source-layer epistemic mode cannot drift; source-required inputs cannot be dropped; RETURN obligations cannot be weakened; required observed RETURN for reality calibration remains explicit; mandatory human confirmation remains source-derived and non-optional.
**Fuente del requisito:** [docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-02-001 — SATISFIED
**Objetivo o significado contextual:** Conservar la genealogía de la señal universal y ciclo cognitivo consumidos por el Gemelo (fragmento contextual).
**Texto original extraído:** current Universal Signal/Cognitive Cycle lineage consumed by Twin;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-02-002 — IN_PROGRESS
**Objetivo o significado contextual:** Identificar qué evidencia existía exactamente al tiempo T0.
**Texto original extraído:** what evidence existed at T0;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-003 — IN_PROGRESS
**Objetivo o significado contextual:** Identificar el resultado/RETURN observado posteriormente.
**Texto original extraído:** what later RETURN/outcome occurred;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-004 — IN_PROGRESS
**Objetivo o significado contextual:** Permitir seleccionar el caso, la evidencia y el estado del Gemelo para un experimento.
**Texto original extraído:** select case/evidence/Twin state;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-005 — IN_PROGRESS
**Objetivo o significado contextual:** Permitir declarar hipótesis, T0, regla de detención y condición de retorno.
**Texto original extraído:** declare hypothesis/T0/stopping/RETURN terms;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-006 — IN_PROGRESS
**Objetivo o significado contextual:** Exportar metadatos de prerregistro reproducibles.
**Texto original extraído:** export preregistration metadata.
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-007 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar decisiones de capacidades y modelos en recibos experimentales.
**Texto original extraído:** capability/model decisions must be captured in experiment receipts;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-008 — IN_PROGRESS
**Objetivo o significado contextual:** Tratar cambios de proveedor/modelo como variables experimentales, no como cambios de identidad del Gemelo.
**Texto original extraído:** model/provider swaps remain experimental variables, not Twin identity changes.
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-009 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir que un experimento sin T0 o genealogía reclame calibración (prohibición).
**Texto original extraído:** experiment with no T0 or lineage claiming calibration;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-010 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir la divulgación de estado privado del Gemelo en Discovery Mesh (prohibición).
**Texto original extraído:** hidden private Twin state emitted into public Discovery Mesh;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-011 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir que experimentos no gobernados modifiquen el canon o permisos de ROOT (prohibición).
**Texto original extraído:** uncontrolled experiment that mutates canon/ROOT authority.
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-012 — IN_PROGRESS
**Objetivo o significado contextual:** Poder reconstruir aprendizaje histórico aun después de rectificaciones.
**Texto original extraído:** same historical learning remains reconstructable after amendment;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-013 — SATISFIED
**Objetivo o significado contextual:** Mantener simulaciones y repeticiones separadas de observaciones reales.
**Texto original extraído:** simulation/replay output cannot become OBSERVED by inheritance;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-02-014 — IN_PROGRESS
**Objetivo o significado contextual:** Preservar identidad e historia del Gemelo al sustituir modelos.
**Texto original extraído:** model swap does not overwrite Twin identity/history;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-015 — IN_PROGRESS
**Objetivo o significado contextual:** Guardar el estado del Gemelo fuera del contexto del modelo.
**Texto original extraído:** Twin state is explicitly external/model-independent;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-016 — IN_PROGRESS
**Objetivo o significado contextual:** Rectificar o sustituir aprendizaje con registros de procedencia.
**Texto original extraído:** learning can be amended/superseded with lineage;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-017 — IN_PROGRESS
**Objetivo o significado contextual:** Cubrir la taxonomía completa de experimentos declarada en el frente.
**Texto original extraído:** Method Lab supports the full experiment taxonomy above;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-018 — IN_PROGRESS
**Objetivo o significado contextual:** Exponer diferencias de modelos, pasaportes y evidencias en recibos experimentales.
**Texto original extraído:** experiment receipts expose model/passport/evidence differences;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-02-019 — SATISFIED
**Objetivo o significado contextual:** Exportar prerregistros utilizables sin fingir un registro externo.
**Texto original extraído:** preregistration export is usable without fabricating external registration;
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-02-020 — IN_PROGRESS
**Objetivo o significado contextual:** Aprobar pruebas y observar comportamiento correcto tras integración por SFI-00.
**Texto original extraído:** all gates pass and SFI-00 observes correct behavior after integration.
**Fuente del requisito:** [docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md). **Responsable declarado:** `SFI-02`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-02; update #761 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-03-001 — SATISFIED
**Objetivo o significado contextual:** Prohibir cuentas externas ficticias en la lista de identidades sameAs.
**Texto original extraído:** fabricated external accounts in `sameAs`;
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-03-002 — IN_PROGRESS
**Objetivo o significado contextual:** No usar seguidores como indicador principal de éxito.
**Texto original extraído:** follower count as primary success metric;
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-03; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-03-003 — IN_PROGRESS
**Objetivo o significado contextual:** Evitar que texto de terceros reescriba la definición institucional canónica.
**Texto original extraído:** external platform text silently becoming the canonical definition.
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-03; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-03-004 — IN_PROGRESS
**Objetivo o significado contextual:** Asegurar que ninguna ruta u objeto privado aparezca públicamente.
**Texto original extraído:** no private route/object appears;
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-03; update #762 with immutable evidence and RETURN state.
**Recibo:** `INVALID` — RECEIPT_SCOPE_INVALIDATED_BY_CHANGE:.github/workflows/mem002-postgres.yml,.github/workflows/mihm-contract-validation.yml,.github/workflows/mihm-exp001-feasibility.yml,.github/workflows/mihm-exp001-g2b.yml,.github/workflows/mihm-exp001-g2c.yml,.github/workflows/mihm-exp001-g3.yml,.github/workflows/mihm-exp001-g3b.yml,.github/workflows/mihmt-timeline-clocks-review.yml,.github/workflows/reality-chain-provenance.yml,.github/workflows/sfi-authenticated-governed-machine-r4c.yml,.github/workflows/sfi-cl-verify.yml,.github/workflows/sfi-continuity-hourly.yml,.github/workflows/sfi-continuity-ledger-read.yml,.github/workflows/sfi-dual-plane-weekly-audit.yml,.github/workflows/sfi-external-oauth.yml,.github/workflows/sfi-main-only-convergence.yml,.github/workflows/sfi-operating-cycle-closure.yml,.github/workflows/sfi-production-observatory-smoke.yml,.github/workflows/sfi-program-completion.yml,.github/workflows/sfi-prune-integrated-branches.yml,.github/workflows/sfi-self-development.yml,.github/workflows/sfi-vercel-prebuilt-production.yml,.github/workflows/sfi-verify.yml,.github/workflows/worldspect-cron.yml,docs/program/SFI-ELITE-EXPERIENCE-2026-09-26.md,docs/program/workstreams/WS-04-AUTHENTICATED-GOVERNED-MACHINE-R4C.md,package-lock.json,package.json,packages/graph/src/index.ts,packages/mihm-core/src/index.ts,packages/mihm-core/src/integrated.test.ts,public/ai-index.json,public/assets/documentos/exoplanet_observatory_golden_horizons.png,public/assets/sfi/README.md,public/assets/sfi/documents/sfi_field_document_alien_world_atlas.png,public/assets/sfi/documents/sfi_internal_memorandum_cosmic_observatory.png,public/assets/sfi/institutional/celestial_council_overlooking_a_golden_world.png,public/assets/sfi/institutional/celestial_observatory_temple.png,public/assets/sfi/institutional/celestial_observatory_temple_interior.png,public/assets/sfi/institutional/consejo_global_ante_la_mesa_luminosa.png,public/assets/sfi/institutional/consejo_global_en_mesa_dorada.png,public/assets/sfi/institutional/council.png,public/assets/sfi/institutional/futuristic_golden_archive_pedestal.png,public/assets/sfi/institutional/institution-frame.png,public/assets/sfi/institutional/observatory-frame.png,public/assets/sfi/instruments/08102026_0.png,public/assets/sfi/instruments/08102026_01.png,public/assets/sfi/instruments/08102026_02.png,public/assets/sfi/instruments/08102026_03.png,public/assets/sfi/instruments/08102026_04.png,public/assets/sfi/instruments/08102026_05.png,public/assets/sfi/instruments/08102026_06.png,public/assets/sfi/instruments/08102026_07.png,public/assets/sfi/instruments/08102026_09.png,public/assets/sfi/instruments/08102026_10.png,public/assets/sfi/instruments/08102026_11.png,public/assets/sfi/instruments/08102026_12.png,public/assets/sfi/instruments/Horizonte futurista bajo lunas gemelas.png,public/assets/sfi/instruments/Horizonte futurista bajo lunas gigantes.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 10_21_57-5.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_18-1.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_22-2.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_26-3.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_34-5.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_38-6.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_42-7.png,public/assets/sfi/instruments/OBSERVATORY_.png,public/assets/sfi/instruments/OBSERVATORY_00.png,public/assets/sfi/instruments/OBSERVATORY_BACKGROUND.png,public/assets/sfi/instruments/OBSERVATORY_DASHBOARD.png,public/assets/sfi/instruments/OBSERVATORY_MAPS.png,public/assets/sfi/instruments/OBSERVATORY_MONITOR.png,public/assets/sfi/instruments/OBSERVATORY_MOONS.png,public/assets/sfi/instruments/OBSERVATORY_PROJECTOR.png,public/assets/sfi/instruments/RealityChain.png,public/assets/sfi/instruments/SFI_HOME_PANORAMA.png,public/assets/sfi/instruments/SFI_RCH_01.png,public/assets/sfi/instruments/SFI_RCH_02.png,public/assets/sfi/instruments/SFI_RCH_03.png,public/assets/sfi/instruments/SFI_RCH_04.png,public/assets/sfi/instruments/SFI_RCH_05.png,public/assets/sfi/instruments/SFI_RCH_06.png,public/assets/sfi/instruments/SFI_RCH_07.png,public/assets/sfi/instruments/SFI_RCH_08.png,public/assets/sfi/instruments/Umbral futurista entre Tierra y amanecer.png,public/assets/sfi/maps/mapa_de_red_global_dorada.png,public/assets/sfi/maps/planeta_tierra.png,public/assets/sfi/overlays/4f9335f4-4236-4b03-82f0-f5a441bd0297.png,public/assets/sfi/overlays/amanecer_dorado_celestial_transparente.png,public/assets/sfi/overlays/c541cc06-586e-43f2-9b38-1733847353c3.png,public/assets/sfi/overlays/cbe47d49-2d09-4dc8-93bd-8d22fd355fbb.png,public/assets/sfi/overlays/cerebro_dorado_de_red_neuronal.png,public/assets/sfi/overlays/domo sobre el planeta.png,public/assets/sfi/overlays/domo_de_red_global_dorado.png,public/assets/sfi/overlays/light.png,public/assets/sfi/overlays/margen_inicial.png,public/assets/sfi/overlays/network-overlay.png,public/assets/sfi/overlays/orbit-overlay.png,public/assets/sfi/overlays/red_dorado_red_de_inteligencia_planetaria.png,public/assets/sfi/overlays/red_global_de_conexiones_luminosas.png,public/assets/sfi/overlays/red_neuronal_dorada_luminosa.png,public/assets/sfi/overlays/shinny_effect.png,public/assets/sfi/people/analista_profesional_con_tablet_y_luz_dorada.png,public/assets/sfi/people/figura_urbana_con_luz_dorada.png,public/assets/sfi/people/golden_rim_lit_outdoor_observer.png,public/assets/sfi/people/hombre_elegante_con_contraluz_dorado.png,public/assets/sfi/people/observador_con_mochila_a_contraluz_dorada.png,public/assets/sfi/people/observer.png,public/assets/sfi/people/people.png,public/assets/sfi/scenes/04_05_background.png,public/assets/sfi/scenes/04_observer.png,public/assets/sfi/scenes/05_board.png,public/assets/sfi/scenes/05_platform.png,public/assets/sfi/scenes/06_archive_background.png,public/assets/sfi/scenes/06_archive_board.png,public/assets/sfi/scenes/07_return_background.png,public/assets/sfi/scenes/07_return_monument.png,public/assets/sfi/scenes/07_return_network.png,public/assets/sfi/scenes/07_return_people.png,public/assets/sfi/scenes/explorador_de_casos_futuros_emergentes.png,public/assets/sfi/scenes/futuristic_golden_portal_temple.png,public/assets/sfi/scenes/golden_cosmic_gate_in_a_marble_temple.png,public/assets/sfi/scenes/golden_observatory_over_a_glowing_planet.png,public/assets/sfi/scenes/observatorio_dorado_sobre_el_planeta.png,public/assets/sfi/scenes/observatorio_dorado_sobre_la_tierra.png,public/assets/sfi/scenes/sala_inicial.png,public/assets/sfi/system/reference/02_03.png,public/assets/sfi/system/reference/02_03_overlay_constellation.png,public/assets/sfi/system/reference/02_03_overlay_network.png,public/assets/sfi/system/reference/02_03_world_background.png,public/assets/sfi/system/reference/04_overlay_orbits.png,public/assets/sfi/system/reference/04_scene.png,public/assets/sfi/system/reference/05_background_earth.png,public/assets/sfi/system/reference/05_element_books.png,public/assets/sfi/system/reference/05_element_bust.png,public/assets/sfi/system/reference/05_element_platform.png,public/assets/sfi/system/reference/05_element_podium.png,public/assets/sfi/system/reference/05_element_portal.png,public/assets/sfi/system/reference/05_overlay_network.png,public/assets/sfi/system/reference/05_scene.png,public/assets/sfi/system/reference/06_elements_archive.png,public/assets/sfi/system/reference/06_scene.png,public/assets/sfi/system/reference/9461ca8f-ddc5-41fb-9103-39f579c1dd24.png,public/assets/sfi/system/reference/SFI_Un_Mundo_en_Movimiento.png,public/assets/sfi/system/reference/a_cinematic_ultra_detailed_high_resolution_sci_f.png,public/assets/sfi/system/reference/a_cinematic_ultra_detailed_high_tech_control_ana.png,public/assets/sfi/system/reference/a_wide_cinematic_collage_of_8_sci_fi_ui_poster_pa.png,public/assets/sfi/system/reference/a_wide_cinematic_futuristic_sci_fi_ui_website_he.png,public/assets/sfi/system/reference/a_wide_cinematic_futuristic_ui_header_banner_sce.png,public/assets/sfi/system/reference/a_wide_cinematic_futuristic_ui_header_infographic.png,public/assets/sfi/system/reference/a_wide_cinematic_futuristic_ui_header_website_inte.png,public/assets/sfi/system/reference/a_wide_cinematic_grid_of_10_golden_sci_fi_ui_conc.png,public/assets/sfi/system/reference/a_wide_cinematic_ui_website_header_landing_interf.png,public/assets/sfi/system/reference/a_wide_cinematic_ultra_detailed_sci_fi_ui_websit.png,public/assets/sfi/system/reference/a_wide_grid_like_composite_image_in_a_cinematic_sc.png,public/assets/sfi/system/reference/a_wide_high_detail_collage_of_10_sci_fi_futuristi.png,public/assets/sfi/system/reference/a_wide_rectangular_contact_sheet_style_collage_wit.png,public/assets/sfi/system/reference/futuristic_golden_evidence_command_center.png,public/assets/sfi/system/reference/golden_holographic_observatory_console.png,public/assets/sfi/system/reference/golden_rimmed_professional_analyst_cutout.png,public/assets/sfi/system/reference/qa/montage_0055.jpg,public/assets/sfi/system/reference/qa/sfi_asset_audit_montage.jpg,public/assets/sfi/ui/cinematic_gold_sci_fi_hud_frame.png,public/assets/sfi/ui/dossier_futurista_en_negro_y_oro.png,public/assets/sfi/ui/glowing_golden_celestial_compass_sigil.png,public/assets/sfi/ui/golden_celestial_astrolabe_hud.png,public/assets/sfi/ui/golden_celestial_timeline_sigil.png,public/assets/sfi/ui/icons/00_sfi_canonical_mark.png,public/assets/sfi/ui/icons/01_observation_reticle.png,public/assets/sfi/ui/icons/02_evidence_archive.png,public/assets/sfi/ui/icons/03_inference_graph.png,public/assets/sfi/ui/icons/04_authority_axis.png,public/assets/sfi/ui/icons/05_execution_node.png,public/assets/sfi/ui/icons/06_return_loop.png,public/assets/sfi/ui/icons/07_world_vector.png,public/assets/sfi/ui/icons/08_signal_pulse.png,public/assets/sfi/ui/icons/09_field_portal.png,public/assets/sfi/ui/interfaz_hud_dorada_de_lente_futurista.png,public/assets/sfi/ui/interfaz_hud_dorada_del_observatorio.png,public/assets/sfi/ui/luminous_gold_celestial_timeline_spine.png,public/assets/sfi/ui/marco_hud_dorado_futurista_de_doble_panel.png,public/assets/sfi/ui/red_de_inferencia_futurista_hud.png,public/assets/sfi/ui/sfi-institute-node-mark.svg,public/assets/sfi/world/amanecer_sobre_la_tierra_iluminada.png,public/assets/sfi/world/amanecer_sobre_un_mundo_futurista.png,public/assets/sfi/world/futuristic_earthrise_over_a_glowing_megacity.png,public/assets/sfi/world/golden_metropolis_among_the_stars.png,public/assets/sfi/world/image-gen-2(20260923-171806).png,public/assets/sfi/world/image-gen-3(20260923-171808).png,public/assets/sfi/world/image-gen-4(20260923-181311).png,public/assets/sfi/world/moonlit_fjord_cityscape.png,public/assets/sfi/world/mountains.png,public/assets/sfi/world/orbiting_dawn_over_a_glowing_world.png,public/assets/sfi/world/world-clean.png,public/assets/sfi/world/world-network.png,public/field/world-observatory/index.html,public/icon.svg,public/images/editorial/discovery-mesh-observation.svg,public/images/editorial/reality-chain/reality-chain-benchmark-v0.svg,public/images/editorial/reality-chain/reality-chain-cover.svg,public/images/editorial/reality-chain/reality-chain-epistemic-overproduction.svg,public/images/editorial/reality-chain/reality-chain-six-integrities.svg,public/images/editorial/reality-chain/reality-chain-transparency-paradox.svg,public/images/editorial/reality-chain/reality-chain-world-to-claim.svg,public/images/editorial/years-that-did-exist/cover.svg,public/library/assets/sfi-mark.svg,public/llms-full.txt,public/llms.txt,public/og/sfi-institutional.jpg,public/openapi.json,public/sfi/brand/sfi-institutional-seal.png,public/sfi/nyc/background.avif,public/sfi/nyc/clouds.avif,public/sfi/nyc/earth.avif,public/sfi/nyc/golden-circle.avif,public/sfi/nyc/lights.avif,public/sfi/nyc/lines.avif,public/sfi/nyc/moon.avif,public/sfi/nyc/runtime/background.avif,public/sfi/nyc/runtime/clouds.avif,public/sfi/nyc/runtime/earth.avif,public/sfi/nyc/runtime/golden-circle.avif,public/sfi/nyc/runtime/lines.avif,public/sfi/nyc/runtime/moon.avif,public/sfi/nyc/runtime/structure.avif,public/sfi/nyc/structure.avif,scripts/ai/sfi-chatgpt-plus-observe.sql,scripts/cognitive-olympics/case-lab/README.md,scripts/cognitive-olympics/case-lab/aiweeknyc.case.json,scripts/cognitive-olympics/case-lab/execute-review-once.mjs,scripts/cognitive-olympics/case-lab/execute-review-once.test.mjs,scripts/cognitive-olympics/case-lab/review-preview.mjs,scripts/cognitive-olympics/case-lab/review-preview.test.mjs,scripts/cognitive-olympics/case-lab/run.mjs,scripts/cognitive-olympics/case-lab/run.test.mjs,scripts/cognitive-spine/qa-cognitive-spine-integrated.ts,scripts/cognitive-spine/qa-library-impact-context.ts,scripts/cognitive-spine/qa-root-cognitive-spine-observability.ts,scripts/data-continuity-audit.mjs,scripts/db/export-sfi-full-cycle-proof.mjs,scripts/db/mem003-authority-semantic-supersession.sql,scripts/db/mem003-continuity-journal-scope.sql,scripts/db/mem003-reconciliation-readonly.sql,scripts/db/neon-data-plane-baseline-reconcile.sql,scripts/db/neon-data-plane-governor.sql,scripts/db/neon-primary-mirror-receiver.sql,scripts/db/verify-sfi-database.mjs,scripts/fixtures/sfi-continuity-wakeup-native-40593423373.json,scripts/fixtures/sfi-world-observatory-hypothesis-retry-20261027.json,scripts/insert_snapshot.js,scripts/lib/programCompletionDiagnostics.mjs,scripts/qa-main-only-branch-convergence.mjs,scripts/qa-sfi-access-upgrade.ts,scripts/qa-sfi-account-invitation.ts,scripts/qa-sfi-actionable-human-inbox.ts,scripts/qa-sfi-agent-execution-contract.ts,scripts/qa-sfi-ai-governance.ts,scripts/qa-sfi-authenticated-governed-machine-r4c.ts,scripts/qa-sfi-authenticated-navigation.ts,scripts/qa-sfi-bilingual-interface.ts,scripts/qa-sfi-c07-root-activation.mjs,scripts/qa-sfi-case-gpt-bridge.ts,scripts/qa-sfi-case-intake-action-binding.ts,scripts/qa-sfi-chatgpt-studio-attachment.ts,scripts/qa-sfi-cognitive-automation-workspaces.ts,scripts/qa-sfi-cognitive-field-admission.ts,scripts/qa-sfi-cognitive-twin-reentry-base.ts,scripts/qa-sfi-contextual-return.ts,scripts/qa-sfi-cost-meter.mjs,scripts/qa-sfi-ct-institutional-integration.ts,scripts/qa-sfi-cycle-audit-readonly.ts,scripts/qa-sfi-data-plane-identity.ts,scripts/qa-sfi-data-plane-scheduled-recovery.mjs,scripts/qa-sfi-decision-transfer-blind.ts,scripts/qa-sfi-decision-transfer-operational.ts,scripts/qa-sfi-discovery-exposure.ts,scripts/qa-sfi-discovery-integrity.ts,scripts/qa-sfi-discovery-operational.ts,scripts/qa-sfi-evidence-candidates.ts,scripts/qa-sfi-external-cognitive-peer.ts,scripts/qa-sfi-external-oauth.ts,scripts/qa-sfi-field-scientific-reading.ts,scripts/qa-sfi-final-runtime-wiring.ts,scripts/qa-sfi-genai-telemetry.ts,scripts/qa-sfi-governed-execution-router.ts,scripts/qa-sfi-institutional-evolution.ts,scripts/qa-sfi-institutional-visual-convergence.ts,scripts/qa-sfi-jr-field-cycle.ts,scripts/qa-sfi-learning-bootstrap.ts,scripts/qa-sfi-live-proof.mjs,scripts/qa-sfi-mem002-postgres.ts,scripts/qa-sfi-mem002-single-writer.ts,scripts/qa-sfi-method-lab-convergence.ts,scripts/qa-sfi-method-lab-ui-r4b.ts,scripts/qa-sfi-method-selection.ts,scripts/qa-sfi-mihm-foundation-missingness.ts,scripts/qa-sfi-mihm-operational-readback-contract.ts,scripts/qa-sfi-mihm-shadow-observer.test.ts,scripts/qa-sfi-mihmt-timeline.ts,scripts/qa-sfi-model-owner-context.ts,scripts/qa-sfi-mutation-evidence.ts,scripts/qa-sfi-neon-continuity-heartbeat.ts,scripts/qa-sfi-neon-readplane-deferred-lanes.mjs,scripts/qa-sfi-oauth-integrations.ts,scripts/qa-sfi-operating-field-closure.ts,scripts/qa-sfi-operational-next.ts,scripts/qa-sfi-operational-reset.ts,scripts/qa-sfi-post-deploy-assurance-coordination.mjs,scripts/qa-sfi-prediction-verification-atomic.test.ts,scripts/qa-sfi-production-observatory-smoke.mjs,scripts/qa-sfi-program-certification-batch.mjs,scripts/qa-sfi-program-completion-diagnostics.mjs,scripts/qa-sfi-program-completion-receipts.mjs,scripts/qa-sfi-public-mcp-readonly.ts,scripts/qa-sfi-public-research-landing.ts,scripts/qa-sfi-public-services.mjs,scripts/qa-sfi-public-visual-contract.ts,scripts/qa-sfi-publications-hub.ts,scripts/qa-sfi-readplane-efficiency.ts,scripts/qa-sfi-reality-chain-intake.ts,scripts/qa-sfi-reality-chain-three-screen.ts,scripts/qa-sfi-root-acp-total-convergence.ts,scripts/qa-sfi-root-final-visual.mjs,scripts/qa-sfi-root-graph-navigation.ts,scripts/qa-sfi-root-missions-passport-navigation.mjs,scripts/qa-sfi-root-public-field.ts,scripts/qa-sfi-root-reports-runtime.ts,scripts/qa-sfi-runtime-readplane-stability.ts,scripts/qa-sfi-session-controls.ts,scripts/qa-sfi-sovereign-only-human-gates.ts,scripts/qa-sfi-spatial-surfaces.ts,scripts/qa-sfi-studio-campaign.ts,scripts/qa-sfi-studio-cognitive.ts,scripts/qa-sfi-studio-hygiene.ts,scripts/qa-sfi-supabase-egress-containment.ts,scripts/qa-sfi-temporal-surfaces.ts,scripts/qa-sfi-total-proof.ts,scripts/qa-sfi-universal-full-cycle.ts,scripts/qa-sfi-vercel-cost-gate.mjs,scripts/qa-sfi-web-source-extraction.ts,scripts/qa-sfi-world-hypothesis-generation.ts,scripts/qa-sfi-worldspect-neon-readplane.mjs,scripts/qa-sfi-worldspect-timeline-read.mjs,scripts/qa-sfi-ws01-ownership-boundary.ts,scripts/qa-sfi-ws02-universal-twin-lineage.ts,scripts/qa-world-vector-pulse.mjs,scripts/reality_chain/c07_governed_mission_queue_candidate.sql,scripts/reality_chain/github_provenance.py,scripts/reality_chain/test_github_provenance.py,scripts/research/knight-retrolongitudinal.mjs,scripts/research/knight-retrolongitudinal.test.mjs,scripts/research/knight-triple-case.mjs,scripts/research/knight-triple-case.test.mjs,scripts/research/mihm-311-channel-sensitivity.mjs,scripts/research/mihm-311-christmas-category-control.mjs,scripts/research/mihm-311-dec2025-snow-transfer.mjs,scripts/research/mihm-311-heat-closure-outcome.mjs,scripts/research/mihm-311-heat-sameday-outcome.mjs,scripts/research/mihm-311-snow-composition.mjs,scripts/research/mihm-dot-fixed-link-probe.mjs,scripts/research/mihm-exp001-g2c-cohort.mjs,scripts/research/mihm-exp001-g2c-cohort.test.mjs,scripts/research/mihm-exp001-g3-check-audit.mjs,scripts/research/mihm-exp001-g3-check-audit.test.mjs,scripts/research/mihm-exp001-g3b-p12.mjs,scripts/research/mihm-exp001-g3b-p12.test.mjs,scripts/research/mihm-exp001-sfi-feasibility.mjs,scripts/research/mihm-exp001-timezero.mjs,scripts/research/mihm-exp001-timezero.test.mjs,scripts/research/mihm-fdny-capacity-contrast.mjs,scripts/research/mihm-foundation-calibration-t0.ts,scripts/research/mihm-foundation-p1-metrology.ts,scripts/research/mihm-foundation-p2-lagged-dynamics.ts,scripts/research/mihm-foundation-p3-viability-recovery.ts,scripts/research/mihm-foundation-p4-readiness.ts,scripts/research/mihm-manhattan-365d-contrast.mjs,scripts/research/mihm-manhattan-365d-source.mjs,scripts/research/mihm-manhattan-berserker-contrast.mjs,scripts/research/mihm-manhattan-calibration-gate.mjs,scripts/research/mihm-manhattan-e1-e2-e4-contrast.mjs,scripts/research/mihm-manhattan-feb-blizzard-case.mjs,scripts/research/mihm-manhattan-four-source-week.mjs,scripts/research/mihm-manhattan-march-panel.mjs,scripts/research/mihm-manhattan-multiplex-calibration.mjs,scripts/research/mihm-manhattan-multiplex-preflight.mjs,scripts/research/mihm-manhattan-nws-event-contrast.mjs,scripts/research/mihm-manhattan-p5-scientific-closure.mjs,scripts/research/mihm-manhattan-source-coverage.mjs,scripts/research/mihm-mta-cbd-traffic-probe.mjs,scripts/research/mihm-nws-baseline-sensitivity.mjs,scripts/research/mihm-nyc311-exploratory.mjs,scripts/research/mihm-nyc311-fdny-contrast.mjs,scripts/research/mihmt-knight-official.mjs,scripts/research/mihmt-knight-official.test.mjs,scripts/research/qa-mihm-manhattan-evidence-reconciliation.mjs,scripts/run-sfi-operating-cycle-closure.ts,scripts/sfi-program-certification-batch.mjs,scripts/sfi-program-completion-reconcile.mjs,scripts/sfi-program-completion.mjs,scripts/sfi-program-dispatch.mjs,scripts/sfi-self-development.mjs,scripts/system-consolidation-audit.py,src/app/.well-known/oauth-authorization-server/route.ts,src/app/.well-known/oauth-protected-resource/api/mcp/authenticated/route.ts,src/app/.well-known/oauth-protected-resource/api/mcp/studio/route.ts,src/app/.well-known/oauth-protected-resource/route.ts,src/app/RealityChain/page.tsx,src/app/[scene]/page.tsx,src/app/accessibility/page.tsx,src/app/account/security/page.tsx,src/app/ai-index.json/route.ts,src/app/api/account/invitation-session/route.ts,src/app/api/amv/field-response/route.ts,src/app/api/bitacora/regenerate/route.ts,src/app/api/calendar/phenomenological/route.ts,src/app/api/cases/[caseId]/linked-cases/route.ts,src/app/api/cases/[caseId]/reports/route.ts,src/app/api/cases/[caseId]/route.ts,src/app/api/cron/continuity-heartbeat/route.ts,src/app/api/cron/continuity-report/route.ts,src/app/api/cron/data-plane-reconcile/route.ts,src/app/api/cron/world-observatory/route.ts,src/app/api/cron/worldspect/route.ts,src/app/api/external/v1/bootstrap/route.ts,src/app/api/external/v1/cases/intake/route.ts,src/app/api/external/v1/cases/route.ts,src/app/api/external/v1/cognitive-peer/route.ts,src/app/api/external/v1/governance/proposals/[id]/decision/route.ts,src/app/api/external/v1/jr/route.ts,src/app/api/external/v1/lab/route.ts,src/app/api/external/v1/manifest/route.ts,src/app/api/external/v1/root/operate/route.ts,src/app/api/external/v1/signal/route.ts,src/app/api/external/v1/world/route.ts,src/app/api/field/events/route.ts,src/app/api/field/map/world/reobserve/route.ts,src/app/api/field/map/world/route.ts,src/app/api/field/persist/route.ts,src/app/api/field/state/route.ts,src/app/api/global-metrics/route.ts,src/app/api/ingest/read/route.ts,src/app/api/ingest/real/route.ts,src/app/api/interface/cognitive-workspace/route.ts,src/app/api/internal/closure-once/route.ts,src/app/api/internal/continuity-closure-once/route.ts,src/app/api/liturgia/amv/route.ts,src/app/api/mcp/authenticated/route.ts,src/app/api/mcp/authentication/route.ts,src/app/api/mcp/studio/route.ts,src/app/api/media/drafts/route.ts,src/app/api/mihm/state/route.ts,src/app/api/mutations/propose/route.ts,src/app/api/node/bootstrap/route.ts,src/app/api/oauth/authorize/route.ts,src/app/api/oauth/register/route.ts,src/app/api/oauth/token/route.ts,src/app/api/observatory/state/route.ts,src/app/api/observatory/world/route.ts,src/app/api/public/contact/route.ts,src/app/api/public/newsletter/route.ts,src/app/api/reality-chain/extract/route.ts,src/app/api/root/cognitive-runtime/route.ts,src/app/api/root/cognitive-twin/route.ts,src/app/api/root/continuity/route.ts,src/app/api/root/cost-meter/route.ts,src/app/api/root/decisions/route.ts,src/app/api/root/evidence/inventory/route.ts,src/app/api/root/evidence/route.ts,src/app/api/root/friccionauta/route.ts,src/app/api/root/method-lab/research/route.ts,src/app/api/root/method-lab/simulate/route.ts,src/app/api/root/mutations/[id]/close/route.ts,src/app/api/root/state/route.ts,src/app/api/root/workboard/route.ts,src/app/api/runtime/bootstrap/route.ts,src/app/api/scorefriction/assets/[asset_id]/measurements/route.ts,src/app/api/scorefriction/assets/route.ts,src/app/api/scorefriction/audio/analyze/route.ts,src/app/api/scorefriction/lab/analyze/route.ts,src/app/api/scorefriction/python/analyze/route.ts,src/app/api/scorefriction/regime-watch/route.ts,src/app/api/sfi/cycle/[logbookId]/route.ts,src/app/api/sfi/events/route.ts,src/app/api/sfi/mihm-audit/route.ts,src/app/api/sfi/operational-snapshot/route.ts,src/app/api/signals/read/route.ts,src/app/api/signals/route.ts,src/app/api/social/resonance/route.ts,src/app/api/system/data-plane/jwks/route.ts,src/app/api/worldspect/health/route.ts,src/app/api/worldspect/real/route.ts,src/app/api/worldspect/trend/route.ts,src/app/auth-unavailable/page.tsx,src/app/auth/callback/page.tsx,src/app/contact/page.tsx,src/app/continuity-access/page.tsx,src/app/entry/page.tsx,src/app/field-schema.json/route.ts,src/app/forgot/page.tsx,src/app/globals.css,src/app/history/mutations/page.tsx,src/app/history/page.tsx,src/app/institution/institution.css,src/app/institution/page.tsx,src/app/instruments/[surface]/page.tsx,src/app/juan/contact.vcf/route.ts,src/app/juan/page.module.css,src/app/juan/page.tsx,src/app/laboratory/laboratory.css,src/app/laboratory/page.tsx,src/app/layout.tsx,src/app/library/LibraryClient.tsx,src/app/library/library.css,src/app/library/page.tsx,src/app/llms-full.txt/route.ts,src/app/llms.txt/route.ts,src/app/manifest.ts,src/app/member/page.tsx,src/app/method-lab/page.tsx,src/app/observatory/page.tsx,src/app/privacy/page.tsx,src/app/publications/[slug]/page.tsx,src/app/publications/discovery-mesh-publicar-no-es-ser-encontrado/discovery-note.css,src/app/publications/discovery-mesh-publicar-no-es-ser-encontrado/page.tsx,src/app/publications/page.tsx,src/app/publications/publications.css,src/app/reality-chain/page.tsx,src/app/repository/RepositoryConsole.tsx,src/app/repository/RepositoryMihmTimeline.tsx,src/app/repository/page.tsx,src/app/repository/repository.css,src/app/root/access/page.tsx,src/app/root/access/root-access.css,src/app/root/discovery/page.tsx,src/app/scrollbar.css,src/app/services/page.tsx,src/app/servicios/[slug]/page.tsx,src/app/servicios/case-study/ai-week-nyc-2026/page.tsx,src/app/servicios/page.tsx,src/app/servicios/services.css,src/app/servicios/solicitar/page.tsx,src/app/signup/page.tsx,src/app/sitemap.ts,src/app/studio/page.tsx,src/app/terms/page.tsx,src/app/timeline/page.tsx,src/app/twin/learning/page.tsx,src/app/unauthorized/page.tsx,src/app/verify/page.tsx,src/app/world-vector/page.tsx,src/components/analytics/SfiConsentBanner.tsx,src/components/auth/AuthProvider.tsx,src/components/i18n/SfiLanguageProvider.tsx,src/components/observatory/gold/visual/observatoryGoldTypes.ts,src/components/public/PublicContactForm.tsx,src/components/public/PublicNewsletterForm.tsx,src/components/public/SfiPublicChrome.css,src/components/public/SfiPublicChrome.tsx,src/components/research/PublicResearchLandingView.tsx,src/components/sfi/AiWeekManualWalkthrough.tsx,src/components/sfi/AlternativeSignIn.css,src/components/sfi/AlternativeSignIn.tsx,src/components/sfi/AuthCallbackSurface.tsx,src/components/sfi/AuthenticatedSfiMenu.css,src/components/sfi/AuthenticatedSfiMenu.tsx,src/components/sfi/CanonicalCognitiveFieldPublic.css,src/components/sfi/CanonicalCognitiveFieldPublic.tsx,src/components/sfi/HypothesisClosureDiff.module.css,src/components/sfi/HypothesisClosureDiff.tsx,src/components/sfi/HypothesisConditionalLab.css,src/components/sfi/HypothesisConditionalLab.tsx,src/components/sfi/InstitutionalEvidenceInventory.css,src/components/sfi/InstitutionalEvidenceInventory.tsx,src/components/sfi/InstitutionalSurfaceRail.css,src/components/sfi/InstitutionalSurfaceRail.tsx,src/components/sfi/LoginSurface.tsx,src/components/sfi/MethodLabEnvironment.tsx,src/components/sfi/MethodLabExperimentWorkbench.tsx,src/components/sfi/MethodLabInstrumentRoom.module.css,src/components/sfi/MethodLabInstrumentRoom.tsx,src/components/sfi/MethodLabNativeHub.css,src/components/sfi/MethodLabNativeHub.tsx,src/components/sfi/MethodLabPanorama.css,src/components/sfi/MethodLabPanorama.tsx,src/components/sfi/MethodLabResearchReview.tsx,src/components/sfi/MethodLabUnifiedSurface.css,src/components/sfi/MethodLabUnifiedSurface.tsx,src/components/sfi/NewCaseIngress.tsx,src/components/sfi/OAuthIntegrationsSurface.tsx,src/components/sfi/ObservatoryConsole.css,src/components/sfi/ObservatoryConsole.tsx,src/components/sfi/ObservatoryGlobe.tsx,src/components/sfi/ObservatoryProvenanceFeed.tsx,src/components/sfi/ObservatorySemanticGpuLayer.tsx,src/components/sfi/ObservatoryWorldField.tsx,src/components/sfi/ObservatoryWorldLayer.css,src/components/sfi/OperationalTimeline.css,src/components/sfi/OperationalTimeline.tsx,src/components/sfi/PasskeyEnrollment.tsx,src/components/sfi/PasswordResetSurface.tsx,src/components/sfi/PersonalCognitiveLabWorkspace.tsx,src/components/sfi/PublicEntryGateway.css,src/components/sfi/PublicEntryGateway.tsx,src/components/sfi/PublicInstrumentSurface.css,src/components/sfi/PublicInstrumentSurface.tsx,src/components/sfi/PublicSurfaceContinuity.css,src/components/sfi/PublicSurfaceContinuity.tsx,src/components/sfi/RealityChainAuditPanel.tsx,src/components/sfi/RealityChainCaseInspector.tsx,src/components/sfi/RealityChainWorkbench.css,src/components/sfi/RealityChainWorkbench.tsx,src/components/sfi/RootCognitiveFieldPixi.tsx,src/components/sfi/RootEvidenceCandidateLane.tsx,src/components/sfi/RootEvidenceReviewConsole.css,src/components/sfi/RootEvidenceReviewConsole.tsx,src/components/sfi/RootNeuralGraphView.css,src/components/sfi/RootNeuralGraphView.tsx,src/components/sfi/RootOperationalWorkboard.tsx,src/components/sfi/ServiceInquiryForm.tsx,src/components/sfi/SessionControls.tsx,src/components/sfi/SfiConsole.tsx,src/components/sfi/SfiFriccionautaPanel.css,src/components/sfi/SfiFriccionautaPanel.tsx,src/components/sfi/SfiGovernanceWorkspace.tsx,src/components/sfi/SfiNeuralNavigation.css,src/components/sfi/SfiNeuralNavigation.tsx,src/components/sfi/SfiOperatingWorkspace.tsx,src/components/sfi/SfiRootWorkspace.tsx,src/components/sfi/SfiUnifiedSurfaces.css,src/components/sfi/VerifyEmailSurface.tsx,src/components/sfi/publicSceneManifest.ts,src/components/sfi/scenes.ts,src/core/agents/agents.ts,src/core/case-platform/closurePolicy.test.ts,src/core/case-platform/closurePolicy.ts,src/core/case-platform/reportAssembler.test.ts,src/core/case-platform/reportAssembler.ts,src/core/cognitive-twin/canonicalMemoryView.ts,src/core/cognitive-twin/readState.ts,src/core/cognitive-twin/reentry/journal.ts,src/core/contracts/report.ts,src/core/memory/epistemicEventWriter.ts,src/core/memory/institutionalEventPipeline.ts,src/experimental/store/project-manager.ts,src/infrastructure/ai/agentLlmClient.ts,src/lib/actions/generate-protocol.ts,src/lib/agents/amvAgent.ts,src/lib/agents/publicResearch.ts,src/lib/agents/sfiAgents.ts,src/lib/ai/providerRouter.operationBroker.test.ts,src/lib/ai/providerRouter.ts,src/lib/analytics/client.ts,src/lib/auth/actions.ts,src/lib/auth/institutionalAccountAdministration.ts,src/lib/auth/institutionalInvitation.ts,src/lib/auth/institutionalInvitationDelivery.ts,src/lib/auth/neonPasswordBootstrap.ts,src/lib/cognitive-lab/service.ts,src/lib/commercial/commercialService.ts,src/lib/continuity/actionableWorkGate.ts,src/lib/continuity/continuityDataPlanePolicy.test.ts,src/lib/continuity/continuityDataPlanePolicy.ts,src/lib/continuity/contracts.test.ts,src/lib/continuity/contracts.ts,src/lib/continuity/neonHeartbeatStore.ts,src/lib/continuity/operationalAutoAdvance.ts,src/lib/continuity/runtime.test.ts,src/lib/continuity/runtime.ts,src/lib/continuity/scheduledEgressGuard.ts,src/lib/continuity/shadowObserver.ts,src/lib/continuity/studioAutonomy.ts,src/lib/continuity/universalLifecycleGate.test.ts,src/lib/continuity/universalLifecycleGate.ts,src/lib/db/events.ts,src/lib/discovery/canonicalObjectRegistry.ts,src/lib/discovery/crawlerPolicy.ts,src/lib/discovery/discoveryAutonomy.ts,src/lib/discovery/discoveryMesh.ts,src/lib/discovery/discoveryRepository.ts,src/lib/evaluator/derivedMihmRuntime.ts,src/lib/evaluator/scoreFrictionVectorDerivation.test.ts,src/lib/evaluator/scoreFrictionVectorDerivation.ts,src/lib/events/atomicAppend.ts,src/lib/events/eventStore.ts,src/lib/evidence/institutionalInventoryProjection.test.ts,src/lib/evidence/institutionalInventoryProjection.ts,src/lib/evidence/readInstitutionalEvidenceInventory.ts,src/lib/execution/governedExecutionClassification.ts,src/lib/execution/governedExecutionRouter.ts,src/lib/field/contextualReturnContract.ts,src/lib/governance/governanceRuntime.ts,src/lib/governance/readGovernanceHealth.ts,src/lib/governance/thoughtInhibition.ts,src/lib/graph/canonicalGraph.ts,src/lib/graph/cognitiveGraphAdmission.ts,src/lib/graph/knowledgeTimeContrast.test.ts,src/lib/graph/knowledgeTimeContrast.ts,src/lib/graph/libraryCorpusProjection.ts,src/lib/graph/operationalCognitiveProjection.ts,src/lib/graph/realityChainProjection.test.ts,src/lib/graph/realityChainProjection.ts,src/lib/institution/cognitiveActivityDiagnosis.test.ts,src/lib/institution/cognitiveActivityDiagnosis.ts,src/lib/institution/cognitiveSpineAdditionalSources.ts,src/lib/institution/ensureInstitutionalAttractor.ts,src/lib/institution/institutionalAttractor.ts,src/lib/institution/institutionalCycle.ts,src/lib/institution/institutionalEvolution.ts,src/lib/licensing/entitlements.ts,src/lib/mcp/authenticatedGatewayProjection.ts,src/lib/mcp/authenticatedGovernedMachineAdapter.test.ts,src/lib/mcp/authenticatedGovernedMachineAdapter.ts,src/lib/mcp/publicMcpServer.ts,src/lib/mcp/studioMcpServer.ts,src/lib/memory/embeddings.ts,src/lib/method-lab/contracts.ts,src/lib/method-lab/experimentContract.ts,src/lib/method-lab/experimentIds.ts,src/lib/method-lab/experimentPersistence.ts,src/lib/method-lab/externalLabRoute.test.ts,src/lib/method-lab/fieldProjection.ts,src/lib/method-lab/mihmFoundationDiagnostic.test.ts,src/lib/method-lab/mihmFoundationDiagnostic.ts,src/lib/method-lab/mihmFoundationDiagnosticRun.ts,src/lib/method-lab/readModel.ts,src/lib/method-lab/reentryEngine.ts,src/lib/method-lab/registry.ts,src/lib/method-lab/researchAssurance.test.ts,src/lib/method-lab/researchAssurance.ts,src/lib/method-lab/researchObjects.ts,src/lib/method-lab/researchPassportPreview.test.ts,src/lib/method-lab/researchPassportPreview.ts,src/lib/method-lab/researchReviewDossier.test.ts,src/lib/method-lab/researchReviewDossier.ts,src/lib/method-lab/uiProjection.ts,src/lib/mihm/activeObservationQueue.ts,src/lib/mihm/adapters/worldVectorInstrumentAdapter.ts,src/lib/mihm/distributedPhenomena.ts,src/lib/mihm/experimentalTemporalVectorPilot.test.ts,src/lib/mihm/experimentalTemporalVectorPilot.ts,src/lib/mihm/fieldScientificReading.ts,src/lib/mihm/fieldTemporalPersistence.ts,src/lib/mihm/foundationLaggedDynamics.test.ts,src/lib/mihm/foundationLaggedDynamics.ts,src/lib/mihm/foundationObservationCoverage.test.ts,src/lib/mihm/foundationObservationCoverage.ts,src/lib/mihm/foundationProspectiveScoring.test.ts,src/lib/mihm/foundationProspectiveScoring.ts,src/lib/mihm/foundationResearchContract.test.ts,src/lib/mihm/foundationResearchContract.ts,src/lib/mihm/foundationSourceMetrology.test.ts,src/lib/mihm/foundationSourceMetrology.ts,src/lib/mihm/foundationTypedFieldAudit.test.ts,src/lib/mihm/foundationTypedFieldAudit.ts,src/lib/mihm/foundationViabilityRecovery.test.ts,src/lib/mihm/foundationViabilityRecovery.ts,src/lib/mihm/historicalV2Arithmetic.test.ts,src/lib/mihm/instrumentCompatibility.test.ts,src/lib/mihm/instrumentContract.ts,src/lib/mihm/jrFieldCycle.ts,src/lib/mihm/jrFieldReadModel.ts,src/lib/mihm/jrReturnReconciliation.ts,src/lib/mihm/methodSelectionContract.ts,src/lib/mihm/methodSelectionResolver.ts,src/lib/mihm/methodologyRegistry.ts,src/lib/mihm/operationalShadowRead.ts,src/lib/mihm/perturbationReviewQueue.ts,src/lib/mihm/rootCaseMethodology.ts,src/lib/mihm/scientificMethodDispatch.ts,src/lib/mihm/scientificMethodRuntime.test.mjs,src/lib/mihm/scientificMethodRuntime.ts,src/lib/mihm/timelineClocks.ts,src/lib/moph/session-store.ts,src/lib/navigation/publicNavigation.ts,src/lib/observatory/gold/observatoryGoldAdapter.ts,src/lib/observatory/public/readPublicObservatoryState.ts,src/lib/observatory/public/territorialTensions.ts,src/lib/observatory/public/worldSnapshotTimeline.ts,src/lib/observatory/publicState.ts,src/lib/operational/common.ts,src/lib/operations/resourceSelfObservation.test.ts,src/lib/operations/resourceSelfObservation.ts,src/lib/operations/sfiCostMeter.ts,src/lib/persistence/authorityJournalSupersession.ts,src/lib/persistence/continuityRecovery.ts,src/lib/persistence/dataPlaneConfig.ts,src/lib/persistence/dataPlaneContinuityStore.ts,src/lib/persistence/dataPlaneFetch.ts,src/lib/persistence/dataPlaneIdentity.ts,src/lib/persistence/dataPlaneReconciliationControl.ts,src/lib/persistence/dataPlaneRpc.ts,src/lib/persistence/primaryMirror.ts,src/lib/persistence/primaryMirrorCertification.test.ts,src/lib/persistence/primaryMirrorCertification.ts,src/lib/persistence/replicationRetirementPolicy.ts,src/lib/persistence/tenantMemberAuthorityProof.test.ts,src/lib/persistence/tenantMemberAuthorityProof.ts,src/lib/persistence/verifiedObservationReplay.ts,src/lib/public/institutionHistory.ts,src/lib/public/institutionProfile.ts,src/lib/public/sfiServiceCatalog.ts,src/lib/publications/editorialContent.test.ts,src/lib/publications/editorialContent.ts,src/lib/publications/editorialFamilies.ts,src/lib/publications/publicEnglishProjection.ts,src/lib/reports/restrictedEvidenceReports.ts,src/lib/reports/rootReportInbox.ts,src/lib/reports/scheduledAgentReports.ts,src/lib/reports/worldHypothesisClosureReport.ts,src/lib/repository/publicPassportProjection.ts,src/lib/repository/repositoryTemporalProjection.ts,src/lib/root/caseDisplayName.test.ts,src/lib/root/caseDisplayName.ts,src/lib/root/closure/fullCycleVerification.ts,src/lib/root/interactiveDossiers.ts,src/lib/root/interactiveOperationalNext.ts,src/lib/root/interactiveReadModel.ts,src/lib/root/neuralGraphRuntime.ts,src/lib/root/operationalWorkboard.ts,src/lib/root/rootObservationRunner.ts,src/lib/root/server.ts,src/lib/root/telemetry/agentRegistry.ts,src/lib/scorefriction/detectionState.ts,src/lib/scorefriction/python/pythonMihmToOperational.ts,src/lib/scorefriction/regimeWatch.ts,src/lib/scorefriction/store.ts,src/lib/server/actorNodeProjection.ts,src/lib/server/productionBackend.ts,src/lib/server/sfiAssets.ts,src/lib/sfi-psi/store.ts,src/lib/sfi/case-platform/authorityEvidenceReadModel.ts,src/lib/sfi/case-platform/caseProjectAssignment.ts,src/lib/sfi/case-platform/passportReadBoundary.ts,src/lib/sfi/case-platform/repository.ts,src/lib/sfi/case-platform/returnLearningReadModel.ts,src/lib/sfi/case-platform/sourceProtocolReadiness.ts,src/lib/sfi/case-platform/temporalProvenance.ts,src/lib/sfi/case-platform/trajectoryContrastReadModel.ts,src/lib/sfi/caseIntakeResolver.ts,src/lib/sfi/cognitive-runtime/agentDossierRead.ts,src/lib/sfi/cognitive-runtime/cognitiveCycle.ts,src/lib/sfi/cognitive-runtime/eventPersistence.ts,src/lib/sfi/cognitive-runtime/executionReceiptVerification.ts,src/lib/sfi/cognitive-runtime/llmAugmentationPolicy.test.ts,src/lib/sfi/cognitive-runtime/llmAugmentationPolicy.ts,src/lib/sfi/cognitive-runtime/manualExecution.ts,src/lib/sfi/cognitive-runtime/missionCatalog.ts,src/lib/sfi/cognitive-runtime/missionDispatch.ts,src/lib/sfi/cognitive-runtime/observedRuntime.ts,src/lib/sfi/cognitive-runtime/queuedMissionCaseGate.ts,src/lib/sfi/cognitive-runtime/queuedMissionIntake.ts,src/lib/sfi/cognitive-runtime/queuedMissionWorker.ts,src/lib/sfi/cognitive-runtime/registry.ts,src/lib/sfi/cognitive-runtime/runtime.ts,src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts,src/lib/sfi/cognitive-runtime/types.ts,src/lib/sfi/continuityPostgres.ts,src/lib/sfi/cycleTargetRead.test.ts,src/lib/sfi/evidenceRequirementResolver.ts,src/lib/sfi/externalAuth.ts,src/lib/sfi/externalCognitivePeer.ts,src/lib/sfi/indicatorSnapshot.ts,src/lib/sfi/library/documentaryCatalog.ts,src/lib/sfi/oauthClientRegistry.ts,src/lib/sfi/oauthConfig.ts,src/lib/sfi/predictions/agents/closedVerificationOutcome.ts,src/lib/sfi/predictions/agents/evidenceStateAgent.ts,src/lib/sfi/predictions/agents/verificationAgent.ts,src/lib/sfi/predictions/agents/verificationConsistency.test.ts,src/lib/sfi/predictions/verificationService.ts,src/lib/sfi/readPlaneCache.test.ts,src/lib/sfi/readPlaneCache.ts,src/lib/sfi/reality-chain/reconcilePlan.test.ts,src/lib/sfi/reality-chain/reconcilePlan.ts,src/lib/sfi/universalAiSynthesis.ts,src/lib/sfi/universalCalibrationState.ts,src/lib/sfi/universalCycleContinuation.test.ts,src/lib/sfi/universalCycleContinuation.ts,src/lib/sfi/universalEmpiricalContinuation.ts,src/lib/sfi/universalReturnContrastIdempotency.test.ts,src/lib/sfi/universalReturnContrastIdempotency.ts,src/lib/sfi/universalReturnPlanUpgrade.ts,src/lib/sfi/universalSignalCycle.test.ts,src/lib/sfi/universalSignalCycle.ts,src/lib/sfi/worldInterfaceState.ts,src/lib/studio/campaign/studioAutonomyResearchProgram.ts,src/lib/studio/campaign/studioCampaignPilot.ts,src/lib/studio/cultural-lab/agents/mihmAgent.test.ts,src/lib/studio/cultural-lab/agents/mihmAgent.ts,src/lib/studio/cultural-lab/pipeline.ts,src/lib/studio/cultural-lab/types.ts,src/lib/studio/multimodal/textAnalyzer.ts,src/lib/studio/production/studioCulturalLens.ts,src/lib/supabase/readBudget.ts,src/lib/system/access/founderAuthority.test.ts,src/lib/system/access/founderAuthority.ts,src/lib/system/access/institutionalMembers.ts,src/lib/world-observatory/historicalHypothesisAdjudication.test.ts,src/lib/world-observatory/historicalHypothesisAdjudication.ts,src/lib/world-observatory/hypothesisCalibration.ts,src/lib/world-observatory/hypothesisConditionalBranches.ts,src/lib/world-observatory/hypothesisConditionalExplore.test.ts,src/lib/world-observatory/hypothesisConditionalExplore.ts,src/lib/world-observatory/hypothesisCycle.ts,src/lib/world-observatory/hypothesisGenerationBoundary.ts,src/lib/world-observatory/hypothesisTestContract.ts,src/lib/world-vector/operationalState.ts,src/lib/world-vector/persistence.ts,src/lib/world-vector/readModel.ts,src/lib/world-vector/reportBuilder.test.ts,src/lib/world-vector/reportBuilder.ts,src/lib/world-vector/retrospective.ts,src/lib/world-vector/types.ts,src/lib/worldspect/historicalRecovery.ts,src/lib/worldspect/runAdapters.ts,src/lib/worldspect/snapshotStore.ts,src/observatory/field/catalog/mihmRuntimeMatrix.ts,src/observatory/persistence/migrateLocalNodeToSupabase.ts,src/observatory/persistence/supabaseFieldPersistence.ts,src/observatory/publicSurface/content.ts,src/observatory/social/socialReadOnlyIngestion.ts,src/observatory/worldspect/globalWorldSpect.ts,src/proxy.ts,src/runtime/layers/Executor.ts,src/runtime/layers/Gate.ts,src/runtime/layers/IntentLayer.ts,src/runtime/layers/Observer.ts,src/runtime/layers/Planner.ts,src/runtime/layers/Simulator.ts,src/runtime/supabase/client.ts,src/runtime/supabase/server.ts.

### WS-03-005 — IN_PROGRESS
**Objetivo o significado contextual:** Mantener coherente la huella de identidad institucional.
**Texto original extraído:** identity fingerprint coherent;
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-03; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-03-006 — IN_PROGRESS
**Objetivo o significado contextual:** No publicar nodos externos sin verificación en sameAs.
**Texto original extraído:** no unverified external node emitted in canonical `sameAs`;
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-03; update #762 with immutable evidence and RETURN state.
**Recibo:** `INVALID` — RECEIPT_SCOPE_INVALIDATED_BY_CHANGE:.github/workflows/mem002-postgres.yml,.github/workflows/mihm-contract-validation.yml,.github/workflows/mihm-exp001-feasibility.yml,.github/workflows/mihm-exp001-g2b.yml,.github/workflows/mihm-exp001-g2c.yml,.github/workflows/mihm-exp001-g3.yml,.github/workflows/mihm-exp001-g3b.yml,.github/workflows/mihmt-timeline-clocks-review.yml,.github/workflows/reality-chain-provenance.yml,.github/workflows/sfi-authenticated-governed-machine-r4c.yml,.github/workflows/sfi-cl-verify.yml,.github/workflows/sfi-continuity-hourly.yml,.github/workflows/sfi-continuity-ledger-read.yml,.github/workflows/sfi-dual-plane-weekly-audit.yml,.github/workflows/sfi-external-oauth.yml,.github/workflows/sfi-main-only-convergence.yml,.github/workflows/sfi-operating-cycle-closure.yml,.github/workflows/sfi-production-observatory-smoke.yml,.github/workflows/sfi-program-completion.yml,.github/workflows/sfi-prune-integrated-branches.yml,.github/workflows/sfi-self-development.yml,.github/workflows/sfi-vercel-prebuilt-production.yml,.github/workflows/sfi-verify.yml,.github/workflows/worldspect-cron.yml,docs/program/SFI-ELITE-EXPERIENCE-2026-09-26.md,docs/program/workstreams/WS-04-AUTHENTICATED-GOVERNED-MACHINE-R4C.md,package-lock.json,package.json,packages/graph/src/index.ts,packages/mihm-core/src/index.ts,packages/mihm-core/src/integrated.test.ts,public/ai-index.json,public/assets/documentos/exoplanet_observatory_golden_horizons.png,public/assets/sfi/README.md,public/assets/sfi/documents/sfi_field_document_alien_world_atlas.png,public/assets/sfi/documents/sfi_internal_memorandum_cosmic_observatory.png,public/assets/sfi/institutional/celestial_council_overlooking_a_golden_world.png,public/assets/sfi/institutional/celestial_observatory_temple.png,public/assets/sfi/institutional/celestial_observatory_temple_interior.png,public/assets/sfi/institutional/consejo_global_ante_la_mesa_luminosa.png,public/assets/sfi/institutional/consejo_global_en_mesa_dorada.png,public/assets/sfi/institutional/council.png,public/assets/sfi/institutional/futuristic_golden_archive_pedestal.png,public/assets/sfi/institutional/institution-frame.png,public/assets/sfi/institutional/observatory-frame.png,public/assets/sfi/instruments/08102026_0.png,public/assets/sfi/instruments/08102026_01.png,public/assets/sfi/instruments/08102026_02.png,public/assets/sfi/instruments/08102026_03.png,public/assets/sfi/instruments/08102026_04.png,public/assets/sfi/instruments/08102026_05.png,public/assets/sfi/instruments/08102026_06.png,public/assets/sfi/instruments/08102026_07.png,public/assets/sfi/instruments/08102026_09.png,public/assets/sfi/instruments/08102026_10.png,public/assets/sfi/instruments/08102026_11.png,public/assets/sfi/instruments/08102026_12.png,public/assets/sfi/instruments/Horizonte futurista bajo lunas gemelas.png,public/assets/sfi/instruments/Horizonte futurista bajo lunas gigantes.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 10_21_57-5.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_18-1.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_22-2.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_26-3.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_34-5.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_38-6.png,public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_42-7.png,public/assets/sfi/instruments/OBSERVATORY_.png,public/assets/sfi/instruments/OBSERVATORY_00.png,public/assets/sfi/instruments/OBSERVATORY_BACKGROUND.png,public/assets/sfi/instruments/OBSERVATORY_DASHBOARD.png,public/assets/sfi/instruments/OBSERVATORY_MAPS.png,public/assets/sfi/instruments/OBSERVATORY_MONITOR.png,public/assets/sfi/instruments/OBSERVATORY_MOONS.png,public/assets/sfi/instruments/OBSERVATORY_PROJECTOR.png,public/assets/sfi/instruments/RealityChain.png,public/assets/sfi/instruments/SFI_HOME_PANORAMA.png,public/assets/sfi/instruments/SFI_RCH_01.png,public/assets/sfi/instruments/SFI_RCH_02.png,public/assets/sfi/instruments/SFI_RCH_03.png,public/assets/sfi/instruments/SFI_RCH_04.png,public/assets/sfi/instruments/SFI_RCH_05.png,public/assets/sfi/instruments/SFI_RCH_06.png,public/assets/sfi/instruments/SFI_RCH_07.png,public/assets/sfi/instruments/SFI_RCH_08.png,public/assets/sfi/instruments/Umbral futurista entre Tierra y amanecer.png,public/assets/sfi/maps/mapa_de_red_global_dorada.png,public/assets/sfi/maps/planeta_tierra.png,public/assets/sfi/overlays/4f9335f4-4236-4b03-82f0-f5a441bd0297.png,public/assets/sfi/overlays/amanecer_dorado_celestial_transparente.png,public/assets/sfi/overlays/c541cc06-586e-43f2-9b38-1733847353c3.png,public/assets/sfi/overlays/cbe47d49-2d09-4dc8-93bd-8d22fd355fbb.png,public/assets/sfi/overlays/cerebro_dorado_de_red_neuronal.png,public/assets/sfi/overlays/domo sobre el planeta.png,public/assets/sfi/overlays/domo_de_red_global_dorado.png,public/assets/sfi/overlays/light.png,public/assets/sfi/overlays/margen_inicial.png,public/assets/sfi/overlays/network-overlay.png,public/assets/sfi/overlays/orbit-overlay.png,public/assets/sfi/overlays/red_dorado_red_de_inteligencia_planetaria.png,public/assets/sfi/overlays/red_global_de_conexiones_luminosas.png,public/assets/sfi/overlays/red_neuronal_dorada_luminosa.png,public/assets/sfi/overlays/shinny_effect.png,public/assets/sfi/people/analista_profesional_con_tablet_y_luz_dorada.png,public/assets/sfi/people/figura_urbana_con_luz_dorada.png,public/assets/sfi/people/golden_rim_lit_outdoor_observer.png,public/assets/sfi/people/hombre_elegante_con_contraluz_dorado.png,public/assets/sfi/people/observador_con_mochila_a_contraluz_dorada.png,public/assets/sfi/people/observer.png,public/assets/sfi/people/people.png,public/assets/sfi/scenes/04_05_background.png,public/assets/sfi/scenes/04_observer.png,public/assets/sfi/scenes/05_board.png,public/assets/sfi/scenes/05_platform.png,public/assets/sfi/scenes/06_archive_background.png,public/assets/sfi/scenes/06_archive_board.png,public/assets/sfi/scenes/07_return_background.png,public/assets/sfi/scenes/07_return_monument.png,public/assets/sfi/scenes/07_return_network.png,public/assets/sfi/scenes/07_return_people.png,public/assets/sfi/scenes/explorador_de_casos_futuros_emergentes.png,public/assets/sfi/scenes/futuristic_golden_portal_temple.png,public/assets/sfi/scenes/golden_cosmic_gate_in_a_marble_temple.png,public/assets/sfi/scenes/golden_observatory_over_a_glowing_planet.png,public/assets/sfi/scenes/observatorio_dorado_sobre_el_planeta.png,public/assets/sfi/scenes/observatorio_dorado_sobre_la_tierra.png,public/assets/sfi/scenes/sala_inicial.png,public/assets/sfi/system/reference/02_03.png,public/assets/sfi/system/reference/02_03_overlay_constellation.png,public/assets/sfi/system/reference/02_03_overlay_network.png,public/assets/sfi/system/reference/02_03_world_background.png,public/assets/sfi/system/reference/04_overlay_orbits.png,public/assets/sfi/system/reference/04_scene.png,public/assets/sfi/system/reference/05_background_earth.png,public/assets/sfi/system/reference/05_element_books.png,public/assets/sfi/system/reference/05_element_bust.png,public/assets/sfi/system/reference/05_element_platform.png,public/assets/sfi/system/reference/05_element_podium.png,public/assets/sfi/system/reference/05_element_portal.png,public/assets/sfi/system/reference/05_overlay_network.png,public/assets/sfi/system/reference/05_scene.png,public/assets/sfi/system/reference/06_elements_archive.png,public/assets/sfi/system/reference/06_scene.png,public/assets/sfi/system/reference/9461ca8f-ddc5-41fb-9103-39f579c1dd24.png,public/assets/sfi/system/reference/SFI_Un_Mundo_en_Movimiento.png,public/assets/sfi/system/reference/a_cinematic_ultra_detailed_high_resolution_sci_f.png,public/assets/sfi/system/reference/a_cinematic_ultra_detailed_high_tech_control_ana.png,public/assets/sfi/system/reference/a_wide_cinematic_collage_of_8_sci_fi_ui_poster_pa.png,public/assets/sfi/system/reference/a_wide_cinematic_futuristic_sci_fi_ui_website_he.png,public/assets/sfi/system/reference/a_wide_cinematic_futuristic_ui_header_banner_sce.png,public/assets/sfi/system/reference/a_wide_cinematic_futuristic_ui_header_infographic.png,public/assets/sfi/system/reference/a_wide_cinematic_futuristic_ui_header_website_inte.png,public/assets/sfi/system/reference/a_wide_cinematic_grid_of_10_golden_sci_fi_ui_conc.png,public/assets/sfi/system/reference/a_wide_cinematic_ui_website_header_landing_interf.png,public/assets/sfi/system/reference/a_wide_cinematic_ultra_detailed_sci_fi_ui_websit.png,public/assets/sfi/system/reference/a_wide_grid_like_composite_image_in_a_cinematic_sc.png,public/assets/sfi/system/reference/a_wide_high_detail_collage_of_10_sci_fi_futuristi.png,public/assets/sfi/system/reference/a_wide_rectangular_contact_sheet_style_collage_wit.png,public/assets/sfi/system/reference/futuristic_golden_evidence_command_center.png,public/assets/sfi/system/reference/golden_holographic_observatory_console.png,public/assets/sfi/system/reference/golden_rimmed_professional_analyst_cutout.png,public/assets/sfi/system/reference/qa/montage_0055.jpg,public/assets/sfi/system/reference/qa/sfi_asset_audit_montage.jpg,public/assets/sfi/ui/cinematic_gold_sci_fi_hud_frame.png,public/assets/sfi/ui/dossier_futurista_en_negro_y_oro.png,public/assets/sfi/ui/glowing_golden_celestial_compass_sigil.png,public/assets/sfi/ui/golden_celestial_astrolabe_hud.png,public/assets/sfi/ui/golden_celestial_timeline_sigil.png,public/assets/sfi/ui/icons/00_sfi_canonical_mark.png,public/assets/sfi/ui/icons/01_observation_reticle.png,public/assets/sfi/ui/icons/02_evidence_archive.png,public/assets/sfi/ui/icons/03_inference_graph.png,public/assets/sfi/ui/icons/04_authority_axis.png,public/assets/sfi/ui/icons/05_execution_node.png,public/assets/sfi/ui/icons/06_return_loop.png,public/assets/sfi/ui/icons/07_world_vector.png,public/assets/sfi/ui/icons/08_signal_pulse.png,public/assets/sfi/ui/icons/09_field_portal.png,public/assets/sfi/ui/interfaz_hud_dorada_de_lente_futurista.png,public/assets/sfi/ui/interfaz_hud_dorada_del_observatorio.png,public/assets/sfi/ui/luminous_gold_celestial_timeline_spine.png,public/assets/sfi/ui/marco_hud_dorado_futurista_de_doble_panel.png,public/assets/sfi/ui/red_de_inferencia_futurista_hud.png,public/assets/sfi/ui/sfi-institute-node-mark.svg,public/assets/sfi/world/amanecer_sobre_la_tierra_iluminada.png,public/assets/sfi/world/amanecer_sobre_un_mundo_futurista.png,public/assets/sfi/world/futuristic_earthrise_over_a_glowing_megacity.png,public/assets/sfi/world/golden_metropolis_among_the_stars.png,public/assets/sfi/world/image-gen-2(20260923-171806).png,public/assets/sfi/world/image-gen-3(20260923-171808).png,public/assets/sfi/world/image-gen-4(20260923-181311).png,public/assets/sfi/world/moonlit_fjord_cityscape.png,public/assets/sfi/world/mountains.png,public/assets/sfi/world/orbiting_dawn_over_a_glowing_world.png,public/assets/sfi/world/world-clean.png,public/assets/sfi/world/world-network.png,public/field/world-observatory/index.html,public/icon.svg,public/images/editorial/discovery-mesh-observation.svg,public/images/editorial/reality-chain/reality-chain-benchmark-v0.svg,public/images/editorial/reality-chain/reality-chain-cover.svg,public/images/editorial/reality-chain/reality-chain-epistemic-overproduction.svg,public/images/editorial/reality-chain/reality-chain-six-integrities.svg,public/images/editorial/reality-chain/reality-chain-transparency-paradox.svg,public/images/editorial/reality-chain/reality-chain-world-to-claim.svg,public/images/editorial/years-that-did-exist/cover.svg,public/library/assets/sfi-mark.svg,public/llms-full.txt,public/llms.txt,public/og/sfi-institutional.jpg,public/openapi.json,public/sfi/brand/sfi-institutional-seal.png,public/sfi/nyc/background.avif,public/sfi/nyc/clouds.avif,public/sfi/nyc/earth.avif,public/sfi/nyc/golden-circle.avif,public/sfi/nyc/lights.avif,public/sfi/nyc/lines.avif,public/sfi/nyc/moon.avif,public/sfi/nyc/runtime/background.avif,public/sfi/nyc/runtime/clouds.avif,public/sfi/nyc/runtime/earth.avif,public/sfi/nyc/runtime/golden-circle.avif,public/sfi/nyc/runtime/lines.avif,public/sfi/nyc/runtime/moon.avif,public/sfi/nyc/runtime/structure.avif,public/sfi/nyc/structure.avif,scripts/ai/sfi-chatgpt-plus-observe.sql,scripts/cognitive-olympics/case-lab/README.md,scripts/cognitive-olympics/case-lab/aiweeknyc.case.json,scripts/cognitive-olympics/case-lab/execute-review-once.mjs,scripts/cognitive-olympics/case-lab/execute-review-once.test.mjs,scripts/cognitive-olympics/case-lab/review-preview.mjs,scripts/cognitive-olympics/case-lab/review-preview.test.mjs,scripts/cognitive-olympics/case-lab/run.mjs,scripts/cognitive-olympics/case-lab/run.test.mjs,scripts/cognitive-spine/qa-cognitive-spine-integrated.ts,scripts/cognitive-spine/qa-library-impact-context.ts,scripts/cognitive-spine/qa-root-cognitive-spine-observability.ts,scripts/data-continuity-audit.mjs,scripts/db/export-sfi-full-cycle-proof.mjs,scripts/db/mem003-authority-semantic-supersession.sql,scripts/db/mem003-continuity-journal-scope.sql,scripts/db/mem003-reconciliation-readonly.sql,scripts/db/neon-data-plane-baseline-reconcile.sql,scripts/db/neon-data-plane-governor.sql,scripts/db/neon-primary-mirror-receiver.sql,scripts/db/verify-sfi-database.mjs,scripts/fixtures/sfi-continuity-wakeup-native-40593423373.json,scripts/fixtures/sfi-world-observatory-hypothesis-retry-20261027.json,scripts/insert_snapshot.js,scripts/lib/programCompletionDiagnostics.mjs,scripts/qa-main-only-branch-convergence.mjs,scripts/qa-sfi-access-upgrade.ts,scripts/qa-sfi-account-invitation.ts,scripts/qa-sfi-actionable-human-inbox.ts,scripts/qa-sfi-agent-execution-contract.ts,scripts/qa-sfi-ai-governance.ts,scripts/qa-sfi-authenticated-governed-machine-r4c.ts,scripts/qa-sfi-authenticated-navigation.ts,scripts/qa-sfi-bilingual-interface.ts,scripts/qa-sfi-c07-root-activation.mjs,scripts/qa-sfi-case-gpt-bridge.ts,scripts/qa-sfi-case-intake-action-binding.ts,scripts/qa-sfi-chatgpt-studio-attachment.ts,scripts/qa-sfi-cognitive-automation-workspaces.ts,scripts/qa-sfi-cognitive-field-admission.ts,scripts/qa-sfi-cognitive-twin-reentry-base.ts,scripts/qa-sfi-contextual-return.ts,scripts/qa-sfi-cost-meter.mjs,scripts/qa-sfi-ct-institutional-integration.ts,scripts/qa-sfi-cycle-audit-readonly.ts,scripts/qa-sfi-data-plane-identity.ts,scripts/qa-sfi-data-plane-scheduled-recovery.mjs,scripts/qa-sfi-decision-transfer-blind.ts,scripts/qa-sfi-decision-transfer-operational.ts,scripts/qa-sfi-discovery-exposure.ts,scripts/qa-sfi-discovery-integrity.ts,scripts/qa-sfi-discovery-operational.ts,scripts/qa-sfi-evidence-candidates.ts,scripts/qa-sfi-external-cognitive-peer.ts,scripts/qa-sfi-external-oauth.ts,scripts/qa-sfi-field-scientific-reading.ts,scripts/qa-sfi-final-runtime-wiring.ts,scripts/qa-sfi-genai-telemetry.ts,scripts/qa-sfi-governed-execution-router.ts,scripts/qa-sfi-institutional-evolution.ts,scripts/qa-sfi-institutional-visual-convergence.ts,scripts/qa-sfi-jr-field-cycle.ts,scripts/qa-sfi-learning-bootstrap.ts,scripts/qa-sfi-live-proof.mjs,scripts/qa-sfi-mem002-postgres.ts,scripts/qa-sfi-mem002-single-writer.ts,scripts/qa-sfi-method-lab-convergence.ts,scripts/qa-sfi-method-lab-ui-r4b.ts,scripts/qa-sfi-method-selection.ts,scripts/qa-sfi-mihm-foundation-missingness.ts,scripts/qa-sfi-mihm-operational-readback-contract.ts,scripts/qa-sfi-mihm-shadow-observer.test.ts,scripts/qa-sfi-mihmt-timeline.ts,scripts/qa-sfi-model-owner-context.ts,scripts/qa-sfi-mutation-evidence.ts,scripts/qa-sfi-neon-continuity-heartbeat.ts,scripts/qa-sfi-neon-readplane-deferred-lanes.mjs,scripts/qa-sfi-oauth-integrations.ts,scripts/qa-sfi-operating-field-closure.ts,scripts/qa-sfi-operational-next.ts,scripts/qa-sfi-operational-reset.ts,scripts/qa-sfi-post-deploy-assurance-coordination.mjs,scripts/qa-sfi-prediction-verification-atomic.test.ts,scripts/qa-sfi-production-observatory-smoke.mjs,scripts/qa-sfi-program-certification-batch.mjs,scripts/qa-sfi-program-completion-diagnostics.mjs,scripts/qa-sfi-program-completion-receipts.mjs,scripts/qa-sfi-public-mcp-readonly.ts,scripts/qa-sfi-public-research-landing.ts,scripts/qa-sfi-public-services.mjs,scripts/qa-sfi-public-visual-contract.ts,scripts/qa-sfi-publications-hub.ts,scripts/qa-sfi-readplane-efficiency.ts,scripts/qa-sfi-reality-chain-intake.ts,scripts/qa-sfi-reality-chain-three-screen.ts,scripts/qa-sfi-root-acp-total-convergence.ts,scripts/qa-sfi-root-final-visual.mjs,scripts/qa-sfi-root-graph-navigation.ts,scripts/qa-sfi-root-missions-passport-navigation.mjs,scripts/qa-sfi-root-public-field.ts,scripts/qa-sfi-root-reports-runtime.ts,scripts/qa-sfi-runtime-readplane-stability.ts,scripts/qa-sfi-session-controls.ts,scripts/qa-sfi-sovereign-only-human-gates.ts,scripts/qa-sfi-spatial-surfaces.ts,scripts/qa-sfi-studio-campaign.ts,scripts/qa-sfi-studio-cognitive.ts,scripts/qa-sfi-studio-hygiene.ts,scripts/qa-sfi-supabase-egress-containment.ts,scripts/qa-sfi-temporal-surfaces.ts,scripts/qa-sfi-total-proof.ts,scripts/qa-sfi-universal-full-cycle.ts,scripts/qa-sfi-vercel-cost-gate.mjs,scripts/qa-sfi-web-source-extraction.ts,scripts/qa-sfi-world-hypothesis-generation.ts,scripts/qa-sfi-worldspect-neon-readplane.mjs,scripts/qa-sfi-worldspect-timeline-read.mjs,scripts/qa-sfi-ws01-ownership-boundary.ts,scripts/qa-sfi-ws02-universal-twin-lineage.ts,scripts/qa-world-vector-pulse.mjs,scripts/reality_chain/c07_governed_mission_queue_candidate.sql,scripts/reality_chain/github_provenance.py,scripts/reality_chain/test_github_provenance.py,scripts/research/knight-retrolongitudinal.mjs,scripts/research/knight-retrolongitudinal.test.mjs,scripts/research/knight-triple-case.mjs,scripts/research/knight-triple-case.test.mjs,scripts/research/mihm-311-channel-sensitivity.mjs,scripts/research/mihm-311-christmas-category-control.mjs,scripts/research/mihm-311-dec2025-snow-transfer.mjs,scripts/research/mihm-311-heat-closure-outcome.mjs,scripts/research/mihm-311-heat-sameday-outcome.mjs,scripts/research/mihm-311-snow-composition.mjs,scripts/research/mihm-dot-fixed-link-probe.mjs,scripts/research/mihm-exp001-g2c-cohort.mjs,scripts/research/mihm-exp001-g2c-cohort.test.mjs,scripts/research/mihm-exp001-g3-check-audit.mjs,scripts/research/mihm-exp001-g3-check-audit.test.mjs,scripts/research/mihm-exp001-g3b-p12.mjs,scripts/research/mihm-exp001-g3b-p12.test.mjs,scripts/research/mihm-exp001-sfi-feasibility.mjs,scripts/research/mihm-exp001-timezero.mjs,scripts/research/mihm-exp001-timezero.test.mjs,scripts/research/mihm-fdny-capacity-contrast.mjs,scripts/research/mihm-foundation-calibration-t0.ts,scripts/research/mihm-foundation-p1-metrology.ts,scripts/research/mihm-foundation-p2-lagged-dynamics.ts,scripts/research/mihm-foundation-p3-viability-recovery.ts,scripts/research/mihm-foundation-p4-readiness.ts,scripts/research/mihm-manhattan-365d-contrast.mjs,scripts/research/mihm-manhattan-365d-source.mjs,scripts/research/mihm-manhattan-berserker-contrast.mjs,scripts/research/mihm-manhattan-calibration-gate.mjs,scripts/research/mihm-manhattan-e1-e2-e4-contrast.mjs,scripts/research/mihm-manhattan-feb-blizzard-case.mjs,scripts/research/mihm-manhattan-four-source-week.mjs,scripts/research/mihm-manhattan-march-panel.mjs,scripts/research/mihm-manhattan-multiplex-calibration.mjs,scripts/research/mihm-manhattan-multiplex-preflight.mjs,scripts/research/mihm-manhattan-nws-event-contrast.mjs,scripts/research/mihm-manhattan-p5-scientific-closure.mjs,scripts/research/mihm-manhattan-source-coverage.mjs,scripts/research/mihm-mta-cbd-traffic-probe.mjs,scripts/research/mihm-nws-baseline-sensitivity.mjs,scripts/research/mihm-nyc311-exploratory.mjs,scripts/research/mihm-nyc311-fdny-contrast.mjs,scripts/research/mihmt-knight-official.mjs,scripts/research/mihmt-knight-official.test.mjs,scripts/research/qa-mihm-manhattan-evidence-reconciliation.mjs,scripts/run-sfi-operating-cycle-closure.ts,scripts/sfi-program-certification-batch.mjs,scripts/sfi-program-completion-reconcile.mjs,scripts/sfi-program-completion.mjs,scripts/sfi-program-dispatch.mjs,scripts/sfi-self-development.mjs,scripts/system-consolidation-audit.py,src/app/.well-known/oauth-authorization-server/route.ts,src/app/.well-known/oauth-protected-resource/api/mcp/authenticated/route.ts,src/app/.well-known/oauth-protected-resource/api/mcp/studio/route.ts,src/app/.well-known/oauth-protected-resource/route.ts,src/app/RealityChain/page.tsx,src/app/[scene]/page.tsx,src/app/accessibility/page.tsx,src/app/account/security/page.tsx,src/app/ai-index.json/route.ts,src/app/api/account/invitation-session/route.ts,src/app/api/amv/field-response/route.ts,src/app/api/bitacora/regenerate/route.ts,src/app/api/calendar/phenomenological/route.ts,src/app/api/cases/[caseId]/linked-cases/route.ts,src/app/api/cases/[caseId]/reports/route.ts,src/app/api/cases/[caseId]/route.ts,src/app/api/cron/continuity-heartbeat/route.ts,src/app/api/cron/continuity-report/route.ts,src/app/api/cron/data-plane-reconcile/route.ts,src/app/api/cron/world-observatory/route.ts,src/app/api/cron/worldspect/route.ts,src/app/api/external/v1/bootstrap/route.ts,src/app/api/external/v1/cases/intake/route.ts,src/app/api/external/v1/cases/route.ts,src/app/api/external/v1/cognitive-peer/route.ts,src/app/api/external/v1/governance/proposals/[id]/decision/route.ts,src/app/api/external/v1/jr/route.ts,src/app/api/external/v1/lab/route.ts,src/app/api/external/v1/manifest/route.ts,src/app/api/external/v1/root/operate/route.ts,src/app/api/external/v1/signal/route.ts,src/app/api/external/v1/world/route.ts,src/app/api/field/events/route.ts,src/app/api/field/map/world/reobserve/route.ts,src/app/api/field/map/world/route.ts,src/app/api/field/persist/route.ts,src/app/api/field/state/route.ts,src/app/api/global-metrics/route.ts,src/app/api/ingest/read/route.ts,src/app/api/ingest/real/route.ts,src/app/api/interface/cognitive-workspace/route.ts,src/app/api/internal/closure-once/route.ts,src/app/api/internal/continuity-closure-once/route.ts,src/app/api/liturgia/amv/route.ts,src/app/api/mcp/authenticated/route.ts,src/app/api/mcp/authentication/route.ts,src/app/api/mcp/studio/route.ts,src/app/api/media/drafts/route.ts,src/app/api/mihm/state/route.ts,src/app/api/mutations/propose/route.ts,src/app/api/node/bootstrap/route.ts,src/app/api/oauth/authorize/route.ts,src/app/api/oauth/register/route.ts,src/app/api/oauth/token/route.ts,src/app/api/observatory/state/route.ts,src/app/api/observatory/world/route.ts,src/app/api/public/contact/route.ts,src/app/api/public/newsletter/route.ts,src/app/api/reality-chain/extract/route.ts,src/app/api/root/cognitive-runtime/route.ts,src/app/api/root/cognitive-twin/route.ts,src/app/api/root/continuity/route.ts,src/app/api/root/cost-meter/route.ts,src/app/api/root/decisions/route.ts,src/app/api/root/evidence/inventory/route.ts,src/app/api/root/evidence/route.ts,src/app/api/root/friccionauta/route.ts,src/app/api/root/method-lab/research/route.ts,src/app/api/root/method-lab/simulate/route.ts,src/app/api/root/mutations/[id]/close/route.ts,src/app/api/root/state/route.ts,src/app/api/root/workboard/route.ts,src/app/api/runtime/bootstrap/route.ts,src/app/api/scorefriction/assets/[asset_id]/measurements/route.ts,src/app/api/scorefriction/assets/route.ts,src/app/api/scorefriction/audio/analyze/route.ts,src/app/api/scorefriction/lab/analyze/route.ts,src/app/api/scorefriction/python/analyze/route.ts,src/app/api/scorefriction/regime-watch/route.ts,src/app/api/sfi/cycle/[logbookId]/route.ts,src/app/api/sfi/events/route.ts,src/app/api/sfi/mihm-audit/route.ts,src/app/api/sfi/operational-snapshot/route.ts,src/app/api/signals/read/route.ts,src/app/api/signals/route.ts,src/app/api/social/resonance/route.ts,src/app/api/system/data-plane/jwks/route.ts,src/app/api/worldspect/health/route.ts,src/app/api/worldspect/real/route.ts,src/app/api/worldspect/trend/route.ts,src/app/auth-unavailable/page.tsx,src/app/auth/callback/page.tsx,src/app/contact/page.tsx,src/app/continuity-access/page.tsx,src/app/entry/page.tsx,src/app/field-schema.json/route.ts,src/app/forgot/page.tsx,src/app/globals.css,src/app/history/mutations/page.tsx,src/app/history/page.tsx,src/app/institution/institution.css,src/app/institution/page.tsx,src/app/instruments/[surface]/page.tsx,src/app/juan/contact.vcf/route.ts,src/app/juan/page.module.css,src/app/juan/page.tsx,src/app/laboratory/laboratory.css,src/app/laboratory/page.tsx,src/app/layout.tsx,src/app/library/LibraryClient.tsx,src/app/library/library.css,src/app/library/page.tsx,src/app/llms-full.txt/route.ts,src/app/llms.txt/route.ts,src/app/manifest.ts,src/app/member/page.tsx,src/app/method-lab/page.tsx,src/app/observatory/page.tsx,src/app/privacy/page.tsx,src/app/publications/[slug]/page.tsx,src/app/publications/discovery-mesh-publicar-no-es-ser-encontrado/discovery-note.css,src/app/publications/discovery-mesh-publicar-no-es-ser-encontrado/page.tsx,src/app/publications/page.tsx,src/app/publications/publications.css,src/app/reality-chain/page.tsx,src/app/repository/RepositoryConsole.tsx,src/app/repository/RepositoryMihmTimeline.tsx,src/app/repository/page.tsx,src/app/repository/repository.css,src/app/root/access/page.tsx,src/app/root/access/root-access.css,src/app/root/discovery/page.tsx,src/app/scrollbar.css,src/app/services/page.tsx,src/app/servicios/[slug]/page.tsx,src/app/servicios/case-study/ai-week-nyc-2026/page.tsx,src/app/servicios/page.tsx,src/app/servicios/services.css,src/app/servicios/solicitar/page.tsx,src/app/signup/page.tsx,src/app/sitemap.ts,src/app/studio/page.tsx,src/app/terms/page.tsx,src/app/timeline/page.tsx,src/app/twin/learning/page.tsx,src/app/unauthorized/page.tsx,src/app/verify/page.tsx,src/app/world-vector/page.tsx,src/components/analytics/SfiConsentBanner.tsx,src/components/auth/AuthProvider.tsx,src/components/i18n/SfiLanguageProvider.tsx,src/components/observatory/gold/visual/observatoryGoldTypes.ts,src/components/public/PublicContactForm.tsx,src/components/public/PublicNewsletterForm.tsx,src/components/public/SfiPublicChrome.css,src/components/public/SfiPublicChrome.tsx,src/components/research/PublicResearchLandingView.tsx,src/components/sfi/AiWeekManualWalkthrough.tsx,src/components/sfi/AlternativeSignIn.css,src/components/sfi/AlternativeSignIn.tsx,src/components/sfi/AuthCallbackSurface.tsx,src/components/sfi/AuthenticatedSfiMenu.css,src/components/sfi/AuthenticatedSfiMenu.tsx,src/components/sfi/CanonicalCognitiveFieldPublic.css,src/components/sfi/CanonicalCognitiveFieldPublic.tsx,src/components/sfi/HypothesisClosureDiff.module.css,src/components/sfi/HypothesisClosureDiff.tsx,src/components/sfi/HypothesisConditionalLab.css,src/components/sfi/HypothesisConditionalLab.tsx,src/components/sfi/InstitutionalEvidenceInventory.css,src/components/sfi/InstitutionalEvidenceInventory.tsx,src/components/sfi/InstitutionalSurfaceRail.css,src/components/sfi/InstitutionalSurfaceRail.tsx,src/components/sfi/LoginSurface.tsx,src/components/sfi/MethodLabEnvironment.tsx,src/components/sfi/MethodLabExperimentWorkbench.tsx,src/components/sfi/MethodLabInstrumentRoom.module.css,src/components/sfi/MethodLabInstrumentRoom.tsx,src/components/sfi/MethodLabNativeHub.css,src/components/sfi/MethodLabNativeHub.tsx,src/components/sfi/MethodLabPanorama.css,src/components/sfi/MethodLabPanorama.tsx,src/components/sfi/MethodLabResearchReview.tsx,src/components/sfi/MethodLabUnifiedSurface.css,src/components/sfi/MethodLabUnifiedSurface.tsx,src/components/sfi/NewCaseIngress.tsx,src/components/sfi/OAuthIntegrationsSurface.tsx,src/components/sfi/ObservatoryConsole.css,src/components/sfi/ObservatoryConsole.tsx,src/components/sfi/ObservatoryGlobe.tsx,src/components/sfi/ObservatoryProvenanceFeed.tsx,src/components/sfi/ObservatorySemanticGpuLayer.tsx,src/components/sfi/ObservatoryWorldField.tsx,src/components/sfi/ObservatoryWorldLayer.css,src/components/sfi/OperationalTimeline.css,src/components/sfi/OperationalTimeline.tsx,src/components/sfi/PasskeyEnrollment.tsx,src/components/sfi/PasswordResetSurface.tsx,src/components/sfi/PersonalCognitiveLabWorkspace.tsx,src/components/sfi/PublicEntryGateway.css,src/components/sfi/PublicEntryGateway.tsx,src/components/sfi/PublicInstrumentSurface.css,src/components/sfi/PublicInstrumentSurface.tsx,src/components/sfi/PublicSurfaceContinuity.css,src/components/sfi/PublicSurfaceContinuity.tsx,src/components/sfi/RealityChainAuditPanel.tsx,src/components/sfi/RealityChainCaseInspector.tsx,src/components/sfi/RealityChainWorkbench.css,src/components/sfi/RealityChainWorkbench.tsx,src/components/sfi/RootCognitiveFieldPixi.tsx,src/components/sfi/RootEvidenceCandidateLane.tsx,src/components/sfi/RootEvidenceReviewConsole.css,src/components/sfi/RootEvidenceReviewConsole.tsx,src/components/sfi/RootNeuralGraphView.css,src/components/sfi/RootNeuralGraphView.tsx,src/components/sfi/RootOperationalWorkboard.tsx,src/components/sfi/ServiceInquiryForm.tsx,src/components/sfi/SessionControls.tsx,src/components/sfi/SfiConsole.tsx,src/components/sfi/SfiFriccionautaPanel.css,src/components/sfi/SfiFriccionautaPanel.tsx,src/components/sfi/SfiGovernanceWorkspace.tsx,src/components/sfi/SfiNeuralNavigation.css,src/components/sfi/SfiNeuralNavigation.tsx,src/components/sfi/SfiOperatingWorkspace.tsx,src/components/sfi/SfiRootWorkspace.tsx,src/components/sfi/SfiUnifiedSurfaces.css,src/components/sfi/VerifyEmailSurface.tsx,src/components/sfi/publicSceneManifest.ts,src/components/sfi/scenes.ts,src/core/agents/agents.ts,src/core/case-platform/closurePolicy.test.ts,src/core/case-platform/closurePolicy.ts,src/core/case-platform/reportAssembler.test.ts,src/core/case-platform/reportAssembler.ts,src/core/cognitive-twin/canonicalMemoryView.ts,src/core/cognitive-twin/readState.ts,src/core/cognitive-twin/reentry/journal.ts,src/core/contracts/report.ts,src/core/memory/epistemicEventWriter.ts,src/core/memory/institutionalEventPipeline.ts,src/experimental/store/project-manager.ts,src/infrastructure/ai/agentLlmClient.ts,src/lib/actions/generate-protocol.ts,src/lib/agents/amvAgent.ts,src/lib/agents/publicResearch.ts,src/lib/agents/sfiAgents.ts,src/lib/ai/providerRouter.operationBroker.test.ts,src/lib/ai/providerRouter.ts,src/lib/analytics/client.ts,src/lib/auth/actions.ts,src/lib/auth/institutionalAccountAdministration.ts,src/lib/auth/institutionalInvitation.ts,src/lib/auth/institutionalInvitationDelivery.ts,src/lib/auth/neonPasswordBootstrap.ts,src/lib/cognitive-lab/service.ts,src/lib/commercial/commercialService.ts,src/lib/continuity/actionableWorkGate.ts,src/lib/continuity/continuityDataPlanePolicy.test.ts,src/lib/continuity/continuityDataPlanePolicy.ts,src/lib/continuity/contracts.test.ts,src/lib/continuity/contracts.ts,src/lib/continuity/neonHeartbeatStore.ts,src/lib/continuity/operationalAutoAdvance.ts,src/lib/continuity/runtime.test.ts,src/lib/continuity/runtime.ts,src/lib/continuity/scheduledEgressGuard.ts,src/lib/continuity/shadowObserver.ts,src/lib/continuity/studioAutonomy.ts,src/lib/continuity/universalLifecycleGate.test.ts,src/lib/continuity/universalLifecycleGate.ts,src/lib/db/events.ts,src/lib/discovery/canonicalObjectRegistry.ts,src/lib/discovery/crawlerPolicy.ts,src/lib/discovery/discoveryAutonomy.ts,src/lib/discovery/discoveryMesh.ts,src/lib/discovery/discoveryRepository.ts,src/lib/evaluator/derivedMihmRuntime.ts,src/lib/evaluator/scoreFrictionVectorDerivation.test.ts,src/lib/evaluator/scoreFrictionVectorDerivation.ts,src/lib/events/atomicAppend.ts,src/lib/events/eventStore.ts,src/lib/evidence/institutionalInventoryProjection.test.ts,src/lib/evidence/institutionalInventoryProjection.ts,src/lib/evidence/readInstitutionalEvidenceInventory.ts,src/lib/execution/governedExecutionClassification.ts,src/lib/execution/governedExecutionRouter.ts,src/lib/field/contextualReturnContract.ts,src/lib/governance/governanceRuntime.ts,src/lib/governance/readGovernanceHealth.ts,src/lib/governance/thoughtInhibition.ts,src/lib/graph/canonicalGraph.ts,src/lib/graph/cognitiveGraphAdmission.ts,src/lib/graph/knowledgeTimeContrast.test.ts,src/lib/graph/knowledgeTimeContrast.ts,src/lib/graph/libraryCorpusProjection.ts,src/lib/graph/operationalCognitiveProjection.ts,src/lib/graph/realityChainProjection.test.ts,src/lib/graph/realityChainProjection.ts,src/lib/institution/cognitiveActivityDiagnosis.test.ts,src/lib/institution/cognitiveActivityDiagnosis.ts,src/lib/institution/cognitiveSpineAdditionalSources.ts,src/lib/institution/ensureInstitutionalAttractor.ts,src/lib/institution/institutionalAttractor.ts,src/lib/institution/institutionalCycle.ts,src/lib/institution/institutionalEvolution.ts,src/lib/licensing/entitlements.ts,src/lib/mcp/authenticatedGatewayProjection.ts,src/lib/mcp/authenticatedGovernedMachineAdapter.test.ts,src/lib/mcp/authenticatedGovernedMachineAdapter.ts,src/lib/mcp/publicMcpServer.ts,src/lib/mcp/studioMcpServer.ts,src/lib/memory/embeddings.ts,src/lib/method-lab/contracts.ts,src/lib/method-lab/experimentContract.ts,src/lib/method-lab/experimentIds.ts,src/lib/method-lab/experimentPersistence.ts,src/lib/method-lab/externalLabRoute.test.ts,src/lib/method-lab/fieldProjection.ts,src/lib/method-lab/mihmFoundationDiagnostic.test.ts,src/lib/method-lab/mihmFoundationDiagnostic.ts,src/lib/method-lab/mihmFoundationDiagnosticRun.ts,src/lib/method-lab/readModel.ts,src/lib/method-lab/reentryEngine.ts,src/lib/method-lab/registry.ts,src/lib/method-lab/researchAssurance.test.ts,src/lib/method-lab/researchAssurance.ts,src/lib/method-lab/researchObjects.ts,src/lib/method-lab/researchPassportPreview.test.ts,src/lib/method-lab/researchPassportPreview.ts,src/lib/method-lab/researchReviewDossier.test.ts,src/lib/method-lab/researchReviewDossier.ts,src/lib/method-lab/uiProjection.ts,src/lib/mihm/activeObservationQueue.ts,src/lib/mihm/adapters/worldVectorInstrumentAdapter.ts,src/lib/mihm/distributedPhenomena.ts,src/lib/mihm/experimentalTemporalVectorPilot.test.ts,src/lib/mihm/experimentalTemporalVectorPilot.ts,src/lib/mihm/fieldScientificReading.ts,src/lib/mihm/fieldTemporalPersistence.ts,src/lib/mihm/foundationLaggedDynamics.test.ts,src/lib/mihm/foundationLaggedDynamics.ts,src/lib/mihm/foundationObservationCoverage.test.ts,src/lib/mihm/foundationObservationCoverage.ts,src/lib/mihm/foundationProspectiveScoring.test.ts,src/lib/mihm/foundationProspectiveScoring.ts,src/lib/mihm/foundationResearchContract.test.ts,src/lib/mihm/foundationResearchContract.ts,src/lib/mihm/foundationSourceMetrology.test.ts,src/lib/mihm/foundationSourceMetrology.ts,src/lib/mihm/foundationTypedFieldAudit.test.ts,src/lib/mihm/foundationTypedFieldAudit.ts,src/lib/mihm/foundationViabilityRecovery.test.ts,src/lib/mihm/foundationViabilityRecovery.ts,src/lib/mihm/historicalV2Arithmetic.test.ts,src/lib/mihm/instrumentCompatibility.test.ts,src/lib/mihm/instrumentContract.ts,src/lib/mihm/jrFieldCycle.ts,src/lib/mihm/jrFieldReadModel.ts,src/lib/mihm/jrReturnReconciliation.ts,src/lib/mihm/methodSelectionContract.ts,src/lib/mihm/methodSelectionResolver.ts,src/lib/mihm/methodologyRegistry.ts,src/lib/mihm/operationalShadowRead.ts,src/lib/mihm/perturbationReviewQueue.ts,src/lib/mihm/rootCaseMethodology.ts,src/lib/mihm/scientificMethodDispatch.ts,src/lib/mihm/scientificMethodRuntime.test.mjs,src/lib/mihm/scientificMethodRuntime.ts,src/lib/mihm/timelineClocks.ts,src/lib/moph/session-store.ts,src/lib/navigation/publicNavigation.ts,src/lib/observatory/gold/observatoryGoldAdapter.ts,src/lib/observatory/public/readPublicObservatoryState.ts,src/lib/observatory/public/territorialTensions.ts,src/lib/observatory/public/worldSnapshotTimeline.ts,src/lib/observatory/publicState.ts,src/lib/operational/common.ts,src/lib/operations/resourceSelfObservation.test.ts,src/lib/operations/resourceSelfObservation.ts,src/lib/operations/sfiCostMeter.ts,src/lib/persistence/authorityJournalSupersession.ts,src/lib/persistence/continuityRecovery.ts,src/lib/persistence/dataPlaneConfig.ts,src/lib/persistence/dataPlaneContinuityStore.ts,src/lib/persistence/dataPlaneFetch.ts,src/lib/persistence/dataPlaneIdentity.ts,src/lib/persistence/dataPlaneReconciliationControl.ts,src/lib/persistence/dataPlaneRpc.ts,src/lib/persistence/primaryMirror.ts,src/lib/persistence/primaryMirrorCertification.test.ts,src/lib/persistence/primaryMirrorCertification.ts,src/lib/persistence/replicationRetirementPolicy.ts,src/lib/persistence/tenantMemberAuthorityProof.test.ts,src/lib/persistence/tenantMemberAuthorityProof.ts,src/lib/persistence/verifiedObservationReplay.ts,src/lib/public/institutionHistory.ts,src/lib/public/institutionProfile.ts,src/lib/public/sfiServiceCatalog.ts,src/lib/publications/editorialContent.test.ts,src/lib/publications/editorialContent.ts,src/lib/publications/editorialFamilies.ts,src/lib/publications/publicEnglishProjection.ts,src/lib/reports/restrictedEvidenceReports.ts,src/lib/reports/rootReportInbox.ts,src/lib/reports/scheduledAgentReports.ts,src/lib/reports/worldHypothesisClosureReport.ts,src/lib/repository/publicPassportProjection.ts,src/lib/repository/repositoryTemporalProjection.ts,src/lib/root/caseDisplayName.test.ts,src/lib/root/caseDisplayName.ts,src/lib/root/closure/fullCycleVerification.ts,src/lib/root/interactiveDossiers.ts,src/lib/root/interactiveOperationalNext.ts,src/lib/root/interactiveReadModel.ts,src/lib/root/neuralGraphRuntime.ts,src/lib/root/operationalWorkboard.ts,src/lib/root/rootObservationRunner.ts,src/lib/root/server.ts,src/lib/root/telemetry/agentRegistry.ts,src/lib/scorefriction/detectionState.ts,src/lib/scorefriction/python/pythonMihmToOperational.ts,src/lib/scorefriction/regimeWatch.ts,src/lib/scorefriction/store.ts,src/lib/server/actorNodeProjection.ts,src/lib/server/productionBackend.ts,src/lib/server/sfiAssets.ts,src/lib/sfi-psi/store.ts,src/lib/sfi/case-platform/authorityEvidenceReadModel.ts,src/lib/sfi/case-platform/caseProjectAssignment.ts,src/lib/sfi/case-platform/passportReadBoundary.ts,src/lib/sfi/case-platform/repository.ts,src/lib/sfi/case-platform/returnLearningReadModel.ts,src/lib/sfi/case-platform/sourceProtocolReadiness.ts,src/lib/sfi/case-platform/temporalProvenance.ts,src/lib/sfi/case-platform/trajectoryContrastReadModel.ts,src/lib/sfi/caseIntakeResolver.ts,src/lib/sfi/cognitive-runtime/agentDossierRead.ts,src/lib/sfi/cognitive-runtime/cognitiveCycle.ts,src/lib/sfi/cognitive-runtime/eventPersistence.ts,src/lib/sfi/cognitive-runtime/executionReceiptVerification.ts,src/lib/sfi/cognitive-runtime/llmAugmentationPolicy.test.ts,src/lib/sfi/cognitive-runtime/llmAugmentationPolicy.ts,src/lib/sfi/cognitive-runtime/manualExecution.ts,src/lib/sfi/cognitive-runtime/missionCatalog.ts,src/lib/sfi/cognitive-runtime/missionDispatch.ts,src/lib/sfi/cognitive-runtime/observedRuntime.ts,src/lib/sfi/cognitive-runtime/queuedMissionCaseGate.ts,src/lib/sfi/cognitive-runtime/queuedMissionIntake.ts,src/lib/sfi/cognitive-runtime/queuedMissionWorker.ts,src/lib/sfi/cognitive-runtime/registry.ts,src/lib/sfi/cognitive-runtime/runtime.ts,src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts,src/lib/sfi/cognitive-runtime/types.ts,src/lib/sfi/continuityPostgres.ts,src/lib/sfi/cycleTargetRead.test.ts,src/lib/sfi/evidenceRequirementResolver.ts,src/lib/sfi/externalAuth.ts,src/lib/sfi/externalCognitivePeer.ts,src/lib/sfi/indicatorSnapshot.ts,src/lib/sfi/library/documentaryCatalog.ts,src/lib/sfi/oauthClientRegistry.ts,src/lib/sfi/oauthConfig.ts,src/lib/sfi/predictions/agents/closedVerificationOutcome.ts,src/lib/sfi/predictions/agents/evidenceStateAgent.ts,src/lib/sfi/predictions/agents/verificationAgent.ts,src/lib/sfi/predictions/agents/verificationConsistency.test.ts,src/lib/sfi/predictions/verificationService.ts,src/lib/sfi/readPlaneCache.test.ts,src/lib/sfi/readPlaneCache.ts,src/lib/sfi/reality-chain/reconcilePlan.test.ts,src/lib/sfi/reality-chain/reconcilePlan.ts,src/lib/sfi/universalAiSynthesis.ts,src/lib/sfi/universalCalibrationState.ts,src/lib/sfi/universalCycleContinuation.test.ts,src/lib/sfi/universalCycleContinuation.ts,src/lib/sfi/universalEmpiricalContinuation.ts,src/lib/sfi/universalReturnContrastIdempotency.test.ts,src/lib/sfi/universalReturnContrastIdempotency.ts,src/lib/sfi/universalReturnPlanUpgrade.ts,src/lib/sfi/universalSignalCycle.test.ts,src/lib/sfi/universalSignalCycle.ts,src/lib/sfi/worldInterfaceState.ts,src/lib/studio/campaign/studioAutonomyResearchProgram.ts,src/lib/studio/campaign/studioCampaignPilot.ts,src/lib/studio/cultural-lab/agents/mihmAgent.test.ts,src/lib/studio/cultural-lab/agents/mihmAgent.ts,src/lib/studio/cultural-lab/pipeline.ts,src/lib/studio/cultural-lab/types.ts,src/lib/studio/multimodal/textAnalyzer.ts,src/lib/studio/production/studioCulturalLens.ts,src/lib/supabase/readBudget.ts,src/lib/system/access/founderAuthority.test.ts,src/lib/system/access/founderAuthority.ts,src/lib/system/access/institutionalMembers.ts,src/lib/world-observatory/historicalHypothesisAdjudication.test.ts,src/lib/world-observatory/historicalHypothesisAdjudication.ts,src/lib/world-observatory/hypothesisCalibration.ts,src/lib/world-observatory/hypothesisConditionalBranches.ts,src/lib/world-observatory/hypothesisConditionalExplore.test.ts,src/lib/world-observatory/hypothesisConditionalExplore.ts,src/lib/world-observatory/hypothesisCycle.ts,src/lib/world-observatory/hypothesisGenerationBoundary.ts,src/lib/world-observatory/hypothesisTestContract.ts,src/lib/world-vector/operationalState.ts,src/lib/world-vector/persistence.ts,src/lib/world-vector/readModel.ts,src/lib/world-vector/reportBuilder.test.ts,src/lib/world-vector/reportBuilder.ts,src/lib/world-vector/retrospective.ts,src/lib/world-vector/types.ts,src/lib/worldspect/historicalRecovery.ts,src/lib/worldspect/runAdapters.ts,src/lib/worldspect/snapshotStore.ts,src/observatory/field/catalog/mihmRuntimeMatrix.ts,src/observatory/persistence/migrateLocalNodeToSupabase.ts,src/observatory/persistence/supabaseFieldPersistence.ts,src/observatory/publicSurface/content.ts,src/observatory/social/socialReadOnlyIngestion.ts,src/observatory/worldspect/globalWorldSpect.ts,src/proxy.ts,src/runtime/layers/Executor.ts,src/runtime/layers/Gate.ts,src/runtime/layers/IntentLayer.ts,src/runtime/layers/Observer.ts,src/runtime/layers/Planner.ts,src/runtime/layers/Simulator.ts,src/runtime/supabase/client.ts,src/runtime/supabase/server.ts.

### WS-03-007 — SATISFIED
**Objetivo o significado contextual:** Evitar amplificación duplicada de lecturas en el plano Discovery.
**Texto original extraído:** Discovery Control Plane does not create duplicate read amplification.
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-03-008 — IN_PROGRESS
**Objetivo o significado contextual:** Nunca mostrar cero numérico cuando el servicio esté cargando, degradado, no disponible o en error.
**Texto original extraído:** `LOADING`, `DEGRADED`, `UNAVAILABLE`, and `ERROR` never map to numeric zero;
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-03; update #762 with immutable evidence and RETURN state.
**Recibo:** `INVALID` — EXTERNAL_OBSERVATION_REQUIRED.

### WS-03-009 — IN_PROGRESS
**Objetivo o significado contextual:** Exigir contenido estructural auténtico antes de marcar disponible una respuesta HTTP 200 (corrección histórica).
**Texto original extraído:** **Contract-incomplete HTTP 200 payloads** — `AVAILABLE` now requires an endpoint-specific authoritative payload shape. WORLD requires the canonical world collections plus filters/graph; STATE requires its `data` object; TIMELINE requires `frames`. Parseable but incomplete `200` responses classify `DEGRADED`, never as an authoritative empty set.
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-03; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-03-010 — SATISFIED
**Objetivo o significado contextual:** Serializar las lecturas periódicas para evitar consultas simultáneas (corrección histórica).
**Texto original extraído:** **Overlapping interval pulls** — the existing `pull` is serialized with one `inFlight` guard. The existing 20-second timer remains the sole polling owner; ticks are skipped while the previous read is in flight. No retry, second timer, abort loop, endpoint or duplicate read was added.
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-03-011 — IN_PROGRESS
**Objetivo o significado contextual:** No afirmar ausencia de hipótesis cuando el servicio mundial está inaccesible (corrección histórica).
**Texto original extraído:** **False hypothesis absence under unavailable world data** — stale world data continues to be cleared, but FIELD/HYPOTHESES empty-state paths expose explicit world availability. The statement that no hypothesis exists is reachable only under an `AVAILABLE` authoritative world read.
**Fuente del requisito:** [docs/program/workstreams/WS-03-DISCOVERY-MESH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-03-DISCOVERY-MESH.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-03; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-001 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar la ruta existente del manifiesto de interfaces externas (fragmento de propiedad).
**Texto original extraído:** `/api/external/v1/manifest`;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-002 — IN_PROGRESS
**Objetivo o significado contextual:** Reutilizar OAuth, permisos y contratos de clientes existentes.
**Texto original extraído:** OAuth/scopes/external-client contracts;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-003 — IN_PROGRESS
**Objetivo o significado contextual:** Reutilizar las rutas existentes de observación, propuesta, Lab, Studio, casos y ejecución.
**Texto original extraído:** existing observe/propose/lab/studio/cases/execution routes;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-004 — IN_PROGRESS
**Objetivo o significado contextual:** Publicar objetos realmente públicos sin exigir credenciales.
**Texto original extraído:** no authentication secret required for truly public objects;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-005 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir escritura, propuestas o ejecución en la interfaz de sólo lectura.
**Texto original extraído:** no write/propose/execute;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-006 — IN_PROGRESS
**Objetivo o significado contextual:** No exponer datos privados del Gemelo Cognitivo.
**Texto original extraído:** no private Twin state;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-007 — IN_PROGRESS
**Objetivo o significado contextual:** No convertir salidas para máquinas en nuevas pruebas institucionales.
**Texto original extraído:** machine output remains representation, not new institutional evidence.
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-008 — IN_PROGRESS
**Objetivo o significado contextual:** Aprobar los controles de interfaz pública y de sólo lectura.
**Texto original extraído:** public/read-only gate passes;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-009 — IN_PROGRESS
**Objetivo o significado contextual:** Mostrar una identidad institucional canónica estable.
**Texto original extraído:** stable canonical identity is present;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-010 — IN_PROGRESS
**Objetivo o significado contextual:** Ofrecer versión y metadatos completos del paquete.
**Texto original extraído:** package/version metadata is complete;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-011 — SATISFIED
**Objetivo o significado contextual:** Reutilizar contratos de capacidad y pasaportes de WS-01 para ejecutar con permisos.
**Texto original extraído:** WS-01 capability/passport authority contract for adaptive authenticated execution;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-04-012 — IN_PROGRESS
**Objetivo o significado contextual:** Reutilizar OAuth y pasarela externa ya disponibles.
**Texto original extraído:** existing external OAuth/gateway.
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-013 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir escritura en MCP público (prohibición).
**Texto original extraído:** public MCP with write authority;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-014 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir un segundo mecanismo OAuth paralelo (prohibición).
**Texto original extraído:** second OAuth implementation;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-015 — IN_PROGRESS
**Objetivo o significado contextual:** Evitar un segundo origen de autoridad para OpenAPI (prohibición).
**Texto original extraído:** second OpenAPI authority source;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-016 — IN_PROGRESS
**Objetivo o significado contextual:** No permitir que un cliente aumente sus permisos por su capacidad de modelo (prohibición).
**Texto original extraído:** client/model-selected authority expansion;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-017 — IN_PROGRESS
**Objetivo o significado contextual:** Bloquear llamadas a escritura/ROOT desde el servidor MCP público.
**Texto original extraído:** public server cannot invoke write/ROOT routes;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-018 — SATISFIED
**Objetivo o significado contextual:** Mantener denegaciones aunque solicite acceso un modelo avanzado.
**Texto original extraído:** denied scope remains denied even when requested by a high-capability model;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-04-019 — IN_PROGRESS
**Objetivo o significado contextual:** Sincronizar manifiesto, OpenAPI y descripciones MCP.
**Texto original extraído:** manifest/OpenAPI/MCP capability descriptions remain synchronized;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-020 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir filtraciones de información privada por MCP público.
**Texto original extraído:** private Twin/case material cannot leak through public MCP;
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-04-021 — IN_PROGRESS
**Objetivo o significado contextual:** No inventar registros de publicación en directorios externos.
**Texto original extraído:** external directory state is not fabricated.
**Fuente del requisito:** [docs/program/workstreams/WS-04-MACHINE-INTERFACES.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-04-MACHINE-INTERFACES.md). **Responsable declarado:** `SFI-04`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-04; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-001 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar registros comprobables de conferencias y publicaciones.
**Texto original extraído:** conference/publication records;
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-002 — IN_PROGRESS
**Objetivo o significado contextual:** Registrar correctamente el nombre del investigador.
**Texto original extraído:** record researcher name;
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-003 — IN_PROGRESS
**Objetivo o significado contextual:** Mostrar afiliación SFI sólo donde esté respaldada por hechos.
**Texto original extraído:** SFI relationship/affiliation only where factually supportable.
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-004 — IN_PROGRESS
**Objetivo o significado contextual:** Consumir nodos de identidad externos verificados por WS-07.
**Texto original extraído:** WS-07 verified external identity nodes;
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-005 — IN_PROGRESS
**Objetivo o significado contextual:** No utilizar ResearchGate o Zenodo como propietarios canónicos del trabajo.
**Texto original extraído:** ResearchGate/Zenodo treated as canonical owner;
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-006 — IN_PROGRESS
**Objetivo o significado contextual:** No publicar identificador ROR sin verificación real.
**Texto original extraído:** no ROR is emitted before verification;
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-007 — SATISFIED
**Objetivo o significado contextual:** Sincronizar metadatos científicos con versiones y lanzamientos.
**Texto original extraído:** scholarly metadata remains synchronized with version/release state.
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-05-008 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar la responsabilidad de archivos de citación del repositorio (constatación histórica).
**Texto original extraído:** **Repository citation metadata:** no `CITATION.cff` or `.zenodo.json` existed at the baseline. WS-05 now owns only the repository citation file/validation layer; it does not own public canonical research objects.
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-009 — SATISFIED
**Objetivo o significado contextual:** No inventar un método independiente SFS si no existe su registro canónico (constatación histórica).
**Texto original extraído:** **SFS:** no standalone `SFS` method identifier/owner was found in the actual MIHM method registry. The current bounded-system method is `SCOREFRICTION` / `PHI_S`; WS-03 reserves `/methods/sfs`. WS-05 does not silently equate or rename these objects.
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-05-010 — SATISFIED
**Objetivo o significado contextual:** No presentar un evento de conferencia como validación publicada sin evidencia (constatación histórica).
**Texto original extraído:** **Conference/publication relations:** Method Lab contains a private `SFI-CHI27` venue derivative; the public Observatory contains a CIMPS item whose own limit says it must not be represented as published validation without formal acceptance. No verified conference publication relation was promoted by this slice.
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### WS-05-011 — IN_PROGRESS
**Objetivo o significado contextual:** Reservar verificación de Zenodo, ORCID y ROR al propietario WS-07.
**Texto original extraído:** **External identities:** WS-07 remains owner of Zenodo account state, ORCID researcher nodes and future ROR/external identity verification.
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-012 — IN_PROGRESS
**Objetivo o significado contextual:** Verificar si existen publicaciones formales de GitHub Releases antes de citarlas.
**Texto original extraído:** GitHub releases observed: none;
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-013 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar identidad del autor observado en Git.
**Texto original extraído:** Zenodo account/integration state is external and remains owned by WS-07.
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-014 — IN_PROGRESS
**Objetivo o significado contextual:** No inferir licencia en CFF si no hay licencia jurídica en el repositorio.
**Texto original extraído:** observed Git author identity;
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-05-015 — IN_PROGRESS
**Objetivo o significado contextual:** Distinguir integración de cuenta Zenodo de pruebas propias de investigación.
**Texto original extraído:** no inferred CFF license while root `LICENSE` is absent;
**Fuente del requisito:** [docs/program/workstreams/WS-05-RESEARCH-GRAPH.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-05-RESEARCH-GRAPH.md). **Responsable declarado:** `SFI-05`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-05; update #764 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-001 — IN_PROGRESS
**Objetivo o significado contextual:** Reutilizar permisos de Studio en agentes y pasarela externa.
**Texto original extraído:** external agent/gateway Studio scopes;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-002 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar contratos existentes de evidencia material.
**Texto original extraído:** existing material evidence contracts;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-003 — IN_PROGRESS
**Objetivo o significado contextual:** Distinguir identidad de partitura e interpretación al generar audio.
**Texto original extraído:** score/performance identity;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-004 — IN_PROGRESS
**Objetivo o significado contextual:** No utilizar referencias comerciales sin derechos como instrumentos (prohibición).
**Texto original extraído:** commercial reference ripped into an instrument without rights;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-005 — IN_PROGRESS
**Objetivo o significado contextual:** No guardar por defecto audio bruto en la base de datos (prohibición).
**Texto original extraído:** raw audio persisted in DB by default;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-006 — IN_PROGRESS
**Objetivo o significado contextual:** No presentar como operativo un adaptador SFZ incapaz de producir audio (prohibición).
**Texto original extraído:** fake SFZ adapter that never renders;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-007 — IN_PROGRESS
**Objetivo o significado contextual:** No aceptar un resultado musical sin procedencia de partitura, interpretación e instrumento.
**Texto original extraído:** black-box song output with no score/performance/instrument lineage;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-008 — IN_PROGRESS
**Objetivo o significado contextual:** No convertir audio generado en evidencia cultural externa sin observación real.
**Texto original extraído:** generated audio treated as observed cultural evidence by inheritance;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-009 — IN_PROGRESS
**Objetivo o significado contextual:** No tratar servicios generativos externos como autoridad de verdad.
**Texto original extraído:** external generator used as truth authority;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-010 — IN_PROGRESS
**Objetivo o significado contextual:** Impedir sustituir silenciosamente el banco de instrumentos por referencias culturales.
**Texto original extraído:** Instrument Bank and Cultural Reference Bank cannot be silently substituted;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-011 — IN_PROGRESS
**Objetivo o significado contextual:** Bloquear publicación o ejecución restringida mientras los derechos sean desconocidos.
**Texto original extraído:** unknown rights block restricted execution/publication paths;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-012 — IN_PROGRESS
**Objetivo o significado contextual:** Producir audio real y recibo determinista con adaptador SFZ en prueba admitida.
**Texto original extraído:** SFZ adapter produces deterministic receipt and real render artifact in supported test fixture;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-013 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar evidencia de limpieza de archivos efímeros.
**Texto original extraído:** cleanup state is recorded;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-014 — IN_PROGRESS
**Objetivo o significado contextual:** Poder repetir sólo partes fallidas del audio sin regenerar el resto cuando sea posible.
**Texto original extraído:** localized failure can rerender bounded material without regenerating unaffected stems where supported;
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-06-015 — IN_PROGRESS
**Objetivo o significado contextual:** Separar resultados renderizados de observación externa.
**Texto original extraído:** generated/rendered output remains distinct from external observation.
**Fuente del requisito:** [docs/program/workstreams/WS-06-MATERIAL-AUDIO.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-06-MATERIAL-AUDIO.md). **Responsable declarado:** `SFI-06`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-06; update #765 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-07-001 — IN_PROGRESS
**Objetivo o significado contextual:** Mantener el archivo canónico bajo titularidad de SFI.
**Texto original extraído:** canonical archive remains SFI;
**Fuente del requisito:** [docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md). **Responsable declarado:** `SFI-07`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-07; update #766 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-07-002 — IN_PROGRESS
**Objetivo o significado contextual:** No importar contactos o listas ajenas sin consentimiento.
**Texto original extraído:** no imported list without consent.
**Fuente del requisito:** [docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md). **Responsable declarado:** `SFI-07`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-07; update #766 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-07-003 — IN_PROGRESS
**Objetivo o significado contextual:** No crear segunda identidad Medium sin causa probada.
**Texto original extraído:** duplicate Medium identity without cause;
**Fuente del requisito:** [docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md). **Responsable declarado:** `SFI-07`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-07; update #766 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-08-001 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar el recibo histórico de SFI Verify indicado; no hacerlo pasar por prueba del HEAD actual.
**Texto original extraído:** exact-head SFI Verify: `33923289572` / #2342 — `SUCCESS`
**Fuente del requisito:** [docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-08-002 — IN_PROGRESS
**Objetivo o significado contextual:** No conceder autoridad nueva por acciones de aseguramiento.
**Texto original extraído:** authority expansion: `NONE`
**Fuente del requisito:** [docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-08-003 — IN_PROGRESS
**Objetivo o significado contextual:** Usar el documento de retorno de producción #366 como referencia verificable.
**Texto original extraído:** `docs/program/workstreams/WS-08-PRODUCTION-RETURN-366.md`
**Fuente del requisito:** [docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-08-004 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar el recibo histórico del harness de prueba indicado; no equivalerlo a prueba actual.
**Texto original extraído:** SFI Verify on harness-code HEAD: `33949491991` / #2376 — `SUCCESS`
**Fuente del requisito:** [docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### WS-08-005 — IN_PROGRESS
**Objetivo o significado contextual:** Mantener aprobada la frontera contra falsa ausencia de hipótesis.
**Texto original extraído:** hypothesis-absence boundary: `PASS`
**Fuente del requisito:** [docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### LEGACY154-001 — PARTIAL
**Objetivo o significado contextual:** Detectar crisis públicas recientes que potencialmente permitan una intervención legítima SFI.
**Texto original extraído:** outbound observation: discover recent public crises compatible with an SFI intervention;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### LEGACY154-002 — SATISFIED
**Objetivo o significado contextual:** Publicar evidencia seleccionada para que personas interesadas puedan descubrir SFI y proponer investigación o colaboración.
**Texto original extraído:** inbound discovery: publish selected evidence and make SFI, its founder, methods and cases legible to people who may propose work, research, collaboration or funding.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-03`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### LEGACY154-003 — PARTIAL
**Objetivo o significado contextual:** Aplicar antigüedad máxima de 120 días a los eventos candidatos.
**Texto original extraído:** documented event is no more than 120 days old;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### LEGACY154-004 — PARTIAL
**Objetivo o significado contextual:** Preservar evidencia y procedencia de fuentes.
**Texto original extraído:** evidence and provenance;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### LEGACY154-005 — PARTIAL
**Objetivo o significado contextual:** Identificar intervenciones ya ejecutadas cuando haya evidencia (fragmento contextual).
**Texto original extraído:** intervention already implemented, when present;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### LEGACY154-006 — PARTIAL
**Objetivo o significado contextual:** Distinguir evidencia pendiente y evidencia vencida tras 48 horas (fragmento contextual).
**Texto original extraído:** evidence pending and evidence older than 48 hours;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### LEGACY154-007 — IN_PROGRESS
**Objetivo o significado contextual:** Emitir solicitud de evidencia faltante cuando corresponda.
**Texto original extraído:** missing evidence request;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### LEGACY154-008 — IN_PROGRESS
**Objetivo o significado contextual:** Representar evidencia verificada con círculo sólido en la interfaz histórica.
**Texto original extraído:** solid circle: verified evidence;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### LEGACY154-009 — IN_PROGRESS
**Objetivo o significado contextual:** Representar evidencia solicitada/ausente con círculo hueco en la interfaz histórica.
**Texto original extraído:** hollow circle: requested/missing evidence;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### LEGACY154-010 — PARTIAL
**Objetivo o significado contextual:** Mantener publicación e indexación como pasos explícitos (fragmento contextual).
**Texto original extraído:** publishing/indexing.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### LEGACY154-011 — PARTIAL
**Objetivo o significado contextual:** Conservar identificadores de evidencia fuente.
**Texto original extraído:** source evidence ids;
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### LEGACY154-012 — SATISFIED
**Objetivo o significado contextual:** Rechazar como caso calificado todo evento mayor a 120 días.
**Texto original extraído:** Daily execution cannot create a qualified case older than 120 days.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### LEGACY154-013 — PARTIAL
**Objetivo o significado contextual:** Impedir calificación de casos con confianza inferior a 0.85.
**Texto original extraído:** Confidence below 0.85 cannot produce `QUALIFIED`.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### LEGACY154-014 — SATISFIED
**Objetivo o significado contextual:** Tratar artículos sin actor verificado como señales, no como casos.
**Texto original extraído:** An article without a verified actor remains a signal, not a case.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### LEGACY154-015 — IN_PROGRESS
**Objetivo o significado contextual:** Mostrar evidencia urgente y servicios degradados al entrar a ROOT.
**Texto original extraído:** ROOT shows all urgent evidence and degraded surfaces on entry.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### LEGACY154-016 — IN_PROGRESS
**Objetivo o significado contextual:** Devolver cola priorizada de cierres desde ProjectExecutionManagerAgent, no sólo conteos.
**Texto original extraído:** ProjectExecutionManagerAgent returns a ranked closure queue, not only counts.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #767 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### LEGACY154-017 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar genealogía y aprobación humana en PDFs e imágenes generadas.
**Texto original extraído:** PDF and image generation preserve evidence lineage and human approval.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### LEGACY154-018 — IN_PROGRESS
**Objetivo o significado contextual:** No divulgar evidencia privada ni publicar automáticamente.
**Texto original extraído:** Public distribution cannot expose private evidence or publish automatically.
**Fuente del requisito:** [docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md](https://github.com/Aptymok/system-friction/blob/4e25d7a6276c6c875fd22a3b9b0ca489abc237ea/docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #763 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### ISSUE154-001 — SATISFIED
**Objetivo o significado contextual:** Operar o verificar la capacidad WorldSignalObserverAgent definida en expediente #154.
**Texto original extraído:** `WorldSignalObserverAgent`
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### ISSUE154-002 — PARTIAL
**Objetivo o significado contextual:** Aplicar límite obligatorio de antigüedad de 120 días.
**Texto original extraído:** <=120 day hard gate
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### ISSUE154-003 — PARTIAL
**Objetivo o significado contextual:** Aplicar umbral obligatorio de confianza de 0.85 para calificar eventos.
**Texto original extraído:** >=0.85 qualification hard gate
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### ISSUE154-004 — SATISFIED
**Objetivo o significado contextual:** No inventar entidades, personas, contactos ni evidencia.
**Texto original extraído:** no fabricated entity/person/contact/evidence
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### ISSUE154-005 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar tipos de nodos y colores de urgencia en el grafo de casos.
**Texto original extraído:** evidence/strategy/task/prediction/outcome node shapes and urgency colors
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### ISSUE154-006 — IN_PROGRESS
**Objetivo o significado contextual:** Preparar brief de portada con identidad canónica SFI.
**Texto original extraído:** cover-generation brief with SFI identity
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-07`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-07; update #766 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### ISSUE154-007 — IN_PROGRESS
**Objetivo o significado contextual:** Usar proveedor real de imágenes únicamente cuando esté configurado.
**Texto original extraído:** actual image provider adapter only when configured
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### ISSUE154-008 — PARTIAL
**Objetivo o significado contextual:** Guardar información privada con versiones y procedencia sólo en ROOT.
**Texto original extraído:** private ROOT-only storage, versioning and provenance
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### ISSUE154-009 — IN_PROGRESS
**Objetivo o significado contextual:** Conservar metadatos canónicos y datos estructurados de identidad.
**Texto original extraído:** canonical metadata and structured identity
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-07`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-07; update #766 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### ISSUE154-010 — PARTIAL
**Objetivo o significado contextual:** Coordinar agentes de publicación, búsqueda y borradores de distribución con permisos propios.
**Texto original extraído:** AuthorityPublishing, SearchPresence and Distribution draft agents
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### ISSUE154-011 — PARTIAL
**Objetivo o significado contextual:** Prohibir publicaciones o contactos externos automáticos.
**Texto original extraído:** no automatic publication or contact
**Fuente del requisito:** [GitHub issue #154](https://github.com/Aptymok/system-friction/issues/154). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.
**Acción posterior:** Dispatch a bounded verification/completion slice to SFI-00; presence is not accepted as operational proof.
**Recibo:** `ABSENT`.

### CTRL405-001 — SATISFIED
**Objetivo o significado contextual:** Considerar defecto todo requisito incompleto que no tenga una trayectoria activa para cerrarlo.
**Texto original extraído:** `KNOWN_INCOMPLETE AND NO_ACTIVE_COMPLETION_TRAJECTORY = DEFECT`
**Fuente del requisito:** [GitHub issue #405 accepted control directives](https://github.com/Aptymok/system-friction/issues/405). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### CTRL405-002 — SATISFIED
**Objetivo o significado contextual:** Considerar defecto todo fallo observado sin trayectoria de reparación.
**Texto original extraído:** `OBSERVED_DEFECT AND NO_REPAIR_TRAJECTORY = DEFECT`
**Fuente del requisito:** [GitHub issue #405 accepted control directives](https://github.com/Aptymok/system-friction/issues/405). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### CTRL405-003 — SATISFIED
**Objetivo o significado contextual:** Considerar defecto toda capacidad requerida sin trayectoria de generación.
**Texto original extraído:** `REQUIRED_CAPABILITY AND NO_GENERATION_TRAJECTORY = DEFECT`
**Fuente del requisito:** [GitHub issue #405 accepted control directives](https://github.com/Aptymok/system-friction/issues/405). **Responsable declarado:** `SFI-01`.
**Comprobación exigida por el controlador:** Already met by the bound RETURN_PASS receipt; changes inside its declared regression scope invalidate it.
**Acción posterior:** Preserve evidence and observe scoped regression/RETURN conditions; reopen only on falsifying evidence.
**Recibo:** `VALID`.

### CTRL405-004 — IN_PROGRESS
**Objetivo o significado contextual:** Permitir observación, reconstrucción, análisis, prueba, reparación acotada y aprendizaje candidato sin intervención soberana ROOT cuando las reglas actuales ya lo permiten.
**Texto original extraído:** OBSERVE / RECONSTRUCT / ANALYZE / HYPOTHESIZE / TEST / BOUNDED REPAIR / GENERATE / RETURN / LEARN-candidate: no ROOT gate.
**Fuente del requisito:** [GitHub issue #405 accepted control directives](https://github.com/Aptymok/system-friction/issues/405). **Responsable declarado:** `SFI-08`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-08; update #762 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.

### CTRL405-005 — IN_PROGRESS
**Objetivo o significado contextual:** Reservar altas, promociones o cambios institucionales a una decisión expresa de ROOT con aceptación, denegación o solicitud de más evidencia.
**Texto original extraído:** ADD / PROMOTE / institutional mutation: ROOT report -> ACCEPT / DENY / REQUIRE MORE EVIDENCE.
**Fuente del requisito:** [GitHub issue #405 accepted control directives](https://github.com/Aptymok/system-friction/issues/405). **Responsable declarado:** `SFI-00`.
**Comprobación exigida por el controlador:** Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.
**Acción posterior:** Continue bounded implementation/verification through SFI-00; update #793 with immutable evidence and RETURN state.
**Recibo:** `ABSENT`.