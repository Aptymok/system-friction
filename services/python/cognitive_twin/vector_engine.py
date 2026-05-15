# vector_engine.py
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

model = SentenceTransformer(EMBEDDING_MODEL)

class VectorEngine:
    @staticmethod
    def embed(text: str) -> list:
        if not text.strip():
            return [0.0] * model.get_sentence_embedding_dimension()
        return model.encode(text).tolist()
