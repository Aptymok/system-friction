"""
Marketing Engine – Motor de estrategia de marketing para System Friction.

Regla de Oro: SIEMPRE llama mihm.apply_delta() antes de devolver datos.
Retardo: τ_marketing = 86400 s (1 día) para latencia real de campañas.
"""

from datetime import datetime


class MarketingEngine:
    TAU_MARKETING = 86400  # 1 día

    def __init__(self, mihm):
        self.mihm = mihm

    def plan_campaign(self, release_name: str, budget: float = 1000.0,
                      channels: list = None) -> dict:
        """
        Planifica una campaña de marketing y aplica delta con retardo de 1 día.
        """
        channels = channels or ['tiktok', 'instagram', 'spotify']
        state = self.mihm.state

        strategy = self._build_strategy(state, release_name, budget, channels)
        expected_reach = self._estimate_reach(budget, channels, state)
        campaign_score = min(1.0, expected_reach / 100000)

        delta = {
            'nti': 0.15 * campaign_score,
            'r':   0.10 * campaign_score,
            'ihg': 0.02 * campaign_score,  # marketing reduce hegemonía levemente
        }

        u, J = self.mihm.apply_delta(
            delta,
            delay_seconds=self.TAU_MARKETING,
            action=f"marketing_campaign:{release_name[:30]}"
        )
        self.mihm.meta_control()

        return {
            'release_name':   release_name,
            'budget':         budget,
            'channels':       channels,
            'strategy':       strategy,
            'expected_reach': expected_reach,
            'campaign_score': campaign_score,
            'delta_enqueued': delta,
            'delay_seconds':  self.TAU_MARKETING,
            'u':              u,
            'cost_j':         J,
            'mihm_state':     dict(self.mihm.state),
            'irc':            self.mihm.irc,
            'timestamp':      datetime.utcnow().isoformat(),
        }

    def _build_strategy(self, state: dict, release_name: str,
                        budget: float, channels: list) -> dict:
        ihg = state.get('ihg', -0.5)
        nti = state.get('nti', 0.5)

        tiktok_budget = budget * 0.5 if 'tiktok' in channels else 0
        instagram_budget = budget * 0.3 if 'instagram' in channels else 0
        spotify_budget = budget * 0.2 if 'spotify' in channels else 0

        hook_length = 3 if ihg < -0.6 else 5
        tone = 'urgente' if nti < 0.4 else 'aspiracional'

        return {
            'hook_length_seconds': hook_length,
            'tone':                tone,
            'tiktok_budget':       tiktok_budget,
            'instagram_budget':    instagram_budget,
            'spotify_budget':      spotify_budget,
            'recommended_post_time': '19:00 - 21:00 local',
            'hashtag_strategy':    ['#viral', '#music', f'#{release_name.replace(" ", "")}'],
        }

    def _estimate_reach(self, budget: float, channels: list,
                        state: dict) -> float:
        base_cpm = 5.0  # costo por mil impresiones
        multiplier = 1.0 + state.get('nti', 0.5) * 0.5
        impressions = (budget / base_cpm) * 1000 * multiplier
        tiktok_bonus = 1.4 if 'tiktok' in channels else 1.0
        return round(impressions * tiktok_bonus, 0)
