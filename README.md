# SyncSaga v2

**AI-Powered Cross-Source Anime Watch Party Platform**

Watch anime together with friends across different streaming sources. SyncSaga uses hybrid media intelligence (audio fingerprinting, visual matching, subtitle OCR, and timestamp detection) to synchronize playback across different encodes, ad-inserted streams, and speed differences.

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │   Backend    │    │  AI Service  │
│  (Next.js)   │◄──►│  (FastAPI)   │◄──►│  (FastAPI)   │
│   :3000      │    │   :8000      │    │   :8001      │
└──────────────┘    └──────┬───────┘    └──────┬───────┘
                           │                    │
                    ┌──────▼───────┐    ┌──────▼───────┐
                    │   PostgreSQL │    │    Qdrant    │
                    │   (pgvector) │    │  (Vector DB) │
                    └──────────────┘    └──────────────┘
                           │
                    ┌──────▼───────┐
                    │    Redis     │
                    │  (Pub/Sub)   │
                    └──────────────┘
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Python FastAPI, asyncpg, Celery, Redis
- **AI Services**: Audio fingerprinting, visual embeddings (OpenCLIP/FAISS), scene detection (PySceneDetect), subtitle OCR
- **Databases**: PostgreSQL with pgvector, Qdrant vector DB, Redis
- **Infrastructure**: Docker Compose, Prometheus monitoring

## Quick Start

```bash
# Clone and start all services
git clone https://github.com/sy3089682-crypto/SyncSaga.git
cd syncsaga-v2

# Copy environment config
cp .env.example .env

# Start with Docker
docker compose up --build

# Access:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - AI Service: http://localhost:8001
# - Prometheus: http://localhost:9090
```

## Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# AI Service
cd ai-services
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# Frontend
cd frontend
npm install
npm run dev

# Celery Worker
cd backend
celery -A app.workers.sync_worker worker --loglevel=info
```

## Hybrid Sync System

SyncSaga uses a multi-layered detection approach:

| Method | Priority | Latency | Use Case |
|--------|----------|---------|----------|
| Direct Timestamp | 1 (highest) | <100ms | Same source, no ads |
| Audio Fingerprint | 2 | 1-3s | Different encodes |
| Visual Matching | 3 | 2-5s | Ad-inserted streams |
| Subtitle OCR | 4 | 3-8s | Watermarked streams |
| Playback Prediction | 5 | instant | Between corrections |

Drift correction thresholds:
- **Soft correction** (<3s drift): Adjust playback rate to 1.03x to catch up
- **Hard correction** (>3s drift): Instant seek with re-sync
- **Auto-resync**: Every 4 seconds of playback

## Open Sync Protocol

SyncSaga defines an open protocol for cross-source synchronization:

### Sync Events
- `play` / `pause` — Playback state changes
- `seek` — Manual timeline navigation
- `rate_change` — Playback speed adjustment
- `sync_correction` — Automatic drift correction

### Scene Graph
All reactions, comments, clips, and sync events are anchored to **scene fingerprint IDs** rather than raw timestamps, enabling seamless cross-source sync regardless of encode differences.

## Project Structure

```
syncsaga-v2/
├── backend/
│   ├── app/
│   │   ├── api/routes/    # REST endpoints
│   │   ├── core/          # Config, database, redis
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   ├── ws/            # WebSocket manager
│   │   └── workers/       # Celery tasks
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── lib/           # API/WS clients
│   │   └── store/         # Zustand stores
│   └── Dockerfile
├── ai-services/
│   ├── fingerprint/       # Audio fingerprinting
│   ├── visual/            # Visual embeddings
│   ├── scene/             # Scene detection
│   └── subtitle/          # Subtitle intelligence
├── docker-compose.yml
└── infra/prometheus/
```