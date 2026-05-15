# raw_archive.py
from sqlalchemy.orm import Session
from models import RawObservation, get_db
from datetime import datetime

class RawArchivist:
    def __init__(self, db_session: Session):
        self.db = db_session

    def archive(self, user_id: str, doc: dict) -> int:
        obs = RawObservation(
            user_id=user_id,
            source_type=doc['source_type'],
            source_id=doc['source_id'],
            raw_text=doc['raw_text'],
            ingested_at=datetime.utcnow(),
            metadata_json=doc.get('metadata', {})
        )
        self.db.add(obs)
        self.db.commit()
        return obs.id
