import pytest
import asyncio
from app.websockets.manager import ConnectionManager
from app.api.endpoints import ConcessionOrderContext
from fastapi import Request


class FailableWebsocket:
    def __init__(self):
        pass

    async def accept(self):
        pass

    @property
    def send_json(self):
        def _raise(*args, **kwargs):
            raise ValueError("Immediate exception")

        return _raise

    async def receive_json(self):
        pass


@pytest.mark.asyncio
async def test_manager_coverage():
    manager = ConnectionManager()

    # Broadcast All Exceptions
    fws = FailableWebsocket()
    await manager.connect(fws, "f1", "z1")
    await manager.broadcast_all({"test": "data"})  # hits 85-86 catch Exception

    # Simulator loop

    runs = 0

    async def mock_sleep(*args):
        nonlocal runs
        runs += 1
        if runs > 1:
            raise asyncio.CancelledError()

    from unittest.mock import patch

    with patch("asyncio.sleep", mock_sleep):
        try:
            await manager._simulator_loop()
        except asyncio.CancelledError:
            pass


@pytest.mark.asyncio
async def test_endpoints_exception(monkeypatch):
    from unittest.mock import MagicMock

    req = MagicMock(spec=Request)
    ctx = ConcessionOrderContext(
        user_id="123", stand_id="S-1", menu_item="BB", distance_meters=10.0
    )

    # Force exception inside endpoints
    def mock_dist(*args, **kwargs):
        raise ValueError("Intentional")

    import app.api.endpoints

    monkeypatch.setattr(
        app.api.endpoints.google_services, "get_distance_matrix", mock_dist
    )

    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        await app.api.endpoints.place_jit_order(req, ctx, None)


@pytest.mark.asyncio
async def test_google_services_init_exceptions(monkeypatch):
    import app.services.google_services

    module = app.services.google_services

    def raise_err(*args, **kwargs):
        raise Exception("Maps failed")

    # Test _initialize_services exception
    monkeypatch.setattr(module.googlemaps, "Client", raise_err)
    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", "dummy")

    # Also trigger Vertex AI init fail
    monkeypatch.setattr(module.aiplatform, "init", raise_err)

    s = module.GoogleServicesIntegration()  # hits Exception branch

    # Vertex Ai exception
    async def test_vertex_failure():
        # mock logger so we can see
        def raise_ai(*args, **kwargs):
            raise Exception("Vertex config error")

        monkeypatch.setattr(module.logger, "info", raise_ai)
        _res = await s.analyze_crowd_density(b"test")

        # restore

    await test_vertex_failure()
