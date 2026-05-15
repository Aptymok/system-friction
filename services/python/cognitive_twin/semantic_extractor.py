# semantic_extractor.py
from keybert import KeyBERT
kw_model = KeyBERT()

class SemanticExtractor:
    @staticmethod
    def extract(text: str, top_n=10) -> list:
        keywords = kw_model.extract_keywords(text, keyphrase_ngram_range=(1,2), stop_words='spanish', top_n=top_n)
        return [{'keyword': kw, 'score': score} for kw, score in keywords]
