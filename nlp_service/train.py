"""
train.py – Build and persist the Sentence-Transformer + Logistic-Regression
           category classifier AND a matching severity classifier.

Pre-trained backbone: sentence-transformers/all-MiniLM-L6-v2
  - Distilled BERT model pre-trained on 1B+ sentence pairs
  - Produces 384-dimensional semantic embeddings that capture MEANING,
    not just keyword overlap – a genuine NLP approach vs plain TF-IDF.

Run once:  python train.py

Data sources (in priority order):
  1. Mydata/processed_dataset.csv  – clean PGPORTAL grievances (175k records)
  2. Mydata/no_pii_grievance.json  – fallback raw JSON
"""

import json
import os
import random
import re
from collections import defaultdict, Counter

import joblib
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)
nltk.download("wordnet", quiet=True)

# ── Pre-trained sentence encoder (all-MiniLM-L6-v2) ──────────────────────────
# Loaded once here so both category and severity training share the same encoder.
print("Loading pre-trained sentence encoder: all-MiniLM-L6-v2 …")
from sentence_transformers import SentenceTransformer
_ENCODER = SentenceTransformer("all-MiniLM-L6-v2")
print("Encoder ready – embedding dimension:", _ENCODER.get_sentence_embedding_dimension())

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
# ---------------------------------------------------------------------------
TRAINING_DATA = []

# ---------------------------------------------------------------------------
# Severity labeling – silver labels used to train the severity classifier
# These keyword sets are deliberately comprehensive so the ML model can learn
# broader patterns and generalise far beyond simple keyword lookup.
# ---------------------------------------------------------------------------
_HIGH_SEVERITY_KW = {
    "accident", "death", "died", "dead", "emergency", "critical", "dangerous",
    "fire", "flood", "riot", "violence", "urgent", "murder", "rape", "attack",
    "collapse", "derail", "explosion", "poisoning", "casualty", "injured",
    "fatal", "severe", "bleeding", "unconscious", "bomb", "life threatening",
    "electrocuted", "electric shock", "gas leak", "toxic", "blast", "stampede",
    "tornado", "cyclone", "earthquake", "tsunami", "kidnap", "abduct",
    "missing child", "dead body", "suicide", "attempted suicide",
    "epidemic", "outbreak", "hospital fire", "bridge collapse", "road collapse",
    "drowning", "drown", "hit and run", "mob attack", "lynching", "arson",
    "building collapse", "structural failure", "chemical spill", "snakebite",
    "mass casualty", "rabies", "human trafficking", "acid attack", "gang rape",
    "threatening", "threat to life", "gun", "gunshot", "stab", "knife attack",
    "terror", "bomb threat", "hostage", "live wire down", "high tension wire",
    "harmful gas", "radiation leak", "contaminated drinking water",
}

_MEDIUM_SEVERITY_KW = {
    "broken", "damaged", "not working", "problem", "issue", "complaint",
    "delayed", "overcharge", "harassment", "theft", "missing", "shortage",
    "corruption", "bribe", "dirty", "contaminated", "stopped", "abuse",
    "pothole", "no electricity", "power cut", "water shortage", "no water",
    "garbage", "stench", "foul smell", "open drain", "sewage", "leakage",
    "crack", "encroachment", "unauthorized", "street light not working",
    "dark road", "illegal construction", "noise pollution", "delayed response",
    "no action taken", "bribe demand", "pending work", "overflowing", "clog",
    "dilapidated", "drunk driver", "rash driving", "salary not paid",
    "teacher absent", "doctor absent", "medicine shortage", "fake medicine",
    "road blocked", "road damage", "road repair needed", "signal not working",
    "water pipeline broken", "electric wire hanging", "transformer fault",
    "mid-day meal", "school toilet", "dustbin overflow", "drain blocked",
    "manhole open", "dead animal", "mosquito breeding", "waterlogging",
    "smoke pollution", "dust pollution", "misappropriation", "embezzlement",
    "irregular supply", "no action", "bribe demanded", "school building",
    "hospital negligence", "wrong billing", "fake certificate", "pending repair",
    "auto rickshaw overcharge", "unlicensed vehicle", "no bus", "no train",
    "delayed salary", "cheated", "fraud", "forged document", "illegal mining",
    "deforestation", "illegal dumping", "untreated sewage", "toxic waste",
}


def _severity_label(text: str) -> str:
    """Assign a silver severity label to a training text using domain keywords."""
    tl = text.lower()
    for kw in _HIGH_SEVERITY_KW:
        if kw in tl:
            return "High"
    for kw in _MEDIUM_SEVERITY_KW:
        if kw in tl:
            return "Medium"
    return "Low"


def train_severity_model(texts: list):
    """
    Train a dedicated sentence-embedding + Logistic-Regression severity
    classifier using silver labels derived from domain keyword rules.
    The model learns semantic patterns far beyond simple keyword lookup.
    Saved to models/severity_classifier.joblib.
    """
    print("\n" + "=" * 60)
    print("Step 6 – Training severity classifier (embedding-based) …")

    labels = [_severity_label(t) for t in texts]
    counts = Counter(labels)
    print(f"  Label distribution → {dict(counts)}")

    print(f"  Encoding {len(texts):,} texts with all-MiniLM-L6-v2 …")
    embeddings = _ENCODER.encode(texts, batch_size=64, show_progress_bar=True,
                                  convert_to_numpy=True)

    use_stratify = all(v >= 2 for v in counts.values()) and len(counts) >= 2
    sX_train, sX_test, sy_train, sy_test = train_test_split(
        embeddings, labels, test_size=0.15, random_state=42,
        stratify=labels if use_stratify else None,
    )
    print(f"  Train: {len(sX_train)}  |  Test: {len(sX_test)}")

    clf = LogisticRegression(
        max_iter=1000, C=2.0, solver="lbfgs",
        multi_class="multinomial", class_weight="balanced",
    )
    clf.fit(sX_train, sy_train)
    sy_pred = clf.predict(sX_test)
    print("\n  Severity Classification Report:")
    print(classification_report(sy_test, sy_pred))

    sev_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "models", "severity_classifier.joblib"
    )
    joblib.dump(clf, sev_path)
    print(f"  Severity model saved → {sev_path}")
    return clf


# ---------------------------------------------------------------------------
# Helper (kept for any legacy callers; not used by train_model any more)
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
# Train – Sentence-Transformer embedding + Logistic Regression
# ---------------------------------------------------------------------------
def train_model():
    """
    Full training pipeline using pre-trained all-MiniLM-L6-v2 embeddings.

    Architecture:
        Input text
          → all-MiniLM-L6-v2 (pre-trained sentence encoder, frozen)
          → 384-dim semantic embedding vector
          → LogisticRegression classifier (multinomial, class_weight=balanced)
          → predicted category label

    Why this is better than TF-IDF:
      - Understands MEANING: 'pothole' ≈ 'road damage' ≈ 'broken road' in
        embedding space, even without exact keyword overlap.
      - Handles paraphrasing, partial text, and informal Indian-English.
      - Pre-trained on 1B+ sentence pairs so zero-shot quality is high
        even with a small training set.
    """
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

    # ── Step 3 – Encode texts with pre-trained sentence transformer ──────
    print(f"\nStep 3 – Encoding {len(texts):,} texts with all-MiniLM-L6-v2 …")
    print("  (This uses a BERT-based model pre-trained on 1B+ sentence pairs)")
    embeddings = _ENCODER.encode(
        texts, batch_size=64, show_progress_bar=True, convert_to_numpy=True
    )
    print(f"  Embedding matrix shape: {embeddings.shape}")   # (N, 384)

    label_counts = Counter(labels)
    min_count = min(label_counts.values())
    stratify = labels if min_count >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        embeddings, labels, test_size=0.15, random_state=42, stratify=stratify
    )
    print(f"  Train: {len(X_train)}  |  Test: {len(X_test)}")

    # ── Step 4 – Train classifier on top of embeddings ───────────────────
    print("\nStep 4 – Training LogisticRegression on sentence embeddings …")
    clf = LogisticRegression(
        max_iter=2000,
        C=5.0,
        solver="lbfgs",
        multi_class="multinomial",
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    print("\nCategory Classification Report:")
    print(classification_report(y_test, y_pred))

    os.makedirs("models", exist_ok=True)
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "classifier.joblib")
    joblib.dump(clf, model_path)
    print(f"\nCategory model saved → {model_path}")

    # ── Step 5 – Train Word2Vec embeddings on the same corpus ────────────
    try:
        from nlp_operations import Word2VecModel
        print("\nStep 5 – Training Word2Vec embeddings …")
        Word2VecModel.train(texts)
    except ImportError:
        print("\nStep 5 – Skipped (gensim not installed). Run: pip install gensim")

    # ── Step 6 – Train dedicated severity classifier ──────────────────────
    train_severity_model(texts)

    return clf


if __name__ == "__main__":
    train_model()
