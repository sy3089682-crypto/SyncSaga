"""
Scene Graph System

SyncSaga's core moat: all sync events, reactions, clips, and comments
are anchored to Scene Fingerprint IDs rather than raw timestamps.

This enables cross-source synchronization across different encodes,
ad-inserted streams, and speed differences.

Structure:
    Anime
    └── Episode
        └── Scene
              ├── fingerprint (audio + visual hash)
              ├── dialogue (subtitle text)
              ├── characters (from scene context)
              ├── emotion (hype/sad/shock/action)
              ├── op_ed_flag
              ├── sync_events (anchored to scene_id)
              ├── reactions (anchored to scene_id)
              └── clips (scene boundaries)

The Scene Graph allows:
    - Cross-source timestamp resolution
    - Scene-based reactions and comments
    - Emotional heatmaps
    - Clip generation from scene boundaries
    - OP/ED skipping
    - Next-episode flow
"""

from typing import Optional
from app.core.redis import redis_sync


class SceneGraph:
    def __init__(self):
        self._scenes: dict[str, dict] = {}
        self._edges: dict[str, list[str]] = {}

    async def add_scene(self, episode_id: str, scene: dict) -> str:
        scene_id = scene.get("id") or f"scene_{episode_id}_{scene.get('scene_number', 0)}"
        scene["id"] = scene_id
        scene["episode_id"] = episode_id

        if episode_id not in self._edges:
            self._edges[episode_id] = []
        self._edges[episode_id].append(scene_id)
        self._scenes[scene_id] = scene

        await redis_sync.redis.set(
            f"scene:{scene_id}",
            str(scene),
            ex=86400 * 30,
        )
        return scene_id

    async def get_scene(self, scene_id: str) -> Optional[dict]:
        return self._scenes.get(scene_id)

    async def get_episode_scenes(self, episode_id: str) -> list[dict]:
        scene_ids = self._edges.get(episode_id, [])
        return [self._scenes[sid] for sid in scene_ids if sid in self._scenes]

    async def get_scene_for_timestamp(self, episode_id: str, timestamp_sec: float) -> Optional[dict]:
        scenes = await self.get_episode_scenes(episode_id)
        for scene in sorted(scenes, key=lambda s: s.get("start_time", 0)):
            if scene.get("start_time", 0) <= timestamp_sec <= scene.get("end_time", float("inf")):
                return scene
        return None

    async def get_scene_by_fingerprint(self, audio_hash: str, visual_hash: str) -> Optional[dict]:
        for scene_id, scene in self._scenes.items():
            sf = scene.get("fingerprint", {})
            if sf.get("audio_hash") == audio_hash and sf.get("visual_hash") == visual_hash:
                return scene
        return None

    async def add_reaction(self, scene_id: str, user_id: str, emoji: str):
        scene = self._scenes.get(scene_id)
        if not scene:
            return
        if "reactions" not in scene:
            scene["reactions"] = {}
        if emoji not in scene["reactions"]:
            scene["reactions"][emoji] = []
        scene["reactions"][emoji].append(user_id)

    async def get_scene_reactions(self, scene_id: str) -> dict:
        scene = self._scenes.get(scene_id, {})
        return scene.get("reactions", {})

    async def compute_emotion_heatmap(self, episode_id: str) -> list[dict]:
        scenes = await self.get_episode_scenes(episode_id)
        heatmap = []
        for scene in scenes:
            reactions = scene.get("reactions", {})
            total_reacts = sum(len(v) for v in reactions.values())
            emotion_score = min(total_reacts / 10, 1.0)
            heatmap.append({
                "scene_id": scene.get("id"),
                "scene_number": scene.get("scene_number"),
                "start_time": scene.get("start_time"),
                "end_time": scene.get("end_time"),
                "reaction_count": total_reacts,
                "emotion_score": emotion_score,
                "top_emojis": sorted(
                    reactions.items(), key=lambda x: len(x[1]), reverse=True
                )[:5] if reactions else [],
            })
        return heatmap

    async def get_episode_graph(self, episode_id: str) -> dict:
        scenes = await self.get_episode_scenes(episode_id)
        return {
            "episode_id": episode_id,
            "scene_count": len(scenes),
            "total_duration": sum(s.get("duration", 0) for s in scenes) if scenes else 0,
            "opening": next((s for s in scenes if s.get("is_opening")), None),
            "ending": next((s for s in scenes if s.get("is_ending")), None),
            "scenes": [
                {
                    "id": s.get("id"),
                    "number": s.get("scene_number"),
                    "start": s.get("start_time"),
                    "end": s.get("end_time"),
                    "duration": s.get("duration"),
                    "is_opening": s.get("is_opening", False),
                    "is_ending": s.get("is_ending", False),
                    "reaction_count": sum(len(v) for v in s.get("reactions", {}).values()),
                }
                for s in scenes
            ],
        }

    async def resolve_cross_source_timestamp(
        self, source_scene_id: str, source_timestamp: float
    ) -> Optional[dict]:
        source_scene = self._scenes.get(source_scene_id)
        if not source_scene:
            return None

        scene_start = source_scene.get("start_time", 0)
        scene_duration = source_scene.get("duration", 0)
        offset_within_scene = source_timestamp - scene_start if scene_duration > 0 else 0
        offset_within_scene = max(0, min(offset_within_scene, scene_duration))

        return {
            "scene_id": source_scene_id,
            "scene_number": source_scene.get("scene_number"),
            "offset_within_scene": round(offset_within_scene, 3),
            "scene_start": scene_start,
            "scene_duration": scene_duration,
            "resolved_timestamp": round(scene_start + offset_within_scene, 3),
            "method": "scene_graph",
        }

    async def build_from_scenes(self, episode_id: str, scenes: list[dict]):
        for scene in scenes:
            await self.add_scene(episode_id, scene)


scene_graph = SceneGraph()
