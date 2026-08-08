# Personal Finance Tracker

A robust, full-stack personal finance application that allows users to track spending, monitor income, and manage manual and automated transactions via PDF bank statement uploads.

## Features

- **Automated Statement Parsing**: Upload PDF bank statements to automatically extract and categorize transactions.
- **Advanced Analytics & KPIs**: Interactive dashboards with breakdown by category, bank, and transfer types.
- **Strict Income Logic**: Separates pure income from generic credits and transfers.
- **Manual Transactions**: Seamlessly add cash or manual transactions to supplement bank data.
- **Transfer Reclassification**: Total control over categorizing transactions as internal, possible, incoming, or outgoing transfers.
- **Export**: Export clean, structured data for external reporting.

## Tech Stack

- **Frontend**: Next.js (React), Tailwind CSS, Framer Motion, Recharts, Lucide Icons.
- **Backend**: FastAPI (Python), SQLAlchemy, SQLite, PyMuPDF.

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Environment Setup:
Create a `.env` file in the `backend/` directory:
```env
SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite+aiosqlite:///./finance.db
```

Run the backend:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Environment Setup:
Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Run the frontend:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## Known Limitations
- Counterparty resolution currently relies on regex heuristics without direct banking API integrations.
- PDF extraction heuristics are optimized for specific standard Indian bank statement formats (e.g., HDFC, SBI, ICICI). 
