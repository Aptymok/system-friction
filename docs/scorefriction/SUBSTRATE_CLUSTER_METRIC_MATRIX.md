# ScoreFriction Substrate-Cluster-Metric Matrix

## Estado

Contrato operativo para convertir ScoreFriction en motor multi-sustrato.

## Proposito

Este documento define como se identifica que se evalua, que clusters se activan, que metricas dependen de esos clusters, que indices se calculan y que dominios quedan afectados.

La regla central es:

```text
substrate -> clusters -> metrics -> indices -> domains -> reading -> hypothesis
```

ScoreFriction no debe asumir que todo objeto observado es una cancion, un texto cultural o una senal de plataforma. Primero debe identificar el sustrato.

## Sustratos

Los sustratos base son:

- `text`
- `audio`
- `image`
- `video`
- `conversation`
- `document`
- `repository`
- `operation`
- `event`
- `world_domain`
- `multimodal`

### Text subtypes

`text` puede contener:

- `lyrics`
- `poem`
- `book_fragment`
- `post`
- `conversation_transcript`
- `manifesto`
- `report`
- `institutional_text`
- `technical_document`
- `fragment`

`lyrics` no es un sustrato raiz. Es un subtipo de `text`.

## Clusters

Los clusters de analisis son:

- `semantic`
- `narrative`
- `acoustic`
- `visual`
- `temporal`
- `relational`
- `institutional`
- `operational`
- `economic`
- `digital`
- `cultural`
- `affective`
- `world`
- `repository`
- `multimodal_coupling`

## Matriz sustrato-cluster

```text
text          -> semantic, narrative, temporal, affective, cultural
text.lyrics   -> semantic, narrative, temporal, affective, cultural, multimodal_coupling when paired with audio
audio         -> acoustic, temporal, affective, cultural
image         -> visual, cultural, affective
video         -> visual, temporal, acoustic, narrative, cultural
conversation  -> semantic, relational, temporal, affective
ocument       -> semantic, institutional, operational, temporal
repository    -> repository, operational, digital, temporal, institutional
operation     -> operational, economic, temporal, institutional, cultural
event         -> temporal, cultural, institutional, affective, world
world_domain  -> world, cultural, economic, institutional, digital
multimodal    -> clusters from each modality plus multimodal_coupling
```

Nota: si un sustrato es `multimodal`, ScoreFriction no promedia ciegamente. Primero evalua cada modalidad y luego calcula el acoplamiento entre ellas.

## Matriz cluster-metrica

```text
semantic      -> semantic_density, conflict_density, contradiction_load, referential_anchor
narrative     -> closure_index, motif_recurrence, declarative_intent, narrative_drift
acoustic      -> F_s, D_i, G_f, C_s, D_cog, E_r, V_i, I_mc, Phi
visual        -> visual_density, contrast_load, anomaly_presence, symbolic_coherence
relational    -> reciprocity, response_latency, repair_attempts, asymmetry_index
temporal      -> LDI, latency, persistence, decay_rate, sequence_integrity
institutional -> NTI, traceability, authorization_gap, R18_trigger, compliance_gap
operational   -> execution_gap, repeatability, throughput, failure_rate, operator_load
economic      -> margin, cost_variance, demand_signal, runway, waste_ratio
digital       -> platform_signal, propagation_rate, attention_density, source_coverage
cultural      -> symbolic_recurrence, attention_sync, narrative_transport, ritual_density
affective     -> affective_load, volatility, stabilization_signal, saturation_risk
world         -> WSV, WSI, source_coverage, degradation_ratio, domain_quorum
repository    -> branch_divergence, commit_latency, issue_drift, review_lag
multimodal_coupling -> modality_alignment, modality_contradiction, transport_gap
```

## Matriz metrica-indice

```text
LDI                 -> Fs, IHG, Runway
NTI                 -> IHG, Fs, R18
execution_gap       -> Fs, MOPH_score
repeatability       -> MOPH_score, IHG
semantic_density    -> SCI, TCI
conflict_density    -> Fs, affective_load
F_s                 -> Fs
C_s                 -> IHG
V_i                 -> NTI
margin              -> MOPH_score
waste_ratio         -> MOPH_score, Fs
demand_signal       -> MOPH_score
platform_signal     -> DTR, WSV
source_coverage     -> SCI, WSV
modality_alignment  -> TCI, DTR
transport_gap       -> DTR, Fs
```

## Indices

- `Fs`: friccion sistemica.
- `IHG`: indice de homeostasis global u holistica.
- `NTI`: indice de tension neta o trazabilidad intencional, segun contexto.
- `LDI`: indice de latencia/disipacion.
- `WSV`: persistencia vectorial del campo observado.
- `DTR`: transporte entre dominios.
- `TCI`: coherencia de transporte.
- `SCI`: confianza del sustrato.
- `MOPH_score`: prueba operativa minima de homeostasis.
- `R18`: regla de intervencion cuando NTI cae bajo umbral critico.

## Ejemplo: REM618

```text
substrate = multimodal(audio + text)
clusters = acoustic, semantic, temporal, cultural, affective, multimodal_coupling
metrics = F_s, D_i, G_f, C_s, D_cog, E_r, V_i, I_mc, Phi, R_sem, C_sem, motif_recurrence, platform_signal
indices = Fs, IHG, NTI, DTR, WSV coupling
```

## Ejemplo: carreta de tacos

```text
substrate = operation
clusters = operational, economic, temporal, institutional, cultural
metrics = demand_signal, margin, waste_ratio, service_latency, repeatability, permit_risk, operator_load, cold_public_ratio
indices = MOPH_score, Fs, NTI, LDI, IHG
```

## Ejemplo: conversacion

```text
substrate = conversation
clusters = semantic, relational, temporal, affective
metrics = response_latency, reciprocity, topic_drift, repair_attempts, contradiction_load, closure_failure, asymmetry_index
indices = Fs, NTI, IHG, LDI
```

## Reglas

1. ScoreFriction identifica sustrato antes de medir.
2. `lyrics` se trata como subtipo de `text`.
3. Un sustrato activa clusters, no metricas sueltas.
4. Un cluster activa metricas.
5. Las metricas alimentan indices.
6. Los indices producen lectura operacional.
7. Una lectura puede producir hipotesis verificable.
8. Ninguna hipotesis recalibra pesos globales sin aprobacion de `/root`.

## Cierre

Esta matriz convierte ScoreFriction en un motor transversal. La evaluacion deja de depender del tipo de archivo y empieza a depender del contrato entre sustrato, cluster, metrica, indice y dominio.
