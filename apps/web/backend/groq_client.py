"""
GroqClient – Cliente de la API de Groq para System Friction.

Métodos:
  analyze_audit()           → análisis estructurado JSON de auditoría
  analyze_audio()           → insights musicales desde features de audio
  song_narrative()          → narrativa producción para un productor
  raw_completion()          → completación raw (usado por MIHM.meta_control)
  analyze_social_frequency()→ análisis de coexistencia social-frecuencia
"""

import requests
import json
from config import Config


class GroqClient:
    def __init__(self):
        self.api_key = Config.GROQ_API_KEY
        self.model   = Config.GROQ_MODEL
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    # ------------------------------------------------------------------
    # Método base
    # ------------------------------------------------------------------

    def _call(self, messages: list, temperature: float = 0.3,
              max_tokens: int = 1024, json_mode: bool = False) -> str:
        """Llamada base a la API de Groq. Retorna el contenido como string."""
        payload = {
            "model":       self.model,
            "messages":    messages,
            "temperature": temperature,
            "max_tokens":  max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        response = requests.post(
            self.base_url,
            headers={
                "Authorization":  f"Bearer {self.api_key}",
                "Content-Type":   "application/json",
            },
            json=payload,
            timeout=30,
        )
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        raise Exception(f"Groq API error: {response.status_code} – {response.text}")

    # ------------------------------------------------------------------
    # raw_completion – usado por MIHM.propose_new_rule_via_groq
    # ------------------------------------------------------------------

    def raw_completion(self, prompt: str, max_tokens: int = 200) -> str:
        """
        Completación cruda en JSON.
        Usado internamente por MIHM.meta_control() para auto-descubrir reglas.
        """
        return self._call(
            [{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=max_tokens,
            json_mode=True,
        )

    # ------------------------------------------------------------------
    # analyze_audit – análisis de auditoría organizacional
    # ------------------------------------------------------------------

    def analyze_audit(self, responses_text: str) -> dict:
        """
        Analiza respuestas de auditoría y devuelve JSON estructurado con
        métricas MIHM: IHG, NTI, R, escenarios, proyectos, etc.
        """
        prompt = f"""Eres un analista de sistemas musicales y organizacionales.
A partir de las siguientes respuestas de auditoría, genera un análisis en JSON con estos campos:
- ihg: número entre -2 y 0 (concentración de poder)
- nti: número entre 0 y 1 (coherencia institucional)
- r: número entre 0 y 1 (resistencia/adaptabilidad)
- ldi_days: entero (latencia institucional en días)
- dinamica: uno de: pianissimo, piano, mezzoforte, forte, fortissimo
- figura_sistema: uno de: 𝅝, 𝅗𝅥, ♩, ♪, 𝅘𝅥𝅯, 𝄽
- intervencion_inmediata: string breve
- narrativa: 2-3 líneas
- bemoles: lista de strings
- sostenidos: lista de strings
- proyectos_detectados: lista de objetos con nombre, etapa, vector, figura, ldi, responsable, criticidad
- escenario_a, escenario_b, escenario_c: cada uno con nombre, descripcion, prob_exito (0-100), acciones (lista), ihg_proy, nti_proy, r_proy
- tareas_dia1: lista de strings (3-5 tareas)
- tendencias: lista de objetos con nombre, relevancia (0-1), accion
- duetos: lista de objetos con tipo, descripcion, sinergia (número), justificacion

Responde SOLO con el JSON.

Respuestas de auditoría:
{responses_text}"""

        content = self._call(
            [{"role": "user", "content": prompt}],
            temperature=0.2,
            json_mode=True,
        )
        return json.loads(content)

    # ------------------------------------------------------------------
    # analyze_audio – insights desde features de audio
    # ------------------------------------------------------------------

    def analyze_audio(self, features: dict) -> str:
        """
        Interpreta características de audio y genera insights musicales.
        Siempre retorna un string (nunca None).
        """
        prompt = f"""Analiza estas características de audio y genera un breve análisis musical:
- Entropía espectral: {features.get('spectral_entropy', 0):.4f}
- Energía bandas: baja={features.get('band_energy_low', 0):.4f}, media={features.get('band_energy_mid', 0):.4f}, alta={features.get('band_energy_high', 0):.4f}
- Densidad de onsets: {features.get('onset_density', 0):.4f} eventos/s
- Rango dinámico: {features.get('dynamic_range', 0):.2f} dB
- Periodicidad: {features.get('periodicity', 0):.4f}

Responde en 3-4 líneas con: qué comunica el sonido, riesgo principal, recomendación TikTok."""

        try:
            return self._call(
                [{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=300,
            )
        except Exception as e:
            return f"Análisis no disponible: {e}"

    # ------------------------------------------------------------------
    # song_narrative – narrativa para productor
    # ------------------------------------------------------------------

    def song_narrative(self, features: dict, mihm_state: dict) -> str:
        """
        Convierte métricas técnicas en narrativa musical para un productor.
        """
        prompt = f"""Convierte estas métricas técnicas en narrativa musical entendible para un productor:
IHG = {mihm_state.get('ihg', 0):.3f} (escala -2 a 0: más negativo = más hegemonía)
NTI = {mihm_state.get('nti', 0):.3f}
R   = {mihm_state.get('r', 0):.3f}
Features: entropía={features.get('spectral_entropy', 0):.3f}, onsets={features.get('onset_density', 0):.3f}/s

Responde en español, estilo productor experimentado:
1. Qué significa en términos de sonido real (ej: "drop con presión como 808 saturado a -6dB")
2. Fortalezas y riesgos
3. Recomendación concreta para TikTok (duración hook, fonema clave)"""

        try:
            return self._call(
                [{"role": "user", "content": prompt}],
                temperature=0.6,
                max_tokens=400,
            )
        except Exception as e:
            return f"Narrativa no disponible: {e}"

    # ------------------------------------------------------------------
    # analyze_social_frequency – coexistencia social-frecuencia
    # ------------------------------------------------------------------

    def analyze_social_frequency(self, freq_data: dict, social_context: dict) -> dict:
        """
        Analiza cómo un conjunto de frecuencias coexiste en un contexto social
        y propone rituales/procesos de coexistencia.

        Retorna JSON con:
        - resonance_zones: qué grupos sociales resuenan con estas frecuencias
        - coexistence_rituals: prácticas sociales propuestas
        - tension_points: conflictos potenciales de frecuencias
        - bridge_frequencies: frecuencias mediadoras
        - cff_delta: cambio propuesto al Campo de Frecuencia Colectiva
        """
        prompt = f"""Eres un experto en musicología social y psicofonética colectiva.
Analiza cómo estas frecuencias coexisten socialmente y propone procesos de integración comunitaria.

Frecuencias detectadas: {json.dumps(freq_data, ensure_ascii=False)}
Contexto social: {json.dumps(social_context, ensure_ascii=False)}

Genera un JSON con:
{{
  "resonance_zones": [
    {{"group": "nombre del grupo social", "frequency_hz": número, "resonance_type": "ritual|trance|comunal|urbano|individual", "intensity": 0-1}}
  ],
  "coexistence_rituals": [
    {{"name": "nombre del ritual/proceso", "description": "descripción", "frequencies_involved": [hz], "social_outcome": "qué logra en el grupo"}}
  ],
  "tension_points": [
    {{"between": ["grupo1", "grupo2"], "frequency_conflict_hz": número, "resolution": "cómo resolver"}}
  ],
  "bridge_frequencies": [número_hz],
  "cff_delta": número entre -0.2 y 0.2,
  "narrative": "2 líneas sobre cómo estas frecuencias pueden coexistir"
}}"""

        try:
            content = self._call(
                [{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=800,
                json_mode=True,
            )
            return json.loads(content)
        except Exception as e:
            return {
                "resonance_zones":      [],
                "coexistence_rituals":  [],
                "tension_points":       [],
                "bridge_frequencies":   [],
                "cff_delta":            0.0,
                "narrative":            f"Análisis no disponible: {e}",
            }
