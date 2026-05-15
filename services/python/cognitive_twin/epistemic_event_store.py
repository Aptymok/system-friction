
# ./services/cognitive_twin/epistemic_event_store.py

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from supabase import Client


# =========================================================
# EPISTEMIC TYPES
# =========================================================

SIGNAL_TYPES = {
    "observed",
    "declared",
    "inferred",
    "simulated",
    "projected",
    "derived"
}

EVIDENCE_LEVELS = {
    "direct",
    "behavioral",
    "statistical",
    "semantic",
    "speculative"
}


# =========================================================
# EVENT MODEL
# =========================================================

@dataclass
class EpistemicEvent:
    id: str
    node_id: str

    signal_type: str
    evidence_level: str

    source_module: str

    payload: Dict[str, Any]

    confidence: float = 0.5

    parent_event_id: Optional[str] = None

    inference_chain: Optional[List[str]] = None

    invalidated: bool = False

    invalidation_reason: Optional[str] = None

    created_at: str = datetime.now(timezone.utc).isoformat()

    checksum: Optional[str] = None


# =========================================================
# STORE
# =========================================================

class EpistemicEventStore:

    def __init__(self, supabase: Client):
        self.supabase = supabase

    # =====================================================
    # CREATE EVENT
    # =====================================================

    def create_event(
        self,
        node_id: str,
        signal_type: str,
        evidence_level: str,
        source_module: str,
        payload: Dict[str, Any],
        confidence: float = 0.5,
        parent_event_id: Optional[str] = None,
        inference_chain: Optional[List[str]] = None
    ) -> Dict[str, Any]:

        if signal_type not in SIGNAL_TYPES:
            raise ValueError(f"Invalid signal_type: {signal_type}")

        if evidence_level not in EVIDENCE_LEVELS:
            raise ValueError(f"Invalid evidence_level: {evidence_level}")

        event = EpistemicEvent(
            id=str(uuid.uuid4()),
            node_id=node_id,
            signal_type=signal_type,
            evidence_level=evidence_level,
            source_module=source_module,
            payload=payload,
            confidence=max(0.0, min(confidence, 1.0)),
            parent_event_id=parent_event_id,
            inference_chain=inference_chain or []
        )

        event.checksum = self._generate_checksum(event)

        result = self.supabase.table("epistemic_events").insert(
            asdict(event)
        ).execute()

        return result.data[0]

    # =====================================================
    # INVALIDATE EVENT
    # =====================================================

    def invalidate_event(
        self,
        event_id: str,
        reason: str
    ) -> Dict[str, Any]:

        result = self.supabase.table("epistemic_events").update({
            "invalidated": True,
            "invalidation_reason": reason
        }).eq("id", event_id).execute()

        return result.data[0]

    # =====================================================
    # FETCH ACTIVE EVENTS
    # =====================================================

    def fetch_active_events(
        self,
        node_id: str,
        signal_type: Optional[str] = None,
        min_confidence: float = 0.0
    ) -> List[Dict[str, Any]]:

        query = self.supabase.table("epistemic_events") \
            .select("*") \
            .eq("node_id", node_id) \
            .eq("invalidated", False)

        if signal_type:
            query = query.eq("signal_type", signal_type)

        result = query.execute()

        rows = result.data or []

        return [
            row for row in rows
            if row.get("confidence", 0) >= min_confidence
        ]

    # =====================================================
    # BUILD LINEAGE
    # =====================================================

    def build_lineage(
        self,
        event_id: str
    ) -> List[Dict[str, Any]]:

        lineage = []

        current_id = event_id

        while current_id:

            result = self.supabase.table("epistemic_events") \
                .select("*") \
                .eq("id", current_id) \
                .limit(1) \
                .execute()

            rows = result.data or []

            if not rows:
                break

            event = rows[0]

            lineage.append(event)

            current_id = event.get("parent_event_id")

        return lineage

    # =====================================================
    # DETECT SELF-REFERENTIAL LOOPS
    # =====================================================

    def detect_recursive_inference(
        self,
        inference_chain: List[str]
    ) -> bool:

        seen = set()

        for item in inference_chain:

            if item in seen:
                return True

            seen.add(item)

        return False

    # =====================================================
    # EPISTEMIC SCORE
    # =====================================================

    def compute_epistemic_weight(
        self,
        signal_type: str,
        evidence_level: str,
        confidence: float
    ) -> float:

        signal_weights = {
            "observed": 1.0,
            "declared": 0.85,
            "derived": 0.7,
            "inferred": 0.55,
            "projected": 0.35,
            "simulated": 0.2
        }

        evidence_weights = {
            "direct": 1.0,
            "behavioral": 0.9,
            "statistical": 0.75,
            "semantic": 0.6,
            "speculative": 0.3
        }

        score = (
            signal_weights.get(signal_type, 0.5)
            * evidence_weights.get(evidence_level, 0.5)
            * confidence
        )

        return round(score, 4)

    # =====================================================
    # CHECKSUM
    # =====================================================

    def _generate_checksum(
        self,
        event: EpistemicEvent
    ) -> str:

        serialized = json.dumps({
            "node_id": event.node_id,
            "signal_type": event.signal_type,
            "payload": event.payload,
            "created_at": event.created_at
        }, sort_keys=True)

        return hashlib.sha256(
            serialized.encode("utf-8")
        ).hexdigest()