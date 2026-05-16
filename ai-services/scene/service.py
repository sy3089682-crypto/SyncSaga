import hashlib
import struct
from typing import Any
import numpy as np


class SceneService:
    OP_ED_MIN_DURATION = 60
    OP_ED_MAX_DURATION = 150
    REPEAT_WINDOW_SEC = 30

    def __init__(self):
        self.ready = False
        self.scene_db: dict[str, dict[str, Any]] = {}
        self.op_ed_fingerprints: dict[str, list[np.ndarray]] = {}

    async def initialize(self):
        self.ready = True

    async def detect(self, video_path: str, threshold: float = 0.3) -> list[dict[str, Any]]:
        scenes = []
        try:
            from scenedetect import detect, ContentDetector, SceneManager
            from scenedetect.video_manager import VideoManager

            video_manager = VideoManager([video_path])
            scene_manager = SceneManager()
            scene_manager.add_detector(ContentDetector(threshold=threshold))
            video_manager.set_downscale_factor(1)

            start_time = video_manager.get_base_timecode()
            video_manager.start()
            scene_manager.detect_scenes(frame_source=video_manager)
            video_manager.release()

            scene_list = scene_manager.get_scene_list()
            for i, (start, end) in enumerate(scene_list):
                scenes.append({
                    "scene_number": i + 1,
                    "start_time": start.get_seconds(),
                    "end_time": end.get_seconds(),
                    "duration": end.get_seconds() - start.get_seconds(),
                })
        except ImportError:
            scenes = self._detect_fallback(video_path)

        scenes = self._detect_op_ed(scenes)
        return scenes

    def _detect_fallback(self, video_path: str) -> list[dict[str, Any]]:
        try:
            import subprocess
            import json

            result = subprocess.run([
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', video_path
            ], capture_output=True, text=True)
            data = json.loads(result.stdout)
            duration = float(data.get('format', {}).get('duration', 0))

            if duration <= 0:
                return []

            segments = []
            scene_dur = 120
            num_scenes = max(1, int(duration / scene_dur))
            for i in range(num_scenes):
                segments.append({
                    "scene_number": i + 1,
                    "start_time": i * scene_dur,
                    "end_time": min((i + 1) * scene_dur, duration),
                    "duration": min(scene_dur, duration - i * scene_dur),
                })
            return segments
        except Exception:
            return []

    async def detect_from_frames(self, frames: list[bytes]) -> list[dict]:
        if len(frames) < 2:
            return []

        scenes = []
        prev_hist = None
        scene_num = 1
        start_idx = 0

        for i, frame_bytes in enumerate(frames):
            hist = self._frame_histogram(frame_bytes)
            if prev_hist is not None:
                diff = np.sum(np.abs(hist - prev_hist))
                if diff > 0.5:
                    scenes.append({
                        "scene_number": scene_num,
                        "start_frame": start_idx,
                        "end_frame": i,
                        "transition_score": float(diff),
                    })
                    scene_num += 1
                    start_idx = i
            prev_hist = hist

        scenes.append({
            "scene_number": scene_num,
            "start_frame": start_idx,
            "end_frame": len(frames) - 1,
        })
        return scenes

    def _frame_histogram(self, frame_bytes: bytes) -> np.ndarray:
        h = hashlib.md5(frame_bytes).digest()
        vals = struct.unpack(">4Q", h + b'\x00' * 24)
        return np.array([v % 256 for v in vals]) / 255.0

    def _detect_op_ed(self, scenes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not scenes:
            return scenes

        total_duration = scenes[-1]["end_time"]

        for scene in scenes:
            scene["is_opening"] = False
            scene["is_ending"] = False
            scene["op_ed_confidence"] = 0.0

        end_window_start = total_duration - self.OP_ED_MAX_DURATION
        end_window_end = total_duration - self.OP_ED_MIN_DURATION

        for scene in scenes:
            if scene["start_time"] < self.OP_ED_MAX_DURATION and scene["end_time"] > self.OP_ED_MIN_DURATION:
                continue
            if scene["start_time"] <= self.OP_ED_MAX_DURATION:
                if scene["duration"] >= self.OP_ED_MIN_DURATION:
                    scene["is_opening"] = True
                    scene["op_ed_confidence"] = 0.85

        for scene in scenes:
            if scene["start_time"] >= end_window_start and scene["end_time"] <= end_window_end:
                if scene["duration"] >= self.OP_ED_MIN_DURATION:
                    scene["is_ending"] = True
                    scene["op_ed_confidence"] = 0.85

        return scenes

    async def detect_op_ed_spectrogram(self, audio_path: str) -> dict[str, Any]:
        try:
            import io
            import wave

            with wave.open(audio_path, 'rb') as wf:
                raw = wf.readframes(wf.getnframes())
                audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32)

            sr = 22050
            fft_size = 4096
            hop_size = 2048
            num_frames = 1 + (len(audio) - fft_size) // hop_size

            if num_frames < 10:
                return {"opening_detected": False, "ending_detected": False}

            spectrogram = np.zeros((fft_size // 2 + 1, num_frames))
            for i in range(num_frames):
                start = i * hop_size
                frame = audio[start:start + fft_size]
                window = 0.5 * (1 - np.cos(2 * np.pi * np.arange(fft_size) / (fft_size - 1)))
                spectrum = np.abs(np.fft.rfft(frame * window))
                spectrogram[:, i] = spectrum

            frame_duration = hop_size / sr
            total_sec = num_frames * frame_duration

            first_90_sec = min(int(90 / frame_duration), num_frames)
            last_90_sec_start = max(0, num_frames - int(90 / frame_duration))

            if first_90_sec > 0:
                first_90 = spectrogram[:, :first_90_sec]
            else:
                first_90 = spectrogram

            if last_90_sec_start < num_frames:
                last_90 = spectrogram[:, last_90_sec_start:]
            else:
                last_90 = spectrogram

            first_energy = np.sum(first_90 ** 2) / first_90.size if first_90.size > 0 else 0
            last_energy = np.sum(last_90 ** 2) / last_90.size if last_90.size > 0 else 0
            middle_start = first_90_sec
            middle_end = last_90_sec_start if last_90_sec_start > middle_start else num_frames
            if middle_end > middle_start:
                middle = spectrogram[:, middle_start:middle_end]
                middle_energy = np.sum(middle ** 2) / middle.size
            else:
                middle_energy = 0

            opening_conf = 0.0
            if middle_energy > 0 and first_90_sec > 0:
                opening_ratio = first_energy / middle_energy
                if opening_ratio > 1.5:
                    opening_conf = min(0.95, 0.5 + (opening_ratio - 1.5) * 0.1)

            ending_conf = 0.0
            if middle_energy > 0 and last_90.size > 0:
                ending_ratio = last_energy / middle_energy
                if ending_ratio > 1.5:
                    ending_conf = min(0.95, 0.5 + (ending_ratio - 1.5) * 0.1)

            return {
                "opening_detected": opening_conf > 0.6,
                "ending_detected": ending_conf > 0.6,
                "opening_confidence": round(opening_conf, 4),
                "ending_confidence": round(ending_conf, 4),
                "opening_duration_sec": min(first_90_sec * frame_duration, 90),
                "total_duration_sec": round(total_sec, 2),
            }
        except Exception:
            return {"opening_detected": False, "ending_detected": False}

    async def get_scene_fingerprint(self, scene_id: str) -> dict:
        return self.scene_db.get(scene_id, {})

    async def compute_scene_fingerprint(self, audio_chunk: bytes, frame_chunk: bytes) -> dict[str, Any]:
        audio_hash = hashlib.sha256(audio_chunk).hexdigest()[:16]
        frame_hash = hashlib.md5(frame_chunk).hexdigest()[:16]
        combined = f"scene_{audio_hash}_{frame_hash}"

        return {
            "fingerprint_id": hashlib.sha256(combined.encode()).hexdigest(),
            "audio_hash": audio_hash,
            "visual_hash": frame_hash,
            "combined_hash": combined,
        }
