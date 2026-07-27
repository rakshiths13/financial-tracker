from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, desc
from typing import List, Dict, Any
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user

router = APIRouter()

@router.get("/spending-by-category")
async def get_spending_by_category(
    months: int = Query(1, description="Number of months to look back (1, 3, or 6)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if months not in [1, 3, 6]:
        months = 1

    start_date = date.today() - relativedelta(months=months)

    stmt = (
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.type == "DEBIT",
                Transaction.date >= start_date
            )
        )
        .group_by(Transaction.category)
        .order_by(desc("total"))
    )

    result = await db.execute(stmt)
    data = result.all()

    return [{"name": row.category or "Uncategorized", "value": round(row.total, 2)} for row in data]


@router.get("/savings-calculator")
async def get_savings_calculator(
    target_amount: float = Query(..., description="Target amount to save (e.g., 300000)"),
    months_to_save: int = Query(..., description="Timeframe in months (e.g., 3 for a quarter)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Calculate average monthly income over the last 6 months
    start_date = date.today() - relativedelta(months=6)

    income_stmt = select(func.sum(Transaction.amount)).where(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.type == "CREDIT",
            Transaction.date >= start_date
        )
    )
    income_res = await db.execute(income_stmt)
    total_income_6m = income_res.scalar() or 0
    avg_monthly_income = total_income_6m / 6.0 if total_income_6m > 0 else 0

    required_monthly_savings = target_amount / months_to_save if months_to_save > 0 else target_amount

    max_monthly_spend = max(0, avg_monthly_income - required_monthly_savings)

    return {
        "target_amount": target_amount,
        "months_to_save": months_to_save,
        "avg_monthly_income": round(avg_monthly_income, 2),
        "required_monthly_savings": round(required_monthly_savings, 2),
        "max_monthly_spend": round(max_monthly_spend, 2),
        "feasible": avg_monthly_income >= required_monthly_savings
    }
