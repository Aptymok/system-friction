# epistemic_boundary_layer.py
class EpistemicBoundaryLayer:
    @staticmethod
    def annotate_inference(inference: dict) -> dict:
        inference['epistemic_notes'] = {
            'certainty': inference.get('confidence', 0.5),
            'is_probabilistic': True,
            'alternative_interpretations': inference.get('counterfactuals', []),
            'warning': 'Este modelo es una aproximación probabilística. No representa una verdad ontológica ni un destino fijo.',
            'plasticity_reminder': 'La cognición humana puede cambiar; este modelo observa tendencias actuales, no esencias permanentes.'
        }
        return inference
