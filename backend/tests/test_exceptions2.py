from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_validation_error_distance():
    payload = {
        "user_id": "test_user",
        "stand_id": "STAND-1",
        "menu_item": "Soda",
        "distance_meters": -50.0,  # Invalid
    }
    response = client.post("/api/v1/jit-concessions/order", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"] == "Payload validation failed"
