from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_validation_error():
    payload = {
        "user_id": "test_user",
        "stand_id": "STAND-1",
    }
    # missing fields will trigger ValidationError handled by custom exception handler
    response = client.post("/api/v1/jit-concessions/order", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"] == "Payload validation failed"
    assert "errors" in response.json()
