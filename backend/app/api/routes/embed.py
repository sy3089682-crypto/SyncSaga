"""API Routes — Embed & Widget"""

from fastapi import APIRouter, Response
from uuid import UUID

router = APIRouter()


@router.get("/room/{room_id}")
async def embed_room(room_id: UUID):
    return {
        "room": {"id": str(room_id), "name": "Embedded Room"},
        "embed": {"theme": "dark", "features": ["chat", "voice", "sync"]},
    }


@router.get("/widget/{room_id}")
async def embed_widget(room_id: UUID):
    js = f"""
(function() {{
    var container = document.createElement('div');
    container.id = 'syncsaga-embed';
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';
    var iframe = document.createElement('iframe');
    iframe.src = '{embed_url}/embed/' + '{room_id}';
    iframe.style.cssText = 'width:320px;height:480px;border:none;border-radius:12px;';
    container.appendChild(iframe);
    document.body.appendChild(container);
}})();
"""
    return Response(content=js, media_type="application/javascript")
