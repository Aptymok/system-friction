# ScoreFriction Universal Engine

## Estado

Documento de formalización técnica y operativa.

## Propósito

Este documento redefine ScoreFriction como motor transversal de evaluación de fricción, no como módulo exclusivamente cultural o musical.

ScoreFriction debe evaluar cualquier sustrato observable: canción, texto, poema, libro, post, conversación, imagen, video, evento, repositorio, organización, operación, dominio mundial o prueba MOPH.

## Definición

ScoreFriction es el motor de puntuación, comparación, contraposición y calibración de fricción del System Friction Institute.

`Score` significa cifra, índice, magnitud, promedio ponderado, distancia, probabilidad o puntuación normalizada.

`Friction` significa divergencia entre intención declarada, ejecución observable, persistencia, saturación, brecha oculta y transporte entre dominios.

ScoreFriction no califica gusto, estética o preferencia. ScoreFriction mide fricción.

## Principio operativo

Antes de evaluar, ScoreFriction debe identificar qué se está evaluando.

No debe asumir que todo texto es `lyrics`.
No debe asumir que toda canción es cultura.
No debe asumir que todo valor alto es positivo.
No debe asumir que todo valor bajo es falla.
No debe emitir lectura fuerte si no puede explicar qué variable produjo el diagnóstico.

## Sustratos soportados

Tipo primario:

- `audio`
- `text`
- `image`
- `video`
- `conversation`
- `document`
- `event`
- `repository`
- `organization`
- `operation`
- `world_domain`
- `multimodal`

Subtipos de texto:

- `lyrics`
- `poem`
- `book_fragment`
- `post`
- `conversation_transcript`
- `manifesto`
- `technical_document`
- `institutional_text`
- `report`
- `fragment`

Regla: `lyrics` es subtipo de `text`, no categoría universal.

## Pipeline universal

```text
raw_signal
  -> identify_substrate
  -> extract_features
  -> normalize_features
  -> map_features_to_nodes
  -> map_nodes_to_clusters
  -> map_clusters_to_domains
  -> compute_indices
  -> compute_counterposition
  -> propose_hypothesis
  -> define_verification_plan
  -> record_evidence
  -> calibrate_if_verified
```

## Capas de análisis

### C1. Identificación de sustrato

Determina el tipo de objeto observado.

Salida mínima:

```ts
{
  substrate_kind: string;
  substrate_subtype?: string;
  modalities: string[];
  confidence: number;
  reason: string[];
}
```

### C2. Extracción de features

Cada sustrato activa extractores propios.

Audio:
- fricción sistémica acústica
- densidad de interacción
- gradiente de fricción
- coherencia sistémica
- desfase cognitivo
- energía relacional
- vector intencional
- interacción multicanal
- potencial de salto

Texto:
- resonancia semántica
- campo semántico
- densidad de conflicto
- contradicción
- densidad modal
- recurrencia simbólica
- trazabilidad de intención
- cierre narrativo

Imagen:
- densidad visual
- contraste
- saturación
- foco
- ruido
- anomalía compositiva
- coherencia simbólica

Video:
- persistencia visual
- sincronía audio-imagen
- corte
- velocidad
- recurrencia de motivos
- densidad temporal

Conversación:
- reciprocidad
- latencia de respuesta
- deriva temática
- intentos de reparación
- asimetría
- compromiso declarado
- cierre fallido

Repositorio:
- latencia de issues
- ramas activas
- commits
- pull requests
- deuda técnica
- divergencia roadmap-ejecución

Operación/MOPH:
- demanda
- margen
- repetibilidad
- merma
- latencia
- riesgo operativo
- trazabilidad

### C3. Nodos

Cada feature se convierte en nodo evaluable.

Ejemplos:

- `semantic_density`
- `conflict_density`
- `symbolic_recurrence`
- `audio_text_coupling`
- `motif_persistence`
- `response_latency`
- `topic_drift`
- `visual_noise`
- `commit_latency`
- `operational_margin`
- `moph_repetition_viability`

### C4. Clusters

Los nodos se agrupan en clusters de análisis:

- acústico
- semántico
- visual
- temporal
- relacional
- institucional
- digital
- cultural
- operativo
- económico
- climático
- afectivo

### C5. Dominios

Cada cluster alimenta dominios SFI.

Dominios mínimos:

- `AFFECTIVE`
- `BIO`
- `CLIMATE`
- `CULTURAL`
- `ECONOMY`
- `NEO_DIGITAL`
- `INSTITUTIONAL`
- `OPERATIONAL`
- `RELATIONAL`

## Matriz nodo-dominio

La matriz nodo-dominio define cuánto pesa cada nodo sobre cada dominio.

Forma:

```text
D_d(A) = Σ w_nd · N_n(A)
```

Donde:

- `D_d(A)` es el valor del dominio `d` para el artefacto `A`.
- `N_n(A)` es el valor del nodo `n`.
- `w_nd` es el peso del nodo `n` sobre dominio `d`.

La matriz debe ser versionada y gobernada desde `/root`.

## Índices obligatorios

Toda evaluación debe producir, cuando exista evidencia suficiente:

- `Fs`: fricción sistémica del sustrato.
- `NTI`: trazabilidad normalizada.
- `IHG`: coherencia homeostática.
- `LDI`: decaimiento longitudinal o latencia de resolución.
- `WSV`: persistencia vectorial en relación con mundo/dominio.
- `TCI`: coherencia transdominio.
- `DTR`: transporte entre dominios.
- `SRI`: riesgo de saturación.
- `HGI`: índice de brecha oculta.
- `SCI`: confianza de cobertura del sustrato.

## Contraposición

Toda evaluación debe generar contraposición.

Contraposiciones mínimas:

1. Declarado vs observado.
2. Observado vs óptimo relativo.
3. Valor alto vs saturación.
4. Valor bajo vs silencio funcional.
5. Dominio dominante vs dominio ausente.
6. Evidencia disponible vs evidencia faltante.
7. Hipótesis vs condición de refutación.

## Reglas semánticas

- Valor alto no significa bien.
- Valor bajo no significa mal.
- `1` significa máxima activación o proximidad al óptimo relativo del eje, no bienestar absoluto.
- `0` significa núcleo, ausencia, silencio, falta de activación o colapso de expresión, según contexto.
- La estabilidad puede ser coherencia, bloqueo, habituación, compensación o saturación.
- La cultura puede simular equilibrio por evento masivo.
- La IA narra; ScoreFriction mide.

## Objeto canónico

```ts
export type ScoreFrictionEvaluation = {
  evaluation_id: string;
  substrate: {
    kind: 'audio' | 'text' | 'image' | 'video' | 'conversation' | 'document' | 'event' | 'repository' | 'organization' | 'operation' | 'world_domain' | 'multimodal';
    subtype?: string;
    modalities: string[];
    confidence: number;
    evidence_hash: string;
  };
  declared_intent: string | null;
  features: Record<string, number | null>;
  nodes: Record<string, number | null>;
  clusters: Record<string, {
    score: number | null;
    confidence: number;
    nodes: string[];
  }>;
  domain_vector: Record<string, number | null>;
  counterposition: {
    gap_to_core: Record<string, number>;
    gap_to_optimum: Record<string, number>;
    saturation_risk: Record<string, number>;
    hidden_domain_risk: Record<string, number>;
    declared_vs_observed: string[];
  };
  indices: {
    Fs: number | null;
    NTI: number | null;
    IHG: number | null;
    LDI: number | null;
    WSV: number | null;
    TCI: number | null;
    SRI: number | null;
    HGI: number | null;
    SCI: number | null;
  };
  domain_transport: Array<{
    from: string;
    to: string;
    strength: number;
    lag?: number;
    interpretation: string;
  }>;
  reading_contract: {
    evidence: string[];
    inference: string[];
    counter_hypothesis: string[];
    falsification_condition: string[];
    recommended_observation: string[];
    prohibited_claims: string[];
  };
};
```

## Hipótesis

ScoreFriction puede proponer hipótesis, pero toda hipótesis debe ser verificable.

```ts
export type ScoreFrictionHypothesis = {
  hypothesis_id: string;
  source_evaluation_id: string;
  statement: string;
  expected_change: Record<string, number | string>;
  verification_window_hours: number;
  required_evidence: string[];
  falsification_condition: string[];
  status: 'draft' | 'proposed' | 'approved' | 'running' | 'verified' | 'falsified' | 'archived';
  owner_interface: '/root' | '/studio' | '/field';
  requires_root_approval: boolean;
};
```

## Autocalibración

La autocalibración no debe ser libre ni opaca.

Debe ocurrir solo cuando:

1. Existe hipótesis registrada.
2. Existe ventana temporal definida.
3. Existe evidencia de verificación.
4. Existe error medible entre predicción y resultado.
5. `/root` autoriza o permite el ajuste.

Ciclo:

```text
hypothesis
  -> prediction
  -> observation
  -> verification
  -> error
  -> calibration_proposal
  -> root_gate
  -> weight_update
  -> ledger
```

## Interfaz por ruta

- `/studio`: crea evaluaciones, prototipos y propuestas.
- `/field`: aplica evaluaciones y MOPH con usuarios externos.
- `/root`: gobierna pesos, hipótesis, calibración y auditoría.

## Criterio de implementación

Este documento se considera implementado cuando el repo tenga:

1. `substrate-classifier`.
2. `cluster-registry`.
3. `node-domain-matrix`.
4. `counterposition-engine`.
5. `hypothesis-registry`.
6. `calibration-ledger`.
7. `moph-evaluator`.
8. `studio-workflow`.
9. `field-application-flow`.
10. `root-governance-console`.

## Cierre

ScoreFriction debe quedar como motor universal del Instituto.

No pertenece solo a música.
No pertenece solo a cultura.
No pertenece solo a dashboards.

ScoreFriction mide fricción de cualquier sustrato bajo contrato, evidencia, contraposición, hipótesis y calibración gobernada.
