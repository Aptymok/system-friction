# symbolic_mapper.py
import re

class SymbolicMapper:
    METAPHOR_PATTERNS = {
        r'\b(guerra|batalla|pelea)\b': 'conflicto',
        r'\b(camino|ruta|viaje)\b': 'trayectoria',
        r'\b(carcel|prisión|jaula)\b': 'restricción',
        r'\b(esperanza|luz|salida)\b': 'liberación',
    }
    @staticmethod
    def map(text: str) -> dict:
        symbols = {}
        for pattern, symbol in SymbolicMapper.METAPHOR_PATTERNS.items():
            matches = re.findall(pattern, text.lower())
            if matches:
                symbols[symbol] = symbols.get(symbol, 0) + len(matches)
        word_counts = {}
        for word in re.findall(r'\b\w+\b', text.lower()):
            word_counts[word] = word_counts.get(word, 0) + 1
        obsessions = [w for w, c in word_counts.items() if c > 5]
        if obsessions:
            symbols['obsession'] = obsessions
        return symbols
