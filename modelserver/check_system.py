import os
import sys

print("Checking environment...")

# Check Models
models = ["models/shape_predictor_68_face_landmarks.dat", "models/dlib_face_recognition_resnet_model_v1.dat"]
for m in models:
    if os.path.exists(m):
        print(f"[OK] Found {m}")
    else:
        print(f"[FAIL] Missing {m}")

# Check Imports
try:
    import fastapi
    print("[OK] fastapi imported")
except ImportError:
    print("[FAIL] fastapi missing")

try:
    import dlib
    print("[OK] dlib imported")
except ImportError:
    print("[FAIL] dlib missing (Required for Gate 3 & 4)")

try:
    import cv2
    print("[OK] opencv imported")
except ImportError:
    print("[FAIL] opencv missing")

# Test Gate 1 (Location) - Logic only, no deps
try:
    sys.path.append('.')
    from backend.core.gates import gate_location
    valid, msg, dist = gate_location(10.5200, 76.2100)
    if valid:
        print(f"[OK] Gate 1 Logic (Same location): {msg}")
    else:
        print(f"[FAIL] Gate 1 Logic: {msg}")
        
    valid, msg, dist = gate_location(0, 0)
    if not valid:
         print(f"[OK] Gate 1 Logic (Far location): {msg}")
    else:
         print(f"[FAIL] Gate 1 Logic should fail for 0,0")
except Exception as e:
    print(f"[FAIL] Gate 1 Exception: {e}")

print("System Check Complete.")
