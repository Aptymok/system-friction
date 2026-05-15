# normalize.py
import unicodedata
import re

class Normalizer:
    @staticmethod
    def normalize(text: str) -> str:
        text = ''.join(ch for ch in text if ch.isprintable() or ch in '\n\r\t')
        text = unicodedata.normalize('NFC', text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        return text.strip()

    def process(self, doc: dict) -> dict:
        doc['normalized_text'] = self.normalize(doc['raw_text'])
        return doc
