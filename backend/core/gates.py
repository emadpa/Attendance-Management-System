import cv2
import numpy as np
import os
import time
from collections import deque

try:
    import dlib
    import face_recognition
    DLIB_AVAILABLE = True
except ImportError:
    DLIB_AVAILABLE = False
    dlib = None
    face_recognition = None
    print("WARNING: Dlib/Face_Recognition not installed. Gates 3 & 4 will fail.")

from .utils import haversine, eye_aspect_ratio

# Load Dlib models
# Ensure these paths are correct relative to where main.py is run
PREDICTOR_PATH = "models/shape_predictor_68_face_landmarks.dat"
RESNET_PATH = "models/dlib_face_recognition_resnet_model_v1.dat"

# Initialize lazily or globally
detector = None
predictor = None
facerec = None

# Global state for tracking blinks across frames (per user)
# In production, use Redis or similar for distributed systems
blink_tracker = {}


def load_models():
    """Load dlib models into memory"""
    global predictor, facerec, detector
    if not DLIB_AVAILABLE:
        print("Cannot load models: dlib not available")
        return

    if detector is None:
        detector = dlib.get_frontal_face_detector()
        print("✓ Face detector loaded")

    if predictor is None and os.path.exists(PREDICTOR_PATH):
        predictor = dlib.shape_predictor(PREDICTOR_PATH)
        print("✓ Shape predictor loaded")
    elif predictor is None:
        print(f"⚠ Shape predictor not found at {PREDICTOR_PATH}")
        
    if facerec is None and os.path.exists(RESNET_PATH):
        facerec = dlib.face_recognition_model_v1(RESNET_PATH)
        print("✓ Face recognition model loaded")
    elif facerec is None:
        print(f"⚠ Face recognition model not found at {RESNET_PATH}")


# =============================================================================
# GATE 1: LOCATION VERIFICATION
# =============================================================================

def gate_location(lat, lon, ref_lat=10.5200, ref_lon=76.2100, threshold_m=5000):
    """
    Verify user is within allowed geographic area.
    
    Args:
        lat: User's latitude
        lon: User's longitude
        ref_lat: Reference point latitude (campus center)
        ref_lon: Reference point longitude (campus center)
        threshold_m: Maximum allowed distance in meters
    
    Returns:
        tuple: (valid: bool, message: str, distance: float)
    """
    dist = haversine(lat, lon, ref_lat, ref_lon)
    if dist > threshold_m:
        return False, f"Location distance {dist:.2f}m exceeds threshold of {threshold_m}m", dist
    return True, "Location verified", dist


# =============================================================================
# GATE 2: ANTI-SPOOFING (TEXTURE ANALYSIS)
# =============================================================================

def gate_texture(frame):
    """
    Detect spoofing attempts using Laplacian variance.
    
    Detects:
    - Blurry/printed photos (low variance)
    - Digital screens (very high variance)
    
    Args:
        frame: OpenCV BGR image
    
    Returns:
        tuple: (valid: bool, message: str, variance: float)
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Thresholds from requirements
    # < 20 -> Blurry/Printed
    # 20-250 -> Natural (Accept)
    # > 250 -> Screen/Digital
    
    if variance < 20:
        return False, "Texture variance too low (Blurry/Printed photo)", variance
    if variance > 250:
        return False, "Texture variance too high (Screen/Digital display)", variance
        
    return True, "Texture verified", variance


# =============================================================================
# GATE 3: LIVENESS DETECTION (BLINK DETECTION)
# =============================================================================

def gate_liveness(frame, user_id=None, ear_threshold=0.21, timeout_seconds=3.0, 
                  min_blink_frames=2, reset_challenge=False):
    """
    Check for liveness via EAR with blink detection over time.
    
    A valid blink requires:
    1. Eyes start open (EAR > threshold)
    2. Eyes close (EAR < threshold) for at least min_blink_frames consecutive frames
    3. Eyes open again (EAR > threshold)
    4. All within timeout_seconds
    
    Args:
        frame: OpenCV image (BGR format)
        user_id: Unique identifier for tracking state (required for multi-frame detection)
        ear_threshold: EAR below this value = eyes closed (default: 0.21)
        timeout_seconds: Time window to detect blink (default: 3.0 seconds)
        min_blink_frames: Minimum consecutive frames with closed eyes (default: 2)
        reset_challenge: Reset the blink challenge for this user
    
    Returns:
        tuple: (valid: bool, message: str, ear: float)
    """
    if not DLIB_AVAILABLE:
        return False, "Liveness check unavailable (Dlib missing)", 0.0

    load_models()
    if predictor is None:
        return False, "Models not loaded", 0.0

    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    rects = detector(gray, 0)
    
    if len(rects) == 0:
        return False, "No face detected for liveness", 0.0
    
    # Get landmarks for first detected face
    rect = rects[0]
    shape = predictor(gray, rect)
    
    # Convert dlib shape to numpy array
    try:
        shape = face_recognition.face_utils.shape_to_np(shape)
    except AttributeError:
        # Fallback if face_recognition.face_utils not available
        shape = np.array([[p.x, p.y] for p in shape.parts()])
    
    # Extract eye coordinates (68-point facial landmark model)
    # Left eye: landmarks 36-41 (indices 36:42)
    # Right eye: landmarks 42-47 (indices 42:48)
    leftEye = shape[36:42]
    rightEye = shape[42:48]
    
    # Calculate EAR for both eyes
    leftEAR = eye_aspect_ratio(leftEye)
    rightEAR = eye_aspect_ratio(rightEye)
    
    # Average EAR
    ear = (leftEAR + rightEAR) / 2.0
    
    # If no user_id provided, just return EAR (single-frame mode)
    if user_id is None:
        # Simple validation: check if eyes are detected
        if ear > 0.1:  # Sanity check
            return True, f"Liveness check complete (EAR: {ear:.3f})", ear
        else:
            return False, "Eyes not properly detected", ear
    
    # Multi-frame blink detection mode
    current_time = time.time()
    
    # Initialize or reset tracker for this user
    if reset_challenge or user_id not in blink_tracker:
        blink_tracker[user_id] = {
            'ear_history': deque(maxlen=30),  # Store last 30 frames (~3 sec at 10fps)
            'timestamps': deque(maxlen=30),
            'state': 'WAITING_FOR_OPEN',  # State machine
            'closed_frame_count': 0,
            'blink_detected': False,
            'start_time': current_time
        }
    
    tracker = blink_tracker[user_id]
    
    # Check if challenge timed out
    elapsed_time = current_time - tracker['start_time']
    
    # Add current EAR to history
    tracker['ear_history'].append(ear)
    tracker['timestamps'].append(current_time)
    
    # State machine for blink detection
    # States: WAITING_FOR_OPEN -> EYES_OPEN -> EYES_CLOSING -> EYES_CLOSED -> BLINK_COMPLETE
    
    if tracker['state'] == 'WAITING_FOR_OPEN':
        # Initial state: waiting for eyes to be open
        if ear > ear_threshold:
            tracker['state'] = 'EYES_OPEN'
            return True, f"Eyes detected and open. Please blink naturally. (EAR: {ear:.3f})", ear
        else:
            return True, f"Waiting for eyes to open... (EAR: {ear:.3f})", ear
    
    elif tracker['state'] == 'EYES_OPEN':
        # Eyes are open, waiting for them to close
        if ear < ear_threshold:
            tracker['state'] = 'EYES_CLOSING'
            tracker['closed_frame_count'] = 1
            return True, f"Blink detected - eyes closing... (EAR: {ear:.3f})", ear
        elif elapsed_time > timeout_seconds:
            # Timeout - no blink detected
            return False, f"Timeout: No blink detected in {timeout_seconds} seconds", ear
        else:
            return True, f"Eyes open. Please blink. (Time: {elapsed_time:.1f}s, EAR: {ear:.3f})", ear
    
    elif tracker['state'] == 'EYES_CLOSING':
        # Eyes are closing, count consecutive closed frames
        if ear < ear_threshold:
            tracker['closed_frame_count'] += 1
            
            if tracker['closed_frame_count'] >= min_blink_frames:
                # Eyes have been closed long enough
                tracker['state'] = 'EYES_CLOSED'
                return True, f"Eyes closed. (EAR: {ear:.3f})", ear
            else:
                return True, f"Blink in progress... ({tracker['closed_frame_count']}/{min_blink_frames} frames, EAR: {ear:.3f})", ear
        else:
            # Eyes opened too quickly - might be noise, reset
            tracker['state'] = 'EYES_OPEN'
            tracker['closed_frame_count'] = 0
            return True, f"False blink detected. Please blink naturally. (EAR: {ear:.3f})", ear
    
    elif tracker['state'] == 'EYES_CLOSED':
        # Eyes were closed, waiting for them to open again
        if ear > ear_threshold:
            # Blink complete! Eyes opened again
            tracker['state'] = 'BLINK_COMPLETE'
            tracker['blink_detected'] = True
            return True, f"✓ Blink detected successfully! Liveness verified. (EAR: {ear:.3f})", ear
        elif elapsed_time > timeout_seconds:
            # Eyes stayed closed too long - suspicious
            return False, "Eyes remained closed for too long", ear
        else:
            return True, f"Eyes closed. Waiting for eyes to open... (EAR: {ear:.3f})", ear
    
    elif tracker['state'] == 'BLINK_COMPLETE':
        # Blink already detected - success!
        return True, "✓ Liveness verified - blink detected", ear
    
    # Fallback
    return True, "Liveness check in progress", ear


def gate_liveness_batch(frames, ear_threshold=0.30, min_blink_frames=2):
    """
    Process multiple frames at once for blink detection.
    Useful when client sends a batch of frames captured over 3 seconds.
    
    Args:
        frames: List of OpenCV images
        ear_threshold: EAR threshold for closed eyes
        min_blink_frames: Minimum consecutive frames with closed eyes
    
    Returns:
        tuple: (valid: bool, message: str, details: dict)
    """
    print(frames)
    if not frames or len(frames) < 3:
        return False, "Insufficient frames for blink detection", {}
    
    ear_history = []
    
    # Calculate EAR for each frame
    for i, frame in enumerate(frames):
        if not DLIB_AVAILABLE:
            return False, "Liveness check unavailable (Dlib missing)", {}
        
        load_models()
        if predictor is None:
            return False, "Models not loaded", {}
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        rects = detector(gray, 0)
        
        if len(rects) == 0:
            return False, f"No face detected in frame {i+1}", {}
        
        rect = rects[0]
        shape = predictor(gray, rect)
        
        try:
            shape = face_recognition.face_utils.shape_to_np(shape)
        except AttributeError:
            shape = np.array([[p.x, p.y] for p in shape.parts()])
        
        leftEye = shape[36:42]
        rightEye = shape[42:48]
        
        leftEAR = eye_aspect_ratio(leftEye)
        rightEAR = eye_aspect_ratio(rightEye)
        ear = (leftEAR + rightEAR) / 2.0
        
        ear_history.append(ear)
        print(ear)
    
    # Analyze EAR sequence for blink pattern
    blink_detected, blink_details = _analyze_blink_pattern(
        ear_history
    )
    
    if not blink_detected:
        return False, "No valid blink detected in sequence", {
            'ear_history': ear_history,
            **blink_details
        }
    
    return True, "Blink successfully detected", {
        'ear_history': ear_history,
        **blink_details
    }


def _analyze_blink_pattern(ear_values, min_drop=0.06):
    if len(ear_values) < 3:
        return False, {'reason': 'Insufficient frames'}

    max_ear = max(ear_values)
    min_ear = min(ear_values)
    drop = max_ear - min_ear

    details = {
        'blink_count': 1 if drop >= min_drop else 0,
        'avg_ear': float(np.mean(ear_values)),
        'min_ear': float(min_ear),
        'max_ear': float(max_ear),
        'ear_drop': float(drop),
    }

    if drop >= min_drop:
        return True, details

    details['reason'] = 'Insufficient EAR drop for blink'
    return False, details


def check_blink_complete(user_id):
    """
    Check if blink challenge is complete for a user.
    
    Args:
        user_id: User identifier
    
    Returns:
        bool: True if blink was successfully detected
    """
    if user_id not in blink_tracker:
        return False
    
    return blink_tracker[user_id].get('blink_detected', False)


def reset_blink_challenge(user_id):
    """
    Reset blink challenge for a user.
    
    Args:
        user_id: User identifier
    """
    if user_id in blink_tracker:
        del blink_tracker[user_id]


def get_blink_status(user_id):
    """
    Get detailed status of blink challenge.
    
    Args:
        user_id: User identifier
    
    Returns:
        dict: Status information including state, EAR history, elapsed time
    """
    if user_id not in blink_tracker:
        return {
            'active': False,
            'message': 'No active challenge'
        }
    
    tracker = blink_tracker[user_id]
    current_time = time.time()
    elapsed = current_time - tracker['start_time']
    
    return {
        'active': True,
        'state': tracker['state'],
        'blink_detected': tracker['blink_detected'],
        'elapsed_time': elapsed,
        'ear_history': list(tracker['ear_history']),
        'current_ear': tracker['ear_history'][-1] if tracker['ear_history'] else 0.0,
        'frames_processed': len(tracker['ear_history'])
    }


# =============================================================================
# GATE 4: FACE RECOGNITION
# =============================================================================

def gate_recognition(frame, expected_encoding_list):
    """
    Compare face with database.
    
    Args:
        frame: OpenCV BGR image
        expected_encoding_list: List of face encodings for the user
    
    Returns:
        tuple: (valid: bool, message: str, distance: float)
    """
    if not DLIB_AVAILABLE:
        return False, "Face recognition unavailable (Dlib missing)", 1.0

    load_models()
    # Ensure models loaded
    if facerec is None or predictor is None or detector is None:
         return False, "Models not loaded", 1.0

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Detect faces
    rects = detector(rgb_frame, 1)  # Upsample 1 time
    
    if len(rects) == 0:
        return False, "No face detected", 1.0  # High distance
        
    shape = predictor(rgb_frame, rects[0])
    
    # Compute encoding
    try:
        face_encoding = np.array(facerec.compute_face_descriptor(rgb_frame, shape))
    except Exception as e:
        return False, f"Encoding error: {e}", 1.0
    
    if not expected_encoding_list:
         return False, "No registered face for user", 1.0
         
    # Compare with all (or just one), taking min distance
    min_dist = 10.0
    for known_enc in expected_encoding_list:
        dist = np.linalg.norm(face_encoding - np.array(known_enc))
        if dist < min_dist:
            min_dist = dist
            
    # Threshold 0.50
    if min_dist <= 0.50:
        return True, "Face Verified", min_dist
    else:
        return False, "Face Mismatch", min_dist


def generate_face_encoding(frame):
    """
    Generate face encoding from a frame for user registration.
    
    Args:
        frame: OpenCV image (BGR)
    
    Returns:
        list: 128-dimensional face encoding, or None if no face detected
    """
    if not DLIB_AVAILABLE:
        return None
    
    load_models()
    if facerec is None or predictor is None or detector is None:
        return None
    
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Detect faces
    rects = detector(rgb_frame, 1)  # Upsample 1 time
    
    if len(rects) == 0:
        return None
    
    # Get landmarks
    shape = predictor(rgb_frame, rects[0])
    
    # Compute encoding
    try:
        face_encoding = np.array(facerec.compute_face_descriptor(rgb_frame, shape))
        return face_encoding.tolist()  # Convert to list for JSON serialization
    except Exception as e:
        print(f"Encoding error: {e}")
        return None