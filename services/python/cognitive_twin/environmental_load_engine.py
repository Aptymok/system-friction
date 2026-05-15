# environmental_load_engine.py
class EnvironmentalLoadEngine:
    def __init__(self):
        self.factors = {
            'economic': 0.0,
            'social': 0.0,
            'uncertainty': 0.0,
            'operational_complexity': 0.0
        }

    def update_from_world_spectrum(self, wsi: float, nti: float):
        self.factors['uncertainty'] = wsi if wsi else 0.0
        self.factors['economic'] = max(0.0, 1.0 - nti)

    def update_from_user_declaration(self, text: str):
        lower = text.lower()
        if 'dinero' in lower or 'deuda' in lower:
            self.factors['economic'] = min(1.0, self.factors['economic'] + 0.2)
        if 'familia' in lower or 'amigos' in lower:
            self.factors['social'] = min(1.0, self.factors['social'] + 0.15)
        if 'complicado' in lower or 'caótico' in lower:
            self.factors['operational_complexity'] = min(1.0, self.factors['operational_complexity'] + 0.2)

    def total_load(self) -> float:
        return sum(self.factors.values()) / len(self.factors)
