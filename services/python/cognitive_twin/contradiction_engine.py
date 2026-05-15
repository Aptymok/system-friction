# contradiction_engine.py
import numpy as np
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

model = SentenceTransformer(EMBEDDING_MODEL)

class ContradictionEngine:
    def __init__(self):
        self.history = []

    def detect(self, statement_a: str, statement_b: str, context_a=None, context_b=None) -> dict:
        emb_a = model.encode(statement_a)
        emb_b = model.encode(statement_b)
        similarity = np.dot(emb_a, emb_b) / (np.linalg.norm(emb_a) * np.linalg.norm(emb_b))
        operational = self._operational_conflict(statement_a, statement_b)
        temporal = self._temporal_conflict(statement_a, statement_b)
        axiological = self._axiological_conflict(statement_a, statement_b)
        is_contradiction = similarity < 0.3 or operational or temporal or axiological
        if similarity < 0.3 and not operational and not temporal:
            ctype = 'semantic'
            strength = 1.0 - similarity
        elif operational:
            ctype = 'operational'
            strength = 0.9
        elif temporal:
            ctype = 'temporal'
            strength = 0.8
        elif axiological:
            ctype = 'axiological'
            strength = 0.7
        else:
            ctype = 'coherent'
            strength = similarity
        return {
            'is_contradiction': is_contradiction,
            'type': ctype,
            'strength': strength,
            'details': {
                'semantic_similarity': similarity,
                'operational': operational,
                'temporal': temporal,
                'axiological': axiological
            }
        }

    def _operational_conflict(self, a, b):
        import re
        a_verbs = set(re.findall(r'\b(hacer|ejecutar|decidir|ir|venir|comenzar|terminar|abrir|cerrar)\b', a.lower()))
        b_verbs = set(re.findall(r'\b(hacer|ejecutar|decidir|ir|venir|comenzar|terminar|abrir|cerrar)\b', b.lower()))
        return len(a_verbs & b_verbs) == 0 and len(a_verbs) > 0 and len(b_verbs) > 0

    def _temporal_conflict(self, a, b):
        return False

    def _axiological_conflict(self, a, b):
        value_pairs = [('libertad', 'control'), ('seguridad', 'riesgo'), ('individual', 'colectivo')]
        a_low = a.lower()
        b_low = b.lower()
        for v1, v2 in value_pairs:
            if (v1 in a_low and v2 in b_low) or (v2 in a_low and v1 in b_low):
                return True
        return False
