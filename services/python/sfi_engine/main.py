from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from mihm import evaluate_mihm
from montecarlo import run_montecarlo

app = FastAPI(title="SFI Engine", version="1.0.0")

class SfiEngineInput(BaseModel):
    object_id: str
    module: str
    evidence: List[Any] = []
    worldspect: Optional[Dict[str, Any]] = None
    vectors: Dict[str, Any] = {}

@app.get("/health")
def health():
    return {"ok": True, "service": "sfi-engine"}

@app.post("/evaluate")
def evaluate(payload: SfiEngineInput):
    mihm = evaluate_mihm(payload.model_dump())
    mc = run_montecarlo(mihm)
    return {
        "ok": True,
        "ihg": mihm["ihg"],
        "nti": mihm["nti"],
        "ldi": mihm["ldi"],
        "xi": mihm["xi"],
        "montecarlo": mc,
        "warnings": mihm.get("warnings", []),
    }
