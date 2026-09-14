import math
import re
import hashlib
from typing import List
import numpy as np

class EmbeddingService:
    def __init__(self, dim: int = 128):
        self.dim = dim

    def generate_embedding(self, text: str) -> List[float]:
        # Clean text
        clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
        tokens = clean.split()
        if not tokens:
            return [0.0] * self.dim

        vec = np.zeros(self.dim, dtype=np.float32)
        
        # Word frequency & subword n-gram semantic hashing
        for token in tokens:
            h = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
            idx = h % self.dim
            vec[idx] += 1.0
            
            # Bigram features for contextual grounding
            if len(token) > 3:
                for j in range(len(token) - 2):
                    sub = token[j:j+3]
                    h_sub = int(hashlib.md5(sub.encode('utf-8')).hexdigest(), 16)
                    sub_idx = h_sub % self.dim
                    vec[sub_idx] += 0.35

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

embedding_service = EmbeddingService()
