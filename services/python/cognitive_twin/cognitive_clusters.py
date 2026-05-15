# cognitive_clusters.py
import numpy as np
from sklearn.cluster import KMeans

class CognitiveCluster:
    @staticmethod
    def cluster(vectors: list, n_clusters=5) -> list:
        if len(vectors) < n_clusters:
            return [0] * len(vectors)
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        labels = kmeans.fit_predict(np.array(vectors))
        return labels.tolist()
