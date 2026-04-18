from app.websockets.manager import ConnectionManager


def test_disconnect_non_existent():
    manager = ConnectionManager()
    manager.disconnect("non-existent-client")
    # Should not raise exception
