# execution_gap_engine.py
class ExecutionGapEngine:
    def __init__(self, actions_db, audits_db):
        self.actions = actions_db
        self.audits = audits_db

    def compute_gap(self) -> dict:
        total_actions = len(self.actions)
        if total_actions == 0:
            return {'gap_score': 1.0, 'completed_ratio': 0.0, 'abandoned_ratio': 0.0}
        completed = sum(1 for a in self.actions if a.get('status') == 'completed')
        abandoned = sum(1 for a in self.actions if a.get('status') in ('missed', 'abandoned'))
        proposed = len(self.audits)
        missing_actions = max(0, proposed - total_actions)
        gap_score = (1 - (completed / max(1, total_actions))) * 0.7 + (missing_actions / max(1, proposed)) * 0.3
        return {
            'gap_score': min(1.0, gap_score),
            'completed_ratio': completed / max(1, total_actions),
            'abandoned_ratio': abandoned / max(1, total_actions),
            'missing_proposals': missing_actions
        }
