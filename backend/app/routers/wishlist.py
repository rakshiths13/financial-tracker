from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models import User, FuturePlan
from app.auth import get_current_user
from app.schemas import FuturePlanCreate, FuturePlanResponse

router = APIRouter()

@router.post("/", response_model=FuturePlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan: FuturePlanCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    db_plan = FuturePlan(
        user_id=current_user.id,
        item_name=plan.item_name,
        estimated_cost=plan.estimated_cost,
        notes=plan.notes
    )
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan)
    return db_plan

@router.get("/", response_model=List[FuturePlanResponse])
async def read_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(FuturePlan).where(FuturePlan.user_id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(FuturePlan).where(FuturePlan.id == plan_id, FuturePlan.user_id == current_user.id)
    result = await db.execute(stmt)
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    await db.delete(plan)
    await db.commit()
