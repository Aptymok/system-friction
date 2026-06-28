import os

# API Keys are read from environment variables or use safe public defaults.
NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")

# Data sources for the Python WorldSpectrum payload generator.
DATA_SOURCES = {
    "worldbank": {
        "url": "https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG",
        "ttl_hours": 6,
        "weight": 0.30,
        "nti_base": 0.85,
        "mihm_var": "E_r",
    },
    "gdelt_global": {
        "url": "https://api.gdeltproject.org/api/v2/doc/doc?query=sourcecountry:US&mode=ArtList&format=json&maxrecords=50&sort=HybridRel",
        "ttl_hours": 0.5,
        "weight": 0.20,
        "nti_base": 0.72,
        "mihm_var": "GEO_DIGITAL",
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
