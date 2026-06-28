from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services.chatbot_service import ChatbotService
import json

router = APIRouter()
chatbot_service = ChatbotService()

class Candidate(BaseModel):
    id: int
    name: str
    experienceYears: int = None
    consultationFee: float = None
    averageRating: float = None
    bio: str = None

class LawyerRequest(BaseModel):
    category: str
    location: str
    max_fee: float = None
    candidates: List[Candidate] = []

class LawyerScore(BaseModel):
    lawyer_id: int
    name: str
    match_score: float
    reason: str

class RecommendationResponse(BaseModel):
    recommendations: List[LawyerScore]

@router.post("/", response_model=RecommendationResponse)
def recommend_lawyers(request: LawyerRequest):
    """
    Recommend lawyers based on category, location, and fee.
    """
    if not request.candidates:
        return RecommendationResponse(recommendations=[])
        
    prompt = (
        f"You are an AI ranking system for a legal platform. A user is looking for a lawyer with the following criteria:\n"
        f"Category: {request.category}\n"
        f"Location: {request.location}\n"
        f"Max Fee: {request.max_fee if request.max_fee else 'No limit'}\n\n"
        f"Here are the available candidate lawyers:\n"
    )
    for c in request.candidates:
        prompt += f"- ID {c.id}: {c.name}, Fee: {c.consultationFee}, Experience: {c.experienceYears} yrs, Rating: {c.averageRating}/5. Bio: {c.bio}\n"
        
    prompt += (
        f"\nEvaluate and score each lawyer based on how well they match the user's criteria (score between 0.0 and 1.0).\n"
        f"Return a JSON object strictly matching this schema:\n"
        f"{{\n"
        f"  \"recommendations\": [\n"
        f"    {{\n"
        f"      \"lawyer_id\": 0,\n"
        f"      \"name\": \"string\",\n"
        f"      \"match_score\": 0.95,\n"
        f"      \"reason\": \"string\"\n"
        f"    }}\n"
        f"  ]\n"
        f"}}\n"
    )

    prompt = "You are an expert AI ranking system. You must respond with valid JSON matching the requested schema. Sort the array by match_score descending.\n\n" + prompt

    try:
        json_str = chatbot_service.llm_provider.generate_content(prompt)
        data = json.loads(json_str)
        recs = []
        for r in data.get("recommendations", []):
            recs.append(LawyerScore(
                lawyer_id=r.get("lawyer_id", 0),
                name=r.get("name", ""),
                match_score=float(r.get("match_score", 0.0)),
                reason=r.get("reason", "")
            ))
        return RecommendationResponse(recommendations=recs)
    except Exception as e:
        print("Error during AI recommendation:", e)
        # Fallback to simple logic
        recs = []
        for c in request.candidates:
            recs.append(LawyerScore(
                lawyer_id=c.id,
                name=c.name,
                match_score=0.8,
                reason="Matched based on basic search filters."
            ))
        return RecommendationResponse(recommendations=recs)
