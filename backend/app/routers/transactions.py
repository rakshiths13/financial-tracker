from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import date
from pydantic import BaseModel, validator

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user
from app.parsers import detect_transfer_type, is_transfer_excluded_from_kpis, categorize_transaction

router = APIRouter()

VALID_TYPES = {"DEBIT", "CREDIT"}
VALID_CATEGORIES = [
    "Groceries", "Online Shopping", "Food & Dining", "Recharge",
    "Bills & Utilities", "Travel & Transport", "ATM / Cash",
    "Entertainment", "Healthcare", "Personal", "EMI / Loans",
    "Income / Transfers", "Others",
]


class TransactionCreate(BaseModel):
    date: date
    description: str
    amount: float
    type: str
    category: str
    bank_name: str

    @validator("type")
    def validate_type(cls, v):
        v = v.upper()
        if v not in VALID_TYPES:
            raise ValueError(f"type must be one of {VALID_TYPES}")
        return v

    @validator("amount")
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("amount must be positive")
        return round(v, 2)

    @validator("description")
    def validate_description(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("description cannot be empty")
        return v


class TransactionResponse(BaseModel):
    id: int
    date: date
    description: str
    amount: float
    type: str
    category: str
    bank_name: str
    source: Optional[str]
    transfer_type: Optional[str]
    is_transfer: Optional[bool]

    class Config:
        from_attributes = True


class TransactionReclassify(BaseModel):
    category: Optional[str] = None
    transfer_type: Optional[str] = None


@router.post("/manual", response_model=TransactionResponse)
async def create_manual_transaction(
    tx: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    transfer_type = detect_transfer_type(tx.description, tx.type)
    new_tx = Transaction(
        user_id=current_user.id,
        date=tx.date,
        description=tx.description,
        amount=tx.amount,
        type=tx.type,
        category=tx.category,
        bank_name=tx.bank_name,
        source="MANUAL",
        transfer_type=transfer_type,
        is_transfer=is_transfer_excluded_from_kpis(transfer_type),
    )
    db.add(new_tx)
    await db.commit()
    await db.refresh(new_tx)
    return new_tx


@router.get("/", response_model=List[TransactionResponse])
async def get_all_transactions(
    limit: int = 500,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all recent transactions (manual and statement) for the user."""
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/manual", response_model=List[TransactionResponse])
async def get_manual_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Transaction)
        .where(
            Transaction.user_id == current_user.id,
            Transaction.source == "MANUAL",
        )
        .order_by(Transaction.date.desc(), Transaction.id.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/manual/{tx_id}", response_model=TransactionResponse)
async def update_manual_transaction(
    tx_id: int,
    tx_update: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Transaction).where(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
        Transaction.source == "MANUAL",
    )
    result = await db.execute(stmt)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    transfer_type = detect_transfer_type(tx_update.description, tx_update.type)
    tx.date = tx_update.date
    tx.description = tx_update.description
    tx.amount = tx_update.amount
    tx.type = tx_update.type
    tx.category = tx_update.category
    tx.bank_name = tx_update.bank_name
    tx.transfer_type = transfer_type
    tx.is_transfer = is_transfer_excluded_from_kpis(transfer_type)

    await db.commit()
    await db.refresh(tx)
    return tx


@router.delete("/manual/{tx_id}")
async def delete_manual_transaction(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Transaction).where(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
        Transaction.source == "MANUAL",
    )
    result = await db.execute(stmt)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    await db.delete(tx)
    await db.commit()
    return {"status": "deleted"}


@router.patch("/{tx_id}/reclassify", response_model=TransactionResponse)
async def reclassify_transaction(
    tx_id: int,
    tx_update: TransactionReclassify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reclassify category and/or transfer_type for ANY transaction."""
    stmt = select(Transaction).where(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx_update.category is not None:
        tx.category = tx_update.category

    if tx_update.transfer_type is not None:
        if tx_update.transfer_type == "auto":
            tx.transfer_type = detect_transfer_type(tx.description, tx.type)
        else:
            tx.transfer_type = tx_update.transfer_type
        tx.is_transfer = is_transfer_excluded_from_kpis(tx.transfer_type)

    await db.commit()
    await db.refresh(tx)
    return tx
