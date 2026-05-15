# phase_transition_engine.py
import numpy as np
from scipy.signal import find_peaks

class PhaseTransitionEngine:
    @staticmethod
    def detect_transitions(metric_series: list, threshold_std=1.5) -> list:
        if len(metric_series) < 5:
            return []
        diff = np.diff(metric_series)
        peaks, _ = find_peaks(np.abs(diff), height=threshold_std * np.std(diff))
        return peaks.tolist()

    @staticmethod
    def current_attractor(metric_series: list, window=10):
        recent = metric_series[-window:]
        return np.mean(recent) if recent else 0.5
