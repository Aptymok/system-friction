# epistemic_confidence.py
class EpistemicConfidence:
    @staticmethod
    def compute(observation_count: int, recency_days: float, consistency: float) -> float:
        count_factor = min(1.0, observation_count / 10)
        recency_factor = max(0.0, 1.0 - (recency_days / 30))
        confidence = 0.4 * count_factor + 0.3 * recency_factor + 0.3 * consistency
        return min(1.0, confidence)
