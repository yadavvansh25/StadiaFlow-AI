from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "connections" in response.json()


def test_root_endpoint():
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_jit_concessions_order_success_nearby():
    """Test JIT concession order when user is nearby (<= 150m)."""
    payload = {
        "user_id": "test_user123",
        "stand_id": "STAND-A",
        "menu_item": "Hotdog",
        "distance_meters": 100.0,
    }
    response = client.post("/api/v1/jit-concessions/order", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PREPARING"
    assert data["eta_minutes"] >= 1
    assert data["details"]["stand"] == "STAND-A"


def test_jit_concessions_order_success_far():
    """Test JIT concession order when user is far (> 150m)."""
    payload = {
        "user_id": "test_user123",
        "stand_id": "STAND-B",
        "menu_item": "Burger",
        "distance_meters": 300.0,
    }
    response = client.post("/api/v1/jit-concessions/order", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "QUEUED_VIRTUAL"


def test_jit_concessions_order_validation_error():
    """Test validation constraints on JIT concession endpoint."""
    # Invalid user_id (too short)
    payload = {
        "user_id": "ab",
        "stand_id": "STAND-A",
        "menu_item": "Hotdog",
        "distance_meters": 100.0,
    }
    response = client.post("/api/v1/jit-concessions/order", json=payload)
    assert response.status_code == 422  # Unprocessable Entity

    # Distance less than 0
    payload["user_id"] = "test_user"
    payload["distance_meters"] = -10.0
    response = client.post("/api/v1/jit-concessions/order", json=payload)
    assert response.status_code == 422


# Testing WebSockets
def test_websocket_connection():
    """Test WebSocket connection and echo functionality."""
    client_id = "test_client_001"
    zone = "test_zone"
    with client.websocket_connect(f"/ws/{client_id}?zone={zone}") as websocket:
        # Test basic connection
        assert websocket is not None

        # Test echoing/processing message
        test_payload = {"action": "ping"}
        websocket.send_json(test_payload)

        response = websocket.receive_json()
        assert response["ack"] is True
        assert response["received"] == test_payload
