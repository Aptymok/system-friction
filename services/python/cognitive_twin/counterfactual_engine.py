# counterfactual_engine.py
import numpy as np

class CounterfactualEngine:
    @staticmethod
    def evaluate(inference: dict, data: list) -> dict:
        confidence = inference.get('confidence', 0.5)
        original_strength = inference.get('strength', 0.0)
        n_permutations = 100
        stronger_by_chance = 0
        adjusted_confidence = confidence * (1 - (stronger_by_chance / n_permutations))
        return {
            'original_confidence': confidence,
            'adjusted_confidence': adjusted_confidence,
            'counterfactual_risk': stronger_by_chance / n_permutations,
            'alternative_explanations': ['ruido temporal', 'sesgo de muestreo']
        }
