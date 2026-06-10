import random

def clamp01(x):
    return max(0.0, min(1.0, float(x)))

def phi(ihg, nti, ldi, xi):
    return clamp01((ihg * nti) / (1 + ldi) + xi)

def regime(p, ldi, nti, ihg):
    if p >= 0.58 and ldi <= 0.45 and nti >= 0.55 and ihg >= 0.50:
        return "HOMEOSTATICO"
    if p <= 0.22 or ldi >= 0.78 or nti <= 0.25:
        return "ENTROPICO"
    return "CRITICO"

def run_montecarlo(mihm, runs=256, horizon=21):
    results = []
    for _ in range(runs):
        ihg = mihm["ihg"]
        nti = mihm["nti"]
        ldi = mihm["ldi"]
        xi = mihm["xi"]
        path = []
        for day in range(horizon):
            ihg = clamp01(ihg + random.gauss(0, 0.025))
            nti = clamp01(nti + random.gauss(0, 0.030))
            ldi = clamp01(ldi + random.gauss(0, 0.025))
            xi = clamp01(xi + random.gauss(0, 0.005))
            p = phi(ihg, nti, ldi, xi)
            path.append({"day": day + 1, "phi": p, "regime": regime(p, ldi, nti, ihg)})
        results.append(path)

    terminal = [path[-1]["phi"] for path in results]
    avg_terminal = sum(terminal) / len(terminal)
    entropic_probability = sum(1 for path in results if path[-1]["regime"] == "ENTROPICO") / len(results)
    homeostatic_probability = sum(1 for path in results if path[-1]["regime"] == "HOMEOSTATICO") / len(results)

    return {
        "runs": runs,
        "horizon": horizon,
        "avg_terminal_phi": avg_terminal,
        "entropic_probability": entropic_probability,
        "homeostatic_probability": homeostatic_probability,
        "sample_paths": results[:12],
    }
