from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AttendanceRequest(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    frame: str  # Base64 encoded image
    timestamp: str
    # NEW: For blink challenge
    blink_challenge_frames: Optional[List[str]] = None  # List of base64 frames
    challenge_duration: Optional[float] = 3.0  # Duration in seconds

class AttendanceResponse(BaseModel):
    verified: bool
    confidence: float
    gate_passed: int
    rejection_reason: Optional[str] = None
    processing_time: float
    timestamp: str
    # NEW: Blink detection details
    blink_detected: Optional[bool] = None
    ear_values: Optional[List[float]] = None  # EAR progression