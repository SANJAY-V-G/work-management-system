import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Firebase Admin SDK
firebase_creds = os.getenv("FIREBASE_CREDENTIALS")

if not firebase_creds:
    raise Exception("Error: FIREBASE_CREDENTIALS environment variable not set.")

try:
    if isinstance(firebase_creds, str):
        # Parse the JSON string from env var
        cred_dict = json.loads(firebase_creds)
    else:
        cred_dict = firebase_creds

    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
    print("Firebase initialized successfully.")
except ValueError as e:
    # App might be already initialized if this file is imported multiple times or during reloads
    pass
except json.JSONDecodeError as e:
    raise Exception(f"Error parsing FIREBASE_CREDENTIALS JSON: {e}")

db = firestore.client()
