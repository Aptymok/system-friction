# SFI Final ZIP Packager

Este paquete genera un ZIP limpio de `System Friction` desde tu máquina local.

No incluye:

- `.env`, `.env.local`, `.env.production`
- `.venv`, `venv`
- `.next`
- `node_modules`
- logs
- caches
- `_sfi_cleanroom` por defecto
- `.git` por defecto
- llaves/certificados locales
- bases de datos/dumps locales

## Uso en Windows / PowerShell

Coloca este folder dentro de la raíz del repo o ejecútalo indicando la ruta.

Desde `D:\system friction`:

```powershell
powershell -ExecutionPolicy Bypass -File ".\make-sfi-final-zip.ps1"
```

Si el archivo está en Descargas:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\TU_USUARIO\Downloads\make-sfi-final-zip.ps1" -Root "D:\system friction"
```

El resultado queda en:

```text
D:\system friction\_sfi_exports\
  system-friction-final-YYYYMMDD-HHMMSS.zip
  system-friction-final-YYYYMMDD-HHMMSS.manifest.txt
  system-friction-final-YYYYMMDD-HHMMSS.report.md
```

## Incluir `.git`

No recomendado para entrega limpia, pero posible:

```powershell
powershell -ExecutionPolicy Bypass -File ".\make-sfi-final-zip.ps1" -IncludeGit
```

## Incluir `_sfi_cleanroom`

No recomendado salvo que quieras conservar reportes locales:

```powershell
powershell -ExecutionPolicy Bypass -File ".\make-sfi-final-zip.ps1" -IncludeCleanroomReports
```

## Validación rápida

Después de crear el ZIP:

```powershell
Get-ChildItem ".\_sfi_exports"
```

Para revisar que no se fueron secretos:

```powershell
Select-String -Path ".\_sfi_exports\*.manifest.txt" -Pattern ".env|private_vault|node_modules|.next|.venv|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY"
```

Si aparece `.env`, `private_vault` o llaves explícitas, no compartas ese ZIP.
