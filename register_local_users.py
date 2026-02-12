import os
import cv2
import numpy as np
from backend.core.gates import generate_face_encoding
from backend.core.utils import decode_image
import json

def register_user_from_image(image_path, user_id):
    """
    Register a user by generating face encoding from an image file.
    
    Args:
        image_path: Path to the image file (jpg, png, etc.)
        user_id: Unique identifier for the user
    
    Returns:
        Face encoding (list of 128 floats) or None if failed
    """
    # Check if file exists
    if not os.path.exists(image_path):
        print(f"❌ Error: Image not found at {image_path}")
        return None
    
    # Read image
    frame = cv2.imread(image_path)
    
    if frame is None:
        print(f"❌ Error: Could not read image from {image_path}")
        return None
    
    print(f"📸 Processing image: {image_path}")
    print(f"   Image size: {frame.shape[1]}x{frame.shape[0]}")
    
    # Generate face encoding
    encoding = generate_face_encoding(frame)
    
    if encoding is None:
        print(f"❌ Error: No face detected in {image_path}")
        print("   Tips:")
        print("   - Ensure face is clearly visible")
        print("   - Use good lighting")
        print("   - Face should be front-facing")
        return None
    
    print(f"✅ Successfully generated encoding for {user_id}")
    print(f"   Encoding dimension: {len(encoding)}")
    print(f"   Sample values: [{encoding[0]:.3f}, {encoding[1]:.3f}, {encoding[2]:.3f}, ...]")
    
    return encoding


def save_encodings_to_file(encodings_dict, filename="user_encodings.json"):
    """
    Save encodings to a JSON file.
    
    Args:
        encodings_dict: Dictionary of {user_id: [encoding1, encoding2, ...]}
        filename: Output filename
    """
    with open(filename, 'w') as f:
        json.dump(encodings_dict, f, indent=2)
    print(f"\n💾 Encodings saved to {filename}")


def load_encodings_from_file(filename="user_encodings.json"):
    """
    Load encodings from a JSON file.
    
    Returns:
        Dictionary of {user_id: [encoding1, encoding2, ...]}
    """
    if not os.path.exists(filename):
        print(f"⚠️  No existing encodings file found at {filename}")
        return {}
    
    with open(filename, 'r') as f:
        encodings = json.load(f)
    print(f"📂 Loaded encodings for {len(encodings)} users from {filename}")
    return encodings


if __name__ == "__main__":
    # Create a test_images folder structure
    print("=" * 60)
    print("🔐 Local User Registration System")
    print("=" * 60)
    
    # Dictionary to store all user encodings
    USER_DB = load_encodings_from_file()
    
    # Register users from images in test_images folder
    # You can add multiple images per user for better accuracy
    
    users_to_register = {
       "test_user_001": [
            "test_images/imad_1.png",
        ],
        "test_user_002": [
            "test_images/whatsapp.jpeg", "test_images/passportt1.png"
        ],
        
    }
    
    # Process each user
    for user_id, image_paths in users_to_register.items():
        print(f"\n👤 Registering user: {user_id}")
        print("-" * 60)
        
        encodings_for_user = []
        
        for image_path in image_paths:
            encoding = register_user_from_image(image_path, user_id)
            
            if encoding is not None:
                encodings_for_user.append(encoding)
        
        if encodings_for_user:
            USER_DB[user_id] = encodings_for_user
            print(f"✅ User {user_id} registered with {len(encodings_for_user)} encoding(s)")
        else:
            print(f"❌ Failed to register {user_id}")
    
    # Save to file
    print("\n" + "=" * 60)
    save_encodings_to_file(USER_DB)
    
    # Display summary
    print("\n📊 Registration Summary:")
    print("-" * 60)
    for user_id, encodings in USER_DB.items():
        print(f"   {user_id}: {len(encodings)} encoding(s)")
    
    print("\n✅ Registration complete!")
    print("\n💡 To use these encodings, update main.py to load from user_encodings.json")


### **Step 2: Create Test Images Folder**

# Create this folder structure in your project:
# ```
# mainproject/
# ├── backend/
# │   ├── main.py
# │   ├── models.py
# │   └── core/
# │       ├── gates.py
# │       └── utils.py
# ├── test_images/           ← Create this folder
# │   ├── alice_1.jpg        ← Add your test images here
# │   ├── alice_2.jpg
# │   ├── bob_1.jpg
# │   └── john_front.jpg
# ├── register_local_users.py ← Create this script
# └── user_encodings.json     ← Will be created automatically