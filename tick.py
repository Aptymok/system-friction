#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Corrige los errores de TypeScript generados por el script anterior.
Elimina archivos duplicados/conflictivos y los regenera correctamente.
"""

import os
import shutil

BASE = os.getcwd()

# Rutas de archivos a eliminar (porque están mal generados o son duplicados)
to_remove = [
    "src/lib/kernel/init.ts",
    "src/lib/kernel/liveRouterMonitor.ts",
    "src/lib/kernel/selfEvolution.ts",
    "src/lib/kernel/kernelRewriter.ts",
    "src/lib/evolution/autonomousOrganism.ts",
    "src/lib/evolution/selfModifyingKernel.ts",
    "src/lib/evolution/structuralEvolution.ts",
    "src/lib/evolution/architecturalAutonomy.ts",
    "src/lib/evolution/continuousRecompilation.ts",
    "src/lib/evolution/cognitiveLoop.ts",
]

# Eliminar archivos si existen
for rel_path in to_remove:
    full_path = os.path.join(BASE, rel_path)
    if os.path.exists(full_path):
        os.remove(full_path)
        print(f"🗑️ Eliminado: {full_path}")

# ============================================================
# REGENERAR entrypoint.ts (sin duplicados)
# ============================================================
entrypoint_path = os.path.join(BASE, "src", "lib", "kernel", "entrypoint.ts")
entrypoint_content = '''import { systemTick } from "./systemTick";

export async function handleEvent(event: any, metrics: any) {
  const result = await systemTick(metrics, async (job: any) => {
    // fallback executor (no mover lógica aquí)
    return job;
  });
  return result;
}
'''
with open(entrypoint_path, 'w', encoding='utf-8') as f:
    f.write(entrypoint_content)
print(f"✅ Corregido: {entrypoint_path}")

# ============================================================
# REGENERAR systemTick.ts (con import correcto y sin duplicados)
# ============================================================
system_tick_path = os.path.join(BASE, "src", "lib", "kernel", "systemTick.ts")
system_tick_content = '''import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getActiveIntent } from '../layers/IntentLayer';
import { generatePlans } from '../layers/Planner';
import { simulatePlan } from '../layers/Simulator';
import { evaluatePlan } from '../layers/Gate';
import { executePlan } from '../layers/Executor';
import { recordAction, recordObservation } from '../layers/Observer';

export async function systemTick(metrics: any, executor: any) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { status: 'error', message: 'Supabase no disponible' };

  // Verificar acceso a módulos según suscripción
  const { data: profile } = await supabase
    .from('profiles')
    .select('module_access')
    .eq('user_id', metrics.userId)
    .single();
  const modules = profile?.module_access || {};
  if (modules.planner !== true) {
    return { status: 'access_denied', message: 'Módulo de planificación no activado' };
  }

  // 1. Obtener intención activa
  const intent = await getActiveIntent(metrics.nodeId);
  if (!intent) {
    return { status: 'no_intent', message: 'No hay intención activa. Define un objetivo en la capa de intención.' };
  }

  // 2. Generar planes
  const plans = await generatePlans(intent, metrics);

  // 3. Simular cada plan
  const planResults = [];
  for (const plan of plans) {
    const sim = await simulatePlan(plan, intent, [metrics], 1000);
    const gate = await evaluatePlan(plan, sim, metrics.nodeId, metrics.userId);
    planResults.push({ plan, simulation: sim, gate });
  }

  // 4. Seleccionar el primer plan aprobado (o ninguno)
  const approved = planResults.find(r => r.gate.approved === true);
  if (!approved) {
    return { status: 'no_approved_plan', plans: planResults.map(p => ({ label: p.plan.label, gate: p.gate })) };
  }

  // 5. Ejecutar
  const executionResult = await executePlan(approved.plan, { metrics, intent });

  // 6. Registrar observación
  await recordAction(metrics.nodeId, intent.id, approved.plan.label, executionResult, approved.gate);
  await recordObservation(metrics.nodeId, 'ihg', metrics.ihg);
  await recordObservation(metrics.nodeId, 'nti', metrics.nti);

  return {
    status: 'tick_ok',
    executedPlan: approved.plan.label,
    executionResult,
    gate: approved.gate,
  };
}
'''
with open(system_tick_path, 'w', encoding='utf-8') as f:
    f.write(system_tick_content)
print(f"✅ Corregido: {system_tick_path}")

# ============================================================
# AGREGAR getMetricsHistory en metrics.ts (si no existe)
# ============================================================
metrics_path = os.path.join(BASE, "src", "lib", "agents", "metrics.ts")
if os.path.exists(metrics_path):
    with open(metrics_path, 'r', encoding='utf-8') as f:
        metrics_content = f.read()
    if "getMetricsHistory" not in metrics_content:
        # Añadir al final del archivo
        addition = '''
export async function getMetricsHistory(userId?: string, limit = 20) {
  // Implementación real: obtener historial de auditorías del usuario
  // Por ahora devolvemos un array vacío
  return [];
}
'''
        with open(metrics_path, 'a', encoding='utf-8') as f:
            f.write(addition)
        print(f"✅ Añadida función getMetricsHistory a {metrics_path}")
    else:
        print(f"ℹ️ getMetricsHistory ya existe en {metrics_path}")
else:
    print(f"⚠️ No se encontró {metrics_path}, creando uno mínimo...")
    os.makedirs(os.path.dirname(metrics_path), exist_ok=True)
    minimal_metrics = '''// src/lib/agents/metrics.ts
export async function getMetricsHistory(userId?: string, limit = 20) {
  return [];
}
'''
    with open(metrics_path, 'w', encoding='utf-8') as f:
        f.write(minimal_metrics)
    print(f"✅ Creado {metrics_path} con función getMetricsHistory")

# ============================================================
# CORREGIR structuralEvolution.ts (tipado explícito)
# ============================================================
structural_path = os.path.join(BASE, "src", "lib", "evolution", "structuralEvolution.ts")
if os.path.exists(structural_path):
    with open(structural_path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Reemplazar la línea problemática
    content = content.replace(
        "const routesToDelete = [];",
        "const routesToDelete: string[] = [];"
    )
    with open(structural_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Corregido tipado en {structural_path}")
else:
    print(f"⚠️ No se encontró {structural_path}, omite")

# ============================================================
# AGREGAR ignoreDeprecations en tsconfig.json
# ============================================================
tsconfig_path = os.path.join(BASE, "tsconfig.json")
if os.path.exists(tsconfig_path):
    import json
    with open(tsconfig_path, 'r', encoding='utf-8') as f:
        tsconfig = json.load(f)
    if "compilerOptions" not in tsconfig:
        tsconfig["compilerOptions"] = {}
    tsconfig["compilerOptions"]["ignoreDeprecations"] = "6.0"
    with open(tsconfig_path, 'w', encoding='utf-8') as f:
        json.dump(tsconfig, f, indent=2)
    print(f"✅ Añadido 'ignoreDeprecations' a {tsconfig_path}")
else:
    print(f"⚠️ No se encontró tsconfig.json")

# ============================================================
# ELIMINAR layout.tsx que importa init (si existe)
# ============================================================
layout_path = os.path.join(BASE, "src", "app", "layout.tsx")
if os.path.exists(layout_path):
    with open(layout_path, 'r', encoding='utf-8') as f:
        layout_content = f.read()
    if "import { bootstrapSelfHealing } from '@/lib/kernel/init'" in layout_content:
        # Comentar o eliminar esa línea
        new_layout = layout_content.replace(
            "import { bootstrapSelfHealing } from '@/lib/kernel/init'",
            "// import { bootstrapSelfHealing } from '@/lib/kernel/init' // removed, no longer exists"
        )
        with open(layout_path, 'w', encoding='utf-8') as f:
            f.write(new_layout)
        print(f"✅ Corregida importación errónea en {layout_path}")
    else:
        print(f"ℹ️ layout.tsx no contiene la importación problemática")
else:
    print(f"⚠️ No se encontró layout.tsx")

print("\n🎉 Correcciones aplicadas. Reinicia tu servidor de desarrollo (npm run dev) y los errores deberían desaparecer.")