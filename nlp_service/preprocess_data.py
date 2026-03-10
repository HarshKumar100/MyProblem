"""
preprocess_data.py – Convert raw Mydata files into a clean sentence-formatted
CSV dataset that can be used directly for NLP training.

Run once (from nlp_service/ folder):
    python preprocess_data.py

Output:
    Mydata/processed_dataset.csv
        Columns: id, category_code, category_name, top_category,
                 clean_text, sentences, state, district

Sources used:
    1. Mydata/no_pii_grievance.json     – 175k PGPORTAL grievance records
    2. Mydata/no_pii_action_history.json – officer action remarks (MongoDB shell)
    3. Mydata/CategoryCode_Mapping.xlsx  – category code → name mapping
"""

import csv
import json
import os
import re
from collections import defaultdict
from html import unescape

import nltk
import openpyxl

nltk.download("punkt",     quiet=True)
nltk.download("punkt_tab", quiet=True)

from nltk.tokenize import sent_tokenize

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_THIS_DIR     = os.path.dirname(os.path.abspath(__file__))
_MYDATA       = os.path.join(_THIS_DIR, "..", "Mydata")
GRIEVANCE_JSON  = os.path.join(_MYDATA, "no_pii_grievance.json")
ACTION_JSON     = os.path.join(_MYDATA, "no_pii_action_history.json")
CATEGORY_XLSX   = os.path.join(_MYDATA, "CategoryCode_Mapping.xlsx")
OUTPUT_CSV      = os.path.join(_MYDATA, "processed_dataset.csv")


# ---------------------------------------------------------------------------
# Step 1 – Load category mapping from XLSX
# ---------------------------------------------------------------------------
def load_category_map():
    """
    Returns:
        code_to_name : dict  code (int) -> description (str)
        get_top      : callable  code -> top-level category name
    """
    print("Loading CategoryCode_Mapping.xlsx …")
    wb = openpyxl.load_workbook(CATEGORY_XLSX)
    ws = wb.active

    code_to_name   = {}   # every code -> its description
    code_to_parent = {}   # child code -> parent code (Stage > 1 rows)

    for row in ws.iter_rows(min_row=2, values_only=True):
        code, desc, _, parent, stage, _ = row
        if code is None:
            continue
        code_to_name[code]   = str(desc or "Unknown").strip()
        code_to_parent[code] = parent  # None for top-level

    def get_top(code):
        """Walk up the parent chain to find the top-level category name."""
        visited = set()
        while code in code_to_parent and code_to_parent[code] is not None:
            if code in visited:
                break
            visited.add(code)
            code = code_to_parent[code]
        return code_to_name.get(code, "Unknown")

    print(f"  Loaded {len(code_to_name):,} category codes.")
    return code_to_name, get_top


# ---------------------------------------------------------------------------
# Step 2 – Load action remarks from action_history (MongoDB shell → JSON)
# ---------------------------------------------------------------------------
def load_action_remarks():
    """
    Returns:
        dict  registration_no -> list of non-empty officer remark strings
    """
    print("Loading no_pii_action_history.json …")
    remarks_map = defaultdict(list)

    try:
        with open(ACTION_JSON, "r", encoding="utf-8") as f:
            raw = f.read()

        # Convert MongoDB shell syntax to valid JSON
        raw = re.sub(r"NumberInt\((\d+)\)",    r"\1",    raw)
        raw = re.sub(r"NumberLong\((\d+)\)",   r"\1",    raw)
        raw = re.sub(r'ISODate\("([^"]+)"\)',  r'"\1"',  raw)

        records = json.loads(raw)
        for rec in records:
            reg_no = (rec.get("registration_no") or "").strip()
            remark = (rec.get("remarks") or "").strip()
            if reg_no and len(remark) > 10:
                remarks_map[reg_no].append(remark)

        print(f"  Loaded {len(records):,} action records; "
              f"{len(remarks_map):,} grievances have remarks.")
    except Exception as exc:
        print(f"  Warning: could not parse action_history.json – {exc}")
        print("  Continuing without action remarks …")

    return dict(remarks_map)


# ---------------------------------------------------------------------------
# Step 3 – Text cleaning helpers
# ---------------------------------------------------------------------------
_BOILERPLATE = re.compile(
    r"^("
    r".*?>>.+$"                           # category header lines
    r"|[-─=]{3,}"                         # separator lines
    r"|to\s*$|to the\s"                   # "To" salutations
    r"|dear\s|respected\s"                # letter openings
    r"|thanking you|yours truly"
    r"|yours faithfully|yours sincerely"
    r"|sir[,.]?$|madam[,.]?$|sir/madam"
    r"|\d{1,2}[./]\d{1,2}[./]\d{2,4}"   # bare dates
    r"|registration\s*no"
    r"|location\s*:|sub\s*:|subject\s*:"
    r"|railway board.{0,50}zone"          # railway boilerplate headers
    r"|concerned authority\s*:"
    r"|address\s*:"
    r")",
    re.IGNORECASE,
)


def clean_text(raw: str) -> str:
    """
    Remove boilerplate, decode HTML entities, normalize whitespace.
    Returns a single clean paragraph string.
    """
    if not raw:
        return ""

    # Decode HTML entities (&amp; → &, etc.)
    text = unescape(raw)

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    kept = []
    for line in text.split("\n"):
        line = line.strip()
        if len(line) < 8:
            continue
        if _BOILERPLATE.match(line):
            continue
        kept.append(line)

    text = " ".join(kept)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def to_sentences(text: str) -> list:
    """
    Convert a clean paragraph into a list of individual sentences using NLTK.
    Filters out fragments shorter than 10 characters.
    """
    if not text:
        return []
    raw_sents = sent_tokenize(text)
    return [s.strip() for s in raw_sents if len(s.strip()) >= 10 and " " in s]


# ---------------------------------------------------------------------------
# Step 4 – Main: merge all 3 sources, write CSV
# ---------------------------------------------------------------------------
def preprocess():
    code_to_name, get_top = load_category_map()
    action_remarks        = load_action_remarks()

    print("Loading no_pii_grievance.json …")
    with open(GRIEVANCE_JSON, "r", encoding="utf-8") as f:
        grievances = json.load(f)
    print(f"  Loaded {len(grievances):,} grievance records.")

    print("Processing records …")
    fieldnames = [
        "id",             # registration_no
        "category_code",  # raw CategoryV7 code
        "category_name",  # description of CategoryV7
        "top_category",   # top-level ministry / department name
        "clean_text",     # boilerplate-stripped, HTML-decoded paragraph
        "sentences",      # pipe-separated individual sentences
        "state",
        "district",
        "sex",
    ]

    written = 0
    skipped = 0

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for rec in grievances:
            reg_no   = rec.get("_id") or rec.get("registration_no", "")
            cat_code = rec.get("CategoryV7")
            state    = rec.get("state", "")
            district = rec.get("dist_name", "")
            sex      = rec.get("sex", "")

            # Combine grievance body + officer remarks for richer text
            raw_body = rec.get("subject_content_text") or ""
            officer_remarks = " ".join(action_remarks.get(reg_no, []))

            combined_raw = raw_body
            if officer_remarks:
                combined_raw += " " + officer_remarks

            clean = clean_text(combined_raw)

            if len(clean) < 20:
                skipped += 1
                continue

            sentences = to_sentences(clean)

            cat_name = code_to_name.get(cat_code, "Unknown")
            top_cat  = get_top(cat_code) if cat_code else "Unknown"

            writer.writerow({
                "id":            reg_no,
                "category_code": cat_code or "",
                "category_name": cat_name,
                "top_category":  top_cat,
                "clean_text":    clean,
                "sentences":     " | ".join(sentences),
                "state":         state,
                "district":      district,
                "sex":           sex,
            })
            written += 1

    print(f"\nDone.")
    print(f"  Written : {written:,} records → {OUTPUT_CSV}")
    print(f"  Skipped : {skipped:,} (too short / empty)")


if __name__ == "__main__":
    preprocess()
