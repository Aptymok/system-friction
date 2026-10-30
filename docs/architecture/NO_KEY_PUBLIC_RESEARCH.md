# No-key public research

SFI Prospect Radar must not require a paid search provider.

## Default retrieval path

1. GDELT DOC 2.0 public endpoint (`api.gdeltproject.org`) without an API key.
2. Optional OpenAI Web Search when explicitly configured and funded.
3. Optional Brave Search when explicitly configured.

GDELT results are retrieval evidence, not verified facts. The synthesis layer must preserve source claims, counterevidence and uncertainty.

## Local zero-cost synthesis (existing Ollama route)

Use Ollama on an operator-controlled private machine. A smaller model can reduce RAM and local compute requirements; this is **free model inference**, not free hosting or guaranteed uptime.

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:4b
```

For a more capable machine, `qwen3.5:9b` is another candidate. These are model **candidates**, not models installed or tested on SFI production. Download and select the model only in an authorized private infrastructure environment.

The existing `src/lib/ai/providerRouter.ts` supports `ollama`, and its `/api/chat` integration can request `format: "json"` for operations requiring structured output. The WorldSpect hypothesis stage requires structured JSON and independently validates the returned hypothesis/test contract. A JSON-mode response is **not** proof of a valid hypothesis, authority, RETURN or learning. Verify with a bounded non-sensitive live canary before treating any model as healthy.

**Confidentiality boundary:** `127.0.0.1` refers to the machine executing SFI, **not** a founder-owned computer when SFI executes on Vercel. Vercel cannot reach a privately bound operator localhost. Do not expose Ollama unauthenticated on the public Internet, publish internal prompts or keys, or assume a third-party free inference API has private-data guarantees. A remote host requires separately authorized private networking, access control, encryption, capacity and cost review. If that is unavailable, retain deterministic degraded synthesis and report the model-dependent stage as blocked; do not fabricate hypotheses or RETURNS.

## Prohibitions

- Do not require `OPENAI_API_KEY` or `BRAVE_SEARCH_API_KEY` for basic public retrieval.
- Do not invent sources, contacts or email patterns.
- Do not treat a GDELT title as a confirmed institutional fact.
- Do not describe a projected threshold as a deterministic collapse date.
