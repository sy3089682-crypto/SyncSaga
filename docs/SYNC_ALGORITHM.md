# Sync Algorithm

## Overview

SyncSaga uses a Vector Clock synchronization system to keep all members of a watch room in perfect sync. The algorithm compensates for network latency, processing delay, and clock drift between different devices.

## Architecture

```
Client A ──sync:event──► Server ──sync:event──► Client B
     ▲                      │                       ▲
     │                      ▼                       │
     └──── sync:ping ◄──sync:pong ──────────────► sync:state
```

## Key Concepts

### Vector Clock
Each client maintains a logical clock that increments on every sync event. The host's clock is authoritative, but clients can detect missed updates by comparing clock values.

### RTT Measurement
1. Client sends `sync:ping` with `clientTime` (Date.now())
2. Server responds with `sync:pong` containing `clientTime`, `serverTime`, and `rtt`
3. Client maintains a rolling window of the last 10 RTT samples
4. Network latency is estimated as `averageRTT / 2`

### Drift Calculation
```
drift = |localTimestamp - (hostTimestamp + elapsedSinceLastSync) - networkLatency|
```

Where:
- `localTimestamp`: the client's current playback position
- `hostTimestamp`: the last authoritative timestamp from the host
- `elapsedSinceLastSync`: `Date.now() - lastSyncReceiveTime` / 1000
- `networkLatency`: `averageRTT / 2`

## Correction Strategies

| Drift Range | Strategy | Implementation |
|-------------|----------|----------------|
| `< 0.5s` | None | No action needed |
| `0.5s – 2s` | Speed adjustment | Set `playbackRate` to 0.95 or 1.05 to smoothly converge |
| `> 2s` | Hard seek | Immediately set `currentTime` to host's timestamp |

## Host Heartbeat

The host sends authoritative state every 5 seconds:
```typescript
{
  timestamp: number;        // Current playback position (seconds)
  playback_state: string;   // 'playing' | 'paused' | 'buffering'
  speed: number;            // Playback rate
  episode: string | null;   // Current episode identifier
  episode_number: number | null;
}
```

## Host Failover

When the host disconnects:
1. The socket disconnect handler detects the host is gone
2. The member with the lowest measured RTT is promoted
3. New host sends `sync:takeover` event with current timestamp
4. All clients re-sync to the new host within 3 seconds
5. The new host starts its own heartbeat interval

## Sync Lock Mode

When enabled by the host:
- No member can manually seek, play, or pause
- Only the host has playback controls
- Non-host seek/play/pause events are rejected with `NOT_HOST` error

## Drift Status Badges

Per-user sync status is broadcast as `sync:drift_update`:
- **Green** 🟢: Drift < 0.5s (in sync)
- **Yellow** 🟡: Drift 0.5–2s (slight drift)
- **Red** 🔴: Drift > 2s (desynced)

## Implementation Details

### Server (apps/api/src/socket/handlers/sync.handler.ts)
- Handles `sync:event`, `sync:request`, `sync:ping`, `sync:pong`, `sync:takeover`, `sync:lock`
- Tracks logical clocks per socket
- Manages host heartbeat intervals
- Broadcasts drift status updates

### Client (apps/web/src/hooks/useSyncEngine.ts)
- Measures RTT at 3-second intervals
- Processes `sync:state` events for drift calculation
- Applies speed adjustment or hard seek based on drift threshold
- Emits corrected timestamps back to server
