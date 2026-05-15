# meta_observer.py
class MetaObserver:
    def __init__(self):
        self.certainty_by_module = {}

    def update_certainty(self, module_name: str, certainty: float):
        self.certainty_by_module[module_name] = certainty

    def overall_certainty(self) -> float:
        if not self.certainty_by_module:
            return 0.0
        return sum(self.certainty_by_module.values()) / len(self.certainty_by_module)

    def low_confidence_areas(self, threshold=0.4) -> list:
        return [mod for mod, cert in self.certainty_by_module.items() if cert < threshold]
