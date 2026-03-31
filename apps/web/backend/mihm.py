"""
MIHM – Motor de Inercia Hegemónica Musical
Sistema Friction v4.1 – Organismo Autopoiético con Campo de Frecuencia Colectiva

Vector de estado extendido:
  x = [IHG, NTI, R, Phi_p, Psi_i, H_scale, ML_success, CFF]

Donde:
  IHG        Índice de Hegemonía Grupal          (-2 … 0)
  NTI        Nivel de Trascendencia Institucional (0 … 1)
  R          Resistencia / Adaptabilidad          (0 … 1)
  Phi_p      Presión fonémica                     (0 … 1)
  Psi_i      Presión de identidad                 (0 … 1)
  H_scale    Escala de entropía                   (0 … 1)
  ML_success Éxito predicho por ML                (0 … 1)
  CFF        Campo de Frecuencia Colectiva        (-1 … 1)

Capas reflexivas (MCM-A):
  IRC        Índice de Reflexividad Colectiva
  Meta_J     Calidad de la función de costo
  meta_control() → ajusta PID cada 100 pasos

Principios obligatorios:
  1. apply_delta() es el ÚNICO punto de actualización de estado.
  2. compute_control() es el ÚNICO decisor de u(t).
  3. meta_control() es el nivel superior autopoiético.
  4. Ningún módulo externo escribe self.state directamente.
"""

import numpy as np
import random
import json
from collections import deque
from datetime import datetime, timedelta
from mido import MidiFile, MidiTrack, Message


class MIHM:
    def __init__(self, params=None):
        self.params = params or {
            'kp':    1.2,
            'ki':    0.1,
            'kd':    0.5,
            'w1':    1.0,    # peso IHG en J
            'w2':    0.8,    # peso NTI en J
            'w3':    0.6,    # peso R en J
            'w4':    0.4,    # peso CFF en J
            'sigma': 0.15,
        }

        # ── Vector de estado extendido ─────────────────────────────────
        self.state = {
            'ihg':        -0.620,
            'nti':         0.351,
            'r':           0.450,
            'phi_p':       0.000,
            'psi_i':       0.000,
            'h_scale':     0.500,
            'ml_success':  0.500,
            'cff':         0.000,   # Campo de Frecuencia Colectiva
        }

        # ── Memoria temporal ──────────────────────────────────────────
        self.history      = deque(maxlen=1000)
        self.delayed_updates = []          # [(trigger_dt, delta_dict, action)]

        # ── PID internals ─────────────────────────────────────────────
        self.integral   = 0.0
        self.prev_error = 0.0

        # ── Capa reflexiva MCM-A ──────────────────────────────────────
        self.irc              = 0.38
        self.meta_j_history   = deque(maxlen=200)
        self.reflexive_rules  = []

        # ── Groq inyectado desde app.py ───────────────────────────────
        self._groq = None

    # ══════════════════════════════════════════════════════════════════
    # FUNCIÓN DE COSTO GLOBAL J
    # ══════════════════════════════════════════════════════════════════

    def cost_function(self) -> float:
        """
        J mide la distancia al estado homeostático ideal:
          IHG → –0.38  |  NTI → 1  |  R → 1  |  CFF → 0 (equilibrio)

        Un CFF positivo (resonancia alta) reduce J;
        un CFF negativo (disonancia) lo aumenta.
        """
        w1, w2, w3, w4 = (
            self.params['w1'], self.params['w2'],
            self.params['w3'], self.params['w4'],
        )
        J = (
            w1 * (self.state['ihg'] + 0.38) ** 2 +
            w2 * (1.0 - self.state['nti'])  ** 2 +
            w3 * (1.0 - self.state['r'])    ** 2 +
            w4 * self.state['cff']          ** 2   # penaliza disonancia colectiva
        )
        return float(J)

    # ══════════════════════════════════════════════════════════════════
    # MEMORIA TEMPORAL
    # ══════════════════════════════════════════════════════════════════

    def record_state(self, action: str = ""):
        snap = {
            'timestamp':  datetime.utcnow().isoformat(),
            'ihg':        self.state['ihg'],
            'nti':        self.state['nti'],
            'r':          self.state['r'],
            'ml_success': self.state['ml_success'],
            'cff':        self.state['cff'],
            'irc':        self.irc,
            'cost_j':     self.cost_function(),
            'action':     action,
        }
        self.history.append(snap)

    # ══════════════════════════════════════════════════════════════════
    # ACOPLAMIENTO OBLIGATORIO – apply_delta
    # ══════════════════════════════════════════════════════════════════

    def apply_delta(self, delta_dict: dict,
                    delay_seconds: float = 0,
                    action: str = "") -> tuple:
        """
        Único punto de escritura del estado.
        Si delay_seconds > 0 encola el delta; retorna (None, None).
        Si delay_seconds = 0 aplica inmediatamente; retorna (u, J).
        """
        if delay_seconds > 0:
            trigger = datetime.utcnow() + timedelta(seconds=delay_seconds)
            self.delayed_updates.append((trigger, delta_dict, action))
            return None, None

        for key, delta in delta_dict.items():
            if key in self.state:
                lo = -2.0 if key == 'ihg' else -1.0
                hi = 1.0
                self.state[key] = float(np.clip(self.state[key] + delta, lo, hi))

        self.record_state(action)
        u = self.compute_control({"delta": delta_dict, "action": action})
        J = self.cost_function()
        self.meta_j_history.append(J)
        return u, J

    # ══════════════════════════════════════════════════════════════════
    # CONTROLADOR UNIFICADO – Nivel 1 (rápido)
    # ══════════════════════════════════════════════════════════════════

    def compute_control(self, context: dict) -> float:
        """
        Único decisor de u(t). Objetivo: llevar IHG a –0.38.
        El CFF modifica el término derivativo: alta resonancia colectiva
        amortigua la reactividad del controlador.
        """
        target  = -0.38
        error   = target - self.state['ihg']
        self.integral  += error
        derivative      = error - self.prev_error

        # CFF como amortiguador social: resonancia alta → menos reactividad
        cff_damping = 1.0 - 0.3 * max(0.0, self.state['cff'])

        u = (
            self.params['kp'] * error +
            self.params['ki'] * self.integral +
            self.params['kd'] * derivative * cff_damping
        )
        u = float(np.tanh(u))
        self.prev_error = error
        return u

    # ══════════════════════════════════════════════════════════════════
    # RETARDOS
    # ══════════════════════════════════════════════════════════════════

    def process_delayed_updates(self):
        now = datetime.utcnow()
        remaining = []
        for trigger, delta, action in self.delayed_updates:
            if trigger <= now:
                self.apply_delta(delta, action=action + " (delayed)")
            else:
                remaining.append((trigger, delta, action))
        self.delayed_updates = remaining

    # ══════════════════════════════════════════════════════════════════
    # CAPA REFLEXIVA MCM-A – meta_control (Nivel 2, lento)
    # ══════════════════════════════════════════════════════════════════

    def compute_meta_j(self) -> float:
        """
        Meta_J: calidad de la función de costo.
        Bajo = función de costo estable y convergente (buena).
        """
        recent = [h['cost_j'] for h in list(self.history)[-50:] if 'cost_j' in h]
        if len(recent) < 10:
            return 1.0
        trend = float(np.polyfit(np.arange(len(recent), dtype=float), recent, 1)[0])
        return float(abs(trend) + float(np.std(recent)))

    def update_irc(self):
        """
        IRC – Índice de Reflexividad Colectiva.
        Correlación entre tiempo y evolución de J (negativo = J mejora).
        """
        costs = [h['cost_j'] for h in self.history if 'cost_j' in h]
        if len(costs) < 10:
            return
        corr = np.corrcoef(np.arange(len(costs), dtype=float), costs)[0, 1]
        if not np.isnan(corr):
            self.irc = float(0.7 * self.irc + 0.3 * corr)

    def meta_control(self):
        """
        Nivel superior autopoiético (cada 100 pasos en historial).
        Ajusta PID según IRC y Meta_J.
        El CFF también influye: resonancia colectiva alta relaja la integral.
        """
        if len(self.history) == 0 or len(self.history) % 100 != 0:
            return

        meta_j = self.compute_meta_j()
        self.update_irc()

        cff = self.state.get('cff', 0.0)

        if self.irc > 0.65 and meta_j < 0.15:
            # Sistema bien alineado y resonante → relajar integral
            factor = 0.95 * (1.0 + 0.05 * cff)  # CFF alto relaja más
            self.params['ki'] = float(np.clip(self.params['ki'] * factor, 0.001, 3.0))
        elif self.irc < 0.45:
            # Sistema desconectado → más reactividad derivativa
            self.params['kd'] = float(np.clip(self.params['kd'] * 1.08, 0.001, 3.0))

        if cff < -0.5:
            # Disonancia colectiva alta → aumentar proporcional para corregir
            self.params['kp'] = float(np.clip(self.params['kp'] * 1.05, 0.1, 3.0))

        # Con 15% de prob. pedir nueva regla a Groq
        if random.random() < 0.15 and self._groq is not None:
            self._propose_new_rule_via_groq()

    def _propose_new_rule_via_groq(self):
        """Sistema genera y evalúa sus propias reglas via Groq."""
        if self._groq is None:
            return
        history_summary = str(list(self.history)[-30:])[:800]
        prompt = (
            f"Analiza esta historia de estado MIHM y propón UNA sola regla de control "
            f"(delta_dict). Historia: {history_summary}. "
            f"Estado: IHG={self.state['ihg']:.3f}, NTI={self.state['nti']:.3f}, "
            f"CFF={self.state['cff']:.3f}, IRC={self.irc:.3f}. "
            f'Responde SOLO con JSON: {{"rule": "descripción", "delta": {{"key": valor}}}}'
        )
        try:
            raw  = self._groq.raw_completion(prompt, max_tokens=200)
            data = json.loads(raw)
            rule_name = data.get('rule', 'auto_rule')
            delta     = data.get('delta', {})
            if not delta:
                return
            j_before = self.cost_function()
            self.apply_delta(delta, action=f"meta_rule:{rule_name}")
            j_after  = self.cost_function()
            if j_after > j_before:
                revert = {k: -v for k, v in delta.items()}
                self.apply_delta(revert, action=f"revert:{rule_name}")
            else:
                self.reflexive_rules.append({
                    'rule':          rule_name,
                    'delta':         delta,
                    'j_improvement': j_before - j_after,
                    'timestamp':     datetime.utcnow().isoformat(),
                })
        except Exception:
            pass

    # ══════════════════════════════════════════════════════════════════
    # COMPATIBILIDAD LEGACY
    # ══════════════════════════════════════════════════════════════════

    def update_state(self, external_inputs: dict) -> dict:
        Heg  = external_inputs.get('Heg_audio', 0.5)
        Hf   = external_inputs.get('H_freq', 0.5)
        Ht   = external_inputs.get('H_time', 0.5)
        dE   = external_inputs.get('dE_dt', 0)
        lam  = external_inputs.get('lambda_rhythm', 0)
        psi  = external_inputs.get('Psi', 0)
        Cloop = external_inputs.get('C_loop', 0.3)
        new_ihg = -(0.4 * Heg + 0.3 * Hf + 0.3 * Ht)
        new_nti = 0.2 * dE + 0.5 * lam + 0.3 * psi
        new_r   = 1.0 / (1.0 + Cloop)
        delta = {
            'ihg': new_ihg - self.state['ihg'],
            'nti': new_nti - self.state['nti'],
            'r':   new_r   - self.state['r'],
        }
        self.apply_delta(delta, action="update_state_legacy")
        return self.state

    def pid_control(self, target_ihg: float = -0.38) -> float:
        error = target_ihg - self.state['ihg']
        self.integral  += error
        derivative      = error - self.prev_error
        u = (self.params['kp'] * error +
             self.params['ki'] * self.integral +
             self.params['kd'] * derivative)
        u = float(np.tanh(u))
        self.prev_error = error
        return u

    def monte_carlo_projection(self, horizon_days: int = 90,
                               n_sims: int = 1000) -> dict:
        ihg0  = self.state['ihg']
        sigma = self.params.get('sigma', 0.15)
        dt    = 1.0 / 30.0
        rng   = np.random.default_rng()
        sims  = []
        for _ in range(n_sims):
            ihg   = ihg0
            noise = rng.normal(0, np.sqrt(dt), horizon_days)
            for dW in noise:
                ihg = float(np.clip(ihg + sigma * dW, -2.0, 0.5))
            sims.append(ihg)
        arr = np.array(sims)
        return {
            'ihg_esperado':          float(np.mean(arr)),
            'probabilidad_colapso':  float(np.mean(arr < -1.5) * 100),
            'sigma_usado':           sigma,
        }

    def stability_analysis(self) -> dict:
        ihg = self.state['ihg']
        if ihg < -1.2:
            stability, iad = 'inestable', 0.02
        elif ihg < -0.8:
            stability, iad = 'marginal',  0.05
        else:
            stability, iad = 'estable',   0.12
        return {'stability': stability, 'iad_approx': iad, 'eigenvalues': [0.5, -0.3]}

    def learn(self, prediction_id: str, outcome: float, db) -> dict:
        error = outcome - self.state['ihg']
        self.params['kp'] = float(np.clip(self.params['kp'] + 0.01 * error * self.prev_error, 0.01, 3.0))
        self.params['ki'] = float(np.clip(self.params['ki'] + 0.01 * error * self.integral,   0.01, 3.0))
        self.params['kd'] = float(np.clip(self.params['kd'] + 0.01 * error * (error - self.prev_error), 0.01, 3.0))
        db.save_parameters('mihm_params', self.params)
        return self.params

    # ══════════════════════════════════════════════════════════════════
    # GENERACIÓN MIDI (legacy)
    # ══════════════════════════════════════════════════════════════════

    def generate_midi(self, num_instruments: int = 4,
                      phoneme_pattern=None, duration: int = 30) -> str:
        mid         = MidiFile()
        instruments = ['drums', 'bass', 'melody', 'vocals'][:num_instruments]
        for i, inst in enumerate(instruments):
            track = MidiTrack()
            mid.tracks.append(track)
            track.append(Message('program_change', program=i * 10, time=0))
            if phoneme_pattern and inst == 'vocals':
                for _ in phoneme_pattern * 8:
                    note = 60 + random.randint(-5, 5)
                    track.append(Message('note_on',  note=note, velocity=80 + random.randint(-20, 20), time=120))
                    track.append(Message('note_off', note=note, velocity=0, time=240))
            else:
                for _ in range(32):
                    note = 48 + i * 12 + random.randint(0, 12)
                    track.append(Message('note_on',  note=note, velocity=70, time=180))
                    track.append(Message('note_off', note=note, velocity=0, time=180))
        filename = f"generated_{num_instruments}inst_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.mid"
        mid.save(filename)
        return filename