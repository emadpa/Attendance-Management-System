from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AttendanceRequest(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    frame: str  # Base64 encoded image
    timestamp: str 

class AttendanceResponse(BaseModel):
    verified: bool
    confidence: float
    gate_passed: int
    rejection_reason: Optional[str] = None
    processing_time: float
    timestamp: str
