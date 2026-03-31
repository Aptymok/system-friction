"""
ML Friction – Predicción de éxito musical mediante aprendizaje automático.

Regla de Oro: SIEMPRE llama mihm.apply_delta() antes de devolver datos.
Sin retardo: las predicciones ML impactan el estado inmediatamente.
"""

import numpy as np
from datetime import datetime


class MLFriction:
    """
    Predictor de éxito musical que alimenta el estado MIHM con su estimación.
    Usa el estado actual de MIHM como parte del vector de features.
    """

    def __init__(self, mihm):
        self.mihm = mihm
        # Pesos del modelo lineal (entrenables via feedback)
        self._weights = np.array([0.3, 0.25, 0.2, 0.15, 0.1])
        self._bias = 0.5

    def predict_success(self, features: dict) -> dict:
        """
        Predice la probabilidad de éxito (0–1) de una canción.
        El vector de features incluye el estado actual de MIHM.
        """
        # Vector de features enriquecido con estado MIHM
        state = self.mihm.state
        x = np.array([
            float(features.get('onset_density', 2.0) / 10.0),
            float(features.get('spectral_entropy', 5.0) / 15.0),
            float(np.clip((state['ihg'] + 2.0) / 2.0, 0.0, 1.0)),
            float(state['nti']),
            float(state['r']),
        ])

        # Regresión logística simple
        logit = float(np.dot(self._weights, x) + self._bias)
        pred = float(1.0 / (1.0 + np.exp(-logit)))
        pred = float(np.clip(pred, 0.0, 1.0))

        # Delta sobre estado MIHM (acoplamiento obligatorio)
        delta = {'ml_success': (pred - 0.5) * 0.4}

        u, J = self.mihm.apply_delta(delta, action=f"ml_predict:{pred:.3f}")

        # meta_control después de predicción significativa
        self.mihm.meta_control()

        return {
            'prediction':    pred,
            'confidence':    abs(pred - 0.5) * 2.0,
            'verdict':       'probable_hit' if pred > 0.65 else
                             'riesgo_alto' if pred < 0.4 else 'neutral',
            'delta_applied': delta,
            'u':             u,
            'cost_j':        J,
            'mihm_state':    dict(self.mihm.state),
            'irc':           self.mihm.irc,
            'timestamp':     datetime.utcnow().isoformat(),
        }

    def train(self, features: dict, true_outcome: float, learning_rate: float = 0.01):
        """
        Actualiza los pesos del modelo basado en el resultado real.
        Aplica delta al MIHM según el error del modelo.
        """
        state = self.mihm.state
        x = np.array([
            float(features.get('onset_density', 2.0) / 10.0),
            float(features.get('spectral_entropy', 5.0) / 15.0),
            float(np.clip((state['ihg'] + 2.0) / 2.0, 0.0, 1.0)),
            float(state['nti']),
            float(state['r']),
        ])
        logit = float(np.dot(self._weights, x) + self._bias)
        pred = float(1.0 / (1.0 + np.exp(-logit)))
        error = true_outcome - pred

        self._weights += learning_rate * error * x
        self._bias += learning_rate * error

        delta = {'ml_success': error * 0.2}
        u, J = self.mihm.apply_delta(delta, action=f"ml_train:err={error:.3f}")
        self.mihm.meta_control()

        return {
            'error':       error,
            'updated_bias': self._bias,
            'u':           u,
            'cost_j':      J,
        }
