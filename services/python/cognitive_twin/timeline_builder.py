# timeline_builder.py
from sqlalchemy.orm import Session
from models import StructuredObservation, Episode, ValidatedPattern
from datetime import datetime

class TimelineBuilder:
    def __init__(self, db: Session):
        self.db = db

    def add_observation(self, user_id: str, obs_type: str, value: float, unit: str = "", context: dict = None):
        obs = StructuredObservation(
            user_id=user_id,
            observation_type=obs_type,
            value=value,
            unit=unit,
            context_json=context or {},
            observed_at=datetime.utcnow()
        )
        self.db.add(obs)
        self.db.commit()
        return obs.id

    def add_episode(self, user_id: str, title: str, description: str, salience: float, affective_load: float, related_pattern_ids: list = None):
        episode = Episode(
            user_id=user_id,
            title=title,
            description=description,
            salience=salience,
            affective_load=affective_load,
            timestamp=datetime.utcnow(),
            related_patterns=related_pattern_ids or []
        )
        self.db.add(episode)
        self.db.commit()
        return episode.id

    def get_timeline(self, user_id: str, limit=100):
        return self.db.query(StructuredObservation).filter_by(user_id=user_id).order_by(StructuredObservation.observed_at.desc()).limit(limit).all()
