"""Tests for auth routes"""

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def app():
    from app.main import app
    return app


@pytest.mark.asyncio
async def test_health(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        resp = await client.get('/health')
        assert resp.status_code == 200
        data = resp.json()
        assert data['status'] == 'ok'
        assert data['service'] == 'syncsaga-backend'


@pytest.mark.asyncio
async def test_register(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        resp = await client.post('/api/auth/register', json={
            'username': 'testuser',
            'password': 'testpass123',
            'display_name': 'Test User',
        })
        assert resp.status_code in (200, 409)


@pytest.mark.asyncio
async def test_login_invalid(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        resp = await client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'wrong',
        })
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_unauthenticated(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        resp = await client.get('/api/auth/me')
        assert resp.status_code == 401
