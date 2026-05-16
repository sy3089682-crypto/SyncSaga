"""Sync Engine — Hybrid Detection + Drift Correction"""

import asyncio
import time
from statistics import median
from app.core.config import settings
from app.core.redis import redis_sync
from app.models.schemas import SyncEvent, SyncState, DetectionResult


class SyncEngine:
    """
    The Sync Engine is the heart of SyncSaga.
    It combines: direct timestamp, audio fingerprint, visual matching,
    subtitle matching, and playback prediction into a single confidence-weighted sync.
    """

    def __init__(self):
        self._rooms: dict[str, dict] = {}
        self._latency_samples: dict[str, list[float]] = {}

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

        return SyncState(
            room_id=event.room_id,
            timestamp=enriched["timestamp"],
            playback_state=enriched["playback_state"],
            speed=enriched["speed"],
            episode=enriched.get("episode"),
            confidence=enriched["confidence"],
            latency_ms=self._get_avg_latency(room_id),
            drift_seconds=0.0,
        )

    def compute_drift_correction(
        self, host_state: SyncState, peer_state: SyncState
    ) -> dict:
        drift = peer_state.timestamp - host_state.timestamp
        latency = host_state.latency_ms / 1000.0
        effective_drift = drift - latency

        abs_drift = abs(effective_drift)

        if abs_drift < settings.DRIFT_SOFT_CORRECTION_SEC:
            return {"action": "none", "drift": effective_drift}

        if abs_drift < settings.DRIFT_HARD_CORRECTION_SEC:
            return {
                "action": "soft_correct",
                "drift": effective_drift,
                "playback_rate": settings.SOFT_CORRECTION_SPEED
                if effective_drift < 0
                else 1.0 / settings.SOFT_CORRECTION_SPEED,
                "message": f"Catching up ({abs_drift:.1f}s drift)",
            }

        return {
            "action": "hard_correct",
            "drift": effective_drift,
            "target_timestamp": host_state.timestamp,
            "message": f"Syncing ({abs_drift:.1f}s drift)",
        }

    def record_latency(self, room_id: str, latency_ms: float):
        if room_id not in self._latency_samples:
            self._latency_samples[room_id] = []
        samples = self._latency_samples[room_id]
        samples.append(latency_ms)
        if len(samples) > settings.LATENCY_SAMPLE_WINDOW:
            samples.pop(0)

    def _get_avg_latency(self, room_id: str) -> float:
        samples = self._latency_samples.get(room_id, [])
        return median(samples) if samples else 0.0

    def combine_detections(self, results: list[DetectionResult]) -> DetectionResult:
        if not results:
            return DetectionResult(confidence=0.0, method="none")

        weights = {"audio": 0.4, "visual": 0.3, "subtitle": 0.2, "direct": 0.5, "predicted": 0.1}
        weighted_best = max(
            results, key=lambda r: r.confidence * weights.get(r.method, 0.2)
        )
        return weighted_best

    def get_sync_health(self, room_id: str) -> dict:
        state = self._rooms.get(room_id, {})
        return {
            "confidence": state.get("confidence", 1.0),
            "latency_ms": self._get_avg_latency(room_id),
            "drift_seconds": 0.0,
            "status": "synced" if state.get("confidence", 1.0) > settings.SYNC_CONFIDENCE_THRESHOLD else "desynced",
        }


sync_engine = SyncEngine()
