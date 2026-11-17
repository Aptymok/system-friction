from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib
import os
import sys
# Vercel imports ASGI entrypoints by absolute file path, not by package cwd.
# Resolve sibling original modules without altering MIHM formulas.
SERVICE_DIR = Path(__file__).resolve().parent
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from urllib.parse import quote
from urllib.request import Request as UrlRequest, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
import hmac
import re
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
    extractor = Path(__file__).resolve().parents[3] / "python" / "scorefriction" / "audio_features.py"
    return {"ok": extractor.is_file(), "service": "sfi-engine",
            "acoustic_extractor_present": extractor.is_file()}

@app.post("/evaluate")
def evaluate(payload: SfiEngineInput):
    # A source-less input is NOT an observed MIHM case; never synthesize a
    # scientific measurement from default coefficients.
    if not payload.evidence and not payload.vectors:
        raise HTTPException(status_code=422, detail="MIHM_MISSING_MATERIAL_OBSERVATION")
    mihm = evaluate_mihm(payload.model_dump())
    mc = run_montecarlo(mihm)
    return {
        "ok": True,
        "ihg": mihm["ihg"],
        "nti": mihm["nti"],
        "ldi": mihm["ldi"],
        "xi": mihm["xi"],
        "montecarlo": mc,
        "calibration_status": "NOT_CALIBRATED",
        "warnings": mihm.get("warnings", []) + mc.get("warnings", []),
    }


# Reuse the existing MIHM v3 acoustic extractor. This is a real signal
# computation, NOT the Studio object-context synthesis or a heuristic proxy.
@app.post("/evaluate-audio")
async def evaluate_audio(request: Request):
    secret = os.environ.get("SFI_ENGINE_STUDIO_TOKEN") or os.environ.get("CRON_SECRET")
    if not secret or request.headers.get("x-sfi-studio-token") != secret:
        raise HTTPException(status_code=403, detail="MIHM_AUDIO_AUTH_NOT_CONFIGURED_OR_DENIED")
    expected = request.headers.get("x-content-sha256", "").lower()
    if len(expected) != 64 or any(c not in "0123456789abcdef" for c in expected):
        raise HTTPException(status_code=422, detail="MIHM_SOURCE_HASH_REQUIRED")
    max_bytes = 120 * 1024 * 1024
    audio_bytes = bytearray()
    async for chunk in request.stream():
        audio_bytes.extend(chunk)
        if len(audio_bytes) > max_bytes:
            raise HTTPException(status_code=413, detail="MIHM_AUDIO_TOO_LARGE")
    if not audio_bytes or hashlib.sha256(audio_bytes).hexdigest() != expected:
        raise HTTPException(status_code=422, detail="MIHM_AUDIO_HASH_MISMATCH")
    if bytes(audio_bytes[:4]) != b"RIFF" or bytes(audio_bytes[8:12]) != b"WAVE":
        raise HTTPException(status_code=415, detail="MIHM_REQUIRES_VERIFIED_WAV")

    def run():
        module_path = Path(__file__).resolve().parents[3] / "python" / "scorefriction"
        if not module_path.is_dir():
            raise RuntimeError("MIHM_CANONICAL_EXTRACTOR_MISSING")
        sys.path.insert(0, str(module_path))
        from audio_features import MIHMAcousticExtractor
        with TemporaryDirectory(prefix="sfi-mihm-audio-") as directory:
            audio_file = Path(directory) / "observed.wav"
            audio_file.write_bytes(audio_bytes)
            extractor = MIHMAcousticExtractor(str(audio_file))
            vector = extractor.extract_all()
            valid = MIHMAcousticExtractor.is_valid_emission(vector)
            result = MIHMAcousticExtractor.compute_ihg(vector, nti=None) if valid else None
            return {
                "ok": True,
                "method": "MIHM_V3_CANONICAL_ACOUSTIC",
                "state": "DERIVED" if valid else "INSUFFICIENT_DATA",
                "source_sha256": expected,
                "duration_seconds": extractor.duration,
                "mihm_vector": vector,
                "core_emission_valid": valid,
                "weighted_sum": result["weighted_sum"] if result else None,
                "penalty_sum": result["penalty_sum"] if result else None,
                "ihg_raw": result["ihg_raw"] if result else None,
                "ihg_final": None,
                "nti": None,
                "warnings": [
                    "NTI_NOT_OBSERVED_FINAL_IHG_BLOCKED",
                    "SEMANTIC_NOT_OBSERVED_NO_LYRICS",
                    "ACOUSTIC_PROXIES_NOT_CULTURAL_OUTCOMES"
                ],
            }

    try:
        return await run_in_threadpool(run)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"MIHM_AUDIO_EXTRACTION_FAILED:{type(exc).__name__}") from exc


class _NoCrossOriginRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("MIHM_STORAGE_REDIRECT_BLOCKED")


class StoredAudioInput(BaseModel):
    source_sha256: str
    bucket: str
    storage_path: str


@app.post("/evaluate-audio-stored")
async def evaluate_audio_stored(payload: StoredAudioInput, request: Request):
    secret = os.environ.get("SFI_ENGINE_STUDIO_TOKEN") or os.environ.get("CRON_SECRET")
    provided = request.headers.get("x-sfi-studio-token", "")
    if not secret or not hmac.compare_digest(provided, secret):
        raise HTTPException(status_code=403, detail="MIHM_AUDIO_AUTH_DENIED")
    expected = payload.source_sha256.lower()
    if not re.fullmatch(r"[0-9a-f]{64}", expected):
        raise HTTPException(status_code=422, detail="MIHM_SOURCE_HASH_REQUIRED")
    if payload.bucket != "studio-objects":
        raise HTTPException(status_code=422, detail="MIHM_STORAGE_BUCKET_NOT_ALLOWED")
    if not payload.storage_path or ".." in payload.storage_path.split("/") or len(payload.storage_path) > 1024:
        raise HTTPException(status_code=422, detail="MIHM_STORAGE_PATH_INVALID")
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base.startswith("https://") or not key:
        raise HTTPException(status_code=503, detail="MIHM_PRIVATE_STORAGE_NOT_CONFIGURED")

    def run():
        url = base + "/storage/v1/object/authenticated/" + quote(payload.bucket, safe="") + "/" + quote(payload.storage_path, safe="/")
        req = UrlRequest(url, headers={"Authorization": "Bearer " + key, "apikey": key})
        opener = build_opener(_NoCrossOriginRedirect)
        with opener.open(req, timeout=65) as response:
            audio_bytes = response.read(120 * 1024 * 1024 + 1)
        if len(audio_bytes) > 120 * 1024 * 1024:
            raise ValueError("MIHM_ORIGINAL_AUDIO_TOO_LARGE")
        if hashlib.sha256(audio_bytes).hexdigest() != expected:
            raise ValueError("MIHM_ORIGINAL_AUDIO_HASH_MISMATCH")
        module_path = Path(__file__).resolve().parents[3] / "python" / "scorefriction"
        if not module_path.is_dir():
            raise RuntimeError("MIHM_CANONICAL_EXTRACTOR_MISSING")
        if str(module_path) not in sys.path:
            sys.path.insert(0, str(module_path))
        from audio_features import MIHMAcousticExtractor
        suffix = Path(payload.storage_path).suffix.lower()
        if suffix not in (".wav", ".wave", ".mp3", ".flac", ".m4a", ".aac", ".ogg"):
            raise ValueError("MIHM_AUDIO_FORMAT_UNSUPPORTED")
        with TemporaryDirectory(prefix="sfi-mihm-source-") as directory:
            audio_file = Path(directory) / ("original" + suffix)
            audio_file.write_bytes(audio_bytes)
            extractor = MIHMAcousticExtractor(str(audio_file))
            vector = extractor.extract_all()
            import math
            core = ("F_s", "D_i", "E_r", "C_s", "D_cog", "G_f")
            valid = all(isinstance(vector.get(x), (int, float)) and
                        math.isfinite(vector[x]) and 0 <= vector[x] <= 1 for x in core)
            for name, value in vector.items():
                if isinstance(value, float) and not math.isfinite(value):
                    vector[name] = None
            result = MIHMAcousticExtractor.compute_ihg(vector, nti=None) if valid else None
            return {
                "ok": True,
                "method": "MIHM_V3_CANONICAL_ACOUSTIC",
                "state": "DERIVED" if valid else "INSUFFICIENT_DATA",
                "source_sha256": expected,
                "duration_seconds": extractor.duration,
                "mihm_vector": vector,
                "core_emission_valid": valid,
                "weighted_sum": result["weighted_sum"] if result else None,
                "penalty_sum": result["penalty_sum"] if result else None,
                "ihg_raw": result["ihg_raw"] if result else None,
                "ihg_final": None,
                "nti": None,
                "warnings": ["NTI_NOT_OBSERVED_FINAL_IHG_BLOCKED", "SEMANTIC_NOT_OBSERVED_NO_LYRICS",
                             "ACOUSTIC_PROXIES_NOT_CULTURAL_OUTCOMES"],
            }

    try:
        return await run_in_threadpool(run)
    except (HTTPError, URLError, ValueError, RuntimeError, Exception) as exc:
        raise HTTPException(status_code=422, detail=f"MIHM_STORAGE_ACOUSTIC_FAILED:{type(exc).__name__}") from exc
