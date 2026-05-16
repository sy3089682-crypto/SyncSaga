"""Tests for sync engine"""

import pytest
from app.services.sync_engine import SyncEngine, PlaybackPredictionEngine, SyncHealthScore
from app.models.schemas import SyncState, DetectionResult


@pytest.fixture
def engine():
    return SyncEngine()


class TestDriftCorrection:
    def test_no_drift(self, engine):
        host = SyncState(room_id='test', timestamp=100.0, playback_state='playing', speed=1.0)
        peer = SyncState(room_id='test', timestamp=100.5, playback_state='playing', speed=1.0, latency_ms=50)
        result = engine.compute_drift_correction(host, peer)
        assert result['action'] == 'none'

    def test_soft_correction(self, engine):
        host = SyncState(room_id='test', timestamp=100.0, playback_state='playing', speed=1.0)
        peer = SyncState(room_id='test', timestamp=102.0, playback_state='playing', speed=1.0, latency_ms=50)
        result = engine.compute_drift_correction(host, peer)
        assert result['action'] == 'soft_correct'

    def test_hard_correction(self, engine):
        host = SyncState(room_id='test', timestamp=100.0, playback_state='playing', speed=1.0)
        peer = SyncState(room_id='test', timestamp=105.0, playback_state='playing', speed=1.0, latency_ms=50)
        result = engine.compute_drift_correction(host, peer)
        assert result['action'] == 'hard_correct'


class TestHybridDetection:
    def test_no_results(self, engine):
        result = engine.combine_detections([])
        assert result.confidence == 0.0
        assert result.method == 'none'

    def test_audio_wins(self, engine):
        results = [
            DetectionResult(method='visual', confidence=0.5),
            DetectionResult(method='audio', confidence=0.8),
            DetectionResult(method='subtitle', confidence=0.6),
        ]
        result = engine.combine_detections(results)
        assert result.method == 'audio'
        assert result.confidence == 0.8


class TestPlaybackPrediction:
    @pytest.fixture
    def predictor(self):
        return PlaybackPredictionEngine()

    def test_no_history(self, predictor):
        result = predictor.predict_position('room_1')
        assert result is None

    def test_predicts_forward(self, predictor):
        import time
        predictor.record_state('room_1', time.time() - 5, 50.0, 1.0)
        predictor.record_state('room_1', time.time() - 2, 53.0, 1.0)
        result = predictor.predict_position('room_1')
        assert result is not None
        assert result['predicted_timestamp'] > 53.0
        assert result['method'] == 'playback_prediction'


class TestSyncHealth:
    @pytest.fixture
    def health(self):
        return SyncHealthScore()

    def test_empty_history(self, health):
        result = health.compute('room_1', 1.0, 0, 0)
        assert result['health_score'] > 0.8
        assert result['icon'] == '🟢'

    def test_poor_health(self, health):
        result = health.compute('room_1', 0.3, 300, 5.0)
        assert result['health_score'] < 0.5
