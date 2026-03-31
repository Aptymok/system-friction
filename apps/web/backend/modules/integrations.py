"""
Integrations – Módulo de integraciones externas para System Friction.

Integra señales de plataformas externas (YouTube Analytics, SoundCloud, etc.)
y las acopla obligatoriamente al estado MIHM.

Regla de Oro: SIEMPRE llama mihm.apply_delta() antes de devolver datos.
Retardo: τ_integrations = 3600 s (1 hora) por default.
"""

from datetime import datetime


class Integrations:
    TAU_DEFAULT = 3600  # 1 hora

    def __init__(self, mihm):
        self.mihm = mihm

    def ingest_youtube_analytics(self, video_id: str, metrics: dict) -> dict:
        """
        Ingesta métricas de YouTube Analytics y aplica delta al MIHM.
        metrics: {'views', 'likes', 'ctr', 'avg_watch_time'}
        """
        views = metrics.get('views', 0)
        ctr = metrics.get('ctr', 0.0)
        avg_watch = metrics.get('avg_watch_time', 0.0)
        likes = metrics.get('likes', 0)

        engagement = min(1.0, (likes / max(1, views)) * 10)
        viral_index = min(1.0, ctr * 5 + avg_watch / 300)

        delta = {
            'nti': 0.12 * viral_index,
            'r':   0.06 * engagement,
        }

        u, J = self.mihm.apply_delta(
            delta,
            delay_seconds=self.TAU_DEFAULT,
            action=f"youtube:{video_id[:20]}"
        )
        self.mihm.meta_control()

        return {
            'platform':      'youtube',
            'video_id':      video_id,
            'engagement':    engagement,
            'viral_index':   viral_index,
            'delta_enqueued': delta,
            'delay_seconds': self.TAU_DEFAULT,
            'u':             u,
            'cost_j':        J,
            'mihm_state':    dict(self.mihm.state),
            'irc':           self.mihm.irc,
            'timestamp':     datetime.utcnow().isoformat(),
        }

    def ingest_soundcloud(self, track_id: str, plays: int, reposts: int) -> dict:
        """Ingesta datos de SoundCloud."""
        virality = min(1.0, reposts / max(1, plays) * 20)
        delta = {
            'nti': 0.08 * virality,
            'r':   0.04 * min(1.0, plays / 10000),
        }

        u, J = self.mihm.apply_delta(
            delta,
            delay_seconds=self.TAU_DEFAULT,
            action=f"soundcloud:{track_id[:20]}"
        )
        self.mihm.meta_control()

        return {
            'platform':      'soundcloud',
            'track_id':      track_id,
            'plays':         plays,
            'reposts':       reposts,
            'virality':      virality,
            'delta_enqueued': delta,
            'delay_seconds': self.TAU_DEFAULT,
            'u':             u,
            'cost_j':        J,
            'mihm_state':    dict(self.mihm.state),
            'irc':           self.mihm.irc,
            'timestamp':     datetime.utcnow().isoformat(),
        }

    def ingest_generic(self, platform: str, signal_name: str,
                       value: float, weight: float = 0.1) -> dict:
        """
        Ingesta genérica para cualquier plataforma o señal externa.
        value: normalizado 0–1.
        """
        delta = {
            'nti': weight * value,
            'r':   weight * 0.5 * value,
        }
        u, J = self.mihm.apply_delta(
            delta,
            delay_seconds=self.TAU_DEFAULT,
            action=f"integration:{platform}:{signal_name}"
        )
        self.mihm.meta_control()

        return {
            'platform':      platform,
            'signal_name':   signal_name,
            'value':         value,
            'delta_enqueued': delta,
            'u':             u,
            'cost_j':        J,
            'mihm_state':    dict(self.mihm.state),
            'irc':           self.mihm.irc,
            'timestamp':     datetime.utcnow().isoformat(),
        }
