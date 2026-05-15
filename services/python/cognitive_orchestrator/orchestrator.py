# services/cognitive_orchestrator/orchestrator.py
"""
Cognitive Orchestrator – Sistema nervioso del observatorio longitudinal.
Coordina módulos, resuelve conflictos, gestiona estado y persistencia,
y mantiene coherencia temporal y epistemológica.
"""

import time
import uuid
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from services.cognitive_orchestrator.event_bus import EventBus
from services.cognitive_orchestrator.persistence import Persistence
from services.cognitive_orchestrator.certainty_resolver import CertaintyResolver
from services.cognitive_orchestrator.state_manager import StateManager
from services.cognitive_orchestrator.signal_normalizer import SignalNormalizer
from services.cognitive_orchestrator.scheduler import Scheduler

# Módulos del twin cognitivo (capa 05)
from services.cognitive_twin.attentional_drift_engine import AttentionalDriftEngine
from services.cognitive_twin.execution_gap_engine import ExecutionGapEngine
from services.cognitive_twin.meta_observer import MetaObserver
from services.cognitive_twin.counterfactual_engine import CounterfactualEngine
from services.cognitive_twin.phase_transition_engine import PhaseTransitionEngine
from services.cognitive_twin.cognitive_energy_model import CognitiveEnergyModel
from services.cognitive_twin.identity_state_engine import IdentityStateEngine
from services.cognitive_twin.semantic_pressure import SemanticPressure
from services.cognitive_twin.contradiction_engine import ContradictionEngine


class CognitiveOrchestrator:
    """
    Orquestador principal. Orquesta los módulos cognitivos, gestiona
    el ciclo de vida de las inferencias, la certeza y la persistencia.
    """

    def __init__(self, supabase_client=None):
        self.bus = EventBus()
        self.persistence = Persistence(supabase_client)  # se conecta a Supabase/Postgres
        self.certainty = CertaintyResolver()
        self.state = StateManager()
        self.scheduler = Scheduler()
        self.normalizer = SignalNormalizer()

        # Inicializar módulos cognitivos
        self.modules = {
            "attention": AttentionalDriftEngine(),
            "energy": CognitiveEnergyModel(),
            "identity": IdentityStateEngine(),
            "meta": MetaObserver(),
            "counterfactual": CounterfactualEngine(),
            "phase_transition": PhaseTransitionEngine(),
            "execution_gap": ExecutionGapEngine(actions_db=[], audits_db=[]),  # se llenarán después
            "semantic_pressure": SemanticPressure(),
            "contradiction": ContradictionEngine()
        }

        # Registrar callbacks en el bus de eventos
        self._register_event_handlers()

    def _register_event_handlers(self):
        """Registra suscriptores a eventos internos."""
        self.bus.subscribe("telemetry.ingested", self._on_telemetry)
        self.bus.subscribe("inference.produced", self._on_inference)
        self.bus.subscribe("state.changed", self._on_state_change)

    # ============================================================
    # MÉTODOS PÚBLICOS
    # ============================================================

    def ingest_telemetry(self, node_id: str, telemetry_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Punto de entrada principal para datos de telemetría (texto, interacción, etc.)
        """
        self.bus.emit("telemetry.ingested", {
            "node_id": node_id,
            "payload": telemetry_payload,
            "timestamp": time.time()
        })
        return self._process_telemetry(node_id, telemetry_payload)

    def get_cognitive_state(self, node_id: str) -> Dict[str, Any]:
        """Recupera el último estado cognitivo consolidado para un nodo."""
        return self.state.get_state().get(node_id, {})

    # ============================================================
    # PROCESAMIENTO INTERNO
    # ============================================================

    def _process_telemetry(self, node_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ejecuta la pipeline de inferencia sobre la telemetría entrante.
        """
        # 1. Normalizar señales
        normalized = self._normalize_payload(payload)

        # 2. Actualizar módulos y extraer inferencias
        inference_results = self._run_inference_pipeline(node_id, normalized)

        # 3. Resolver certeza global
        certainty_map = {
            name: {"certainty": res.get("certainty", 0.5)}
            for name, res in inference_results.items()
        }
        certainty_result = self.certainty.resolve(certainty_map)

        # 4. Construir estado global
        global_state = {
            "node_id": node_id,
            "timestamp": time.time(),
            "certainty": certainty_result,
            "inferences": inference_results,
            "normalized_payload": normalized
        }

        # 5. Actualizar state manager y persistir
        self.state.update(node_id, global_state)
        snapshot = self.state.snapshot(node_id)

        # 6. Guardar snapshot y eventos en base de datos
        self.persistence.save_snapshot(node_id, snapshot)
        self._emit_cognitive_event(node_id, "state_update", global_state)

        # 7. Emitir inferencias individualmente
        for module_name, result in inference_results.items():
            self.bus.emit("inference.produced", {
                "node_id": node_id,
                "module": module_name,
                "result": result,
                "certainty": certainty_map[module_name]["certainty"]
            })

        return global_state

    def _normalize_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normaliza las señales crudas (valores entre 0-1, z-score, etc.)
        """
        normalized = {}
        for key, value in payload.items():
            if isinstance(value, (int, float)):
                normalized[key] = self.normalizer.normalize(value)
            else:
                normalized[key] = value
        return normalized

    def _run_inference_pipeline(self, node_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ejecuta cada módulo cognitivo con el payload y retorna sus resultados.
        """
        results = {}

        # Atención y deriva
        try:
            attention_result = self.modules["attention"].compute_drift()
            results["attention"] = {"drift_score": attention_result.get("drift_score", 0), "certainty": 0.7}
        except Exception as e:
            results["attention"] = {"error": str(e), "certainty": 0.0}

        # Identidad
        try:
            identity_engine = self.modules["identity"]
            identity_engine.update(payload.get("text", ""), payload)
            identity_dist = identity_engine.get_distribution()
            results["identity"] = {"distribution": identity_dist, "certainty": 0.65}
        except Exception as e:
            results["identity"] = {"error": str(e), "certainty": 0.0}

        # Energía cognitiva
        try:
            energy_engine = self.modules["energy"]
            energy_engine.update(
                payload.get("activity_intensity", 0.3),
                payload.get("duration_hours", 0.1)
            )
            energy_state = energy_engine.get_state()
            results["energy"] = {"state": energy_state, "certainty": 0.75}
        except Exception as e:
            results["energy"] = {"error": str(e), "certainty": 0.0}

        # Meta observador
        try:
            meta = self.modules["meta"]
            # registrar certezas de módulos (simulado)
            meta.update_certainty("attention", results["attention"].get("certainty", 0))
            meta.update_certainty("identity", results["identity"].get("certainty", 0))
            results["meta"] = {
                "overall_certainty": meta.overall_certainty(),
                "low_confidence": meta.low_confidence_areas(),
                "certainty": 0.8
            }
        except Exception as e:
            results["meta"] = {"error": str(e), "certainty": 0.0}

        # Fase de transición (requiere histórico)
        # Se puede ejecutar en background, aquí solo placeholder
        results["phase_transition"] = {"detected": False, "certainty": 0.5}

        # Presión semántica
        try:
            pressure = self.modules["semantic_pressure"].measure(payload.get("text", ""))
            results["semantic_pressure"] = {**pressure, "certainty": 0.7}
        except Exception as e:
            results["semantic_pressure"] = {"error": str(e), "certainty": 0.0}

        return results

    def _emit_cognitive_event(self, node_id: str, event_name: str, payload: Dict[str, Any]):
        """
        Registra un evento en el stream de event sourcing (capa 08).
        """
        event = {
            "id": str(uuid.uuid4()),
            "node_id": node_id,
            "event_name": event_name,
            "payload": payload,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        # Puedes guardar en tabla cognitive_event_stream
        # self.persistence.save_event(event)
        self.bus.emit("cognitive.event", event)

    # ============================================================
    # HANDLERS DE EVENTOS
    # ============================================================

    def _on_telemetry(self, data: Dict[str, Any]):
        """Callback cuando se ingiere telemetría."""
        # Podría iniciar procesamiento asíncrono
        pass

    def _on_inference(self, data: Dict[str, Any]):
        """Callback cuando una inferencia es producida."""
        # Por ejemplo, persistir la inferencia
        self.persistence.save_inference(
            node_id=data["node_id"],
            inference_type=data["module"],
            payload=data["result"],
            certainty=data["certainty"]
        )

    def _on_state_change(self, data: Dict[str, Any]):
        """Callback cuando el estado global cambia."""
        # Registrar transición de fase si aplica
        pass


# ============================================================
# FUNCIÓN DE ARRANQUE
# ============================================================

def start_orchestrator(supabase_client=None):
    """
    Crea una instancia del orquestador y lanza sus procesos en segundo plano.
    """
    orch = CognitiveOrchestrator(supabase_client)

    # Programar tareas periódicas (ej. limpieza de certeza, consolidación)
    scheduler = orch.scheduler
    scheduler.every(3600, lambda: orch._periodic_cleanup())

    return orch

# ============================================================
# EJEMPLO DE USO (solo para pruebas)
# ============================================================
if __name__ == "__main__":
    # Simulación sin Supabase real
    orch = start_orchestrator()
    telemetry = {
        "text": "Últimamente me siento muy disperso. No logro terminar lo que empiezo.",
        "activity_intensity": 0.7,
        "duration_hours": 0.5
    }
    result = orch.ingest_telemetry("node-123", telemetry)
    print(json.dumps(result, indent=2))