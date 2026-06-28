from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import classify, analyze, recommend, chatbot
import uvicorn

app = FastAPI(
    title="Smart Legal Assistance AI Microservice",
    description="AI-powered legal analysis, clause detection, and lawyer recommendation.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classify.router, prefix="/api/v1/classify", tags=["Classification"])
app.include_router(analyze.router, prefix="/api/v1/analyze", tags=["Document Analysis"])
app.include_router(recommend.router, prefix="/api/v1/recommend", tags=["Lawyer Recommendation"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["AI Chatbot"])

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "Smart Legal AI Microservice"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)