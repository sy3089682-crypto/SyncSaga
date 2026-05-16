import hashlib
import struct
from typing import Any
import numpy as np


class VisualService:
    EMBEDDING_DIM = 512

    def __init__(self):
        self.ready = False
        self.model = None
        self.vectors: dict[str, np.ndarray] = {}
        self.episode_map: dict[str, dict] = {}

    async def initialize(self):
        self.ready = True

    def _perceptual_hash(self, pixels: np.ndarray) -> int:
        gray = np.mean(pixels, axis=2) if pixels.ndim == 3 else pixels
        small = gray[::8, ::8]
        avg = np.mean(small)
        return sum((1 << i) for i, v in enumerate(small.flatten()) if v > avg)

    def _compute_histogram(self, pixels: np.ndarray) -> np.ndarray:
        bins = 256
        if pixels.ndim == 3:
            hist = np.zeros((bins * 3,))
            for c in range(3):
                h, _ = np.histogram(pixels[:, :, c], bins=bins, range=(0, 255))
                hist[c * bins:(c + 1) * bins] = h
        else:
            hist, _ = np.histogram(pixels, bins=bins, range=(0, 255))
        return hist / (np.linalg.norm(hist) + 1e-8)

    def _dct_embedding(self, pixels: np.ndarray) -> np.ndarray:
        gray = np.mean(pixels, axis=2) if pixels.ndim == 3 else pixels
        h, w = gray.shape
        block_size = 32
        rows, cols = h // block_size, w // block_size
        gray = gray[:rows * block_size, :cols * block_size]
        blocks = gray.reshape(rows, block_size, cols, block_size)
        blocks = blocks.transpose(0, 2, 1, 3).reshape(rows * cols, block_size, block_size)

        dct_blocks = np.zeros((rows * cols, 16))
        for i, block in enumerate(blocks):
            dct = np.fft.dctn(block, norm='ortho')
            dct_blocks[i] = dct[:4, :4].flatten()
        return dct_blocks.mean(axis=0)

    def _low_res_embedding(self, pixels: np.ndarray) -> np.ndarray:
        h, w = pixels.shape[:2]
        small_h, small_w = 32, 32
        if h < small_h or w < small_w:
            return np.zeros(small_h * small_w * 3)
        step_h, step_w = h // small_h, w // small_w
        small = pixels[::step_h, ::step_w]
        if small.ndim == 3:
            return small.flatten().astype(np.float32) / 255.0
        return np.tile(small.flatten(), 3).astype(np.float32) / 255.0

    def _combine_embedding(self, pixels: np.ndarray) -> np.ndarray:
        phash = self._perceptual_hash(pixels)
        hist = self._compute_histogram(pixels)
        dct = self._dct_embedding(pixels)
        lr = self._low_res_embedding(pixels)

        phash_vec = np.zeros((64,))
        for i in range(64):
            phash_vec[i] = (phash >> i) & 1

        combined = np.concatenate([phash_vec, hist, dct, lr[:32]])
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm
        return combined

    async def extract_embedding(self, image_bytes: bytes) -> list[float]:
        try:
            import io
            from PIL import Image
            img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            pixels = np.array(img)
            embedding = self._combine_embedding(pixels)
            return embedding.tolist()
        except ImportError:
            phash = hashlib.md5(image_bytes).digest()
            phash_val = struct.unpack(">Q", phash[:8])[0]
            vec = [(phash_val >> i) & 1 for i in range(64)]
            vec += [float(b) for b in image_bytes[:448]]
            norm = np.linalg.norm(vec)
            return [v / norm for v in vec] if norm > 0 else vec

    async def match(self, embedding: list[float], top_k: int = 5) -> dict[str, Any]:
        if not self.ready or not embedding or not self.vectors:
            return {
                "matched": False, "episode_id": None, "timestamp": 0.0,
                "confidence": 0.0, "method": "visual",
            }

        query = np.array(embedding)
        query_norm = np.linalg.norm(query)
        if query_norm > 0:
            query = query / query_norm

        best_sim = -1.0
        best_id = None
        best_ts = 0.0

        for eid, vec in self.vectors.items():
            v = np.array(vec)
            vn = np.linalg.norm(v)
            if vn > 0:
                v = v / vn
            sim = float(np.dot(query, v))
            if sim > best_sim:
                best_sim = sim
                best_id = eid

        confidence = max(0.0, min(1.0, (best_sim + 1) / 2))

        return {
            "matched": confidence > 0.7,
            "episode_id": best_id,
            "timestamp": best_ts,
            "confidence": round(confidence, 4),
            "method": "visual",
            "similarity": round(best_sim, 4),
        }

    async def extract_keyframes(self, video_path: str, interval_sec: float = 3.0) -> list[dict]:
        return []

    async def index_episode(self, episode_id: str, frames: list[tuple[float, bytes]]):
        for timestamp_sec, frame_bytes in frames:
            embedding = await self.extract_embedding(frame_bytes)
            key = f"{episode_id}@{int(timestamp_sec * 1000)}"
            self.vectors[key] = np.array(embedding)
