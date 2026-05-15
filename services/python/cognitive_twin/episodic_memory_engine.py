# episodic_memory_engine.py
import time
import heapq
from models import Episode
from sqlalchemy.orm import Session

class EpisodicMemory:
    def __init__(self, db: Session):
        self.db = db

    def store(self, user_id: str, title: str, description: str, salience: float, affective_load: float, related_pattern_ids: list = None):
        episode = Episode(
            user_id=user_id,
            title=title,
            description=description,
            salience=salience,
            affective_load=affective_load,
            timestamp=time.time(),
            related_patterns=related_pattern_ids or []
        )
        self.db.add(episode)
        self.db.commit()

    def retrieve(self, user_id: str, limit=5) -> list:
        episodes = self.db.query(Episode).filter_by(user_id=user_id).order_by(Episode.salience.desc()).limit(limit).all()
        return [{'title': e.title, 'description': e.description, 'salience': e.salience, 'affective_load': e.affective_load} for e in episodes]
