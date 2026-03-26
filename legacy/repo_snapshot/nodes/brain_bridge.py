"""
brain_bridge.py — System Friction APTYMOK Council
FastAPI backend que conecta el observatorio con los 4 agentes IA.

Modos:
  A) LOCAL: usa Ollama (gratis, sin internet después de instalar)
  B) CLOUD: usa Anthropic API (Claude claude-sonnet-4-20250514)

Instalación:
  pip install fastapi uvicorn httpx python-dotenv

  Modo A (local): 
    brew install ollama / sudo apt install ollama
    ollama pull llama3.2
    uvicorn brain_bridge:app --reload --port 8000
    
  Modo B (cloud):
    export ANTHROPIC_API_KEY=sk-ant-...
    uvicorn brain_bridge:app --reload --port 8000

Desde observatorio.html, llamar a:
  POST http://localhost:8000/council/analyze
  POST http://localhost:8000/council/debate
  GET  http://localhost:8000/metrics/current
"""

import json
import time
import asyncio
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional
import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
USE_OLLAMA = os.getenv("USE_OLLAMA", "false").lower() == "true"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"

BASE_DIR = Path(__file__).parent

# ─── CARGAR DATOS DEL SISTEMA ──────────────────────────────────────────────────
def load_json(filename: str) -> dict:
    path = BASE_DIR / filename
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}

profiles   = load_json("aptymok_profiles.json")
nodes_data = load_json("SystemFrictionNodes_FINAL.json")
docs_index = load_json("docs_index_FINAL.json")

# Mapa id->nodo para lookup rápido
node_map = {}
if "nodes" in nodes_data:
    for n in nodes_data["nodes"]:
        node_map[n["id"]] = n

# Historial de Cicatrices (en memoria; persiste en archivo aparte)
cicatrices = []
cicatrix_file = BASE_DIR / "cicatrices.json"
if cicatrix_file.exists():
    cicatrices = json.loads(cicatrix_file.read_text())

# ─── MÉTRICAS SIMULADAS (reemplazar con tu pipeline real) ─────────────────────
class MetricsState:
    def __init__(self):
        self.nti  = 0.44
        self.ice  = 0.73
        self.psi  = 0.58
        self.ihg  = 0.21
        self.entropy = 0.40
        self.last_update = time.time()

    def update(self, **kwargs):
        for k, v in kwargs.items():
            if hasattr(self, k):
                setattr(self, k, float(v))
        self.last_update = time.time()

    def dict(self):
        return {
            "nti": self.nti, "ice": self.ice, "psi": self.psi,
            "ihg": self.ihg, "entropy": self.entropy,
            "last_update": self.last_update,
            "ucap": self.ihg <= 0.40 and self.ice >= 0.70 and self.nti < 0.50
        }

metrics = MetricsState()


# ─── MODELOS PYDANTIC ──────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    node_id: Optional[str] = None
    query: str
    metrics_override: Optional[dict] = None

class DebateRequest(BaseModel):
    node_id: Optional[str] = None
    event: str
    context: Optional[str] = ""
    metrics_override: Optional[dict] = None

class MetricsUpdate(BaseModel):
    nti: Optional[float] = None
    ice: Optional[float] = None
    psi: Optional[float] = None
    ihg: Optional[float] = None
    entropy: Optional[float] = None


# ─── APP ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="System Friction Brain Bridge",
    description="Motor de inferencia APTYMOK para el observatorio SF",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción: ["https://systemfriction.org"]
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── LLM CALLS ────────────────────────────────────────────────────────────────
async def call_ollama(system: str, prompt: str, temperature: float = 0.5) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                "options": {"temperature": temperature},
                "stream": False
            }
        )
        data = resp.json()
        return data.get("message", {}).get("content", "Sin respuesta del modelo.")


async def call_anthropic(system: str, prompt: str, temperature: float = 0.5, max_tokens: int = 400) -> str:
    if not ANTHROPIC_KEY:
        return f"[API KEY NO CONFIGURADA] Instala Ollama o añade ANTHROPIC_API_KEY al entorno."
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={"Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY,
                     "anthropic-version": "2023-06-01"},
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": max_tokens,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature
            }
        )
        data = resp.json()
        if "content" in data:
            return data["content"][0]["text"]
        return f"Error Anthropic: {data.get('error', {}).get('message', 'desconocido')}"


async def llm(agent_id: str, prompt: str, ctx_metrics: dict = None) -> str:
    """Llama al LLM correcto según configuración."""
    agent = profiles["agents"].get(agent_id)
    if not agent:
        return f"Agente {agent_id} no encontrado."
    
    # Determinar temperatura según métricas actuales
    m = ctx_metrics or metrics.dict()
    temp = agent["temperature"]
    
    # Ajuste dinámico de temperatura
    if agent_id == "SHINJI" and m.get("psi", 0) > 0.70:
        temp = min(temp + 0.15, 0.99)
    elif agent_id == "SHADOW" and m.get("ice", 1.0) < 0.45:
        temp = min(temp + 0.10, 0.90)
    elif agent_id == "REI" and m.get("nti", 0) > 0.80:
        temp = max(temp - 0.05, 0.05)  # Más frío en crisis
    
    system_prompt = agent["system_prompt"]
    
    if USE_OLLAMA:
        return await call_ollama(system_prompt, prompt, temp)
    else:
        return await call_anthropic(system_prompt, prompt, temp)


# ─── CONSTRUIR CONTEXTO ────────────────────────────────────────────────────────
def build_node_context(node_id: str) -> str:
    """Construye contexto rico sobre un nodo desde los datos reales."""
    node = node_map.get(node_id, {})
    if not node:
        return f"Nodo {node_id} no encontrado en el índice."
    
    ctx = [
        f"NODO: {node.get('name', node_id)}",
        f"CAPA: {node.get('layer', '?')} | TIPO: {node.get('type', '?')}",
        f"DESCRIPCIÓN: {node.get('description', 'Sin descripción')}",
    ]
    if node.get("variables"):
        ctx.append(f"VARIABLES: {', '.join(node['variables'])}")
    if node.get("equations"):
        ctx.append(f"ECUACIONES: {'; '.join(node['equations'])}")
    if node.get("relations"):
        rel_names = []
        for rid in node["relations"][:5]:
            rnode = node_map.get(rid)
            rel_names.append(rnode.get("name", rid) if rnode else rid)
        ctx.append(f"CONECTADO A: {', '.join(rel_names)}")
    if node.get("subsections"):
        subs = [s["title"] for s in node["subsections"][:4]]
        ctx.append(f"SUBSECCIONES: {', '.join(subs)}")
    
    return "\n".join(ctx)


def build_metrics_context(m: dict) -> str:
    ucap = "ACTIVA" if m.get("ucap") else "INACTIVA"
    return (
        f"MÉTRICAS ACTUALES:\n"
        f"  NTI (Latencia): {m.get('nti', '?'):.3f} {'⚠ ALTO' if m.get('nti',0) > 0.70 else ''}\n"
        f"  ICE (Coherencia): {m.get('ice', '?'):.3f} {'⚠ BAJO' if m.get('ice',1) < 0.50 else ''}\n"
        f"  PSI (Presión): {m.get('psi', '?'):.3f} {'⚠ CRÍTICO' if m.get('psi',0) > 0.75 else ''}\n"
        f"  IHG (Homeostasis): {m.get('ihg', '?'):.3f}\n"
        f"  Entropía: {m.get('entropy', '?'):.3f} {'⚠ BIFURCACIÓN' if m.get('entropy',0) > 0.75 else ''}\n"
        f"  UCAP: {ucap}"
    )


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "system": "System Friction Brain Bridge v3.0",
        "agents": list(profiles.get("agents", {}).keys()),
        "nodes_loaded": len(node_map),
        "cicatrices": len(cicatrices),
        "llm_mode": "ollama" if USE_OLLAMA else "anthropic"
    }


@app.get("/metrics/current")
async def get_metrics():
    return metrics.dict()


@app.post("/metrics/update")
async def update_metrics(update: MetricsUpdate):
    data = update.dict(exclude_none=True)
    metrics.update(**data)
    return {"status": "updated", "metrics": metrics.dict()}


@app.post("/council/analyze")
async def analyze_single(req: AnalyzeRequest):
    """
    Un solo agente analiza un nodo o query.
    Úsalo para tooltips y análisis individuales.
    """
    m = req.metrics_override or metrics.dict()
    
    # Determinar qué agente activar según métricas
    agent_id = determine_active_agent(m)
    
    node_ctx = build_node_context(req.node_id) if req.node_id else ""
    metrics_ctx = build_metrics_context(m)
    
    prompt = f"""
{metrics_ctx}

{node_ctx}

CONSULTA: {req.query}

Responde desde tu perspectiva única. Sé específico sobre este nodo/situación.
"""

    response = await llm(agent_id, prompt, m)
    
    return {
        "agent": agent_id,
        "agent_color": profiles["agents"][agent_id]["color"],
        "agent_sigil": profiles["agents"][agent_id]["sigil"],
        "response": response,
        "metrics_snapshot": m,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/council/debate")
async def full_debate(req: DebateRequest):
    """
    Los 4 APTYMOK debaten sobre un evento/nodo.
    Responde en secuencia: REI → SHINJI → KAWORU → SHADOW
    Cada uno responde al anterior + añade su perspectiva.
    """
    m = req.metrics_override or metrics.dict()
    node_ctx = build_node_context(req.node_id) if req.node_id else ""
    metrics_ctx = build_metrics_context(m)
    
    base_context = f"""
EVENTO EN EL SISTEMA: {req.event}
{f'CONTEXTO ADICIONAL: {req.context}' if req.context else ''}

{node_ctx}

{metrics_ctx}
"""
    
    debate = []
    accumulated = base_context
    
    # Orden del debate: REI primero (datos fríos), luego los demás reaccionan
    order = profiles["council_dynamics"]["debate_order"]
    
    for i, agent_id in enumerate(order):
        agent = profiles["agents"][agent_id]
        
        if i == 0:
            prompt = f"{accumulated}\n\nAnaliza este evento desde tu perspectiva."
        else:
            prev_agent = order[i-1]
            prev_response = debate[-1]["response"]
            prompt = (
                f"{accumulated}\n\n"
                f"[{prev_agent}] acaba de decir: \"{prev_response[:200]}...\"\n\n"
                f"Responde desde tu perspectiva única. "
                f"Puedes estar en desacuerdo. Sé específico."
            )
        
        response = await llm(agent_id, prompt, m)
        debate.append({
            "agent": agent_id,
            "sigil": agent["sigil"],
            "color": agent["color"],
            "response": response,
            "temperature_used": agent["temperature"]
        })
        
        # Pequeña pausa para no saturar la API
        await asyncio.sleep(0.3)
    
    # Evaluar si se genera Cicatriz
    cicatrix = await evaluate_cicatrix(req.node_id, req.event, m, debate)
    
    return {
        "event": req.event,
        "node_id": req.node_id,
        "debate": debate,
        "cicatrix_generated": cicatrix is not None,
        "cicatrix": cicatrix,
        "metrics_snapshot": m,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/council/debate/stream")
async def stream_debate(req: DebateRequest):
    """
    Versión streaming del debate — el frontend recibe cada respuesta 
    en tiempo real conforme se genera.
    """
    m = req.metrics_override or metrics.dict()
    node_ctx = build_node_context(req.node_id) if req.node_id else ""
    metrics_ctx = build_metrics_context(m)
    
    async def generate():
        order = profiles["council_dynamics"]["debate_order"]
        previous = ""
        
        for i, agent_id in enumerate(order):
            agent = profiles["agents"][agent_id]
            
            if i == 0:
                prompt = f"EVENTO: {req.event}\n{node_ctx}\n{metrics_ctx}\nAnaliza."
            else:
                prompt = f"EVENTO: {req.event}\n{node_ctx}\n{metrics_ctx}\n[{order[i-1]}]: {previous[:150]}...\nResponde."
            
            response = await llm(agent_id, prompt, m)
            previous = response
            
            chunk = json.dumps({
                "agent": agent_id,
                "sigil": agent["sigil"],
                "color": agent["color"],
                "response": response,
                "index": i,
                "done": i == len(order) - 1
            })
            yield f"data: {chunk}\n\n"
            await asyncio.sleep(0.2)
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/council/cicatrices")
async def get_cicatrices():
    return {"cicatrices": cicatrices, "total": len(cicatrices)}


@app.delete("/council/cicatrices/{cicatrix_id}")
async def delete_cicatrix(cicatrix_id: str):
    # Las cicatrices son permanentes por diseño — solo el Curador puede eliminarlas
    return {"error": "Las cicatrices son permanentes. Son la memoria del sistema."}


@app.get("/nodes/search")
async def search_nodes(q: str, limit: int = 10):
    """Búsqueda semántica básica en los nodos."""
    q_lower = q.lower()
    results = []
    for node in nodes_data.get("nodes", []):
        score = 0
        name = node.get("name", "").lower()
        desc = node.get("description", "").lower()
        if q_lower in name:
            score += 10
        if q_lower in desc:
            score += 5
        for var in node.get("variables", []):
            if q_lower in var.lower():
                score += 3
        if score > 0:
            results.append({**node, "_score": score})
    
    results.sort(key=lambda x: x["_score"], reverse=True)
    return {"results": results[:limit], "total": len(results)}


# ─── LÓGICA INTERNA ────────────────────────────────────────────────────────────
def determine_active_agent(m: dict) -> str:
    """Determina qué agente debe activarse según las métricas actuales."""
    if m.get("ice", 1.0) < 0.40:
        return "SHADOW"
    if m.get("psi", 0) > 0.75:
        return "SHINJI"
    if m.get("entropy", 0) > 0.75:
        return "KAWORU"
    if m.get("nti", 0) > 0.70:
        return "REI"
    # Default: rotación
    agents = ["REI", "SHINJI", "KAWORU", "SHADOW"]
    return agents[int(time.time()) % 4]


async def evaluate_cicatrix(node_id: str, event: str, m: dict, debate: list) -> Optional[dict]:
    """Evalúa si el debate genera una Cicatriz y la persiste."""
    triggers = {
        "SHINJI": m.get("psi", 0) > 0.80 and m.get("ice", 1) < 0.45,
        "REI": m.get("nti", 0) > 0.80 or m.get("ice", 1) < 0.30,
        "KAWORU": m.get("entropy", 0) > 0.80,
        "SHADOW": m.get("ice", 1) < 0.35 and (m.get("nti", 0) > 0.60 or m.get("psi", 0) > 0.65)
    }
    
    triggered_agents = [a for a, t in triggers.items() if t]
    
    if len(triggered_agents) >= profiles["council_dynamics"]["cicatrix_consensus_required"]:
        node = node_map.get(node_id, {})
        cicatrix_id = f"SCAR-{hashlib.md5((node_id + event + str(time.time())).encode()).hexdigest()[:8].upper()}"
        
        cicatrix = {
            "id": cicatrix_id,
            "type": "cicatriz",
            "node_origin": node_id,
            "node_name": node.get("name", node_id),
            "event": event,
            "triggered_by": triggered_agents,
            "metrics_at_trigger": m,
            "debate_summary": [{"agent": d["agent"], "excerpt": d["response"][:100]} for d in debate],
            "timestamp": datetime.now().isoformat(),
            "visual": {"color": "#FF6B6B", "pulse": True, "ring": 5}
        }
        
        cicatrices.append(cicatrix)
        cicatrix_file.write_text(json.dumps(cicatrices, ensure_ascii=False, indent=2))
        
        return cicatrix
    
    return None


# ─── ARRANCAR ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("╔══════════════════════════════════════════════════════╗")
    print("║  System Friction Brain Bridge v3.0                  ║")
    print(f"║  Modo: {'Ollama (local)' if USE_OLLAMA else 'Anthropic (cloud)'}                              ║")
    print(f"║  Nodos cargados: {len(node_map):<36} ║")
    print(f"║  Cicatrices activas: {len(cicatrices):<32} ║")
    print("╚══════════════════════════════════════════════════════╝")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
