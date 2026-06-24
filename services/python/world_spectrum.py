import asyncio
import sys
import time
import math
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Any, Dict, Optional
import ssl
import httpx
from config import DATA_SOURCES, NASA_API_KEY

# â”€â”€ CACHE â”€â”€
_CACHE: Dict[str, dict] = {}

def _is_fresh(key: str) -> bool:
    entry = _CACHE.get(key)
    if not entry:
        return False
    ttl_sec = DATA_SOURCES[key]["ttl_hours"] * 3600
    return (time.time() - entry["fetched_at"]) < ttl_sec

def _cache_set(key: str, data: dict) -> None:
    _CACHE[key] = {**data, "fetched_at": time.time()}

def _make_error_source(key: str, error: str) -> dict:
    cfg = DATA_SOURCES[key]
    return {
        "key": key,
        "label": key.upper(),
        "value": None,
        "nti": 0.0,
        "nti_base": cfg["nti_base"],
        "weight": cfg["weight"],
        "mihm_var": cfg["mihm_var"],
        "error": error,
        "simulated": True,
        "ts": datetime.utcnow().isoformat(),
    }

def _normalize_value(raw: float, src_key: str) -> float:
    if src_key == "worldbank":
        return min(1.0, max(0.0, (raw + 5.0) / 13.0))
    if src_key in ("gdelt_global", "reuters", "aljazeera", "news_api"):
        return min(1.0, raw / 50.0)
    if src_key == "hn":
        return min(1.0, raw / 100.0)
    return min(1.0, max(0.0, float(raw)))

async def _fetch_worldbank() -> dict:
    key = "worldbank"
    if _is_fresh(key):
        return _CACHE[key]
    url = DATA_SOURCES[key]["url"] + "?format=json"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, headers={"Accept": "application/json"})
        r.raise_for_status()
        payload = r.json()
        if isinstance(payload, list) and len(payload) > 1:
            records = payload[1]
            for item in records:
                if item.get("value") is not None:
                    raw_val = float(item["value"])
                    norm_val = _normalize_value(raw_val, key)
                    result = {
                        "key": key,
                        "label": f"GDP Growth {item.get('date', 'unknown')}",
                        "value": norm_val,
                        "raw": raw_val,
                        "unit": "%",
                        "nti": DATA_SOURCES[key]["nti_base"],
                        "weight": DATA_SOURCES[key]["weight"],
                        "mihm_var": DATA_SOURCES[key]["mihm_var"],
                        "simulated": False,
                        "ts": datetime.utcnow().isoformat(),
                    }
                    _cache_set(key, result)
                    return result
        return _make_error_source(key, "no_valid_gdp_data")
    except Exception as e:
        return _make_error_source(key, str(e)[:100])

async def _fetch_gdelt_global() -> dict:
    key = "gdelt_global"
    if _is_fresh(key):
        return _CACHE[key]
    cfg = DATA_SOURCES[key]
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            r = await client.get(cfg["url"], headers={"User-Agent": "SFI-Agent/3.1"})
        r.raise_for_status()
        payload = r.json()
        articles = payload.get("articles", []) if isinstance(payload, dict) else []
        raw_count = len(articles)
        norm_val = _normalize_value(raw_count, key)
        result = {
            "key": key,
            "label": "GDELT Global Knowledge Graph",
            "value": norm_val,
            "raw": raw_count,
            "unit": "articles",
            "nti": cfg["nti_base"],
            "weight": cfg["weight"],
            "mihm_var": cfg["mihm_var"],
            "simulated": False,
            "ts": datetime.utcnow().isoformat(),
        }
        _cache_set(key, result)
        return result
    except Exception as e:
        return _make_error_source(key, str(e)[:100])

async def _fetch_rss(src_key: str) -> dict:
    if _is_fresh(src_key):
        return _CACHE[src_key]
    cfg = DATA_SOURCES[src_key]
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            r = await client.get(cfg["url"], headers={"User-Agent": "SFI-Agent/3.1"})
        r.raise_for_status()
        root = ET.fromstring(r.text)
        items = root.findall(".//item")
        raw_count = len(items)
        norm_val = _normalize_value(raw_count, src_key)
        result = {
            "key": src_key,
            "label": cfg["url"].split("/")[2],
            "value": norm_val,
            "raw": raw_count,
            "unit": "items",
            "nti": cfg["nti_base"],
            "weight": cfg["weight"],
            "mihm_var": cfg["mihm_var"],
            "simulated": False,
            "ts": datetime.utcnow().isoformat(),
        }
        _cache_set(src_key, result)
        return result
    except Exception as e:
        return _make_error_source(src_key, str(e)[:100])

async def get_world_spectrum() -> dict:
    results = await asyncio.gather(
        _fetch_worldbank(),
        _fetch_gdelt_global(),
        _fetch_rss("hn"),
        _fetch_rss("aljazeera"),
        _fetch_rss("news_api"),
        return_exceptions=False,
    )
    sources = [r for r in results if isinstance(r, dict)]
    total_weight = 0.0
    weighted_sum = 0.0
    nti_sum = 0.0
    for s in sources:
        if s.get("value") is not None and not s.get("simulated", True):
            w = s["weight"]
            total_weight += w
            weighted_sum += w * s["value"]
            nti_sum += s["nti"]
    wsi = (weighted_sum / total_weight) if total_weight > 0 else None
    nti = (nti_sum / len(sources)) if sources else 0.0
    return {
        "sources": sources,
        "wsi": round(wsi, 6) if wsi is not None else None,
        "nti": round(nti, 6),
        "ts": datetime.utcnow().isoformat(),
        "degraded_sources": [s["key"] for s in sources if s.get("simulated")],
    }

async def main():
    import json
    result = await get_world_spectrum()
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())
