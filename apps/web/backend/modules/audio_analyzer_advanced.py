"""
Audio Analyzer Advanced – Sensor primario del sistema MIHM.

Regla de Oro: SIEMPRE llama mihm.apply_delta() antes de devolver datos.
Sin retardo (τ_audio = 0): el audio impacta el estado inmediatamente.

Pipeline:
  separate_stems() → detect_instruments() → detect_structure() → apply_delta()
"""

import numpy as np
from datetime import datetime


class AudioAnalyzerAdvanced:
    """Sensor de audio avanzado. Es el módulo de mayor peso sobre IHG."""

    def __init__(self, mihm):
        self.mihm = mihm

    def analyze(self, features: dict, raw_bytes: bytes = None) -> dict:
        """
        Análisis completo de audio:
        1. Separación de stems (simulada o real con librosa)
        2. Detección de instrumentos
        3. Detección de estructura
        4. apply_delta (acoplamiento obligatorio)

        features: dict con claves de audio_features.extract_features()
        """
        stems = self.separate_stems(features)
        instruments = self.detect_instruments(features, stems)
        structure = self.detect_structure(features)

        num_instruments = len(instruments)
        drum_energy = stems.get('drums_energy', 0.5)
        has_pandero = 'pandero' in instruments

        # Delta sobre estado MIHM (sensor más importante del sistema)
        delta = {
            'ihg':   -0.05 * (num_instruments / 8.0 - 0.6),  # penaliza saturación
            'nti':    0.22 * drum_energy,
            'psi_i':  0.15 if has_pandero else 0.0,
        }

        u, J = self.mihm.apply_delta(delta, delay_seconds=0, action="audio_stems_advanced")

        # meta_control después de acción significativa
        self.mihm.meta_control()

        return {
            'stems':          stems,
            'instruments':    instruments,
            'structure':      structure,
            'num_instruments': num_instruments,
            'drum_energy':    drum_energy,
            'has_pandero':    has_pandero,
            'delta_applied':  delta,
            'u':              u,
            'cost_j':         J,
            'mihm_state':     dict(self.mihm.state),
            'irc':            self.mihm.irc,
            'timestamp':      datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------

    def separate_stems(self, features: dict) -> dict:
        """
        Separación de stems a partir de features espectrales.
        En producción: usar spleeter o demucs.
        """
        onset_density = features.get('onset_density', 2.0)
        band_low = features.get('band_energy_low', 0.33)
        band_mid = features.get('band_energy_mid', 0.33)
        band_high = features.get('band_energy_high', 0.33)

        drums_energy = float(np.clip(band_low * 1.5 + onset_density * 0.02, 0.0, 1.0))
        bass_energy = float(np.clip(band_low * 2.0 - band_high, 0.0, 1.0))
        melody_energy = float(np.clip(band_mid + band_high * 0.5, 0.0, 1.0))
        vocal_energy = float(np.clip(band_mid * 1.2 - band_low * 0.3, 0.0, 1.0))

        return {
            'drums_energy':  drums_energy,
            'bass_energy':   bass_energy,
            'melody_energy': melody_energy,
            'vocal_energy':  vocal_energy,
        }

    def detect_instruments(self, features: dict, stems: dict) -> list:
        """
        Detección de instrumentos basada en energía de stems y entropía.
        """
        instruments = []
        if stems['drums_energy'] > 0.3:
            instruments.append('kick')
        if stems['drums_energy'] > 0.5:
            instruments.append('snare')
        if stems['bass_energy'] > 0.25:
            instruments.append('bass')
        if stems['melody_energy'] > 0.35:
            instruments.append('synth')
        if stems['vocal_energy'] > 0.3:
            instruments.append('vocals')
        entropy = features.get('spectral_entropy', 5.0)
        if entropy > 8.0:
            instruments.append('noise_layer')
        if features.get('periodicity', 0) > 0.6:
            instruments.append('loop_element')
        return instruments

    def detect_structure(self, features: dict) -> dict:
        """
        Detección de estructura musical basada en periodicidad y entropía.
        """
        periodicity = features.get('periodicity', 0.0)
        dynamic_range = features.get('dynamic_range', 60.0)
        entropy = features.get('spectral_entropy', 5.0)

        if periodicity > 0.7:
            section_type = 'loop'
        elif dynamic_range > 50:
            section_type = 'drop'
        elif entropy > 9.0:
            section_type = 'break'
        else:
            section_type = 'verse'

        return {
            'section_type':  section_type,
            'periodicity':   periodicity,
            'dynamic_range': dynamic_range,
            'spectral_entropy': entropy,
        }
