from fastapi import APIRouter
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

router = APIRouter()

# Load a lightweight model for development (runs fast on CPU)
# Architecture is compatible with scaling up to Legal-BERT in production
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    model = None
    print(f"Warning: Could not load model: {e}")

class QueryRequest(BaseModel):
    query_text: str

class QueryResponse(BaseModel):
    category: str
    confidence_score: float

# Define our canonical legal categories and their anchor sentences
CATEGORIES = {
    "Criminal": "This case involves criminal charges, murder, theft, assault, fraud, or police arrest.",
    "Family": "This is a family law matter concerning divorce, child custody, alimony, or marriage.",
    "Property": "This deals with property disputes, real estate, tenant issues, leases, or land ownership.",
    "Corporate": "This involves corporate law, business incorporation, shares, directors, or mergers.",
    "Cyber Crime": "This is related to cyber crime, hacking, phishing, data breach, or online fraud.",
    "Labour": "This concerns labour laws, employment termination, workplace harassment, or salary disputes.",
    "Tax": "This is a tax matter involving income tax evasion, GST, audits, or financial returns."
}

# Pre-compute embeddings for categories if model is available
category_embeddings = None
category_names = list(CATEGORIES.keys())
if model:
    category_texts = list(CATEGORIES.values())
    category_embeddings = model.encode(category_texts, convert_to_tensor=True)

@router.post("/", response_model=QueryResponse)
def classify_query(request: QueryRequest):
    """
    Classify a legal query into categories using Sentence-BERT embeddings (MiniLM).
    """
    if not model or category_embeddings is None:
        return QueryResponse(category="Civil (Fallback)", confidence_score=0.5)

    # Encode the user's query
    query_embedding = model.encode(request.query_text, convert_to_tensor=True)

    # Compute cosine similarities
    cosine_scores = util.cos_sim(query_embedding, category_embeddings)[0]
    
    # Find the best match
    best_idx = cosine_scores.argmax().item()
    best_category = category_names[best_idx]
    best_score = cosine_scores[best_idx].item()
    
    # Ensure score is somewhat realistic
    confidence = max(min(best_score, 0.99), 0.10)
                
    return QueryResponse(category=best_category, confidence_score=confidence)
