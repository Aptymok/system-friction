# affective_dynamics.py
import re

class AffectiveDynamics:
    @staticmethod
    def analyze(text: str) -> dict:
        lower = text.lower()
        expansion = len(re.findall(r'\b(por qué|cómo|nuevo|aprender|curiosidad|explorar)\b', lower))
        contraction = len(re.findall(r'\b(miedo|temer|evitar|peligro|no quiero|qué pasará si)\b', lower))
        defense = len(re.findall(r'\b(pero|aunque|sin embargo|disculpa|justificar)\b', lower))
        exploration = len(re.findall(r'\b(quizás|tal vez|supongamos|podría ser)\b', lower))
        control = len(re.findall(r'\b(tengo que|debo|debería|obligado)\b', lower))
        total = max(1, expansion+contraction+defense+exploration+control)
        return {
            'expansion': expansion/total,
            'contraction': contraction/total,
            'defense': defense/total,
            'exploration': exploration/total,
            'control': control/total
        }
