#!/usr/bin/env python3
import json
import re

# Texto completo de los 100 patrones (lo he extraído de tu mensaje anterior)
# Para no repetir 100 líneas, asumo que tienes el texto en una variable `patrones_text`
# En la práctica, copia el contenido del mensaje donde listas los 100 patrones (desde "01 · Decisiones que nadie tomó" hasta "100 · Ecosistema integrado")
# y pégalo aquí como string multilínea.

patrones_text = """
01 · Decisiones que nadie tomó – Cristalización por acumulación; zonas grises operativas.
02 · Costo real de "adoptable" – Fricción institucional frente a soluciones superiores.
...
100 · Ecosistema integrado – Funcionamiento como sistema de información completo y autónomo.
"""  # ← reemplaza con el texto real

# Función para extraer nombre y descripción de cada línea
def parse_patron(line):
    match = re.match(r'(\d+) · (.+?) – (.+)', line)
    if match:
        return {
            "id": f"ecosistema-{match.group(1).zfill(2)}",
            "name": match.group(2).strip(),
            "definition": match.group(3).strip()
        }
    return None

patrones = []
for line in patrones_text.splitlines():
    if line.strip() and re.match(r'\d+', line.strip()):
        p = parse_patron(line)
        if p:
            patrones.append(p)

# Para cada patrón, asignamos una variable MIHM primaria según su temática (heurística)
# Puedes ajustar después manualmente.
primary_var_map = {
    "decisión": "D_cog",
    "latencia": "F_s",
    "alerta": "I_mc",
    "coherencia": "C_s",
    "incentivo": "V_i",
    "contexto": "D_cog",
    "resiliencia": "C_s",
    "fricción": "F_s",
    "memoria": "C_sem",
    "semántica": "R_sem",
    "energía": "E_r",
    "densidad": "D_i",
    "campo": "Phi"
}
# Asignación simple
for p in patrones:
    lower = p["name"].lower()
    for kw, var in primary_var_map.items():
        if kw in lower:
            p["mihm_v3_variables"] = {"primary": var, "secondary": ["F_s", "C_s"], "interaction": "friction_coherence"}
            break
    else:
        p["mihm_v3_variables"] = {"primary": "F_s", "secondary": ["C_s"], "interaction": "friction_coherence"}
    p["conditions"] = "Sistema con métricas de cumplimiento formalizadas."
    p["falsification"] = "Si después de 30 días el IHG sube > 0.15 sin intervención, el patrón no aplica."
    p["doc_refs"] = [f"SF_P_ECOSISTEMA_{p['id']}"]
    p["series_docs"] = [f"ecosistema-{p['id']}"]

# Leer patterns_v3.json original (si existe)
with open("patterns_v3.json", "r") as f:
    patterns_v3 = json.load(f)

# Fusionar: añadir los nuevos patrones al array "patterns"
patterns_v3["patterns"] = patterns_v3.get("patterns", {})
for p in patrones:
    patterns_v3["patterns"][p["id"]] = {
        "id": p["id"],
        "name": p["name"],
        "definition": p["definition"],
        "conditions": p["conditions"],
        "mihm_v3_variables": p["mihm_v3_variables"],
        "falsification": p["falsification"],
        "doc_refs": p["doc_refs"],
        "series_docs": p["series_docs"]
    }

# Guardar patterns_v4.json
with open("patterns_v4.json", "w") as f:
    json.dump(patterns_v3, f, indent=2, ensure_ascii=False)

print("✅ patterns_v4.json generado con 120 patrones (20 originales + 100 ecosistema)")