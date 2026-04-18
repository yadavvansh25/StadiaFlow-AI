import pytest
from unittest.mock import patch
import importlib
import builtins


@pytest.mark.asyncio
async def test_vertex_ai_init_fail():
    from app.services.google_services import GoogleServicesIntegration
    import app.services.google_services

    app.services.google_services.GOOGLE_SERVICES_AVAILABLE = True
    with patch(
        "app.services.google_services.aiplatform.init",
        side_effect=Exception("mocked error"),
    ):
        service = GoogleServicesIntegration()
        service._initialize_services()


@pytest.mark.asyncio
async def test_import_error_google_services():
    from unittest.mock import patch

    # Store original import
    original_import = builtins.__import__

    def side_effect_import(name, *args, **kwargs):
        if name == "firebase_admin":
            raise ImportError("mocked import error")
        return original_import(name, *args, **kwargs)

    with patch("builtins.__import__", side_effect=side_effect_import):
        import app.services.google_services

        importlib.reload(app.services.google_services)
        assert app.services.google_services.GOOGLE_SERVICES_AVAILABLE is False

    # Restore for other tests
    importlib.reload(app.services.google_services)
