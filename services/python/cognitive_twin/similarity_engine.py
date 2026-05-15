# similarity_engine.py
from sentence_transformers import SentenceTransformer, util
from config import EMBEDDING_MODEL

model = SentenceTransformer(EMBEDDING_MODEL)

class SimilarityEngine:
    @staticmethod
    def compare(real: str, simulated: str) -> float:
        if not real or not simulated:
            return 0.0
        emb1 = model.encode(real)
        emb2 = model.encode(simulated)
        return util.cos_sim(emb1, emb2).item()
