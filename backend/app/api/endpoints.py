from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio
from typing import Dict, Any

router = APIRouter()

class ConcessionOrderContext(BaseModel):
    user_id: str
    stand_id: str
    menu_item: str
    distance_meters: float

@router.post("/jit-concessions/order")
async def place_jit_order(order: ConcessionOrderContext):
    """
    Simulates a Just-In-Time concession order trigger based on distance.
    If the user is within the 2-minute walking threshold (approx 150 meters),
    the order is 'fired' to the kitchen.
    """
    
    # Simple linear heuristic for ETA (e.g. 1.25 meters per second)
    eta_seconds = order.distance_meters / 1.25
    eta_minutes = round(eta_seconds / 60)
    
    if order.distance_meters <= 150:
        status = "PREPARING"
        message = "Kitchen triggered! Order will be hot and ready by the time you arrive."
    else:
        status = "QUEUED_VIRTUAL"
        message = "Order queued. Walk towards the stand to trigger preparation."
        
    return {
        "order_id": f"ORD-{order.user_id[:4]}-{order.stand_id}",
        "status": status,
        "eta_minutes": max(1, eta_minutes),
        "message": message,
        "details": {
            "stand": order.stand_id,
            "item": order.menu_item,
            "distance_left": f"{round(order.distance_meters)}m"
        }
    }
