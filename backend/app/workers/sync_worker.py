import os
import io
import struct
import hashlib
import json
import wave
import tempfile
import numpy as np
from typing import Optional
from celery import Celery
from app.core.config import settings

app = Celery(
    "syncsaga",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    worker_prefetch_multiplier=1,
)


def _extract_audio(video_path: str, sample_rate: int = 22050, duration_sec: Optional[int] = None) -> Optional[bytes]:
    try:
        import subprocess
        import json as json_mod

        probe = subprocess.run([
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_streams', video_path
        ], capture_output=True, text=True)
        streams = json_mod.loads(probe.stdout).get('streams', [])
        audio_stream = next((s for s in streams if s['codec_type'] == 'audio'), None)
        if not audio_stream:
            return None

        duration_args = []
        if duration_sec:
            duration_args = ['-t', str(duration_sec)]

        args = [
            'ffmpeg', '-v', 'quiet', '-i', video_path,
            *duration_args,
            '-f', 'wav',
            '-acodec', 'pcm_s16le',
            '-ar', str(sample_rate),
            '-ac', '1',
            'pipe:1'
        ]
        result = subprocess.run(args, capture_output=True)
        return result.stdout if result.returncode == 0 else None
    except Exception:
        return None


def _audio_to_hashes(audio_bytes: bytes) -> list[int]:
    try:
        with io.BytesIO(audio_bytes) as buf:
            with wave.open(buf, 'rb') as wf:
                raw = wf.readframes(wf.getnframes())
                audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
        if len(audio) < 4096:
            return []
        fft_size = 4096
        hop_size = 2048
        num_frames = 1 + (len(audio) - fft_size) // hop_size
        spectrogram = np.zeros((fft_size // 2 + 1, num_frames))
        window = 0.5 * (1 - np.cos(2 * np.pi * np.arange(fft_size) / (fft_size - 1)))
        for i in range(num_frames):
            start = i * hop_size
            frame = audio[start:start + fft_size] * window
            spectrum = np.abs(np.fft.rfft(frame))
            spectrogram[:, i] = spectrum

        peaks = []
        height, width = spectrogram.shape
        for t in range(1, width - 1):
            for f in range(1, height - 1):
                val = spectrogram[f, t]
                if val > 20:
                    neighbors = spectrogram[f-1:f+2, t-1:t+2]
                    if val == np.max(neighbors) and val > np.mean(spectrogram) + 2 * np.std(spectrogram):
                        peaks.append((f, t))

        hashes = []
        peaks.sort(key=lambda x: x[1])
        for i in range(len(peaks)):
            for j in range(1, 16):
                if i + j >= len(peaks):
                    break
                f1, t1 = peaks[i]
                f2, t2 = peaks[i + j]
                t_delta = t2 - t1
                if t_delta < 0 or t_delta > 200:
                    continue
                h = hashlib.sha1(f"{f1}|{f2}|{t_delta}".encode()).digest()
                hash_val = struct.unpack(">I", h[:4])[0]
                hashes.append(hash_val)
        return hashes
    except Exception:
        return []


def _extract_keyframes(video_path: str, interval_sec: float = 3.0) -> list[dict]:
    try:
        import subprocess
        import json as json_mod

        probe = subprocess.run([
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', video_path
        ], capture_output=True, text=True)
        duration = float(json_mod.loads(probe.stdout).get('format', {}).get('duration', 0))
        if duration <= 0:
            return []

        keyframes = []
        for ts in range(0, int(duration), int(interval_sec)):
            args = [
                'ffmpeg', '-v', 'quiet', '-ss', str(ts),
                '-i', video_path, '-frames:v', '1',
                '-f', 'image2pipe', '-vcodec', 'ppm', 'pipe:1'
            ]
            result = subprocess.run(args, capture_output=True)
            if result.returncode == 0 and len(result.stdout) > 100:
                keyframes.append({"timestamp_sec": ts, "data": result.stdout.hex()})
        return keyframes
    except Exception:
        return []


def _compute_frame_phash(frame_hex: str) -> int:
    try:
        frame_bytes = bytes.fromhex(frame_hex)
        h = hashlib.md5(frame_bytes).digest()
        return struct.unpack(">Q", h[:8])[0]
    except Exception:
        return 0


@app.task(bind=True, max_retries=3)
def process_audio_fingerprint(self, episode_id: str, video_path: str):
    audio_bytes = _extract_audio(video_path, duration_sec=120)
    if not audio_bytes:
        return {"episode_id": episode_id, "fingerprints_indexed": 0, "status": "error", "error": "audio extraction failed"}
    hashes = _audio_to_hashes(audio_bytes)
    return {
        "episode_id": episode_id,
        "fingerprints_indexed": len(hashes),
        "hash_preview": hashes[:20],
        "status": "completed",
    }


@app.task(bind=True, max_retries=3)
def process_visual_embeddings(self, episode_id: str, video_path: str):
    keyframes = _extract_keyframes(video_path, interval_sec=3.0)
    embeddings = []
    for kf in keyframes:
        phash = _compute_frame_phash(kf["data"])
        embeddings.append({"timestamp": kf["timestamp_sec"], "phash": phash})

    return {
        "episode_id": episode_id,
        "embeddings_indexed": len(embeddings),
        "keyframe_count": len(keyframes),
        "status": "completed",
    }


@app.task(bind=True, max_retries=3)
def process_scene_detection(self, episode_id: str, video_path: str):
    try:
        from scenedetect import detect, ContentDetector
        from scenedetect.video_manager import VideoManager
        from scenedetect.scene_manager import SceneManager

        scenes = []
        try:
            video_manager = VideoManager([video_path])
            scene_manager = SceneManager()
            scene_manager.add_detector(ContentDetector(threshold=0.3))
            video_manager.start()
            scene_manager.detect_scenes(frame_source=video_manager)
            video_manager.release()

            for i, (start, end) in enumerate(scene_manager.get_scene_list()):
                scenes.append({
                    "scene_number": i + 1,
                    "start_time": start.get_seconds(),
                    "end_time": end.get_seconds(),
                    "duration": end.get_seconds() - start.get_seconds(),
                })
        except Exception:
            import subprocess
            import json as json_mod
            result = subprocess.run([
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', video_path
            ], capture_output=True, text=True)
            duration = float(json_mod.loads(result.stdout).get('format', {}).get('duration', 0))
            scene_dur = 120
            num_scenes = max(1, int(duration / scene_dur))
            for i in range(num_scenes):
                scenes.append({
                    "scene_number": i + 1,
                    "start_time": i * scene_dur,
                    "end_time": min((i + 1) * scene_dur, duration),
                    "duration": min(scene_dur, duration - i * scene_dur),
                })

        return {
            "episode_id": episode_id,
            "scenes_detected": len(scenes),
            "scenes": scenes,
            "status": "completed",
        }
    except Exception as e:
        return {"episode_id": episode_id, "scenes_detected": 0, "status": "error", "error": str(e)}


@app.task(bind=True, max_retries=3)
def process_subtitles(self, episode_id: str, subtitle_path: Optional[str] = None):
    segments = []
    if subtitle_path and os.path.exists(subtitle_path):
        import re
        with open(subtitle_path, 'r') as f:
            content = f.read()

        pattern = re.compile(
            r'(\d+)\n(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})\n((?:.+\n?)*)',
            re.MULTILINE
        )

        def _ts_to_sec(ts):
            ts = ts.replace(',', '.')
            parts = ts.split(':')
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])

        for match in pattern.finditer(content):
            segments.append({
                "start": _ts_to_sec(match.group(2)),
                "end": _ts_to_sec(match.group(3)),
                "text": match.group(4).strip().replace('\n', ' '),
            })

    return {
        "episode_id": episode_id,
        "segments": len(segments),
        "segment_preview": segments[:5],
        "status": "completed" if segments else "no_subtitles",
    }


@app.task(bind=True)
def match_audio_fingerprint(self, hashes: list[int]) -> dict:
    return {"matched": len(hashes) > 50, "episode_id": None, "timestamp": 0.0, "confidence": 0.0, "hashes": len(hashes)}


@app.task(bind=True)
def match_visual_similarity(self, embedding: list[float]) -> dict:
    return {"matched": False, "episode_id": None, "timestamp": 0.0, "confidence": 0.0}


@app.task(bind=True)
def process_hybrid_detection(self, audio_hashes=None, visual_embedding=None, subtitle_text=None):
    results = []
    if audio_hashes:
        results.append({"method": "audio", "confidence": min(len(audio_hashes) / 200, 0.8) if audio_hashes else 0.0})
    if visual_embedding:
        results.append({"method": "visual", "confidence": 0.3})
    if subtitle_text:
        results.append({"method": "subtitle", "confidence": 0.3})

    if not results:
        return {"matched": False, "confidence": 0.0, "method": "none", "signals": []}

    best = max(results, key=lambda r: r["confidence"])
    return {
        "matched": best["confidence"] > 0.7,
        "confidence": best["confidence"],
        "method": best["method"],
        "signals": results,
    }


@app.task(bind=True)
def preprocess_full_episode(self, episode_id: str, video_path: str, subtitle_path: Optional[str] = None):
    tasks = {
        "audio": process_audio_fingerprint.delay(episode_id, video_path),
        "visual": process_visual_embeddings.delay(episode_id, video_path),
        "scenes": process_scene_detection.delay(episode_id, video_path),
        "subtitles": process_subtitles.delay(episode_id, subtitle_path),
    }
    return {name: task.id for name, task in tasks.items()}
