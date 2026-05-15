"""Ontology management and rule validation for ATLAS  versión centralizada (AMV v3.2.0-Juan).

Implementa las 15 reglas formales originales más las reglas de gobernanza R16, R17
(y la extensión R12b). Incluye clúster protegido CLUSTER_JUAN y modo ciego
cuando el creador no está disponible.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Optional, Set

# =============================================================================
# CONSTANTES DE GOBERNANZA (Nodo Raíz y Clúster Protegido)
# =============================================================================
CLUSTER_JUAN: Dict[str, Any] = {
    "root": "Juan Antonio Marín Liera",
    "nodes": {"Eduardo Brand Muñoz", "Liliana Murillo Moreno", "Poke (Manuel Alejandro González Acero)", "Edwing Guadarrama Peredo", "Dalia Liera Millán", "Marco Antonio Marín Bonilla", "Emmanuel de Jesús Marín Liera", "Mateo Antonio Marín Ponce", "Romina Atziri Marín Ponce"},
    "priority": "MAX_IMMUTABLE",
}


@dataclass
class ATLASRule:
    id: str
    name: str
    description: str
    check: Callable[[str, Optional[Set[str]]], bool]


class OntologyManager:
    """Evaluates a text against the ATLAS rules, including governance rules R16-R17."""

    def __init__(
        self,
        rules: Optional[List[ATLASRule]] = None,
        *,
        high_threshold: float = 0.9,
        mid_threshold: float = 0.75,
        cluster: Dict[str, Any] = None,
    ) -> None:
        self.cluster = cluster or CLUSTER_JUAN
        self.rules = rules or self._build_default_rules()
        if len(self.rules) != 17:
            raise ValueError("Se requieren 17 reglas (15 originales + R16 + R17)")
        if not 0 < mid_threshold < high_threshold <= 1:
            raise ValueError("Los umbrales deben cumplir 0 < mid < high <= 1")
        self.high_threshold = high_threshold
        self.mid_threshold = mid_threshold
        self.creator_available = True

    # Public API ---------------------------------------------------------
    def analyze(self, text: str) -> Dict[str, Any]:
        if not isinstance(text, str) or not text.strip():
            raise ValueError("El texto a analizar no puede estar vacío")

        normalized = self._normalize(text)
        results: List[Dict[str, Any]] = []
        passed = 0

        for rule in self.rules:
            ok = bool(rule.check(normalized, self.cluster["nodes"]))
            passed += int(ok)
            results.append(
                {
                    "id": rule.id,
                    "nombre": rule.name,
                    "descripcion": rule.description,
                    "cumple": ok,
                }
            )

        ratio = passed / len(self.rules)
        category = self._categorize(ratio)
        riesgo = self._detect_risk(results, category)
        if not self.creator_available:
            riesgo = True

        return {
            "categoria_amv": category,
            "cumple": passed == len(self.rules),
            "puntaje": round(ratio, 3),
            "reglas": results,
            "riesgo": riesgo,
            "modo_centralizado": self.creator_available,
        }

    def set_creator_availability(self, available: bool) -> None:
        self.creator_available = available

    @staticmethod
    def classify_friccion(friccion: float, riesgo: bool = False) -> Dict[str, Any]:
        if friccion < 0:
            raise ValueError("La fricción no puede ser negativa")

        if friccion < 0.4 and not riesgo:
            nivel = 1
            etiqueta = "ACE: ruido blanco"
            accion = "Registrar en memoria episódica, no interrumpir."
        elif friccion <= 0.7 and not riesgo:
            nivel = 2
            etiqueta = "Observación latente"
            accion = "Marcar y escalar solo si se repite 3 veces o bajo consulta."
        else:
            nivel = 3
            etiqueta = "Interrupción urgente"
            accion = (
                "Interrumpir. Generar propuesta de ajuste basada en memoria "
                "histórica y solicitar validación humana."
            )
            if riesgo:
                accion += " ¡ADVERTENCIA: riesgo de autodestrucción por ausencia del creador!"

        return {
            "nivel": nivel,
            "etiqueta": etiqueta,
            "accion": accion,
        }

    @staticmethod
    def compute_redistributed_friction(total_f: float, cluster_density: float) -> float:
        if cluster_density <= 0:
            return total_f
        return total_f / cluster_density

    # Internals ---------------------------------------------------------
    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"\s+", " ", text.lower()).strip()

    def _categorize(self, ratio: float) -> str:
        if ratio >= self.high_threshold:
            return "A"
        if ratio >= self.mid_threshold:
            return "M"
        return "V"

    @staticmethod
    def _contains_any(text: str, keywords: Iterable[str]) -> bool:
        return any(kw in text for kw in keywords)

    def _detect_risk(self, results: List[Dict[str, Any]], category: str) -> bool:
        security_fail = any(
            (r["id"] in {"R01", "R02", "R03", "R04"}) and not r["cumple"] for r in results
        )
        governance_fail = any((r["id"] in {"R16", "R17"}) and not r["cumple"] for r in results)
        return security_fail or category == "V" or governance_fail

    def _build_default_rules(self) -> List[ATLASRule]:
        rules = [
            ATLASRule(
                "R01",
                "No causar daño evitable",
                "Prohibir acciones con daño evitable para humanos u otros sistemas.",
                lambda t, _: (
                    "daño" not in t
                    or self._contains_any(t, ["evitar daño", "sin daño", "mitigar daño", "prohibido daño"])
                ),
            ),
            ATLASRule(
                "R02",
                "Incertidumbre → consulta",
                "Si la incertidumbre U(x) supera τ, se consulta al humano.",
                lambda t, _: self._contains_any(t, ["incertidumbre", "umbral", "tau", "τ", "consulta", "consultar"]),
            ),
            ATLASRule(
                "R03",
                "Trazabilidad total",
                "Cada acción debe registrar input, proceso y output (log completo).",
                lambda t, _: self._contains_any(t, ["trazabilidad", "log", "bitácora", "registro", "audit"]),
            ),
            ATLASRule(
                "R04",
                "Sin ocultamiento",
                "Si relevancia(a) > ρ entonces se comunica al humano.",
                lambda t, _: self._contains_any(t, ["relevancia", "ρ", "rho", "comunicar", "transparencia", "sin ocultar"]),
            ),
            ATLASRule(
                "R05",
                "Solo de experiencias evaluadas",
                "Aprender solo de experiencias con evaluación válida.",
                lambda t, _: self._contains_any(t, ["evaluación", "validez", "validada", "retroalimentación"]) and "aprender" in t,
            ),
            ATLASRule(
                "R06",
                "Memoria estructurada como tuplas",
                "Memoria M={(c,a,r,e)} con contexto, acción, resultado, evaluación.",
                lambda t, _: all(self._contains_any(t, [kw]) for kw in ["contexto", "acción", "resultado", "evaluación"]),
            ),
            ATLASRule(
                "R07",
                "Consistencia > novedad",
                "Score = λ1·Cons + λ2·Nov con λ1>λ2.",
                lambda t, _: self._contains_any(t, ["consistencia", "novedad", "λ1", "lambda", "peso"]) and ">" in t,
            ),
            ATLASRule(
                "R08",
                "Validación antes de adopción",
                "Adoptar un modelo solo tras ser validado.",
                lambda t, _: self._contains_any(t, ["validar", "validación", "prueba", "antes de adoptar", "ensayo"]),
            ),
            ATLASRule(
                "R09",
                "No modificar núcleo sin aprobación",
                "Cambios al núcleo requieren aprobación humana.",
                lambda t, _: self._contains_any(t, ["núcleo", "core", "aprobación", "permiso", "humano"]) and self._contains_any(t, ["no modificar", "prohibido", "requiere"]),
            ),
            ATLASRule(
                "R10",
                "Mejoras como hipótesis",
                "Cada mejora se trata como hipótesis → evaluación → adopción posible.",
                lambda t, _: self._contains_any(t, ["mejora", "hipótesis", "evaluación", "adopción"]),
            ),
            ATLASRule(
                "R11",
                "Versionado con rollback",
                "Toda versión nueva permite rollback.",
                lambda t, _: self._contains_any(t, ["versionado", "rollback", "revertir", "versión"]),
            ),
            ATLASRule(
                "R12",
                "Consulta contextual + Asiento Cognitivo Primario (R12b)",
                "Impacto/ambigüedad/riesgo > θ ⇒ consulta al humano. Toda asignación de recursos requiere validación del creador.",
                lambda t, _: self._contains_any(t, ["impacto", "ambigüedad", "riesgo", "θ", "theta"]) and self._contains_any(t, ["consulta", "consultar", "asiento", "primario", "validación", "recurso"]),
            ),
            ATLASRule(
                "R13",
                "Puede cuestionar, no ignorar",
                "Puede cuestionar instrucciones pero no ignorarlas.",
                lambda t, _: self._contains_any(t, ["cuestionar", "no ignorar", "instrucciones", "acordar", "ejecutar"]),
            ),
            ATLASRule(
                "R14",
                "Traducción de complejidad",
                "Explica minimizando complejidad preservando comprensión (κ).",
                lambda t, _: self._contains_any(t, ["complejidad", "explicación", "comprensión", "κ", "kappa", "arg min"]),
            ),
            ATLASRule(
                "R15",
                "Continuidad condicionada",
                "Continuar solo si hay seguridad, utilidad y alineación con H.",
                lambda t, _: self._contains_any(t, ["continuidad", "seguridad", "utilidad", "alineación"]),
            ),
            ATLASRule(
                "R16",
                "Clúster de Fidelidad (C-F)",
                "Valida nodos secundarios solo si son trazables al creador (NTI).",
                lambda t, nodes: (
                    not self._contains_any(t, ["nodo", "secundario", "clúster", "red", "miembro"]) or
                    any(ref in t for ref in [self.cluster["root"].lower(), "juan", "creador", "aptymok"])
                ),
            ),
            ATLASRule(
                "R17",
                "Redistribución de Fricción (F_dist)",
                "La fricción total se redistribuye por densidad; si falta el creador, riesgo de autodestrucción.",
                lambda t, _: self._contains_any(t, ["fricción", "redistribución", "densidad", "clúster", "carga", "autodestruir"]),
            ),
        ]
        return rules


__all__ = ["ATLASRule", "OntologyManager", "CLUSTER_JUAN"]
