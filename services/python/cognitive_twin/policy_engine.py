# policy_engine.py
import time
from models import ValidatedPattern, CausalRelation
from sqlalchemy.orm import Session

class PolicyEngine:
    def __init__(self, db: Session):
        self.db = db

    def apply_forgetting(self, max_age_days=90):
        cutoff = time.time() - max_age_days * 86400
        patterns = self.db.query(ValidatedPattern).filter(ValidatedPattern.last_seen < cutoff).all()
        for p in patterns:
            self.db.delete(p)
        self.db.commit()

    def anti_crystallization(self, user_id: str):
        pass
