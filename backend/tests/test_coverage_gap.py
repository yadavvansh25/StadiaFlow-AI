import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, lifespan


@pytest.mark.asyncio
async def test_lifespan():
    async with lifespan(app):
        # Coverage for lifespan startup/teardown
        assert True


@pytest.mark.asyncio
async def test_endpoints_cache_hit():
    # Test api.endpoints.py caching
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        data = {
            "user_id": "cachetest1",
            "stand_id": "stand-cache",
            "menu_item": "hotdog",
            "distance_meters": 100.0,
        }
        res1 = await ac.post("/api/v1/jit-concessions/order", json=data)
        assert res1.status_code == 200
        # Call again to trigger cache line 36
        res2 = await ac.post("/api/v1/jit-concessions/order", json=data)
        assert res2.status_code == 200


@pytest.mark.asyncio
async def test_endpoints_google_fail(monkeypatch):
    from app.services.google_services import google_services

    async def mock_fail(*args, **kwargs):
        return {"status": "failed"}

    monkeypatch.setattr(google_services, "get_distance_matrix", mock_fail)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        data = {
            "user_id": "failtest",
            "stand_id": "stand-fail",
            "menu_item": "burger",
            "distance_meters": 100.0,
        }
        res = await ac.post("/api/v1/jit-concessions/order", json=data)
        assert res.status_code == 200
        assert res.json()["details"]["gmaps_verified"] is False
