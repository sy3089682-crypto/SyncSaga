# SyncSaga AI Architecture

## Overview

The AI system enables **zero-configuration sync** — users paste any anime URL and SyncSaga automatically detects the episode, scene, and timestamp without requiring the browser extension. This is the moat that makes SyncSaga irreplaceable.

## Architecture Diagram

```
User's Browser
     │
     ├──► Extension (optional): reads video.currentTime directly
     │
     └──► [Synth Detector] ◄── Audio stream from video tag
                │
                ▼
        [Fingerprint Extractor]
                │
                ▼
        [Matcher Service] ◄─── [Fingerprint DB]
                │                     │
                ▼                     ▼
        [Timestamp Resolver]    Pre-computed fingerprints
                │               per anime episode
                ▼
        SyncSaga Room (authoritative host)
```

## 1. Audio Fingerprinting Pipeline

### 1.1 Capture Layer

**Where**: Browser extension content script OR a small JS snippet users paste.

**Method**: `AudioContext.createMediaElementSource(video)` → `ScriptProcessorNode` → raw PCM samples

```typescript
// Conceptual capture API
class AudioFingerprinter {
  private ctx: AudioContext
  private source: MediaElementAudioSourceNode
  private processor: ScriptProcessorNode
  
  start() {
    this.ctx = new AudioContext()
    this.source = this.ctx.createMediaElementSource(video)
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    
    this.processor.onaudioprocess = (e) => {
      const samples = e.inputBuffer.getChannelData(0)
      const fingerprint = this.extractFingerprint(samples)
      this.send(fingerprint)
    }
    
    this.source.connect(this.processor)
    this.processor.connect(this.ctx.destination)
  }
  
  extractFingerprint(samples: Float32Array): number[] {
    // 1. Apply Hanning window
    // 2. Compute FFT (4096-point)
    // 3. Extract spectral peaks (top 5-10 frequencies)
    // 4. Hash neighboring peak pairs → fingerprint points
    // 5. Return fingerprint hash
  }
}
```

**Constraint**: Must use < 100ms of audio per fingerprint to feel real-time.

### 1.2 Fingerprint Algorithm (Shazam-derived)

1. **Windowing**: Hanning window on 4096 samples (~92ms at 44.1kHz)
2. **FFT**: 4096-point FFT → 2048 frequency bins
3. **Peak Extraction**: Find top N spectral peaks (amplitude > threshold)
   - Filter out noise floor
   - Only keep peaks in 300Hz–3000Hz range (human voice + music sweet spot)
4. **Constellation Map**: Store as `(time, frequency)` pairs
5. **Combinatorial Hashing**: For each peak pair within a time delta:
   ```
   hash = (freq1 << 16) | (freq2 << 8) | (delta_time)
   ```
   This is the **landmark** — the core unit of matching.

### 1.3 Fingerprint Database

**Storage**: PostgreSQL + Redis cache

```
fingerprints
├── anime_id: UUID
├── episode_number: int
├── offset_ms: int           ← timestamp within episode
├── hash: bigint             ← landmark hash
├── freq1: int
├── freq2: int
└── delta_time: int

Index: (hash) for fast lookup
Index: (anime_id, episode_number) for range queries
```

**Pre-computation**: For each anime episode:
- Sample every 11.6ms (overlap 8:1)
- Run fingerprint extraction on entire episode audio
- Store ~2000–5000 landmarks per minute of content
- 24min episode ≈ 50,000–120,000 fingerprints

### 1.4 Matching Algorithm

```
match(audio_stream_fingerprints):
  1. Extract ~100 fingerprints from 1 second of audio
  2. Query database by hash → get candidate (anime, episode, offset) tuples
  3. Group by (anime_id, episode_number)
  4. For each group, build histogram of time_offsets:
     - offset_db - offset_query = time_delta
  5. Find cluster with highest peak → this is the matching point
  6. Confidence = peak_height / total_matches
  7. If confidence > THRESHOLD (0.7): return match
  8. Else: collect more audio (2-3 seconds) and retry
```

**Expected performance**:
- 1 second of audio → match in ~50ms
- 99% accuracy after 3 seconds
- Handles speed changes, mild distortion, and 5-10s offset

## 2. Scene Detection Model

### 2.1 Purpose

Detect episode boundaries (OP/ED start/end), scene changes, and key moments for:
- Timestamp-anchored reactions
- Clip moment capture
- Skip intro voting
- Episode auto-detection

### 2.2 Dual Approach

**Audio-based** (simpler, works without video access):
- Sudden silence → scene boundary
- Theme song detection via fingerprint matching against known OP/ED database
- Volume envelope analysis for scene intensity

**Visual-based** (requires `<canvas>` access, higher quality):
- Frame differencing: `||frame_t - frame_{t-1}|| > threshold`
- Histogram comparison: color distribution shift
- Can be done via `<video>` → `<canvas>` in extension

```python
# Conceptual scene boundary detection
def detect_scene_boundaries(audio_buffer, fps=24):
    # 1. Compute spectral flux
    spectral_flux = compute_spectral_flux(audio_buffer)
    
    # 2. Find peaks in spectral flux
    peaks = find_peaks(spectral_flux, min_distance=fps*30)  # min 30s between scenes
    
    # 3. Classify boundaries
    boundaries = []
    for peak in peaks:
        if is_opening_or_ending(audio_buffer, peak):
            boundaries.append({'time': peak, 'type': 'op_ed'})
        elif spectral_flux[peak] > THRESHOLD_HIGH:
            boundaries.append({'time': peak, 'type': 'scene'})
    
    return boundaries
```

### 2.3 Theme Song Database

Pre-compute fingerprints for known OP/ED for popular anime (top 1000).

When a user watches an episode:
1. Fingerprint the audio at the start (first 3 min)
2. Match against OP/ED database
3. If matched: `intro_start = 0s, intro_end = OP_duration`
4. Detect silence/intensity shift after OP → find actual episode start
5. Return adjusted offset: `real_timestamp = video_time - OP_duration`

This solves the "different streams have different OP lengths" problem.

## 3. Timestamp Matching (No-Extension Mode)

### 3.1 Flow

```
User: "I want to watch episode 5 of Attack on Titan"
User pastes URL: https://crunchyroll.com/attack-on-titan/episode-5
                                                           
1. Extension OR paste-injected script detects video element
2. Captures 3 seconds of audio fingerprint
3. Sends to /api/ai/match-episode
   {
     "fingerprints": [12345, 67890, ...],
     "duration": 3.2,
     "source_url": "https://..."
   }
4. Server matches fingerprints against database
5. Returns:
   {
     "anime_id": "aot-001",
     "episode": 5,
     "confidence": 0.97,
     "offset": 132.5,          // seconds into episode
     "intro_skip": {"start": 0, "end": 90},
     "timeline": {
       "op": [0, 90],
       "scenes": [[90, 120], [120, 960], ...],
       "ed": [1380, 1440]
     }
   }
6. Room host sets canonical episode time
7. All viewers sync to same timeline
```

### 3.2 Handling Offsets (The Hard Part)

Different sources have different:
- OP/ED lengths (TV broadcast vs streaming)
- Commercial breaks (some have fade-outs)
- Title cards
- Preview segments

**Solution**: Two-phase matching

**Phase 1 – Coarse match** (fingerprint):
- Match fingerprints to identify exact episode
- Get approximate offset (±30s)

**Phase 2 – Fine alignment** (cross-correlation):
- Extract audio snippet from known position in episode
- Cross-correlate against user's audio stream
- Find exact sample offset
- Precision: ±50ms

### 3.3 Confidence Scoring

| Confidence | Action |
|---|---|
| > 0.95 | Auto-join room, set timestamp |
| 0.80 – 0.95 | Show suggestion, user confirms |
| 0.50 – 0.80 | Ask user "Is this the right episode?" |
| < 0.50 | Fall back to extension mode |

## 4. Taste Graph (Recommendation Engine)

### 4.1 Data Model

```sql
watch_events
├── user_id    : UUID
├── anime_id   : UUID
├── episode    : int
├── duration   : int        -- seconds watched
├── completed  : boolean
├── rating     : int?       -- 1-5 stars (optional)
├── timestamp  : timestamptz
├── room_id    : UUID?      -- watched with friends?
└── friends_in_room: UUID[] -- who was in the room

Index: (user_id, anime_id)
Index: (anime_id, completed)
```

### 4.2 Collaborative Filtering

```python
def recommend_for_user(user_id, limit=20):
    # 1. Find users with similar watch history
    similar_users = find_similar_users(user_id)
    
    # 2. Get what they watched that we haven't
    candidates = get_watched_anime(similar_users) - get_watched_anime(user_id)
    
    # 3. Score by similarity + popularity
    scores = {}
    for candidate in candidates:
        score = 0
        for similar_user in similar_users:
            similarity = user_similarity[user_id][similar_user]
            rating = get_rating(similar_user, candidate)
            score += similarity * (rating or 3.0)
        scores[candidate] = score / len(similar_users)
    
    # 4. Boost by social proof
    for candidate in candidates:
        friends_watched = count_friends_who_completed(user_id, candidate)
        scores[candidate] *= 1 + (friends_watched * 0.1)
    
    return sorted(scores, key=scores.get, reverse=True)[:limit]
```

### 4.3 Social Signals

- "3 of your friends finished this this week"
- "Alex and Sam are watching this right now"
- "People who watched episode 5 also watched episode 6 immediately"
- "Binge-score": % of users who watched next episode within 24h

## 5. Implementation Roadmap

### Phase 1 (Extension-based, now)
- Extension captures timestamp from video element
- Host broadcasts `sync:event` with timestamp
- No AI needed — works with any site

### Phase 2 (AI-assisted, 2-4 weeks after you train models)
- Audio fingerprint capture in extension
- Server-side matching against fingerprint DB
- Auto episode detection on URL change
- Confidence-scored suggestions

### Phase 3 (Extension-optional, 1-2 months)
- Paste-injected audio capture (no extension needed for sync)
- Full fingerprint database for top 500 anime
- Theme song detection for auto-skip-intro
- Scene detection for timeline-anchored reactions

### Phase 4 (Full AI, 3-6 months)
- Real-time translation + subtitle sync
- Visual scene detection via canvas
- Taste graph + social recommendations
- Predictive pre-loading ("you'll watch episode 6 next")

## Data Requirements for AI Training

### Fingerprint Model
- **Input**: 3-second audio clips at 44.1kHz, mono, 16-bit PCM
- **Output**: Episode ID + timestamp offset
- **Training data**: ~100 hours of labeled anime audio
- **Label format**: `{anime_id, episode, offset_ms}`
- **Augmentation**: Speed ±5%, volume ±3dB, white noise (SNR 20dB)

### Scene Detection Model
- **Input**: 30-second audio windows with 50% overlap
- **Output**: Scene boundary probability per frame
- **Training data**: ~500 hours with labeled OP/ED/scene boundaries
- **Label format**: `[{time: float, type: "op_start"|"op_end"|"scene"|"ed_start"|"ed_end"}]`

### Taste Graph
- **Input**: Watch events (user_id, anime_id, completed, duration, rating)
- **Output**: Ranked list of recommended anime_ids per user
- **Cold start**: Use metadata-based similarity (genre, studio, tags)
- **Warm start**: Collaborative filtering after 10+ watched episodes

---

*The AI system is SyncSaga's deepest moat. No general-purpose chat app (Discord) will build per-anime audio fingerprinting. No streaming site (Crunchyroll) will build cross-platform sync. This intersection is where SyncSaga becomes irreplaceable.*
