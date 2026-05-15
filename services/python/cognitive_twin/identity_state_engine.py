# identity_state_engine.py
import numpy as np

class IdentityStateEngine:
    STATES = ['operational', 'aspirational', 'defensive', 'symbolic', 'stressed', 'social']

    def __init__(self):
        self.state_vector = np.array([1.0, 0.0, 0.0, 0.0, 0.0, 0.0])
        self.decay = 0.95

    def update(self, text: str, context: dict):
        new_vector = self._infer_from_text(text, context)
        self.state_vector = 0.7 * self.state_vector + 0.3 * new_vector
        self.state_vector = self.state_vector / np.sum(self.state_vector)

    def _infer_from_text(self, text: str, context: dict) -> np.ndarray:
        lower = text.lower()
        scores = np.zeros(len(self.STATES))
        if any(w in lower for w in ['tengo que', 'debo', 'responsabilidad']):
            scores[0] += 0.6
        if any(w in lower for w in ['quisiera', 'sueño', 'aspiro']):
            scores[1] += 0.7
        if any(w in lower for w in ['pero', 'no puedo', 'es que']):
            scores[2] += 0.8
        if any(w in lower for w in ['como si', 'símbolo', 'metáfora']):
            scores[3] += 0.5
        if any(w in lower for w in ['presión', 'estrés', 'colapso']):
            scores[4] += 0.9
        if any(w in lower for w in ['ellos', 'nosotros', 'comunidad']):
            scores[5] += 0.4
        if np.sum(scores) == 0:
            scores[0] = 0.5
        return scores / np.sum(scores)

    def get_distribution(self) -> dict:
        return {state: float(prob) for state, prob in zip(self.STATES, self.state_vector)}
