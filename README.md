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

La app funciona sin variables de entorno usando memoria local de runtime. Con `GEMINI_API_KEY`, el auditor agrega diagnostico cualitativo desde Gemini. Supabase queda preparado por migracion y clientes lazy, sin bloquear el build local.



```