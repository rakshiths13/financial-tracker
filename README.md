# Personal Finance Tracker

A local-first personal finance web app designed with an India-friendly focus (INR, DD/MM/YYYY dates).
This app allows you to upload PDF bank statements, parse and normalize them, store them in a local MySQL database, view interactive spending charts, use a savings calculator, and maintain a future-plans wishlist.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router), React 18, TypeScript, TailwindCSS, Recharts, Framer Motion, Axios, React Hook Form, Zod, react-hot-toast, lucide-react.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2.0 async, aiomysql, Pydantic v2, pydantic-settings, Alembic, python-jose, passlib[bcrypt], python-multipart, pdfplumber, camelot-py[cv].
- **Database**: MySQL 8.0 local.

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0
- Ghostscript (required for camelot-py PDF parsing fallback)
  - Ubuntu/Debian: `sudo apt-get install ghostscript`
  - macOS: `brew install ghostscript`
  - Windows: Download from the official site.

### Database Setup
Ensure you have a local MySQL 8.0 server running.
Create a database named `personal_finance` and a user with access to it.

### Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and fill in your database credentials.
6. Run migrations: `alembic upgrade head`
7. Start the server: `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Start the dev server: `npm run dev`

The frontend will be available at `http://localhost:3000`.
The backend API and docs will be available at `http://127.0.0.1:8000/docs`.
