"""
SyncSaga AI Fingerprint Matching Service
Implements Shazam-style audio fingerprinting for anime episode detection
"""
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import hashlib
import struct
from app.core.database import get_db_connection
import asyncio

@dataclass
class FingerprintPoint:
    """Represents a spectral peak in the audio constellation map"""
    time_ms: float
    frequency_hz: float
    amplitude: float

@dataclass
class FingerprintHash:
    """A landmark hash formed by pairing two fingerprint points"""
    hash_value: int
    freq1: int
    freq2: int
    delta_time: int
    time_offset_ms: float

@dataclass
class MatchResult:
    """Result of fingerprint matching"""
    anime_id: str
    episode_number: int
    offset_seconds: float
    confidence: float
    intro_skip: Optional[Dict[str, float]] = None
    timeline: Optional[Dict] = None

class AudioFingerprinter:
    """
    Extracts audio fingerprints using Shazam-style constellation mapping
    """
    
    SAMPLE_RATE = 44100
    FFT_SIZE = 4096  # ~92ms at 44.1kHz
    HOP_SIZE = 512   # Overlap for better temporal resolution
    MIN_FREQ = 300   # Hz - filter out low frequency noise
    MAX_FREQ = 3000  # Hz - focus on voice + music sweet spot
    PEAK_THRESHOLD = 0.7  # Relative threshold for peak detection
    TOP_N_PEAKS = 15  # Number of top peaks to keep per frame
    
    def __init__(self):
        self.hanning_window = np.hanning(self.FFT_SIZE)
    
    def extract_fingerprints(self, audio_samples: np.ndarray) -> List[FingerprintHash]:
        """
        Extract fingerprint hashes from raw audio samples
        
        Args:
            audio_samples: Mono audio samples as numpy array (float32, -1 to 1)
            
        Returns:
            List of FingerprintHash objects
        """
        if len(audio_samples) < self.FFT_SIZE:
            return []
        
        # Pad audio to be divisible by hop size
        pad_size = (self.HOP_SIZE - (len(audio_samples) % self.HOP_SIZE)) % self.HOP_SIZE
        audio_samples = np.pad(audio_samples, (0, pad_size), mode='constant')
        
        fingerprints = []
        num_frames = (len(audio_samples) - self.FFT_SIZE) // self.HOP_SIZE + 1
        
        for frame_idx in range(num_frames):
            start_idx = frame_idx * self.HOP_SIZE
            end_idx = start_idx + self.FFT_SIZE
            
            if end_idx > len(audio_samples):
                break
            
            # Apply windowing
            frame = audio_samples[start_idx:end_idx] * self.hanning_window
            
            # Compute FFT
            spectrum = np.fft.rfft(frame)
            magnitude = np.abs(spectrum)
            
            # Convert bin indices to frequencies
            freqs = np.fft.rfftfreq(self.FFT_SIZE, 1.0 / self.SAMPLE_RATE)
            
            # Filter frequency range
            valid_indices = (freqs >= self.MIN_FREQ) & (freqs <= self.MAX_FREQ)
            valid_magnitudes = magnitude[valid_indices]
            valid_freqs = freqs[valid_indices]
            
            if len(valid_magnitudes) == 0:
                continue
            
            # Find spectral peaks
            peaks = self._find_peaks(valid_magnitudes, valid_freqs, frame_idx)
            
            # Generate combinatorial hashes from peak pairs
            frame_hashes = self._generate_hashes(peaks, frame_idx)
            fingerprints.extend(frame_hashes)
        
        return fingerprints
    
    def _find_peaks(self, magnitudes: np.ndarray, freqs: np.ndarray, 
                    frame_idx: int) -> List[FingerprintPoint]:
        """Find spectral peaks in the magnitude spectrum"""
        if len(magnitudes) == 0:
            return []
        
        # Normalize magnitudes
        max_mag = np.max(magnitudes)
        if max_mag == 0:
            return []
        
        normalized = magnitudes / max_mag
        
        # Find local maxima above threshold
        peaks = []
        for i in range(1, len(magnitudes) - 1):
            if (normalized[i] > self.PEAK_THRESHOLD and
                normalized[i] > normalized[i-1] and
                normalized[i] > normalized[i+1]):
                
                time_ms = (frame_idx * self.HOP_SIZE) / self.SAMPLE_RATE * 1000
                peaks.append(FingerprintPoint(
                    time_ms=time_ms,
                    frequency_hz=freqs[i],
                    amplitude=magnitudes[i]
                ))
        
        # Sort by amplitude and keep top N
        peaks.sort(key=lambda p: p.amplitude, reverse=True)
        return peaks[:self.TOP_N_PEAKS]
    
    def _generate_hashes(self, peaks: List[FingerprintPoint], 
                         frame_idx: int) -> List[FingerprintHash]:
        """Generate landmark hashes from pairs of peaks"""
        hashes = []
        
        for i, peak1 in enumerate(peaks):
            for peak2 in peaks[i+1:i+6]:  # Pair with next 5 peaks
                # Quantize frequencies to integers (bin index)
                freq1_bin = int(peak1.frequency_hz / 10)  # 10Hz bins
                freq2_bin = int(peak2.frequency_hz / 10)
                
                # Calculate time delta in milliseconds
                delta_time = int((peak2.time_ms - peak1.time_ms) / 10)  # 10ms bins
                
                # Create hash: combine freq1, freq2, and delta_time
                # Using bit manipulation for compact representation
                hash_value = (freq1_bin << 20) | (freq2_bin << 10) | delta_time
                
                hashes.append(FingerprintHash(
                    hash_value=hash_value,
                    freq1=freq1_bin,
                    freq2=freq2_bin,
                    delta_time=delta_time,
                    time_offset_ms=peak1.time_ms
                ))
        
        return hashes


class FingerprintMatcher:
    """
    Matches extracted fingerprints against the database to identify episodes
    """
    
    CONFIDENCE_THRESHOLD_HIGH = 0.95
    CONFIDENCE_THRESHOLD_MEDIUM = 0.80
    CONFIDENCE_THRESHOLD_LOW = 0.50
    
    def __init__(self):
        self.fingerprinter = AudioFingerprinter()
        self._db_pool = None
    
    async def match_episode(self, audio_samples: np.ndarray, 
                           duration_sec: float) -> Optional[MatchResult]:
        """
        Match audio samples against fingerprint database
        
        Args:
            audio_samples: Mono audio samples (float32, -1 to 1)
            duration_sec: Duration of audio in seconds
            
        Returns:
            MatchResult if confident match found, None otherwise
        """
        # Extract fingerprints from query audio
        query_fingerprints = self.fingerprinter.extract_fingerprints(audio_samples)
        
        if len(query_fingerprints) < 10:
            return None
        
        # Query database for matching hashes
        candidates = await self._query_database(query_fingerprints)
        
        if not candidates:
            return None
        
        # Group by (anime_id, episode) and find best match
        grouped = self._group_candidates(candidates, query_fingerprints)
        
        if not grouped:
            return None
        
        # Find the group with highest confidence
        best_match = max(grouped.items(), key=lambda x: x[1]['score'])
        anime_id, episode_num = best_match[0]
        match_data = best_match[1]
        
        confidence = match_data['score']
        offset_seconds = match_data['offset']
        
        # Get additional metadata
        intro_skip = await self._get_intro_skip(anime_id, episode_num)
        timeline = await self._get_timeline(anime_id, episode_num)
        
        return MatchResult(
            anime_id=anime_id,
            episode_number=episode_num,
            offset_seconds=offset_seconds,
            confidence=confidence,
            intro_skip=intro_skip,
            timeline=timeline
        )
    
    async def _query_database(self, fingerprints: List[FingerprintHash]) -> List[Dict]:
        """Query PostgreSQL database for matching fingerprint hashes"""
        try:
            conn = await get_db_connection()
            
            # Extract unique hash values
            hash_values = list(set(fp.hash_value for fp in fingerprints))
            
            if not hash_values:
                return []
            
            # Query matching fingerprints
            query = """
                SELECT 
                    ef.anime_id,
                    ef.episode_number,
                    am.title,
                    unnest(ef.hash_index) as db_hash,
                    ef.op_start,
                    ef.op_end,
                    ef.ed_start,
                    ef.ed_end
                FROM episode_fingerprints ef
                JOIN anime_metadata am ON ef.anime_id = am.id
                WHERE ef.hash_index && %s
                AND ef.status = 'ready'
                LIMIT 1000
            """
            
            # Convert hash values to PostgreSQL integer array
            hash_array = "{" + ",".join(str(h) for h in hash_values) + "}"
            
            async with conn.cursor() as cur:
                await cur.execute(query, (hash_array,))
                rows = await cur.fetchall()
                
                results = []
                for row in rows:
                    results.append({
                        'anime_id': str(row[0]),
                        'episode_number': row[1],
                        'title': row[2],
                        'db_hash': row[3],
                        'op_start': row[4],
                        'op_end': row[5],
                        'ed_start': row[6],
                        'ed_end': row[7]
                    })
                
                return results
                
        except Exception as e:
            print(f"Database query error: {e}")
            return []
        finally:
            if conn:
                await conn.close()
    
    def _group_candidates(self, candidates: List[Dict], 
                         query_fingerprints: List[FingerprintHash]) -> Dict:
        """
        Group candidates by (anime_id, episode) and compute confidence scores
        using histogram voting
        """
        # Build lookup: hash -> query time offsets
        hash_to_query_times = {}
        for fp in query_fingerprints:
            if fp.hash_value not in hash_to_query_times:
                hash_to_query_times[fp.hash_value] = []
            hash_to_query_times[fp.hash_value].append(fp.time_offset_ms)
        
        # Group matches
        groups = {}
        
        for candidate in candidates:
            db_hash = candidate['db_hash']
            
            if db_hash not in hash_to_query_times:
                continue
            
            key = (candidate['anime_id'], candidate['episode_number'])
            
            if key not in groups:
                groups[key] = {
                    'title': candidate['title'],
                    'time_deltas': [],
                    'op_start': candidate['op_start'],
                    'op_end': candidate['op_end'],
                    'ed_start': candidate['ed_start'],
                    'ed_end': candidate['ed_end']
                }
            
            # Calculate time delta for each matching hash
            for query_time in hash_to_query_times[db_hash]:
                # Approximate offset based on hash structure
                # In production, this would use more sophisticated alignment
                time_delta = query_time  # Simplified
                groups[key]['time_deltas'].append(time_delta)
        
        # Score each group
        scored_groups = {}
        for key, data in groups.items():
            time_deltas = data['time_deltas']
            
            if len(time_deltas) < 5:
                continue
            
            # Build histogram of time deltas to find consensus offset
            histogram, bin_edges = np.histogram(time_deltas, bins=50)
            peak_bin = np.argmax(histogram)
            peak_count = histogram[peak_bin]
            
            # Confidence = peak_height / total_matches
            confidence = min(1.0, peak_count / len(time_deltas))
            
            # Estimated offset is the center of the peak bin
            offset_ms = (bin_edges[peak_bin] + bin_edges[peak_bin + 1]) / 2
            offset_seconds = offset_ms / 1000.0
            
            scored_groups[key] = {
                'score': confidence,
                'offset': offset_seconds,
                'match_count': len(time_deltas),
                'op_start': data['op_start'],
                'op_end': data['op_end'],
                'ed_start': data['ed_start'],
                'ed_end': data['ed_end']
            }
        
        return scored_groups
    
    async def _get_intro_skip(self, anime_id: str, 
                             episode_num: int) -> Optional[Dict[str, float]]:
        """Get opening/ending skip timestamps"""
        try:
            conn = await get_db_connection()
            async with conn.cursor() as cur:
                await cur.execute("""
                    SELECT op_start, op_end, ed_start, ed_end
                    FROM episode_fingerprints
                    WHERE anime_id = %s AND episode_number = %s
                """, (anime_id, episode_num))
                row = await cur.fetchone()
                
                if row and row[1] is not None:
                    return {
                        'start': float(row[0]) if row[0] else 0.0,
                        'end': float(row[1]) if row[1] else 0.0
                    }
                return None
        except Exception as e:
            print(f"Error getting intro skip: {e}")
            return None
        finally:
            if conn:
                await conn.close()
    
    async def _get_timeline(self, anime_id: str, 
                           episode_num: int) -> Optional[Dict]:
        """Get scene timeline for episode"""
        # Placeholder - would return scene boundaries
        return {
            'scenes': [],
            'op': [0, 90],  # Default 90s opening
            'ed': [1380, 1440]  # Default ending
        }


# Global instance
fingerprint_matcher = FingerprintMatcher()


async def detect_anime_from_audio(audio_base64: str, 
                                  duration_sec: float) -> Optional[MatchResult]:
    """
    High-level API to detect anime from base64-encoded audio
    
    Args:
        audio_base64: Base64-encoded PCM audio (mono, 44.1kHz, 16-bit)
        duration_sec: Duration in seconds
        
    Returns:
        MatchResult or None
    """
    import base64
    
    # Decode base64 to raw bytes
    audio_bytes = base64.b64decode(audio_base64)
    
    # Convert to numpy array (assuming 16-bit PCM)
    audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)
    audio_array = audio_array / 32768.0  # Normalize to [-1, 1]
    
    return await fingerprint_matcher.match_episode(audio_array, duration_sec)
