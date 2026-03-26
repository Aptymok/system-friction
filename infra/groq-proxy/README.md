# Groq Proxy — infra/groq-proxy

**Propósito:** Proxy serverless opcional que expone los endpoints `/llm/scenario` y `/llm/debate`
sin exponer la API key de Groq en el cliente (iOS o web).

**Si no está configurado:** la app iOS y la web funcionan en modo degradado (solo motor matemático local).

---

## Endpoints

### POST /llm/scenario
Genera escenarios usando Groq LLM como motor adicional.

**Request:**
```json
{
  "snapshot": { "valence": 0.1, "arousal": 0.5, "tension": 0.4, "focus": 0.6 },
  "seed": "42",
  "count": 3
}
```

**Response (200):**
```json
{
  "scenarios": [
    {
      "label": "Escenario X",
      "description": "...",
      "probability": 0.7,
      "finalState": { "IHG": 0.3, "NTI": 0.2, "R": 0.8, "IAD": 0.6, "ETE": 0.7 }
    }
  ],
  "model": "llama3-8b-8192",
  "trace": { "method": "groq", "seed": "42", "timestamp": 1234567890 }
}
```

**Response (503 — modo degradado):**
```json
{ "error": "groq_unavailable", "degraded": true, "message": "Usando motor local." }
```

### POST /llm/debate
Genera argumentos de debate para escenarios dados.

---

## Deploy

### Cloudflare Workers (recomendado)
```bash
cd infra/groq-proxy
npm install
npx wrangler deploy
```

Configura el secreto:
```bash
npx wrangler secret put GROQ_API_KEY
```

### Variables de entorno
```
GROQ_API_KEY=gsk_...        # obligatorio para modo completo
GROQ_MODEL=llama3-8b-8192   # opcional, default: llama3-8b-8192
RATE_LIMIT_PER_MIN=20       # opcional, default: 20
```

---

## Seguridad
- La API key NUNCA se envía al cliente.
- Rate limiting por IP (20 req/min por defecto).
- CORS configurado para aceptar solo el dominio de la app.
- Logs de trazabilidad sin datos personales.
