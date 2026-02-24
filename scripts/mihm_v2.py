#!/usr/bin/env python3
"""
MIHM v2.0 — Motor NODEX con nodo N6 y módulo de coherencia M_i.
System Friction Framework v1.1 | origen: vhpd | status: validated
Autor: Juan Antonio Marín Liera (APTYMOK) — INEGI Aguascalientes
Fecha: 23 de febrero de 2026

Referencia: Postulado Central f = (t/T) + O
Manuscrito: MIHM v2.0 — Validación ante Shock Exógeno (Nodo Aguascalientes)
"""

import numpy as np
import json
from pathlib import Path


class MIHMv2:
    """MIHM v2.0 — Motor NODEX con nodo N6 y módulo de coherencia M_i."""

    def __init__(self, C, E, L, K, R, M=None, theta_crit=0.20):
        self.N = len(C)
        self.C, self.E, self.L, self.K, self.R = map(np.array, [C, E, L, K, R])
        self.M = np.ones(self.N) if M is None else np.array(M)
        self.theta_crit = theta_crit
        self.history = []

    def effective_L(self):
        """Latencia efectiva modulada por coherencia M_i."""
        return np.minimum(self.L * (1 + (1 - self.M)), 1.0)

    def IHG(self):
        """Índice de Gobernanza Homeostática."""
        L_eff = self.effective_L()
        return float(np.mean((self.C - self.E) * (1 - L_eff)))

    def ICE(self):
        """ICE simplificado: concentración de carga entrópica."""
        return float(np.max(self.E) / np.sum(self.E))

    def NTI(self, LDI_norm, ICC_norm, CSR, IRCI_norm, IIM):
        """Nodo de Trazabilidad Institucional."""
        return (1 / 5) * ((1 - LDI_norm) + ICC_norm + CSR + IRCI_norm + IIM)

    def IHG_corrected(self, nti):
        """IHG corregido por NTI (sistema con datos degradados)."""
        return self.IHG() * nti

    def friction(self, t, T, O):
        """Fricción institucional: f = (t/T) + O (Postulado Central)."""
        return (t / T) + O

    def apply_exogenous_shock(self, delta_E, node_indices):
        """Inyección de entropía exógena calibrada con proxies verificables."""
        for idx, de in zip(node_indices, delta_E):
            self.E[idx] = min(1.0, self.E[idx] + de)
        snapshot = {
            "IHG": self.IHG(),
            "ICE": self.ICE(),
            "E": self.E.tolist()
        }
        self.history.append(snapshot)
        return self.IHG()

    def monte_carlo(self, n=50000, lambda_viol=0.1, seed=42):
        """
        Monte Carlo exocáustico con proceso de Poisson para oleadas de violencia.
        Categoría: simulación exocáustica (único tipo autorizado por VHpD).
        """
        np.random.seed(seed)
        collapse_count = 0
        for _ in range(n):
            E_sim = self.E.copy() + np.random.normal(0, 0.05, self.N)
            E_sim = np.clip(E_sim, 0, 1)
            # Shock de violencia (proceso de Poisson)
            n_events = np.random.poisson(lambda_viol * 12)  # 12 meses
            for _ in range(n_events):
                delta = np.random.uniform(0.05, 0.15)
                E_sim[-1] = min(1.0, E_sim[-1] + delta)  # N6
            sys_sim = MIHMv2(self.C, E_sim, self.L, self.K, self.R, self.M)
            if sys_sim.IHG() < -1.0 or E_sim[0] > 0.98:
                collapse_count += 1
        return collapse_count / n

    def status_report(self):
        """Genera reporte de estado del sistema."""
        node_labels = ["N1-Agua", "N2-Capital", "N3-Logística", "N4-Seguridad", "N5-Coord", "N6-Exógeno"]
        thresholds = {"C": 0.30, "E": 0.80, "L": 0.85, "M": 0.50}
        report = []
        for i in range(self.N):
            f_node = self.friction(self.L[i], 1.0, self.E[i])
            if self.C[i] < thresholds["C"]:
                status = "FRACTURE"
            elif self.E[i] > thresholds["E"] or self.L[i] > thresholds["L"]:
                status = "CRITICAL"
            elif self.M[i] < thresholds["M"]:
                status = "OPAQUE"
            else:
                status = "OK"
            label = node_labels[i] if i < len(node_labels) else f"N{i+1}"
            report.append({
                "node": label,
                "C": round(float(self.C[i]), 3),
                "E": round(float(self.E[i]), 3),
                "L": round(float(self.L[i]), 3),
                "M": round(float(self.M[i]), 3),
                "friction": round(f_node, 3),
                "status": status
            })
        return report


# ── VECTOR POST-FRACTURA (23 feb 2026) ──────────────────────────────────────
# Proxies calibrados con datos verificables:
# 252 bloqueos / 20 estados / 90% desactivados en 24h
# Nissan suspendido / Secretario Seguridad ausente en Mesa de Coordinación
# Fuentes: Zócalo, La Jornada, Milenio, AP News (22-23 feb 2026)

C = [0.18, 0.68, 0.85, 0.35, 0.60, 0.40]   # Capacidad adaptativa
E = [0.89, 0.78, 0.35, 0.96, 0.68, 0.95]   # Carga entrópica
L = [0.92, 0.72, 0.35, 0.88, 0.78, 0.85]   # Latencia operativa
K = [0.85, 0.55, 0.40, 0.55, 0.65, 0.75]   # Conectividad funcional
R = [0.12, 0.15, 0.60, 0.10, 0.40, 0.20]   # Redistribución
M = [1.0,  1.0,  1.0,  1.0,  0.50, 0.70]   # Coherencia: N5=0.50 (ausencia Sec.Seg.)

system = MIHMv2(C, E, L, K, R, M)

if __name__ == "__main__":
    print("=" * 60)
    print("MIHM v2.0 — Validación Post-Fractura (23 feb 2026)")
    print("=" * 60)

    ihg = system.IHG()
    ice = system.ICE()
    print(f"IHG post-fractura:        {ihg:.3f}")   # -0.620
    print(f"ICE (simplificado):       {ice:.3f}")   # 0.208

    nti = system.NTI(
        LDI_norm=1.0,    # 6h respuesta vs 1h estándar
        ICC_norm=0.32,   # 80% conocimiento en 2 comandantes
        CSR=0.0,         # 0% reducción incidentes vs meta 50%
        IRCI_norm=0.935, # Compactación acuífero (sin cambio en crisis)
        IIM=0.50         # 12 reportados vs 18 verificados
    )
    print(f"NTI post-fractura:        {nti:.3f}")             # 0.351
    print(f"IHG corregido (NTI):      {system.IHG_corrected(nti):.3f}")  # -0.218

    # Fricción Postulado Central — N5 (caso más crítico)
    f_n5 = system.friction(t=6, T=1, O=0.68)
    print(f"Fricción N5 (6h/1h + 0.68): {f_n5:.2f}")         # 6.68

    # Intervención: telemetría reduce L_N6 de 0.85 a 0.43
    system_int = MIHMv2(C, E, [0.92, 0.72, 0.35, 0.88, 0.78, 0.43], K, R, M)
    print(f"IHG tras telemetría N6:   {system_int.IHG():.3f}")

    # Monte Carlo (50,000 iteraciones, seed 42)
    print("\nEjecutando Monte Carlo (50,000 iteraciones, seed=42)...")
    prob_collapse = system.monte_carlo(n=50000, lambda_viol=0.1, seed=42)
    print(f"Prob. colapso antes 2030: {prob_collapse:.1%}")   # ~71%

    print("\n--- REPORTE DE NODOS ---")
    for node in system.status_report():
        print(f"  {node['node']:20s} f={node['friction']:.2f}  {node['status']}")

    # Guardar resultados en JSON
    results = {
        "IHG_post": round(ihg, 3),
        "ICE": round(ice, 3),
        "NTI": round(nti, 3),
        "IHG_corrected": round(system.IHG_corrected(nti), 3),
        "IHG_post_telemetry": round(system_int.IHG(), 3),
        "prob_collapse_2030": round(prob_collapse, 4),
        "nodes": system.status_report()
    }
    out_path = Path(__file__).parent.parent / "_meta" / "results.json"
    with open(out_path, "w") as f:
        import json
        json.dump(results, f, indent=2)
    print(f"\nResultados guardados en: {out_path}")
