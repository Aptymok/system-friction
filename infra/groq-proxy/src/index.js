/**
 * infra/groq-proxy/src/index.js
 * Cloudflare Worker — Proxy para Groq LLM (opcional).
 *
 * Si GROQ_API_KEY no está configurado, responde en modo degradado.
 * El cliente (iOS/web) NUNCA recibe la API key.
 */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const DEFAULT_MODEL = 'llama3-8b-8192'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20

// Almacén en memoria para rate limiting (se resetea con cada instancia Worker)
const rateLimitStore = new Map()

// ── Entry point Cloudflare Workers ──────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }), env)
    }

    // Solo POST
    if (request.method !== 'POST') {
      return errorResponse(405, 'method_not_allowed', env)
    }

    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown'
    if (!checkRateLimit(clientIP)) {
      return errorResponse(429, 'rate_limit_exceeded', env)
    }

    // Routing
    if (url.pathname === '/llm/scenario') {
      return handleScenario(request, env)
    }
    if (url.pathname === '/llm/debate') {
      return handleDebate(request, env)
    }

    return errorResponse(404, 'not_found', env)
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleScenario(request, env) {
  const body = await parseBody(request)
  if (!body) return errorResponse(400, 'invalid_json', env)

  const { snapshot, seed = '42', count = 3 } = body

  if (!snapshot) return errorResponse(400, 'missing_snapshot', env)

  // Modo degradado si no hay API key
  if (!env.GROQ_API_KEY) {
    return degradedResponse('groq_unavailable', 'Usando motor local.', env)
  }

  const prompt = buildScenarioPrompt(snapshot, seed, count)

  try {
    const groqResult = await callGroq(prompt, env)
    const scenarios = parseScenarios(groqResult, count)
    const trace = {
      method: 'groq',
      seed: String(seed),
      model: env.GROQ_MODEL || DEFAULT_MODEL,
      timestamp: Date.now(),
    }

    return jsonResponse({ scenarios, model: env.GROQ_MODEL || DEFAULT_MODEL, trace }, env)
  } catch (err) {
    console.error('Groq error:', err.message)
    return degradedResponse('groq_error', 'Error al contactar Groq. Usando motor local.', env)
  }
}

async function handleDebate(request, env) {
  const body = await parseBody(request)
  if (!body) return errorResponse(400, 'invalid_json', env)

  const { scenarios, snapshot, seed = '42' } = body

  if (!scenarios || !Array.isArray(scenarios)) {
    return errorResponse(400, 'missing_scenarios', env)
  }

  if (!env.GROQ_API_KEY) {
    return degradedResponse('groq_unavailable', 'Usando argumentos heurísticos locales.', env)
  }

  const prompt = buildDebatePrompt(scenarios, snapshot)

  try {
    const groqResult = await callGroq(prompt, env)
    const arguments_ = parseDebateArguments(groqResult, scenarios)
    const trace = {
      method: 'groq-debate',
      seed: String(seed),
      model: env.GROQ_MODEL || DEFAULT_MODEL,
      timestamp: Date.now(),
    }

    return jsonResponse({ arguments: arguments_, trace }, env)
  } catch (err) {
    console.error('Groq debate error:', err.message)
    return degradedResponse('groq_error', 'Error en debate Groq. Usando agentes locales.', env)
  }
}

// ── Groq API ─────────────────────────────────────────────────────────────────

async function callGroq(prompt, env) {
  const model = env.GROQ_MODEL || DEFAULT_MODEL

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el motor de escenarios de SystemFriction.
Dado un estado cognitivo (CognitiveSnapshot), genera escenarios de evolución futura.
Responde SOLO con JSON válido, sin texto adicional.
Cada escenario debe tener: label, description, probability (0-1), finalState (IHG, NTI, R, IAD, ETE en sus rangos).`

function buildScenarioPrompt(snapshot, seed, count) {
  return `CognitiveSnapshot: ${JSON.stringify(snapshot)}
Seed: ${seed}
Genera exactamente ${count} escenarios de evolución.
Formato de respuesta:
{"scenarios": [{"label": "...", "description": "...", "probability": 0.7, "finalState": {"IHG": 0.3, "NTI": 0.2, "R": 0.8, "IAD": 0.6, "ETE": 0.7}}]}`
}

function buildDebatePrompt(scenarios, snapshot) {
  return `CognitiveSnapshot: ${JSON.stringify(snapshot)}
Escenarios: ${JSON.stringify(scenarios)}
Como agentes SHINJI/REI/SHADOW/KAWORU, argumenta sobre cada escenario.
Formato: {"arguments": [{"agentId": "SHINJI", "scenarioId": "...", "score": 0.8, "argument": "..."}]}`
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseScenarios(groqText, count) {
  try {
    const parsed = JSON.parse(groqText)
    const scenarios = parsed.scenarios ?? []
    return scenarios.slice(0, count).map(s => ({
      label: s.label ?? 'Sin nombre',
      description: s.description ?? '',
      probability: clamp(Number(s.probability) || 0.5, 0, 1),
      finalState: {
        IHG: clamp(Number(s.finalState?.IHG) || 0, -1, 1),
        NTI: clamp(Number(s.finalState?.NTI) || 0.5, 0, 1),
        R:   clamp(Number(s.finalState?.R) || 0.5, 0, 1),
        IAD: clamp(Number(s.finalState?.IAD) || 0.5, 0, 1),
        ETE: clamp(Number(s.finalState?.ETE) || 0.5, 0, 1),
      }
    }))
  } catch {
    return []
  }
}

function parseDebateArguments(groqText, scenarios) {
  try {
    const parsed = JSON.parse(groqText)
    return parsed.arguments ?? []
  } catch {
    return scenarios.map(s => ({
      agentId: 'SHINJI',
      scenarioId: s.id,
      score: 0.5,
      argument: 'Argumento no disponible (parse error).',
    }))
  }
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitStore.get(ip) ?? { count: 0, windowStart: now }

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) return false

  entry.count++
  rateLimitStore.set(ip, entry)
  return true
}

// ── Response helpers ─────────────────────────────────────────────────────────

function jsonResponse(data, env) {
  return corsResponse(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }),
    env
  )
}

function degradedResponse(code, message, env) {
  return corsResponse(
    new Response(JSON.stringify({ error: code, degraded: true, message }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }),
    env
  )
}

function errorResponse(status, code, env) {
  return corsResponse(
    new Response(JSON.stringify({ error: code }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    }),
    env
  )
}

function corsResponse(response, env) {
  const origin = env?.ALLOWED_ORIGIN ?? '*'
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return new Response(response.body, { status: response.status, headers })
}

async function parseBody(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function clamp(v, min, max) {
  if (!isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}
