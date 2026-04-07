import face_recognition
import numpy as np
import cv2
from scipy.spatial import distance as dist


class FaceRecognitionService:
    def __init__(self):
        self.TOLERANCE            = 0.50
        self.EAR_CLOSED_THRESHOLD = 0.22
        self.EAR_OPEN_THRESHOLD   = 0.28

    def calculate_ear(self, eye_points):
        A = dist.euclidean(eye_points[1], eye_points[5])
        B = dist.euclidean(eye_points[2], eye_points[4])
        C = dist.euclidean(eye_points[0], eye_points[3])
        if C == 0:
            return 0.0
        return (A + B) / (2.0 * C)

    def analyze_challenge(self, image_bytes):
        """Single-frame analysis used during registration."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None, False, "Image capture failed."

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_img)
        if not face_locations:
            return None, False, "No face detected in frame."

        encodings = face_recognition.face_encodings(rgb_img, face_locations)
        if not encodings:
            return None, False, "Could not extract face encoding."

        return encodings[0], True, "Registration frame accepted."

    def analyze_blink_sequence(self, frames_bytes):
        """
        Analyzes a sequence of JPEG frames to confirm a genuine blink.
        Requires the pattern: OPEN → CLOSED → OPEN
        Returns: (encoding, is_live, status_message)
        """
        ear_series    = []
        last_encoding = None

        for frame_bytes in frames_bytes:
            nparr = np.frombuffer(frame_bytes, np.uint8)
            img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                continue

            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            face_locations = face_recognition.face_locations(rgb_img)
            if not face_locations:
                continue

            landmarks_list = face_recognition.face_landmarks(rgb_img, face_locations)
            if not landmarks_list:
                continue

            lm        = landmarks_list[0]
            left_ear  = self.calculate_ear(lm['left_eye'])
            right_ear = self.calculate_ear(lm['right_eye'])
            avg_ear   = (left_ear + right_ear) / 2.0
            ear_series.append(avg_ear)

            encodings = face_recognition.face_encodings(rgb_img, face_locations)
            if encodings:
                last_encoding = encodings[0]

        if len(ear_series) < 5:
            return None, False, "Not enough valid frames. Keep your face visible."

        # State machine: OPEN → CLOSED → OPEN
        STATE_OPEN   = "open"
        STATE_CLOSED = "closed"
        state           = None
        blink_confirmed = False

        for ear in ear_series:
            if state is None:
                if ear >= self.EAR_OPEN_THRESHOLD:
                    state = STATE_OPEN
            elif state == STATE_OPEN:
                if ear <= self.EAR_CLOSED_THRESHOLD:
                    state = STATE_CLOSED
            elif state == STATE_CLOSED:
                if ear >= self.EAR_OPEN_THRESHOLD:
                    blink_confirmed = True
                    break

        if not blink_confirmed:
            return None, False, (
                "Liveness Failed: No blink detected. "
                "Please close your eyes fully, then open them."
            )

        if last_encoding is None:
            return None, False, "Face encoding could not be extracted."

        return last_encoding, True, "Blink Verified!"

    def verify_user(self, captured_encoding, stored_encoding):
        distance   = face_recognition.face_distance([stored_encoding], captured_encoding)[0]
        is_match   = distance <= self.TOLERANCE
        confidence = round((1 - distance) * 100, 2)
        return is_match, confidence
