#!/usr/bin/env python3
"""
MIHM v3.1 — Real Mode Server (Flask)
Super simplificado para uso inmediato
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import numpy as np
from scipy.integrate import solve_ivp
from scipy.special import gamma
import requests

app = Flask(__name__)
CORS(app)

# ====== MIHM v2.0 ======
def IHG(vectors):
    vals = [(v["C"] - v["E"]) * (1 - min(v["L"] * (1 + (1 - v["M"])), 1)) for v in vectors.values()]
    return sum(vals) / len(vals)

def NTI(components):
    c = components
    return (1/5) * ((1-c["LDI_n"]) + c["ICC_n"] + c["CSR"] + c["IRCI_n"] + c["IIM"])

# ====== MIHM v3.1 Dinámico ======
alpha, beta, delta, eta, theta, kappa, mu = 0.15, 0.35, 0.08, 0.05, 0.20, 0.012, 0.018
x0 = np.array([-0.620, 0.351, 0.25])
LDI_frozen = 42.0
T = 30.0

def u_pon(t, ihg):
    e = ihg + 0.620
    K = np.sqrt(1.2/0.75) * (1 + 0.32*(T - t)**0.7 / gamma(1.7))
    return -K * e

def sistema(t, x):
    IHG, NTI, R = x
    LDI = LDI_frozen - 0.85*t
    u = u_pon(t, IHG)
    dIHG = -alpha*IHG + beta*NTI*R*(1-abs(IHG)) - kappa*LDI + u
    dNTI = -delta*NTI + 0.25*IHG*(1-NTI**2) - mu*max(0, LDI-30)
    dR   = -eta*R + theta*IHG*NTI
    return [dIHG, dNTI, dR]

def run_dynamic():
    t_eval = np.linspace(0, T, 301)
    sol = solve_ivp(sistema, [0,T], x0, t_eval=t_eval, method="LSODA")
    ihg30 = float(sol.y[0,-1])
    nti30 = float(sol.y[1,-1])
    return ihg30, nti30

# ====== API ENDPOINTS ======

@app.route("/api/mihm/state")
def get_state():
    # IHG/NTI estático
    vectors = {
        "N6": {"C":0.4,"E":0.95,"L":0.85,"K":0.75,"R":0.2,"M":0.7}
    }
    comps = {"LDI_n":1,"ICC_n":0.32,"CSR":0,"IRCI_n":0.935,"IIM":0.5}

    ihg_static = IHG(vectors)
    nti_static = NTI(comps)

    ihg_dyn, nti_dyn = run_dynamic()

    return jsonify({
        "ihg_static": ihg_static,
        "nti_static": nti_static,
        "ihg_30d": ihg_dyn,
        "nti_30d": nti_dyn,
    })

@app.route("/api/groq", methods=["POST"])
def proxy_groq():
    """Proxy seguro: el frontend nunca ve tu API KEY"""
    headers = {
        "Authorization": f"Bearer {os.environ['GROQ_KEY']}",
        "Content-Type": "application/json"
    }
    body = request.json
    r = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=body
    )
    return r.json()

if __name__ == "__main__":
    print("✅ MIHM v3.1 server activo en http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000)