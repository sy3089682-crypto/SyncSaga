import asyncio
import time
import math
from statistics import median, mean
from collections import deque
from typing import Optional
from app.core.config import settings
from app.core.redis import redis_sync
from app.models.schemas import SyncEvent, SyncState, DetectionResult


class PlaybackPredictionEngine:
    def __init__(self, window_size: int = 30):
        self._timestamps: dict[str, deque] = {}
        self._positions: dict[str, deque] = {}
        self._speeds: dict[str, deque] = {}
        self._network_samples: dict[str, deque] = {}
        self._buffering_history: dict[str, deque] = {}
        self._window_size = window_size

    def record_state(self, room_id: str, timestamp: float, position: float, speed: float):
        now = time.time()
        if room_id not in self._timestamps:
            self._timestamps[room_id] = deque(maxlen=self._window_size)
            self._positions[room_id] = deque(maxlen=self._window_size)
            self._speeds[room_id] = deque(maxlen=self._window_size)

        self._timestamps[room_id].append(now)
        self._positions[room_id].append(position)
        self._speeds[room_id].append(speed)

    def record_network_latency(self, room_id: str, latency_ms: float):
        if room_id not in self._network_samples:
            self._network_samples[room_id] = deque(maxlen=20)
        self._network_samples[room_id].append(latency_ms)

    def record_buffering(self, room_id: str, duration_sec: float):
        if room_id not in self._buffering_history:
            self._buffering_history[room_id] = deque(maxlen=10)
        self._buffering_history[room_id].append(duration_sec)

    def predict_position(self, room_id: str) -> Optional[dict]:
        if room_id not in self._timestamps or len(self._timestamps[room_id]) < 2:
            return None

        last_ts = self._timestamps[room_id][-1]
        last_pos = self._positions[room_id][-1]
        avg_speed = mean(self._speeds[room_id]) if self._speeds[room_id] else 1.0
        elapsed = time.time() - last_ts
        predicted_pos = last_pos + (elapsed * avg_speed)

        avg_latency = mean(self._network_samples[room_id]) if self._network_samples.get(room_id) else 0
        latency_seconds = avg_latency / 1000.0

        speed_var = self._speed_variance(room_id)
        confidence = max(0.0, min(1.0, 1.0 - (elapsed / 30.0) - (speed_var * 2.0) - (latency_seconds * 0.1)))
        net_delay = elapsed * avg_speed

        avg_buf = mean(self._buffering_history.get(room_id, deque([0])))
        if avg_buf > 2:
            confidence *= 0.8

        return {
            "predicted_timestamp": round(predicted_pos, 3),
            "confidence": round(confidence, 4),
            "latency_ms": round(avg_latency, 1),
            "net_drift": round(net_delay, 3),
            "method": "playback_prediction",
        }

    def _speed_variance(self, room_id: str) -> float:
        if room_id not in self._speeds or len(self._speeds[room_id]) < 2:
            return 0.0
        return float(np.var(list(self._speeds[room_id])))

    def reset(self, room_id: str):
        self._timestamps.pop(room_id, None)
        self._positions.pop(room_id, None)
        self._speeds.pop(room_id, None)
        self._network_samples.pop(room_id, None)
        self._buffering_history.pop(room_id, None)


class SyncHealthScore:
    def __init__(self):
        self._history: dict[str, deque] = {}
        self._last_update: dict[str, float] = {}

    def compute(self, room_id: str, confidence: float, latency_ms: float, drift_sec: float) -> dict:
        now = time.time()
        if room_id not in self._history:
            self._history[room_id] = deque(maxlen=60)
        if room_id not in self._last_update:
            self._last_update[room_id] = now

        sample = {
            "time": now,
            "confidence": confidence,
            "latency_ms": latency_ms,
            "drift_sec": abs(drift_sec),
        }
        self._history[room_id].append(sample)

        recent = list(self._history[room_id])
        avg_conf = mean(s["confidence"] for s in recent) if recent else 1.0
        avg_lat = mean(s["latency_ms"] for s in recent) if recent else 0.0
        avg_drift = mean(s["drift_sec"] for s in recent) if recent else 0.0

        conf_score = avg_conf
        latency_score = max(0.0, 1.0 - (avg_lat / 500.0))
        drift_score = max(0.0, 1.0 - (avg_drift / 10.0))
        total_score = (conf_score * 0.5) + (latency_score * 0.25) + (drift_score * 0.25)

        if total_score > 0.85:
            status = "synced"
            icon = "🟢"
        elif total_score > 0.5:
            status = "recovering"
            icon = "🟡"
        else:
            status = "desynced"
            icon = "🔴"

        return {
            "health_score": round(total_score, 4),
            "status": status,
            "icon": icon,
            "average_confidence": round(avg_conf, 4),
            "average_latency_ms": round(avg_lat, 1),
            "average_drift_sec": round(avg_drift, 3),
            "sample_count": len(recent),
        }

    def get_status_icon(self, room_id: str) -> str:
        recent = list(self._history.get(room_id, deque()))
        if not recent:
            return "🟢"
        avg_conf = mean(s["confidence"] for s in recent)
        avg_drift = mean(s["drift_sec"] for s in recent)
        if avg_conf > 0.85 and avg_drift < 1.5:
            return "🟢"
        elif avg_conf > 0.5:
            return "🟡"
        return "🔴"


class SyncEngine:
    def __init__(self):
        self._rooms: dict[str, dict] = {}
        self._latency_samples: dict[str, list[float]] = {}
        self.predictor = PlaybackPredictionEngine()
        self.health = SyncHealthScore()

        self.HYBRID_WEIGHTS = {
            "direct": 0.5,
            "audio": 0.4,
            "visual": 0.3,
            "subtitle": 0.2,
            "playback_prediction": 0.1,
        }
        self.RESYNC_INTERVAL_SEC = 4.0

    async def process_sync_event(self, event: SyncEvent) -> SyncState:
        room_id = str(event.room_id)
        state = await redis_sync.get_room_state(room_id) or {}
        now = int(time.time() * 1000)

        enriched = {
            "timestamp": event.timestamp,
            "playback_state": "playing" if event.event_type == "play"
                           else "paused" if event.event_type == "pause"
                           else state.get("playback_state", "paused"),
            "speed": event.playback_speed or state.get("speed", 1.0),
            "last_update": now,
            "event_type": event.event_type,
            "detection_method": event.detection_method or "direct",
            "confidence": event.confidence or 1.0,
        }

        if event.event_type == "seek":
            enriched["timestamp"] = event.timestamp
        if event.event_type == "episode":
            enriched["episode"] = event.episode

        if event.event_type == "timestamp" and event.detection_method != "direct":
            confidence = event.confidence or 0.5
            enriched["confidence"] = confidence
            enriched["timestamp"] = event.timestamp

        await redis_sync.set_room_state(room_id, enriched)

        self.predictor.record_state(
            room_id,
            event.timestamp,
            event.timestamp,
            event.playback_speed or 1.0,
        )

        health = self.health.compute(
            room_id,
            enriched["confidence"],
            self._get_avg_latency(room_id),
            0.0,
        )

        return SyncState(
            room_id=event.room_id,
            timestamp=enriched["timestamp"],
            playback_state=enriched["playback_state"],
            speed=enriched["speed"],
            episode=enriched.get("episode"),
            confidence=enriched["confidence"],
            latency_ms=self._get_avg_latency(room_id),
            drift_seconds=0.0,
            health_status=health["status"],
            health_icon=health["icon"],
        )

    def compute_drift_correction(
        self, host_state: SyncState, peer_state: SyncState
    ) -> dict:
        drift = peer_state.timestamp - host_state.timestamp
        latency = host_state.latency_ms / 1000.0
        effective_drift = drift - latency
        abs_drift = abs(effective_drift)
        predictor_result = self.predictor.predict_position(str(host_state.room_id))

        if abs_drift < settings.DRIFT_SOFT_CORRECTION_SEC:
            return {
                "action": "none",
                "drift": effective_drift,
                "message": "In sync",
                "prediction": predictor_result,
            }

        if abs_drift < settings.DRIFT_HARD_CORRECTION_SEC:
            return {
                "action": "soft_correct",
                "drift": effective_drift,
                "playback_rate": settings.SOFT_CORRECTION_SPEED
                if effective_drift < 0
                else 1.0 / settings.SOFT_CORRECTION_SPEED,
                "message": f"Catching up ({abs_drift:.1f}s drift)",
                "prediction": predictor_result,
            }

        return {
            "action": "hard_correct",
            "drift": effective_drift,
            "target_timestamp": host_state.timestamp,
            "message": f"Syncing ({abs_drift:.1f}s drift)",
            "prediction": predictor_result,
        }

    def record_latency(self, room_id: str, latency_ms: float):
        if room_id not in self._latency_samples:
            self._latency_samples[room_id] = []
        samples = self._latency_samples[room_id]
        samples.append(latency_ms)
        if len(samples) > settings.LATENCY_SAMPLE_WINDOW:
            samples.pop(0)
        self.predictor.record_network_latency(room_id, latency_ms)

    def _get_avg_latency(self, room_id: str) -> float:
        samples = self._latency_samples.get(room_id, [])
        return median(samples) if samples else 0.0

    def combine_detections(self, results: list[DetectionResult]) -> DetectionResult:
        if not results:
            return DetectionResult(confidence=0.0, method="none")

        weighted_best = max(
            results,
            key=lambda r: r.confidence * self.HYBRID_WEIGHTS.get(r.method, 0.2)
        )
        return weighted_best

    def combine_detections_weighted(self, results: list[DetectionResult]) -> dict:
        if not results:
            return {"matched": False, "confidence": 0.0, "method": "none"}

        total_weight = sum(self.HYBRID_WEIGHTS.get(r.method, 0) for r in results)
        if total_weight == 0:
            return {"matched": False, "confidence": 0.0, "method": "none"}

        weighted_conf = sum(
            r.confidence * self.HYBRID_WEIGHTS.get(r.method, 0) for r in results
        ) / total_weight

        best = max(results, key=lambda r: r.confidence * self.HYBRID_WEIGHTS.get(r.method, 0))

        return {
            "matched": weighted_conf > settings.SYNC_CONFIDENCE_THRESHOLD,
            "episode_id": best.episode_id,
            "timestamp": best.timestamp,
            "confidence": round(weighted_conf, 4),
            "method": best.method,
            "signals": [r.dict() for r in results],
        }

    def get_sync_health(self, room_id: str) -> dict:
        state = self._rooms.get(room_id, {})
        confidence = state.get("confidence", 1.0)
        latency = self._get_avg_latency(room_id)
        prediction = self.predictor.predict_position(room_id)
        health = self.health.compute(room_id, confidence, latency, 0.0)

        return {
            **health,
            "prediction": prediction,
            "confidence": confidence,
            "latency_ms": latency,
        }


sync_engine = SyncEngine()

import numpy as np
