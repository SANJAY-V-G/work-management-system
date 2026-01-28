from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import asyncio
import httpx
import os

import schemas, auth
from firebase_config import db
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from google.cloud.firestore_v1.base_query import FieldFilter
from firebase_admin import firestore

app = FastAPI(title="Work Hours Tracking System")

# ==============================
# 🔁 KEEP SERVER AWAKE TASK
# ==============================
async def keep_server_awake():
    """
    Pings the server every 3 minutes to prevent Render free-tier sleep.
    """
    await asyncio.sleep(60)  # wait 1 min after startup

    BASE_URL = os.getenv("BASE_URL")
    if not BASE_URL:
        print("⚠️ BASE_URL environment variable is not set. Internal keep-alive ping is disabled.")
        print("   To enable self-ping, set BASE_URL to your Render app URL (e.g., https://my-app.onrender.com)")
        return

    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            try:
                response = await client.get(f"{BASE_URL}/health")
                print(f"🔁 Keep-alive ping to {BASE_URL}: {response.status_code}")
            except Exception as e:
                print(f"❌ Keep-alive ping failed: {e}")

            await asyncio.sleep(180)  # 3 minutes


# ==============================
# 🚀 STARTUP EVENT
# ==============================
@app.on_event("startup")
async def startup_event():
    # Ensure admin user exists
    try:
        users_ref = db.collection('users')
        query = users_ref.where(filter=FieldFilter('username', '==', 'admin')).limit(1).stream()
        admin_exists = any(query)
        
        if not admin_exists:
            print("Creating admin user...")
            hashed_pwd = auth.get_password_hash("1234")
            # Create admin user
            users_ref.add({
                'username': 'admin',
                'password_hash': hashed_pwd
            })
            print("Admin user created successfully.")
    except Exception as e:
        print(f"Error creating admin user on startup: {e}")

    # 🔥 Start keep-alive task
    asyncio.create_task(keep_server_awake())


# ==============================
# 🌍 CORS
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==============================
# 🔐 AUTH HELPERS
# ==============================
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Fetch user from Firestore
    users_ref = db.collection('users')
    query = users_ref.where(filter=FieldFilter('username', '==', username)).limit(1).stream()
    
    user_doc = None
    for doc in query:
        user_doc = doc
        break
        
    if user_doc is None:
        raise credentials_exception

    user_data = user_doc.to_dict()
    user_data['id'] = user_doc.id
    return user_data


# ==============================
# ❤️ HEALTH CHECK
# ==============================
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc)
    }


# ==============================
# 👤 AUTH ROUTES
# ==============================
@app.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate):
    users_ref = db.collection('users')
    
    # Check if username exists
    query = users_ref.where(filter=FieldFilter('username', '==', user.username)).limit(1).stream()
    if any(query):
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = auth.get_password_hash(user.password)
    new_user_data = {
        'username': user.username,
        'password_hash': hashed_password
    }
    
    update_time, doc_ref = users_ref.add(new_user_data)
    
    return {**new_user_data, "id": doc_ref.id}


@app.post("/login", response_model=schemas.Token)
def login(form_data: schemas.UserLogin):
    users_ref = db.collection('users')
    query = users_ref.where(filter=FieldFilter('username', '==', form_data.username)).limit(1).stream()
    
    user_doc = None
    for doc in query:
        user_doc = doc
        break

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_data = user_doc.to_dict()

    if not auth.verify_password(form_data.password, user_data['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user_data['username']})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user


# ==============================
# 🕒 WORK TRACKING
# ==============================
@app.post("/work/start", response_model=schemas.WorkLogOut)
def start_work(current_user: dict = Depends(get_current_user)):
    logs_ref = db.collection('work_logs')
    
    # Check for open session
    # Note: Firestore query for None/Null: where('logout_time', '==', None)
    query = logs_ref.where(filter=FieldFilter('user_id', '==', current_user['id'])).where(filter=FieldFilter('logout_time', '==', None)).limit(1).stream()
    
    if any(query):
        raise HTTPException(status_code=400, detail="You already have an active session.")

    new_log_data = {
        'user_id': current_user['id'],
        'login_time': datetime.now(timezone.utc),
        'logout_time': None,
        'duration_minutes': None,
        'pop_description': None,
        'push_command': None
    }

    update_time, doc_ref = logs_ref.add(new_log_data)
    
    return {**new_log_data, "id": doc_ref.id}


@app.post("/work/stop", response_model=schemas.WorkLogOut)
def stop_work(
    log_data: schemas.WorkLogStop,
    current_user: dict = Depends(get_current_user)
):
    logs_ref = db.collection('work_logs')
    
    # Find active session
    query = logs_ref.where(filter=FieldFilter('user_id', '==', current_user['id'])).where(filter=FieldFilter('logout_time', '==', None)).limit(1).stream()
    
    active_doc = None
    for doc in query:
        active_doc = doc
        break

    if not active_doc:
        raise HTTPException(status_code=400, detail="No active work session found.")

    active_data = active_doc.to_dict()
    
    login_time = active_data['login_time']
    # Firestore timestamps come back as datetime objects with timezone info usually
    if login_time.tzinfo is None:
        login_time = login_time.replace(tzinfo=timezone.utc)

    logout_time = datetime.now(timezone.utc)
    duration = int((logout_time - login_time).total_seconds() / 60)

    update_data = {
        'logout_time': logout_time,
        'duration_minutes': duration,
        'pop_description': log_data.pop_description,
        'push_command': log_data.push_command
    }
    
    # Update Firestore
    active_doc.reference.update(update_data)
    
    # Merge for response
    return {**active_data, **update_data, "id": active_doc.id}


@app.get("/work/logs", response_model=list[schemas.WorkLogOut])
def get_work_logs(current_user: dict = Depends(get_current_user)):
    logs_ref = db.collection('work_logs')
    
    # Query logs for user
    query = logs_ref.where(filter=FieldFilter('user_id', '==', current_user['id'])).order_by('login_time', direction=firestore.Query.DESCENDING).stream()
    
    results = []
    for doc in query:
        data = doc.to_dict()
        data['id'] = doc.id
        results.append(data)

    return results


@app.get("/work/status")
def get_work_status(current_user: dict = Depends(get_current_user)):
    logs_ref = db.collection('work_logs')
    
    query = logs_ref.where(filter=FieldFilter('user_id', '==', current_user['id'])).where(filter=FieldFilter('logout_time', '==', None)).limit(1).stream()
    
    active_doc = None
    for doc in query:
        active_doc = doc
        break

    if active_doc:
        data = active_doc.to_dict()
        start_time = data['login_time']
        return {"status": "active", "start_time": start_time}

    return {"status": "inactive"}


# ==============================
# 🛠️ ADMIN ROUTES
# ==============================
@app.get("/admin/users", response_model=list[schemas.UserOut])
def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user['username'] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    users_ref = db.collection('users')
    docs = users_ref.stream()
    
    results = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        results.append(data)
        
    return results


@app.get("/admin/logs", response_model=list[schemas.WorkLogAdminOut])
def get_all_logs(current_user: dict = Depends(get_current_user)):
    if current_user['username'] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch all users first to join manually
    users_ref = db.collection('users')
    user_docs = users_ref.stream()
    users_map = {}
    for doc in user_docs:
        u_data = doc.to_dict()
        u_data['id'] = doc.id
        users_map[doc.id] = u_data

    # Fetch all logs
    logs_ref = db.collection('work_logs')
    log_docs = logs_ref.order_by('login_time', direction=firestore.Query.DESCENDING).stream()
    
    results = []
    for doc in log_docs:
        data = doc.to_dict()
        data['id'] = doc.id
        
        # Attach user
        user_id = data.get('user_id')
        user_obj = users_map.get(user_id)
        
        # Only include if user exists (integrity check)
        if user_obj:
            data['user'] = user_obj
            results.append(data)

    return results
