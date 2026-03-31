"""
SystemFriction v2 — Railway Backend
Rutas: GET /, GET /health, POST /api/metrics, GET /api/metrics, GET /api/commits, POST /api/llm/narrative
"""

import os
import json
import sqlite3
import requests
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)

CORS(app, origins=[
    "https://system-friction-production.up.railway.app",
    "http://localhost:5173",
    "http://localhost:4173",
    "*",  # relax for dev; restrict in prod via env var CORS_ORIGIN
])

DB_PATH = os.environ.get("DB_PATH", "metrics.db")
GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# ── DB init ────────────────────────────────────────────────────────────────────

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS metrics (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            ts            TEXT    NOT NULL,
            tick          INTEGER DEFAULT 0,
            ihg           REAL,
            nti           REAL,
            r             REAL,
            iad           REAL,
            ete           REAL,
            friction      REAL,
            fsoc          REAL,
            fracture_risk REAL,
            status        TEXT,
            raw           TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return jsonify({
        "status":    "SF-CORE online",
        "version":   "0.2",
        "engine":    "MIHM Personal",
        "endpoints": ["/health", "/api/metrics", "/api/commits", "/api/llm/narrative"],
    }), 200


@app.route("/health")
def health():
    return jsonify({"status": "ok", "ts": datetime.utcnow().isoformat() + "Z"}), 200


@app.route("/api/metrics", methods=["POST"])
def save_metrics():
    data  = request.get_json(silent=True) or {}
    mihm  = data.get("mihm", {})
    psi   = data.get("psi", {})
    fsoc  = psi.get("T", 0) * 0.4 + psi.get("P", 0) * 0.3 + psi.get("X", 0) * 0.3
    fr    = psi.get("T", 0) * 0.5 + psi.get("P", 0) * 0.3 + (1 - psi.get("R", 0.5)) * 0.2

    conn = get_conn()
    conn.execute("""
        INSERT INTO metrics
            (ts, tick, ihg, nti, r, iad, ete, friction, fsoc, fracture_risk, status, raw)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("ts", datetime.utcnow().isoformat()),
        data.get("tick", 0),
        mihm.get("IHG"),
        mihm.get("NTI"),
        mihm.get("R"),
        mihm.get("IAD"),
        mihm.get("ETE"),
        mihm.get("frictionScore"),
        round(fsoc, 4),
        round(fr, 4),
        mihm.get("status", "UNKNOWN"),
        json.dumps(data),
    ))
    conn.commit()
    conn.close()
    return jsonify({"saved": True, "ts": datetime.utcnow().isoformat()}), 200


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    limit = request.args.get("limit", 50, type=int)
    conn  = get_conn()
    rows  = conn.execute(
        "SELECT ts, tick, ihg, nti, r, friction, fsoc, fracture_risk, status "
        "FROM metrics ORDER BY id DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200


@app.route("/api/commits")
def get_commits():
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    try:
        resp = requests.get(
            "https://api.github.com/repos/Aptymok/system-friction/commits?per_page=10",
            headers=headers,
            timeout=6,
        )
        data = resp.json()
        commits = []
        if isinstance(data, list):
            for c in data:
                commit_info = c.get("commit", {})
                commits.append({
                    "sha":     c.get("sha", "")[:7],
                    "message": commit_info.get("message", "").split("\n")[0],
                    "author":  commit_info.get("author", {}).get("name", ""),
                    "date":    commit_info.get("author", {}).get("date", ""),
                })
        return jsonify({"commits": commits, "count": len(commits)}), 200
    except Exception as e:
        return jsonify({"commits": [], "count": 0, "error": str(e)}), 200


@app.route("/api/llm/narrative", methods=["POST"])
def llm_narrative():
    data      = request.get_json(silent=True) or {}
    user_text = data.get("text", "")
    mihm      = data.get("mihm", {})
    psi       = data.get("psi", {})
    context   = data.get("context", "")   # personal context string

    if not GROQ_KEY:
        return jsonify({"narrative": _local_narrative(user_text, mihm, psi), "source": "local"}), 200

    ihg = mihm.get("IHG", 0)
    nti = mihm.get("NTI", 0)
    r   = mihm.get("R", 0)
    st  = mihm.get("status", "OK")

    personal_note = f"\nContexto personal del usuario: {context}" if context else ""

    prompt = (
        f"Eres Eidolón, asistente de autoconocimiento cognitivo.\n"
        f"Estado MIHM: IHG={ihg:.2f} NTI={nti:.2f} R={r:.2f} Estado={st}\n"
        f"Ψ: A={psi.get('A',0):.2f} P={psi.get('P',0):.2f} C={psi.get('C',0):.2f} T={psi.get('T',0):.2f}"
        f"{personal_note}\n"
        f"Usuario: {user_text}\n"
        f"Responde en español, máximo 3 oraciones, integrando las métricas de forma natural y empática."
    )

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model":       "llama-3.1-8b-instant",
                "messages":    [{"role": "user", "content": prompt}],
                "max_tokens":  220,
                "temperature": 0.75,
            },
            timeout=10,
        )
        result = resp.json()
        text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        return jsonify({"narrative": text, "source": "groq"}), 200
    except Exception as e:
        return jsonify({
            "narrative": _local_narrative(user_text, mihm, psi),
            "source":    "local",
            "error":     str(e),
        }), 200


def _local_narrative(user_text: str, mihm: dict, psi: dict) -> str:
    ihg = mihm.get("IHG", 0)
    nti = mihm.get("NTI", 0)
    r   = mihm.get("R", 0)
    st  = mihm.get("status", "OK")

    if st == "COLLAPSE":
        return f"Sistema en colapso. IHG={ihg:.2f}, NTI={nti:.2f}. Se requiere intervención inmediata."
    if st == "CRITICAL":
        return f"Estado crítico. Fricción alta — R={r:.2f} insuficiente para sostener la carga cognitiva."
    if st == "DEGRADED":
        return f"Degradación sistémica. NTI={nti:.2f} erosiona la resiliencia. R={r:.2f}."

    lower = user_text.lower()
    if "cómo" in lower or "como" in lower:
        return (f"Tu homeostasis está en IHG={ihg:.2f}. "
                f"{'Tensión elevada — considera una pausa.' if nti > 0.5 else 'El sistema está equilibrado.'}")
    return (f"Estado estable: IHG={ihg:.2f}, R={r:.2f}. "
            f"{'Alta tensión activa.' if nti > 0.5 else 'Sistema dentro de rangos nominales.'}")


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
