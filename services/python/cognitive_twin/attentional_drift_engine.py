# attentional_drift_engine.py
import numpy as np
from collections import deque

class AttentionalDriftEngine:
    def __init__(self, window_size=50):
        self.window = deque(maxlen=window_size)

    def feed(self, telemetry: dict):
        self.window.append({
            'focus_switches': telemetry.get('focus_switches', 0),
            'topic_durations': telemetry.get('topic_durations', {}),
            'typing_speed': telemetry.get('typing_speed_cps', 0),
            'backspace_rate': telemetry.get('backspaces', 0) / max(0.01, telemetry.get('total_seconds', 1))
        })

    def compute_drift(self) -> dict:
        if len(self.window) < 3:
            return {'drift_score': 0.0, 'fragmentation': 0.0, 'persistence': 0.0}
        switches = [w['focus_switches'] for w in self.window]
        speeds = [w['typing_speed'] for w in self.window]
        backspace_rates = [w['backspace_rate'] for w in self.window]
        fragmentation = np.std(switches) / max(0.01, np.mean(switches))
        durations = [sum(d.values()) for d in [w['topic_durations'] for w in self.window] if d]
        persistence = np.mean(durations) if durations else 0.0
        drift_score = (fragmentation * 0.4) + (1.0 / (1.0 + persistence)) * 0.3 + (np.mean(backspace_rates) * 0.3)
        return {
            'drift_score': min(1.0, drift_score),
            'fragmentation': fragmentation,
            'persistence': persistence,
            'backspace_rate_mean': np.mean(backspace_rates)
        }
