import asyncio
import time
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket
import random

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user/device ID to WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Maps zones (e.g. "concourse_a") to a set of user IDs
        self.zones: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str, zone: str = "general"):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        if zone not in self.zones:
            self.zones[zone] = set()
        self.zones[zone].add(client_id)
        logger.info(f"Client {client_id} connected to zone '{zone}'. Total connections: {len(self.active_connections)}")
        
    def disconnect(self, client_id: str, zone: str = "general"):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if zone in self.zones and client_id in self.zones[zone]:
            self.zones[zone].remove(client_id)

    async def send_personal_message(self, message: Any, client_id: str):
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(client_id)

    async def broadcast_to_zone(self, message: Any, zone: str):
        if zone in self.zones:
            disconnected = []
            tasks = []
            for client_id in list(self.zones[zone]):
                if client_id in self.active_connections:
                    ws = self.active_connections[client_id]
                    tasks.append(ws.send_json(message))
                else:
                    disconnected.append(client_id)
            # Clean up stale references
            for cid in disconnected:
                self.zones[zone].discard(cid)
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast_all(self, message: Any):
        """Broadcast a message to ALL connected clients across ALL zones."""
        tasks = []
        for client_id, ws in list(self.active_connections.items()):
            try:
                tasks.append(ws.send_json(message))
            except Exception:
                pass
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _simulator_loop(self):
        """Simulate YOLO density events and broadcast anomalies to all connected clients."""
        locations = [
            "Concourse A", "Concourse B", "Concourse C", 
            "Gate North", "Gate South", "Gate East",
            "Sector 104", "Sector 110", "Main Entry"
        ]
        while True:
            await asyncio.sleep(5)  # Emit every 5 seconds
            
            concourse = random.choice(locations)
            density = random.randint(40, 95)
            
            payload = {
                "type": "CROWD_DENSITY_UPDATE",
                "data": {
                    "location": concourse,
                    "density_percent": density,
                    "status": "CRITICAL" if density > 85 else "WARNING" if density > 70 else "NORMAL",
                    "timestamp": time.time()
                }
            }
            
            # Broadcast to ALL connected clients regardless of zone
            await self.broadcast_all(payload)

    def start_simulator(self):
        asyncio.create_task(self._simulator_loop())

manager = ConnectionManager()
