from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.websockets.manager import manager
from app.api.endpoints import router as api_router
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



# Use lifespan per modern FastAPI to start background tasks
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("Initializing StadiaFlow WebSocket Simulation Engine...")
    manager.start_simulator()
    yield
    # Shutdown tasks
    logger.info("Shutting down engine...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend for StadiaFlow AI – The Living Stadium Orchestration System. Includes Crowd Routing and JIT Concessions.",
    contact={
        "name": "StadiaFlow Engineering",
        "url": "https://stadiaflow.com",
    },
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Attach rate limiter to app structure
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Secure exception handler that prevents information leakage on validation errs."""
    return JSONResponse(
        status_code=422,
        content={"detail": "Payload validation failed", "errors": exc.errors()},
    )


# CORS setup - Restrict origins in production (using specific from settings or falling back)
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://stadiaflow-frontend-901391666143.asia-south1.run.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
@limiter.limit("20/minute")
async def root(request: Request):
    """
    Root endpoint verifying API readiness.
    Rate limited to 20 requests per minute to prevent abuse.
    """
    return {"message": "Welcome to StadiaFlow AI Engine"}

@app.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    """
    Health check endpoint utilized by load balancers and container orchestrators.
    Returns status and current active WebSocket connection metrics.
    """
    return {"status": "healthy", "connections": len(manager.active_connections)}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, zone: str = "general"):
    """
    Primary real-time connection for Crowd-Aware Routing and Just-In-Time Concessions.
    100,000+ concurrency target.
    """
    await manager.connect(websocket, client_id, zone)
    try:
        while True:
            # Wait for any incoming messages from the client
            data = await websocket.receive_json()
            logger.info(f"Received data from {client_id} in {zone}: {data}")
            
            # Simple echo or process
            response = {"ack": True, "received": data}
            await manager.send_personal_message(response, client_id)
            
    except WebSocketDisconnect:
        manager.disconnect(client_id, zone)
        logger.info(f"Client #{client_id} left zone: {zone}")

