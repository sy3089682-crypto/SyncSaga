import re
import hashlib
from typing import Any
import numpy as np


class SubtitleService:
    EMBEDDING_DIM = 384

    def __init__(self):
        self.ready = False
        self.model = None
        self.embeddings: dict[str, np.ndarray] = {}
        self.subtitle_db: dict[str, list[dict]] = {}

    async def initialize(self):
        self.ready = True

    def _simple_embedding(self, text: str) -> np.ndarray:
        text = text.lower().strip()
        if not text:
            return np.zeros(self.EMBEDDING_DIM)

        words = re.findall(r'\w+', text)
        word_vec = np.zeros(self.EMBEDDING_DIM)

        for i, word in enumerate(words):
            h = hashlib.md5(word.encode()).digest()
            val = struct.unpack(">Q", h[:8])[0]
            for j in range(self.EMBEDDING_DIM):
                word_vec[j] += (val >> (j % 64)) & 1
            word_vec += self._char_ngram_vector(word)

        if len(words) > 0:
            word_vec = word_vec / len(words)
        norm = np.linalg.norm(word_vec)
        if norm > 0:
            word_vec = word_vec / norm
        return word_vec

    def _char_ngram_vector(self, word: str) -> np.ndarray:
        vec = np.zeros(self.EMBEDDING_DIM)
        for ng_len in range(2, 5):
            for i in range(len(word) - ng_len + 1):
                ng = word[i:i + ng_len]
                h = hashlib.md5(ng.encode()).digest()
                val = struct.unpack(">I", h[:4])[0]
                idx = val % self.EMBEDDING_DIM
                vec[idx] += 1.0
        return vec

    def _parse_srt(self, srt_content: str) -> list[dict]:
        segments = []
        pattern = re.compile(
            r'(\d+)\n(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})\n((?:.+\n?)*)',
            re.MULTILINE
        )

        def _ts_to_sec(ts: str) -> float:
            ts = ts.replace(',', '.')
            parts = ts.split(':')
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])

        for match in pattern.finditer(srt_content):
            start = _ts_to_sec(match.group(2))
            end = _ts_to_sec(match.group(3))
            text = match.group(4).strip().replace('\n', ' ')
            segments.append({
                "start": start,
                "end": end,
                "text": text,
            })
        return segments

    def _align_subtitles(self, subtitles: list[dict], transcript_segments: list[dict]) -> list[dict]:
        if not subtitles or not transcript_segments:
            return subtitles

        aligned = []
        for sub in subtitles:
            sub_embed = self._simple_embedding(sub["text"])
            best_match = None
            best_sim = -1.0

            for seg in transcript_segments:
                seg_embed = self._simple_embedding(seg.get("text", ""))
                sim = float(np.dot(sub_embed, seg_embed))
                if sim > best_sim:
                    best_sim = sim
                    best_match = seg

            aligned.append({
                **sub,
                "aligned_start": best_match.get("start", sub["start"]) if best_match else sub["start"],
                "aligned_end": best_match.get("end", sub["end"]) if best_match else sub["end"],
                "alignment_confidence": round(max(0.0, (best_sim + 1) / 2), 4) if best_match else 0.0,
            })
        return aligned

    async def transcribe(self, audio_path: str) -> list[dict]:
        try:
            import whisper
            model = whisper.load_model("base")
            result = model.transcribe(audio_path)
            segments = []
            for seg in result["segments"]:
                segments.append({
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"].strip(),
                    "confidence": seg.get("confidence", 1.0),
                })
            return segments
        except ImportError:
            return [{"start": 0.0, "end": 0.0, "text": "", "confidence": 1.0}]

    async def embed(self, text: str) -> dict[str, Any]:
        if not self.ready or not text:
            return {
                "matched": False, "episode_id": None, "timestamp": 0.0,
                "confidence": 0.0, "method": "subtitle",
            }

        query_vec = self._simple_embedding(text)
        best_sim = -1.0
        best_id = None
        best_ts = 0.0

        for eid, vec in self.embeddings.items():
            sim = float(np.dot(query_vec, vec))
            if sim > best_sim:
                best_sim = sim
                best_id = eid
                if eid.startswith("ep@"):
                    best_ts = float(eid.split("@")[1]) / 1000.0

        confidence = max(0.0, min(1.0, (best_sim + 1) / 2))

        return {
            "matched": confidence > 0.7,
            "episode_id": best_id.split("@")[0] if best_id and "@" in best_id else best_id,
            "timestamp": best_ts,
            "confidence": round(confidence, 4),
            "method": "subtitle",
            "text_length": len(text),
            "similarity": round(best_sim, 4),
        }

    async def match_quote(self, quote: str) -> dict:
        return await self.embed(quote)

    async def index_episode(self, episode_id: str, subtitles: list[dict]):
        for sub in subtitles:
            text = sub.get("text", "")
            if not text:
                continue
            vec = self._simple_embedding(text)
            key = f"{episode_id}@{int(sub.get('start', 0) * 1000)}"
            self.embeddings[key] = vec

    async def index_from_srt(self, episode_id: str, srt_content: str):
        subtitles = self._parse_srt(srt_content)
        await self.index_episode(episode_id, subtitles)

import struct
