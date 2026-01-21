from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)

    work_logs = relationship("WorkLog", back_populates="user")

class WorkLog(Base):
    __tablename__ = "work_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    login_time = Column(DateTime, default=datetime.datetime.utcnow)
    logout_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    pop_description = Column(String, nullable=True)
    push_command = Column(String, nullable=True)

    user = relationship("User", back_populates="work_logs")
