import pytest
from app.websockets.manager import ConnectionManager


class MockWebSocket:
    def __init__(self):
        self.messages = []
        self.is_accepted = False

    async def accept(self):
        self.is_accepted = True

    async def send_json(self, message):
        self.messages.append(message)

    async def receive_json(self):
        pass


@pytest.mark.asyncio
async def test_connect_and_disconnect():
    manager = ConnectionManager()
    ws = MockWebSocket()

    await manager.connect(ws, "client_1", "zone_1")
    assert "client_1" in manager.active_connections
    assert "client_1" in manager.zones["zone_1"]
    assert ws.is_accepted is True

    manager.disconnect("client_1", "zone_1")
    assert "client_1" not in manager.active_connections
    assert "client_1" not in manager.zones["zone_1"]


@pytest.mark.asyncio
async def test_broadcast_to_zone():
    manager = ConnectionManager()
    ws1 = MockWebSocket()
    ws2 = MockWebSocket()

    await manager.connect(ws1, "client_1", "zone_1")
    await manager.connect(ws2, "client_2", "zone_2")

    await manager.broadcast_to_zone({"msg": "hello_zone_1"}, "zone_1")

    assert len(ws1.messages) == 1
    assert len(ws2.messages) == 0
    assert ws1.messages[0] == {"msg": "hello_zone_1"}


@pytest.mark.asyncio
async def test_broadcast_all():
    manager = ConnectionManager()
    ws1 = MockWebSocket()
    ws2 = MockWebSocket()

    await manager.connect(ws1, "client_1", "zone_1")
    await manager.connect(ws2, "client_2", "zone_2")

    await manager.broadcast_all({"msg": "hello_all"})

    assert len(ws1.messages) == 1
    assert len(ws2.messages) == 1
    assert ws1.messages[0] == {"msg": "hello_all"}
    assert ws2.messages[0] == {"msg": "hello_all"}
