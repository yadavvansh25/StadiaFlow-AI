from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.websockets.manager import manager
from app.api.endpoints import router as api_router
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
    description="Backend for StadiaFlow AI – The Living Stadium Orchestration System",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to StadiaFlow AI Engine"}

@app.get("/health")
async def health_check():
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

