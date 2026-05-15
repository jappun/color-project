# Run: uvicorn main:app --reload
from __future__ import annotations

import json
import os
import re
import textwrap
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parent / ".env")

_BACKEND_ROOT = Path(__file__).resolve().parent
_GUIDELINES_DIR = _BACKEND_ROOT / "guidelines"


def _load_guidelines() -> dict[str, dict[str, str]]:
    """Load cancers from backend/guidelines/<type>/*.md or *.txt."""
    chunks: dict[str, dict[str, str]] = {}
    if not _GUIDELINES_DIR.is_dir():
        return chunks
    for cancer_dir in sorted(_GUIDELINES_DIR.iterdir()):
        if not cancer_dir.is_dir():
            continue
        chunk: dict[str, str] = {}
        for key in ("overview", "workup", "treatment", "questions"):
            for name in (f"{key}.md", f"{key}.txt"):
                fp = cancer_dir / name
                if fp.is_file():
                    chunk[key] = fp.read_text(encoding="utf-8").strip()
                    break
        if chunk:
            chunks[cancer_dir.name] = chunk
    return chunks


GUIDELINES = _load_guidelines()

# Default: lighter model with separate free-tier pool. Override with GEMINI_MODEL in .env.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite").strip()

app = FastAPI(title="Color Project API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    cancerType: str
    stage: str
    age: int | None = None
    sex: str | None = None
    hadPriorTreatment: bool
    metOncologist: bool
    anxiety: str | None = None


def _build_guidelines_context(cancer_type: str) -> str:
    chunk = GUIDELINES.get(cancer_type)
    if chunk is None:
        supported = ", ".join(sorted(GUIDELINES))
        raise HTTPException(
            status_code=400,
            detail=(
                f"No clinical guidelines are available for cancer type '{cancer_type}'. "
                f"Supported types: {supported}."
            ),
        )
    # Only overview + treatment are sent to the model; questions/workup files are not used as RAG context.
    slim = {k: chunk[k] for k in ("overview", "treatment") if k in chunk and chunk[k].strip()}
    if not slim:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Guidelines for '{cancer_type}' are missing overview and treatment text. "
                "Add non-empty overview.md and treatment.md under backend/guidelines/<type>/."
            ),
        )
    return json.dumps(slim, ensure_ascii=False, indent=2)



def _build_prompt(body: AnalyzeRequest, specific_guidelines: str) -> str:
    anxiety_raw = (body.anxiety or "").strip()
    anxiety_line = anxiety_raw if anxiety_raw else "not provided"
    patient_bits = [
        f"Cancer type (for personalization): {body.cancerType}",
        f"Stage: {body.stage}",
        f"Age: {body.age if body.age is not None else 'not provided'}",
        f"Sex assigned at birth: {body.sex if body.sex else 'not provided'}",
        f"Had prior cancer treatment: {body.hadPriorTreatment}",
        f"Has met with oncologist: {body.metOncologist}",
        f"Patient's stated anxiety or concerns: {anxiety_line}",
    ]
    patient_block = "\n".join(patient_bits)

    anxiety_question_rules = ""
    if anxiety_raw:
        anxiety_question_rules = textwrap.dedent(
            """

            QUESTIONS VS ANXIETIES (required when anxieties are provided):
            The patient shared free-text worries above. Infer every distinct anxiety theme (e.g. separate sentences,
            lines, bullets, or comma/semicolon-separated worries each count when they express a different concern).
            For each distinct theme, include at least one object in "questions" whose "question" field clearly and
            directly addresses that theme (so the patient could recognize it as speaking to that worry). A single
            coherent worry still requires at least one matching question. You may return more than five questions if
            needed to cover every distinct theme while keeping other questions useful for their stage and cancer type.
            """
        ).strip()

    return textwrap.dedent(
        f"""
        You are a supportive oncology education assistant. Personalize using the patient context below.
        Always use a warm, friendly, supportive tone: reassuring and human; explain any necessary clinical terms in plain language without being vague or patronizing.

        PATIENT CONTEXT (use to tailor wording; do not invent clinical facts not implied by stage and type):
        {patient_block}

        # GUIDELINES CONTEXT (authoritative reference)
        The following JSON has only two keys from the care-team knowledge base: "overview" (disease overview) and
        "treatment" (typical treatment themes). Ground "diagnosis" and "workup" in this material and the patient
        context; do not contradict it. If something is not covered, say so briefly rather than guessing.

        {specific_guidelines}

        ---

        For the "questions" array, suggest questions the
        patient could ask their oncologist by combining: (1) the overview and treatment reference above,
        (2) the patient context (especially cancer type and stage), and (3) responsible, mainstream oncology knowledge
        where it helps bridge gaps. Questions should be specific and practical, not generic filler.
        {anxiety_question_rules}

        Return ONLY valid JSON with no markdown fences, no preamble, and no trailing text. Do not use first-person pronouns like "I", "we" or "us". The JSON object must have exactly these three keys:

        1. "diagnosis": string — plain-language explanation of the patient's diagnosis (2-3 paragraphs). Avoid jargon unless you briefly define it.

        2. "workup": array of 3-4 objects, each with "title" (string) and "explanation" (string) — likely next clinical steps consistent with the guidelines context and stage.

        3. "questions": array of objects, each with "question" (string), "whyAsk" (string), and "whatItMeans" (string).
        Include at least 4 questions. If anxieties were not provided, about 4-5 questions is appropriate. If anxieties
        were provided, include enough questions to satisfy the anxiety rules above.

        Example shape (replace content; return only the JSON object):
        {{"diagnosis": "...", "workup": [{{"title":"...","explanation":"..."}}], "questions": [{{"question":"...","whyAsk":"...","whatItMeans":"..."}}]}}
        """
    ).strip()


def _parse_json_response(raw: str) -> dict[str, Any]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Model returned invalid JSON: {e}",
        ) from e


def _is_gemini_quota_error(exc: BaseException) -> bool:
    msg = str(exc)
    upper = msg.upper()
    return (
        "429" in msg
        or "RESOURCE_EXHAUSTED" in upper
        or ("QUOTA" in upper and "EXCEED" in upper)
    )


@app.post("/api/analyze")
def analyze(body: AnalyzeRequest) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.strip() == "" or api_key.strip() == "your_key_here":
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set. Copy .env.example to .env and set your key.",
        )

    specific_guidelines = _build_guidelines_context(body.cancerType)
    prompt = _build_prompt(body, specific_guidelines)

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
    except Exception as e:
        if _is_gemini_quota_error(e):
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota or rate limit was exceeded. Wait and retry, try another model "
                    f"via GEMINI_MODEL in backend/.env (current: {GEMINI_MODEL}), or check billing. "
                    "https://ai.google.dev/gemini-api/docs/rate-limits"
                ),
            ) from e
        raise HTTPException(status_code=502, detail=str(e)) from e

    raw = (response.text or "").strip()
    if not raw:
        raise HTTPException(status_code=502, detail="Model returned an empty response.")

    data = _parse_json_response(raw)
    for key in ("diagnosis", "workup", "questions"):
        if key not in data:
            raise HTTPException(
                status_code=502,
                detail=f"Model JSON missing required key: {key}",
            )
    return data
