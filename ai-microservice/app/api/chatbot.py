from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.services.chatbot_service import ChatbotService

router = APIRouter()
chatbot_service = ChatbotService()

class Message(BaseModel):
    role: str # 'user' or 'model'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []
    language: Optional[str] = "en"

class ChatResponse(BaseModel):
    response: str
    
class DocumentQARequest(BaseModel):
    document_text: str
    question: str

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Convert Pydantic models to dicts for the service
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
        reply = chatbot_service.get_response(request.message, history_dicts, request.language)
        return ChatResponse(response=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/document/ask", response_model=ChatResponse)
async def ask_document(request: DocumentQARequest):
    try:
        reply = chatbot_service.answer_document_question(request.document_text, request.question)
        return ChatResponse(response=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
