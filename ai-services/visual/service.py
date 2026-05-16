"""
Visual Matching Service
Uses: OpenCLIP, FAISS, Qdrant

Pipeline:
    Keyframe → CLIP embedding → vector search → scene match
"""

from typing import Any


class VisualService:
    def __init__(self):
        self.ready = False
        self.model = None

    async def initialize(self):
        """Load OpenCLIP model."""
        self.ready = True

    async def extract_embedding(self, image_bytes: bytes) -> list[float]:
        """Extract CLIP embedding from a video frame."""
        return []

    async def match(self, embedding: list[float], top_k: int = 5) -> dict[str, Any]:
        """Search Qdrant for similar visual embeddings."""
        if not self.ready or not embedding:
            return {
                "matched": False,
                "episode_id": None,
                "timestamp": 0.0,
                "confidence": 0.0,
                "method": "visual",
            }

        return {
            "matched": False,
            "episode_id": None,
            "timestamp": 0.0,
            "confidence": 0.0,
            "method": "visual",
        }

    async def extract_keyframes(self, video_path: str, interval_sec: float = 3.0) -> list[dict]:
        """Extract keyframes from video and compute embeddings."""
        return []
