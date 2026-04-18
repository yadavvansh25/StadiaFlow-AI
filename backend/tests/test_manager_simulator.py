import pytest
import asyncio
from app.websockets.manager import ConnectionManager


@pytest.mark.asyncio
async def test_start_simulator():
    manager = ConnectionManager()
    manager.start_simulator()
    await asyncio.sleep(0.1)  # just let it start
    # No assert needed, just ensuring it starts without error
