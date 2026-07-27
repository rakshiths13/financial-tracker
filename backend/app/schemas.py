from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TransactionBase(BaseModel):
    date: date
    description: str
    amount: float
    type: str
    category: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class FuturePlanBase(BaseModel):
    item_name: str
    estimated_cost: float
    notes: Optional[str] = None

class FuturePlanResponse(FuturePlanBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class FuturePlanCreate(FuturePlanBase):
    pass
