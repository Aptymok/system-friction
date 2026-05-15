# adaptive_questionnaire.py
class AdaptiveQuestionnaire:
    @staticmethod
    def generate_questions(profile: dict) -> list:
        questions = []
        if profile.get('avoidance_score', 0) > 0.6:
            questions.append("¿Qué estás evitando decirte a ti mismo?")
        if profile.get('contradiction_count', 0) > 2:
            questions.append("He notado que dices A, pero también dices B. ¿Cómo coexisten ambas ideas?")
        if not profile.get('long_term_goal'):
            questions.append("¿Cuál es tu meta principal en los próximos 12 meses?")
        if profile.get('friction_trend', 'up') == 'up':
            questions.append("¿Qué ha cambiado desde la última vez que esto fue más fácil?")
        return questions[:5]
