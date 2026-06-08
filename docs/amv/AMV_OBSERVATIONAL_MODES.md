# AMV Observational Modes

## Objetivo

Definir el lenguaje comun para que cualquier scope AMV observe con las mismas categorias antes de renderizar, inferir o proponer.

AMV reconoce trece modos observacionales:

| Modo | Pregunta | Uso | Limite |
| --- | --- | --- | --- |
| `audit` | Que ocurrio internamente y que linaje lo sostiene? | Trazabilidad, fallos, cambios, eventos internos y evidencia secundaria. | No gobierna la experiencia principal ni alimenta regimen por si mismo. |
| `mihm` | Que objeto esta siendo observado homeostaticamente? | Lectura homeostatica del objeto declarado. | Sin objeto observado queda incompleto. |
| `worldspect` | Como esta el mundo observado? | Lectura de campo externo, fuentes, timestamp y degradacion. | No presenta fuente degradada, missing o simulada como observacion fuerte. |
| `focus` | Que variable focal cambia ruta, riesgo o cierre? | Aislar una variable operacional y decidir si cambia la ruta. | Inferencias solo se muestran si cambian ruta, riesgo o cierre. |
| `longitudinal` | Como cambia el fenomeno en el tiempo? | Continuidad, tendencia, memoria y variacion temporal. | Serie incompleta no se promueve a tendencia fuerte. |
| `comparative` | Que cambia al comparar objetos, escenarios o cortes? | Contraste bajo criterios equivalentes. | Requiere fuentes y criterios comparables. |
| `counterfactual` | Que habria cambiado bajo otra condicion? | Alternativas no observadas. | Permanece sandbox; no alimenta regimen. |
| `forensic` | Que linaje, falla o contaminacion explica el estado observado? | Reconstruccion de secuencia, evidencia y responsabilidad tecnica. | No acusa intencion sin soporte. |
| `diagnostic` | Que condicion explica mejor el estado actual? | Condicion operativa con soporte visible. | Diagnostico no ejecuta intervencion. |
| `predictive` | Que podria pasar si la tendencia continua? | Proyeccion de riesgo u oportunidad. | Prediccion no es hecho observado. |
| `prescriptive` | Que ruta conviene proponer bajo el contrato visible? | Recomendacion o plan revisable. | Recomienda; no ejecuta. |
| `retrospective` | Que se aprende de lo ya ocurrido? | Eventos pasados, cierre y deuda restante. | No reescribe memoria ni linaje. |
| `prospective` | Que condiciones futuras deben observarse? | Vigilancia, umbrales y senales tempranas. | No crea obligaciones externas ni dashboards. |

El vocabulario fuente vive en `src/lib/amv/core/observationModes.ts`.

## Objetos observables

El vocabulario comun vive en `src/lib/amv/core/observableObjectTypes.ts`:

`persona`, `cancion`, `demo`, `artista`, `campana`, `institucion`, `cluster`, `fenomeno`, `senal`, `documento`, `evidencia`, `decision`, `accion`, `red`, `especie`, `municipio`, `ecosistema`.

## Focus Variables

El vocabulario comun vive en `src/lib/amv/core/focusVariableTypes.ts`:

`cultural`, `ritmo`, `genero`, `dolencia_social`, `letra`, `densidad_emocional`, `energia_corporal`, `friccion_institucional`, `latencia`, `deuda`, `protoatractor`, `eyector`, `riesgo`, `ejecucion`.

## Declaracion por scope

Un scope declara sus modos en la spec:

```ts
observationModes: [...AMV_OBSERVATION_MODES],
observableObjects: ['persona', 'senal', 'evidencia', 'decision', 'accion'],
focusVariables: ['riesgo', 'latencia', 'deuda', 'ejecucion'],
evidenceTrust: ['verified', 'declared', 'inferred'],
```

Cada panel puede reducir ese conjunto con `observationMode`, `observableObjects`, `focusVariables` y `evidenceTrust`.

## ROOT

ROOT declara los trece modos desde `src/lib/amv/scopes/root/rootDashboardSpec.ts`.

No se creo dashboard nuevo. La declaracion se agrego al instrumento y a los paneles existentes para que ROOT observe con el contrato AMV comun.
