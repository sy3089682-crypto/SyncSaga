"""
Audio Fingerprint Database Population Service
Pre-computes fingerprints for anime episodes and stores them in PostgreSQL
"""
import numpy as np
from typing import Optional, List
import asyncio
from app.core.database import get_db_connection
from app.services.fingerprint_matching import AudioFingerprinter
import aiofiles
import os

class FingerprintDatabaseBuilder:
    """
    Builds fingerprint database for anime episodes
    """
    
    def __init__(self):
        self.fingerprinter = AudioFingerprinter()
    
    async def process_episode_audio(self, audio_file_path: str, 
                                   anime_id: str, 
                                   episode_number: int) -> bool:
        """
        Process an episode's audio file and store fingerprints in database
        
        Args:
            audio_file_path: Path to audio file (WAV/MP3)
            anime_id: UUID of anime in database
            episode_number: Episode number
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Load audio file
            audio_samples, sample_rate = await self._load_audio(audio_file_path)
            
            if sample_rate != 44100:
                # Resample to 44.1kHz
                audio_samples = self._resample(audio_samples, sample_rate, 44100)
            
            # Calculate duration
            duration_sec = len(audio_samples) / 44100.0
            
            # Extract fingerprints
            fingerprints = self.fingerprinter.extract_fingerprints(audio_samples)
            
            if len(fingerprints) == 0:
                print(f"No fingerprints extracted from {audio_file_path}")
                return False
            
            # Group fingerprints by hash for efficient storage
            hash_counts = {}
            for fp in fingerprints:
                if fp.hash_value not in hash_counts:
                    hash_counts[fp.hash_value] = 0
                hash_counts[fp.hash_value] += 1
            
            # Store in database
            await self._store_fingerprints(
                anime_id=anime_id,
                episode_number=episode_number,
                duration_seconds=duration_sec,
                fingerprint_hashes=list(hash_counts.keys()),
                fingerprint_count=len(fingerprints)
            )
            
            print(f"Stored {len(hash_counts)} unique hashes for "
                  f"anime {anime_id} episode {episode_number}")
            return True
            
        except Exception as e:
            print(f"Error processing episode {audio_file_path}: {e}")
            return False
    
    async def _load_audio(self, file_path: str) -> tuple:
        """Load audio file and return samples + sample rate"""
        # Check file extension
        if file_path.endswith('.npy'):
            # Pre-processed numpy array
            async with aiofiles.open(file_path, 'rb') as f:
                data = await f.read()
                samples = np.frombuffer(data, dtype=np.float32)
                return samples, 44100
        
        elif file_path.endswith('.wav'):
            # Use scipy or wave module for WAV files
            import wave
            import contextlib
            
            with contextlib.closing(wave.open(file_path, 'rb')) as wav_file:
                frames = wav_file.readframes(wav_file.getnframes())
                sample_rate = wav_file.getframerate()
                channels = wav_file.getnchannels()
                sample_width = wav_file.getsampwidth()
                
                # Convert to numpy
                if sample_width == 2:
                    samples = np.frombuffer(frames, dtype=np.int16)
                elif sample_width == 4:
                    samples = np.frombuffer(frames, dtype=np.int32)
                else:
                    raise ValueError(f"Unsupported sample width: {sample_width}")
                
                # Normalize to [-1, 1]
                samples = samples.astype(np.float32) / 32768.0
                
                # Convert stereo to mono
                if channels == 2:
                    samples = samples.reshape(-1, 2).mean(axis=1)
                
                return samples, sample_rate
        
        else:
            # For MP3 and other formats, would need ffmpeg/pydub
            raise ValueError(f"Unsupported audio format: {file_path}")
    
    def _resample(self, samples: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
        """Resample audio to target sample rate"""
        if orig_sr == target_sr:
            return samples
        
        # Simple linear interpolation resampling
        num_samples = int(len(samples) * target_sr / orig_sr)
        indices = np.linspace(0, len(samples) - 1, num_samples)
        return np.interp(indices, np.arange(len(samples)), samples)
    
    async def _store_fingerprints(self, anime_id: str, 
                                 episode_number: int,
                                 duration_seconds: float,
                                 fingerprint_hashes: List[int],
                                 fingerprint_count: int) -> None:
        """Store fingerprints in PostgreSQL database"""
        conn = await get_db_connection()
        
        try:
            async with conn.cursor() as cur:
                # Insert or update episode fingerprints
                await cur.execute("""
                    INSERT INTO episode_fingerprints 
                    (anime_id, episode_number, duration_seconds, fingerprint_count, 
                     hash_index, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, 'ready', NOW())
                    ON CONFLICT (anime_id, episode_number) DO UPDATE SET
                        duration_seconds = EXCLUDED.duration_seconds,
                        fingerprint_count = EXCLUDED.fingerprint_count,
                        hash_index = EXCLUDED.hash_index,
                        status = 'ready',
                        updated_at = NOW()
                """, (
                    anime_id,
                    episode_number,
                    duration_seconds,
                    fingerprint_count,
                    fingerprint_hashes  # PostgreSQL integer array
                ))
                
                await conn.commit()
                
        except Exception as e:
            await conn.rollback()
            raise e
        finally:
            await conn.close()
    
    async def batch_process_directory(self, directory: str, 
                                     anime_id: str) -> int:
        """
        Process all audio files in a directory for an anime
        
        Args:
            directory: Path to directory containing episode audio files
            anime_id: UUID of anime
            
        Returns:
            Number of successfully processed episodes
        """
        success_count = 0
        
        for filename in os.listdir(directory):
            if not filename.endswith(('.wav', '.npy')):
                continue
            
            # Extract episode number from filename
            # Expected format: episode_001.wav or ep01.wav
            import re
            match = re.search(r'(?:episode|ep)[-_]?(\d+)', filename, re.IGNORECASE)
            if not match:
                print(f"Skipping {filename}: no episode number found")
                continue
            
            episode_number = int(match.group(1))
            file_path = os.path.join(directory, filename)
            
            print(f"Processing {file_path}...")
            if await self.process_episode_audio(file_path, anime_id, episode_number):
                success_count += 1
        
        return success_count


# Utility functions for bulk operations

async def populate_anime_fingerprints(anime_id: str, 
                                     audio_directory: str) -> dict:
    """
    Populate fingerprint database for a single anime
    
    Args:
        anime_id: UUID of anime in database
        audio_directory: Directory containing episode audio files
        
    Returns:
        Dict with processing statistics
    """
    builder = FingerprintDatabaseBuilder()
    
    episodes_processed = await builder.batch_process_directory(
        audio_directory, anime_id
    )
    
    return {
        'anime_id': anime_id,
        'episodes_processed': episodes_processed,
        'status': 'completed' if episodes_processed > 0 else 'failed'
    }


async def detect_theme_song_boundaries(audio_samples: np.ndarray,
                                       sample_rate: int = 44100) -> dict:
    """
    Detect opening and ending theme song boundaries using audio analysis
    
    Uses heuristics:
    - OP typically starts immediately (0-15s intro animation)
    - OP ends around 90s (1:30)
    - ED starts around episode_end - 90s
    - Silence detection for scene boundaries
    
    Args:
        audio_samples: Mono audio samples
        sample_rate: Sample rate in Hz
        
    Returns:
        Dict with op_start, op_end, ed_start, ed_end in seconds
    """
    duration = len(audio_samples) / sample_rate
    
    # Default values for typical 24-minute episode
    default_op_end = 90.0
    default_ed_start = duration - 90.0
    
    # Detect silence to find actual content boundaries
    silence_threshold = 0.01  # Very quiet
    window_size = int(sample_rate * 0.5)  # 500ms windows
    
    # Find first significant audio (end of cold open/intro)
    op_start = 0.0
    for i in range(0, min(int(sample_rate * 30), len(audio_samples) - window_size), window_size):
        window = audio_samples[i:i + window_size]
        rms = np.sqrt(np.mean(window ** 2))
        if rms > silence_threshold:
            op_start = i / sample_rate
            break
    
    # Find last significant audio before ending
    ed_end = duration
    for i in range(int(duration * sample_rate) - window_size, 
                   max(0, int((duration - 120) * sample_rate)), 
                   -window_size):
        window = audio_samples[i:i + window_size]
        rms = np.sqrt(np.mean(window ** 2))
        if rms > silence_threshold:
            ed_end = (i + window_size) / sample_rate
            break
    
    return {
        'op_start': op_start,
        'op_end': default_op_end,
        'ed_start': default_ed_start,
        'ed_end': ed_end
    }
