import pytest
from app.websockets.manager import ConnectionManager
import asyncio


class MockWebsocket:
    async def accept(self):
        pass

    async def send_json(self, data):
        pass


class MockExceptionWebsocket:
    async def accept(self):
        pass

    async def send_json(self, data):
        raise Exception("Failed")


@pytest.mark.asyncio
async def test_manager_broadcast_to_zone_exceptions():
    manager = ConnectionManager()
    ws1 = MockWebsocket()
    ws2 = MockExceptionWebsocket()

    await manager.connect(ws1, "c1", "zone1")
    await manager.connect(ws2, "c2", "zone1")

    # Manually remove one to trigger disconnected append
    del manager.active_connections["c1"]

    # Broadcast to trigger wait tasks
    await manager.broadcast_to_zone({"msg": "hello"}, "zone1")

    # Verify c2 is cleaned up or exception ignored, c1 is discarded
    assert "c1" not in manager.zones["zone1"]


@pytest.mark.asyncio
async def test_manager_broadcast_all_exceptions():
    manager = ConnectionManager()
    ws1 = MockExceptionWebsocket()
    await manager.connect(ws1, "fail_client", "zone_test")
    await manager.broadcast_all({"msg": "hello"})


@pytest.mark.asyncio
async def test_manager_simulator_loop():
    manager = ConnectionManager()

    # Let the loop run exactly one iteration
    from unittest.mock import patch

    async def mock_sleep(seconds):
        raise asyncio.CancelledError()  # Break the infinite loop!

    with patch("asyncio.sleep", mock_sleep):
        try:
            await manager._simulator_loop()
        except asyncio.CancelledError:
            pass
