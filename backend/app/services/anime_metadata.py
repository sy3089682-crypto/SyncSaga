import httpx
from typing import Optional


class AnimeMetadataService:
    ANILIST_API = "https://graphql.anilist.co"
    JIKAN_API = "https://api.jikan.moe/v4"
    CACHE_TTL = 3600

    def __init__(self):
        self._cache: dict[str, dict] = {}

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
                self._cache[cache_key] = result
                return result
            return None

    async def get_episode_metadata(self, anime_id: int, episode: int) -> Optional[dict]:
        async with httpx.AsyncClient() as client:
            jikan_resp = await client.get(
                f"{self.JIKAN_API}/anime/{anime_id}/episodes",
                params={"page": max(1, episode // 100 + 1)}
            )
            if jikan_resp.status_code == 200:
                data = jikan_resp.json()
                for ep in data.get("data", []):
                    if ep.get("mal_id") == episode:
                        return {
                            "episode": episode,
                            "title": ep.get("title", ""),
                            "title_japanese": ep.get("title_japanese", ""),
                            "aired": ep.get("aired"),
                            "score": ep.get("score"),
                            "filler": ep.get("filler", False),
                            "recap": ep.get("recap", False),
                            "forum_url": ep.get("forum_url"),
                        }
        return {"episode": episode, "title": f"Episode {episode}"}

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

    def _format_anilist(self, media: dict) -> dict:
        title = media.get("title", {})
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
        }

    def clear_cache(self):
        self._cache.clear()


anime_metadata = AnimeMetadataService()
