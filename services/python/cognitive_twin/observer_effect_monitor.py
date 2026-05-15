# observer_effect_monitor.py
from collections import deque

class ObserverEffectMonitor:
    def __init__(self, window_size=20):
        self.user_responses = deque(maxlen=window_size)
        self.model_inferences = deque(maxlen=window_size)

    def record(self, user_response: str, inference: dict):
        self.user_responses.append(user_response)
        self.model_inferences.append(inference)

    def detect_mimicry(self) -> float:
        if len(self.user_responses) < 5:
            return 0.0
        return 0.0
