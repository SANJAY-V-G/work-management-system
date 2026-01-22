from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import auth

def create_admin_user():
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
        else:
            print("Admin user already exists.")
            # Optional: update password if needed, but for now assuming it's fine
    except Exception as e:
        print(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
