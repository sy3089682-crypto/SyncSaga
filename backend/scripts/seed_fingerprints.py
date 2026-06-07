#!/usr/bin/env python3
"""
SyncSaga Fingerprint Database Seeder

Populates the fingerprint database with anime episode audio fingerprints.
Usage: python seed_fingerprints.py --anime-id <anilist_id> --audio-dir /path/to/audio/files
"""

import asyncio
import argparse
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import get_db_connection, init_db_pool, close_db_pool
from app.services.fingerprint_builder import FingerprintDatabaseBuilder


class FingerprintSeeder:
    """Seeds the fingerprint database with anime episode audio files"""
    
    def __init__(self):
        self.builder = FingerprintDatabaseBuilder()
        
    async def seed_anime(
        self, 
        anime_id: str, 
        audio_directory: str,
        episode_pattern: str = "episode_{num}.wav"
    ) -> Dict:
        """
        Seed fingerprints for an entire anime series
        
        Args:
            anime_id: AniList ID or custom identifier
            audio_directory: Directory containing episode audio files
            episode_pattern: Pattern for episode filenames (use {num} for episode number)
            
        Returns:
            Dictionary with seeding statistics
        """
        stats = {
            'anime_id': anime_id,
            'episodes_processed': 0,
            'episodes_failed': 0,
            'total_fingerprints': 0,
            'errors': []
        }
        
        # Find all audio files in directory
        audio_path = Path(audio_directory)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio directory not found: {audio_directory}")
        
        audio_extensions = {'.wav', '.mp3', '.flac', '.ogg', '.m4a'}
        audio_files = [f for f in audio_path.iterdir() if f.suffix.lower() in audio_extensions]
        
        if not audio_files:
            raise ValueError(f"No audio files found in {audio_directory}")
        
        print(f"Found {len(audio_files)} audio files")
        
        # Group files by episode number
        episodes = {}
        for file in audio_files:
            try:
                # Extract episode number from filename
                ep_num = self._extract_episode_number(file.name)
                if ep_num:
                    episodes[ep_num] = file
            except Exception as e:
                stats['errors'].append(f"Failed to parse {file.name}: {e}")
        
        print(f"Identified {len(episodes)} episodes")
        
        # Process each episode
        for ep_num, file_path in sorted(episodes.items()):
            try:
                print(f"Processing episode {ep_num}: {file_path.name}")
                
                result = await self._process_episode(anime_id, ep_num, str(file_path))
                
                if result['success']:
                    stats['episodes_processed'] += 1
                    stats['total_fingerprints'] += result['fingerprint_count']
                else:
                    stats['episodes_failed'] += 1
                    stats['errors'].append(result['error'])
                    
            except Exception as e:
                stats['episodes_failed'] += 1
                stats['errors'].append(f"Episode {ep_num}: {str(e)}")
                print(f"Error processing episode {ep_num}: {e}")
        
        return stats
    
    def _extract_episode_number(self, filename: str) -> Optional[int]:
        """Extract episode number from filename using various patterns"""
        import re
        
        patterns = [
            r'[Ee]pisode[_\s]?(\d+)',
            r'[Ee](\d+)',
            r'(\d+)',
            r'\[(\d+)\]',
            r'#(\d+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename)
            if match:
                return int(match.group(1))
        
        return None
    
    async def _process_episode(
        self, 
        anime_id: str, 
        episode_number: int, 
        audio_file_path: str
    ) -> Dict:
        """Process a single episode audio file"""
        try:
            # Load audio file
            samples, sample_rate = self._load_audio(audio_file_path)
            
            if len(samples) == 0:
                return {'success': False, 'error': 'Empty audio file'}
            
            # Calculate duration
            duration_sec = len(samples) / sample_rate
            
            # Extract fingerprints
            fingerprints = self.builder.fingerprinter.extract_fingerprints(samples)
            
            if len(fingerprints) == 0:
                return {'success': False, 'error': 'No fingerprints extracted'}
            
            # Build hash index
            hash_counts = {}
            for fp in fingerprints:
                hash_counts[fp.hash_value] = hash_counts.get(fp.hash_value, 0) + 1
            
            unique_hashes = list(hash_counts.keys())
            
            # Store in database
            conn = await get_db_connection()
            try:
                async with conn.cursor() as cur:
                    # First ensure anime metadata exists
                    await cur.execute("""
                        INSERT INTO anime_metadata (id, anilist_id, title_romaji)
                        VALUES (gen_random_uuid(), %s, %s)
                        ON CONFLICT (anilist_id) DO NOTHING
                    """, (anime_id, f"Anime {anime_id}"))
                    
                    # Get anime internal ID
                    await cur.execute("""
                        SELECT id FROM anime_metadata WHERE anilist_id = %s
                    """, (anime_id,))
                    row = await cur.fetchone()
                    internal_anime_id = row[0] if row else None
                    
                    if not internal_anime_id:
                        return {'success': False, 'error': 'Failed to get anime ID'}
                    
                    # Insert/update episode fingerprints
                    await cur.execute("""
                        INSERT INTO episode_fingerprints 
                        (anime_id, episode_number, duration_seconds, fingerprint_count, 
                         hash_index, status, op_start, op_end)
                        VALUES (%s, %s, %s, %s, %s, 'ready', 0.0, 90.0)
                        ON CONFLICT (anime_id, episode_number) 
                        DO UPDATE SET
                            duration_seconds = EXCLUDED.duration_seconds,
                            fingerprint_count = EXCLUDED.fingerprint_count,
                            hash_index = EXCLUDED.hash_index,
                            status = EXCLUDED.status,
                            updated_at = NOW()
                    """, (
                        internal_anime_id,
                        episode_number,
                        duration_sec,
                        len(unique_hashes),
                        unique_hashes
                    ))
                    
                    await conn.commit()
                
                return {
                    'success': True,
                    'fingerprint_count': len(unique_hashes),
                    'duration': duration_sec
                }
                
            finally:
                await conn.close()
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _load_audio(self, file_path: str) -> tuple:
        """Load audio file and return samples and sample rate"""
        try:
            import librosa
            samples, sample_rate = librosa.load(file_path, sr=44100, mono=True)
            return samples, sample_rate
        except ImportError:
            # Fallback to scipy for WAV files
            from scipy.io import wavfile
            sample_rate, samples = wavfile.read(file_path)
            samples = samples.astype(np.float32) / 32768.0
            return samples, sample_rate
        except Exception as e:
            raise ValueError(f"Failed to load audio file: {e}")


async def main():
    parser = argparse.ArgumentParser(description='Seed SyncSaga fingerprint database')
    parser.add_argument('--anime-id', required=True, help='AniList ID or custom identifier')
    parser.add_argument('--audio-dir', required=True, help='Directory containing episode audio files')
    parser.add_argument('--pattern', default='episode_{num}.wav', help='Filename pattern')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    print(f"Starting fingerprint seeder...")
    print(f"Anime ID: {args.anime_id}")
    print(f"Audio directory: {args.audio_dir}")
    
    # Initialize database pool
    await init_db_pool()
    
    try:
        seeder = FingerprintSeeder()
        stats = await seeder.seed_anime(args.anime_id, args.audio_dir, args.pattern)
        
        print("\n=== Seeding Complete ===")
        print(f"Episodes processed: {stats['episodes_processed']}")
        print(f"Episodes failed: {stats['episodes_failed']}")
        print(f"Total fingerprints: {stats['total_fingerprints']:,}")
        
        if stats['errors']:
            print(f"\nErrors ({len(stats['errors'])}):")
            for error in stats['errors'][:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(stats['errors']) > 10:
                print(f"  ... and {len(stats['errors']) - 10} more")
        
        # Print summary
        success_rate = (stats['episodes_processed'] / 
                       (stats['episodes_processed'] + stats['episodes_failed']) * 100
                       if (stats['episodes_processed'] + stats['episodes_failed']) > 0 else 0)
        print(f"\nSuccess rate: {success_rate:.1f}%")
        
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
    finally:
        await close_db_pool()


if __name__ == '__main__':
    asyncio.run(main())
