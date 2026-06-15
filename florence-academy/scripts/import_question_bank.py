"""Parse the Florence-owned "NCLEX Questions Builder" bank into the academy's
Question schema. Stdlib only (a .docx is a zip of XML). Read-only on the user's
files; emits src/assets/banks/imported.json and records the count in
src/data/bankManifest.json (merged in, so it never clobbers the content-bank
keys). The questionBank.ts loader fetches this asset on demand — it is not
bundled into the Practice route chunk.

SOURCE (extract the owned zip to ROOT first):
    unzip -o "~/Downloads/NCLEX Questions Builder-*.zip" -d /tmp/nclex-import
Run:
    python3 scripts/import_question_bank.py            # writes imported.json + manifest
    python3 scripts/import_question_bank.py --dry-run  # stats only, no write

WHAT THIS DOES
  clientNeed is GROUNDED in the source, not guessed:
    - Classic doc: assigned from the document's own section headings
      (Management of Care / Safety & Infection Control / Health Promotion).
      The classic bank only spans those three Client-Need categories.
    - NextGen doc: from the per-case "Categories:" line when present (mapped
      through the NCLEX Question Types.xlsx vocabulary), else a keyword fallback.
  NextGen GRID items are recovered (previously skipped): the answer to a matrix
  item is encoded as "x" marks inside a Word TABLE, and "top-N-cues" highlight
  items encode the answer by repeating the cue text in a second column. Both are
  reconstructed into matrix / highlight Question types (renderable today).

DIFFICULTY IS A PRIOR, NOT A CALIBRATION
  The source carries NO per-question difficulty (the .xlsx is only a legend of
  the allowed Easy/Medium/Hard/Very-Hard levels — it assigns them to nothing).
  Real Rasch calibration needs response data, which the app does not yet collect.
  So every imported item ships with `calibrated: false` and a TRANSPARENT prior
  difficulty derived from item type (basic recall easier; SATA / NextGen
  analysis harder) — no fake per-item precision.

  ONLINE CALIBRATION PATH (when the backend collects responses):
    1. For each item, gather graded responses; compute the proportion correct p.
    2. Seed the Rasch difficulty b ≈ -ln(p / (1 - p)) (logit), or jointly
       estimate item b and person θ via marginal-MLE / the existing EAP loop.
    3. Update difficulty with the estimate and set calibrated: true. Items with
       calibrated:false keep the type prior until they accumulate enough data.
"""
import json, os, re, sys, glob
import xml.etree.ElementTree as ET

ROOT = "/tmp/nclex-import/NCLEX Questions Builder"
REPO = "/Users/dantetolbedantert/florence-work/florence-academy"
OUT = f"{REPO}/src/assets/banks/imported.json"
MANIFEST = f"{REPO}/src/data/bankManifest.json"
DRY_RUN = "--dry-run" in sys.argv

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
def wtag(t): return f"{W}{t}"
def lname(t): return t.split("}")[-1]


def _cell_text(tc):
    parts = []
    for p in tc.iter(wtag("p")):
        parts.append("".join(t.text for t in p.iter(wtag("t")) if t.text))
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def _run_bold(r):
    rpr = r.find(wtag("rPr"))
    if rpr is None:
        return False
    b = rpr.find(wtag("b"))
    if b is None:
        return False
    return b.attrib.get(wtag("val")) not in ("false", "0", "none")


def _para_bold(el):
    """True if the paragraph's text is (mostly) bold. NextGen highlight items
    repeat the option list after an empty 'Key:' line with the correct cues
    bolded; this flag is how we recover which tokens are correct."""
    bold_chars = total_chars = 0
    for r in el.iter(wtag("r")):
        txt = "".join(t.text for t in r.iter(wtag("t")) if t.text)
        n = len(txt.strip())
        if not n:
            continue
        total_chars += n
        if _run_bold(r):
            bold_chars += n
    return total_chars > 0 and bold_chars >= 0.5 * total_chars


def parse_body(path):
    """Yield body in order as ('p', style, text, bold) or ('tbl', None, rows, False)."""
    root = ET.fromstring(__import__("zipfile").ZipFile(path).read("word/document.xml"))
    out = []
    for el in list(root.find(wtag("body"))):
        tag = lname(el.tag)
        if tag == "p":
            style = None
            pPr = el.find(wtag("pPr"))
            if pPr is not None:
                ps = pPr.find(wtag("pStyle"))
                if ps is not None:
                    style = ps.attrib.get(wtag("val"))
            txt = "".join(t.text for t in el.iter(wtag("t")) if t.text)
            out.append(("p", style, re.sub(r"\s+", " ", txt).strip(), _para_bold(el)))
        elif tag == "tbl":
            rows = [[_cell_text(tc) for tc in tr.findall(wtag("tc"))]
                    for tr in el.iter(wtag("tr"))]
            out.append(("tbl", None, rows, False))
    return out


def letters_to_idx(s):
    return [ord(c) - 97 for c in re.findall(r"\b([a-k])\b", s.lower())]


# --- clientNeed crosswalk from the NCLEX Question Types.xlsx vocabulary --------
# (Subject + Systems axes) -> the 8 NCSBN Client Needs. Used for NextGen
# "Categories:" tags. Matching is case-insensitive / substring.
TAG_TO_NEED = {
    # systems
    "analgesic": "pharmacological-therapies",
    "medication administration": "pharmacological-therapies",
    "psychiatric medication": "pharmacological-therapies",
    "pharmacolog": "pharmacological-therapies",
    "assignment": "management-of-care", "delegation": "management-of-care",
    "prioriti": "management-of-care", "management concept": "management-of-care",
    "ethical": "management-of-care", "legal": "management-of-care",
    "leadership": "management-of-care",
    "infection": "safety-infection-control", "infectious": "safety-infection-control",
    "safety": "safety-infection-control",
    "basic care": "basic-care-comfort", "comfort": "basic-care-comfort",
    "palliative": "basic-care-comfort", "fundamentals": "basic-care-comfort",
    "growth and development": "health-promotion", "antepartum": "health-promotion",
    "postpartum": "health-promotion", "labor and delivery": "health-promotion",
    "reproductive": "health-promotion", "maternal": "health-promotion",
    "newborn": "health-promotion", "pediatric": "health-promotion",
    "child health": "health-promotion", "pre-operative": "health-promotion",
    "mental health": "psychosocial-integrity", "psychiatric": "psychosocial-integrity",
    "skills": "reduction-of-risk", "procedure": "reduction-of-risk",
    "visual": "reduction-of-risk", "auditory": "reduction-of-risk",
    "post-operative": "reduction-of-risk", "integumentary": "reduction-of-risk",
    "critical care": "physiological-adaptation", "intensive care": "physiological-adaptation",
    "endocrine": "physiological-adaptation", "gastrointestinal": "physiological-adaptation",
    "nutrition": "physiological-adaptation", "hematology": "physiological-adaptation",
    "oncology": "physiological-adaptation", "immune": "physiological-adaptation",
    "musk": "physiological-adaptation", "musculoskelet": "physiological-adaptation",
    "neurolog": "physiological-adaptation", "neurology": "physiological-adaptation",
    "respiratory": "physiological-adaptation", "urinary": "physiological-adaptation",
    "renal": "physiological-adaptation", "adult health": "physiological-adaptation",
}
FORMAT_TAGS = ("case study", "multiple choice question", "grid question",
               "multiple response question", "bowtie", "drag and drop")


def need_from_tags(tags):
    for tag in tags:
        low = tag.lower().strip()
        if any(f in low for f in FORMAT_TAGS):
            continue
        for key, need in TAG_TO_NEED.items():
            if key in low:
                return need
    return None


# --- keyword fallback (only when no grounded category is available) -----------
NEED_RULES = [
    ("management-of-care", r"delegat|assign|supervis|scope of practice|incident report|prioriti|triage|continuity of care|case manage|chain of command|advance directive|informed consent|advocacy"),
    ("safety-infection-control", r"infection|precaution|isolation|sterile|hand hygiene|\bppe\b|exposure|contaminat|transmission|asepsis|sharps|restraint|fall risk|hazard|fire|disaster"),
    ("pharmacological-therapies", r"medication|dosage|\bdose\b|\bmg\b|\bmcg\b|intravenous|\biv \b|infus|administer|pharmacolog|insulin|anticoagul|antibiotic|analgesic|adverse effect|side effect|drug"),
    ("psychosocial-integrity", r"coping|anxiety|grief|depress|therapeutic communication|mental health|psychiatr|\babuse\b|suicid|substance|crisis intervention|cultural|spiritual|stress"),
    ("health-promotion", r"immuniz|vaccin|screening|health teaching|developmental|growth and development|prenatal|breastfeed|newborn care|contracepti|menopause|lifestyle|health promotion"),
    ("basic-care-comfort", r"hygiene|comfort|mobility|positioning|nutrition|elimination|\bsleep\b|ambulat|feeding|bed bath|pressure injury|pressure ulcer|range of motion|palliat"),
    ("physiological-adaptation", r"shock|arrhythmi|acidosis|alkalosis|hemorrhage|\babg\b|acute|crisis|unstable|emergen|fluid and electrolyte|pathophysiolog|exacerbation|distress|hemodynamic|increased intracranial|seizure"),
    ("reduction-of-risk", r"\blab\b|laboratory|monitor|complication|diagnostic|assessment finding|risk for|potential|electrolyte|specimen|procedure|catheter|telemetry|vital signs|therapeutic level"),
]
def guess_need(text):
    t = text.lower()
    for need, pat in NEED_RULES:
        if re.search(pat, t):
            return need
    return "reduction-of-risk"


# --- transparent difficulty PRIOR by item type (logit b). Not a calibration. --
DIFF_PRIOR = {
    "multiple-choice": 0.0, "fill-in-blank": 0.3, "select-all": 0.5,
    "ordered-response": 0.4, "matrix": 0.6, "highlight": 0.6,
    "dropdown-cloze": 0.6, "bowtie": 0.7, "drag-drop": 0.6, "trend": 0.6,
}
def difficulty_prior(qtype, nextgen):
    b = DIFF_PRIOR.get(qtype, 0.3)
    if nextgen:  # case-based analysis runs harder than a stand-alone recall item
        b += 0.2
    return round(max(-3.0, min(3.0, b)), 2)


# --- light CJMM step guess (optional metadata; only on clear matches) ---------
def guess_cjmm(text):
    t = text.lower()
    if "cue" in t or "findings" in t or "concerning" in t:
        return "recognize-cues"
    if "risk factor" in t or "most likely" in t or "diagnos" in t:
        return "analyze-cues"
    if "priorit" in t or "most appropriate" in t or "first" in t:
        return "prioritize-hypotheses"
    if "indicated" in t or "intervention" in t or "would the nurse" in t:
        return "take-actions"
    if "improv" in t or "worsen" in t or "effective" in t or "outcome" in t:
        return "evaluate-outcomes"
    return None


records = []
stats = {"mc": 0, "sata": 0, "ordered": 0, "matrix": 0, "highlight": 0}
skips = {}
skip_details = []
def skip(reason, detail=""):
    skips[reason] = skips.get(reason, 0) + 1
    if detail:
        skip_details.append((reason, detail))


def base_record(qid, stem, rationale, need, section, topic, ref, qtype,
                nextgen, context=None):
    rec = {
        "id": qid, "type": qtype,
        "difficulty": difficulty_prior(qtype, nextgen),
        "calibrated": False,
        "clientNeed": need, "section": section, "topic": topic,
        "stem": stem, "rationale": rationale or "See rationale.",
        "reference": ref,
    }
    cj = guess_cjmm(stem)
    if cj:
        rec["cjmm"] = cj
    if context:
        rec["context"] = context
    return rec


def classify_choice(stem, options, idx):
    """Return question 'type' for an answer-letter item, fixing ordered items
    whose answer is a permutation of ALL options (previously typed select-all)."""
    low = stem.lower()
    is_perm = len(idx) >= 3 and len(set(idx)) == len(idx) == len(options)
    is_kw = (("order" in low and any(k in low for k in ("place", "list", "arrange", "sequence")))
             or "in the order" in low or "priority order" in low)
    if is_perm or (is_kw and len(idx) >= 3):
        return "ordered-response"
    if "select all that apply" in low or len(idx) >= 2:
        return "select-all"
    return "multiple-choice"


def build_choice(qid, stem, options, idx, rationale, need, section, topic, ref,
                 nextgen, context=None):
    if not idx:
        return skip("no-answer-letters", f"{qid}: {stem[:60]}")
    if not stem or len(options) < 2:
        return skip("missing-stem-or-options")
    if max(idx) >= len(options):
        return skip("answer-index-out-of-range")
    qtype = classify_choice(stem, options, idx)
    rec = base_record(qid, stem, rationale, need, section, topic, ref, qtype,
                       nextgen, context)
    if qtype == "ordered-response":
        rec["steps"] = [options[i] for i in idx]
        stats["ordered"] += 1
    elif qtype == "select-all":
        rec["options"] = options
        rec["correct"] = sorted(set(idx))
        stats["sata"] += 1
    else:
        rec["options"] = options
        rec["correct"] = idx[0]
        stats["mc"] += 1
    records.append(rec)


MARK = re.compile(r"^(x|✓|✔|yes|true|correct|indicated)$", re.I)


def build_from_table(qid, stem, table, rationale, need, section, topic, ref, context):
    """Reconstruct a matrix (x-marks) or highlight (top-N-cues) item from a
    Word table whose first row is the header and first column the row labels."""
    if not table or len(table) < 3:
        return skip("table-too-small")
    header = table[0]
    data = [r for r in table[1:] if any(c.strip() for c in r)]
    if len(header) < 2 or len(data) < 2:
        return skip("table-shape")
    judge_cols = [h.strip() for h in header[1:]]

    # filled[r] = indices of judgment columns that are "marked" for row r.
    # A cell counts as marked if it is an x/✓ OR repeats the row label (the
    # "top-N-cues" highlight convention) OR is otherwise non-empty.
    def filled(row):
        label = row[0].strip()
        hits = []
        for j, cell in enumerate(row[1:len(header)]):
            c = cell.strip()
            if c and (MARK.match(c) or c == label or len(c) > 0):
                hits.append(j)
        return hits

    rows_filled = [filled(r) for r in data]

    if len(judge_cols) == 1:
        # Single judgment column -> highlight: correct = rows that are marked.
        correct = [i for i, f in enumerate(rows_filled) if f]
        if not correct:
            return skip("highlight-no-answer")
        rec = base_record(qid, stem, rationale, need, section, topic, ref,
                          "highlight", True, context)
        rec["tokens"] = [r[0].strip() for r in data]
        rec["correct"] = correct
        rec["instruction"] = judge_cols[0]
        records.append(rec)
        stats["highlight"] += 1
        return

    # >=2 judgment columns -> matrix. single if every row marks exactly one.
    if any(len(f) == 0 for f in rows_filled):
        blank = [data[i][0][:24] for i, f in enumerate(rows_filled) if not f]
        return skip("matrix-row-without-answer",
                    f"{qid}: cols={judge_cols} blankrows={blank}")
    mode = "single" if all(len(f) == 1 for f in rows_filled) else "multi"
    rec = base_record(qid, stem, rationale, need, section, topic, ref,
                      "matrix", True, context)
    rec["rows"] = [r[0].strip() for r in data]
    rec["columns"] = judge_cols
    rec["mode"] = mode
    rec["correct"] = rows_filled
    records.append(rec)
    stats["matrix"] += 1


def build_highlight_from_bold(qid, stem, keyrep, rationale, need, section, topic,
                              ref, context):
    """Recover a NextGen 'highlight' item whose answer is an option list repeated
    after an empty 'Key:' line, with the correct cues bolded. keyrep is a list of
    (text, is_bold); correct = the bold indices."""
    items = [(txt.strip(), b) for txt, b in keyrep if txt.strip()]
    tokens = [txt for txt, _b in items]
    correct = [i for i, (_txt, b) in enumerate(items) if b]
    if len(tokens) < 2:
        return skip("highlight-too-few-tokens", f"{qid}: tokens={tokens}")
    if not correct:
        return skip("highlight-no-bold", f"{qid}: {len(tokens)} tokens, none bold")
    rec = base_record(qid, stem, rationale, need, section, topic, ref,
                      "highlight", True, context)
    rec["tokens"] = tokens
    rec["correct"] = correct
    rec["instruction"] = "Highlight the findings that require follow-up."
    records.append(rec)
    stats["highlight"] += 1


# --- Classic bank: grounded clientNeed by document section heading ------------
CLASSIC_HEADINGS = {
    "management of care": "management-of-care",
    "safety and infection control": "safety-infection-control",
    "health promotion and maintenance": "health-promotion",
}
def parse_classic():
    body = parse_body(f"{ROOT}/Classic NCLEX/NCLEX RN Question bank.docx")
    current_need = None
    pending = []
    await_rat = None
    n = 0
    started = False
    for kind, style, val, _bold in body:
        if kind != "p" or not val:
            continue
        low = val.lower().rstrip(":").strip()
        # A styled heading whose text is a known category sets the section.
        if style in ("Heading1", "Heading2") and low in CLASSIC_HEADINGS:
            current_need = CLASSIC_HEADINGS[low]
            started = True
            pending = []
            await_rat = None
            continue
        if style in ("Heading1", "Heading2", "Title"):
            # group header (e.g. "Safe and Effective Care Practices") — the
            # category heading that follows sets current_need.
            continue
        if not started:
            continue  # still in the table of contents
        m = re.match(r"^(?:Answer|Answers|Correct answer|Ans|Key)s?\b\s*[:.\-]?\s*(.*)$", val, re.I)
        if m:
            if len(pending) >= 2:
                await_rat = (pending[0], pending[1:], letters_to_idx(m.group(1)))
            else:
                await_rat = None
            pending = []
            continue
        if await_rat is not None:
            stem, options, idx = await_rat
            await_rat = None
            n += 1
            need = current_need or guess_need(stem + " " + val)
            build_choice(f"cls-{n}", stem, options, idx, val, need,
                         section=0, topic="Imported · Classic",
                         ref="Florence question bank", nextgen=False)
            continue
        pending.append(val)


# --- NextGen (case-based): recover choice + grid items ------------------------
CASE_START = re.compile(r"will be based on the case|^case\s*:", re.I)
CAT_LINE = re.compile(r"^categori(?:es|zation)\s*[:\-]\s*(.*)$", re.I)
Q_LINE = re.compile(r"^(?:Q|Question)\s*(\d+)\s*[\).:]", re.I)
KEY_LINE = re.compile(r"^(?:Key|Answer|Answers|Correct answer|ANS)\b\s*[:.\-]?\s*(.*)$", re.I)
EXP_LINE = re.compile(r"^(?:Explanation|Rationale)\s*[:.\-]?\s*(.*)$", re.I)


def parse_nextgen():
    files = sorted(glob.glob(f"{ROOT}/NextGen/*.docx"))
    for fi, path in enumerate(files, 1):
        body = parse_body(path)
        case_text, case_tags = [], []
        capturing_case = False
        q = None

        def flush(qq):
            if not qq:
                return
            qid = f"ng-{fi}-{qq['num']}"
            ctx = " ".join(qq["case_text"]).strip() or None
            need = (need_from_tags(qq["case_tags"])
                    or guess_need((ctx or "") + " " + qq["stem"]))
            rationale = " ".join(qq["expl"]).strip()
            key = qq["key"]
            if key is not None and key.strip():
                build_choice(qid, qq["stem"], qq["pre"], letters_to_idx(key),
                             rationale, need, section=17,
                             topic="Imported · NextGen",
                             ref="Florence question bank (NextGen)", nextgen=True,
                             context=ctx)
            elif qq["table"] is not None:
                # A grid answer (x-marks) is authoritative over a stray empty
                # "Key:" line, so the table is matched before the bold list.
                stem = qq["stem"]
                if qq["pre"]:
                    stem = (stem + " " + " ".join(qq["pre"])).strip()
                build_from_table(qid, stem, qq["table"], rationale, need,
                                 section=17, topic="Imported · NextGen",
                                 ref="Florence question bank (NextGen)", context=ctx)
            elif qq["keyrep"]:
                build_highlight_from_bold(qid, qq["stem"], qq["keyrep"], rationale,
                                          need, section=17,
                                          topic="Imported · NextGen",
                                          ref="Florence question bank (NextGen)",
                                          context=ctx)
            elif key is not None:
                skip("nextgen-empty-key-no-list")
            else:
                skip("nextgen-no-key-no-table")

        for kind, _style, val, bold in body:
            if kind == "tbl":
                if q is not None and q["table"] is None:
                    q["table"] = val
                continue
            if not val:
                continue
            mcat = CAT_LINE.match(val)
            if mcat:
                case_tags = [t.strip() for t in re.split(r"[,/]", mcat.group(1)) if t.strip()]
                continue
            if CASE_START.search(val):
                flush(q); q = None
                case_text, capturing_case = [], True
                continue
            mq = Q_LINE.match(val)
            if mq:
                flush(q)
                capturing_case = False
                q = {"num": mq.group(1), "stem": val[mq.end():].strip(),
                     "pre": [], "expl": [], "key": None, "table": None,
                     "keyrep": [], "mode": "pre", "case_text": list(case_text),
                     "case_tags": list(case_tags)}
                continue
            if q is not None:
                mkey = KEY_LINE.match(val)
                mexp = EXP_LINE.match(val)
                if mkey and q["key"] is None and q["mode"] == "pre":
                    q["key"] = mkey.group(1)
                    # Empty key -> the correct cues follow as a bolded, repeated
                    # option list (NextGen highlight); capture it. Otherwise the
                    # next paragraph is the rationale.
                    q["mode"] = "keyrep" if not mkey.group(1).strip() else "exp"
                elif mexp:
                    q["mode"] = "exp"
                    if mexp.group(1).strip():
                        q["expl"].append(mexp.group(1).strip())
                elif q["mode"] == "exp":
                    q["expl"].append(val)
                elif q["mode"] == "keyrep":
                    q["keyrep"].append((val, bold))
                else:
                    q["pre"].append(val)
            elif capturing_case:
                case_text.append(val)
        flush(q)


parse_classic()
parse_nextgen()

# de-dup by id
seen, clean = set(), []
for r in records:
    if r["id"] in seen:
        continue
    seen.add(r["id"])
    clean.append(r)

by_need, by_type = {}, {}
for r in clean:
    by_need[r["clientNeed"]] = by_need.get(r["clientNeed"], 0) + 1
    by_type[r["type"]] = by_type.get(r["type"], 0) + 1

print("TOTAL:", len(clean))
print("by type :", json.dumps(by_type))
print("by need :", json.dumps(by_need))
print("skipped :", json.dumps(skips), "=", sum(skips.values()))
for reason, detail in skip_details:
    print(f"   SKIP {reason}: {detail}")

if DRY_RUN:
    def sample(t):
        r = next((x for x in clean if x["type"] == t), None)
        return json.dumps(r, ensure_ascii=False)[:600] if r else "none"
    for t in ("multiple-choice", "select-all", "ordered-response", "matrix", "highlight"):
        print(f"\n--- sample {t} ---\n{sample(t)}")
    sys.exit(0)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(clean, f, ensure_ascii=False, indent=1)
    f.write("\n")

# Merge our count into bankManifest.json without disturbing the keys owned by
# import_content_banks.py (load-modify-write).
manifest = {}
if os.path.exists(MANIFEST):
    with open(MANIFEST, encoding="utf-8") as f:
        manifest = json.load(f)
manifest["imported"] = len(clean)
with open(MANIFEST, "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=1, sort_keys=True)
    f.write("\n")

print("\nwrote", len(clean), "->", OUT, "(manifest.imported)")
