import os

# API Keys (se leen de variables de entorno o usan valor por defecto)
NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")

# Fuentes de datos para WorldSpectrum
DATA_SOURCES = {
    "worldbank": {
        "url": "https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG",
        "ttl_hours": 6,
        "weight": 0.30,
        "nti_base": 0.85,
        "mihm_var": "E_r",
    },
    "bbc_world": {
        "url": "http://feeds.bbci.co.uk/news/rss.xml",
        "ttl_hours": 0.5,
        "weight": 0.25,
        "nti_base": 0.70,
        "mihm_var": "D_cog",
    },
    "hn": {
        "url": "https://hnrss.org/frontpage",
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