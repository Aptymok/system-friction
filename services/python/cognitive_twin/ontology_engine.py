# ontology_engine.py
import time
from sqlalchemy.orm import Session
from models import CausalRelation, ValidatedPattern
from config import HALF_LIFE_DAYS

class OntologyEngine:
    def __init__(self, db: Session):
        self.db = db

    def add_causal_link(self, cause_id: int, effect_id: int, weight=0.5, reversible=False, context=None):
        rel = CausalRelation(
            cause_pattern_id=cause_id,
            effect_pattern_id=effect_id,
            weight=weight,
            reversible=reversible,
            context=context or {},
            last_updated=time.time()
        )
        self.db.add(rel)
        self.db.commit()

    def decay_relations(self):
        now = time.time()
        for rel in self.db.query(CausalRelation).all():
            age_days = (now - rel.last_updated) / 86400
            decay = 0.5 ** (age_days / HALF_LIFE_DAYS)
            rel.weight *= decay
            if rel.weight < 0.05:
                self.db.delete(rel)
        self.db.commit()
