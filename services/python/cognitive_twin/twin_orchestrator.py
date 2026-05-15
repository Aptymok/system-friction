# twin_orchestrator.py
import asyncio
import threading
from queue import Queue
from datetime import datetime
from sqlalchemy.orm import Session
from models import get_db, SystemLog
from config import LOG_DIR
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("twin_orchestrator")

from ingest import DataIngestor
from normalize import Normalizer
from raw_archive import RawArchivist
from linguistic_cleaner import LinguisticCleaner
from phenomenology_tokenizer import PhenomenologyTokenizer
from semantic_extractor import SemanticExtractor
from symbolic_mapper import SymbolicMapper
from timeline_builder import TimelineBuilder
from cognitive_clusters import CognitiveCluster
from invariant_detector import InvariantDetector
from vector_engine import VectorEngine
from graph_builder import CognitiveGraph
from affective_dynamics import AffectiveDynamics
from friction_mapper import FrictionMapper
from adaptive_questionnaire import AdaptiveQuestionnaire
from twin_simulator import TwinSimulator
from similarity_engine import SimilarityEngine
from memory_core import MemoryCore
from dashboard import generate_dashboard
from ontology_engine import OntologyEngine
from identity_state_engine import IdentityStateEngine
from epistemic_confidence import EpistemicConfidence
from contradiction_engine import ContradictionEngine
from causality_decay import CausalityDecay
from observer_feedback_loop import ObserverFeedbackLoop
from semantic_pressure import SemanticPressure
from interaction_telemetry import InteractionTelemetry
from attentional_drift_engine import AttentionalDriftEngine
from sequence_entropy import SequenceEntropy
from decision_latency_mapper import DecisionLatencyMapper
from execution_gap_engine import ExecutionGapEngine
from environmental_load_engine import EnvironmentalLoadEngine
from counterfactual_engine import CounterfactualEngine
from episodic_memory_engine import EpisodicMemory
from meta_observer import MetaObserver
from phase_transition_engine import PhaseTransitionEngine
from epistemic_boundary_layer import EpistemicBoundaryLayer
from salience_scheduler import SalienceScheduler
from observer_effect_monitor import ObserverEffectMonitor
from policy_engine import PolicyEngine

class TwinOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.raw_archivist = RawArchivist(db)
        self.timeline = TimelineBuilder(db)
        self.memory_core = MemoryCore(db)
        self.ontology = OntologyEngine(db)
        self.identity = IdentityStateEngine()
        self.feedback = ObserverFeedbackLoop(db)
        self.telemetry = InteractionTelemetry()
        self.drift_engine = AttentionalDriftEngine()
        self.decision_latency = DecisionLatencyMapper()
        self.env_load = EnvironmentalLoadEngine()
        self.meta = MetaObserver()
        self.scheduler = SalienceScheduler()
        self.policy = PolicyEngine(db)
        self.episodic = EpisodicMemory(db)
        self.normalizer = Normalizer()
        self.linguistic_cleaner = LinguisticCleaner()
        self.tokenizer = PhenomenologyTokenizer()
        self.semantic = SemanticExtractor()
        self.symbolic = SymbolicMapper()
        self.affective = AffectiveDynamics()
        self.friction = FrictionMapper()
        self.questionnaire = AdaptiveQuestionnaire()
        self.similarity = SimilarityEngine()
        self.contradiction = ContradictionEngine()
        self.pressure = SemanticPressure()
        self.vector = VectorEngine()
        self.cluster = CognitiveCluster()
        self.invariant = InvariantDetector()
        self.transition = PhaseTransitionEngine()
        self.counterfactual = CounterfactualEngine()
        self.epistemic_layer = EpistemicBoundaryLayer()
        self.observer_effect = ObserverEffectMonitor()

        self.short_term_queue = Queue()
        self.longitudinal_tasks = []
        self.background_jobs = []

    def log(self, module: str, level: str, message: str, metadata=None):
        log_entry = SystemLog(module=module, level=level, message=message, metadata=metadata or {})
        self.db.add(log_entry)
        self.db.commit()
        getattr(logger, level.lower(), logger.info)(f"[{module}] {message}")

    def process_raw_input(self, user_id: str, file_path: str):
        self.log("orchestrator", "INFO", f"Procesando entrada para usuario {user_id}")
        doc = DataIngestor.ingest(file_path)
        raw_id = self.raw_archivist.archive(user_id, doc)
        doc = self.normalizer.process(doc)
        cleaned, corrections = self.linguistic_cleaner.correct(doc['normalized_text'])
        phen = self.tokenizer.tokenize(cleaned)
        keywords = self.semantic.extract(cleaned)
        symbols = self.symbolic.map(cleaned)
        affect = self.affective.analyze(cleaned)
        pressure = self.pressure.measure(cleaned)
        vector = self.vector.embed(cleaned)
        self.timeline.add_observation(user_id, "typing_speed", 0, unit="cps")
        self.identity.update(cleaned, {})
        self.schedule_longitudinal_analysis(user_id)
        self.log("orchestrator", "INFO", f"Procesamiento completado para {user_id}")

    def schedule_longitudinal_analysis(self, user_id: str):
        def analyze():
            with next(get_db()) as db:
                timeline = self.timeline.get_timeline(user_id)
                ihg_series = [obs.value for obs in timeline if obs.observation_type == 'ihg']
                if len(ihg_series) > 5:
                    transitions = self.transition.detect_transitions(ihg_series)
                    if transitions:
                        self.log("phase_transition", "INFO", f"Transiciones detectadas en {transitions}")
                invariants = self.invariant.detect_invariants([{'summary': obs.context_json.get('narrative', '')} for obs in timeline])
                self.invariant.save_invariants(db, user_id, invariants)
        thread = threading.Thread(target=analyze)
        thread.start()
        self.background_jobs.append(thread)

    def run_forever(self):
        self.log("orchestrator", "INFO", "Orquestador cognitivo iniciado")
        while True:
            if not self.short_term_queue.empty():
                task = self.short_term_queue.get()
            next_task = self.scheduler.get_next_task()
            if next_task:
                next_task()
            time.sleep(0.1)

def start_orchestrator():
    with next(get_db()) as db:
        orchestrator = TwinOrchestrator(db)
        thread = threading.Thread(target=orchestrator.run_forever, daemon=True)
        thread.start()
        return orchestrator
