# No-key public research

SFI Prospect Radar must not require a paid search provider.

## Default retrieval path

1. GDELT DOC 2.0 public endpoint (`api.gdeltproject.org`) without an API key.
2. Optional OpenAI Web Search when explicitly configured and funded.
3. Optional Brave Search when explicitly configured.

GDELT results are retrieval evidence, not verified facts. The synthesis layer must preserve source claims, counterevidence and uncertainty.

## Local zero-cost synthesis

Use Ollama locally:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.6:latest
```

A Vercel deployment cannot reach an Ollama server bound to the operator's localhost. For hosted zero-cost use, expose a privately controlled Ollama-compatible endpoint or accept deterministic degraded synthesis.

## Prohibitions

- Do not require `OPENAI_API_KEY` or `BRAVE_SEARCH_API_KEY` for basic public retrieval.
- Do not invent sources, contacts or email patterns.
- Do not treat a GDELT title as a confirmed institutional fact.
- Do not describe a projected threshold as a deterministic collapse date.
