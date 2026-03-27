/**
 * Contract tests del Groq proxy.
 * Prueba la lógica del handler sin hacer llamadas reales a Groq.
 * Usa el handler directamente inyectando un env falso.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del fetch global para evitar llamadas reales
const mockFetch = vi.fn()
global.fetch = mockFetch

// Importamos el worker DESPUÉS de mockear fetch
const workerModule = await import('../src/index.js')
const worker = workerModule.default

function makeRequest(path, body) {
  return new Request(`https://sf-proxy.workers.dev${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
    body: JSON.stringify(body),
  })
}

function makeEnv(hasKey = false) {
  return {
    GROQ_API_KEY: hasKey ? 'gsk_test_key' : undefined,
    GROQ_MODEL: 'llama3-8b-8192',
    ALLOWED_ORIGIN: '*',
  }
}

const mockSnapshot = { valence: 0.2, arousal: 0.5, tension: 0.4, focus: 0.6 }

describe('Groq Proxy — modo degradado (sin API key)', () => {
  it('/llm/scenario sin API key → 503 degraded', async () => {
    const req = makeRequest('/llm/scenario', { snapshot: mockSnapshot, seed: '42' })
    const res = await worker.fetch(req, makeEnv(false))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.degraded).toBe(true)
    expect(body.error).toBe('groq_unavailable')
    expect(body.message).toBeTruthy()
  })

  it('/llm/debate sin API key → 503 degraded', async () => {
    const req = makeRequest('/llm/debate', {
      scenarios: [{ id: 's1', label: 'Test' }],
      snapshot: mockSnapshot
    })
    const res = await worker.fetch(req, makeEnv(false))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.degraded).toBe(true)
  })
})

describe('Groq Proxy — rutas y métodos', () => {
  it('GET → 405 method_not_allowed', async () => {
    const req = new Request('https://sf-proxy.workers.dev/llm/scenario', { method: 'GET' })
    const res = await worker.fetch(req, makeEnv(false))
    expect(res.status).toBe(405)
  })

  it('OPTIONS → 204 (CORS preflight)', async () => {
    const req = new Request('https://sf-proxy.workers.dev/llm/scenario', { method: 'OPTIONS' })
    const res = await worker.fetch(req, makeEnv(false))
    expect(res.status).toBe(204)
  })

  it('ruta desconocida → 404', async () => {
    const req = makeRequest('/llm/unknown', {})
    const res = await worker.fetch(req, makeEnv(false))
    expect(res.status).toBe(404)
  })

  it('body inválido → 400', async () => {
    const req = new Request('https://sf-proxy.workers.dev/llm/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
      body: 'no es json',
    })
    const res = await worker.fetch(req, makeEnv(false))
    expect(res.status).toBe(400)
  })

  it('snapshot faltante → 400', async () => {
    const req = makeRequest('/llm/scenario', { seed: '42' })
    const res = await worker.fetch(req, makeEnv(false))
    expect(res.status).toBe(400)
  })
})

describe('Groq Proxy — CORS headers', () => {
  it('respuesta incluye Access-Control-Allow-Origin', async () => {
    const req = makeRequest('/llm/scenario', { snapshot: mockSnapshot })
    const res = await worker.fetch(req, makeEnv(false))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })
})

describe('Groq Proxy — con API key (mock Groq)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('/llm/scenario con key válida y Groq exitoso → 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              scenarios: [
                { label: 'A', description: 'desc A', probability: 0.7,
                  finalState: { IHG: 0.3, NTI: 0.2, R: 0.8, IAD: 0.6, ETE: 0.7 } },
              ]
            })
          }
        }]
      })
    })

    const req = makeRequest('/llm/scenario', { snapshot: mockSnapshot, seed: '42', count: 1 })
    const res = await worker.fetch(req, makeEnv(true))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scenarios).toHaveLength(1)
    expect(body.scenarios[0].label).toBe('A')
    expect(body.trace.method).toBe('groq')
  })

  it('/llm/scenario con Groq fallido → 503 degraded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Error'
    })

    const req = makeRequest('/llm/scenario', { snapshot: mockSnapshot })
    const res = await worker.fetch(req, makeEnv(true))

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.degraded).toBe(true)
  })

  it('escenarios parsean IHG clampado a [-1,1]', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              scenarios: [{
                label: 'X', description: '', probability: 2.5,  // fuera de rango
                finalState: { IHG: 5, NTI: -3, R: 99, IAD: 0.5, ETE: 0.5 }
              }]
            })
          }
        }]
      })
    })

    const req = makeRequest('/llm/scenario', { snapshot: mockSnapshot })
    const res = await worker.fetch(req, makeEnv(true))
    const body = await res.json()

    expect(body.scenarios[0].probability).toBeLessThanOrEqual(1)
    expect(body.scenarios[0].finalState.IHG).toBeLessThanOrEqual(1)
    expect(body.scenarios[0].finalState.NTI).toBeGreaterThanOrEqual(0)
    expect(body.scenarios[0].finalState.R).toBeLessThanOrEqual(1)
  })
})
