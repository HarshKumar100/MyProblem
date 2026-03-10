# MyProblem — AI-Powered Citizen Grievance Portal

---

## Problem Statement

Every day, millions of Indian citizens face problems — a pothole that causes accidents, water supply that stops for days, a corrupt official demanding a bribe, or garbage that goes uncollected for weeks. Yet despite having government agencies responsible for each of these issues, most citizens have no clear, accessible way to report them.

The existing grievance mechanisms are:
- **Fragmented** — each department has its own portal, and citizens don't know which one applies to their issue.
- **Slow and manual** — complaints are categorized and routed by hand, causing delays of weeks or months.
- **Untracked** — once a complaint is filed, citizens have no visibility into its status or response.
- **Duplicate-heavy** — the same problem (e.g., a broken road) is reported hundreds of times by different citizens, wasting agency bandwidth without any consolidation.

The result: genuine problems go unaddressed, citizens lose trust in government systems, and agencies are overwhelmed with redundant, misrouted complaints.

---

## Our Solution

**MyProblem** is a full-stack, AI-powered citizen grievance portal that allows any Indian citizen to report a civic or government problem in plain language — and automatically routes it to the correct agency using Natural Language Processing.

Key capabilities:
- A citizen describes their problem in plain English (e.g., *"Garbage not collected from our colony for weeks"*).
- The NLP engine **classifies the complaint** into one of 10 categories (Road Infrastructure, Crime, Railway, Transport, Corruption, Education, Health, Environment, Water Supply, Electricity) with ~88% accuracy.
- The system **auto-assigns the responsible agency** (e.g., Pollution Control Board for environment issues).
- Before submission, **AI duplicate detection** checks whether the same problem has already been reported nearby, preventing redundant complaints.
- Citizens can **track the status** of their complaint (Pending → In Progress → Resolved/Rejected) in real time.
- Agency officials get a **dedicated dashboard** to review, respond to, and update complaints assigned to their department.
- An **admin panel** provides oversight across all complaints and all agencies.

---

## Purpose & Goals

This project was built as part of an NLP-focused academic initiative, but designed with real-world utility in mind. The goals are:

1. **Democratize access to grievance redressal** — make it as simple as typing a sentence.
2. **Eliminate manual triage** — use machine learning to route complaints instantly and accurately.
3. **Reduce duplicate complaint noise** — use semantic similarity (Word2Vec) to detect and surface duplicates before they are submitted.
4. **Increase accountability** — every complaint is tracked, timestamped, and assigned. Agencies can be measured on response times.
5. **Build civic trust** — when citizens see their complaints acknowledged and resolved, they engage more with public systems.

---

## Features

| Feature | Description |
|---|---|
| Citizen Registration & Login | Secure JWT-based auth with role separation (citizen / agency / admin) |
| Report a Problem | Plain-language form with live AI category prediction as you type |
| AI Auto-Categorization | TF-IDF + Logistic Regression classifier, ~88% accuracy, 10 categories |
| Severity Detection | Keyword-based high / medium / low severity tagging |
| AI Duplicate Detection | Cosine similarity over Word2Vec embeddings to surface similar existing complaints |
| Agency Auto-Assignment | Each category maps to a responsible government agency |
| Status Tracking | Citizens track complaint lifecycle: Pending → In Progress → Resolved / Rejected |
| Agency Dashboard | Filter, search, respond to, and update complaints — with modal reply system |
| Admin Panel | Full oversight: view all complaints, filter by status/category, manage users |
| Offline / localStorage Mode | Works without a live backend for demos — data persists in browser storage |

---

## Tech Stack

### Frontend — `client/`

| Technology | Role |
|---|---|
| **React 18** | UI component framework |
| **Vite 5** | Fast dev server and bundler |
| **Tailwind CSS** | Utility-first styling |
| **React Router v6** | Client-side routing with protected routes |
| **Axios** | HTTP client for API calls |
| **React Hot Toast** | User notification toasts |
| **Context API** | Global auth state (`AuthContext`) |

Design system: beige palette (`#ede8df` page background, `#ddd8cf` cards), dark `#1a1a1a` CTAs, `rounded-full` pill buttons.

### Backend — `server/`

| Technology | Role |
|---|---|
| **Node.js** | Runtime |
| **Express.js** | REST API framework |
| **MongoDB** | Primary database (complaints, users) |
| **Mongoose** | ODM for schema modelling |
| **JSON Web Tokens (JWT)** | Stateless authentication |
| **bcryptjs** | Password hashing |
| **Multer** | File/image upload handling |
| **dotenv** | Environment variable management |

Key API routes:
- `POST /api/auth/register` — citizen / agency registration
- `POST /api/auth/login` — returns JWT
- `GET/POST /api/problems` — complaint CRUD
- `PATCH /api/problems/:id/status` — agency status update

### NLP Microservice — `nlp_service/`

| Technology | Role |
|---|---|
| **Python 3.10+** | Runtime |
| **FastAPI** | Async REST microservice framework |
| **Uvicorn** | ASGI server |
| **scikit-learn** | TF-IDF vectorizer + Logistic Regression pipeline |
| **NLTK** | Tokenization, stopword removal, lemmatization, POS tagging |
| **Gensim (Word2Vec)** | Sentence embeddings for duplicate detection |
| **joblib** | Model serialization / loading |
| **NumPy** | Cosine similarity computation |

NLP service endpoints:
- `POST /predict` — returns predicted category, confidence score, severity, assigned agency
- `POST /check-duplicate` — compares new complaint against existing ones using Word2Vec cosine similarity, returns top matches above a configurable threshold
- `GET /health` — liveness check

NLP service endpoints:
- `POST /predict` — returns predicted category, confidence score, severity, assigned agency
- `POST /check-duplicate` — compares new complaint against existing ones using Word2Vec cosine similarity, returns top matches above a configurable threshold
- `GET /health` — liveness check

---

## Dataset

### Source
The classifier was trained on **175,000+ real Indian government grievance records** sourced from **PGPORTAL** (the Government of India's centralized public grievance portal). All personally identifiable information (PII) has been stripped from the dataset before training.

In addition to the PGPORTAL data, hand-crafted seed examples were added for each of the 10 categories to ensure class balance and coverage of edge cases not well-represented in the real-world data.

### Train / Test Split
| Split | Size |
|---|---|
| Training set | 85% of total data |
| Test set | 15% of total data |

Splitting was done using **stratified sampling** (`stratify=labels`) with `random_state=42` to ensure every category was proportionally represented in both splits.

### Dataset Files

| File | Description |
|---|---|
| `Mydata/no_pii_grievance.json` | PGPORTAL dataset — 175,000+ real Indian grievance records, PII-stripped |
| `nlp_service/models/classifier.joblib` | Serialized trained pipeline (TF-IDF + Logistic Regression) |

---

## Model Details

### Classification Pipeline

The complaint classifier is a **scikit-learn Pipeline** with two stages:

**Stage 1 — TF-IDF Vectorizer**
| Parameter | Value |
|---|---|
| `ngram_range` | (1, 3) — unigrams, bigrams, trigrams |
| `max_features` | 15,000 |
| `min_df` | 1 |
| `sublinear_tf` | True (logarithmic TF scaling) |
| `analyzer` | word |

**Stage 2 — Logistic Regression**
| Parameter | Value |
|---|---|
| `solver` | lbfgs |
| `multi_class` | multinomial |
| `C` (regularization) | 5.0 |
| `class_weight` | balanced |
| `max_iter` | 2000 |

**Result: ~88% accuracy on the held-out test set across all 10 categories.**

### Text Preprocessing Pipeline
Before vectorization, every complaint goes through:
1. Lowercasing
2. Removal of boilerplate / template phrases (salutations, dates, headers)
3. Tokenization (NLTK `word_tokenize`)
4. Stopword removal (NLTK English stopwords)
5. Lemmatization (NLTK `WordNetLemmatizer`)
6. Optional POS tagging for feature enrichment

### Duplicate Detection
Word2Vec embeddings (trained on the same corpus via Gensim) are used to generate sentence-level vectors for each complaint. When a new complaint is submitted, **cosine similarity** is computed against all existing complaints. Any complaint exceeding a configurable threshold is surfaced as a potential duplicate — before the citizen submits, reducing redundant reports.

---

## Project Structure

```
NLLP/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/           # Home, Dashboard, ReportProblem, Login, Register,
│   │   │                    # ProblemDetail, AdminPanel, AgencyDashboard
│   │   ├── components/      # Navbar, Footer, ProblemCard, StatusBadge,
│   │   │                    # PrivateRoute, AdminRoute
│   │   ├── context/         # AuthContext (JWT + localStorage)
│   │   └── services/        # api.js (Axios), localStore.js (offline fallback)
│   └── public/
│
├── server/                  # Express REST API
│   ├── models/              # User.js, Problem.js (Mongoose schemas)
│   ├── controllers/         # authController.js, problemController.js
│   ├── routes/              # authRoutes.js, problemRoutes.js
│   ├── middleware/          # authMiddleware.js (JWT verification)
│   └── config/              # db.js (MongoDB connection)
│
├── nlp_service/             # FastAPI NLP microservice
│   ├── app.py               # API endpoints
│   ├── model.py             # ProblemClassifier, DuplicateDetector
│   ├── train.py             # Model training script
│   ├── nlp_operations.py    # TextPreprocessor, POSTagger, Word2VecModel
│   └── models/              # Saved classifier.joblib
│
└── Mydata/                  # Training datasets
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)

### 1. Backend
```bash
cd server
npm install
# create .env with MONGO_URI, JWT_SECRET, PORT=5000
npm start
```

### 2. NLP Service
```bash
cd nlp_service
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python train.py               # train model once
uvicorn app:app --port 5001
```

### 3. Frontend
```bash
cd client
npm install
npm run dev                   # runs on http://localhost:5173
```

---

## Roles

| Role | Access |
|---|---|
| **Citizen** | Register, report complaints, track own complaints, support others |
| **Agency** | View assigned complaints, update status, reply to citizens |
| **Admin** | Full access — all complaints, all users, all agencies |

---

## NLP Pipeline — How It Works

```
Citizen types complaint
        │
        ▼
  Text Preprocessing
  (lowercase → tokenize → remove stopwords → lemmatize)
        │
        ▼
  TF-IDF Vectorization
        │
        ▼
  Logistic Regression Classifier
  → Category (10 classes, ~88% accuracy)
  → Confidence score
        │
        ├──► Severity Detection (keyword matching → High / Medium / Low)
        │
        ├──► Agency Mapping (category → responsible government department)
        │
        └──► Duplicate Detection
             (Word2Vec embeddings → cosine similarity → top matches)
```

---

## Category → Agency Mapping

| Category | Assigned Agency |
|---|---|
| Road Infrastructure | MCD / PWD |
| Crime | Police Department |
| Railway | Indian Railways |
| Transport | Transport Department |
| Corruption | Anti-Corruption Bureau |
| Education | Education Department |
| Health | Health Department |
| Environment | Pollution Control Board |
| Water Supply | Water Supply Department |
| Electricity | Electricity Department |
| Other | General Administration |

---

*Built with the goal of making every citizen's voice count.*
