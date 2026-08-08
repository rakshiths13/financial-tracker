from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, desc, or_
from typing import List, Optional
from datetime import date
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user

router = APIRouter()


def _start_date(months: int) -> date:
    return date.today() - relativedelta(months=months)


def _no_transfer_filter():
    """
    Filter that excludes internal_transfer and possible_transfer from KPI aggregations.
    Rows where is_transfer is NULL (legacy data) are treated as non-transfers.
    """
    return or_(
        Transaction.is_transfer == False,   # noqa: E712  (SQLAlchemy needs ==)
        Transaction.is_transfer.is_(None),
    )


def _build_filters(
    user_id: int,
    months: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    bank_name: Optional[str] = None,
    tx_type: Optional[str] = None,
    exclude_transfers: bool = True,
    source: Optional[str] = None,
    transfer_type: Optional[str] = None,
    category: Optional[str] = None,
):
    """Build a list of SQLAlchemy filter conditions."""
    filters = [Transaction.user_id == user_id]

    if start_date:
        filters.append(Transaction.date >= start_date)
    elif months:
        filters.append(Transaction.date >= _start_date(months))

    if end_date:
        filters.append(Transaction.date <= end_date)

    if bank_name and bank_name.lower() != "all":
        filters.append(Transaction.bank_name == bank_name)

    if tx_type:
        filters.append(Transaction.type == tx_type)

    if source and source.lower() != "all":
        filters.append(Transaction.source == source.upper())

    if transfer_type and transfer_type.lower() != "all":
        filters.append(Transaction.transfer_type == transfer_type)
        # If user explicitly asks for a transfer type, we ignore exclude_transfers
        exclude_transfers = False

    if category and category.lower() != "all":
        filters.append(Transaction.category == category)

    if exclude_transfers:
        filters.append(_no_transfer_filter())

    return filters


# ─── Bank list ────────────────────────────────────────────────────────────────

@router.get("/bank-list")
async def get_bank_list(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return distinct bank names for the current user's transactions."""
    stmt = (
        select(Transaction.bank_name)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.bank_name.isnot(None))
        .group_by(Transaction.bank_name)
        .order_by(Transaction.bank_name)
    )
    result = await db.execute(stmt)
    banks = [row.bank_name for row in result.all() if row.bank_name]
    return {"banks": banks}


# ─── Dashboard KPIs ───────────────────────────────────────────────────────────

@router.get("/dashboard-kpis")
async def get_dashboard_kpis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns precise dashboard KPI values:
    - avg_income_3m: Average non-transfer credits over last 3 months
    - last_month_income: Non-transfer credits in the previous calendar month
    - last_month_expense: Non-transfer debits in the previous calendar month
    - last_month_savings: last_month_income - last_month_expense
    - has_last_month_data: whether actual data exists for last month
    - income_label: string explaining which period was used
    """
    today = date.today()
    uid = current_user.id

    # ── Previous calendar month bounds ────────────────────────────────────────
    first_of_this_month = today.replace(day=1)
    prev_month_end = first_of_this_month - relativedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    # ── 3-month window for average income ────────────────────────────────────
    three_months_ago = _start_date(3)

    async def _sum(tx_type: str, start: date, end: date, exclude_transfers: bool = True, income_only: bool = False) -> float:
        f = [
            Transaction.user_id == uid,
            Transaction.type == tx_type,
            Transaction.date >= start,
            Transaction.date <= end,
        ]
        if exclude_transfers:
            f.append(_no_transfer_filter())
        if income_only:
            # Strict KPI logic: Only pure income, not refunds or cash deposits
            f.append(Transaction.category == "Income / Transfers")
            f.append(Transaction.transfer_type == "none")

        res = await db.execute(select(func.sum(Transaction.amount)).where(and_(*f)))
        return res.scalar() or 0.0

    # Total pure income in last 3 months
    total_income_3m = await _sum("CREDIT", three_months_ago, today, income_only=True)
    avg_income_3m = round(total_income_3m / 3.0, 0)

    # Last month income and expense
    last_month_income = await _sum("CREDIT", prev_month_start, prev_month_end, income_only=True)
    last_month_expense = await _sum("DEBIT", prev_month_start, prev_month_end)
    last_month_savings = round(last_month_income - last_month_expense, 0)

    # Determine if we have any data at all for last month
    has_last_month_data = (last_month_income > 0 or last_month_expense > 0)

    # Income label for display
    if total_income_3m > 0:
        income_label = "Avg Income (Last 3 Months)"
        display_income = avg_income_3m
    elif last_month_income > 0:
        income_label = "Income (Last Month)"
        display_income = round(last_month_income, 0)
    else:
        income_label = "Avg Income (Last 3 Months)"
        display_income = 0.0

    return {
        "avg_income_3m": avg_income_3m,
        "last_month_income": round(last_month_income, 0),
        "last_month_expense": round(last_month_expense, 0),
        "last_month_savings": last_month_savings,
        "has_last_month_data": has_last_month_data,
        "income_label": income_label,
        "display_income": display_income,
        "period": {
            "prev_month_start": prev_month_start.isoformat(),
            "prev_month_end": prev_month_end.isoformat(),
            "three_months_ago": three_months_ago.isoformat(),
        },
    }


# ─── Spending by category ─────────────────────────────────────────────────────

@router.get("/spending-by-category")
async def get_spending_by_category(
    months: int = Query(1, description="Look-back period in months"),
    bank_name: Optional[str] = Query(None, description="Filter by bank (omit or 'all' for all banks)"),
    source: Optional[str] = Query(None),
    transfer_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if months not in [1, 3, 6, 12] and not (start_date or end_date):
        months = 1
    filters = _build_filters(current_user.id, months=months, start_date=start_date,
                              end_date=end_date, bank_name=bank_name, tx_type="DEBIT",
                              source=source, transfer_type=transfer_type,
                              exclude_transfers=True)
    stmt = (
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(and_(*filters))
        .group_by(Transaction.category)
        .order_by(desc("total"))
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {"name": row.category or "Others", "value": round(row.total, 0)}
        for row in rows
        if row.total and row.total > 0
    ]


# ─── Monthly totals ───────────────────────────────────────────────────────────

@router.get("/monthly-totals")
async def get_monthly_totals(
    months: int = Query(6, description="Look-back period in months"),
    bank_name: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    transfer_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return monthly debit/credit totals for trend charts (transfers excluded)."""
    if months not in [1, 3, 6, 12]:
        months = 6
    filters = _build_filters(current_user.id, months=months, bank_name=bank_name,
                              source=source, transfer_type=transfer_type,
                              exclude_transfers=True)

    stmt = (
        select(
            func.year(Transaction.date).label("year"),
            func.month(Transaction.date).label("month"),
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .where(and_(*filters))
        .group_by("year", "month", Transaction.type)
        .order_by("year", "month")
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Pivot into {month_label, debit, credit}
    month_map: dict = {}
    for row in rows:
        label = f"{row.year}-{str(row.month).zfill(2)}"
        if label not in month_map:
            month_map[label] = {"month": label, "debit": 0.0, "credit": 0.0}
        if row.type == "DEBIT":
            month_map[label]["debit"] = round(row.total, 0)
        else:
            month_map[label]["credit"] = round(row.total, 0)

    return sorted(month_map.values(), key=lambda x: x["month"])


# ─── Category summary ─────────────────────────────────────────────────────────

@router.get("/category-summary")
async def get_category_summary(
    months: int = Query(1),
    bank_name: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    transfer_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Category totals for the Analysis page. Transfers excluded."""
    if months not in [1, 3, 6, 12] and not (start_date or end_date):
        months = 1
    filters = _build_filters(current_user.id, months=months, start_date=start_date,
                              end_date=end_date, bank_name=bank_name, tx_type="DEBIT",
                              source=source, transfer_type=transfer_type,
                              exclude_transfers=True)
    stmt = (
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(and_(*filters))
        .group_by(Transaction.category)
        .order_by(desc("total"))
    )
    result = await db.execute(stmt)
    rows = result.all()
    total_spend = sum(r.total for r in rows if r.total)
    return {
        "total_spend": round(total_spend, 0),
        "categories": [
            {
                "name": row.category or "Others",
                "value": round(row.total, 0),
                "pct": round(row.total / total_spend * 100, 1) if total_spend else 0,
            }
            for row in rows
            if row.total and row.total > 0
        ],
    }


# ─── Bank-wise comparison ──────────────────────────────────────────────────────

@router.get("/bank-comparison")
async def get_bank_comparison(
    months: int = Query(3),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return per-bank spending totals (transfers excluded)."""
    if months not in [1, 3, 6, 12]:
        months = 3
    start = _start_date(months)

    stmt = (
        select(
            Transaction.bank_name,
            func.sum(Transaction.amount).label("total_debit"),
        )
        .where(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.type == "DEBIT",
                Transaction.date >= start,
                Transaction.bank_name.isnot(None),
                _no_transfer_filter(),
            )
        )
        .group_by(Transaction.bank_name)
        .order_by(desc("total_debit"))
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {"bank": row.bank_name or "Unknown", "spending": round(row.total_debit, 0)}
        for row in rows
    ]


# ─── Period comparison ────────────────────────────────────────────────────────

@router.get("/period-comparison")
async def get_period_comparison(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Compare spending periods (transfers excluded from all figures):
    - Current month vs previous month
    - Last 3 months vs prior 3 months
    - Last 6 months vs prior 6 months
    """
    today = date.today()

    async def get_debit_total(start: date, end: date) -> float:
        stmt = select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.type == "DEBIT",
                Transaction.date >= start,
                Transaction.date <= end,
                _no_transfer_filter(),
            )
        )
        result = await db.execute(stmt)
        return round(result.scalar() or 0, 0)

    curr_month_start = today.replace(day=1)
    prev_month_end = curr_month_start - relativedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    now_3m_start = _start_date(3)
    prev_3m_start = _start_date(6)
    prev_3m_end = now_3m_start - relativedelta(days=1)

    now_6m_start = _start_date(6)
    prev_6m_start = _start_date(12)
    prev_6m_end = now_6m_start - relativedelta(days=1)

    curr_month = await get_debit_total(curr_month_start, today)
    prev_month = await get_debit_total(prev_month_start, prev_month_end)
    curr_3m = await get_debit_total(now_3m_start, today)
    prev_3m = await get_debit_total(prev_3m_start, prev_3m_end)
    curr_6m = await get_debit_total(now_6m_start, today)
    prev_6m = await get_debit_total(prev_6m_start, prev_6m_end)

    def pct_change(curr: float, prev: float) -> float:
        if prev == 0:
            return 0.0
        return round((curr - prev) / prev * 100, 1)

    return {
        "current_month": {"label": today.strftime("%B %Y"), "value": curr_month},
        "prev_month": {"label": prev_month_end.strftime("%B %Y"), "value": prev_month},
        "month_change_pct": pct_change(curr_month, prev_month),
        "curr_3m": {"label": "Last 3 Months (actual)", "value": curr_3m},
        "prev_3m": {"label": "Prev 3 Months (actual)", "value": prev_3m},
        "three_month_change_pct": pct_change(curr_3m, prev_3m),
        "curr_6m": {"label": "Last 6 Months (actual)", "value": curr_6m},
        "prev_6m": {"label": "Prev 6 Months (actual)", "value": prev_6m},
        "six_month_change_pct": pct_change(curr_6m, prev_6m),
    }


# ─── Savings calculator ───────────────────────────────────────────────────────

@router.get("/savings-calculator")
async def get_savings_calculator(
    target_amount: float = Query(...),
    months_to_save: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Savings feasibility calculator using last 6 months of actual income (transfers excluded).
    avg_monthly_income is based on REAL credits only.
    """
    start = _start_date(6)
    income_res = await db.execute(
        select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.type == "CREDIT",
                Transaction.date >= start,
                _no_transfer_filter(),
            )
        )
    )
    total_income_6m = income_res.scalar() or 0
    avg_monthly_income = total_income_6m / 6.0 if total_income_6m > 0 else 0
    required_monthly_savings = target_amount / months_to_save if months_to_save > 0 else target_amount
    max_monthly_spend = max(0, avg_monthly_income - required_monthly_savings)
    return {
        "target_amount": target_amount,
        "months_to_save": months_to_save,
        "avg_monthly_income": round(avg_monthly_income, 0),
        "required_monthly_savings": round(required_monthly_savings, 0),
        "max_monthly_spend": round(max_monthly_spend, 0),
        "feasible": avg_monthly_income >= required_monthly_savings,
    }
