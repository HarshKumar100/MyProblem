"""
finetune.py – Fine-tune all-MiniLM-L6-v2 on the PGPORTAL grievance dataset.

This UPDATES the BERT weights themselves (not just a classifier head),
so the model learns grievance-specific language and semantic patterns.

Architecture:
    all-MiniLM-L6-v2  (22M params, all unfrozen)
        → fine-tuned on (text, category_label) pairs
        → Softmax classification loss (CrossEntropy)
        → Saves full fine-tuned model to models/finetuned-minilm/

After fine-tuning the encoder, separate LogisticRegression heads are
trained on top of the NEW embeddings for:
    1. Category classification   → models/classifier.joblib
    2. Severity classification   → models/severity_classifier.joblib

Usage:
    python finetune.py          # runs on GPU (RTX 3050)

Requires:  sentence-transformers, torch (CUDA), scikit-learn
"""

import os
import sys
import random
from collections import Counter

import joblib
import numpy as np
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# ── Resolve paths ────────────────────────────────────────────────────────────
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(_THIS_DIR, "models")
FINETUNED_DIR = os.path.join(MODELS_DIR, "finetuned-minilm")

# ── Device ───────────────────────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {device}")
if device.type == "cuda":
    print(f"  GPU: {torch.cuda.get_device_name(0)}")
    print(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

# ── Load dataset from train.py ───────────────────────────────────────────────
sys.path.insert(0, _THIS_DIR)
from train import load_dataset_examples, _severity_label

print("\n" + "=" * 70)
print("STEP 1 — Loading dataset")
print("=" * 70)

dataset = load_dataset_examples()
random.seed(42)
random.shuffle(dataset)

texts = [t for t, _ in dataset]
cat_labels = [c for _, c in dataset]
sev_labels = [_severity_label(t) for t in texts]

print(f"\nTotal samples: {len(texts)}")
print(f"Category distribution: {dict(Counter(cat_labels))}")
print(f"Severity distribution: {dict(Counter(sev_labels))}")

# ── Encode labels ────────────────────────────────────────────────────────────
cat_encoder = LabelEncoder()
cat_ids = cat_encoder.fit_transform(cat_labels)
num_categories = len(cat_encoder.classes_)
print(f"\nCategories ({num_categories}): {list(cat_encoder.classes_)}")

# ── Train/test split ────────────────────────────────────────────────────────
X_train_texts, X_test_texts, y_train, y_test = train_test_split(
    texts, cat_ids, test_size=0.15, random_state=42, stratify=cat_ids
)
print(f"Train: {len(X_train_texts)}  |  Test: {len(X_test_texts)}")


# ===========================================================================
# STEP 2 — Fine-tune the sentence transformer
# ===========================================================================
print("\n" + "=" * 70)
print("STEP 2 — Fine-tuning all-MiniLM-L6-v2 with SetFitModel")
print("=" * 70)

from sentence_transformers import SentenceTransformer
from torch.utils.data import DataLoader, Dataset
from torch.optim import AdamW
from torch.nn import CrossEntropyLoss, Linear
import torch.nn.functional as F


class GrievanceDataset(Dataset):
    """Simple dataset for (text, label_id) pairs."""
    def __init__(self, texts, labels):
        self.texts = texts
        self.labels = labels

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        return self.texts[idx], self.labels[idx]


def collate_fn(batch):
    texts, labels = zip(*batch)
    return list(texts), torch.tensor(labels, dtype=torch.long)


# Load the pre-trained model
model = SentenceTransformer("all-MiniLM-L6-v2", device=str(device))
embedding_dim = model.get_sentence_embedding_dimension()
print(f"Embedding dimension: {embedding_dim}")

# ── Access the underlying transformer + pooling for true fine-tuning ─────────
# SentenceTransformer wraps a list of modules: [0]=Transformer, [1]=Pooling
# We use the tokenizer and transformer directly for gradient-based training.
transformer_module = model[0]   # sentence_transformers.models.Transformer
tokenizer = transformer_module.tokenizer

# Add a classification head on top  — this trains jointly with the encoder
classification_head = Linear(embedding_dim, num_categories).to(device)

# ── Training parameters ─────────────────────────────────────────────────────
NUM_EPOCHS = 4
BATCH_SIZE = 32         # fits RTX 3050 6GB comfortably
LR_ENCODER = 2e-5       # small LR for BERT fine-tuning
LR_HEAD = 1e-3           # larger LR for the fresh classification head

# Put all modules into training mode
model.train()

# Separate parameter groups with different learning rates
optimizer = AdamW([
    {"params": model.parameters(),               "lr": LR_ENCODER},
    {"params": classification_head.parameters(),  "lr": LR_HEAD},
], weight_decay=0.01)

criterion = CrossEntropyLoss()

train_dataset = GrievanceDataset(X_train_texts, y_train)
train_loader = DataLoader(
    train_dataset, batch_size=BATCH_SIZE, shuffle=True,
    collate_fn=collate_fn, drop_last=False,
)

print(f"\nFine-tuning config:")
print(f"  Epochs:     {NUM_EPOCHS}")
print(f"  Batch size: {BATCH_SIZE}")
print(f"  LR encoder: {LR_ENCODER}")
print(f"  LR head:    {LR_HEAD}")
print(f"  Batches/ep: {len(train_loader)}")
print()


def mean_pooling(model_output, attention_mask):
    """Mean pooling over token embeddings, weighted by attention mask."""
    token_embeddings = model_output.last_hidden_state  # (B, seq_len, hidden)
    input_mask = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return (token_embeddings * input_mask).sum(1) / input_mask.sum(1).clamp(min=1e-9)


for epoch in range(NUM_EPOCHS):
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (batch_texts, batch_labels) in enumerate(train_loader):
        batch_labels = batch_labels.to(device)

        # ── Tokenize & forward through the BERT encoder ─────────────────
        encoded = tokenizer(
            batch_texts, padding=True, truncation=True,
            max_length=256, return_tensors="pt"
        )
        encoded = {k: v.to(device) for k, v in encoded.items()}

        # Forward through the transformer (gradients flow through BERT)
        outputs = transformer_module.auto_model(**encoded)
        embeddings = mean_pooling(outputs, encoded["attention_mask"])
        embeddings = F.normalize(embeddings, p=2, dim=1)

        logits = classification_head(embeddings)
        loss = criterion(logits, batch_labels)

        # Backward — gradients flow through head AND BERT encoder
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        preds = logits.argmax(dim=1)
        correct += (preds == batch_labels).sum().item()
        total += len(batch_labels)

    acc = correct / total * 100
    avg_loss = total_loss / len(train_loader)
    print(f"  Epoch {epoch+1}/{NUM_EPOCHS}  loss={avg_loss:.4f}  train_acc={acc:.1f}%")

# ── Save the fine-tuned encoder ─────────────────────────────────────────────
print(f"\nSaving fine-tuned model to {FINETUNED_DIR} …")
os.makedirs(FINETUNED_DIR, exist_ok=True)
model.save(FINETUNED_DIR)
print("  Encoder saved.")

# Save classification head too (for reference, though we retrain LR below)
head_path = os.path.join(MODELS_DIR, "classification_head.pt")
torch.save({
    "head_state_dict": classification_head.state_dict(),
    "label_classes": list(cat_encoder.classes_),
}, head_path)
print(f"  Classification head saved → {head_path}")


# ===========================================================================
# STEP 3 — Retrain LogisticRegression on fine-tuned embeddings
# ===========================================================================
print("\n" + "=" * 70)
print("STEP 3 — Training category classifier on fine-tuned embeddings")
print("=" * 70)

# Switch to eval mode for embedding
model.eval()

print("  Encoding training set …")
train_embeddings = model.encode(X_train_texts, batch_size=64, show_progress_bar=True,
                                 convert_to_numpy=True)
print("  Encoding test set …")
test_embeddings = model.encode(X_test_texts, batch_size=64, show_progress_bar=True,
                                convert_to_numpy=True)

cat_clf = LogisticRegression(
    max_iter=2000, C=5.0, solver="lbfgs",
    multi_class="multinomial", class_weight="balanced",
)
cat_clf.fit(train_embeddings, y_train)

y_pred = cat_clf.predict(test_embeddings)
cat_labels_test = cat_encoder.inverse_transform(y_test)
cat_labels_pred = cat_encoder.inverse_transform(y_pred)

print("\n  Category Classification Report (FINE-TUNED):")
print(classification_report(cat_labels_test, cat_labels_pred))

# Save
os.makedirs(MODELS_DIR, exist_ok=True)
cat_model_path = os.path.join(MODELS_DIR, "classifier.joblib")
joblib.dump(cat_clf, cat_model_path)
# Also save the label encoder so we can map indices back to names
le_path = os.path.join(MODELS_DIR, "label_encoder.joblib")
joblib.dump(cat_encoder, le_path)
print(f"  Category classifier → {cat_model_path}")
print(f"  Label encoder       → {le_path}")


# ===========================================================================
# STEP 4 — Train severity classifier on fine-tuned embeddings
# ===========================================================================
print("\n" + "=" * 70)
print("STEP 4 — Training severity classifier on fine-tuned embeddings")
print("=" * 70)

# Split severity labels the same way
_, _, sy_train, sy_test = train_test_split(
    texts, sev_labels, test_size=0.15, random_state=42, stratify=cat_ids
)

sev_clf = LogisticRegression(
    max_iter=1000, C=2.0, solver="lbfgs",
    multi_class="multinomial", class_weight="balanced",
)
sev_clf.fit(train_embeddings, sy_train)

sy_pred = sev_clf.predict(test_embeddings)
print("\n  Severity Classification Report (FINE-TUNED):")
print(classification_report(sy_test, sy_pred))

sev_path = os.path.join(MODELS_DIR, "severity_classifier.joblib")
joblib.dump(sev_clf, sev_path)
print(f"  Severity classifier → {sev_path}")


# ===========================================================================
# STEP 5 — Train Word2Vec (same as before)
# ===========================================================================
print("\n" + "=" * 70)
print("STEP 5 — Training Word2Vec embeddings on grievance corpus")
print("=" * 70)
try:
    from nlp_operations import Word2VecModel
    Word2VecModel.train(texts)
except ImportError:
    print("  Skipped (gensim not installed)")


print("\n" + "=" * 70)
print("FINE-TUNING COMPLETE")
print("=" * 70)
print(f"\nSaved artifacts:")
print(f"  {FINETUNED_DIR}/            — fine-tuned sentence encoder")
print(f"  {cat_model_path}            — category LR classifier")
print(f"  {sev_path}   — severity LR classifier")
print(f"  {le_path}       — label encoder")
print(f"\nThe model now uses YOUR grievance data's semantic patterns —")
print(f"not just generic pre-trained knowledge.")
