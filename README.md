# System Friction · Terminal Operacional

Base Next.js App Router construida alrededor de `systemprompt.html` como contrato operativo.

## Rutas

- `/` landing operacional
- `/terminal` terminal principal con auditoria, AMV, patrones, hard stop y memoria
- `/llms.txt` protocolo legible para agentes
- `/api/audit` auditoria operacional
- `/api/link/generate` token magico
- `/api/link/verify` verificacion de token
- `/api/whatsapp/webhook` flujo MOP-H por WhatsApp

## Ejecutar

```bash
npm install
npm run dev
```

### Local institutional TLS

```bash
npm run dev:local-insecure
npm run build:local-insecure
```

This command exists because the local institutional machine intercepts TLS certificates. Use only for local proof. Do not use in production.

La app funciona sin variables de entorno usando memoria local de runtime. Con `GEMINI_API_KEY`, el auditor agrega diagnostico cualitativo desde Gemini. Supabase queda preparado por migracion y clientes lazy, sin bloquear el build local.



```
