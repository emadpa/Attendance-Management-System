import numpy as np

# A simple in-memory dictionary to act as our database.
# Keys will be the user_id (str), and values will be the face encoding (numpy array).
fake_user_db = {}

def save_user_template(user_id: str, encoding: np.ndarray):
    """
    Saves a user's face encoding to the mock database.
    """
    fake_user_db[user_id] = encoding
    print(f"[DB LOG] Saved template for user: {user_id}")

def get_user_template(user_id: str):
    """
    Retrieves a user's face encoding from the mock database.
    Returns None if the user is not found.
    """
    return fake_user_db.get(user_id)
