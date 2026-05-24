import httpx
from typing import Optional
import re
from urllib.parse import unquote


class AnimeMetadataService:
    ANILIST_API = "https://graphql.anilist.co"
    JIKAN_API = "https://api.jikan.moe/v4"
    CACHE_TTL = 3600

    def __init__(self):
        self._cache: dict[str, dict] = {}

    def _extract_title_candidate(self, text: str) -> str | None:
        raw = (text or "").strip()
        if not raw:
            return None
        raw = unquote(raw)
        raw = re.sub(r"https?://", "", raw, flags=re.IGNORECASE)
        raw = raw.replace("-", " ").replace("_", " ").replace("/", " ")
        raw = re.sub(r"\b(ep|episode|e)\s*\d+\b", " ", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\b\d{3,4}p\b", " ", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\b(bluray|bd|webrip|webdl|hdtv|x264|x265|hevc|aac)\b", " ", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s+", " ", raw).strip()
        if len(raw) < 2:
            return None
        return raw[:100]

    async def detect_anime(self, text: str) -> Optional[dict]:
        candidate = self._extract_title_candidate(text)
        if not candidate:
            return None
        results = await self.search_anime(candidate)
        return results[0] if results else None

    async def search_anime(self, query: str) -> list[dict]:
        cache_key = f"search:{query.lower()}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        async with httpx.AsyncClient() as client:
            resp = await client.post(self.ANILIST_API, json={
                "query": """
                    query ($search: String) {
                        Page(page: 1, perPage: 10) {
                            media(search: $search, type: ANIME) {
                                id
                                idMal
                                title { romaji english native }
                                episodes
                                duration
                                status
                                season
                                seasonYear
                                format
                                genres
                                averageScore
                                description(asHtml: false)
                                coverImage { large extraLarge }
                                bannerImage
                                startDate { year month day }
                                studios(isMain: true) { nodes { name } }
                                externalLinks { url site }
                                nextAiringEpisode { timeUntilAiring episode airingAt }
                            }
                        }
                    }
                """,
                "variables": {"search": query},
            })
            data = resp.json()
            results = []
            for media in data.get("data", {}).get("Page", {}).get("media", []):
                results.append(self._format_anilist(media))
            self._cache[cache_key] = results
            return results

    async def get_anime(self, anime_id: int) -> Optional[dict]:
        cache_key = f"anime:{anime_id}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        async with httpx.AsyncClient() as client:
            resp = await client.post(self.ANILIST_API, json={
                "query": """
                    query ($id: Int) {
                        Media(id: $id, type: ANIME) {
                            id idMal
                            title { romaji english native }
                            episodes duration status season seasonYear format
                            genres averageScore description(asHtml: false)
                            coverImage { large extraLarge }
                            bannerImage
                            startDate { year month day }
                            studios(isMain: true) { nodes { name } }
                            externalLinks { url site }
                            nextAiringEpisode { timeUntilAiring episode airingAt }
                            recommendations(page: 1, perPage: 5) {
                                nodes { mediaRecommendation { id title { romaji } } }
                            }
                        }
                    }
                """,
                "variables": {"id": anime_id},
            })
            data = resp.json().get("data", {}).get("Media")
            if data:
                result = self._format_anilist(data)
                if result.get("id_mal"):
                    result["mal_score"] = await self.get_mal_score(int(result["id_mal"]))
                self._cache[cache_key] = result
                return result
            return None

    async def get_episode_metadata(self, anime_id: int, episode: int) -> Optional[dict]:
        episodes = await self.get_episode_list(anime_id)
        idx = max(0, episode - 1)
        if idx < len(episodes):
            return episodes[idx]
        return {"episode": episode, "episode_number": episode, "title": f"Episode {episode}"}

    async def search_jikan(self, query: str) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.JIKAN_API}/anime",
                params={"q": query, "limit": 10}
            )
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                return [{
                    "id": a.get("mal_id"),
                    "title": a.get("title", ""),
                    "title_english": a.get("title_english", ""),
                    "type": a.get("type"),
                    "episodes": a.get("episodes"),
                    "score": a.get("score"),
                    "status": a.get("status"),
                    "synopsis": a.get("synopsis"),
                    "image_url": a.get("images", {}).get("jpg", {}).get("large_image_url"),
                } for a in data]
            return []

    async def get_opening_list(self, anime_id: int) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.JIKAN_API}/anime/{anime_id}/themes")
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                openings = data.get("openings", [])
                return [{"text": o, "type": "opening"} for o in openings]
            return []

    async def get_ending_list(self, anime_id: int) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.JIKAN_API}/anime/{anime_id}/themes")
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                endings = data.get("endings", [])
                return [{"text": e, "type": "ending"} for e in endings]
            return []

    async def get_trending(self) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(self.ANILIST_API, json={
                "query": """
                    query {
                        Page(page: 1, perPage: 20) {
                            media(type: ANIME, sort: TRENDING_DESC) {
                                id title { romaji english }
                                episodes format averageScore
                                coverImage { large }
                                season seasonYear
                            }
                        }
                    }
                """,
            })
            data = resp.json().get("data", {}).get("Page", {}).get("media", [])
            return [{
                "id": m["id"],
                "title": m["title"].get("romaji") or m["title"].get("english", ""),
                "episodes": m.get("episodes"),
                "format": m.get("format"),
                "score": m.get("averageScore"),
                "image": m.get("coverImage", {}).get("large"),
            } for m in data]

    async def get_mal_score(self, mal_id: int) -> Optional[float]:
        cache_key = f"mal:{mal_id}:score"
        if cache_key in self._cache:
            return self._cache[cache_key]
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.JIKAN_API}/anime/{mal_id}")
            if resp.status_code == 200:
                score = resp.json().get("data", {}).get("score")
                self._cache[cache_key] = score
                return score
        return None

    async def get_episode_list(self, mal_id: int, limit_pages: int = 10) -> list[dict]:
        cache_key = f"mal:{mal_id}:episodes"
        if cache_key in self._cache:
            return self._cache[cache_key]

        episodes: list[dict] = []
        page = 1
        async with httpx.AsyncClient() as client:
            while page <= limit_pages:
                resp = await client.get(f"{self.JIKAN_API}/anime/{mal_id}/episodes", params={"page": page})
                if resp.status_code != 200:
                    break
                payload = resp.json()
                data = payload.get("data", [])
                for i, ep in enumerate(data):
                    episode_number = len(episodes) + i + 1
                    episodes.append({
                        "episode": episode_number,
                        "episode_number": episode_number,
                        "title": ep.get("title") or f"Episode {episode_number}",
                        "title_japanese": ep.get("title_japanese") or "",
                        "aired": ep.get("aired"),
                        "filler": bool(ep.get("filler", False)),
                        "recap": bool(ep.get("recap", False)),
                        "forum_url": ep.get("forum_url"),
                        "thumbnail_url": None,
                    })
                pagination = payload.get("pagination", {}) or {}
                if not pagination.get("has_next_page"):
                    break
                page += 1

        self._cache[cache_key] = episodes
        return episodes

    async def get_characters(self, mal_id: int) -> list[dict]:
        cache_key = f"mal:{mal_id}:characters"
        if cache_key in self._cache:
            return self._cache[cache_key]
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.JIKAN_API}/anime/{mal_id}/characters")
            if resp.status_code != 200:
                return []
            data = resp.json().get("data", [])
            chars: list[dict] = []
            for c in data[:50]:
                character = c.get("character", {}) or {}
                voice_actors = c.get("voice_actors", []) or []
                chars.append({
                    "name": character.get("name"),
                    "role": c.get("role"),
                    "image_url": (character.get("images", {}) or {}).get("jpg", {}).get("image_url"),
                    "voice_actors": [{
                        "name": (va.get("person", {}) or {}).get("name"),
                        "language": va.get("language"),
                        "image_url": ((va.get("person", {}) or {}).get("images", {}) or {}).get("jpg", {}).get("image_url"),
                    } for va in voice_actors[:5]],
                })
            self._cache[cache_key] = chars
            return chars

    def _format_anilist(self, media: dict) -> dict:
        title = media.get("title", {})
        next_airing = media.get("nextAiringEpisode")
        return {
            "id": media.get("id"),
            "id_mal": media.get("idMal"),
            "title_romaji": title.get("romaji"),
            "title_english": title.get("english"),
            "title_native": title.get("native"),
            "episodes": media.get("episodes"),
            "duration": media.get("duration"),
            "status": media.get("status"),
            "season": media.get("season"),
            "season_year": media.get("seasonYear"),
            "format": media.get("format"),
            "genres": media.get("genres", []),
            "score": media.get("averageScore"),
            "description": media.get("description"),
            "cover_image": media.get("coverImage", {}).get("extraLarge") or media.get("coverImage", {}).get("large"),
            "banner_image": media.get("bannerImage"),
            "studios": [s["name"] for s in (media.get("studios", {}).get("nodes", []))],
            "external_links": media.get("externalLinks", []),
            "start_date": media.get("startDate"),
            "next_airing_episode": next_airing,
        }

    def clear_cache(self):
        self._cache.clear()


anime_metadata = AnimeMetadataService()
