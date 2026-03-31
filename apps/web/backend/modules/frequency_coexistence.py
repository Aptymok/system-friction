"""
FrequencyCoexistence – Motor de Coexistencia Social de Frecuencias
Sistema Friction v4.1

Concepto central:
  Las frecuencias no son solo parámetros físicos; son portadoras de
  identidad social. Cada banda frecuencial activa diferentes modos de
  cohesión grupal, conflicto o ritual colectivo.

  Este módulo mapea audio → campos sociales → procesos de coexistencia
  y los acopla al MIHM mediante el nuevo estado CFF (Campo de
  Frecuencia Colectiva).

Bandas y sus zonas de resonancia social:
  SUB-BASS  20–60 Hz   → cuerpo comunal / ritual / trance colectivo
  BASS      60–250 Hz  → pulso social / movimiento compartido
  LOW-MID  250–500 Hz  → voz fundacional / discurso colectivo
  MID      500–2kHz    → comunicación emocional / empatía grupal
  HIGH-MID  2–4 kHz    → atención / presencia individual
  HIGH      4–20 kHz   → trascendencia / experiencia íntima

Procesos de coexistencia propuestos:
  1. Ritual de Anclaje (sub-bass dominante) – sincronización corporal grupal
  2. Diálogo Frecuencial (multi-banda balanceada) – espacio de escucha activa
  3. Puente de Transición (bridge frequencies) – mediación entre grupos
  4. Liberación Armónica (high-mid saturada) – catarsis colectiva
  5. Campo Neutral (CFF ≈ 0) – espacio de coexistencia pacífica

Regla de Oro: apply_delta() + meta_control() siempre al final.
"""

import numpy as np
from datetime import datetime
from typing import Optional


# ── Definición de zonas sociales por banda ────────────────────────────────────

SOCIAL_BANDS = {
    'sub_bass': {
        'range_hz':     (20, 60),
        'social_mode':  'ritual_colectivo',
        'cohesion':     0.9,
        'description':  'Resonancia corporal profunda. Activa sincronía '
                        'motora grupal. Ideal para rituales de apertura.',
    },
    'bass': {
        'range_hz':     (60, 250),
        'social_mode':  'pulso_compartido',
        'cohesion':     0.75,
        'description':  'Pulso social y movimiento colectivo. '
                        'Genera identidad de grupo en espacios abiertos.',
    },
    'low_mid': {
        'range_hz':     (250, 500),
        'social_mode':  'discurso_comunal',
        'cohesion':     0.6,
        'description':  'Zona vocal fundacional. Activa escucha profunda '
                        'y reconocimiento entre pares.',
    },
    'mid': {
        'range_hz':     (500, 2000),
        'social_mode':  'empatia_grupal',
        'cohesion':     0.65,
        'description':  'Comunicación emocional directa. '
                        'Alta transferencia de estados afectivos entre individuos.',
    },
    'high_mid': {
        'range_hz':     (2000, 4000),
        'social_mode':  'presencia_individual',
        'cohesion':     0.4,
        'description':  'Atención y singularización. Potencia la voz '
                        'del individuo dentro del colectivo.',
    },
    'high': {
        'range_hz':     (4000, 20000),
        'social_mode':  'trascendencia',
        'cohesion':     0.3,
        'description':  'Experiencia íntima y espiritual. '
                        'Conecta con memoria cultural profunda.',
    },
}


# ── Rituales de coexistencia ──────────────────────────────────────────────────

COEXISTENCE_RITUALS = {
    'anclaje_ritual': {
        'name':              'Ritual de Anclaje',
        'trigger_band':      'sub_bass',
        'trigger_threshold': 0.4,
        'description':       'Sincronización corporal progresiva: comenzar '
                             'con frecuencias sub-bass en loop mínimo 8 compases. '
                             'El grupo se ancla en el cuerpo antes de escuchar '
                             'capas superiores.',
        'cff_boost':         0.25,
        'social_outcome':    'Cohesión física y apertura perceptiva colectiva.',
    },
    'dialogo_frecuencial': {
        'name':              'Diálogo Frecuencial',
        'trigger_band':      'multi',
        'trigger_threshold': 0.0,
        'description':       'Espacio de escucha activa: cada banda se introduce '
                             'secuencialmente (sub → bass → mid → high). '
                             'El grupo nombra qué siente con cada capa.',
        'cff_boost':         0.18,
        'social_outcome':    'Vocabulario frecuencial compartido. '
                             'Reduce tensiones por heterogeneidad cultural.',
    },
    'puente_transicion': {
        'name':              'Puente de Transición',
        'trigger_band':      'low_mid',
        'trigger_threshold': 0.3,
        'description':       'Frecuencias mediadoras (250–500 Hz) como zona '
                             'neutral donde grupos con diferentes preferencias '
                             'frecuenciales pueden co-existir temporalmente.',
        'cff_boost':         0.12,
        'social_outcome':    'Reducción de conflicto entre grupos con '
                             'identidades frecuenciales opuestas.',
    },
    'liberacion_armonica': {
        'name':              'Liberación Armónica',
        'trigger_band':      'high_mid',
        'trigger_threshold': 0.6,
        'description':       'Catarsis colectiva controlada: permitir que '
                             'la banda high-mid sature brevemente (≤ 8 bars) '
                             'para liberar tensión acumulada del grupo.',
        'cff_boost':         0.08,
        'social_outcome':    'Descarga emocional grupal. Post-liberación '
                             'el grupo está más receptivo al diálogo.',
    },
    'campo_neutral': {
        'name':              'Campo Neutral',
        'trigger_band':      'mid',
        'trigger_threshold': 0.5,
        'description':       'Estado de coexistencia pacífica: balance '
                             'espectral equitativo entre todas las bandas. '
                             'CFF ≈ 0 indica que ninguna frecuencia domina.',
        'cff_boost':         0.05,
        'social_outcome':    'Espacio seguro para grupos heterogéneos. '
                             'Óptimo para negociación y toma de decisiones.',
    },
}


class FrequencyCoexistenceEngine:
    """
    Motor principal de coexistencia social de frecuencias.

    Toma features de audio → calcula qué zonas sociales se activan →
    propone rituales de coexistencia → aplica delta al CFF del MIHM.
    """

    def __init__(self, mihm, groq=None):
        self.mihm = mihm
        self.groq = groq
        self._session_history: list = []   # historial de sesión

    # ── API pública ──────────────────────────────────────────────────

    def analyze(self, audio_features: dict,
                social_context: Optional[dict] = None) -> dict:
        """
        Análisis completo de coexistencia social-frecuencia.

        Parámetros:
          audio_features  – output de audio_features.extract_features()
          social_context  – dict opcional: {'group_size', 'setting', 'diversity_index'}

        Retorna dict con zonas activas, rituales propuestos, CFF calculado,
        tensiones y el estado MIHM actualizado.
        """
        social_context = social_context or {}

        # 1. Mapear features a activaciones de banda
        band_activations = self._compute_band_activations(audio_features)

        # 2. Calcular CFF
        cff = self._compute_cff(band_activations, social_context)

        # 3. Identificar zonas sociales activas
        active_zones = self._identify_active_zones(band_activations)

        # 4. Detectar tensiones frecuenciales
        tensions = self._detect_tensions(band_activations, social_context)

        # 5. Proponer rituales de coexistencia
        rituals = self._propose_rituals(band_activations, tensions, social_context)

        # 6. Calcular frecuencias puente
        bridge_freqs = self._find_bridge_frequencies(tensions)

        # 7. Enriquecer con Groq si disponible
        groq_analysis = {}
        if self.groq is not None:
            freq_data = {
                'band_activations': band_activations,
                'cff':              cff,
                'tensions':         len(tensions),
            }
            groq_analysis = self.groq.analyze_social_frequency(
                freq_data, social_context
            )
            # Refinar CFF con la visión de Groq
            groq_cff_delta = groq_analysis.get('cff_delta', 0.0)
            cff = float(np.clip(cff + groq_cff_delta * 0.3, -1.0, 1.0))

        # 8. Acoplamiento obligatorio → apply_delta al CFF del MIHM
        delta = self._build_mihm_delta(cff, band_activations)
        u, J  = self.mihm.apply_delta(delta, action="frequency_coexistence")

        # 9. meta_control después de acción significativa
        self.mihm.meta_control()

        # 10. Guardar en historial de sesión
        result = {
            'band_activations': band_activations,
            'cff':              cff,
            'active_zones':     active_zones,
            'tensions':         tensions,
            'proposed_rituals': rituals,
            'bridge_frequencies': bridge_freqs,
            'groq_analysis':    groq_analysis,
            'delta_applied':    delta,
            'u':                u,
            'cost_j':           J,
            'mihm_state':       dict(self.mihm.state),
            'irc':              self.mihm.irc,
            'social_context':   social_context,
            'timestamp':        datetime.utcnow().isoformat(),
        }
        self._session_history.append(result)
        return result

    def propose_session_ritual(self, group_size: int = 10,
                               diversity_index: float = 0.5,
                               setting: str = "studio") -> dict:
        """
        Propone un ritual de apertura de sesión basado en el estado MIHM actual.
        No requiere audio previo – usa solo el estado del sistema.
        """
        state = self.mihm.state
        ihg   = state['ihg']
        cff   = state['cff']
        nti   = state['nti']

        # Seleccionar ritual según estado del sistema
        if cff < -0.3 or ihg < -1.0:
            # Sistema en tensión → ritual de anclaje
            ritual_key = 'anclaje_ritual'
        elif nti < 0.4:
            # Baja coherencia → diálogo frecuencial
            ritual_key = 'dialogo_frecuencial'
        elif abs(cff) < 0.15:
            # Sistema equilibrado → campo neutral
            ritual_key = 'campo_neutral'
        else:
            # Default → puente de transición
            ritual_key = 'puente_transicion'

        ritual = dict(COEXISTENCE_RITUALS[ritual_key])

        # Adaptar al tamaño del grupo
        if group_size > 20:
            ritual['adaptation'] = (
                "Grupo grande: dividir en subgrupos de 5–7 personas. "
                "Cada subgrupo experimenta el ritual simultáneamente."
            )
        elif group_size < 5:
            ritual['adaptation'] = (
                "Grupo pequeño: experiencia íntima. "
                "Priorizar escucha con auriculares o monitores cercanos."
            )
        else:
            ritual['adaptation'] = (
                f"Grupo óptimo ({group_size} personas). "
                "Escucha en sala con sistema de audio de calidad."
            )

        # Aplicar boost de CFF
        delta = {'cff': ritual['cff_boost'] * (1.0 - abs(cff))}
        u, J  = self.mihm.apply_delta(delta, action=f"session_ritual:{ritual_key}")
        self.mihm.meta_control()

        return {
            'ritual':       ritual,
            'rationale':    self._ritual_rationale(state, ritual_key),
            'group_size':   group_size,
            'setting':      setting,
            'delta_applied': delta,
            'u':            u,
            'cost_j':       J,
            'mihm_state':   dict(self.mihm.state),
            'timestamp':    datetime.utcnow().isoformat(),
        }

    def get_frequency_map(self) -> dict:
        """
        Devuelve el mapa completo de bandas frecuenciales y sus zonas sociales.
        No modifica el estado del MIHM (solo lectura).
        """
        return {
            'bands':            SOCIAL_BANDS,
            'rituals':          COEXISTENCE_RITUALS,
            'current_cff':      self.mihm.state.get('cff', 0.0),
            'irc':              self.mihm.irc,
            'session_count':    len(self._session_history),
        }

    def get_session_history(self, limit: int = 20) -> list:
        return self._session_history[-limit:]

    # ── Lógica interna ───────────────────────────────────────────────

    def _compute_band_activations(self, features: dict) -> dict:
        """
        Mapea features de audio a activaciones de banda (0–1 cada una).
        """
        low  = features.get('band_energy_low',  0.33)
        mid  = features.get('band_energy_mid',  0.33)
        high = features.get('band_energy_high', 0.33)
        onset = features.get('onset_density',   2.0)
        entropy = features.get('spectral_entropy', 5.0)

        # Sub-bass: energía baja extrema (estimada como fracción de low)
        sub_bass = float(np.clip(low * 0.6, 0.0, 1.0))
        # Bass: energía baja restante
        bass     = float(np.clip(low * 0.8, 0.0, 1.0))
        # Low-mid: transición low→mid
        low_mid  = float(np.clip((low + mid) * 0.4, 0.0, 1.0))
        # Mid: energía media directa, modulada por onsets
        mid_act  = float(np.clip(mid + onset * 0.01, 0.0, 1.0))
        # High-mid: alta energía + entropía
        high_mid = float(np.clip(high * 0.7 + entropy * 0.02, 0.0, 1.0))
        # High: solo energía alta
        high_act = float(np.clip(high, 0.0, 1.0))

        return {
            'sub_bass': sub_bass,
            'bass':     bass,
            'low_mid':  low_mid,
            'mid':      mid_act,
            'high_mid': high_mid,
            'high':     high_act,
        }

    def _compute_cff(self, activations: dict, social_context: dict) -> float:
        """
        CFF (Campo de Frecuencia Colectiva).

        Fórmula:
          CFF = Σ(cohesion_i × activation_i × social_weight) – disonancia

        CFF ∈ [–1, 1]:
          +1 = resonancia colectiva total
           0 = campo neutral (coexistencia pacífica)
          –1 = disonancia total (conflicto frecuencial)
        """
        social_weight = 1.0 + 0.2 * social_context.get('diversity_index', 0.5)
        coherence_sum = 0.0
        total_activation = 0.0

        for band_name, activation in activations.items():
            band = SOCIAL_BANDS.get(band_name, {})
            cohesion = band.get('cohesion', 0.5)
            coherence_sum    += cohesion * activation * social_weight
            total_activation += activation

        if total_activation < 1e-6:
            return 0.0

        # Normalizar
        raw_cff = coherence_sum / (total_activation * social_weight)

        # Penalizar polarización: si sub_bass Y high dominan a la vez → disonancia
        sub  = activations.get('sub_bass', 0)
        high = activations.get('high',     0)
        polarity_penalty = sub * high * 0.5

        cff = float(np.clip(raw_cff - polarity_penalty - 0.5, -1.0, 1.0))
        return round(cff, 4)

    def _identify_active_zones(self, activations: dict) -> list:
        """Devuelve las zonas sociales activas (activación > 0.35)."""
        zones = []
        for band_name, activation in activations.items():
            if activation > 0.35:
                band_info = SOCIAL_BANDS.get(band_name, {})
                zones.append({
                    'band':        band_name,
                    'activation':  round(activation, 4),
                    'social_mode': band_info.get('social_mode', '—'),
                    'description': band_info.get('description', ''),
                    'range_hz':    band_info.get('range_hz', (0, 0)),
                })
        return sorted(zones, key=lambda z: z['activation'], reverse=True)

    def _detect_tensions(self, activations: dict,
                         social_context: dict) -> list:
        """
        Detecta tensiones frecuenciales: pares de bandas que coexisten
        con lógicas sociales contradictorias.
        """
        tensions = []
        tension_pairs = [
            ('sub_bass', 'high',     'Conflicto ritual–individual: '
                                     'el pulso colectivo compite con la experiencia íntima.'),
            ('bass',     'high_mid', 'Tensión grupal–individual: '
                                     'el movimiento colectivo vs. la afirmación del yo.'),
            ('low_mid',  'high_mid', 'Tensión discurso–presencia: '
                                     'la voz comunal vs. la voz individual.'),
        ]
        for b1, b2, description in tension_pairs:
            a1 = activations.get(b1, 0)
            a2 = activations.get(b2, 0)
            if a1 > 0.4 and a2 > 0.4:
                intensity = float(a1 * a2)
                tensions.append({
                    'bands':       [b1, b2],
                    'intensity':   round(intensity, 4),
                    'description': description,
                    'resolution':  COEXISTENCE_RITUALS['puente_transicion']['description'],
                })
        return tensions

    def _propose_rituals(self, activations: dict, tensions: list,
                         social_context: dict) -> list:
        """
        Selecciona rituales de coexistencia apropiados para el contexto.
        """
        proposed = []

        for ritual_key, ritual in COEXISTENCE_RITUALS.items():
            trigger_band = ritual['trigger_band']
            threshold    = ritual['trigger_threshold']

            if trigger_band == 'multi':
                # Diálogo frecuencial: siempre disponible
                proposed.append({**ritual, 'key': ritual_key, 'priority': 'medium'})
                continue

            activation = activations.get(trigger_band, 0)
            if activation >= threshold:
                priority = 'high' if activation > 0.6 else 'medium'
                proposed.append({**ritual, 'key': ritual_key,
                                 'activation': activation, 'priority': priority})

        # Si hay tensiones → priorizar puente de transición
        if tensions:
            for r in proposed:
                if r.get('key') == 'puente_transicion':
                    r['priority'] = 'critical'

        return sorted(proposed, key=lambda r: {'critical': 0, 'high': 1, 'medium': 2}.get(r.get('priority', 'medium'), 2))

    def _find_bridge_frequencies(self, tensions: list) -> list:
        """
        Frecuencias puente: las que pueden mediar entre grupos en tensión.
        Siempre incluye la zona low_mid (250–500 Hz) como terreno común.
        """
        bridges = [350.0]  # low_mid center – terreno común universal
        for tension in tensions:
            bands = tension.get('bands', [])
            freqs = []
            for b in bands:
                band_info = SOCIAL_BANDS.get(b, {})
                rng = band_info.get('range_hz', (0, 0))
                freqs.append((rng[0] + rng[1]) / 2.0)
            if len(freqs) == 2:
                bridges.append(round((freqs[0] + freqs[1]) / 2.0, 1))
        return list(set(round(f, 1) for f in bridges))

    def _build_mihm_delta(self, cff: float,
                          activations: dict) -> dict:
        """
        Construye el delta MIHM a partir del CFF calculado.

        CFF positivo (resonancia) mejora NTI y R.
        CFF negativo (disonancia) degrada IHG y R.
        La banda mid (empatía) mejora NTI directamente.
        """
        mid_activation = activations.get('mid', 0.0)
        return {
            'cff': cff - self.mihm.state.get('cff', 0.0),   # actualizar CFF
            'nti': 0.06 * max(0.0, cff) + 0.04 * mid_activation,
            'r':   0.04 * max(0.0, cff),
            'ihg': 0.02 * max(0.0, cff),   # resonancia reduce hegemonía
        }

    def _ritual_rationale(self, state: dict, ritual_key: str) -> str:
        """Explica por qué se eligió este ritual."""
        reasons = {
            'anclaje_ritual':      (
                f"IHG={state['ihg']:.3f} (tensión alta) o CFF={state.get('cff', 0):.3f} "
                f"(disonancia colectiva). El grupo necesita anclar en el cuerpo antes de "
                f"procesar capas superiores."
            ),
            'dialogo_frecuencial': (
                f"NTI={state['nti']:.3f} (coherencia baja). El grupo no tiene un "
                f"vocabulario frecuencial compartido. El diálogo construye ese puente."
            ),
            'campo_neutral':       (
                f"CFF≈0 (campo equilibrado). El sistema está en zona homeostática. "
                f"Mantener neutralidad facilita la coexistencia pacífica."
            ),
            'puente_transicion':   (
                f"Estado de transición (IHG={state['ihg']:.3f}, NTI={state['nti']:.3f}). "
                f"La zona low_mid (250–500 Hz) como terreno común activa escucha profunda."
            ),
            'liberacion_armonica': (
                f"Tensión acumulada detectada. CFF saturado requiere descarga. "
                f"La liberación armónica es el proceso de catarsis controlada."
            ),
        }
        return reasons.get(ritual_key, "Ritual seleccionado por el sistema.")
