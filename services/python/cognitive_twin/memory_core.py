# memory_core.py
from sqlalchemy.orm import Session
from models import CognitiveState
from datetime import datetime
import json

class MemoryCore:
    def __init__(self, db: Session):
        self.db = db

    def save_snapshot(self, user_id: str, profile: dict):
        state = self.db.query(CognitiveState).filter_by(user_id=user_id).first()
        if not state:
            state = CognitiveState(user_id=user_id)
            self.db.add(state)
        state.identity_distribution = profile.get('identity_distribution', {})
        state.energy_metrics = profile.get('energy_metrics', {})
        state.gap_score = profile.get('gap_score', 0.5)
        state.environmental_load = profile.get('environmental_load', 0.0)
        state.last_updated = datetime.utcnow()
        self.db.commit()

    def get_snapshot(self, user_id: str) -> dict:
        state = self.db.query(CognitiveState).filter_by(user_id=user_id).first()
        if not state:
            return {}
        return {
            'identity_distribution': state.identity_distribution,
            'energy_metrics': state.energy_metrics,
            'gap_score': state.gap_score,
            'environmental_load': state.environmental_load
        }
