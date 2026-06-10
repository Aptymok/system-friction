from math import exp, log

def clamp01(x):
    try:
        x = float(x)
    except Exception:
        return 0.0
    return max(0.0, min(1.0, x))

def evaluate_mihm(payload):
    evidence = payload.get("evidence") or []
    vectors = payload.get("vectors") or {}
    worldspect = payload.get("worldspect") or {}

    evidence_count = len(evidence)
    trust_values = []
    ldi_values = []

    for item in evidence:
        if isinstance(item, dict):
            trust_values.append(clamp01(item.get("trust_score", item.get("trust", 0.35))))
            ldi_values.append(clamp01(item.get("ldi", 0.5)))

    trust = sum(trust_values) / max(1, len(trust_values))
    decay = sum(ldi_values) / max(1, len(ldi_values))

    world_pressure = 0.0
    if isinstance(worldspect, dict):
        world_pressure = clamp01(worldspect.get("nti", worldspect.get("wsi", 0.0)))

    vector_density = 0.0
    if isinstance(vectors, dict) and vectors:
        vals = []
        for v in vectors.values():
            if isinstance(v, dict):
                vals.append(clamp01(v.get("value", 0)))
            elif isinstance(v, (int, float)):
                vals.append(clamp01(v))
        vector_density = sum(vals) / max(1, len(vals))

    ihg = clamp01(0.25 + trust * 0.35 + vector_density * 0.25 + min(evidence_count, 10) * 0.015)
    nti = clamp01(0.20 + world_pressure * 0.35 + vector_density * 0.25 + trust * 0.20)
    ldi = clamp01(0.85 - trust * 0.30 - min(evidence_count, 10) * 0.025 + decay * 0.35)
    xi = clamp01(0.03 + max(0.0, world_pressure - trust) * 0.07)

    warnings = []
    if evidence_count == 0:
        warnings.append("no_evidence")
    if trust < 0.30:
        warnings.append("low_trust")
    if ldi > 0.75:
        warnings.append("high_decay")

    return {"ihg": ihg, "nti": nti, "ldi": ldi, "xi": xi, "warnings": warnings}
