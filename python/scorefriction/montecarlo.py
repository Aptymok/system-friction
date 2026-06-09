#!/usr/bin/env python3
"""
Monte Carlo para coherencia contextual - MIHM v3.0 (versión corregida)
No hay baseline fijo. El score resulta de beneficios netos penalizados por entorno.
Rango de salida [0,1] tras normalización logística.
"""

import numpy as np
import pandas as pd
import sys

# ------------------------------------------------------------
# Datos de la canción (KXTXR - REM 618)
# ------------------------------------------------------------
track = {
    "C_s": 0.999,    # coherencia extrema
    "V_i": 0.35,     # intención difusa
    "F_s": 0.21,     # baja fricción física
    "D_cog": 0.004   # casi nula ruptura cognitiva
}

# ------------------------------------------------------------
# Perfiles horarios contextuales (escala 0-1)
# ------------------------------------------------------------
def get_contextual_profiles():
    hours = np.arange(24)
    # Presión atencional: picos a las 9, 13, 18-21
    attention = 0.2 + 0.6 * (np.sin((hours - 9) * np.pi / 8)**2 +
                             np.sin((hours - 13) * np.pi / 8)**2 +
                             np.sin((hours - 20) * np.pi / 8)**2)
    attention = attention / attention.max()
    # Velocidad del feed (redes): máxima 20-23h
    feed_vel = 0.1 + 0.8 * np.exp(-((hours - 21) % 24)**2 / 30)
    feed_vel = feed_vel / feed_vel.max()
    # Ruido simbólico (noticias duras): picos 8, 14, 20
    symbolic_noise = 0.1 + 0.7 * (np.sin((hours - 8) * np.pi / 6)**2 +
                                  np.sin((hours - 14) * np.pi / 6)**2 +
                                  np.sin((hours - 20) * np.pi / 6)**2)
    symbolic_noise = symbolic_noise / symbolic_noise.max()
    return attention, feed_vel, symbolic_noise

# ------------------------------------------------------------
# Nueva función de coherencia (sin baseline fijo)
# ------------------------------------------------------------
def coherence_score(wsi, nti, hour, track):
    """
    Devuelve score en [0,1] donde alto = buena compatibilidad.
    Ya no hay un 1.0 inicial; el score es beneficio neto.
    """
    # Beneficios (reducidos y modulados por el contexto)
    # C_s solo ayuda si el entorno no es extremadamente caótico
    attention, feed_vel, sym_noise = get_contextual_profiles()
    att = attention[hour]
    fv = feed_vel[hour]
    sn = sym_noise[hour]
    
    # La coherencia extrema penaliza en entornos de alta velocidad de feed
    cs_benefit = track["C_s"] * 0.04 * (1 - fv * 0.8)
    # Baja intencionalidad penaliza si la presión atencional es alta (no compite)
    vi_benefit = (1 - track["V_i"]) * 0.03 * (1 - att * 0.9)
    
    # Penalizaciones contextuales
    # 1. Distancia al mundo óptimo para esta obra (wsi_opt ~0.55, nti_opt ~0.45)
    delta_wsi = abs(wsi - 0.55)
    delta_nti = abs(nti - 0.45)
    context_penalty = 0.4 * delta_wsi + 0.3 * delta_nti
    
    # 2. Coste de invisibilidad: baja F_s + alta atención externa → se pierde
    invisibility = (1 - track["F_s"]) * att * 0.5
    
    # 3. Ruido simbólico: castiga a obras de baja D_cog (no pueden seguir el desorden)
    symbolic_penalty = sn * (1 - track["D_cog"]) * 0.4
    
    # Score neto (puede ser negativo)
    score = cs_benefit + vi_benefit - context_penalty - invisibility - symbolic_penalty
    
    # Normalización logística para mapear a [0,1] con centro en 0
    # logistic(x) = 1/(1+exp(-k*x)), con k=4 para sensibilidad
    logistic = lambda x: 1 / (1 + np.exp(-4 * x))
    return logistic(score)

# ------------------------------------------------------------
# Simulación Monte Carlo con shocks y varianzas realistas
# ------------------------------------------------------------
def run_montecarlo(n_iter=50000):
    np.random.seed(42)
    hours = np.arange(24)
    
    # Distribuciones con varianzas más amplias y posibilidad de shocks
    wsi_mean, wsi_std = 0.636, 0.04    # antes 0.007
    nti_mean, nti_std = 0.505, 0.06    # antes 0.011
    
    results = {h: [] for h in hours}
    
    for _ in range(n_iter):
        # Muestreo base
        wsi = np.random.normal(wsi_mean, wsi_std)
        nti = np.random.normal(nti_mean, nti_std)
        
        # Shocks (discontinuidades): 8% de probabilidad de evento extremo
        if np.random.rand() < 0.08:
            wsi += np.random.normal(0.15, 0.05)
            nti += np.random.normal(0.10, 0.04)
        
        wsi = np.clip(wsi, 0.2, 0.95)
        nti = np.clip(nti, 0.1, 0.9)
        
        for h in hours:
            s = coherence_score(wsi, nti, h, track)
            results[h].append(s)
    
    # Estadísticas
    summary = []
    for h in hours:
        scores = results[h]
        summary.append({
            "hour": h,
            "mean": np.mean(scores),
            "median": np.median(scores),
            "p10": np.percentile(scores, 10),
            "p90": np.percentile(scores, 90),
            "std": np.std(scores)
        })
    return pd.DataFrame(summary), n_iter

# ------------------------------------------------------------
# Main
# ------------------------------------------------------------
if __name__ == "__main__":
    n_iter = 50000
    print(f"Ejecutando Monte Carlo con {n_iter} iteraciones y shocks...", file=sys.stderr)
    df, n = run_montecarlo(n_iter)
    
    print(f"\n--- Resultados después de {n} iteraciones ---")
    print(df.round(4).to_string(index=False))
    
    best = df.nlargest(5, "mean")
    print("\n--- Mejores ventanas (mayor coherencia contextual) ---")
    for _, row in best.iterrows():
        print(f"Hora {int(row['hour']):02d}:00  media={row['mean']:.3f}  [10-90%: {row['p10']:.3f}-{row['p90']:.3f}]")
    
    worst = df.nsmallest(3, "mean")
    print("\n--- Peores ventanas (menor coherencia) ---")
    for _, row in worst.iterrows():
        print(f"Hora {int(row['hour']):02d}:00  media={row['mean']:.3f}")
    
    # Interpretación
    print("\n--- Interpretación contextual ---")
    print("Obras con C_s muy alta y V_i baja (como REM 618) maximizan coherencia en ventanas:")
    print("- Horas de baja velocidad de feed (evitar 20-23h).")
    print("- Momentos de baja presión atencional (tras picos informativos).")
    print("- Entornos con ruido simbólico moderado, no extremo.")
    print("El coste de invisibilidad es real: la canción puede pasar desapercibida en horas de alta saturación.")
    
    # Gráfico opcional
    try:
        import matplotlib.pyplot as plt
        plt.figure(figsize=(12, 5))
        plt.plot(df["hour"], df["mean"], 'o-', color='gold', label='Media')
        plt.fill_between(df["hour"], df["p10"], df["p90"], alpha=0.3, color='gold')
        plt.xlabel("Hora del día (local)")
        plt.ylabel("Coherencia contextual (logística)")
        plt.title(f"Monte Carlo corregido – {n_iter} iteraciones con shocks")
        plt.xticks(range(0,24,2))
        plt.grid(True, alpha=0.3)
        plt.legend()
        plt.tight_layout()
        plt.savefig("montecarlo_v3.png", dpi=150)
        print("\nGráfico guardado: montecarlo_v3.png")
    except ImportError:
        pass