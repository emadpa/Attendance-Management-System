import cv2
import numpy as np
import os
from .utils import haversine, eye_aspect_ratio

try:
    import dlib
    import face_recognition
    DLIB_AVAILABLE = True
except ImportError:
    DLIB_AVAILABLE = False
    dlib = None
    face_recognition = None
    print("WARNING: Dlib/Face_Recognition not installed. Gates 3 & 4 will fail.")

# Load Dlib models
# Ensure these path are correct relative to where main.py is run
PREDICTOR_PATH = "models/shape_predictor_68_face_landmarks.dat"
RESNET_PATH = "models/dlib_face_recognition_resnet_model_v1.dat"

# Initialize lazily or globally
detector = None
predictor = None
facerec = None

def load_models():
    global predictor, facerec, detector
    if not DLIB_AVAILABLE:
        return

    if detector is None:
        detector = dlib.get_frontal_face_detector()

    if predictor is None and os.path.exists(PREDICTOR_PATH):
        predictor = dlib.shape_predictor(PREDICTOR_PATH)
    if facerec is None and os.path.exists(RESNET_PATH):
        facerec = dlib.face_recognition_model_v1(RESNET_PATH)

# --- Gate 1: Location ---
def gate_location(lat, lon, ref_lat=10.5200, ref_lon=76.2100, threshold_m=4000):
    dist = haversine(lat, lon, ref_lat, ref_lon)
    if dist > threshold_m:
        return False, f"Location distance {dist:.2f}m exceeds threshold", dist
    return True, "Location verified", dist

# --- Gate 2: Anti-Spoofing (Texture) ---
def gate_texture(frame):
    """
    Laplacian Variance for texture analysis.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Thresholds from prompt
    # < 20 -> Blurry/Printed
    # 20-250 -> Natural (Accept)
    # > 250 -> Screen/Digital
    
    if variance < 20:
        return False, "Texture variance too low (Blurry/Printed)", variance
    if variance > 250: # NOTE: High variance might just be high frequency edge, but prompt says reject > 250
        return False, "Texture variance too high (Screen/Digital)", variance
        
    return True, "Texture verified", variance

# --- Gate 3: Liveness (Blink/EAR) ---
def gate_liveness(frame):
    """
    Check for liveness via EAR.
    """
    if not DLIB_AVAILABLE:
         return False, "Liveness check unavailable (Dlib missing)", 0.0

    load_models()
    if predictor is None:
        return False, "Models not loaded", 0.0

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    rects = detector(gray, 0)
    
    if len(rects) == 0:
        return False, "No face detected for liveness", 0.0
    
    # Check first face
    rect = rects[0]
    shape = predictor(gray, rect)
    shape = face_recognition.face_utils.shape_to_np(shape)
    
    # Extract eye coordinates (indices for 68-point model)
    # Left eye: 36-41 (0-indexed: 36:42)
    # Right eye: 42-47 (0-indexed: 42:48)
    leftEye = shape[36:42]
    rightEye = shape[42:48]
    
    leftEAR = eye_aspect_ratio(leftEye)
    rightEAR = eye_aspect_ratio(rightEye)
    
    ear = (leftEAR + rightEAR) / 2.0
    
    return True, "Liveness check complete", ear

# --- Gate 4: Face Verification ---
def gate_recognition(frame, expected_encoding_list):
    """
    Compare face with database.
    """
    if not DLIB_AVAILABLE:
        return False, "Face recognition unavailable (Dlib missing)", 1.0

    load_models()
    # Ensure models loaded
    if facerec is None or predictor is None or detector is None:
         return False, "Models not loaded", 1.0

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Detect faces
    rects = detector(rgb_frame, 1) # Upsample 1 time
    
    if len(rects) == 0:
        return False, "No face detected", 1.0 # High distance
        
    shape = predictor(rgb_frame, rects[0])
    
    # Compute encoding
    try:
        face_encoding = np.array(facerec.compute_face_descriptor(rgb_frame, shape))
    except Exception as e:
        return False, f"Encoding error: {e}", 1.0
    
    if not expected_encoding_list:
         return False, "No registered face for user", 1.0
         
    # Compare with all (or just one). taking min distance
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
