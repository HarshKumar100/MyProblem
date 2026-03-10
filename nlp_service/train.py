"""
train.py – Build and persist the TF-IDF + Logistic-Regression classifier.

Run once:  python train.py

Data sources (in priority order):
  1. Mydata/no_pii_grievance.json  – PGPORTAL grievance dataset (175k records)
  2. Hand-crafted seed examples below (always included for balance)
"""

import json
import os
import random
import re
from collections import defaultdict

import joblib
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)
nltk.download("wordnet", quiet=True)

# ---------------------------------------------------------------------------
# Dataset paths
# ---------------------------------------------------------------------------
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
GRIEVANCE_JSON   = os.path.join(_THIS_DIR, "..", "Mydata", "no_pii_grievance.json")
PROCESSED_CSV    = os.path.join(_THIS_DIR, "..", "Mydata", "processed_dataset.csv")

# ---------------------------------------------------------------------------
# Keyword rules: map free text → one of the 10 app categories
# ---------------------------------------------------------------------------
_CATEGORY_KEYWORDS = {
    "Road Infrastructure": [
        "pothole", "road damage", "road repair", "broken road", "road condition",
        "road crater", "road surface", "road blocked", "road construction",
        "bridge broken", "bridge collapsed", "bridge unsafe",
        "footpath broken", "manhole", "speed breaker", "road sign",
        "highway divider", "road needs repair", "no road in",
    ],
    "Railway": [
        "railway", "train delay", "train cancel", "irctc", "railway station",
        "station platform", "railway track", "railway crossing", "train derail",
        "railway staff", "railway canteen", "platform lighting",
        "luggage theft train", "train coach", "local train",
    ],
    "Transport": [
        "auto rickshaw", "overcharging passenger", "bus service", "bus route",
        "bus driver", "bus shelter", "rto office", "rto bribe",
        "driving licence", "vehicle registration", "traffic jam",
        "traffic police", "public transport", "cab driver", "taxi driver",
        "school bus driver", "road transport",
    ],
    "Crime": [
        "theft", "stolen", "robbery", "robbed", "murder", "assault",
        "molestation", "drug trafficking", "kidnap", "cybercrime",
        "domestic violence", "burgl", "gambling den", "pickpocket",
        "chain snatch", "extortion goon", "illegal weapon",
        "stalking", "sexual harassment", "police complaint", "atm robbery",
        "online fraud cheated",
    ],
    "Corruption": [
        "bribe", "bribery", "hafta", "demand money certificate",
        "black market ration", "misappropriat", "government scheme misuse",
        "tender rigged", "illegal permit", "electoral fraud",
        "embezzl", "misuse of fund", "corruption officer",
        "illegal land grab", "official extort",
    ],
    "Education": [
        "school teacher", "no teacher", "mid-day meal", "midday meal",
        "school building", "college admission", "scholarship",
        "capitation fee", "child labour school", "school toilet",
        "private coaching compulsory", "examination result tampered",
        "textbook not distributed", "discrimination student",
        "education quality poor",
    ],
    "Health": [
        "hospital", "doctor not available", "medicine not available",
        "ambulance", "health centre", "government dispensary",
        "dengue", "malaria", "vaccination", "icu", "blood bank",
        "malnutrition children", "contaminated water supply disease",
        "fake medicine", "mental health",
    ],
    "Environment": [
        "toxic waste", "chemical waste", "air pollution", "garbage not collected",
        "illegal dump", "noise pollution", "tree cutting illegal",
        "plastic burning", "sewage flowing", "illegal mining",
        "groundwater contaminated", "firecrackers pollution",
        "pond garbage", "industrial waste", "pollution control",
        "sewage", "effluent", "waste water", "open burning",
        "encroachment forest", "deforestation", "smoke pollution",
        "garbage disposal", "solid waste", "landfill",
        "pollution board", "odor pollution", "contamination",
        "untreated sewage", "industrial effluent", "noxious smell",
        "open defecation", "stench", "foul smell", "mine blasting",
    ],
    "Water Supply": [
        "water supply", "no water supply", "water pipeline", "water pipe broken",
        "contaminated water tap", "water available one hour",
        "water storage tank", "water connection", "water meter",
        "water tanker", "drinking water problem", "water-borne disease",
        "water shortage", "tap water dirty",
    ],
    "Electricity": [
        "power cut", "electricity cut", "electricity transformer",
        "electric wire", "live wire", "electricity bill wrong",
        "no electricity connection", "power outage", "electric meter",
        "electricity supply", "high-tension wire", "voltage fluctuation",
        "street light not working", "load shedding", "power failure",
        "tripping of electricity", "faulty meter", "electric shock",
        "substation", "transformer failure", "power restoration",
        "erratic power", "unscheduled power cut",
    ],
}


def _assign_category(text: str):
    """Return the best-matching app category for a text, or None."""
    text_lower = text.lower()
    scores: dict[str, int] = defaultdict(int)
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                scores[cat] += 1
    if not scores:
        return None
    return max(scores, key=scores.get)


# Template / boilerplate patterns to strip from grievance text
_BOILERPLATE = re.compile(
    r"^(.*?>>.*?$"                    # category header line
    r"|[-]{3,}"                        # separator lines
    r"|to\s*$"
    r"|dear\s"
    r"|respected\s"
    r"|thanking you"
    r"|yours truly"
    r"|yours faithfully"
    r"|yours sincerely"
    r"|\d{1,2}[./]\d{1,2}[./]\d{4}"  # dates like 1.1.2023
    r"|registration no"
    r"|location\s*:"
    r"|sub\s*:"
    r"|subject\s*:"
    r"|sir,$"
    r"|madam,$"
    r"|sir/madam"
    r"|to the"
    r")",
    re.IGNORECASE | re.MULTILINE,
)


def _clean_grievance_text(raw: str) -> str:
    """Strip boilerplate headers/footers, return cleaned body text."""
    if not raw:
        return ""
    lines = raw.split("\n")
    kept = []
    for line in lines:
        line = line.strip()
        if len(line) < 5:
            continue
        if _BOILERPLATE.match(line):
            continue
        kept.append(line)
    text = " ".join(kept)
    # collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text[:600]  # cap length


# ---------------------------------------------------------------------------
# Load from PGPORTAL dataset
# ---------------------------------------------------------------------------
MAX_PER_CATEGORY = 600   # cap per category to keep training fast
MIN_TEXT_LEN     = 40    # skip very short texts


def load_dataset_examples() -> list[tuple[str, str]]:
    """
    Load (text, category) pairs.
    Prefers Mydata/processed_dataset.csv (sentence-formatted, clean).
    Falls back to raw no_pii_grievance.json if CSV not found.
    Run nlp_service/preprocess_data.py once to generate the CSV.
    """
    # ── Priority 1: preprocessed CSV (sentence format) ──────────────────
    if os.path.exists(PROCESSED_CSV):
        print(f"  Loading preprocessed CSV: {PROCESSED_CSV} …")
        import csv as _csv

        # App-category keyword rules still needed to map top_category → app label
        buckets: dict[str, list[str]] = defaultdict(list)
        with open(PROCESSED_CSV, "r", encoding="utf-8") as f:
            reader = _csv.DictReader(f)
            import random as _random
            rows = list(reader)
            _random.seed(42)
            _random.shuffle(rows)
            for row in rows:
                # Use the clean_text column (full cleaned paragraph)
                text = (row.get("clean_text") or "").strip()
                if len(text) < MIN_TEXT_LEN:
                    continue
                cat = _assign_category(text)
                if cat and len(buckets[cat]) < MAX_PER_CATEGORY:
                    buckets[cat].append(text)

        examples = [(t, c) for c, texts in buckets.items() for t in texts]
        print(f"  Extracted {len(examples)} examples from CSV:")
        for cat in sorted(buckets):
            print(f"    {len(buckets[cat]):>4}  {cat}")
        return examples

    # ── Fallback: raw JSON ───────────────────────────────────────────────
    if not os.path.exists(GRIEVANCE_JSON):
        print(f"  No data found. Run preprocess_data.py first.")
        return []

    print(f"  Loading raw JSON: {GRIEVANCE_JSON} …")
    with open(GRIEVANCE_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"  Loaded {len(data):,} records. Extracting examples …")

    buckets: dict[str, list[str]] = defaultdict(list)
    random.seed(42)
    random.shuffle(data)

    for rec in data:
        raw = rec.get("subject_content_text") or ""
        text = _clean_grievance_text(raw)
        if len(text) < MIN_TEXT_LEN:
            continue
        cat = _assign_category(text)
        if cat and len(buckets[cat]) < MAX_PER_CATEGORY:
            buckets[cat].append(text)

    examples = [(t, c) for c, texts in buckets.items() for t in texts]
    print(f"  Extracted {len(examples)} examples from raw JSON:")
    for cat in sorted(buckets):
        print(f"    {len(buckets[cat]):>4}  {cat}")
    return examples


# ---------------------------------------------------------------------------
# Hand-crafted seed corpus
# All categories are now sufficiently covered by Mydata/no_pii_grievance.json.
# Seeds are kept empty — remove this list if Mydata extraction proves sufficient.
# ---------------------------------------------------------------------------
TRAINING_DATA = []


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
_lemmatizer = WordNetLemmatizer()
_stop_words = set(stopwords.words("english"))


def preprocess(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z\s]", "", text)
    tokens = word_tokenize(text)
    tokens = [
        _lemmatizer.lemmatize(t)
        for t in tokens
        if t not in _stop_words and len(t) > 2
    ]
    return " ".join(tokens)


# ---------------------------------------------------------------------------
# Train
# ---------------------------------------------------------------------------
def train_model():
    print("=" * 60)
    print("Step 1 – Loading dataset examples …")
    dataset_examples = load_dataset_examples()

    print(f"\nStep 2 – Combining with {len(TRAINING_DATA)} seed examples …")
    all_data = list(TRAINING_DATA) + dataset_examples
    random.seed(42)
    random.shuffle(all_data)
    print(f"  Total training pairs: {len(all_data)}")

    texts  = [item[0] for item in all_data]
    labels = [item[1] for item in all_data]

    print("\nStep 3 – Preprocessing text …")
    processed = [preprocess(t) for t in texts]

    # Use stratify only when every class has ≥2 samples
    from collections import Counter
    label_counts = Counter(labels)
    min_count = min(label_counts.values())
    stratify = labels if min_count >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        processed, labels, test_size=0.15, random_state=42, stratify=stratify
    )
    print(f"  Train: {len(X_train)}  |  Test: {len(X_test)}")

    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 3),
                    max_features=15000,
                    min_df=1,
                    sublinear_tf=True,
                    analyzer="word",
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000,
                    C=5.0,
                    solver="lbfgs",
                    multi_class="multinomial",
                    class_weight="balanced",
                ),
            ),
        ]
    )

    print("\nStep 4 – Training classifier …")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    os.makedirs("models", exist_ok=True)
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "classifier.joblib")
    joblib.dump(pipeline, model_path)
    print(f"\nModel saved → {model_path}")

    # ── Step 5 – Train Word2Vec embeddings on the same corpus ────────────
    try:
        from nlp_operations import Word2VecModel
        print("\nStep 5 – Training Word2Vec embeddings …")
        Word2VecModel.train(texts)   # `texts` = raw (unprocessed) text list from Step 2
    except ImportError:
        print("\nStep 5 – Skipped (gensim not installed). Run: pip install gensim")

    return pipeline


if __name__ == "__main__":
    train_model()
