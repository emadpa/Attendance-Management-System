import math
import cv2
import numpy as np
import base64

# --- Geography ---
def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    R = 6371000  # radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2) 
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2*math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

# --- Image Processing ---
def decode_image(base64_string):
    """
    Decode base64 string to OpenCV image
    """
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    
    img_data = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img

def eye_aspect_ratio(eye_points):
    """
    Compute the Eye Aspect Ratio (EAR)
    eye_points: list of (x, y) coordinates
    """
    # Euclidean distance between the two vertical eye landmarks
    A = np.linalg.norm(eye_points[1] - eye_points[5])
    B = np.linalg.norm(eye_points[2] - eye_points[4])

    # Euclidean distance between the two horizontal eye landmarks
    C = np.linalg.norm(eye_points[0] - eye_points[3])

    ear = (A + B) / (2.0 * C)
    return ear
