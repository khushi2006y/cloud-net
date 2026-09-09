from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "USER"
    active: bool = True


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "USER"


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
