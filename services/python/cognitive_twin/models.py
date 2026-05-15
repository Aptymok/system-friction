# models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, relationship
import json
from datetime import datetime
from services.python.cognitive_twin.cognitive_twin.config import DATABASE_URL

Base = declarative_base()

# ========== OBSERVACIONES RAW ==========
class RawObservation(Base):
    __tablename__ = "raw_observations"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), nullable=False, index=True)
    source_type = Column(String(32))  # 'text', 'audio', 'pdf', 'whatsapp', etc.
    source_id = Column(String(256))
    raw_text = Column(Text)
    ingested_at = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(JSON, default={})

# ========== OBSERVACIONES ESTRUCTURADAS (telemetría, tokens, etc.) ==========
class StructuredObservation(Base):
    __tablename__ = "structured_observations"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), index=True)
    raw_observation_id = Column(Integer, ForeignKey("raw_observations.id"))
    observation_type = Column(String(64))  # 'typing_speed', 'backspace_rate', 'topic_durations', etc.
    value = Column(Float)
    unit = Column(String(32))
    context_json = Column(JSON, default={})
    observed_at = Column(DateTime, default=datetime.utcnow)

# ========== INFERENCIAS DÉBILES (derivadas de observaciones) ==========
class WeakInference(Base):
    __tablename__ = "weak_inferences"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), index=True)
    inference_type = Column(String(64))  # 'cognitive_fatigue', 'attentional_drift', etc.
    value = Column(Float)  # 0..1
    confidence = Column(Float, default=0.5)  # 0..1
    based_on_observations = Column(JSON, default=list)  # lista de ids de StructuredObservation
    created_at = Column(DateTime, default=datetime.utcnow)

# ========== PATRONES VALIDADOS (invariantes, contradicciones, etc.) ==========
class ValidatedPattern(Base):
    __tablename__ = "validated_patterns"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), index=True)
    pattern_type = Column(String(64))  # 'invariant', 'contradiction', 'loop', etc.
    label = Column(String(256))
    value = Column(Float)  # intensidad o score
    confidence = Column(Float)
    supporting_inferences = Column(JSON, default=list)  # ids de WeakInference
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    recurrence_count = Column(Integer, default=1)

# ========== EPISODIOS (memoria episódica) ==========
class Episode(Base):
    __tablename__ = "episodes"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), index=True)
    title = Column(String(256))
    description = Column(Text)
    salience = Column(Float)  # 0..1
    affective_load = Column(Float)  # 0..1
    timestamp = Column(DateTime, default=datetime.utcnow)
    related_patterns = Column(JSON, default=list)  # ids de ValidatedPattern
    context_json = Column(JSON, default={})

# ========== RELACIONES CAUSALES (ontología dinámica) ==========
class CausalRelation(Base):
    __tablename__ = "causal_relations"
    id = Column(Integer, primary_key=True)
    cause_pattern_id = Column(Integer, ForeignKey("validated_patterns.id"))
    effect_pattern_id = Column(Integer, ForeignKey("validated_patterns.id"))
    weight = Column(Float)  # 0..1
    reversible = Column(Boolean, default=False)
    context = Column(JSON, default={})
    last_updated = Column(DateTime, default=datetime.utcnow)

# ========== ESTADO COGNITIVO ACTUAL (síntesis) ==========
class CognitiveState(Base):
    __tablename__ = "cognitive_states"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), unique=True, index=True)
    identity_distribution = Column(JSON, default={})  # dict de estados -> probabilidad
    energy_metrics = Column(JSON, default={})  # fatiga, expansión, saturación
    gap_score = Column(Float, default=0.5)
    environmental_load = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ========== FEEDBACK DEL USUARIO ==========
class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), index=True)
    inference_id = Column(Integer, ForeignKey("weak_inferences.id"))
    rating = Column(Integer)  # 1=rechazo, 2=parcial, 3=aceptación
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

# ========== LOGS DEL SISTEMA (metacognición) ==========
class SystemLog(Base):
    __tablename__ = "system_logs"
    id = Column(Integer, primary_key=True)
    module = Column(String(64))
    level = Column(String(16))  # INFO, WARN, ERROR
    message = Column(Text)
    metadata = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

# Crear engine y sesión
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()