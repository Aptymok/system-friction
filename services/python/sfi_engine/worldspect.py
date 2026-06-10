def clamp01(x):
    try:
        x = float(x)
    except Exception:
        return 0.0
    return max(0.0, min(1.0, x))

def summarize_worldspect(snapshot):
    if not isinstance(snapshot, dict):
        return {"wsi": 0.0, "nti": 0.0, "source_count": 0}

    vectors = snapshot.get("vectors") or {}
    if isinstance(vectors, dict):
        cells = list(vectors.values())
    elif isinstance(vectors, list):
        cells = vectors
    else:
        cells = []

    values = []
    volatility = []
    source_count = 0

    for cell in cells:
        if isinstance(cell, dict):
            values.append(clamp01(cell.get("value", 0)))
            volatility.append(clamp01(cell.get("volatility", cell.get("velocity", 0))))
            source_count += int(cell.get("sourceCount", cell.get("source_count", 0)) or 0)

    return {
        "wsi": sum(values) / max(1, len(values)),
        "nti": sum(volatility) / max(1, len(volatility)),
        "source_count": source_count,
    }
