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
    """
    Numerical simulation needs observed, time-ordered and independently checked
    transitions to estimate a stochastic kernel. No such calibrated kernel is
    owned by this service. Consequently NO random paths or apparent probabilities
    are generated from arbitrary Gaussian noise widths.
    """
    if type(runs) is not int or type(horizon) is not int or runs <= 0 or horizon <= 0:
        raise ValueError("MIHM_INVALID_SIMULATION_EXTENT")
    for key in ("ihg", "nti", "ldi", "xi"):
        if key not in mihm:
            raise ValueError("MIHM_MISSING_INPUT:" + key)
        clamp01(mihm[key])
    return {
        "state": "BLOCKED_CALIBRATION_REQUIRED",
        "epistemic_status": "NOT_OBSERVED",
        "calibration_status": "NOT_CALIBRATED",
        "model_specification": "NO_ESTIMATED_TRANSITION_KERNEL",
        "runs_requested": runs,
        "horizon_requested": horizon,
        "runs_executed": 0,
        "avg_terminal_phi": None,
        "entropic_probability": None,
        "homeostatic_probability": None,
        "entropic_sample_fraction": None,
        "homeostatic_sample_fraction": None,
        "sample_paths": [],
        "warnings": [
            "empirical_transition_kernel_missing",
            "prospective_out_of_sample_calibration_not_observed",
            "historical_source_vintage_and_t0_t1_evidence_required",
        ],
    }
