"""
Social Analyzer – Módulo de análisis de redes sociales para System Friction.

Regla de Oro: SIEMPRE llama mihm.apply_delta() antes de devolver datos.
Retardo modelado: τ_social = 3600 s (1 hora) para reflejar latencia de propagación.
"""

import random
from datetime import datetime


class SocialAnalyzer:
    # Retardo sistémico del módulo social (1 hora en segundos)
    TAU_SOCIAL = 3600

    def __init__(self, mihm):
        self.mihm = mihm

    def analyze_social(self, query: str) -> dict:
        """
        Analiza una consulta social y actualiza el estado MIHM con retardo.

        El delta se aplica con delay=TAU_SOCIAL para modelar latencia real
        de propagación en redes sociales.
        """
        # Simulación de métricas sociales (en producción: API real)
        trending_score = self._fetch_trending_score(query)
        phonemes = self._extract_phonemes(query)
        sentiment_force = self._compute_sentiment(query)
        engagement_rate = self._estimate_engagement(query, trending_score)

        # Delta sobre el estado MIHM – acoplamiento obligatorio
        delta = {
            'nti': 0.12 * trending_score,
            'r':   0.07 * engagement_rate,
        }

        # Aplicar con retardo de 1 hora (τ_social)
        u, J = self.mihm.apply_delta(
            delta,
            delay_seconds=self.TAU_SOCIAL,
            action=f"social_analyze:{query[:40]}"
        )

        # meta_control se llama después de cada acción significativa
        self.mihm.meta_control()

        return {
            'query':          query,
            'trending_score': trending_score,
            'phonemes':       phonemes,
            'sentiment_force': sentiment_force,
            'engagement_rate': engagement_rate,
            'delta_enqueued': delta,
            'delay_seconds':  self.TAU_SOCIAL,
            'mihm_state':     dict(self.mihm.state),
            'cost_j':         self.mihm.cost_function(),
            'u':              u,
            'irc':            self.mihm.irc,
            'timestamp':      datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------
    # Helpers internos (stubs realistas)
    # ------------------------------------------------------------------

    def _fetch_trending_score(self, query: str) -> float:
        """Puntaje de tendencia simulado (0–1). Reemplazar con API TikTok/X."""
        seed = sum(ord(c) for c in query) % 100
        return round(0.3 + (seed / 100) * 0.7, 4)

    def _extract_phonemes(self, query: str) -> list:
        """Extrae fonemas vocálicos dominantes del texto."""
        vowels = [c for c in query.lower() if c in 'aeiouáéíóú']
        freq = {}
        for v in vowels:
            freq[v] = freq.get(v, 0) + 1
        return sorted(freq, key=freq.get, reverse=True)[:5]

    def _compute_sentiment(self, query: str) -> float:
        """Fuerza de sentimiento simulada (–1 a +1)."""
        positive = sum(1 for w in ['love', 'great', 'fire', 'hit', 'viral'] if w in query.lower())
        negative = sum(1 for w in ['hate', 'bad', 'flop', 'dead'] if w in query.lower())
        return round(min(1.0, max(-1.0, (positive - negative) * 0.3)), 4)

    def _estimate_engagement(self, query: str, trending_score: float) -> float:
        """Tasa de engagement estimada (0–1)."""
        base = 0.2 + trending_score * 0.5
        noise = random.uniform(-0.05, 0.05)
        return round(min(1.0, max(0.0, base + noise)), 4)
