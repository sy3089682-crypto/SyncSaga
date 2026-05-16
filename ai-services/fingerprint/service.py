import struct
import hashlib
import io
import wave
import numpy as np
from typing import Any
from collections import defaultdict


class FingerprintService:
    SAMPLE_RATE = 22050
    FFT_SIZE = 4096
    HOP_SIZE = 2048
    MIN_HASH_TIME_DELTA = 0
    MAX_HASH_TIME_DELTA = 200
    FAN_VALUE = 15
    PEAK_THRESHOLD = 20

    def __init__(self):
        self.ready = False
        self.index: dict[int, list[tuple[str, int]]] = {}
        self.episode_map: dict[str, dict[str, Any]] = {}

    async def initialize(self):
        self.ready = True

    def _hanning_window(self, size: int) -> np.ndarray:
        n = np.arange(size)
        return 0.5 * (1 - np.cos(2 * np.pi * n / (size - 1)))

    def _spectrogram(self, audio: np.ndarray) -> np.ndarray:
        window = self._hanning_window(self.FFT_SIZE)
        num_frames = 1 + (len(audio) - self.FFT_SIZE) // self.HOP_SIZE
        spectrogram = np.zeros((self.FFT_SIZE // 2 + 1, num_frames))

        for i in range(num_frames):
            start = i * self.HOP_SIZE
            frame = audio[start:start + self.FFT_SIZE] * window
            spectrum = np.abs(np.fft.rfft(frame))
            spectrogram[:, i] = spectrum
        return spectrogram

    def _get_peaks(self, spectrogram: np.ndarray) -> list[tuple[int, int]]:
        peaks = []
        height, width = spectrogram.shape
        for t in range(1, width - 1):
            for f in range(1, height - 1):
                val = spectrogram[f, t]
                if val > self.PEAK_THRESHOLD:
                    neighbors = spectrogram[f-1:f+2, t-1:t+2]
                    if val == np.max(neighbors) and val > np.mean(spectrogram) + 2 * np.std(spectrogram):
                        peaks.append((f, t))
        return peaks

    def _generate_hashes(self, peaks: list[tuple[int, int]]) -> list[tuple[int, int]]:
        hashes = []
        peaks.sort(key=lambda x: x[1])
        for i in range(len(peaks)):
            for j in range(1, self.FAN_VALUE + 1):
                if i + j >= len(peaks):
                    break
                f1, t1 = peaks[i]
                f2, t2 = peaks[i + j]
                t_delta = t2 - t1
                if t_delta < self.MIN_HASH_TIME_DELTA or t_delta > self.MAX_HASH_TIME_DELTA:
                    continue
                h = hashlib.sha1(f"{f1}|{f2}|{t_delta}".encode()).digest()
                hash_val = struct.unpack(">I", h[:4])[0]
                hashes.append((hash_val, t1))
        return hashes

    async def extract(self, audio_bytes: bytes) -> list[int]:
        try:
            with io.BytesIO(audio_bytes) as buf:
                with wave.open(buf, 'rb') as wf:
                    raw = wf.readframes(wf.getnframes())
                    audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
            if len(audio) == 0:
                return []
            if len(audio) < self.FFT_SIZE:
                audio = np.pad(audio, (0, self.FFT_SIZE - len(audio)))
            spectrogram = self._spectrogram(audio)
            peaks = self._get_peaks(spectrogram)
            hashes = self._generate_hashes(peaks)
            return [h for h, _ in hashes]
        except Exception:
            return []

    async def match(self, hashes: list[int], count: int = 50) -> dict[str, Any]:
        if not self.ready or not hashes or not self.index:
            return {
                "matched": False,
                "episode_id": None,
                "timestamp": 0.0,
                "confidence": 0.0,
                "method": "audio",
                "hashes_processed": len(hashes),
            }

        candidate_counts: dict[str, int] = defaultdict(int)
        candidate_offsets: dict[str, list[int]] = defaultdict(list)

        for h in hashes:
            if h in self.index:
                for episode_id, offset_ms in self.index[h]:
                    candidate_counts[episode_id] += 1
                    candidate_offsets[episode_id].append(offset_ms)

        if not candidate_counts:
            return {
                "matched": False, "episode_id": None, "timestamp": 0.0,
                "confidence": 0.0, "method": "audio", "hashes_processed": len(hashes),
            }

        best_episode = max(candidate_counts, key=lambda e: candidate_counts[e])
        best_count = candidate_counts[best_episode]
        total_matches = sum(candidate_counts.values())
        confidence = min(best_count / max(total_matches, 1), 1.0)

        offsets = candidate_offsets[best_episode]
        offset_hist = defaultdict(int)
        for o in offsets:
            bucket = o // 1000 * 1000
            offset_hist[bucket] += 1
        best_offset = max(offset_hist, key=lambda o: offset_hist[o])
        timestamp_sec = best_offset / 1000.0

        return {
            "matched": confidence > 0.7,
            "episode_id": best_episode,
            "timestamp": timestamp_sec,
            "confidence": round(confidence, 4),
            "method": "audio",
            "hashes_processed": len(hashes),
            "matches_found": best_count,
        }

    async def index_episode(self, episode_id: str, hashes: list[int], offsets_ms: list[int]):
        for h, offset in zip(hashes, offsets_ms):
            if h not in self.index:
                self.index[h] = []
            self.index[h].append((episode_id, offset))

    async def index_from_path(self, episode_id: str, audio_path: str):
        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()
        hashes = await self.extract(audio_bytes)
        offsets = list(range(0, len(hashes) * 50, 50))[:len(hashes)]
        await self.index_episode(episode_id, hashes, offsets)
