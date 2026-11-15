import random
import math

def clamp01(x):
    value = float(x)
    if not math.isfinite(value):
        raise ValueError("MIHM_MISSING_OR_NONFINITE_NUMERICAL_INPUT")
    return max(0.0, min(1.0, value))

def phi(ihg, nti, ldi, xi):
    # Parity with the canonical TypeScript formula (normalize BEFORE algebra).
    a, b, c, d = (clamp01(value) for value in (ihg, nti, ldi, xi))
    return clamp01((a * b) / (1 + c) + d)

def regime(p, ldi, nti, ihg):
    if p >= 0.58 and ldi <= 0.45 and nti >= 0.55 and ihg >= 0.50:
        return "HOMEOSTATICO"
    if p <= 0.22 or ldi >= 0.78 or nti <= 0.25:
        return "ENTROPICO"
    return "CRITICO"

def run_montecarlo(mihm, runs=256, horizon=21):
    if type(runs) is not int or type(horizon) is not int or runs <= 0 or horizon <= 0:
        raise ValueError("MIHM_INVALID_SIMULATION_EXTENT")
    # No observationally estimated noise covariance or calibration cohort is
    # present in this engine. Output remains a conditional simulation ONLY.
    for key in ("ihg", "nti", "ldi", "xi"):
        if key not in mihm:
            raise ValueError("MIHM_MISSING_INPUT:" + key)
        clamp01(mihm[key])
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
        "entropic_sample_fraction": entropic_probability,
        "homeostatic_sample_fraction": homeostatic_probability,
        "epistemic_status": "SIMULATED",
        "calibration_status": "NOT_CALIBRATED",
        "probability_interpretation": "MODEL_CONDITIONAL_SAMPLE_FREQUENCY_NOT_EMPIRICAL_RISK",
        "stochastic_parameters_status": "UNFITTED_FIXED_EXPLORATORY",
        "warnings": ["simulation_parameters_not_estimated_from_observed_trajectories",
                     "do_not_use_as_empirical_probability_or_prospective_prediction"],
        "sample_paths": results[:12],
    }
