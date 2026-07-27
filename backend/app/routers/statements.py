from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import uuid

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user
from app.parsers import parse_pdf_statement
from app.schemas import TransactionResponse

router = APIRouter()

UPLOAD_DIR = "storage/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=List[TransactionResponse])
async def upload_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    user_upload_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)

    file_path = os.path.join(user_upload_dir, f"{uuid.uuid4()}_{file.filename}")

    try:
        with open(file_path, "wb") as buffer:
            while content := await file.read(1024 * 1024):
                buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Parse the PDF
    parsed_transactions = parse_pdf_statement(file_path)

    if not parsed_transactions:
        raise HTTPException(status_code=400, detail="Could not extract any transactions from the PDF. The format might not be supported.")

    # Save to database
    db_transactions = []
    for pt in parsed_transactions:
        txn = Transaction(
            user_id=current_user.id,
            date=pt["date"],
            description=pt["description"][:500], # Trucate just in case
            amount=pt["amount"],
            type=pt["type"],
            category=pt["category"]
        )
        db.add(txn)
        db_transactions.append(txn)

    await db.commit()

    # Refresh is not strictly needed for lists if we just return what we created but we need IDs
    for txn in db_transactions:
        await db.refresh(txn)

    return db_transactions
