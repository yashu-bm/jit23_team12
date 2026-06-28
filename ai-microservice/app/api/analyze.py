from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List
import json

from app.services.ocr_service import OCRService
from app.services.chatbot_service import ChatbotService

router = APIRouter()

ocr_service = OCRService()
chatbot_service = ChatbotService()


class ClauseAnalysis(BaseModel):
    clause_type: str
    clause_text: str
    risk_level: str
    reason: str


class DocumentResponse(BaseModel):
    filename: str
    extracted_text: str
    summary: str
    overall_risk: str
    clauses: List[ClauseAnalysis]


@router.post("/upload", response_model=DocumentResponse)
async def analyze_document(file: UploadFile = File(...)):

    try:

        contents = await file.read()

        # Extract Text
        if file.filename.lower().endswith(".pdf"):
            extracted_text = ocr_service.extract_text_from_pdf(contents)

        elif file.filename.lower().endswith((".png", ".jpg", ".jpeg")):
            extracted_text = ocr_service.extract_text_from_image(contents)

        else:
            extracted_text = contents.decode("utf-8", errors="ignore")

        if extracted_text.strip() == "":
            raise HTTPException(status_code=400, detail="No text extracted.")

        # Summary
        summary = chatbot_service.summarize_document(extracted_text)

        # Clause Analysis
        response = chatbot_service.extract_risky_clauses(extracted_text)

        print("\n========== CLAUSE RESPONSE ==========")
        print(response)
        print("=====================================\n")

        # Remove markdown if present
        response = response.replace("```json", "")
        response = response.replace("```", "")
        response = response.strip()

        try:
            clauses_data = json.loads(response)

        except Exception:

            print("Invalid JSON returned.")

            clauses_data = {
                "overall_risk": "Medium",
                "clauses": []
            }

        clauses = []

        for item in clauses_data.get("clauses", []):

            clauses.append(
                ClauseAnalysis(
                    clause_type=item.get("clause_type", "Unknown"),
                    clause_text=item.get("clause_text", "See reason for details."),
                    risk_level=item.get("risk_level", "Medium"),
                    reason=item.get("reason", "")
                )
            )

        return DocumentResponse(
            filename=file.filename,
            extracted_text=extracted_text,
            summary=summary,
            overall_risk=clauses_data.get("overall_risk", "Medium"),
            clauses=clauses
        )

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))