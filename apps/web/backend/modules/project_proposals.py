"""
Project Proposals – Generación de propuestas de proyectos musicales.

Regla de Oro: SIEMPRE llama mihm.apply_delta() antes de devolver datos.
Retardo: τ_proposal = 7200 s (2 horas) para análisis creativo.
"""

from datetime import datetime


class ProjectProposals:
    TAU_PROPOSAL = 7200  # 2 horas

    def __init__(self, mihm, groq=None):
        self.mihm = mihm
        self.groq = groq

    def generate(self, context: dict) -> dict:
        """
        Genera propuestas de proyectos musicales basadas en el estado MIHM.
        Aplica delta con retardo creativo.
        """
        state = self.mihm.state
        proposals = self._build_proposals(state, context)
        feasibility = self._score_feasibility(proposals, state)

        innovation_score = feasibility / 100.0

        delta = {
            'r':          0.08 * innovation_score,
            'ml_success': 0.05 * innovation_score,
        }

        u, J = self.mihm.apply_delta(
            delta,
            delay_seconds=self.TAU_PROPOSAL,
            action="project_proposals_generate"
        )
        self.mihm.meta_control()

        return {
            'proposals':        proposals,
            'feasibility_score': feasibility,
            'innovation_score': innovation_score,
            'delta_enqueued':   delta,
            'delay_seconds':    self.TAU_PROPOSAL,
            'u':                u,
            'cost_j':           J,
            'mihm_state':       dict(self.mihm.state),
            'irc':              self.mihm.irc,
            'timestamp':        datetime.utcnow().isoformat(),
        }

    def _build_proposals(self, state: dict, context: dict) -> list:
        ihg = state.get('ihg', -0.5)
        nti = state.get('nti', 0.5)

        proposals = []
        if ihg < -0.8:
            proposals.append({
                'name':       'Redistribución Armónica',
                'type':       'collab',
                'priority':   'high',
                'description': 'Proyecto colaborativo para reducir hegemonía. '
                               'Priorizar voces secundarias y capas de bajo volumen.',
            })
        if nti < 0.4:
            proposals.append({
                'name':       'Coherencia Rítmica v2',
                'type':       'production',
                'priority':   'medium',
                'description': 'Reconstrucción de la cadena rítmica. '
                               'Objetivo: NTI > 0.7 en 30 días.',
            })
        proposals.append({
            'name':       'Drop Viral TikTok',
            'type':       'release',
            'priority':   'high',
            'description': f'Hook de 3s optimizado para IHG={ihg:.2f}. '
                           'Fonemas: "ay", "oh", "yeah".',
        })
        return proposals

    def _score_feasibility(self, proposals: list, state: dict) -> float:
        base = 60.0 + state.get('r', 0.5) * 30.0 + state.get('nti', 0.5) * 10.0
        return round(min(100.0, base), 1)
