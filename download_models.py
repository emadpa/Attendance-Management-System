import urllib.request
import bz2
import os

MODELS_DIR = "models"
URL_68 = "http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2"
URL_RESNET = "http://dlib.net/files/dlib_face_recognition_resnet_model_v1.dat.bz2"

FILES = {
    "shape_predictor_68_face_landmarks.dat": URL_68,
    "dlib_face_recognition_resnet_model_v1.dat": URL_RESNET
}

def download_and_extract():
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)

    for filename, url in FILES.items():
        filepath = os.path.join(MODELS_DIR, filename)
        if os.path.exists(filepath):
            print(f"{filename} already exists.")
            continue
            
        print(f"Downloading {filename}...")
        compressed_path = filepath + ".bz2"
        try:
            urllib.request.urlretrieve(url, compressed_path)
            print(f"Downloaded {compressed_path}. Extracting...")
            
            with bz2.BZ2File(compressed_path) as fr, open(filepath, 'wb') as fw:
                fw.write(fr.read())
            
            os.remove(compressed_path)
            print(f"Extracted {filename}.")
        except Exception as e:
            print(f"Failed to download {filename}: {e}")

if __name__ == "__main__":
    download_and_extract()
