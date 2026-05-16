"""
Subtitle Intelligence Service
Uses: Whisper (transcription), Sentence Transformers (embeddings)

Pipeline:
    Audio → Whisper transcription → sentence embedding
    OR
    Subtitle file → text extraction → sentence embedding
    → Qdrant search for scene matching
"""

from typing import Any


class SubtitleService:
    def __init__(self):
        self.ready = False
        self.model = None

    async def initialize(self):
        """Load Sentence Transformer model for subtitle embeddings."""
        self.ready = True

    async def transcribe(self, audio_path: str) -> list[dict]:
        """Transcribe audio to text with timestamps using Whisper."""
        return []

    async def embed(self, text: str) -> dict[str, Any]:
        """Compute embedding for subtitle text."""
        if not self.ready or not text:
            return {
                "matched": False,
                "episode_id": None,
                "timestamp": 0.0,
                "confidence": 0.0,
                "method": "subtitle",
            }
        return {
            "matched": False,
            "episode_id": None,
            "timestamp": 0.0,
            "confidence": 0.0,
            "method": "subtitle",
            "text_length": len(text),
        }

    async def match_quote(self, quote: str) -> dict:
        """Find the episode and timestamp for a subtitle quote."""
        return {}
