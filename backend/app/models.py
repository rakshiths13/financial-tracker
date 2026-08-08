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
    statement_uploads = relationship("StatementUpload", back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    date = Column(Date, nullable=False)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String(10), nullable=False)   # "CREDIT" or "DEBIT"
    category = Column(String(100), nullable=True)
    bank_name = Column(String(100), nullable=True)  # Source bank for per-bank analytics

    # Source: "STATEMENT" (from PDF upload) or "MANUAL" (manually entered)
    source = Column(String(20), nullable=True, default="STATEMENT")

    # Transfer classification:
    # "none"              – regular income/expense, include in KPIs
    # "internal_transfer" – confident transfer between own accounts, exclude from KPIs
    # "possible_transfer" – uncertain, exclude from income KPIs but still tracked
    # "incoming_transfer" – money arriving from external party (could be income)
    # "outgoing_transfer" – money going to external party
    transfer_type = Column(String(30), nullable=True, default="none")

    # Convenience boolean derived from transfer_type for quick filtering
    # True when transfer_type in ("internal_transfer", "possible_transfer")
    is_transfer = Column(Boolean, nullable=True, default=False)

    user = relationship("User", back_populates="transactions")


class FuturePlan(Base):
    __tablename__ = "future_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    item_name = Column(String(255), nullable=False)
    estimated_cost = Column(Float, nullable=False)
    notes = Column(String(1000), nullable=True)

    user = relationship("User", back_populates="future_plans")


class StatementUpload(Base):
    __tablename__ = "statement_uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    bank_name = Column(String(100), nullable=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    status = Column(String(20), nullable=False)

    user = relationship("User", back_populates="statement_uploads")
