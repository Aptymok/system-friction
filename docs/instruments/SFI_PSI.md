# SFI-PSI · Persistent Signal Instrument

## Definición

SFI-PSI es el instrumento longitudinal de System Friction Institute para detectar, registrar, medir y visualizar señales persistentes que reaparecen a través de texto, imagen, audio, eventos, bitácora, ScoreFriction, WorldSpect, Atlas, ROOT y otros soportes.

Una señal persistente no es contenido repetido. Es una forma que reaparece con suficiente similitud a través del tiempo, modalidad y contexto como para conservar identidad sin depender de explicación humana constante.

## Diferencia con MIHM

MIHM mide el régimen dinámico del sistema. PSI mide qué señal sobrevive al ruido.

MIHM describe el estado operativo y dinámico del campo. PSI registra identidad longitudinal: aquello que reaparece, conserva forma suficiente y acumula manifestaciones observables.

## Diferencia con ScoreFriction

ScoreFriction observa fricciones, vectores culturales, proto-atractores y trayectorias asociadas a casos o fenómenos específicos.

PSI no reemplaza ScoreFriction. PSI puede recibir manifestaciones provenientes de ScoreFriction, WorldSpect, ROOT, Atlas, bitácora o cargas manuales, y convertirlas en una trayectoria transversal de señal persistente.

## Entidades

- `persistent_signals`: identidad estable de la señal.
- `signal_manifestations`: apariciones observadas de esa señal en un soporte, fuente o modalidad.
- `signal_hash`: identidad determinística v1 derivada de contenido, etiqueta, fuente o hash explícito.
- `modalities`: soportes que sostienen la persistencia: texto, imagen, audio, video, evento, mixto o desconocido.

## Flujo operacional

1. Una fuente manifiesta una señal con `source_type` y al menos una identidad: `content`, `content_hash`, `label` o `source_id`.
2. PSI infiere o recibe `signal_hash`.
3. Si la señal no existe, crea una fila en `persistent_signals`.
4. PSI inserta una fila en `signal_manifestations`.
5. PSI recalcula ocurrencias, primera y última aparición, modalidades, persistencia, deriva, entropía y estado.
6. ROOT consume `/api/signals/state` y muestra el campo PSI sin alterar ScoreFriction, MIHM ni WorldSpect.

## Estados

- `latent`: señal registrada, todavía sin persistencia suficiente.
- `emerging`: señal con persistencia inicial relevante.
- `crystallizing`: señal con persistencia alta y soporte cross-modal.
- `consolidated`: señal de persistencia fuerte y repetición longitudinal suficiente.
- `degraded`: señal con ocurrencias pero baja persistencia.

## Métricas

- `occurrence_count`: número de manifestaciones registradas.
- `persistence_score`: combinación v1 de ocurrencia, tiempo, similitud y modalidades.
- `cross_modal_score`: proporción simple de diversidad modal.
- `drift_score`: inverso de la similitud promedio.
- `entropy_score`: inverso de la persistencia.

La fórmula v1 es deliberadamente simple y trazable:

```txt
occurrenceFactor = min(1, occurrence_count / 12)
modalFactor = min(1, unique_modalities_count / 4)
timeFactor = min(1, days_between_first_last / 30)
similarityFactor = average_manifestation_similarity

persistence_score = 0.35 * occurrenceFactor + 0.30 * timeFactor + 0.20 * similarityFactor + 0.15 * modalFactor
cross_modal_score = modalFactor
drift_score = 1 - similarityFactor
entropy_score = 1 - persistence_score
```

## Limitaciones v1

- No usa embeddings reales todavía.
- `embedding` existe como JSON opcional para compatibilidad futura.
- La similitud usa el valor recibido o un fallback determinístico asociado al hash.
- No hay RLS específico hasta confirmar un patrón consistente para estas tablas públicas del observatorio.
- No ejecuta agentes, procesos autónomos ni publicación automática.

## Próximo paso: embeddings reales y visualización longitudinal

El siguiente paso es agregar embeddings reales cuando exista un contrato estable de generación y almacenamiento. Después, PSI puede incorporar visualización longitudinal por trayectoria, comparación entre modalidades y lectura temporal de deriva sin convertir ROOT en un dashboard paralelo.
