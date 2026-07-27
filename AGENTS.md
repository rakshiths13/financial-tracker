# Agents Instructions

- Backend cwd: `backend` · start: activate venv -> `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
- Frontend cwd: `frontend` · start: `npm install && npm run dev` (Next.js port 3000)
- API base: `http://127.0.0.1:8000` · docs: `http://127.0.0.1:8000/docs`
- Frontend env: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- CORS allow origin: `http://localhost:3000` only
- All API routes prefix: `/api/v1`
- PDF uploads: `backend/storage/uploads/{user_id}/`
- Never hardcode DB credentials — use `backend/.env` via pydantic-settings
