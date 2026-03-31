"""
Scraping Spotify – Módulo de análisis de tendencias en Spotify.

Regla de Oro: SIEMPRE llama mihm.apply_delta() antes de devolver datos.
Retardo: τ_marketing = 86400 s (1 día) para latencia de mercado.
"""

import random
from datetime import datetime


class SpotifyScraper:
    TAU_MARKETING = 86400  # 1 día en segundos

    def __init__(self, mihm):
        self.mihm = mihm

    def analyze_trends(self, genre: str = "reggaeton", limit: int = 20) -> dict:
        """
        Analiza tendencias de Spotify para un género dado.
        Aplica delta al MIHM con retardo de mercado.
        """
        tracks = self._fetch_trending_tracks(genre, limit)
        avg_tempo = float(sum(t['tempo'] for t in tracks) / len(tracks))
        avg_energy = float(sum(t['energy'] for t in tracks) / len(tracks))
        dominant_key = self._dominant_key(tracks)
        viral_score = self._compute_viral_score(tracks)

        delta = {
            'nti':  0.10 * viral_score,
            'r':    0.05 * avg_energy,
            'ihg': -0.03 * (1.0 - viral_score),
        }

        u, J = self.mihm.apply_delta(
            delta,
            delay_seconds=self.TAU_MARKETING,
            action=f"spotify_trends:{genre}"
        )
        self.mihm.meta_control()

        return {
            'genre':         genre,
            'tracks_count':  len(tracks),
            'avg_tempo':     avg_tempo,
            'avg_energy':    avg_energy,
            'dominant_key':  dominant_key,
            'viral_score':   viral_score,
            'delta_enqueued': delta,
            'delay_seconds': self.TAU_MARKETING,
            'u':             u,
            'cost_j':        J,
            'mihm_state':    dict(self.mihm.state),
            'irc':           self.mihm.irc,
            'timestamp':     datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------

    def _fetch_trending_tracks(self, genre: str, limit: int) -> list:
        """Stub: en producción usar Spotify Web API."""
        rng = random.Random(hash(genre) % 2**31)
        return [
            {
                'id':     f"track_{i}",
                'tempo':  rng.uniform(80, 180),
                'energy': rng.uniform(0.3, 1.0),
                'key':    rng.randint(0, 11),
            }
            for i in range(limit)
        ]

    def _dominant_key(self, tracks: list) -> str:
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        counts = {}
        for t in tracks:
            k = t.get('key', 0)
            counts[k] = counts.get(k, 0) + 1
        best = max(counts, key=counts.get)
        return keys[best % 12]

    def _compute_viral_score(self, tracks: list) -> float:
        avg_energy = sum(t['energy'] for t in tracks) / len(tracks)
        tempo_variance = (max(t['tempo'] for t in tracks) -
                          min(t['tempo'] for t in tracks)) / 100.0
        return round(min(1.0, avg_energy * 0.7 + (1 - tempo_variance) * 0.3), 4)
