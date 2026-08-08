from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, statements, analytics, export, wishlist, transactions

app = FastAPI(title="Personal Finance Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(statements.router, prefix="/api/v1/statements", tags=["statements"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(export.router, prefix="/api/v1/export", tags=["export"])
app.include_router(wishlist.router, prefix="/api/v1/wishlist", tags=["wishlist"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])


@app.get("/")
def read_root():
    return {"message": "Welcome to Personal Finance Tracker API"}
