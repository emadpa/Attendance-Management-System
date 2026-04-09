import numpy as np
import json

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn

import io

import face_recognition

from pydantic import BaseModel


from services.face_service import FaceRecognitionService
from database.mock_db import save_user_template, get_user_template

app = FastAPI(title="Secure Biometric Attendance System - V3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

face_service = FaceRecognitionService()


class EncodingResponse(BaseModel):
    success: bool
    encoding: List[float]
    message: str

class ErrorResponse(BaseModel):
    error: str


def load_image_from_upload(upload_file: UploadFile) -> np.ndarray:
    contents = upload_file.file.read()
    image = face_recognition.load_image_file(io.BytesIO(contents))
    return image

@app.get("/")
def home():
    return {"message": "Biometric System V3 (Blink Liveness) is Running"}


def get_face_encoding(image_bytes: bytes) -> dict:
    image = face_recognition.load_image_file(io.BytesIO(image_bytes))
    face_encodings = face_recognition.face_encodings(image)

    if len(face_encodings) == 0:
        return {"success": False, "encoding": None, "message": "No face detected in image"}

    if len(face_encodings) > 1:
        return {"success": False, "encoding": None, "message": "Multiple faces detected. Please use image with single face"}

    return {"success": True, "encoding": face_encodings[0].tolist(), "message": "Face encoding generated successfully"}


@app.post(
    '/generate-encoding',
    response_model=EncodingResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Generate face encoding from image",
    description="Upload an image and get a 128D face encoding for registration"
)
async def generate_encoding(
    image: UploadFile = File(..., description="Image file containing a single face")
):
    try:
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail='Invalid file type. Please upload an image file.')

        # Read bytes and pass to helper
        image_bytes = await image.read()
        result = get_face_encoding(image_bytes)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])

        return EncodingResponse(
            success=True,
            encoding=result["encoding"],
            message=result["message"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/users/register")
async def register_user(user_id: str = Form(...), file: UploadFile = File(...)):
    image_bytes = await file.read()
    encoding, is_live, msg = face_service.analyze_challenge(image_bytes)
    if encoding is None:
        raise HTTPException(status_code=400, detail=msg)
    save_user_template(user_id, encoding)
    return {"status": "success", "message": f"User {user_id} registered successfully."}


@app.post("/api/attendance/mark")
async def mark_attendance(
     stored_embedding_json: str = Form(...),
     files: List[UploadFile] = File(...)
 ):
     stored_encoding = np.array(json.loads(stored_embedding_json))
     frames_bytes = [await f.read() for f in files]
     captured_encoding, is_live, msg = face_service.analyze_blink_sequence(frames_bytes)
     if not is_live:
         return {"verified": False, "message": msg, "confidence": "0%"}
     is_match, confidence = face_service.verify_user(captured_encoding, stored_encoding)
     if is_match:
         return {"verified": True, "confidence": f"{confidence}%"}
     return {"verified": False, "message": "Biometric Mismatch", "confidence": f"{confidence}%"}




if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
