import pytest
from app.websockets.manager import ConnectionManager


class MockExceptionWebSocket:
    async def send_json(self, message):
        raise Exception("Mock error")


@pytest.mark.asyncio
async def test_send_personal_message_exception():
    manager = ConnectionManager()
    ws = MockExceptionWebSocket()
    manager.active_connections["client_err"] = ws

    await manager.send_personal_message({"test": "data"}, "client_err")
    assert "client_err" not in manager.active_connections
