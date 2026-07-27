from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
import csv
import io
import openpyxl

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user

router = APIRouter()

@router.get("/csv")
async def export_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Transaction).where(Transaction.user_id == current_user.id).order_by(desc(Transaction.date))
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Amount", "Type", "Category"])

    for t in transactions:
        writer.writerow([t.date.strftime("%d/%m/%Y"), t.description, t.amount, t.type, t.category])

    output.seek(0)

    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=transactions.csv"
    return response

@router.get("/xlsx")
async def export_xlsx(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Transaction).where(Transaction.user_id == current_user.id).order_by(desc(Transaction.date))
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions"

    ws.append(["Date", "Description", "Amount", "Type", "Category"])

    for t in transactions:
        ws.append([t.date.strftime("%d/%m/%Y"), t.description, t.amount, t.type, t.category])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    response = StreamingResponse(iter([output.getvalue()]), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response.headers["Content-Disposition"] = "attachment; filename=transactions.xlsx"
    return response
