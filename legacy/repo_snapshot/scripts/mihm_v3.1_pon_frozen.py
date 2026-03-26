#!/usr/bin/env python3
"""
MIHM v3.1 — Multinodal Integration + Pontryagin Dynamic Module
System Friction Framework · v1.1 · 2026
CC BY 4.0 · Juan Antonio Marín Liera

Uso:
    python3 mihm_v3_1.py                 # Reporte MIHM v2.0
    python3 mihm_v3_1.py --mc            # Monte Carlo estático
    python3 mihm_v3_1.py --dyn           # Dinámica MIHM-PON v3.1
    python3 mihm_v3_1.py --dyn --mc      # Dinámica + Monte Carlo
    python3 mihm_v3_1.py --output out.json
"""

import json
import math
import random
import argparse
import sys
import numpy as np
from typing import Dict, List, Optional
from scipy.integrate import solve_ivp
from scipy.special import gamma


# ──────────────────────────────────────────────────────────────────────────────
#  DATOS AGS — MIHM v2.0
# ──────────────────────────────────────────────────────────────────────────────

VECTORS_AGS = {
    "N1": {"label": "Agua",      "C": 0.18, "E": 0.89, "L": 0.92, "K": 0.85, "R": 0.12, "M": 1.00},
    "N2": {"label": "Capital",   "C": 0.68, "E": 0.78, "L": 0.72, "K": 0.55, "R": 0.15, "M": 1.00},
    "N3": {"label": "Logistica", "C": 0.85, "E": 0.35, "L": 0.35, "K": 0.40, "R": 0.60, "M": 1.00},
    "N4": {"label": "Seguridad", "C": 0.35, "E": 0.96, "L": 0.88, "K": 0.55, "R": 0.10, "M": 1.00},
    "N5": {"label": "Coord",     "C": 0.60, "E": 0.68, "L": 0.78, "K": 0.65, "R": 0.40, "M": 0.50},
    "N6": {"label": "Ext",       "C": 0.40, "E": 0.95, "L": 0.85, "K": 0.75, "R": 0.20, "M": 0.70},
}

NTI_COMPONENTS_AGS = {
    "LDI_n": 1.00,
    "ICC_n": 0.32,
    "CSR":   0.00,
    "IRCI_n":0.935,
    "IIM":   0.50,
}

UCAP_IHG = -0.50
UCAP_NTI = 0.40


# ──────────────────────────────────────────────────────────────────────────────
#  MIHM v2.0 — FUNCIONES NÚCLEO
# ──────────────────────────────────────────────────────────────────────────────

def effective_L(L: float, M: float) -> float:
    return min(L * (1.0 + (1.0 - M)), 1.0)

def node_IHG_contribution(C: float, E: float, L: float, M: float) -> float:
    L_eff = effective_L(L, M)
    return (C - E) * (1.0 - L_eff)

def IHG(vectors: Dict) -> float:
    return sum(node_IHG_contribution(v["C"], v["E"], v["L"], v["M"])
               for v in vectors.values()) / len(vectors)

def NTI(components: Dict) -> float:
    c = components
    return (1 / 5) * (
        (1 - c["LDI_n"]) +
        c["ICC_n"] +
        c["CSR"] +
        c["IRCI_n"] +
        c["IIM"]
    )

def node_status(f_val: float, M: float) -> str:
    if M < 0.55:
        return "OPAQUE"
    if f_val > 2.0:
        return "CRITICAL"
    if f_val > 1.5:
        return "FRACTURE" if f_val > 1.7 else "CRITICAL"
    if f_val > 1.0:
        return "DEGRADED"
    return "OK"


# ──────────────────────────────────────────────────────────────────────────────
# MIHM v3.1 — MÓDULO DINÁMICO PONTRYAGIN (CON DATOS CONGELADOS)
# ──────────────────────────────────────────────────────────────────────────────

alpha, beta, delta, eta, theta, kappa, mu, sigma = 0.15, 0.35, 0.08, 0.05, 0.20, 0.012, 0.018, 0.12

x0_default = np.array([-0.620, 0.351, 0.25])
LDI_frozen = 42.0
T_dyn = 30.0
t_eval_dyn = np.linspace(0, T_dyn, 301)

def u_pontryagin(t, IHG_val, alpha1=1.2, alpha2=0.75):
    e = IHG_val + 0.620
    K = np.sqrt(alpha1/alpha2) * (1 + 0.32 * (T_dyn - t)**0.7 / gamma(1.7))
    return -K * e

def sistema_dyn(t, x, noise_free=True):
    IHG_val, NTI_val, R = x
    LDI = LDI_frozen - 0.85 * t
    u = u_pontryagin(t, IHG_val)

    # evitar stiffness por ruido: NO usar ruido dentro de solver
    noise = 0.0

    dIHG = -alpha * IHG_val + beta * NTI_val * R * (1 - abs(IHG_val)) - kappa * LDI + u + noise
    dNTI = -delta * NTI_val + 0.25 * IHG_val * (1 - NTI_val**2) - mu * max(0, LDI - 30)
    dR   = -eta * R + theta * IHG_val * NTI_val
    return [dIHG, dNTI, dR]

def run_dynamics(mc=1000):
    ihg_final = []
    collapse = 0

    for _ in range(mc):
        sol = solve_ivp(
            sistema_dyn, [0, T_dyn], x0_default,
            t_eval=t_eval_dyn,
            method="LSODA",
            rtol=1e-4, atol=1e-6,
            max_step=1.0
        )
        xf = sol.y[:, -1]
        ihg_f = xf[0]
        nti_f = xf[1]

        ihg_final.append(ihg_f)
        if ihg_f < -1.4 or nti_f < 0.10:
            collapse += 1

    return {
        "ihg_mean_30d": float(np.mean(ihg_final)),
        "p_collapse_30d": collapse / mc,
        "samples": mc
    }


# ──────────────────────────────────────────────────────────────────────────────
#      MIHM v2.0  — Monte Carlo exocáustico
# ──────────────────────────────────────────────────────────────────────────────

def _seeded_lcg(seed: int):
    s = seed
    def rng():
        nonlocal s
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        return (s >> 0) / 0xFFFFFFFF
    return rng

def poisson_sample(lam: float, rng) -> int:
    L = math.exp(-lam)
    p, k = 1.0, 0
    while p > L:
        k += 1
        p *= rng()
    return k - 1

def monte_carlo(vectors, nti_comps, n=50000, seed=42,
                lambda_shock=0.10, shock_magnitude=0.30,
                horizon_days=180):

    rng = _seeded_lcg(seed)
    ihg_0 = IHG(vectors)
    res = []

    for _ in range(n):
        x = ihg_0
        lam_daily = lambda_shock / horizon_days

        for _ in range(horizon_days):
            shocks = poisson_sample(lam_daily, rng)
            if shocks > 0:
                x -= shocks * shock_magnitude * (0.5 + rng() * 0.5)
            x += rng() * 0.003
            x = max(x, -1.5)
        res.append(x)

    res.sort()
    N = len(res)
    def pct(p): return res[int(N*p)]

    return {
        "IHG_0": ihg_0,
        "IHG_mean_180d": sum(res)/N,
        "p_collapse": sum(1 for v in res if v < UCAP_IHG) / N,
        "p_fracture": sum(1 for v in res if v < -0.8) / N,
        "percentiles": {
            "p10": pct(0.10),
            "p25": pct(0.25),
            "p50": pct(0.50),
            "p75": pct(0.75),
            "p90": pct(0.90)
        }
    }


# ──────────────────────────────────────────────────────────────────────────────
#       REPORTES
# ──────────────────────────────────────────────────────────────────────────────

def build_report(mc_result_static=None, mc_dyn=None):
    ihg_val = IHG(VECTORS_AGS)
    nti_val = NTI(NTI_COMPONENTS_AGS)
    ihg_corr = ihg_val * nti_val

    protocol = "EMERGENCY_DECISION" if ihg_val < UCAP_IHG else (
        "WATCHLIST" if ihg_val < -0.30 else "NOMINAL"
    )
    nti_mode = "BLIND_MODE" if nti_val < UCAP_NTI else "OPERATIONAL"

    report = {
        "IHG": ihg_val,
        "NTI": nti_val,
        "IHG_corr": ihg_corr,
        "protocol": protocol,
        "nti_mode": nti_mode,
    }

    if mc_result_static:
        report["monte_carlo_static"] = mc_result_static

    if mc_dyn:
        report["dynamic_pontryagin"] = mc_dyn

    return report

def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ──────────────────────────────────────────────────────────────────────────────
#       CLI
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mc", action="store_true", help="Monte Carlo estático MIHM v2.0")
    parser.add_argument("--dyn", action="store_true", help="Correr dinámica MIHM-PON v3.1")
    parser.add_argument("--n", type=int, default=1000)
    parser.add_argument("--output", type=str, default="results.json")
    args = parser.parse_args()

    mc_static = None
    mc_dyn = None

    if args.mc:
        mc_static = monte_carlo(VECTORS_AGS, NTI_COMPONENTS_AGS, n=args.n)

    if args.dyn:
        mc_dyn = run_dynamics(mc=args.n)

    report = build_report(mc_static, mc_dyn)
    save_json(args.output, report)
    print(f"Reporte guardado en {args.output}")


if __name__ == "__main__":
    main()