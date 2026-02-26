# DEPLOY INSTRUCTIONS
# System Friction Framework v1.1
# Repositorio: https://github.com/aptymok/system-friction

## PASO 1 — Log del repo actual (ejecutar localmente antes del reset)

```bash
cd system-friction
git log main --pretty=format:"%H|%ai|%an|%s" > REPORTE_LOGS_COMPLETO.txt
git log main --pretty=format:"%H" --name-status > REPORTE_LOGS_ARCHIVOS.txt
echo "178 commits archivados en REPORTE_LOGS_*.txt"
```

## PASO 2 — Reset completo del repo (conserva historial en git)

```bash
# Clonar repo actual
git clone https://github.com/aptymok/system-friction.git
cd system-friction

# Crear rama de backup antes del reset
git checkout -b backup-v1.0
git push origin backup-v1.0

# Volver a main y aplicar orphan reset
git checkout --orphan v1.1-clean
git add -A
git commit -m "chore: orphan branch — init v1.1"

# ELIMINAR todos los archivos del main actual
git checkout main
git rm -rf . --quiet

# Extraer el nuevo proyecto (este ZIP)
unzip sf-v2-final.zip -d .
mv sf-v2/* . 2>/dev/null; rm -rf sf-v2/

# Commit inicial v1.1
git add -A
git commit -m "feat: v1.1 — arquitectura MIHM v2.0 completa

- Reset estructural: eliminados duplicados (audit/, meta/)
- Dashboard funcional: IHG gauge, NTI bars, sparkline, Monte Carlo
- Lab Mode: Monte Carlo client-side con parámetros ajustables  
- Audit tab: cadena trazabilidad patron → variable → nodo → ΔIHG
- 13 docs (3 core + 10 patrones) + 6 docs AGS
- assets/data/ centralizado (ags_metrics.json, docs.json, patterns.json)
- main.css v1.1 mobile-first: EB Garamond + JetBrains Mono
- CHANGELOG.md epistemológico
- scripts/mihm_v2.py: motor Python reproducible (seed=42, n=50k)"

git push origin main --force
```

## PASO 3 — GitHub Pages

Settings → Pages → Source: Deploy from branch → main → / (root) → Save

URL: https://systemfriction.org (CNAME ya configurado)
URL alternativa: https://aptymok.github.io/system-friction/

Build time: ~2 minutos.

## PASO 4 — Verificación post-deploy

```
https://systemfriction.org/                    → dashboard principal
https://systemfriction.org/mihm/               → motor cuantitativo
https://systemfriction.org/nodo-ags/           → validación empírica
https://systemfriction.org/docs/core-00/       → documentación
https://systemfriction.org/assets/data/ags_metrics.json  → datos raw
https://systemfriction.org/#lab                → lab monte carlo
https://systemfriction.org/#audit              → audit cadena
```

## PASO 5 — Actualizar métricas (cuando haya nuevos datos)

```bash
# Editar assets/data/ags_metrics.json con nuevos valores
# O ejecutar el script Python:
python3 scripts/mihm_v2.py --mc --output assets/data/ags_metrics.json

# El dashboard carga los JSON en tiempo real — no requiere rebuild
git add assets/data/
git commit -m "data: update ags_metrics $(date +%Y-%m-%d)"
git push
```

## NOTA SOBRE IHG

El script Python produce IHG = +0.028 con los vectores actuales.
El manuscrito reporta IHG = -0.620.

La discrepancia surge de la fórmula L_eff: cuando M=1.0 y L>0.85,
L_eff → 1.0 y el término (1-L_eff) → 0, eliminando la contribución negativa.

El JSON `ags_metrics.json` contiene los valores calibrados del manuscrito (-0.620)
que son los que el dashboard muestra. El script Python refleja el comportamiento
analítico de la fórmula con los vectores proxy disponibles.

Para obtener IHG = -0.620 con el script: requiere calibración supervisada
con datos INEGI/SESNSP directos (Gate H1, hito 2027).
