import pytest
from app.services.google_services import GoogleServicesIntegration


@pytest.mark.asyncio
async def test_get_distance_matrix_mocked():
    service = GoogleServicesIntegration()
    service.gmaps_client = None  # Force mock behavior

    result = await service.get_distance_matrix("origin", "destination")

    assert result["status"] == "mocked"
    assert result["distance_meters"] == 150
    assert result["duration_seconds"] == 150 / 1.25


@pytest.mark.asyncio
async def test_analyze_crowd_density_mocked():
    service = GoogleServicesIntegration()
    # Assuming GOOGLE_SERVICES_AVAILABLE is False for this test or Vertex AI fails
    # Since we can't easily patch GOOGLE_SERVICES_AVAILABLE in a simple test without mock
    # we just run it and see default/mock behavior.
    global GOOGLE_SERVICES_AVAILABLE

    result = await service.analyze_crowd_density(b"fake data")

    assert "density_score" in result
    assert "confidence" in result
