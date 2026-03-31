"""
Reflexive Engine (MCM-A) – Capa de auto-observación del sistema MIHM.

El ReflexiveEngine observa el propio sistema, evalúa su salud global
y proporciona métricas de reflexividad:
  - IRC  (Índice de Reflexividad Colectiva)
  - Meta_J (calidad de la función de costo)
  - IAD_Reflex = IRC × (1 – Meta_J)
  - global_health = 1 – (J / 10) × (1 – IRC)

Endpoint: GET /system/health
"""

from datetime import datetime


class ReflexiveEngine:
    """
    Motor reflexivo de Nivel 2 del framework System Friction.
    Conectado al MIHM, observa su historia y propone auto-ajustes.
    """

    def __init__(self, mihm):
        self.mihm = mihm

    # ------------------------------------------------------------------
    # Evaluación de salud global
    # ------------------------------------------------------------------

    def evaluate_system_health(self) -> dict:
        """
        Devuelve el estado reflexivo completo del sistema.
        Llamado externamente por /system/health.
        """
        J = self.mihm.cost_function()
        irc = self.mihm.irc
        meta_j = self.mihm.compute_meta_j()

        # Salud global: 1 = perfecto, 0 = colapso
        health = 1.0 - (J / 10.0) * (1.0 - irc)
        health = float(max(0.0, min(1.0, health)))

        # IAD_Reflex: combina IRC y calidad de la función de costo
        iad_reflex = irc * (1.0 - min(1.0, meta_j))

        # Recomendación sistémica
        recommendation = self._recommend(irc, meta_j, J)

        # Reglas auto-descubiertas
        rules = self.mihm.reflexive_rules[-10:]  # últimas 10

        # Historial IRC de la memoria
        irc_history = [
            {'timestamp': h['timestamp'], 'irc': h.get('irc', irc)}
            for h in list(self.mihm.history)[-100:]
        ]

        return {
            'global_health':   health,
            'irc':             irc,
            'meta_j':          meta_j,
            'iad_reflex':      iad_reflex,
            'cost_j':          J,
            'state':           dict(self.mihm.state),
            'recommendation':  recommendation,
            'reflexive_rules': rules,
            'irc_history':     irc_history,
            'params':          dict(self.mihm.params),
            'history_size':    len(self.mihm.history),
            'delayed_queue':   len(self.mihm.delayed_updates),
            'timestamp':       datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------
    # Recomendación sistémica
    # ------------------------------------------------------------------

    def _recommend(self, irc: float, meta_j: float, J: float) -> str:
        if irc > 0.7 and meta_j < 0.1:
            return ("Sistema autopoiético en estado óptimo. "
                    "IRC alto + Meta_J bajo → función de costo excelente. "
                    "Auto-ajuste activo.")
        elif irc > 0.5 and J < 0.5:
            return ("Sistema convergente. Costo bajo y reflexividad moderada. "
                    "Continuar acumulando historia.")
        elif irc < 0.3:
            return ("IRC crítico: el sistema no aprende de su historia. "
                    "Aumentar diversidad de inputs. "
                    "KD elevado automáticamente.")
        elif J > 1.5:
            return ("Costo J elevado: IHG o NTI fuera de rango objetivo. "
                    "Revisar modules de audio y social. "
                    "Ejecutar auditoría completa.")
        else:
            return ("Sistema en zona de transición. "
                    "Acumular más datos para que meta_control sea efectivo.")

    # ------------------------------------------------------------------
    # Forzar meta-control
    # ------------------------------------------------------------------

    def force_meta_control(self) -> dict:
        """
        Fuerza la ejecución de meta_control independientemente del contador
        de historial. Útil para el botón 'Forzar Meta-Control' del frontend.
        """
        meta_j_before = self.mihm.compute_meta_j()
        j_before = self.mihm.cost_function()
        irc_before = self.mihm.irc

        # Actualizar IRC y ajustar parámetros manualmente
        self.mihm.update_irc()
        meta_j = self.mihm.compute_meta_j()

        if self.mihm.irc > 0.65 and meta_j < 0.15:
            self.mihm.params['ki'] = float(
                max(0.001, min(3.0, self.mihm.params['ki'] * 0.95))
            )
            action_taken = "KI reducido (sistema bien alineado)"
        elif self.mihm.irc < 0.45:
            self.mihm.params['kd'] = float(
                max(0.001, min(3.0, self.mihm.params['kd'] * 1.08))
            )
            action_taken = "KD aumentado (sistema desconectado)"
        else:
            action_taken = "Sin ajuste necesario (IRC en zona estable)"

        j_after = self.mihm.cost_function()

        return {
            'action_taken':   action_taken,
            'irc_before':     irc_before,
            'irc_after':      self.mihm.irc,
            'meta_j_before':  meta_j_before,
            'meta_j_after':   meta_j,
            'j_before':       j_before,
            'j_after':        j_after,
            'j_delta':        j_before - j_after,
            'params':         dict(self.mihm.params),
            'timestamp':      datetime.utcnow().isoformat(),
        }
