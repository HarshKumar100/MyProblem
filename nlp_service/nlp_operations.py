"""
nlp_operations.py
=================
Three core NLP operations used in this grievance-classification project.

  1. TextPreprocessor  – tokenise → lowercase → remove punctuation
                         → remove stopwords → lemmatise → POS-filter
  2. POSTagger         – annotates each word with its Part-of-Speech tag
  3. Word2VecModel     – custom Word2Vec embeddings trained on grievance corpus
                         used for semantic duplicate detection & similar-word lookup
"""

import os
import re

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

nltk.download("stopwords",                    quiet=True)
nltk.download("punkt",                        quiet=True)
nltk.download("punkt_tab",                    quiet=True)
nltk.download("wordnet",                      quiet=True)
nltk.download("averaged_perceptron_tagger",   quiet=True)
nltk.download("averaged_perceptron_tagger_eng", quiet=True)

from nltk import pos_tag as nltk_pos_tag

_lemmatizer = WordNetLemmatizer()
_stop_words  = set(stopwords.words("english"))

# POS tags worth keeping (nouns, verbs, adjectives, adverbs)
_KEEP_POS = {
    "NN", "NNS", "NNP", "NNPS",          # Nouns
    "VB", "VBD", "VBG", "VBN", "VBP", "VBZ",  # Verbs
    "JJ", "JJR", "JJS",                   # Adjectives
    "RB",                                  # Adverbs
}

_W2V_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "models", "word2vec.model"
)


# ===========================================================================
# 1.  TEXT PREPROCESSING
# ===========================================================================

class TextPreprocessor:
    """
    Full NLP text-preprocessing pipeline – 6 explicit steps:

        Step 1  Tokenise           word_tokenize (NLTK)
        Step 2  Lowercase          convert all to lower case
        Step 3  Remove punctuation strip non-alphabetic characters
        Step 4  Remove stop words  using NLTK English stopword list
        Step 5  Lemmatise          WordNetLemmatizer
        Step 6  POS filter         (optional) keep only nouns/verbs/adjectives
    """

    def __init__(self, pos_filter: bool = False):
        self.pos_filter = pos_filter

    # ── public ──────────────────────────────────────────────────────────────

    def preprocess(self, text: str) -> str:
        """Run all steps and return a single preprocessed string."""
        tokens = self._tokenize(text)
        tokens = self._lowercase(tokens)
        tokens = self._remove_punct(tokens)
        tokens = self._remove_stopwords(tokens)
        tokens = self._lemmatize(tokens)
        if self.pos_filter:
            tokens = self._pos_filter(tokens)
        return " ".join(tokens)

    def preprocess_steps(self, text: str) -> dict:
        """
        Run pipeline step-by-step and return each intermediate result.
        Useful for interview demo / explaining the pipeline.
        """
        step1 = self._tokenize(text)
        step2 = self._lowercase(step1)
        step3 = self._remove_punct(step2)
        step4 = self._remove_stopwords(step3)
        step5 = self._lemmatize(step4)
        step6 = self._pos_filter(step5)
        return {
            "step1_tokenized":        step1,
            "step2_lowercased":       step2,
            "step3_punct_removed":    step3,
            "step4_stopwords_removed": step4,
            "step5_lemmatized":       step5,
            "step6_pos_filtered":     step6,
            "final_tokens":           step6 if self.pos_filter else step5,
        }

    # ── private steps ────────────────────────────────────────────────────────

    def _tokenize(self, text: str) -> list:
        return word_tokenize(text) if text else []

    def _lowercase(self, tokens: list) -> list:
        return [t.lower() for t in tokens]

    def _remove_punct(self, tokens: list) -> list:
        cleaned = []
        for t in tokens:
            t = re.sub(r"[^a-z]", "", t)
            if len(t) > 2:
                cleaned.append(t)
        return cleaned

    def _remove_stopwords(self, tokens: list) -> list:
        return [t for t in tokens if t not in _stop_words]

    def _lemmatize(self, tokens: list) -> list:
        return [_lemmatizer.lemmatize(t) for t in tokens]

    def _pos_filter(self, tokens: list) -> list:
        if not tokens:
            return tokens
        tagged = nltk_pos_tag(tokens)
        return [word for word, tag in tagged if tag in _KEEP_POS]


# ===========================================================================
# 2.  POS TAGGING
# ===========================================================================

_POS_LABELS = {
    "NN":  "Noun (singular)",           "NNS": "Noun (plural)",
    "NNP": "Proper Noun (singular)",    "NNPS": "Proper Noun (plural)",
    "VB":  "Verb (base form)",          "VBD": "Verb (past tense)",
    "VBG": "Verb (gerund/present)",     "VBN": "Verb (past participle)",
    "VBP": "Verb (non-3rd person)",     "VBZ": "Verb (3rd person singular)",
    "JJ":  "Adjective",                 "JJR": "Adjective (comparative)",
    "JJS": "Adjective (superlative)",
    "RB":  "Adverb",                    "RBR": "Adverb (comparative)",
    "PRP": "Personal Pronoun",          "DT":  "Determiner",
    "IN":  "Preposition/Conjunction",   "CC":  "Coordinating Conjunction",
    "CD":  "Cardinal Number",
}


class POSTagger:
    """
    Part-of-Speech tagger using NLTK's averaged perceptron tagger.

    For each meaningful word in a complaint, assigns a tag like:
        NN  (Noun)   VB  (Verb)   JJ  (Adjective)   RB  (Adverb)

    Used for:
      - Understanding complaint structure
      - Filtering to keep only semantically meaningful tokens
      - Returning POS breakdown in the /nlp-analysis API response
    """

    def tag(self, text: str) -> list:
        """
        Returns list of {word, pos, label} for each token.
        Filters out punctuation and stopwords for cleaner output.
        """
        tokens = word_tokenize(text.lower()) if text else []
        tokens = [t for t in tokens if re.match(r"[a-z]{2,}", t) and t not in _stop_words]
        tagged = nltk_pos_tag(tokens)
        return [
            {
                "word":  word,
                "pos":   tag,
                "label": _POS_LABELS.get(tag, tag),
            }
            for word, tag in tagged
        ]

    def tag_summary(self, text: str) -> dict:
        """
        Returns a structured POS summary:
          - total token count
          - counts per category (nouns, verbs, adjectives, adverbs)
          - tagged list (first 20 tokens)
        """
        from collections import Counter
        tagged = self.tag(text)
        counts = Counter(item["pos"] for item in tagged)
        return {
            "total_tokens": len(tagged),
            "nouns":        sum(v for k, v in counts.items() if k.startswith("NN")),
            "verbs":        sum(v for k, v in counts.items() if k.startswith("VB")),
            "adjectives":   sum(v for k, v in counts.items() if k.startswith("JJ")),
            "adverbs":      sum(v for k, v in counts.items() if k.startswith("RB")),
            "tags":         tagged[:20],
        }


# ===========================================================================
# 3.  WORD2VEC
# ===========================================================================

class Word2VecModel:
    """
    Custom Word2Vec embeddings trained on the PGPORTAL grievance corpus.

    Architecture : CBOW (Continuous Bag of Words)
    vector_size  : 100-dimensional embeddings
    window       : 5 context words on each side

    Used for:
      - Semantic duplicate detection (document-vector cosine similarity)
      - Similar-word lookup (e.g. 'pothole' → 'road', 'damage', 'accident')
      - Understanding contextual word relationships in grievance language
    """

    def __init__(self):
        self._preprocessor = TextPreprocessor(pos_filter=False)
        self.model = self._load()

    def _load(self):
        if os.path.exists(_W2V_MODEL_PATH):
            from gensim.models import Word2Vec
            print("[Word2Vec] Loading saved model …")
            return Word2Vec.load(_W2V_MODEL_PATH)
        print("[Word2Vec] No saved model found. Run train.py to generate it.")
        return None

    @staticmethod
    def train(texts: list, vector_size: int = 100, window: int = 5,
              min_count: int = 2, epochs: int = 15):
        """
        Train Word2Vec on a list of raw complaint texts.
        Saves model to models/word2vec.model.
        """
        from gensim.models import Word2Vec

        preprocessor = TextPreprocessor(pos_filter=False)
        print(f"[Word2Vec] Tokenising {len(texts):,} texts …")
        sentences = [preprocessor.preprocess(t).split() for t in texts if t]
        sentences = [s for s in sentences if len(s) >= 3]

        print(f"[Word2Vec] Training CBOW model on {len(sentences):,} sentences …")
        print(f"           vector_size={vector_size}  window={window}  "
              f"min_count={min_count}  epochs={epochs}")

        model = Word2Vec(
            sentences=sentences,
            vector_size=vector_size,
            window=window,
            min_count=min_count,
            workers=4,
            epochs=epochs,
            sg=0,       # sg=0 → CBOW  /  sg=1 → Skip-gram
        )

        os.makedirs(os.path.dirname(_W2V_MODEL_PATH), exist_ok=True)
        model.save(_W2V_MODEL_PATH)
        print(f"[Word2Vec] Saved → {_W2V_MODEL_PATH}")
        print(f"           Vocabulary: {len(model.wv):,} unique words")
        return model

    def get_document_vector(self, text: str):
        """
        Represent a document as the average of its word vectors.
        Words not in vocabulary are ignored.
        """
        import numpy as np
        if not self.model:
            return None
        tokens = self._preprocessor.preprocess(text).split()
        vecs   = [self.model.wv[w] for w in tokens if w in self.model.wv]
        return np.mean(vecs, axis=0) if vecs else None

    def similarity(self, text1: str, text2: str) -> float:
        """Cosine similarity between two texts using averaged Word2Vec vectors."""
        import numpy as np
        v1 = self.get_document_vector(text1)
        v2 = self.get_document_vector(text2)
        if v1 is None or v2 is None:
            return 0.0
        cos = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9)
        return float(round(float(cos), 4))

    def similar_words(self, word: str, n: int = 5) -> list:
        """Return top-n contextually similar words for a given word."""
        if not self.model:
            return []
        word = word.lower()
        if word not in self.model.wv:
            return []
        return [
            {"word": w, "similarity": round(float(s), 3)}
            for w, s in self.model.wv.most_similar(word, topn=n)
        ]
