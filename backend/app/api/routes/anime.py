from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.anime_metadata import anime_metadata

router = APIRouter(prefix="/api/anime", tags=["anime"])

class DetectRequest(BaseModel):
    text: str


@router.get("/search")
async def search_anime(q: str = Query(..., min_length=1)):
    results = await anime_metadata.search_anime(q)
    if not results:
        results = await anime_metadata.search_jikan(q)
    return {"results": results, "count": len(results)}

@router.post("/detect")
async def detect_anime(req: DetectRequest):
    result = await anime_metadata.detect_anime(req.text)
    if not result:
        raise HTTPException(404, "Anime not found")
    return result


@router.get("/{anime_id}")
async def get_anime(anime_id: int):
    result = await anime_metadata.get_anime(anime_id)
    if not result:
        raise HTTPException(404, "Anime not found")
    return result

@router.get("/{mal_id}/episodes")
async def get_episode_list(mal_id: int):
    return {"episodes": await anime_metadata.get_episode_list(mal_id)}

@router.get("/{mal_id}/characters")
async def get_characters(mal_id: int):
    return {"characters": await anime_metadata.get_characters(mal_id)}


@router.get("/{anime_id}/episode/{episode}")
async def get_episode(anime_id: int, episode: int):
    return await anime_metadata.get_episode_metadata(anime_id, episode)


@router.get("/{anime_id}/openings")
async def get_openings(anime_id: int):
    return {"openings": await anime_metadata.get_opening_list(anime_id)}


@router.get("/{anime_id}/endings")
async def get_endings(anime_id: int):
    return {"endings": await anime_metadata.get_ending_list(anime_id)}


@router.get("/trending")
async def get_trending():
    return {"trending": await anime_metadata.get_trending()}


@router.post("/cache/clear")
async def clear_cache():
    anime_metadata.clear_cache()
    return {"status": "cleared"}
