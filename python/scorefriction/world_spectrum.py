# core/world_spectrum.py - VersiÃ³n corregida con manejo SSL

import asyncio
import sys
import time
import math
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import ssl
import certifi
import httpx

# â”€â”€ CONSTANTES CON URLs CORREGIDAS â”€â”€
DATA_SOURCES = {
    "nasa": {
        "url": "https://api.nasa.gov/DONKI/FLR",
        "ttl_hours": 2,
        "weight": 0.10,
        "nti_base": 0.92,
        "mihm_var": "G_f",
    },
    "worldbank": {
        "url": "https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG",
        "ttl_hours": 6,
        "weight": 0.30,
        "nti_base": 0.85,
        "mihm_var": "E_r",
    },
    "bbc_world": {
        "url": "http://feeds.bbci.co.uk/news/rss.xml",  # â† HTTP en lugar de HTTPS
        "ttl_hours": 0.5,
        "weight": 0.25,
        "nti_base": 0.70,
        "mihm_var": "D_cog",
    },
    "hn": {
        "url": "https://hnrss.org/frontpage",  # â† URL alternativa mÃ¡s confiable
        "ttl_hours": 0.33,
        "weight": 0.20,
        "nti_base": 0.75,
        "mihm_var": "V_i",
    },
    "aljazeera": {
    "url": "https://www.aljazeera.com/xml/rss/all.xml",
    "ttl_hours": 0.5,
    "weight": 0.15,
    "nti_base": 0.75,
    "mihm_var": "R_sem",
},
    "news_api": {
        "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "ttl_hours": 0.5,
        "weight": 0.15,
        "nti_base": 0.85,
        "mihm_var": "R_sem",
    },
}

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

def _cache_get(key: str) -> Optional[dict]:
    return _CACHE.get(key)

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
    if src_key == "nasa":
        return min(1.0, raw / 20.0)
    if src_key == "worldbank":
        return min(1.0, max(0.0, (raw + 5.0) / 13.0))
    if src_key in ("gdelt_global", "reuters"):
        return min(1.0, raw / 50.0)
    if src_key == "hn":
        return min(1.0, raw / 100.0)  # HNRSS tiene menos items
    return min(1.0, max(0.0, float(raw)))

def _get_stale_fallback(key: str, max_age_hours: int = 24) -> Optional[dict]:
    """Devuelve datos stale (expirados) si existen y no son demasiado viejos"""
    entry = _CACHE.get(key)
    if not entry:
        return None
    
    age_hours = (time.time() - entry.get("fetched_at", 0)) / 3600
    if age_hours > max_age_hours:
        return None
    
    # Marcar como stale pero devolver los datos
    result = entry.copy()
    result["stale"] = True
    result["stale_age_hours"] = round(age_hours, 1)
    # Penalizar NTI por usar datos stale
    result["nti"] = result.get("nti_base", 0.5) * max(0.3, 1.0 - (age_hours / max_age_hours))
    return result


# â”€â”€ SENSORES CON SSL CORREGIDO â”€â”€
async def _fetch_nasa_eonet() -> dict:
    """EONET es mÃ¡s estable y no requiere API key para uso bÃ¡sico"""
    key = "eonet"
    url = "https://eonet.gsfc.nasa.gov/api/v2.1/events?limit=100"
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url)
        r.raise_for_status()
        data = r.json()
        events = data.get("events", [])
        raw_count = len(events)
        norm_val = min(1.0, raw_count / 100.0)
        
        return {
            "key": key,
            "label": "Natural Events (EONET)",
            "value": norm_val,
            "raw": raw_count,
            "nti": 0.85,  # Alta confiabilidad
            "weight": 0.10,
            "mihm_var": "G_f",
            "simulated": False,
        }
    except Exception as e:
        return _make_error_source(key, str(e))

async def _fetch_worldbank(retry_count=2) -> dict:
    key = "worldbank"
    if _is_fresh(key):
        return _cache_get(key)
    
    # URL mÃ¡s simple y confiable
    url = "https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json"
    
    sys.stderr.write(f"[WorldBank] Fetching GDP data...")
    
    for attempt in range(retry_count):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(url, headers={"Accept": "application/json"})
            
            # Verificar si es JSON
            content_type = r.headers.get("content-type", "")
            if "json" not in content_type:
                sys.stderr.write(f"[WorldBank] Not JSON, content-type: {content_type}")
                # Intentar con otra URL
                alt_url = "https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.PCAP.KD.ZG?format=json"
                r = await client.get(alt_url, headers={"Accept": "application/json"})
            
            r.raise_for_status()
            
            # WorldBank API puede devolver HTML en lugar de JSON cuando hay error
            text = r.text.strip()
            if not text.startswith('[') and not text.startswith('{'):
                raise ValueError("Response is not JSON (possibly HTML error page)")
            
            payload = r.json()
            
            # Extraer datos
            if isinstance(payload, list) and len(payload) > 1:
                records = payload[1]
                # Buscar el valor mÃ¡s reciente no nulo
                rec = None
                for item in records:
                    if item.get("value") is not None:
                        rec = item
                        break
                
                if rec is None:
                    return _make_error_source(key, "no_valid_gdp_data")
                
                raw_val = float(rec["value"])
                norm_val = _normalize_value(raw_val, key)
                
                result = {
                    "key": key,
                    "label": f"GDP Growth {rec.get('date', 'unknown')}",
                    "value": norm_val,
                    "raw": raw_val,
                    "unit": "%",
                    "nti": DATA_SOURCES[key]["nti_base"],
                    "nti_base": DATA_SOURCES[key]["nti_base"],
                    "weight": DATA_SOURCES[key]["weight"],
                    "mihm_var": DATA_SOURCES[key]["mihm_var"],
                    "simulated": False,
                    "ts": datetime.utcnow().isoformat(),
                }
                _cache_set(key, result)
                sys.stderr.write(f"[WorldBank] Success: GDP {raw_val}% -> {norm_val}")
                return result
            else:
                return _make_error_source(key, "unexpected_api_response")
                
        except Exception as e:
            sys.stderr.write(f"[WorldBank] Attempt {attempt + 1} failed: {e}")
            if attempt < retry_count - 1:
                await asyncio.sleep(2)
    
    return _make_error_source(key, "all_retries_failed")

async def _fetch_gdelt_global() -> dict:
    key = "gdelt_global"
    if _is_fresh(key):
        return _cache_get(key)
    cfg = DATA_SOURCES[key]
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            r = await client.get(cfg["url"], headers={"User-Agent": "SFI-Agent/3.1 (systemfriction.org)"})
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
            "nti": DATA_SOURCES[key]["nti_base"],
            "nti_base": DATA_SOURCES[key]["nti_base"],
            "weight": DATA_SOURCES[key]["weight"],
            "mihm_var": DATA_SOURCES[key]["mihm_var"],
            "simulated": False,
            "ts": datetime.utcnow().isoformat(),
        }
        _cache_set(key, result)
        return result
    except Exception as e:
        return _make_error_source(key, str(e)[:100])

async def _fetch_rss(src_key: str) -> dict:
    if _is_fresh(src_key):
        return _cache_get(src_key)
    cfg = DATA_SOURCES[src_key]
    try:
        # Crear cliente SSL que acepta certificados autofirmados para RSS
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        headers = {"User-Agent": "SFI-Agent/3.1 (systemfriction.org)"}
        
        async with httpx.AsyncClient(
            timeout=15.0, 
            follow_redirects=True,
            verify=False  # Deshabilitar verificaciÃ³n SSL para RSS (seguridad baja para fuentes pÃºblicas)
        ) as client:
            r = await client.get(cfg["url"], headers=headers)
        
        if r.status_code == 429:
            return _make_error_source(src_key, "rate_limited")
        
        r.raise_for_status()
        
        # Intentar parsear XML
        try:
            root = ET.fromstring(r.text)
            items = root.findall(".//item")
            raw_count = len(items)
        except ET.ParseError:
            # Si falla el parsing, buscar con regex o devolver error
            return _make_error_source(src_key, "xml_parse_error")
        
        norm_val = _normalize_value(raw_count, src_key)

        # Tono estimado
        negative_kw = {"crisis","war","attack","death","fail","collapse","conflict","fire","disaster","kill"}
        positive_kw = {"peace","growth","agreement","recovery","progress","launch","discover","achieve"}
        neg = sum(1 for it in items for kw in negative_kw if kw in (it.findtext("title") or "").lower())
        pos = sum(1 for it in items for kw in positive_kw if kw in (it.findtext("title") or "").lower())
        tone = (pos - neg) / max(1, raw_count)
        tone_norm = (tone + 1) / 2

        result = {
            "key": src_key,
            "label": cfg["url"].split("/")[2] if "url" in cfg else src_key,
            "value": norm_val,
            "raw": raw_count,
            "tone": round(tone_norm, 4),
            "unit": "items",
            "nti": cfg["nti_base"] * tone_norm,
            "nti_base": cfg["nti_base"],
            "weight": cfg["weight"],
            "mihm_var": cfg["mihm_var"],
            "simulated": False,
            "ts": datetime.utcnow().isoformat(),
        }
        _cache_set(src_key, result)
        return result
    except Exception as e:
        return _make_error_source(src_key, str(e)[:100])

# â”€â”€ AGREGADOR PRINCIPAL â”€â”€
async def get_world_spectrum(nasa_key: str = "DEMO_KEY") -> dict:
    results = await asyncio.gather(
        _fetch_nasa_eonet(),
        _fetch_worldbank(),
        _fetch_gdelt_global(),
        _fetch_rss("hn"),
        _fetch_rss("aljazeera"),  # â† Cambiado de reuters
        return_exceptions=False,
    )
    sources = [r for r in results if isinstance(r, dict)]

    # WSI (World Spectrum Index)
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

# â”€â”€ CLI â”€â”€
async def main():
    import json
    try:
        result = await get_world_spectrum()
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e), "simulated": True}))

if __name__ == "__main__":
    asyncio.run(main())
