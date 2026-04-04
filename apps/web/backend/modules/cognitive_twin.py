import math
import os
from datetime import datetime
from datetime import timedelta
import requests


class CognitiveTwinSystem:
    def __init__(self):
        self.last_state = None
        self.history = []
        self.nasa_api_key = os.environ.get('NASA_API_KEY', 'DEMO_KEY')

    def _get_json(self, url, timeout=8):
        r = requests.get(url, timeout=timeout, headers={'User-Agent': 'SystemFriction/2.0'})
        r.raise_for_status()
        return r.json()

    def _safe_prob(self, vec):
        s = sum(max(0.0, x) for x in vec)
        if s <= 0:
            n = len(vec)
            return [1.0 / n for _ in vec]
        return [max(0.0, x) / s for x in vec]

    def _kl(self, p, q):
        eps = 1e-9
        return sum(pi * math.log((pi + eps) / (qi + eps)) for pi, qi in zip(p, q))

    def _fetch_nasa(self):
        today = datetime.utcnow().date()
        start = today - timedelta(days=30)
        apod = self._get_json(f'https://api.nasa.gov/planetary/apod?api_key={self.nasa_api_key}')
        donki = self._get_json(
            f'https://api.nasa.gov/DONKI/FLR?startDate={start.isoformat()}&endDate={today.isoformat()}&api_key={self.nasa_api_key}'
        )
        flare_count = len(donki) if isinstance(donki, list) else 0
        return {
            'source': 'NASA APOD + DONKI',
            'apod_date': apod.get('date'),
            'apod_title': apod.get('title'),
            'solar_flare_events_window': flare_count,
        }

    def _latest_indicator(self, indicator_code, country='US'):
        url = f'https://api.worldbank.org/v2/country/{country}/indicator/{indicator_code}?format=json&per_page=60'
        payload = self._get_json(url)
        series = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
        for row in series:
            if row.get('value') is not None:
                return {
                    'value': float(row['value']),
                    'date': row.get('date'),
                    'indicator': indicator_code,
                    'country': country,
                }
        raise RuntimeError(f'No data for {indicator_code}/{country}')

    def _fetch_macro(self):
        inflation = self._latest_indicator('FP.CPI.TOTL.ZG', 'US')
        unemployment = self._latest_indicator('SL.UEM.TOTL.ZS', 'US')
        growth = self._latest_indicator('NY.GDP.MKTP.KD.ZG', 'US')
        return {
            'source': 'World Bank',
            'inflation': inflation,
            'unemployment': unemployment,
            'gdp_growth': growth,
        }

    def _fetch_emergence(self):
        birth_rate = self._latest_indicator('SP.DYN.CBRT.IN', 'US')
        pop_total = self._latest_indicator('SP.POP.TOTL', 'US')

        rate = max(0.001, birth_rate['value'])
        lam = min(1.0, rate / 20.0)
        p = max(1e-9, min(1 - 1e-9, lam))
        entropy = -(p * math.log2(p) + (1 - p) * math.log2(1 - p))

        return {
            'source': 'World Bank proxy birth data',
            'lambda': lam,
            'H_E': entropy,
            'birth_rate_per_1000': birth_rate,
            'population_total': pop_total,
        }

    def _fetch_sentiment(self):
        feed = self._get_json('https://www.reddit.com/r/worldnews/hot.json?limit=50')
        posts = feed.get('data', {}).get('children', [])
        pos_words = {'growth', 'peace', 'win', 'improve', 'breakthrough', 'record', 'stable'}
        neg_words = {'war', 'crisis', 'collapse', 'inflation', 'conflict', 'recession', 'strike'}

        scores = []
        for post in posts:
            txt = (post.get('data', {}).get('title', '') + ' ' + post.get('data', {}).get('selftext', '')).lower()
            pos = sum(1 for w in pos_words if w in txt)
            neg = sum(1 for w in neg_words if w in txt)
            scores.append(pos - neg)

        if not scores:
            raise RuntimeError('No Reddit posts available for sentiment')

        mean_score = sum(scores) / len(scores)
        variance = sum((s - mean_score) ** 2 for s in scores) / len(scores)
        polarity = max(-1.0, min(1.0, mean_score / 3.0))
        volatility = min(1.0, math.sqrt(variance) / 4.0)

        return {
            'source': 'Reddit r/worldnews',
            'sample_size': len(scores),
            'polarity': polarity,
            'volatility': volatility,
        }

    def _fuse_state(self, emergence, nasa, sentiment, macro):
        S_bio = emergence['lambda']
        S_cosmos = min(1.0, nasa['solar_flare_events_window'] / 25.0)
        S_humano = (sentiment['polarity'] + 1.0) / 2.0
        inflation = max(0.0, macro['inflation']['value'])
        unemployment = max(0.0, macro['unemployment']['value'])
        growth = macro['gdp_growth']['value']
        S_macro = max(0.0, min(1.0, (growth + 5) / 10.0 - inflation / 30.0 - unemployment / 30.0 + 0.4))

        state = {
            'S_bio': S_bio,
            'S_cosmos': S_cosmos,
            'S_humano': S_humano,
            'S_macro': S_macro,
            'timestamp': datetime.utcnow().isoformat(),
        }
        state['S_t_dagger'] = S_bio + S_cosmos + S_humano + S_macro
        return state

    def _boundary(self, friction, state):
        complexity = 4
        gain = 0.0
        if self.history:
            gain = self.history[-1]['friction'] - friction

        boundary_hit = complexity > 3 and gain <= 0
        record = {
            'timestamp': state['timestamp'],
            'complexity': complexity,
            'friction_gain': gain,
            'boundary_reached': boundary_hit,
            'G': 'incompleteness-boundary' if boundary_hit else 'expanding',
        }
        return record

    def refresh(self):
        emergence = self._fetch_emergence()
        nasa = self._fetch_nasa()
        sentiment = self._fetch_sentiment()
        macro = self._fetch_macro()

        state = self._fuse_state(emergence, nasa, sentiment, macro)

        p_pred = self._safe_prob([state['S_bio'], state['S_cosmos'], state['S_humano'], state['S_macro']])
        p_real = self._safe_prob([
            emergence['lambda'],
            min(1.0, nasa['solar_flare_events_window'] / 25.0),
            (sentiment['polarity'] + 1.0) / 2.0,
            max(0.0, min(1.0, (macro['gdp_growth']['value'] + 5) / 10.0)),
        ])
        friction = self._kl(p_pred, p_real)
        density = sum(v for v in [state['S_bio'], state['S_cosmos'], state['S_humano'], state['S_macro']]) / 4.0
        boundary = self._boundary(friction, state)

        payload = {
            'state_unified': state,
            'friction': {'F_t': friction, 'P_pred': p_pred, 'P_real': p_real},
            'density': {'D': density},
            'boundary': boundary,
            'emergence': emergence,
            'sentiment': sentiment,
            'macro': macro,
            'nasa': nasa,
        }

        self.last_state = payload
        self.history.append({'timestamp': state['timestamp'], 'friction': friction, 'density': density})
        self.history = self.history[-500:]
        return payload

    def get_or_refresh(self):
        if self.last_state is None:
            return self.refresh()
        return self.last_state
