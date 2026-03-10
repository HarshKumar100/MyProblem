"""
app.py – FastAPI NLP microservice.

Endpoints:
  GET  /health
  POST /predict         { text }
  POST /check-duplicate { text, existing: [{id, text}], threshold? }
  POST /analyze         alias for /predict
"""

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="NLP Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-loaded singletons
_classifier = None
_detector = None
_w2v = None


def get_classifier():
    global _classifier
    if _classifier is None:
        from model import ProblemClassifier
        _classifier = ProblemClassifier()
    return _classifier


def get_detector():
    global _detector
    if _detector is None:
        from model import DuplicateDetector
        _detector = DuplicateDetector()
    return _detector


def get_word2vec():
    global _w2v
    if _w2v is None:
        from nlp_operations import Word2VecModel
        _w2v = Word2VecModel()
    return _w2v


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class TextRequest(BaseModel):
    text: str

class ExistingItem(BaseModel):
    id: str
    text: str

class DuplicateRequest(BaseModel):
    text: str
    existing: List[ExistingItem] = []
    threshold: Optional[float] = 0.75


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "OK", "message": "NLP Service is running"}


@app.post("/predict")
@app.post("/analyze")
def predict(body: TextRequest):
    text = body.text.strip()
    if not text:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="text field is required")

    try:
        result = get_classifier().predict(text)
        logger.info("Predicted '%s' for: %s", result.get("category"), text[:60])
        return result
    except Exception as exc:
        logger.error("Predict error: %s", exc)
        return {
            "category": "Other",
            "agency": "General Administration",
            "severity": "Medium",
            "keywords": [],
            "confidence": 0.0,
        }


@app.post("/check-duplicate")
def check_duplicate(body: DuplicateRequest):
    text = body.text.strip()
    if not text:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="text field is required")

    existing = [{"id": item.id, "text": item.text} for item in body.existing]
    try:
        result = get_detector().find_duplicates(text, existing, body.threshold)
        return result
    except Exception as exc:
        logger.error("Duplicate check error: %s", exc)
        return {"isDuplicate": False, "similarProblemId": None, "similarity": 0.0}


@app.post("/nlp-analysis")
def nlp_analysis(body: TextRequest):
    """
    Demonstrates all three NLP operations on the input text:
      1. Text Preprocessing – shows output of every pipeline step
      2. POS Tagging        – labels each token with its part-of-speech
      3. Word2Vec           – finds semantically similar words for key terms
    """
    from fastapi import HTTPException
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text field is required")

    from nlp_operations import TextPreprocessor, POSTagger

    # ─── 1. Text Preprocessing ──────────────────────────────────────────
    preprocessor  = TextPreprocessor(pos_filter=False)
    preprocessing = preprocessor.preprocess_steps(text)

    # ─── 2. POS Tagging ─────────────────────────────────────────────────
    pos_tagger = POSTagger()
    pos_tagging = pos_tagger.tag_summary(text)

    # ─── 3. Word2Vec – similar words for each extracted keyword ─────────
    keywords = get_classifier().predict(text)["keywords"]
    w2v = get_word2vec()
    similar_words = {}
    for kw in keywords[:4]:
        results = w2v.similar_words(kw, n=5)
        if results:
            similar_words[kw] = results

    return {
        "text": text,
        "preprocessing": preprocessing,
        "pos_tagging":   pos_tagging,
        "word2vec":      {"similar_words": similar_words, "model_ready": w2v.model is not None},
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logger.info("Pre-loading models …")
    get_classifier()
    get_detector()
    logger.info("NLP Service ready on http://0.0.0.0:5001")
    uvicorn.run(app, host="0.0.0.0", port=5001)
