# linguistic_cleaner.py
import re

class LinguisticCleaner:
    TYPOS = {
        r'\bquiázs\b': 'quizás',
        r'\bdesicion\b': 'decisión',
        r'\baunquea\b': 'aunque',
        r'\bporque\b': 'porque',
    }
    @staticmethod
    def correct(text: str) -> tuple:
        corrections = []
        cleaned = text
        for pattern, replacement in LinguisticCleaner.TYPOS.items():
            matches = re.findall(pattern, cleaned, re.IGNORECASE)
            for m in matches:
                corrections.append((m, replacement, 0.9))
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
        return cleaned, corrections
