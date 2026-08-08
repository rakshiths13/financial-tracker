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



class StatementUploadResponse(BaseModel):
    file_name: str
    status: str  # 'success' | 'failed' | 'no_data'
    error: Optional[str] = None
    parsed_count: int = 0
    skipped_count: int = 0
    transaction_ids: List[int] = []


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
