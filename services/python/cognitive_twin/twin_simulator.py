# twin_simulator.py
import random
import numpy as np

class TwinSimulator:
    def __init__(self, profile):
        self.profile = profile

    def generate_response(self, prompt: str) -> str:
        state = self._infer_state(prompt)
        relevant = self._select_invariants(prompt)
        tension = self._simulate_tension(state, relevant)
        style = self.profile.get('decision_style', 'linear')
        if style == 'linear':
            response = self._linear_response(prompt, tension)
        elif style == 'tree':
            response = self._tree_response(prompt, tension)
        elif style == 'spiral':
            response = self._spiral_response(prompt, tension)
        else:
            response = self._associative_response(prompt, tension)
        return response

    def _infer_state(self, prompt):
        return {'arousal': 0.5, 'valence': 0.5}

    def _select_invariants(self, prompt):
        return [inv for inv in self.profile.get('invariants', []) if inv['value'] in prompt]

    def _simulate_tension(self, state, invariants):
        return min(1.0, len(invariants) * 0.2 + state['arousal'])

    def _linear_response(self, prompt, tension):
        return f"Considerando tu pregunta, mi respuesta es directa: {prompt[:50]}... (nivel de tensión {tension:.2f})"

    def _tree_response(self, prompt, tension):
        return f"Veo varias ramas: primero {prompt[:30]}, pero también habría que considerar la otra opción."

    def _spiral_response(self, prompt, tension):
        return f"Esto me recuerda a algo similar que mencionaste antes. La fricción parece cíclica."

    def _associative_response(self, prompt, tension):
        return f"Al leer '{prompt[:40]}', me viene a la mente {random.choice(['un símbolo recurrente', 'una contradicción pasada', 'una emoción latente'])}."
