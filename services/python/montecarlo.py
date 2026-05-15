#!/usr/bin/env python3
"""
Monte Carlo para coherencia contextual - MIHM v3.0 (generalizado)
Recibe un vector MIHM y opcionalmente perfiles horarios.
"""
import numpy as np
import pandas as pd
import sys
import json

def get_default_contextual_profiles():
    hours = np.arange(24)
    attention = 0.2 + 0.6 * (np.sin((hours - 9) * np.pi / 8)**2 +
                             np.sin((hours - 13) * np.pi / 8)**2 +
                             np.sin((hours - 20) * np.pi / 8)**2)
    attention = attention / attention.max()
    feed_vel = 0.1 + 0.8 * np.exp(-((hours - 21) % 24)**2 / 30)
    feed_vel = feed_vel / feed_vel.max()
    symbolic_noise = 0.1 + 0.7 * (np.sin((hours - 8) * np.pi / 6)**2 +
                                  np.sin((hours - 14) * np.pi / 6)**2 +
                                  np.sin((hours - 20) * np.pi / 6)**2)
    symbolic_noise = symbolic_noise / symbolic_noise.max()
    return attention, feed_vel, symbolic_noise

def coherence_score(wsi, nti, hour, track, profiles):
    attention, feed_vel, symbolic_noise = profiles
    att = attention[hour]
    fv = feed_vel[hour]
    sn = symbolic_noise[hour]
    cs_benefit = track.get("C_s", 0.5) * 0.04 * (1 - fv * 0.8)
    vi_benefit = (1 - track.get("V_i", 0.5)) * 0.03 * (1 - att * 0.9)
    delta_wsi = abs(wsi - 0.55)
    delta_nti = abs(nti - 0.45)
    context_penalty = 0.4 * delta_wsi + 0.3 * delta_nti
    invisibility = (1 - track.get("F_s", 0.5)) * att * 0.5
    symbolic_penalty = sn * (1 - track.get("D_cog", 0.5)) * 0.4
    score = cs_benefit + vi_benefit - context_penalty - invisibility - symbolic_penalty
    logistic = lambda x: 1 / (1 + np.exp(-4 * x))
    return logistic(score)

def run_montecarlo_for_vector(mihm_vec: dict, n_iter: int = 50000):
    hours = np.arange(24)
    profiles = get_default_contextual_profiles()
    np.random.seed(42)
    wsi_mean, wsi_std = 0.636, 0.04
    nti_mean, nti_std = 0.505, 0.06
    results = {h: [] for h in hours}
    for _ in range(n_iter):
        wsi = np.random.normal(wsi_mean, wsi_std)
        nti = np.random.normal(nti_mean, nti_std)
        if np.random.rand() < 0.08:
            wsi += np.random.normal(0.15, 0.05)
            nti += np.random.normal(0.10, 0.04)
        wsi = np.clip(wsi, 0.2, 0.95)
        nti = np.clip(nti, 0.1, 0.9)
        for h in hours:
            s = coherence_score(wsi, nti, h, mihm_vec, profiles)
            results[h].append(s)
    summary = []
    for h in hours:
        scores = results[h]
        summary.append({
            "hour": int(h),
            "mean": np.mean(scores),
            "median": np.median(scores),
            "p10": np.percentile(scores, 10),
            "p90": np.percentile(scores, 90),
            "std": np.std(scores)
        })
    return summary

if __name__ == "__main__":
    # Si se ejecuta directamente, simula con un vector por defecto (solo para prueba)
    dummy_vec = {"C_s": 0.8, "V_i": 0.4, "F_s": 0.3, "D_cog": 0.2}
    result = run_montecarlo_for_vector(dummy_vec, 1000)
    print(json.dumps(result, indent=2))