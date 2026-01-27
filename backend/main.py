from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import asyncio
import httpx
import os

import models, schemas, auth, database
from database import engine, get_db, SessionLocal
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

# Create tables
models.Base.metadata.create_all(bind=engine)

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
        print("⚠️ BASE_URL not set. Keep-alive disabled.")
        return

    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            try:
                response = await client.get(f"{BASE_URL}/health")
                print(f"🔁 Keep-alive ping: {response.status_code}")
            except Exception as e:
                print(f"❌ Keep-alive ping failed: {e}")

            await asyncio.sleep(180)  # 3 minutes


# ==============================
# 🚀 STARTUP EVENT
# ==============================
@app.on_event("startup")
async def startup_event():
    # Ensure admin user exists
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if not user:
            print("Creating admin user...")
            hashed_pwd = auth.get_password_hash("1234")
            admin_user = models.User(username="admin", password_hash=hashed_pwd)
            db.add(admin_user)
            db.commit()
            print("Admin user created successfully.")
    except Exception as e:
        print(f"Error creating admin user on startup: {e}")
    finally:
        db.close()

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
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
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

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception

    return user


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
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, password_hash=hashed_password)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=schemas.Token)
def login(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()

    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ==============================
# 🕒 WORK TRACKING
# ==============================
@app.post("/work/start", response_model=schemas.WorkLogOut)
def start_work(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    open_session = db.query(models.WorkLog).filter(
        models.WorkLog.user_id == current_user.id,
        models.WorkLog.logout_time == None
    ).first()

    if open_session:
        raise HTTPException(status_code=400, detail="You already have an active session.")

    new_log = models.WorkLog(
        user_id=current_user.id,
        login_time=datetime.now(timezone.utc)
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


@app.post("/work/stop", response_model=schemas.WorkLogOut)
def stop_work(
    log_data: schemas.WorkLogStop,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    active_session = db.query(models.WorkLog).filter(
        models.WorkLog.user_id == current_user.id,
        models.WorkLog.logout_time == None
    ).first()

    if not active_session:
        raise HTTPException(status_code=400, detail="No active work session found.")

    login_time = active_session.login_time
    if login_time.tzinfo is None:
        login_time = login_time.replace(tzinfo=timezone.utc)

    logout_time = datetime.now(timezone.utc)
    duration = int((logout_time - login_time).total_seconds() / 60)

    active_session.logout_time = logout_time
    active_session.duration_minutes = duration
    active_session.pop_description = log_data.pop_description
    active_session.push_command = log_data.push_command

    db.commit()
    db.refresh(active_session)
    return active_session


@app.get("/work/logs", response_model=list[schemas.WorkLogOut])
def get_work_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    logs = db.query(models.WorkLog).filter(
        models.WorkLog.user_id == current_user.id
    ).order_by(models.WorkLog.login_time.desc()).all()

    for log in logs:
        if log.login_time and log.login_time.tzinfo is None:
            log.login_time = log.login_time.replace(tzinfo=timezone.utc)
        if log.logout_time and log.logout_time.tzinfo is None:
            log.logout_time = log.logout_time.replace(tzinfo=timezone.utc)

    return logs


@app.get("/work/status")
def get_work_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    active_session = db.query(models.WorkLog).filter(
        models.WorkLog.user_id == current_user.id,
        models.WorkLog.logout_time == None
    ).first()

    if active_session:
        start_time = active_session.login_time
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        return {"status": "active", "start_time": start_time}

    return {"status": "inactive"}


# ==============================
# 🛠️ ADMIN ROUTES
# ==============================
@app.get("/admin/users", response_model=list[schemas.UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    return db.query(models.User).all()


@app.get("/admin/logs", response_model=list[schemas.WorkLogAdminOut])
def get_all_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    logs = db.query(models.WorkLog).join(models.User).order_by(
        models.WorkLog.login_time.desc()
    ).all()

    for log in logs:
        if log.login_time and log.login_time.tzinfo is None:
            log.login_time = log.login_time.replace(tzinfo=timezone.utc)
        if log.logout_time and log.logout_time.tzinfo is None:
            log.logout_time = log.logout_time.replace(tzinfo=timezone.utc)

    return logs
