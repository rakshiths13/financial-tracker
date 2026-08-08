from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import uuid

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user
from app.parsers import parse_pdf_statement, detect_bank
from app.schemas import StatementUploadResponse

router = APIRouter()

UPLOAD_DIR = "storage/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILES = 7


@router.post("/upload", response_model=List[StatementUploadResponse])
async def upload_statements(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_FILES} files allowed per upload.",
        )

    user_upload_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)

    upload_results: List[dict] = []

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            upload_results.append({
                "file_name": file.filename or "unknown",
                "status": "failed",
                "error": "Only PDF files are supported.",
                "parsed_count": 0,
                "skipped_count": 0,
                "transaction_ids": [],
            })
            continue

        file_path = os.path.join(user_upload_dir, f"{uuid.uuid4()}_{file.filename}")

        # Save file to disk
        try:
            contents = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(contents)
        except Exception as e:
            upload_results.append({
                "file_name": file.filename,
                "status": "failed",
                "error": f"Failed to save file: {str(e)}",
                "parsed_count": 0,
                "skipped_count": 0,
                "transaction_ids": [],
            })
            continue

        # Detect bank from file
        detected_bank = detect_bank(file_path)

        # Parse the PDF
        try:
            parsed_transactions = parse_pdf_statement(file_path)
        except Exception as e:
            upload_results.append({
                "file_name": file.filename,
                "status": "failed",
                "error": f"Parsing error: {str(e)}",
                "parsed_count": 0,
                "skipped_count": 0,
                "transaction_ids": [],
            })
            continue

        if not parsed_transactions:
            upload_results.append({
                "file_name": file.filename,
                "status": "no_data",
                "error": "No transactions could be extracted. Format may not be supported.",
                "parsed_count": 0,
                "skipped_count": 0,
                "transaction_ids": [],
            })
            continue

        # Insert transactions with simple deduplication
        inserted_ids: List[int] = []
        skipped = 0

        for pt in parsed_transactions:
            # Deduplication: same user, date, description (first 100 chars), amount, type
            from sqlalchemy.future import select
            from sqlalchemy import and_
            dup_check = await db.execute(
                select(Transaction.id).where(
                    and_(
                        Transaction.user_id == current_user.id,
                        Transaction.date == pt["date"],
                        Transaction.amount == pt["amount"],
                        Transaction.type == pt["type"],
                        Transaction.description == pt["description"][:500],
                    )
                )
            )
            existing = dup_check.scalar_one_or_none()
            if existing:
                skipped += 1
                continue

            txn = Transaction(
                user_id=current_user.id,
                date=pt["date"],
                description=pt["description"][:500],
                amount=pt["amount"],
                type=pt["type"],
                category=pt["category"],
                bank_name=pt.get("bank_name") or detected_bank,
                source=pt.get("source", "STATEMENT"),
                transfer_type=pt.get("transfer_type", "none"),
                is_transfer=pt.get("is_transfer", False),
            )
            db.add(txn)
            await db.flush()  # get ID without full commit
            inserted_ids.append(txn.id)

        await db.commit()

        upload_results.append({
            "file_name": file.filename,
            "status": "success",
            "error": None,
            "parsed_count": len(parsed_transactions),
            "skipped_count": skipped,
            "transaction_ids": inserted_ids,
        })

    return upload_results
