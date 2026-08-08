from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, and_
from typing import Optional
import csv
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, numbers
from datetime import date
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user

router = APIRouter()


def _apply_filters(stmt, user_id: int, start_date: Optional[date], end_date: Optional[date]):
    """Apply optional date-range filters and always filter by user."""
    stmt = stmt.where(Transaction.user_id == user_id)
    if start_date:
        stmt = stmt.where(Transaction.date >= start_date)
    if end_date:
        stmt = stmt.where(Transaction.date <= end_date)
    return stmt


def _month_range(year: int, month: int):
    """Return (start, end) date for a given year+month."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    return start, end


@router.get("/csv")
async def export_csv(
    start_date: Optional[date] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month number (1-12)"),
    year: Optional[int] = Query(None, description="Filter by year (used with month)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # month shorthand overrides explicit dates
    if month:
        y = year or date.today().year
        start_date, end_date = _month_range(y, month)

    stmt = select(Transaction).order_by(desc(Transaction.date))
    stmt = _apply_filters(stmt, current_user.id, start_date, end_date)
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Amount (₹)", "Type", "Category", "Bank", "Source", "Transfer Type"])

    for t in transactions:
        writer.writerow([
            t.date.strftime("%d/%m/%Y"),
            t.description,
            f"{t.amount:,.0f}",
            t.type,
            t.category or "Others",
            t.bank_name or "Unknown",
            (t.source or "STATEMENT").upper(),
            t.transfer_type or "none",
        ])

    output.seek(0)
    filename = "transactions"
    if start_date and end_date:
        filename += f"_{start_date}_{end_date}"
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={filename}.csv"
    return response


@router.get("/xlsx")
async def export_xlsx(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if month:
        y = year or date.today().year
        start_date, end_date = _month_range(y, month)

    stmt = select(Transaction).order_by(desc(Transaction.date))
    stmt = _apply_filters(stmt, current_user.id, start_date, end_date)
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions"

    # ── Header row styling ────────────────────────────────────────────────────
    header_fill = PatternFill("solid", fgColor="6366F1")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    headers = ["Date", "Description", "Amount (₹)", "Type", "Category", "Bank", "Source", "Transfer Type"]
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    # ── Data rows ─────────────────────────────────────────────────────────────
    DEBIT_FILL = PatternFill("solid", fgColor="FEF2F2")
    CREDIT_FILL = PatternFill("solid", fgColor="F0FDF4")

    for row_idx, t in enumerate(transactions, 2):
        row_fill = DEBIT_FILL if t.type == "DEBIT" else CREDIT_FILL
        amount_int = round(t.amount)

        values = [
            t.date.strftime("%d/%m/%Y"),
            t.description,
            amount_int,
            t.type,
            t.category or "Others",
            t.bank_name or "Unknown",
            (t.source or "STATEMENT").upper(),
            t.transfer_type or "none",
        ]
        for col_idx, val in enumerate(values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.fill = row_fill
            # Explicitly set numeric format on amount column to prevent scientific notation
            if col_idx == 3:
                cell.number_format = '#,##0'
                cell.alignment = Alignment(horizontal="right")

    # ── Column widths ─────────────────────────────────────────────────────────
    col_widths = [14, 50, 16, 10, 22, 14, 14, 18]
    for i, width in enumerate(col_widths, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = width

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = "transactions"
    if start_date and end_date:
        filename += f"_{start_date}_{end_date}"
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response.headers["Content-Disposition"] = f"attachment; filename={filename}.xlsx"
    return response
