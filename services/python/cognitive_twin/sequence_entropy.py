# sequence_entropy.py
import numpy as np
from collections import Counter

class SequenceEntropy:
    @staticmethod
    def compute(event_sequence: list) -> float:
        if len(event_sequence) < 2:
            return 0.0
        transitions = Counter()
        for i in range(len(event_sequence)-1):
            transitions[(event_sequence[i], event_sequence[i+1])] += 1
        total = sum(transitions.values())
        entropy = 0.0
        for count in transitions.values():
            p = count / total
            entropy -= p * np.log2(p)
        max_entropy = np.log2(len(transitions)) if transitions else 1.0
        return entropy / max_entropy if max_entropy > 0 else 0.0
