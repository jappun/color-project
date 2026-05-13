# Run: uvicorn main:app --reload
from __future__ import annotations

import json
import os
import re
import textwrap
from pathlib import Path
from typing import Any, Literal

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parent / ".env")

GUIDELINES_PATH = Path(__file__).resolve().parent / "guidelines.json"
with GUIDELINES_PATH.open(encoding="utf-8") as _gf:
    GUIDELINES: dict[str, dict[str, str]] = json.load(_gf)

GEMINI_MODEL = "gemini-2.0-flash"

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
    return json.dumps(chunk, ensure_ascii=False, indent=2)


def _build_prompt(body: AnalyzeRequest, guidelines_json: str) -> str:
    patient_bits = [
        f"Cancer type (for personalization): {body.cancerType}",
        f"Stage: {body.stage}",
        f"Age: {body.age if body.age is not None else 'not provided'}",
        f"Sex assigned at birth: {body.sex if body.sex else 'not provided'}",
        f"Had prior cancer treatment: {body.hadPriorTreatment}",
        f"Has met with oncologist: {body.metOncologist}",
        f"Patient's stated anxiety or concerns: {body.anxiety if body.anxiety else 'not provided'}",
        f"Tone preference: {body.tonePreference} — {_tone_instructions(body.tonePreference)}",
    ]
    patient_block = "\n".join(patient_bits)

    return textwrap.dedent(
        f"""
        You are a supportive oncology education assistant. Personalize using the patient context below.
        Use a warm, supportive tone: reassuring and human; explain any necessary clinical terms in plain language without being vague.

        PATIENT CONTEXT (use to tailor wording; do not invent clinical facts not implied by stage and type):
        {patient_block}

        # GUIDELINES CONTEXT (RAG)
        The following JSON is authoritative reference material from the care team knowledge base.
        Ground your answer in it; do not contradict it. If something is not covered, say so briefly rather than guessing.

        {guidelines_json}

        ---

        Return ONLY valid JSON with no markdown fences, no preamble, and no trailing text. The JSON object must have exactly these three keys:

        1. "diagnosis": string — plain-language explanation of the patient's diagnosis (2-3 paragraphs). Avoid jargon unless you briefly define it.

        2. "workup": array of 3-4 objects, each with "title" (string) and "explanation" (string) — likely next clinical steps consistent with the guidelines context.

        3. "questions": array of 4-5 objects, each with "question" (string), "whyAsk" (string), and "whatItMeans" (string) — questions the patient might ask their oncologist.

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


@app.post("/api/analyze")
def analyze(body: AnalyzeRequest) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.strip() == "" or api_key.strip() == "your_key_here":
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set. Copy .env.example to .env and set your key.",
        )

    guidelines_json = _build_guidelines_context(body.cancerType)
    prompt = _build_prompt(body, guidelines_json)

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(GEMINI_MODEL)

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            ),
        )
    except Exception as e:
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
