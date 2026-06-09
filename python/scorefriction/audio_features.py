#!/usr/bin/env python3
"""
MIHM v3.0 - Extractor acústico + interacciones + NTI parcial
Cumple con la especificación del manual (CC BY 4.0, Aptymok)
"""
import sys
import json
import numpy as np
import librosa
from pathlib import Path
from typing import Dict, Optional, Tuple, List

class MIHMAcousticExtractor:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.y = None
        self.sr = None
        self.duration = None
        self._load_audio()

    def _load_audio(self):
        if not self.file_path.exists():
            raise FileNotFoundError(f"Archivo no encontrado: {self.file_path}")
        self.y, self.sr = librosa.load(str(self.file_path), sr=None, mono=True)
        self.duration = len(self.y) / self.sr
        print(f"[OK] Audio cargado: {self.duration:.2f}s @ {self.sr}Hz", file=sys.stderr)

    def _safe_float(self, value, default=None):
        if value is None:
            return default
        try:
            if isinstance(value, np.ndarray):
                if value.size == 0:
                    return default
                if value.size == 1:
                    return float(value[0])
                return float(np.mean(value))
            return float(value)
        except:
            return default

    # ------------------- 11 variables según manual -------------------
    def _friccion_sistemica(self) -> float:
        try:
            onset_frames = librosa.onset.onset_detect(y=self.y, sr=self.sr, backtrack=True)
            onset_density = len(onset_frames) / self.duration if self.duration > 0 else 0
            onset_norm = min(1.0, onset_density / 20.0)
            flatness = librosa.feature.spectral_flatness(y=self.y)
            spectral_flatness = self._safe_float(np.mean(flatness), 0.5)
            contrast = librosa.feature.spectral_contrast(y=self.y, sr=self.sr)
            roughness = self._safe_float(np.mean(contrast) / 50.0, 0.5)
            f_s = onset_norm * 0.4 + spectral_flatness * 0.3 + min(1.0, roughness) * 0.3
            return float(np.clip(f_s, 0.0, 1.0))
        except Exception as e:
            print(f"[WARN] F_s failed: {e}", file=sys.stderr)
            return None  # Ética del silencio

    def _densidad_interaccion(self) -> float:
        try:
            onset_frames = librosa.onset.onset_detect(y=self.y, sr=self.sr)
            onset_rate = len(onset_frames) / self.duration if self.duration > 0 else 0
            hop_length = 512
            frame_length = 2048
            frames = librosa.util.frame(self.y, frame_length=frame_length, hop_length=hop_length).shape[1]
            rms = librosa.feature.rms(y=self.y, hop_length=hop_length)[0]
            active_frames = np.sum(rms > 0.01)
            active_density = active_frames / frames if frames > 0 else 0
            d_i = (min(1.0, onset_rate / 15.0) * 0.6 + active_density * 0.4)
            return float(np.clip(d_i, 0.0, 1.0))
        except:
            return None

    def _gradiente_friccion(self) -> float:
        try:
            hop_length = 512
            frame_length = 2048
            frames = librosa.util.frame(self.y, frame_length=frame_length, hop_length=hop_length)
            friccion_frame = []
            for i in range(min(frames.shape[1], 100)):
                frame = frames[:, i]
                rms = np.sqrt(np.mean(frame**2))
                friccion_frame.append(rms)
            friccion_array = np.array(friccion_frame)
            if len(friccion_array) < 2:
                return None
            gradiente = np.mean(np.abs(np.diff(friccion_array))) * 10
            return float(np.clip(gradiente, 0.0, 1.0))
        except:
            return None

    def _coherencia_sistemica(self) -> float:
        try:
            centroid = librosa.feature.spectral_centroid(y=self.y, sr=self.sr)[0]
            centroid_var = np.std(centroid) / (np.mean(centroid) + 0.01)
            incoherencia = min(1.0, centroid_var / 500.0)
            c_s = 1.0 - incoherencia
            return float(np.clip(c_s, 0.0, 1.0))
        except:
            return None

    def _desfase_cognitivo(self) -> float:
        try:
            if hasattr(librosa.feature, 'rhythm'):
                tempo, _ = librosa.feature.rhythm.tempo(y=self.y, sr=self.sr)
            else:
                result = librosa.beat.beat_track(y=self.y, sr=self.sr)
                # Compatibilidad: si es tupla (tempo, beats) o solo tempo
                if isinstance(result, tuple):
                    tempo = result[0]
                else:
                    tempo = result
            onset_env = librosa.onset.onset_strength(y=self.y, sr=self.sr)
            onset_var = np.var(onset_env) if len(onset_env) > 0 else 0
            d_cog = min(1.0, onset_var / 100.0)
            return float(d_cog)
        except:
            return None

    def _energia_relacional(self) -> float:
        """E_r corregido: robusto a cambios de API de librosa"""
        try:
            # Obtener tempo de forma segura
            if hasattr(librosa, 'beat') and hasattr(librosa.beat, 'beat_track'):
                result = librosa.beat.beat_track(y=self.y, sr=self.sr)
            elif hasattr(librosa.feature, 'rhythm'):
                result = librosa.feature.rhythm.tempo(y=self.y, sr=self.sr)
            else:
                return None

            if isinstance(result, (tuple, list)):
                tempo_val = result[0]
            else:
                tempo_val = result

            tempo_val = self._safe_float(tempo_val, 120)
            e_r = np.clip((tempo_val - 40) / 160.0, 0.0, 1.0)
            onset_env = librosa.onset.onset_strength(y=self.y, sr=self.sr)
            impulse = self._safe_float(np.mean(onset_env) / 100.0, 0.3)
            e_r = e_r * 0.7 + min(1.0, impulse) * 0.3
            return float(e_r)
        except Exception as e:
            print(f"[WARN] E_r failed: {e}", file=sys.stderr)
            return None

    def _vector_intencional(self) -> float:
        try:
            f0, voiced_flag, _ = librosa.pyin(
                y=self.y, fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C7'), sr=self.sr
            )
            if f0 is None or len(f0) == 0:
                return None
            pitch_ratio = np.sum(voiced_flag) / len(voiced_flag) if len(voiced_flag) > 0 else 0
            return float(pitch_ratio)
        except:
            return None

    def _interaccion_multicanal(self) -> float:
        try:
            S = np.abs(librosa.stft(self.y))
            spectral_centroids = librosa.feature.spectral_centroid(S=S, sr=self.sr)[0]
            spectral_bandwidth = librosa.feature.spectral_bandwidth(S=S, sr=self.sr)[0]
            complexity = np.std(spectral_centroids) / (np.mean(spectral_bandwidth) + 0.01)
            i_mc = min(1.0, complexity / 500.0)
            return float(i_mc)
        except:
            return None

    def _potencial_salto(self) -> float:
        try:
            rms = librosa.feature.rms(y=self.y)[0]
            if len(rms) > 1:
                decay_rate = np.mean(np.diff(rms[rms > 0.01])) if np.any(rms > 0.01) else 0
                phi = min(1.0, max(0.0, -decay_rate * 10 + 0.5))
            else:
                phi = None
            return float(phi) if phi is not None else None
        except:
            return None

    # ------------------- Interacciones (penalizaciones) -------------------
    def _compute_penalties(self, v: Dict[str, float]) -> float:
        """Retorna suma de penalizaciones p_j según sección 4 del manual"""
        penalties = []
        # Fs × Cs : Violencia sin coherencia
        if v.get('F_s', 0) is not None and v.get('C_s', 0) is not None:
            if v['F_s'] > 0.6 and v['C_s'] < 0.4:
                penalties.append(0.10 * v['F_s'] * (1 - v['C_s']))
        # Di × (1-Er) : Congestión sin empuje
        if v.get('D_i', 0) is not None and v.get('E_r', 0) is not None:
            if v['D_i'] > 0.6 and v['E_r'] < 0.4:
                penalties.append(0.10 * v['D_i'] * (1 - v['E_r']))
        # Dcog × (1-Rsem) : Ruptura cognitiva
        if v.get('D_cog', 0) is not None and v.get('R_sem', 0) is not None:
            if v['D_cog'] > 0.6 and v['R_sem'] < 0.4:
                penalties.append(0.10 * v['D_cog'] * (1 - v['R_sem']))
        # Gf × (1-Vi) : Cambio sin propósito
        if v.get('G_f', 0) is not None and v.get('V_i', 0) is not None:
            if v['G_f'] > 0.6 and v['V_i'] < 0.4:
                penalties.append(0.10 * v['G_f'] * (1 - v['V_i']))
        # Csem × Φ : Expansión perceptual (no es penalización negativa, pero se incluye como interacción positiva? El manual la lista igual con peso 0.10)
        # En la tabla aparece como interacción, pero no resta IHG, sino que suma al NTI. De momento la omitimos en penalizaciones.
        total = sum(penalties)
        return min(0.5, total)

    # ------------------- Extracción completa -------------------
    def extract_all(self) -> Dict[str, any]:
        """Devuelve vector MIHM (valores None si no medibles)"""
        raw = {
            "F_s": self._friccion_sistemica(),
            "D_i": self._densidad_interaccion(),
            "G_f": self._gradiente_friccion(),
            "C_s": self._coherencia_sistemica(),
            "D_cog": self._desfase_cognitivo(),
            "E_r": self._energia_relacional(),
            "V_i": self._vector_intencional(),
            "I_mc": self._interaccion_multicanal(),
            "Phi": self._potencial_salto(),
            "R_sem": None,   # se recibe desde texto
            "C_sem": None,
        }
        # Filtrar valores no medidos (None) pero respetando el núcleo
        return raw

    # ------------------- Cálculo IHG según manual -------------------
    @staticmethod
    def compute_ihg(mihm_vec: Dict[str, float], nti: float = 0.5) -> Dict:
        """
        Calcula IHG_raw, penalizaciones e IHG_final según sección 2 y 4.
        mihm_vec debe tener valores (float) o None; los None se ignoran en la suma? La regla de emisión mínima se aplica antes.
        """
        pesos = {
            "F_s": 0.100, "G_f": 0.100, "C_s": 0.100, "R_sem": 0.100,
            "C_sem": 0.100, "Phi": 0.100, "I_mc": 0.083, "E_r": 0.083,
            "V_i": 0.083, "D_i": 0.075, "D_cog": 0.075
        }
        # Restricción manual: R_sem <= C_sem
        if mihm_vec.get('R_sem') is not None and mihm_vec.get('C_sem') is not None:
            if mihm_vec['R_sem'] > mihm_vec['C_sem']:
                mihm_vec['R_sem'] = mihm_vec['C_sem']

        # Suma ponderada solo de variables presentes (no None)
        weighted_sum = 0.0
        for var, w in pesos.items():
            val = mihm_vec.get(var)
            if val is not None:
                weighted_sum += w * val

        # Penalizaciones
        penalty_sum = 0.0
        # Necesitamos las variables para calcular penalizaciones; llamamos a la función con el vector actual
        # Como estamos dentro de un método estático, pasamos el vector
        # Reimplementamos rápido:
        penalties = []
        if all(mihm_vec.get(v) is not None for v in ['F_s','C_s']):
            if mihm_vec['F_s'] > 0.6 and mihm_vec['C_s'] < 0.4:
                penalties.append(0.10 * mihm_vec['F_s'] * (1 - mihm_vec['C_s']))
        if all(mihm_vec.get(v) is not None for v in ['D_i','E_r']):
            if mihm_vec['D_i'] > 0.6 and mihm_vec['E_r'] < 0.4:
                penalties.append(0.10 * mihm_vec['D_i'] * (1 - mihm_vec['E_r']))
        if all(mihm_vec.get(v) is not None for v in ['D_cog','R_sem']):
            if mihm_vec['D_cog'] > 0.6 and mihm_vec['R_sem'] < 0.4:
                penalties.append(0.10 * mihm_vec['D_cog'] * (1 - mihm_vec['R_sem']))
        if all(mihm_vec.get(v) is not None for v in ['G_f','V_i']):
            if mihm_vec['G_f'] > 0.6 and mihm_vec['V_i'] < 0.4:
                penalties.append(0.10 * mihm_vec['G_f'] * (1 - mihm_vec['V_i']))
        penalty_sum = min(0.5, sum(penalties))

        ihg_raw = weighted_sum - penalty_sum

        # Aplicar NTI
        nti = max(0.0, min(1.0, nti))
        if nti < 0.4:
            ihg_final = ihg_raw * (1 - nti)
        else:
            ihg_final = ihg_raw

        return {
            "ihg_raw": round(ihg_raw, 6),
            "ihg_final": round(ihg_final, 6),
            "penalty_sum": round(penalty_sum, 6),
            "weighted_sum": round(weighted_sum, 6),
            "nti_used": nti
        }

    # ------------------- Emisión mínima válida -------------------
    @staticmethod
    def is_valid_emission(mihm_vec: Dict[str, float]) -> bool:
        core = ['F_s', 'D_i', 'E_r', 'C_s', 'D_cog', 'G_f']
        measured = sum(1 for var in core if mihm_vec.get(var) is not None)
        return measured >= 6