# causality_decay.py
import time
from config import HALF_LIFE_DAYS

class CausalityDecay:
    @staticmethod
    def decay_relation(relation: dict) -> dict:
        now = time.time()
        age_days = (now - relation['timestamp']) / 86400
        relation['weight'] *= 0.5 ** (age_days / HALF_LIFE_DAYS)
        return relation
