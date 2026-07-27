from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    transactions = relationship("Transaction", back_populates="user")
    future_plans = relationship("FuturePlan", back_populates="user")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    date = Column(Date, nullable=False)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String(10), nullable=False) # "CREDIT" or "DEBIT"
    category = Column(String(100), nullable=True) # Normalized category

    user = relationship("User", back_populates="transactions")

class FuturePlan(Base):
    __tablename__ = "future_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    item_name = Column(String(255), nullable=False)
    estimated_cost = Column(Float, nullable=False)
    notes = Column(String(1000), nullable=True)

    user = relationship("User", back_populates="future_plans")
