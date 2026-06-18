# SFI Pipeline Minimal Patch

Este parche instala un ciclo mínimo de baja inyección:

observación real → MIHM derived → cotejo → propuesta → material revisable → draft → memoria Atlas → consola gráfica.

## Rutas nuevas o modificadas

- `/api/sfi/contrast`
- `/api/sfi/proposals`
- `/api/sfi/material`
- `/api/publisher/draft`
- `/api/atlas/memory`
- `/api/sfi/run`
- `/sfi-console`

## Comandos

```powershell
cd "D:\system friction"
npm run typecheck
npm run dev
```

En otra terminal:

```powershell
cd "D:\system friction"
npm run qa:sfi-pipeline
```

## Regla operativa

El parche no publica, no llama servicios externos, no inventa datos y no genera archivos multimedia reales. Sólo prepara material revisable a partir de evidencia, vectores y MIHM derivados existentes.
