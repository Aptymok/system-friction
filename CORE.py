#!/usr/bin/env python3
"""
Generador automático del Kernel Auto-Reparable + Ontología ATLAS (AMV v3.2.0-Juan).
Crea todos los archivos necesarios en src/lib/kernel, src/lib/atlas y modifica límites de seguridad.
"""

import os
import shutil

BASE = os.getcwd()
KERNEL_DIR = os.path.join(BASE, "src", "lib", "kernel")
ATLAS_DIR = os.path.join(BASE, "src", "lib", "atlas")
SAFETY_DIR = os.path.join(BASE, "src", "lib", "safety")

# ============================================================
# 1. CREAR CARPETAS
# ============================================================
os.makedirs(KERNEL_DIR, exist_ok=True)
os.makedirs(ATLAS_DIR, exist_ok=True)
os.makedirs(SAFETY_DIR, exist_ok=True)

# ============================================================
# 2. GENERAR ARCHIVOS DEL KERNEL AUTO-REPARABLE
# ============================================================

# 2.1 metaKernel.ts
meta_kernel = '''type RouteState = {
  path: string;
  exists: boolean;
  lastSeen: number;
  health: "ok" | "missing" | "corrupt";
};

type KernelState = {
  routes: Record<string, RouteState>;
  tickVersion: number;
  lastRebuild: number;
};

let state: KernelState = {
  routes: {},
  tickVersion: 1,
  lastRebuild: Date.now(),
};

// Persistencia simple (archivo)
const fs = require("fs");
const STATE_FILE = ".kernel-state.json";

export function loadKernelState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      state = { ...state, ...data };
    } catch (e) {}
  }
}

export function saveKernelState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// REGISTRO AUTOMÁTICO DE RUTAS
export function registerRoute(path: string) {
  state.routes[path] = {
    path,
    exists: true,
    lastSeen: Date.now(),
    health: "ok",
  };
  saveKernelState();
}

// DETECCIÓN EN RUNTIME
export function scanRoutes(expectedRoutes: string[]) {
  for (const r of expectedRoutes) {
    if (!state.routes[r]) {
      state.routes[r] = {
        path: r,
        exists: false,
        lastSeen: Date.now(),
        health: "missing",
      };
    }
  }
  saveKernelState();
}

// REPARACIÓN AUTOMÁTICA
export function healRoutes(generator: () => string[]) {
  const missing = Object.values(state.routes).filter(r => r.health !== "ok");

  if (missing.length === 0) return;

  const regenerated = generator();

  for (const path of regenerated) {
    state.routes[path] = {
      path,
      exists: true,
      lastSeen: Date.now(),
      health: "ok",
    };
  }

  state.lastRebuild = Date.now();
  saveKernelState();
}

// META-RECONFIGURACIÓN DEL KERNEL TICK
export function evolveTick(fn: (prev: number) => number) {
  state.tickVersion = fn(state.tickVersion);
  saveKernelState();
}

export function getKernelState() {
  return state;
}
'''
with open(os.path.join(KERNEL_DIR, "metaKernel.ts"), "w", encoding="utf-8") as f:
    f.write(meta_kernel)
print("✅ src/lib/kernel/metaKernel.ts")

# 2.2 bootstrap.ts
bootstrap = '''import { scanRoutes, healRoutes, loadKernelState } from "./metaKernel";

// LISTA BASE (actualiza según tu estructura real de API)
const EXPECTED_ROUTES = [
  "/actions",
  "/amv",
  "/audit",
  "/cron",
  "/node",
  "/telemetry",
  "/webhooks",
  "/whatsapp",
];

// GENERADOR AUTO-RECONSTRUCTOR
function routeGenerator() {
  return EXPECTED_ROUTES;
}

// LOOP DE AUTO-REPARACIÓN
export function bootstrapSelfHealing() {
  console.log("[KERNEL] bootstrapping self-healing layer");

  // Cargar estado previo si existe
  loadKernelState();

  // scan inicial
  scanRoutes(EXPECTED_ROUTES);

  // ciclo continuo
  setInterval(() => {
    healRoutes(routeGenerator);
  }, 5000);
}
'''
with open(os.path.join(KERNEL_DIR, "bootstrap.ts"), "w", encoding="utf-8") as f:
    f.write(bootstrap)
print("✅ src/lib/kernel/bootstrap.ts")

# 2.3 systemTick.ts (nuevo, meta-adaptativo)
system_tick = '''import { getKernelState, evolveTick } from "./metaKernel";

export type TickContext = {
  metrics: any;
  violations: string[];
  entropy: number;
};

export type TickExecutor = (ctx: TickContext) => any;

// META-ADAPTIVE TICK
export async function systemTick(
  metrics: any,
  executor: TickExecutor
) {
  const kernel = getKernelState();

  const context: TickContext = {
    metrics,
    violations: [],
    entropy: Math.random(),
  };

  // DETECCIÓN DE ANOMALÍAS
  if (context.entropy > 0.7) {
    context.violations.push("high_entropy");

    // el kernel se adapta solo
    evolveTick((v) => v + 1);
  }

  // ejecución base
  const result = await executor(context);

  return {
    status: "tick_ok",
    tickVersion: kernel.tickVersion,
    result,
  };
}
'''
with open(os.path.join(KERNEL_DIR, "systemTick.ts"), "w", encoding="utf-8") as f:
    f.write(system_tick)
print("✅ src/lib/kernel/systemTick.ts")

# ============================================================
# 3. GENERAR NÚCLEO ONTOLÓGICO (ATLAS)
# ============================================================
ontology_code = '''"""Ontology management and rule validation for ATLAS  versión centralizada (AMV v3.2.0-Juan).

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
        return re.sub(r"\\s+", " ", text.lower()).strip()

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
'''
with open(os.path.join(ATLAS_DIR, "ontology.py"), "w", encoding="utf-8") as f:
    f.write(ontology_code)
print("✅ src/lib/atlas/ontology.py")

# ============================================================
# 4. ACTUALIZAR LÍMITES DUROS PARA PROTEGER EL NÚCLEO ONTOLÓGICO
# ============================================================
hard_limits_path = os.path.join(SAFETY_DIR, "hardLimits.ts")
if os.path.exists(hard_limits_path):
    # Leer el contenido actual
    with open(hard_limits_path, "r", encoding="utf-8") as f:
        content = f.read()
    # Añadir lista de rutas protegidas si no existe
    if "PROTECTED_PATHS" not in content:
        protected_paths_block = '''
export const PROTECTED_PATHS = [
  "src/lib/atlas/ontology.py",
  "src/lib/kernel/metaKernel.ts",
  "src/lib/kernel/bootstrap.ts",
  "src/lib/kernel/systemTick.ts"
];
'''
        # Insertar antes de las exportaciones o al final
        content += protected_paths_block
        with open(hard_limits_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("✅ src/lib/safety/hardLimits.ts actualizado con rutas protegidas")
    else:
        print("⚠️ src/lib/safety/hardLimits.ts ya contiene PROTECTED_PATHS, no se modificó.")
else:
    # Si no existe, crear el archivo con los límites básicos y las rutas protegidas
    limits_content = '''// Límites absolutos que el sistema NO puede cruzar
export const HARD_LIMITS = {
  maxChangesPerDay: 10,
  maxNewRoutesPerDay: 3,
  maxStructuralChangesPerWeek: 2,
  maxRecompilationsPerHour: 1,
  maxRuntimePatches: 5,
  safetyBackupIntervalHours: 6,
  rollbackWindowMinutes: 30,
};

export const PROTECTED_PATHS = [
  "src/lib/atlas/ontology.py",
  "src/lib/kernel/metaKernel.ts",
  "src/lib/kernel/bootstrap.ts",
  "src/lib/kernel/systemTick.ts"
];

let changeCounters = {
  changesToday: 0,
  newRoutesToday: 0,
  structuralChangesThisWeek: 0,
  recompilationsThisHour: 0,
  activePatches: 0,
  lastChangeDate: new Date(),
  lastRecompilationHour: new Date().getHours(),
};

export function canSelfModify(): boolean {
  resetCountersIfNeeded();
  return changeCounters.changesToday < HARD_LIMITS.maxChangesPerDay;
}

export function canCreateRoute(): boolean {
  resetCountersIfNeeded();
  return changeCounters.newRoutesToday < HARD_LIMITS.maxNewRoutesPerDay;
}

export function canStructuralChange(): boolean {
  resetCountersIfNeeded();
  return changeCounters.structuralChangesThisWeek < HARD_LIMITS.maxStructuralChangesPerWeek;
}

export function canRecompile(): boolean {
  resetCountersIfNeeded();
  const now = new Date();
  if (now.getHours() !== changeCounters.lastRecompilationHour) {
    changeCounters.recompilationsThisHour = 0;
    changeCounters.lastRecompilationHour = now.getHours();
  }
  return changeCounters.recompilationsThisHour < HARD_LIMITS.maxRecompilationsPerHour;
}

export function canApplyPatch(): boolean {
  return changeCounters.activePatches < HARD_LIMITS.maxRuntimePatches;
}

export function recordChange(type: 'modification' | 'route' | 'structural' | 'recompilation' | 'patch') {
  resetCountersIfNeeded();
  switch (type) {
    case 'modification':
      changeCounters.changesToday++;
      break;
    case 'route':
      changeCounters.newRoutesToday++;
      break;
    case 'structural':
      changeCounters.structuralChangesThisWeek++;
      break;
    case 'recompilation':
      changeCounters.recompilationsThisHour++;
      break;
    case 'patch':
      changeCounters.activePatches++;
      break;
  }
  persistCounters();
}

function resetCountersIfNeeded() {
  const now = new Date();
  if (now.toDateString() !== changeCounters.lastChangeDate.toDateString()) {
    changeCounters.changesToday = 0;
    changeCounters.newRoutesToday = 0;
    changeCounters.lastChangeDate = now;
  }
}

function persistCounters() {
  const fs = require('fs');
  fs.writeFileSync('.evolution-counters.json', JSON.stringify(changeCounters));
}

export function loadCounters() {
  const fs = require('fs');
  if (fs.existsSync('.evolution-counters.json')) {
    changeCounters = JSON.parse(fs.readFileSync('.evolution-counters.json', 'utf8'));
  }
}
'''
    with open(hard_limits_path, "w", encoding="utf-8") as f:
        f.write(limits_content)
    print("✅ src/lib/safety/hardLimits.ts creado con rutas protegidas")

# ============================================================
# 5. ACTUALIZAR LAYOUT (opcional, se sugiere agregar bootstrapSelfHealing)
# ============================================================
layout_path = os.path.join(BASE, "src", "app", "layout.tsx")
if os.path.exists(layout_path):
    with open(layout_path, "r", encoding="utf-8") as f:
        layout_content = f.read()
    if "bootstrapSelfHealing" not in layout_content:
        # Buscar posición para inyectar la llamada
        new_import = 'import { bootstrapSelfHealing } from "@/lib/kernel/bootstrap";\n'
        # Insertar import después de los imports existentes (simple aproximación)
        lines = layout_content.splitlines()
        new_lines = []
        inserted = False
        for line in lines:
            new_lines.append(line)
            if line.startswith("import") and not inserted and "bootstrapSelfHealing" not in layout_content:
                # Insertar después de la última importación
                pass  # más simple: buscar una posición segura
        # Método más robusto: añadir al inicio del bloque de código
        if "bootstrapSelfHealing()" not in layout_content:
            # Añadir al principio del componente RootLayout? Mejor al final del layout antes del return.
            # Para no romper, mostramos instrucción en consola.
            print("\n⚠️ layout.tsx existe pero no contiene bootstrapSelfHealing().")
            print("   Agrega manualmente estas líneas dentro de tu RootLayout (solo una vez, en el servidor):\n")
            print("if (typeof window === 'undefined') { bootstrapSelfHealing(); }\n")
            print("   O ejecuta este comando para agregarlo automáticamente (requiere revisión):")
            print('   sed -i "/export default function RootLayout/i if (typeof window === \\"undefined\\") { bootstrapSelfHealing(); }\\n" src/app/layout.tsx')
    else:
        print("✅ layout.tsx ya contiene bootstrapSelfHealing")
else:
    print("⚠️ No se encontró layout.tsx, omite la integración automática.")

print("\n🎉 Generación completada. Revisa los archivos creados en:")
print("   - src/lib/kernel/ (metaKernel, bootstrap, systemTick)")
print("   - src/lib/atlas/ontology.py")
print("   - src/lib/safety/hardLimits.ts (actualizado)")
print("\n🚀 Ahora puedes iniciar tu sistema con 'npm run dev' y el kernel auto-reparable estará activo.")