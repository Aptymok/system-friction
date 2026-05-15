# semantic_pressure.py
import re

class SemanticPressure:
    @staticmethod
    def measure(text: str) -> dict:
        lower = text.lower()
        expansion_concepts = ['nuevo', 'aprender', 'explorar', 'curiosidad', 'posibilidad']
        closure_concepts = ['seguro', 'definitivo', 'cerrado', 'sin duda', 'absoluto']
        exp_count = sum(1 for w in expansion_concepts if re.search(rf'\b{w}\b', lower))
        clo_count = sum(1 for w in closure_concepts if re.search(rf'\b{w}\b', lower))
        total = max(1, exp_count + clo_count)
        return {
            'expansion_pressure': exp_count / total,
            'closure_pressure': clo_count / total,
            'dominant': 'expansion' if exp_count > clo_count else 'closure'
        }
