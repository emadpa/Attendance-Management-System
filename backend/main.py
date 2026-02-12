from fastapi import FastAPI, HTTPException, status
import uvicorn
from contextlib import asynccontextmanager
import time
from datetime import datetime
import numpy as np
import json
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

from .models import AttendanceRequest, AttendanceResponse
from .core.utils import decode_image
from .core.gates import (
    gate_location, 
    gate_texture, 
    gate_liveness, 
    gate_liveness_batch,
    gate_recognition, 
    load_models,
    check_blink_complete,
    reset_blink_challenge,
    get_blink_status,
    generate_face_encoding
)

 

# ============================================================================
# DATABASE SETUP - Load from JSON file
# ============================================================================

ENCODINGS_FILE = Path(__file__).resolve().parent.parent / "user_encodings.json"
print(ENCODINGS_FILE)

def load_user_database():
    """
    Load user face encodings from JSON file.
    
    Returns:
        dict: {user_id: [encoding1, encoding2, ...]}
    """
    if not ENCODINGS_FILE.exists():
        print(f"⚠️  No encodings file found at {ENCODINGS_FILE}")
        print("   Run register_local_users.py to register users first")
        return {}
    
    try:
        with open(ENCODINGS_FILE, 'r') as f:
            db = json.load(f)
        print(f"✅ Loaded {len(db)} users from {ENCODINGS_FILE}")
        for user_id, encodings in db.items():
            print(f"   → {user_id}: {len(encodings)} encoding(s)")
        return db
    except json.JSONDecodeError as e:
        print(f"❌ Error reading encodings file: {e}")
        return {}
    except Exception as e:
        print(f"❌ Unexpected error loading database: {e}")
        return {}


def save_user_database(db):
    """
    Save user face encodings to JSON file.
    
    Args:
        db: dict {user_id: [encoding1, encoding2, ...]}
    """
    try:
        with open(ENCODINGS_FILE, 'w') as f:
            json.dump(db, f, indent=2)
        print(f"💾 Saved {len(db)} users to {ENCODINGS_FILE}")
    except Exception as e:
        print(f"❌ Error saving database: {e}")


# Global user database - loaded on startup
USER_DB = {}


# ============================================================================
# APPLICATION LIFECYCLE
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager.
    Loads ML models and user database on startup.
    Saves database and cleans up on shutdown.
    """
    global USER_DB

    # Startup
    print("\n" + "="*50)
    print("🚀 Starting Real-Time Attendance System")
    print("="*50)

    print("\n📦 Loading face recognition models...")
    load_models()
    print("✅ Models loaded successfully!")

    print("\n📂 Loading user database...")
    USER_DB = load_user_database()

    if not USER_DB:
        print("\n⚠️  WARNING: No users registered!")
        print("   Run: python register_local_users.py")
    else:
        print(f"\n✅ System ready with {len(USER_DB)} registered user(s)")
    
    print("="*50 + "\n")
    
    yield
    
    # Shutdown
    print("\n" + "="*50)
    print("🔒 Shutting down...")
    save_user_database(USER_DB)
    print("✅ Database saved. Goodbye!")
    print("="*50)


# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Real-Time Attendance System",
    description="Multi-gate face recognition system with liveness detection",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Real-Time Attendance System",
        "version": "1.0.0",
        "registered_users": len(USER_DB),
        "users": list(USER_DB.keys())  # Remove in production
    }


# ============================================================================
# MAIN VERIFICATION ENDPOINT
# ============================================================================

@app.post("/api/verify-attendance", response_model=AttendanceResponse)
async def verify_attendance(request: AttendanceRequest):
    start_time = time.time()

    # ========================================================================
    # GATE 1: LOCATION VERIFICATION
    # ========================================================================
    loc_valid, loc_msg, dist = gate_location(request.latitude, request.longitude)

    if not loc_valid:
        return AttendanceResponse(
            verified=False,
            confidence=0.0,
            gate_passed=0,
            rejection_reason=loc_msg,
            processing_time=time.time() - start_time,
            timestamp=datetime.now().isoformat(),
            debug_info={
                "distance_meters": float(dist),
                "threshold_meters": 4000
            }
        )

    # ========================================================================
    # DECODE PRIMARY IMAGE
    # ========================================================================
    try:
        frame = decode_image(request.frame)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image data: {str(e)}"
        )

    # ========================================================================
    # GATE 2: ANTI-SPOOFING (Texture Analysis)
    # ========================================================================
    tex_valid, tex_msg, variance = gate_texture(frame)

    if not tex_valid:
        return AttendanceResponse(
            verified=False,
            confidence=0.0,
            gate_passed=1,
            rejection_reason=tex_msg,
            processing_time=time.time() - start_time,
            timestamp=datetime.now().isoformat(),
            debug_info={
                "texture_variance": float(variance),
                "expected_range": "20-250"
            }
        )

    # ========================================================================
    # GATE 3: LIVENESS DETECTION (Blink Challenge)
    # ========================================================================
    if hasattr(request, 'blink_challenge_frames') and request.blink_challenge_frames:
        # MULTI-FRAME MODE
        try:
            challenge_frames = []
            for i, frame_b64 in enumerate(request.blink_challenge_frames):
                try:
                    decoded_frame = decode_image(frame_b64)
                    challenge_frames.append(decoded_frame)
                except Exception as e:
                    return AttendanceResponse(
                        verified=False,
                        confidence=0.0,
                        gate_passed=2,
                        rejection_reason=f"Failed to decode frame {i+1}: {str(e)}",
                        processing_time=time.time() - start_time,
                        timestamp=datetime.now().isoformat()
                    )

            live_valid, live_msg, live_details = gate_liveness_batch(
                frames=challenge_frames,
                ear_threshold=0.21,
                min_blink_frames=1  # Lenient: 1 frame is enough
            )

            if not live_valid:
                return AttendanceResponse(
                    verified=False,
                    confidence=0.0,
                    gate_passed=2,
                    rejection_reason=live_msg,
                    processing_time=time.time() - start_time,
                    timestamp=datetime.now().isoformat(),
                    debug_info=live_details
                )

            print(f"✅ Blink detected for user: {request.user_id}")

        except Exception as e:
            return AttendanceResponse(
                verified=False,
                confidence=0.0,
                gate_passed=2,
                rejection_reason=f"Liveness check error: {str(e)}",
                processing_time=time.time() - start_time,
                timestamp=datetime.now().isoformat()
            )

    else:
        # SINGLE-FRAME STREAMING MODE
        is_first_frame = not hasattr(request, 'challenge_in_progress')

        if is_first_frame:
            reset_blink_challenge(request.user_id)

        live_valid, live_msg, ear = gate_liveness(
            frame=frame,
            user_id=request.user_id,
            ear_threshold=0.21,
            timeout_seconds=3.0,
            min_blink_frames=1
        )

        blink_complete = check_blink_complete(request.user_id)

        if not blink_complete:
            if not live_valid:
                reset_blink_challenge(request.user_id)
                return AttendanceResponse(
                    verified=False,
                    confidence=0.0,
                    gate_passed=2,
                    rejection_reason=live_msg,
                    processing_time=time.time() - start_time,
                    timestamp=datetime.now().isoformat(),
                    debug_info={"ear": float(ear), "threshold": 0.21}
                )
            else:
                blink_status = get_blink_status(request.user_id)
                return AttendanceResponse(
                    verified=False,
                    confidence=0.0,
                    gate_passed=2,
                    rejection_reason=f"Blink challenge in progress: {live_msg}",
                    processing_time=time.time() - start_time,
                    timestamp=datetime.now().isoformat(),
                    debug_info={
                        "blink_status": blink_status,
                        "message": "Continue sending frames"
                    }
                )

        print(f"✅ Blink challenge completed for user: {request.user_id}")

    # ========================================================================
    # GATE 4: FACE RECOGNITION
    # ========================================================================

    # Fetch user encodings from loaded JSON database
    print(f"\n🔍 Looking up user: '{request.user_id}'")
    print(f"   Users in database: {list(USER_DB.keys())}")

    user_encodings = USER_DB.get(request.user_id, [])

    # User not found in database
    if not user_encodings:
        print(f"❌ User '{request.user_id}' not found in database")
        return AttendanceResponse(
            verified=False,
            confidence=0.0,
            gate_passed=3,
            rejection_reason=(
                f"User '{request.user_id}' is not registered. "
                f"Please register first using /api/register or register_local_users.py"
            ),
            processing_time=time.time() - start_time,
            timestamp=datetime.now().isoformat(),
            debug_info={
                "searched_user_id": request.user_id,
                "available_users": list(USER_DB.keys()),
                "suggestion": (
                    "Run register_local_users.py to register users from images, "
                    "or POST to /api/register with a webcam frame"
                )
            }
        )

    print(f"✅ Found {len(user_encodings)} encoding(s) for user: {request.user_id}")

    # Perform face recognition
    rec_valid, rec_msg, distance = gate_recognition(frame, user_encodings)

    if not rec_valid:
        reset_blink_challenge(request.user_id)
        print(f"❌ Face mismatch for user: {request.user_id} (distance: {distance:.4f})")

        return AttendanceResponse(
            verified=False,
            confidence=float(max(0.0, 1.0 - distance)),
            gate_passed=3,
            rejection_reason=rec_msg,
            processing_time=time.time() - start_time,
            timestamp=datetime.now().isoformat(),
            debug_info={
                "face_distance": float(distance),
                "threshold": 0.50,
                "note": "Face does not match registered user",
                "tip": "Try re-registering with better quality images"
            }
        )

    # ========================================================================
    # SUCCESS - ALL 4 GATES PASSED
    # ========================================================================
    reset_blink_challenge(request.user_id)
    confidence = float(max(0.0, min(1.0, 1.0 - distance)))

    print(f"\n🎉 SUCCESS: Attendance verified for '{request.user_id}'")
    print(f"   Confidence: {confidence:.2%}")
    print(f"   Face Distance: {distance:.4f}")
    print(f"   Location Distance: {dist:.2f}m")
    print(f"   Processing Time: {(time.time() - start_time)*1000:.0f}ms\n")

    return AttendanceResponse(
        verified=True,
        confidence=confidence,
        gate_passed=4,
        rejection_reason=None,
        processing_time=time.time() - start_time,
        timestamp=datetime.now().isoformat(),
        debug_info={
            "face_distance": float(distance),
            "location_distance": float(dist),
            "message": "Attendance marked successfully"
        }
    )


# ============================================================================
# USER REGISTRATION ENDPOINT (via Webcam/API)
# ============================================================================

@app.post("/api/register")
async def register_user(request: dict):
    """
    Register a new user via webcam frame.
    
    Body: { "user_id": "student123", "frame": "base64_image" }
    """
    try:
        user_id = request.get('user_id')
        frame_b64 = request.get('frame')

        if not user_id or not frame_b64:
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: user_id and frame"
            )

        # Decode image and generate encoding
        frame = decode_image(frame_b64)
        encoding = generate_face_encoding(frame)

        if encoding is None:
            raise HTTPException(
                status_code=400,
                detail="No face detected. Ensure face is clearly visible with good lighting."
            )

        # Add to in-memory database
        if user_id not in USER_DB:
            USER_DB[user_id] = []
        USER_DB[user_id].append(encoding)

        # Persist to JSON file immediately
        save_user_database(USER_DB)

        print(f"✅ Registered user: {user_id} ({len(USER_DB[user_id])} encoding(s) total)")

        return {
            "success": True,
            "message": f"User '{user_id}' registered successfully",
            "encodings_count": len(USER_DB[user_id]),
            "total_users": len(USER_DB)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/users")
async def list_users():
    """List all registered users"""
    return {
        "total_users": len(USER_DB),
        "users": [
            {
                "user_id": uid,
                "encodings_count": len(encs)
            }
            for uid, encs in USER_DB.items()
        ]
    }


@app.get("/api/user/{user_id}")
async def get_user_info(user_id: str):
    """Get information about a specific registered user"""
    if user_id not in USER_DB:
        raise HTTPException(
            status_code=404,
            detail=f"User '{user_id}' not found. Available users: {list(USER_DB.keys())}"
        )
    return {
        "user_id": user_id,
        "registered": True,
        "encodings_count": len(USER_DB[user_id])
    }


@app.delete("/api/user/{user_id}")
async def delete_user(user_id: str):
    """Delete a user from the system"""
    if user_id not in USER_DB:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    del USER_DB[user_id]
    reset_blink_challenge(user_id)
    save_user_database(USER_DB)  # Persist deletion

    return {
        "success": True,
        "message": f"User '{user_id}' deleted",
        "remaining_users": len(USER_DB)
    }


@app.post("/api/reload-database")
async def reload_database():
    """Reload user database from JSON file (useful after running register_local_users.py)"""
    global USER_DB
    USER_DB = load_user_database()
    return {
        "success": True,
        "message": "Database reloaded",
        "total_users": len(USER_DB),
        "users": list(USER_DB.keys())
    }


@app.get("/api/stats")
async def get_stats():
    """Get system statistics"""
    return {
        "total_users": len(USER_DB),
        "users": list(USER_DB.keys()),
        "encodings_file": str(ENCODINGS_FILE),
        "encodings_file_exists": ENCODINGS_FILE.exists()
    }


@app.post("/api/reset-challenge/{user_id}")
async def reset_challenge(user_id: str):
    """Reset blink challenge for a specific user"""
    reset_blink_challenge(user_id)
    return {
        "success": True,
        "message": f"Blink challenge reset for user '{user_id}'"
    }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )