"""
model.py – ProblemClassifier and DuplicateDetector.

Pre-trained backbone: sentence-transformers/all-MiniLM-L6-v2
  Fine-tuned on the PGPORTAL grievance corpus (when available).
  Category and severity classifiers operate on 384-dim BERT sentence
  embeddings.
"""

import os
import re

import joblib
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)
nltk.download("wordnet", quiet=True)

from nlp_operations import TextPreprocessor, POSTagger, Word2VecModel

# ── Paths ────────────────────────────────────────────────────────────────────
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_FINETUNED_DIR = os.path.join(_THIS_DIR, "models", "finetuned-minilm")

# ── Shared sentence encoder (loaded once, reused everywhere) ─────────────────
_ENCODER = None

def _get_encoder():
    """Load the fine-tuned encoder if available, else fall back to the base model."""
    global _ENCODER
    if _ENCODER is None:
        from sentence_transformers import SentenceTransformer
        if os.path.isdir(_FINETUNED_DIR):
            print(f"[Encoder] Loading FINE-TUNED model from {_FINETUNED_DIR} …")
            _ENCODER = SentenceTransformer(_FINETUNED_DIR)
        else:
            print("[Encoder] Loading base all-MiniLM-L6-v2 (not fine-tuned) …")
            _ENCODER = SentenceTransformer("all-MiniLM-L6-v2")
        print("[Encoder] Ready – dim:", _ENCODER.get_sentence_embedding_dimension())
    return _ENCODER

# ---------------------------------------------------------------------------
# Mappings
# ---------------------------------------------------------------------------
CATEGORY_AGENCY_MAP = {
    "Road Infrastructure": "MCD / PWD",
    "Crime": "Police Department",
    "Railway": "Indian Railways",
    "Transport": "Transport Department",
    "Corruption": "Anti-Corruption Bureau",
    "Education": "Education Department",
    "Health": "Health Department",
    "Environment": "Pollution Control Board",
    "Water Supply": "Water Supply Department",
    "Electricity": "Electricity Department",
    "Other": "General Administration",
}

HIGH_KEYWORDS = {
    "accident", "death", "died", "dead", "emergency", "critical", "dangerous",
    "fire", "flood", "riot", "violence", "urgent", "murder", "rape", "attack",
    "collapse", "derail", "explosion", "poisoning", "casualty", "injured",
    "fatal", "life threatening", "severe", "bleeding", "unconscious", "bomb",
}

MEDIUM_KEYWORDS = {
    "broken", "damaged", "not working", "problem", "issue", "complaint",
    "delayed", "overcharge", "harassment", "theft", "missing", "shortage",
    "corruption", "bribe", "dirty", "contaminated", "stopped", "abuse",
}

# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------
class ProblemClassifier:
    def __init__(self):
        self._preprocessor = TextPreprocessor(pos_filter=False)
        self._pos_tagger   = POSTagger()
        self._encoder      = _get_encoder()
        self.clf           = self._load_or_train()
        self._severity_clf = self._load_severity_model()
        self._label_encoder = self._load_label_encoder()

    def _load_or_train(self):
        path = "models/classifier.joblib"
        if os.path.exists(path):
            print("[Classifier] Loading pre-trained model …")
            return joblib.load(path)
        print("[Classifier] No saved model – training now …")
        from train import train_model
        return train_model()

    def _load_label_encoder(self):
        path = os.path.join(_THIS_DIR, "models", "label_encoder.joblib")
        if os.path.exists(path):
            print("[LabelEncoder] Loaded – maps numeric IDs back to category names.")
            return joblib.load(path)
        return None

    def _load_severity_model(self):
        path = "models/severity_classifier.joblib"
        if os.path.exists(path):
            print("[Severity] Loading pre-trained severity model …")
            return joblib.load(path)
        print("[Severity] No severity model found – will use keyword fallback.")
        return None

    def _embed(self, text: str) -> np.ndarray:
        """Encode a single text into a 384-dim sentence embedding."""
        return self._encoder.encode([text], convert_to_numpy=True)[0]

    def _severity(self, text: str) -> str:
        """Predict severity using the trained ML model; keyword fallback if unavailable."""
        if self._severity_clf is not None:
            try:
                emb = self._embed(text).reshape(1, -1)
                return self._severity_clf.predict(emb)[0]
            except Exception:
                pass
        # ── Keyword fallback ───────────────────────────────────────────────
        tl = text.lower()
        for kw in HIGH_KEYWORDS:
            if kw in tl:
                return "High"
        for kw in MEDIUM_KEYWORDS:
            if kw in tl:
                return "Medium"
        return "Low"

    def _keywords(self, text: str) -> list:
        """
        Extract top keywords using NLTK POS filtering + frequency.
        Returns up to 6 meaningful content words (nouns, verbs, adjectives).
        """
        noise = {
            "road", "broken", "water", "house", "work", "near", "area",
            "people", "issue", "problem", "day", "time", "help", "need",
            "place", "local", "state", "government", "official", "year",
            "month", "coming", "going", "last", "many", "much",
        }
        try:
            processed = self._preprocessor.preprocess(text)
            words = [w for w in processed.split() if len(w) > 3 and w not in noise]
            return list(dict.fromkeys(words))[:6]
        except Exception:
            return []

    def predict(self, text: str) -> dict:
        if not text or len(text.strip()) < 5:
            return {
                "category": "Other",
                "agency": "General Administration",
                "severity": "Low",
                "keywords": [],
                "confidence": 0.0,
            }
        # Encode with pre-trained sentence transformer
        emb = self._embed(text).reshape(1, -1)
        category   = self.clf.predict(emb)[0]
        proba      = self.clf.predict_proba(emb)[0]
        confidence = float(max(proba))
        # Decode numeric label back to category name
        if self._label_encoder is not None:
            category = self._label_encoder.inverse_transform([category])[0]
        else:
            category = str(category)
        agency     = CATEGORY_AGENCY_MAP.get(category, "General Administration")
        return {
            "category":   category,
            "agency":     agency,
            "severity":   self._severity(text),
            "keywords":   self._keywords(text),
            "confidence": round(confidence, 3),
            "pos_tags":   self._pos_tagger.tag_summary(text)["tags"][:8],
        }


# ---------------------------------------------------------------------------
# Duplicate Detector
# ---------------------------------------------------------------------------
class DuplicateDetector:
    def __init__(self):
        # Reuse the shared encoder (already loaded by Classifier)
        self.encoder = _get_encoder()
        self.w2v = Word2VecModel()

    def _load_encoder(self):
        try:
            from sentence_transformers import SentenceTransformer
            print("[DuplicateDetector] Loading sentence-transformers/all-MiniLM-L6-v2 …")
            model = SentenceTransformer("all-MiniLM-L6-v2")
            print("[DuplicateDetector] Ready.")
            return model
        except Exception as exc:
            print(f"[DuplicateDetector] sentence-transformers not available ({exc}). Falling back to Jaccard similarity.")
            return None

    def _jaccard(self, a: str, b: str) -> float:
        wa, wb = set(a.lower().split()), set(b.lower().split())
        union = wa | wb
        return len(wa & wb) / len(union) if union else 0.0

    def find_duplicates(self, new_text: str, existing: list, threshold: float = 0.75) -> dict:
        """
        existing: list of {"id": str, "text": str}
        Returns {"isDuplicate": bool, "similarProblemId": str|None, "similarity": float}
        """
        if not existing:
            return {"isDuplicate": False, "similarProblemId": None, "similarity": 0.0}

        best_sim = 0.0
        best_id = None

        if self.encoder:
            # Sentence-transformers: high-quality cross-lingual BERT embeddings
            texts = [new_text] + [e["text"] for e in existing]
            embeddings = self.encoder.encode(texts, batch_size=64, show_progress_bar=False,
                                             convert_to_numpy=True)
            from scipy.spatial.distance import cosine as cos_dist
            new_emb = embeddings[0]
            for i, item in enumerate(existing):
                st_sim = float(1 - cos_dist(new_emb, embeddings[i + 1]))
                # Blend with Word2Vec similarity (trained on grievance corpus)
                w2v_sim = self.w2v.similarity(new_text, item["text"]) if self.w2v.model else 0.0
                sim = (0.7 * st_sim + 0.3 * w2v_sim) if w2v_sim > 0 else st_sim
                if sim > best_sim:
                    best_sim = sim
                    best_id = item["id"]
        elif self.w2v.model:
            # Word2Vec fallback: corpus-specific semantic similarity
            for item in existing:
                sim = self.w2v.similarity(new_text, item["text"])
                if sim > best_sim:
                    best_sim = sim
                    best_id = item["id"]
        else:
            # Jaccard fallback: simple token overlap
            for item in existing:
                sim = self._jaccard(new_text, item["text"])
                if sim > best_sim:
                    best_sim = sim
                    best_id = item["id"]

        is_dup = best_sim >= threshold
        return {
            "isDuplicate": is_dup,
            "similarProblemId": best_id if is_dup else None,
            "similarity": round(best_sim, 3),
        }
