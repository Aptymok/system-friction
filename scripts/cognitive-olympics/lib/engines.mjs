import { parseJsonLoose, clamp01 } from './utils.mjs';
import { constitutionPrompt } from './constitutions.mjs';

function heuristicAnswer(p) {
  const xs = p.history || [];
  const last = xs.at(-1)?.value;
  const prev = xs.at(-2)?.value;
  let decision = 'ABSTAIN';
  if (Number.isFinite(last) && Number.isFinite(prev)) {
    const scale = Math.max(1, Math.abs(prev));
    const d = (last - prev) / scale;
    decision = Math.abs(d) <= 0.01 ? 'STABLE' : d > 0 ? 'UP' : 'DOWN';
  }
  return {
    problemId: p.problemId, decision, confidence: decision === 'ABSTAIN' ? 0.2 : 0.55,
    hypothesis: 'Persistence baseline: the most recent direction continues one step.',
    rivals: [], evidenceUsed: [], evidenceRequests: [], sfiMethods: [], agentsUsed: [], abstainReason: decision === 'ABSTAIN' ? 'insufficient history' : null,
  };
}

export function statsEngine() {
  return {
    id: 'stats:persistence', kind: 'stats', label: 'STATISTICAL PERSISTENCE CONTROL',
    async planEvidence(problems) { return Object.fromEntries(problems.map((p) => [p.problemId, []])); },
    async solve(problems) { return problems.map(heuristicAnswer); },
    async congress() { return []; },
  };
}

async function ollamaChat({ baseUrl, model, messages, format = 'json', options = {} }) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, format, options }),
  });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}:${await response.text()}`);
  const body = await response.json();
  return body?.message?.content || '';
}

async function groqChat({ model, messages, maxTokens = 8000 }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: maxTokens, response_format: { type: 'json_object' } }),
  });
  if (!response.ok) throw new Error(`GROQ_HTTP_${response.status}:${await response.text()}`);
  const body = await response.json();
  return body?.choices?.[0]?.message?.content || '';
}

function normalizeAnswers(raw, problems) {
  const parsed = parseJsonLoose(raw);
  const answers = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.answers) ? parsed.answers : []);
  const byId = new Map(answers.map((a) => [a?.problemId, a]));
  return problems.map((p) => {
    const a = byId.get(p.problemId) || {};
    const decision = ['UP', 'DOWN', 'STABLE', 'ABSTAIN'].includes(a.decision) ? a.decision : 'ABSTAIN';
    return {
      problemId: p.problemId,
      decision, confidence: clamp01(a.confidence ?? 0.1),
      hypothesis: String(a.hypothesis || ''),
      rivals: Array.isArray(a.rivals) ? a.rivals.slice(0, 4).map(String) : [],
      evidenceUsed: Array.isArray(a.evidenceUsed) ? a.evidenceUsed.slice(0, 8).map(String) : [],
      evidenceRequests: Array.isArray(a.evidenceRequests) ? a.evidenceRequests.slice(0, 4).map(String) : [],
      sfiMethods: Array.isArray(a.sfiMethods) ? a.sfiMethods.slice(0, 4).map(String) : [],
      agentsUsed: Array.isArray(a.agentsUsed) ? a.agentsUsed.slice(0, 21).map(String) : [],
      abstainReason: a.abstainReason ? String(a.abstainReason) : null,
    };
  });
}

function planPrompt(problems, constitution, memory, sfiAgentPacket) {
  return `${constitution}\nAnnual memory (scored past only): ${JSON.stringify(memory).slice(0, 12000)}\n\nFor each problem, choose at most 4 evidenceId values from evidenceCatalog that you genuinely need before deciding. Do not guess future values. Return JSON {"plans":[{"problemId":"...","evidenceRequests":["E:..."]}]}.\nSFI agent packet (may be absent): ${JSON.stringify(sfiAgentPacket || null).slice(0, 18000)}\nProblems: ${JSON.stringify(problems)}`;
}

function solvePrompt(problems, constitution, memory, sfiAgentPacket) {
  return `${constitution}\nAnnual memory (scored past only): ${JSON.stringify(memory).slice(0, 12000)}\n\nSolve every problem. Required fields: problemId, decision=UP|DOWN|STABLE|ABSTAIN, confidence 0..1, hypothesis, rivals[], evidenceUsed[], evidenceRequests[], sfiMethods[], agentsUsed[], abstainReason. If requiredMethod exists and SFI is available, use it only within its stated scope. Evidence IDs must come from the supplied problem. If an SFI agent packet is available, agentsUsed must name only agents actually used in your reasoning. No information after year is admissible. Return JSON {"answers":[...]}.\nSFI agent packet (may be absent): ${JSON.stringify(sfiAgentPacket || null).slice(0, 18000)}\nProblems: ${JSON.stringify(problems)}`;
}

export function llmEngine({ provider, model, baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434' }) {
  const id = `${provider}:${model}`;
  const call = async (messages) => provider === 'ollama'
    ? ollamaChat({ baseUrl, model, messages })
    : provider === 'groq'
      ? groqChat({ model, messages })
      : Promise.reject(new Error(`Unsupported provider ${provider}`));
  return {
    id, kind: 'llm', label: id,
    async planEvidence(problems, ctx) {
      const c = constitutionPrompt(ctx.constitutionId, ctx.constitutionState);
      const raw = await call([{ role: 'system', content: 'You are an evidence acquisition planner in a temporally sealed cognitive laboratory.' }, { role: 'user', content: planPrompt(problems, c, ctx.memory, ctx.sfiAgentPacket) }]);
      const parsed = parseJsonLoose(raw); const plans = Array.isArray(parsed?.plans) ? parsed.plans : [];
      return Object.fromEntries(plans.map((p) => [p.problemId, Array.isArray(p.evidenceRequests) ? p.evidenceRequests.slice(0, 4) : []]));
    },
    async solve(problems, ctx) {
      const c = constitutionPrompt(ctx.constitutionId, ctx.constitutionState);
      const raw = await call([{ role: 'system', content: 'You are a cognitive athlete. You may lose. Preserve temporal integrity and evidence boundaries.' }, { role: 'user', content: solvePrompt(problems, c, ctx.memory, ctx.sfiAgentPacket) }]);
      return normalizeAnswers(raw, problems);
    },
    async congress({ self, peers, year, memory }) {
      const raw = await call([{ role: 'system', content: 'Annual congress occurs only after the year has been scored. Peer identities are pseudonymous.' }, { role: 'user', content: `You are ${self}. Year ${year} is already scored. For each peer, you may send at most two short messages. Share, question, warn, challenge or decline. Do not invent unobserved facts. Return JSON {"messages":[{"to":"...","text":"..."}]}. Peers: ${JSON.stringify(peers)} Memory: ${JSON.stringify(memory).slice(0, 8000)}` }]);
      const parsed = parseJsonLoose(raw); return Array.isArray(parsed?.messages) ? parsed.messages.slice(0, peers.length * 2) : [];
    },
  };
}

export async function discoverOllamaModels(baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434') {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`);
  if (!response.ok) throw new Error(`OLLAMA_TAGS_HTTP_${response.status}`);
  const body = await response.json();
  return (body?.models || []).map((m) => m.name).filter(Boolean);
}
