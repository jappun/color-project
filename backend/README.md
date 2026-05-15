# Color project — FastAPI backend

Analyzes patient intake using RAG over Markdown files under `guidelines/` and the Gemini API.

## Prerequisites

- Python 3.10+ recommended
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

## Install

From the repository root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## API key

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set `GEMINI_API_KEY` to your real key (do not commit `.env`).

## Run the server

```bash
cd backend
source .venv/bin/activate   # if not already active
uvicorn main:app --reload
```

The API listens on `http://127.0.0.1:8000` by default.

### Endpoint

- **POST** `/api/analyze` — JSON body with intake fields; returns structured JSON from Gemini (see `main.py` for the schema).

CORS is enabled for `http://localhost:5173` (Vite) and `http://localhost:3000`.
