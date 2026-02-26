#!/usr/bin/env python3
"""
mihm_v2.py — Multinodal Homeostatic Integration Model v2.0
System Friction Framework · v1.1 · 2026
CC BY 4.0 · Juan Antonio Marín Liera

Uso:
    python3 mihm_v2.py                    # calcula IHG/NTI con vectores AGS
    python3 mihm_v2.py --mc               # Monte Carlo 50k iteraciones
    python3 mihm_v2.py --shock 0.3        # shock exógeno personalizado
    python3 mihm_v2.py --output results.json
"""

import json
import math
import random
import argparse
import sys
from typing import Dict, List, Optional


# ── Vectores post-fractura (AGS, 23 feb 2026) ────────────────────────────────
VECTORS_AGS = {
    "N1": {"label": "Agua",      "C": 0.18, "E": 0.89, "L": 0.92, "K": 0.85, "R": 0.12, "M": 1.00},
    "N2": {"label": "Capital",   "C": 0.68, "E": 0.78, "L": 0.72, "K": 0.55, "R": 0.15, "M": 1.00},
    "N3": {"label": "Logistica", "C": 0.85, "E": 0.35, "L": 0.35, "K": 0.40, "R": 0.60, "M": 1.00},
    "N4": {"label": "Seguridad", "C": 0.35, "E": 0.96, "L": 0.88, "K": 0.55, "R": 0.10, "M": 1.00},
    "N5": {"label": "Coord",     "C": 0.60, "E": 0.68, "L": 0.78, "K": 0.65, "R": 0.40, "M": 0.50},
    "N6": {"label": "Ext",       "C": 0.40, "E": 0.95, "L": 0.85, "K": 0.75, "R": 0.20, "M": 0.70},
}

NTI_COMPONENTS_AGS = {
    "LDI_n": 1.00,   # Latencia Decisión Institucional normalizada
    "ICC_n": 0.32,   # Índice Concentración Conocimiento
    "CSR":   0.00,   # Cumplimiento Reducción Incidentes
    "IRCI_n":0.935,  # Resiliencia Capital Institucional
    "IIM":   0.50,   # Integridad Métricas
}

UCAP_IHG = -0.50
UCAP_NTI = 0.40


# ── Core MIHM formulas ────────────────────────────────────────────────────────

def friction(t: float, T: float, O: float) -> float:
    """f = (t/T) + O"""
    if T <= 0:
        raise ValueError("T (tiempo normativo) debe ser > 0")
    return (t / T) + O


def effective_L(L: float, M: float) -> float:
    """L_eff = min(L * (1 + (1 - M)), 1.0)"""
    return min(L * (1.0 + (1.0 - M)), 1.0)


def node_IHG_contribution(C: float, E: float, L: float, M: float) -> float:
    """(C - E) * (1 - L_eff)"""
    L_eff = effective_L(L, M)
    return (C - E) * (1.0 - L_eff)


def IHG(vectors: Dict) -> float:
    """IHG = (1/N) * sum((C_i - E_i) * (1 - L_eff_i))"""
    contributions = [
        node_IHG_contribution(v["C"], v["E"], v["L"], v["M"])
        for v in vectors.values()
    ]
    return sum(contributions) / len(contributions)


def NTI(components: Dict) -> float:
    """NTI = (1/5) * [(1-LDI_n) + ICC_n + CSR + IRCI_n + IIM]"""
    c = components
    return (1.0 / 5.0) * (
        (1.0 - c["LDI_n"]) + c["ICC_n"] + c["CSR"] + c["IRCI_n"] + c["IIM"]
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


# ── Monte Carlo (proceso de Poisson exocáustico) ─────────────────────────────

def _seeded_lcg(seed: int):
    """LCG seeded RNG: reproducible, sin dependencias externas."""
    s = seed
    def rng():
        nonlocal s
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        return (s >> 0) / 0xFFFFFFFF
    return rng


def poisson_sample(lam: float, rng) -> int:
    """Poisson via método de transformación inversa."""
    L = math.exp(-lam)
    p, k = 1.0, 0
    while p > L:
        k += 1
        p *= rng()
    return k - 1


def monte_carlo(
    vectors: Dict,
    nti_components: Dict,
    n: int = 50000,
    seed: int = 42,
    lambda_shock: float = 0.10,
    shock_magnitude: float = 0.30,
    horizon_days: int = 180,
) -> Dict:
    """
    Monte Carlo exocáustico. Proceso de Poisson para shocks.
    Retorna distribución de IHG @horizon_days.
    """
    rng = _seeded_lcg(seed)
    ihg_0 = IHG(vectors)
    results = []

    for _ in range(n):
        ihg_t = ihg_0
        lam_daily = lambda_shock / horizon_days

        for _ in range(horizon_days):
            # Shock exógeno: Poisson(λ/T)
            shocks = poisson_sample(lam_daily, rng)
            if shocks > 0:
                ihg_t -= shocks * shock_magnitude * (0.5 + rng() * 0.5)
            # Recuperación natural mínima
            ihg_t += rng() * 0.003
            ihg_t = max(ihg_t, -1.5)

        results.append(ihg_t)

    results.sort()
    n = len(results)

    def pct(p):
        return results[int(n * p)]

    p_collapse  = sum(1 for v in results if v < UCAP_IHG) / n
    p_fracture  = sum(1 for v in results if v < -0.8) / n
    mean_ihg    = sum(results) / n

    return {
        "seed": seed,
        "n": n,
        "lambda": lambda_shock,
        "shock_magnitude": shock_magnitude,
        "horizon_days": horizon_days,
        "IHG_0": round(ihg_0, 4),
        "IHG_mean_180d": round(mean_ihg, 4),
        "p_collapse": round(p_collapse, 4),
        "p_fracture": round(p_fracture, 4),
        "percentiles": {
            "p10": round(pct(0.10), 4),
            "p25": round(pct(0.25), 4),
            "p50": round(pct(0.50), 4),
            "p75": round(pct(0.75), 4),
            "p90": round(pct(0.90), 4),
        }
    }


# ── Report ────────────────────────────────────────────────────────────────────

def build_report(vectors: Dict, nti_comps: Dict, mc_result: Optional[Dict] = None) -> Dict:
    ihg_val = IHG(vectors)
    nti_val = NTI(nti_comps)
    ihg_corr = ihg_val * nti_val

    nodes_report = {}
    for nid, v in vectors.items():
        L_eff = effective_L(v["L"], v["M"])
        # friction proxy: use E as O surrogate, L_eff as t/T surrogate
        f_val = L_eff + v["E"]
        status = node_status(f_val, v["M"])
        d_ihg = node_IHG_contribution(v["C"], v["E"], v["L"], v["M"])
        nodes_report[nid] = {
            "label": v["label"],
            "C": v["C"], "E": v["E"], "L": v["L"],
            "K": v["K"], "R": v["R"], "M": v["M"],
            "L_eff": round(L_eff, 4),
            "f": round(f_val, 4),
            "status": status,
            "dIHG": round(d_ihg, 4),
        }

    protocol = "EMERGENCY_DECISION" if ihg_val < UCAP_IHG else (
        "WATCHLIST" if ihg_val < -0.30 else "NOMINAL"
    )
    nti_mode = "BLIND_MODE" if nti_val < UCAP_NTI else "OPERATIONAL"

    report = {
        "schema": "sf-results-v1.1",
        "timestamp": "2026-02-23T23:59:00Z",
        "system": {
            "IHG": round(ihg_val, 4),
            "NTI": round(nti_val, 4),
            "IHG_corrected": round(ihg_corr, 4),
            "protocol": protocol,
            "nti_mode": nti_mode,
            "ucap_ihg": UCAP_IHG,
            "ucap_nti": UCAP_NTI,
        },
        "nti_components": nti_comps,
        "nodes": nodes_report,
    }

    if mc_result:
        report["monte_carlo"] = mc_result

    return report


def print_report(report: Dict):
    sys_r = report["system"]
    print("\n── MIHM v2.0 ── System Friction Framework ──────────────────")
    print(f"  IHG            : {sys_r['IHG']:+.4f}")
    print(f"  NTI            : {sys_r['NTI']:.4f}  [{report['system']['nti_mode']}]")
    print(f"  IHG × NTI      : {sys_r['IHG_corrected']:+.4f}")
    print(f"  Protocol       : {sys_r['protocol']}")
    print(f"  UCAP IHG       : {sys_r['ucap_ihg']:+.2f}")
    print()
    print("  Nodo  Label         C      E      L      M      f       Status   ΔIHG")
    print("  " + "─"*76)
    for nid, n in report["nodes"].items():
        print(f"  {nid}  {n['label']:<12}  {n['C']:.2f}  {n['E']:.2f}  {n['L']:.2f}  {n['M']:.2f}  {n['f']:.3f}  {n['status']:<8}  {n['dIHG']:+.3f}")

    if "monte_carlo" in report:
        mc = report["monte_carlo"]
        print(f"\n  Monte Carlo  seed={mc['seed']}  n={mc['n']:,}  λ={mc['lambda']}  Δ={mc['shock_magnitude']}")
        print(f"  IHG@{mc['horizon_days']}d mean : {mc['IHG_mean_180d']:+.4f}")
        print(f"  P(colapso)       : {mc['p_collapse']*100:.1f}%")
        print(f"  P(fractura)      : {mc['p_fracture']*100:.1f}%")
        p = mc["percentiles"]
        print(f"  p10/p50/p90      : {p['p10']:+.3f} / {p['p50']:+.3f} / {p['p90']:+.3f}")
    print()


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MIHM v2.0 — System Friction Framework")
    parser.add_argument("--mc", action="store_true", help="Ejecutar Monte Carlo")
    parser.add_argument("--n", type=int, default=50000, help="Iteraciones MC (default: 50000)")
    parser.add_argument("--seed", type=int, default=42, help="Seed (default: 42)")
    parser.add_argument("--lambda", dest="lam", type=float, default=0.10, help="λ Poisson (default: 0.10)")
    parser.add_argument("--shock", type=float, default=0.30, help="Magnitud shock (default: 0.30)")
    parser.add_argument("--output", type=str, default=None, help="Guardar JSON resultados")
    args = parser.parse_args()

    mc_result = None
    if args.mc:
        print(f"  Ejecutando Monte Carlo: n={args.n:,} seed={args.seed} λ={args.lam} Δ={args.shock}...")
        mc_result = monte_carlo(
            VECTORS_AGS, NTI_COMPONENTS_AGS,
            n=args.n, seed=args.seed,
            lambda_shock=args.lam, shock_magnitude=args.shock
        )

    report = build_report(VECTORS_AGS, NTI_COMPONENTS_AGS, mc_result)
    print_report(report)

    output_path = args.output or "assets/data/results.json"
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"  Resultados guardados: {output_path}")


if __name__ == "__main__":
    main()
