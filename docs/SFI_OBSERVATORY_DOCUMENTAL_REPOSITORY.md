# SFI Observatory Documental Repository

Status: implemented as an operational pass inside `SfiObservatoryOS`.

The observatory is organized as:

- Campo Vivo: graph, runtime state, governance lock and causal memory.
- Repositorio Documental: evidence entries with state, source, visibility, regime and interpretation limit.
- Matriz de Atractores: public attractors only; private ACP founder vector is not exposed publicly.
- Regimen / Perturbacion / Salto: readiness metrics and threshold language.

Evidence schema:

```json
{
  "evidence_id": "SFI-EVD-0001",
  "title": "string",
  "type": "document | post | agreement | issue | pr | brief | image | audio | note | event | artifact",
  "source": "black_envelope | notebook | atlas | site | observatory | github | external | manual",
  "timestamp": "ISO-8601",
  "field_density": 0.0,
  "evidence_weight": 0.0,
  "confidence": 0.0,
  "regime": "threshold | audit | observatory | resolution | mutation | projection",
  "attractors": ["string"],
  "nodes": ["PERC", "CULT", "INF", "AGT"],
  "linked_artifacts": ["string"],
  "status": "raw | reviewed | weighted | projected | canonized | rejected | sealed",
  "visibility": "public | licensed | acp | private",
  "interpretation_limit": "string"
}
```

Readiness formula:

```txt
Regime Jump Readiness =
0.20 Authority Density
+ 0.20 Evidence Coherence
+ 0.15 Field Persistence
+ 0.15 Public Observability
+ 0.10 Canon Stability
+ 0.10 Attractor Alignment
+ 0.10 Invitation Probability
```

Thresholds:

- `0.00-0.39`: Campo disperso.
- `0.40-0.59`: Campo emergente.
- `0.60-0.74`: Campo operativo.
- `0.75-0.84`: Campo con autoridad.
- `0.85-1.00`: Salto de regimen.

Governance:

- Observation, weighing, projection and proposal may happen without irreversible mutation.
- Irreversible changes remain behind governance/ACP.
- Public preview does not expose ACP tools, private projections or founder vector.
