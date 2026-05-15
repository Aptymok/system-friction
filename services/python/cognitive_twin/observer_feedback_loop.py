# observer_feedback_loop.py
from sqlalchemy.orm import Session
from models import Feedback

class ObserverFeedbackLoop:
    def __init__(self, db: Session):
        self.db = db

    def record_feedback(self, user_id: str, inference_id: int, rating: int, comment: str = ''):
        fb = Feedback(
            user_id=user_id,
            inference_id=inference_id,
            rating=rating,
            comment=comment
        )
        self.db.add(fb)
        self.db.commit()

    def adjust_model(self, model_weights: dict) -> dict:
        rejections = self.db.query(Feedback).filter(Feedback.rating == 1).count()
        if rejections > 3:
            model_weights['confidence_threshold'] = model_weights.get('confidence_threshold', 0.6) * 0.9
        return model_weights
