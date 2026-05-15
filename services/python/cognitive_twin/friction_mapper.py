# friction_mapper.py
class FrictionMapper:
    @staticmethod
    def detect(tokens: list, timestamps: list) -> list:
        frictions = []
        for i, token in enumerate(tokens):
            if token['type'] == 'pause' and token['intensity'] > 0.7:
                frictions.append({'type': 'hesitation', 'position': i, 'intensity': token['intensity']})
            if token['type'] == 'punct' and token['value'] in '!?':
                frictions.append({'type': 'emotional_peak', 'position': i})
        return frictions
