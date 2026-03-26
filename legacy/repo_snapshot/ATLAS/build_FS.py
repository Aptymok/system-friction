# ===============================================================
#  ENSAMBLADOR AUTOMÁTICO SF_2 — by APTYMOK + Copilot
#  Este script une cada módulo generado por la IA en este chat
#  y produce un archivo final SF_2_FINAL.html
#  — El usuario NO edita nada —
# ===============================================================

import os

# Nombre final:
OUTPUT = "SF_2_FINAL.html"

# Módulos esperados:
MODULES = [
    "00.html",
    "01.html",
    "02.html",
    "03.html",
    "04.html",
    "05.html",
    "06.html"
]

# Ensamblado:
with open(OUTPUT, "w", encoding="utf-8") as final:
    for m in MODULES:
        if not os.path.exists(m):
            print(f"[AVISO] Falta el módulo: {m}")
            continue

        print(f"[+] Integrando: {m}")
        with open(m, "r", encoding="utf-8") as f:
            final.write(f.read())
            final.write("\n\n")

print("\n==============================================================")
print(" SF_2_FINAL.html generado con éxito ✔")
print("==============================================================")
print("Si algún módulo falta, te lo genero yo de inmediato.")