from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class WorkLogBase(BaseModel):
    pass

class WorkLogStop(BaseModel):
    pop_description: str
    push_command: str

class WorkLogOut(BaseModel):
    id: int
    login_time: datetime
    logout_time: Optional[datetime]
    duration_minutes: Optional[int]
    pop_description: Optional[str]
    push_command: Optional[str]
    
    class Config:
        orm_mode = True

class UserOut(BaseModel):
    id: int
    username: str
    
    class Config:
        orm_mode = True
