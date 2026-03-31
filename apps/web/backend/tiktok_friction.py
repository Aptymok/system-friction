# tiktok_friction.py (agregar a repo)
import asyncio
from playwright.async_api import async_playwright
import json
from groq_client import GroqClient

async def scrape_tiktok_trends(limit=20):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.tiktok.com/discover/music-trending")
        await page.wait_for_timeout(5000)
        
        trends = []
        for _ in range(limit):
            items = await page.query_selector_all('div[data-e2e="music-card"]')
            for item in items[:limit]:
                try:
                    name = await item.query_selector('span')
                    name = await name.inner_text() if name else "Unknown"
                    trends.append({"name": name.strip(), "type": "sound"})
                except:
                    pass
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(2000)
        
        await browser.close()
    
    # Análisis con Groq para extraer fonemas virales y métricas
    groq = GroqClient()
    prompt = f"Extrae fonemas repetidos, BPM aproximado y hook potential de estas tendencias TikTok: {json.dumps(trends)}"
    analysis = await groq.analyze_trends(prompt)  # nuevo método en groq_client
    return {"raw": trends, "phonetic_vector": analysis.get("phonemes", []), "viral_score": analysis.get("viral_potential", 0.0)}    