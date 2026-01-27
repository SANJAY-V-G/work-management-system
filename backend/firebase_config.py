import firebase_admin
from firebase_admin import credentials, firestore
import os

# Initialize Firebase Admin SDK
cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

if not os.path.exists(cred_path):
    raise Exception(f"Error: Could not find {cred_path}. Please ensure the file exists.")

try:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    print("Firebase initialized successfully.")
except ValueError as e:
    # App might be already initialized if this file is imported multiple times or during reloads
    pass

db = firestore.client()
