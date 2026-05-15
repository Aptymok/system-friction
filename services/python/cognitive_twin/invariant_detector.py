# invariant_detector.py
from collections import Counter
from models import ValidatedPattern
from sqlalchemy.orm import Session
from datetime import datetime

class InvariantDetector:
    @staticmethod
    def detect_invariants(timeline_data: list, decay_factor=0.99) -> list:
        phrase_counter = Counter()
        for event in timeline_data:
            words = event.get('summary', '').split()
            for i in range(len(words)-2):
                phrase = ' '.join(words[i:i+3])
                phrase_counter[phrase] += 1
        invariants = []
        for phrase, count in phrase_counter.most_common(10):
            if count > 2:
                stability = min(1, count/10)
                invariants.append({'type': 'repeated_phrase', 'value': phrase, 'stability': stability})
        return invariants

    def save_invariants(self, db: Session, user_id: str, invariants: list):
        for inv in invariants:
            pattern = ValidatedPattern(
                user_id=user_id,
                pattern_type='invariant',
                label=inv['value'],
                value=inv['stability'],
                confidence=0.7,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow()
            )
            db.add(pattern)
        db.commit()
