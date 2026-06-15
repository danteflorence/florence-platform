"""Parse the Florence-owned TABULAR NCLEX banks (+ the NGN 150 unfolding cases)
into the academy's Question schema and emit one JSON asset each under
src/assets/banks/, updating src/data/bankManifest.json with the per-bank counts.
The loaders (src/data/questionBank.ts + caseBank.ts) fetch these assets on demand
so none of the payload is bundled into the Practice route chunk. Stdlib only (a
.xlsx is a zip of XML; CSVs via the csv module). Read-only on the user's sources.

SOURCES (Florence-original; commercial banks used only as topical reference):
  fab     FAB_NCLEX_RN_5000_MCQ_CAT_SeedBank.csv          -> multiple-choice
  bowtie  NCLEX_Bowtie_1000_Question_Bank.csv             -> bowtie
  dd      NCLEX_RN_1000_Drag_and_Drop_Questions.xlsx      -> ordered-response
  emr     NCLEX_1000_Extended_Multiple_Response_*.xlsx    -> select-all

Run:
  python3 scripts/import_content_banks.py                  # write all bank JSON assets
  python3 scripts/import_content_banks.py --dry-run        # stats + samples, no write
  python3 scripts/import_content_banks.py --only=fab,emr   # subset (manifest merges)

DIFFICULTY IS A PRIOR, NOT A CALIBRATION
  FAB carries a per-item IRT b (IRT_b_initial) authored for CAT seeding; we use
  it directly. The other three banks carry only a difficulty LABEL, mapped to a
  transparent logit-b prior (foundational -1.5 / easy -0.7 / medium 0.0 /
  hard 0.9). Every item ships calibrated:false; online Rasch calibration (see
  scripts/import_question_bank.py header) flips that to true once the backend
  collects real responses.

clientNeed is GROUNDED in each row's own NCSBN Client-Needs column (the 8-cat
subcategory when present), normalized to the app's ClientNeed keys; a keyword
fallback only fires if a row's category is blank/unrecognized.
"""
import csv, json, os, re, sys, zipfile
import xml.etree.ElementTree as ET

csv.field_size_limit(10_000_000)

DESK = "/Users/dantetolbedantert/Desktop"
REPO = "/Users/dantetolbedantert/florence-work/florence-academy"
# Banks ship as hashed JSON assets fetched on demand by the loaders
# (src/data/questionBank.ts + caseBank.ts); per-bank counts live in
# bankManifest.json so the landing page can size the pool without fetching the
# payload. None of this is bundled into the Practice route chunk.
ASSETS_DIR = f"{REPO}/src/assets/banks"
MANIFEST = f"{REPO}/src/data/bankManifest.json"
SRC = {
    "fab": f"{DESK}/FAB_NCLEX_RN_5000_MCQ_CAT_SeedBank.csv",
    "bowtie": f"{DESK}/NCLEX_Bowtie_1000_Question_Bank.csv",
    "dd": f"{DESK}/NCLEX_RN_1000_Drag_and_Drop_Questions.xlsx",
    "emr": f"{DESK}/NCLEX_1000_Extended_Multiple_Response_Question_Bank.xlsx",
    "sata": f"{DESK}/florence_academy_nclex_sata_2000_cat_item_bank.jsonl",
}
# bank key -> (JSON asset filename, bankManifest.json count key)
OUT = {
    "fab": ("fab.json", "fab"),
    "bowtie": ("bowtie.json", "bowtie"),
    "dd": ("dragdrop.json", "dragdrop"),
    "emr": ("extended-mr.json", "extendedMr"),
    "sata": ("sata.json", "sata"),
}


def write_json(path, data):
    """Write a Florence-owned bank as a pretty JSON array (matches the committed
    assets so regeneration produces a clean diff)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


def update_manifest(updates):
    """Merge our counts into bankManifest.json without disturbing keys owned by
    other banks or by import_question_bank.py (load-modify-write); a subset run
    like --only=fab therefore leaves every other count intact."""
    manifest = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            manifest = json.load(f)
    manifest.update(updates)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
        f.write("\n")

DRY_RUN = "--dry-run" in sys.argv
_only = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--only=")), None)
ONLY = set(filter(None, _only.split(","))) if _only else {"fab", "bowtie", "dd", "emr", "sata", "cases"}

# ---------------------------------------------------------------------------
# Shared normalizers
# ---------------------------------------------------------------------------

# 8 NCSBN Client Needs — matched by substring on the row's category string.
NEED_PHRASES = [
    ("management of care", "management-of-care"),
    ("infection", "safety-infection-control"),
    ("health promotion", "health-promotion"),
    ("psychosocial", "psychosocial-integrity"),
    ("basic care", "basic-care-comfort"),
    ("pharmacolog", "pharmacological-therapies"),
    ("parenteral", "pharmacological-therapies"),
    ("reduction of risk", "reduction-of-risk"),
    ("physiolog", "physiological-adaptation"),
]
# keyword fallback (only when no grounded category resolves)
NEED_RULES = [
    ("management-of-care", r"delegat|assign|supervis|scope of practice|incident report|prioriti|triage|advance directive|informed consent|advocacy|conflict|handoff|confidential"),
    ("safety-infection-control", r"infection|precaution|isolation|sterile|hand hygiene|\bppe\b|exposure|contaminat|asepsis|sharps|restraint|fall risk|hazard|fire|disaster|needlestick"),
    ("pharmacological-therapies", r"medication|dosage|\bdose\b|intravenous|infus|administer|pharmacolog|insulin|anticoagul|antibiotic|analgesic|adverse effect|toxicity|\bdrug\b"),
    ("psychosocial-integrity", r"coping|anxiety|grief|depress|therapeutic communication|mental health|psychiatr|\babuse\b|suicid|substance|crisis|cultural|spiritual|hallucinat|withdrawal"),
    ("health-promotion", r"immuniz|vaccin|screening|health teaching|developmental|growth and development|prenatal|breastfeed|newborn|contracepti|menopause|lifestyle"),
    ("basic-care-comfort", r"hygiene|comfort|mobility|positioning|nutrition|elimination|\bsleep\b|ambulat|feeding|pressure injury|range of motion|palliat|ostomy|dysphagia"),
    ("physiological-adaptation", r"shock|arrhythmi|acidosis|alkalosis|hemorrhage|\babg\b|crisis|unstable|emergen|electrolyte|exacerbation|distress|hemodynamic|intracranial|seizure|sepsis"),
    ("reduction-of-risk", r"\blab\b|laboratory|monitor|complication|diagnostic|assessment finding|risk for|potential|specimen|procedure|catheter|telemetry|vital signs|biopsy|sedation"),
]


def norm_need(*candidates):
    for s in candidates:
        t = (s or "").lower()
        for phrase, need in NEED_PHRASES:
            if phrase in t:
                return need
    blob = " ".join(c or "" for c in candidates).lower()
    for need, pat in NEED_RULES:
        if re.search(pat, blob):
            return need
    return "reduction-of-risk"


CJMM_MAP = [
    ("recognize cue", "recognize-cues"),
    ("analyze cue", "analyze-cues"),
    ("prioritize hypoth", "prioritize-hypotheses"),
    ("generate solution", "generate-solutions"),
    ("take action", "take-actions"),
    ("evaluate outcome", "evaluate-outcomes"),
]


def norm_cjmm(s):
    t = (s or "").lower()
    for k, v in CJMM_MAP:
        if k in t:
            return v
    return None


# difficulty LABEL -> transparent logit-b prior (not a calibration)
DIFF_LABEL_B = [
    ("foundational", -1.5),
    ("very easy", -1.5),
    ("easy-moderate", -0.7),
    ("easy/moderate", -0.7),
    ("easy", -0.7),
    ("medium", 0.0),
    ("moderate", 0.0),
    ("challenging", 0.9),
    ("difficult", 0.9),
    ("very hard", 1.3),
    ("hard", 0.9),
    ("high", 0.9),
    ("low", -0.7),
]


def label_b(label, default=0.0):
    t = (label or "").strip().lower()
    for k, v in DIFF_LABEL_B:
        if k in t:
            return v
    return default


def clamp_b(b):
    return round(max(-3.0, min(3.0, float(b))), 2)


def clean(s):
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()


def g(row, i):
    return row[i] if i < len(row) else ""


def trim_options(raw):
    """Strip + drop trailing blanks; return (options, has_internal_blank)."""
    opts = [clean(o) for o in raw]
    while opts and not opts[-1]:
        opts.pop()
    return opts, any(not o for o in opts)


def letters_to_idx(s):
    """'B, D, E' / 'A' -> [1,3,4] / [0]. Single-letter tokens only."""
    return [ord(c.upper()) - 65 for c in re.findall(r"\b([A-Za-z])\b", s or "")]


def strip_label(opt):
    """'A. Request outside scope' -> 'Request outside scope'."""
    return re.sub(r"^[A-Za-z]\s*[\.\)]\s*", "", clean(opt)).strip()


def pipe_options(s):
    return [strip_label(p) for p in (s or "").split("|") if strip_label(p)]


# ---------------------------------------------------------------------------
# Dependency-free .xlsx reader (column-ref aligned)
# ---------------------------------------------------------------------------
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def _col_idx(ref):
    m = re.match(r"([A-Z]+)", ref or "A")
    s = m.group(1) if m else "A"
    n = 0
    for ch in s:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def xlsx_rows(path, sheet_name):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        sroot = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in sroot.iter(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
    target = None
    for s in wb.iter(f"{NS}sheet"):
        if s.attrib["name"] == sheet_name:
            tgt = rid[s.attrib[f"{RNS}id"]].lstrip("/")
            target = tgt if tgt.startswith("xl/") else "xl/" + tgt
            break
    if target is None:
        raise KeyError(f"sheet {sheet_name!r} not found in {path}")
    wsroot = ET.fromstring(z.read(target))
    out = []
    for r in wsroot.iter(f"{NS}row"):
        width, cells = 0, {}
        for c in r.findall(f"{NS}c"):
            j = _col_idx(c.attrib.get("r", "A"))
            width = max(width, j + 1)
            v = c.find(f"{NS}v")
            t = c.attrib.get("t")
            if v is None:
                cells[j] = ""
            elif t == "s":
                cells[j] = shared[int(v.text)]
            else:
                cells[j] = v.text
        out.append([cells.get(j, "") for j in range(width)])
    return out


# ---------------------------------------------------------------------------
# Per-bank record builders. Each returns (records, stats, skips).
# ---------------------------------------------------------------------------

def base(qid, qtype, b, need, topic, stem, rationale, cjmm=None, context=None):
    rec = {
        "id": qid, "type": qtype, "difficulty": clamp_b(b), "calibrated": False,
        "clientNeed": need, "section": 0, "topic": topic or "NCLEX practice",
        "stem": stem, "rationale": rationale or "See rationale.",
    }
    if cjmm:
        rec["cjmm"] = cjmm
    if context:
        rec["context"] = context
    return rec


def parse_fab():
    recs, skips = [], {}

    def skip(r):
        skips[r] = skips.get(r, 0) + 1

    with open(SRC["fab"], newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh))
    for row in rows[1:]:
        qid = clean(g(row, 0))
        stem = clean(g(row, 4))
        opts, internal = trim_options([g(row, 5), g(row, 6), g(row, 7), g(row, 8)])
        idx = letters_to_idx(g(row, 9))
        if not qid or not stem:
            skip("missing-id-or-stem"); continue
        if len(opts) < 2 or internal:
            skip("bad-options"); continue
        if not idx or idx[0] >= len(opts):
            skip("bad-answer"); continue
        try:
            b = clamp_b(float(g(row, 13)))
        except ValueError:
            b = label_b(g(row, 12))
        rec = base(qid, "multiple-choice", b,
                   norm_need(g(row, 20), g(row, 19)),
                   clean(g(row, 23)) or clean(g(row, 22)),
                   stem, clean(g(row, 10)), norm_cjmm(g(row, 25)))
        rec["options"] = opts
        rec["correct"] = idx[0]
        recs.append(rec)
    return recs, {"items": len(recs)}, skips


def parse_emr():
    recs, skips = [], {}

    def skip(r):
        skips[r] = skips.get(r, 0) + 1

    rows = xlsx_rows(SRC["emr"], "Full Bank")
    for row in rows[1:]:
        qid = clean(g(row, 0))
        stem = clean(g(row, 7))
        opts, internal = trim_options([g(row, j) for j in range(8, 14)])
        idx = sorted(set(letters_to_idx(g(row, 14))))
        if not qid or not stem:
            skip("missing-id-or-stem"); continue
        if len(opts) < 2 or internal:
            skip("bad-options"); continue
        if not idx or max(idx) >= len(opts):
            skip("bad-answer"); continue
        rec = base(qid, "select-all", label_b(g(row, 4)),
                   norm_need(g(row, 2)), clean(g(row, 3)),
                   stem, clean(g(row, 16)), norm_cjmm(g(row, 6)))
        rec["options"] = opts
        rec["correct"] = idx
        recs.append(rec)
    return recs, {"items": len(recs)}, skips


def parse_sata():
    """Florence-owned SATA / multiple-response bank (JSON Lines). Unlike the other
    tabular banks this one carries a per-item provisional IRT b, so we use it
    directly as the seeding prior (clamped); the difficulty LABEL is only a
    fallback. clientNeed is grounded in the row's own NCSBN subcategory."""
    recs, skips = [], {}

    def skip(r):
        skips[r] = skips.get(r, 0) + 1

    with open(SRC["sata"], encoding="utf-8") as fh:
        rows = [json.loads(ln) for ln in fh if ln.strip()]
    for row in rows:
        qid = clean(row.get("item_id"))
        stem = clean(row.get("stem"))
        opts, internal = trim_options([row.get(f"option_{L}") for L in "ABCDEF"])
        idx = sorted(set(letters_to_idx(row.get("correct_options"))))
        if not qid or not stem:
            skip("missing-id-or-stem"); continue
        if len(opts) < 2 or internal:
            skip("bad-options"); continue
        if not idx or max(idx) >= len(opts):
            skip("bad-answer"); continue
        try:
            b = clamp_b(float(row.get("provisional_irt_b")))
        except (TypeError, ValueError):
            b = label_b(row.get("difficulty_label"))
        rec = base(qid, "select-all", b,
                   norm_need(row.get("client_needs_subcategory"),
                             row.get("client_needs_category")),
                   clean(row.get("topic")),
                   stem, clean(row.get("rationale")),
                   norm_cjmm(row.get("clinical_judgment_step")))
        rec["options"] = opts
        rec["correct"] = idx
        recs.append(rec)
    return recs, {"items": len(recs)}, skips


def parse_dd():
    recs, skips = [], {}

    def skip(r):
        skips[r] = skips.get(r, 0) + 1

    rows = xlsx_rows(SRC["dd"], "Question Bank")
    for row in rows[1:]:
        qid = clean(g(row, 0))
        stem = clean(g(row, 9))
        opts, internal = trim_options([g(row, j) for j in range(10, 15)])
        seq = letters_to_idx(g(row, 15))
        if not qid or not stem:
            skip("missing-id-or-stem"); continue
        if len(opts) < 2 or internal:
            skip("bad-options"); continue
        # sequence must be a permutation of the option indices
        if len(seq) != len(opts) or sorted(seq) != list(range(len(opts))):
            skip("bad-sequence"); continue
        rec = base(qid, "ordered-response", label_b(g(row, 5)),
                   norm_need(g(row, 3), g(row, 2)), clean(g(row, 4)),
                   stem, clean(g(row, 17)), norm_cjmm(g(row, 7)))
        rec["steps"] = [opts[i] for i in seq]  # steps in CORRECT order
        recs.append(rec)
    return recs, {"items": len(recs)}, skips


def parse_bowtie():
    recs, skips = [], {}

    def skip(r):
        skips[r] = skips.get(r, 0) + 1

    with open(SRC["bowtie"], newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh))
    for row in rows[1:]:
        qid = clean(g(row, 0))
        cond_opts = pipe_options(g(row, 9))
        act_opts = pipe_options(g(row, 10))
        mon_opts = pipe_options(g(row, 11))
        cond_idx = letters_to_idx(g(row, 12))
        act_idx = sorted(set(letters_to_idx(g(row, 14))))
        mon_idx = sorted(set(letters_to_idx(g(row, 16))))
        prompt = clean(g(row, 7))
        if not qid or not prompt:
            skip("missing-id-or-prompt"); continue
        if len(cond_opts) < 2 or len(act_opts) < 2 or len(mon_opts) < 2:
            skip("too-few-options"); continue
        if not cond_idx or cond_idx[0] >= len(cond_opts):
            skip("bad-condition"); continue
        if not act_idx or max(act_idx) >= len(act_opts):
            skip("bad-actions"); continue
        if not mon_idx or max(mon_idx) >= len(mon_opts):
            skip("bad-parameters"); continue
        rationale = clean(g(row, 18))
        teach = clean(g(row, 19))
        if teach:
            rationale = f"{rationale} Teaching point: {teach}" if rationale else teach
        rec = base(qid, "bowtie", label_b(g(row, 5)),
                   norm_need(g(row, 2)), clean(g(row, 4)),
                   prompt, rationale, norm_cjmm(g(row, 6)),
                   context=clean(g(row, 8)) or None)
        rec["condition"] = {"options": cond_opts, "correct": cond_idx[0]}
        rec["actions"] = {"options": act_opts, "correct": act_idx}
        rec["parameters"] = {"options": mon_opts, "correct": mon_idx}
        recs.append(rec)
    return recs, {"items": len(recs)}, skips


# ---------------------------------------------------------------------------
# NGN 150 unfolding cases (.docx). Each case = a shared scenario + 6 CJMM items
# (matrix / select-all / bowtie / dropdown-cloze / ordered-response / matrix) +
# a prose answer key (Q1..Q6). Structure verified 100% uniform across all 150.
# Emits cases.json (CaseStudy[]) + case-items.json (Question[]) under
# src/assets/banks/. Case items live in section 17 and are played within the case
# runner, NOT mixed into the adaptive QUESTION_BANK pool.
# ---------------------------------------------------------------------------
import glob

CASES_SRC = sorted(glob.glob("/tmp/ngn150/*Volume*.docx"))
CASES_OUT = f"{ASSETS_DIR}/cases.json"
CASE_ITEMS_OUT = f"{ASSETS_DIR}/case-items.json"
WT = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
CJMM_BY_STEP = ["recognize-cues", "analyze-cues", "prioritize-hypotheses",
                "generate-solutions", "take-actions", "evaluate-outcomes"]
ITEM_HDR = re.compile(r"^([1-6])\.\s+(.*?)\s*-\s*(.+)$")
ROW_RE = re.compile(r"^([A-Z])\.\s*(.*?)\s*-\s*\[ \]\s*(.+?)\s*\[ \]\s*(.+?)\s*$")
OPT_RE = re.compile(r"^([A-Z])\.\s*(.*)$")


def docx_paras(path):
    root = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    out = []
    for el in root.find(f"{WT}body").iter(f"{WT}p"):
        txt = "".join(t.text for t in el.iter(f"{WT}t") if t.text)
        out.append(clean(txt))
    return out


def _nm(s):
    """Normalize for fuzzy answer-text -> option matching."""
    s = (s or "").strip().lower()
    s = re.sub(r"^[a-z]\.\s*", "", s)
    s = re.sub(r"\s+", " ", s).strip(" .;,")
    return s


def _eq(a, b):
    na, nb = _nm(a), _nm(b)
    if not na or not nb:
        return False
    return na == nb or (len(na) > 8 and (na in nb or nb in na))


def _find(text, options):
    for i, o in enumerate(options):
        if _eq(text, o):
            return i
    return -1


def split_segment(case_lines):
    """Slice a case into (head, focus, scenario lines, item blocks, answer key)."""
    def find(pred, start=0):
        for i in range(start, len(case_lines)):
            if pred(case_lines[i]):
                return i
        return -1
    i_items = find(lambda p: p == "NGN Items")
    i_key = find(lambda p: p.startswith("Answer Key"))
    scenario = case_lines[1:i_items]
    item_lines = case_lines[i_items + 1:i_key]
    key_lines = case_lines[i_key + 1:]
    # split item_lines into 6 blocks keyed by header number
    blocks, cur = {}, None
    for ln in item_lines:
        m = ITEM_HDR.match(ln)
        if m:
            cur = int(m.group(1))
            blocks[cur] = []
        elif cur is not None:
            blocks[cur].append(ln)
    return scenario, blocks, key_lines


def parse_answer_key(key_lines):
    """Q1..Q6 -> {head, body lines, rationale}."""
    qk, i = {}, 0
    sep = lambda s: bool(re.match(r"^_{6,}$", s))
    while i < len(key_lines):
        m = re.match(r"^Q([1-6]):\s*(.*)$", key_lines[i])
        if not m:
            i += 1
            continue
        qn, head = m.group(1), m.group(2)
        i += 1
        body = []
        while i < len(key_lines) and not re.match(r"^Q[1-6]:", key_lines[i]) \
                and not key_lines[i].startswith("Rationale:") and not sep(key_lines[i]):
            body.append(key_lines[i]); i += 1
        rationale = ""
        if i < len(key_lines) and key_lines[i].startswith("Rationale:"):
            rationale = key_lines[i][len("Rationale:"):].strip(); i += 1
            while i < len(key_lines) and not re.match(r"^Q[1-6]:", key_lines[i]) and not sep(key_lines[i]):
                rationale += " " + key_lines[i]; i += 1
        qk[qn] = {"head": head.strip(), "body": body, "rationale": rationale.strip()}
    return qk


def matrix_correct(rows, columns, head, fail):
    """Assign each row to a column from a prose answer like
    'Improvement: a; b. Requires further action: c; d.' (one or both listed)."""
    segs = {}
    pos = []
    for ci, col in enumerate(columns):
        m = re.search(re.escape(col) + r"\s*:", head, re.I)
        if m:
            pos.append((m.start(), m.end(), ci))
    pos.sort()
    for n, (st, en, ci) in enumerate(pos):
        nxt = pos[n + 1][0] if n + 1 < len(pos) else len(head)
        segs[ci] = [x.strip(" .;") for x in head[en:nxt].split(";") if x.strip(" .;")]
    listed = list(segs.keys())
    correct = []
    for r in rows:
        assigned = None
        for ci, items in segs.items():
            if any(_eq(r, it) for it in items):
                assigned = ci
                break
        if assigned is None:
            unlisted = [c for c in range(len(columns)) if c not in listed]
            if len(unlisted) == 1:
                assigned = unlisted[0]
            else:
                fail(f"matrix row unmatched: {r[:40]!r}")
                assigned = 1 if 0 in listed else 0
        correct.append([assigned])
    return correct


def parse_cases():
    cases, items, skips = [], [], {}
    fails = []

    def skip(r):
        skips[r] = skips.get(r, 0) + 1

    case_hdr = re.compile(r"^Case\s*(\d{1,3})\.\s+(.+)$")
    for path in CASES_SRC:
        ps = docx_paras(path)
        ps = [p for p in ps if p != ""]
        # body cases = a Case heading whose next ~2 lines include a Focus: line
        starts = [i for i, p in enumerate(ps)
                  if case_hdr.match(p) and any(ps[j].startswith("Focus:")
                                               for j in range(i + 1, min(i + 3, len(ps))))]
        for k, si in enumerate(starts):
            ei = starts[k + 1] if k + 1 < len(starts) else len(ps)
            seg = ps[si:ei]
            mh = case_hdr.match(seg[0])
            num = int(mh.group(1))
            cid = f"case-{num:03d}"
            title = mh.group(2).strip()
            case_fail = lambda msg, _cid=cid: fails.append(f"{_cid}: {msg}")

            focus_line = next((p for p in seg if p.startswith("Focus:")), "")
            def fz(label, default=""):
                m = re.search(re.escape(label) + r"\s*:\s*([^|]+)", focus_line)
                return m.group(1).strip() if m else default
            focus = fz("Focus")
            need = norm_need(fz("Client Need"))
            setting = fz("Setting")
            diff = fz("Difficulty", "Moderate")
            cdiff = clamp_b(label_b(diff) + 0.2)  # case-based analysis runs harder

            scenario, blocks, key_lines = split_segment(seg)
            qk = parse_answer_key(key_lines)
            if sorted(qk.keys()) != ["1", "2", "3", "4", "5", "6"] or len(blocks) != 6:
                skip("incomplete-case"); case_fail("missing items/answers"); continue

            # ---- scenario tabs (exclude the facilitator priority-concern leak) ----
            profile = note = ""
            data = []
            mode = None
            for ln in scenario:
                if ln == "Unfolding Scenario":
                    continue
                if ln.startswith("Client profile:"):
                    profile = ln.split(":", 1)[1].strip(); mode = None
                elif ln.startswith("Nursing note:"):
                    note = ln.split(":", 1)[1].strip(); mode = None
                elif ln.startswith("Initial data:"):
                    mode = "data"
                elif ln.startswith("Priority concern for facilitator"):
                    mode = None  # answer leak — never shown to the student
                elif mode == "data":
                    data.append(ln)
            tabs = []
            prof_body = (f"Setting: {setting}\n{profile}" if setting else profile).strip()
            if prof_body:
                tabs.append({"label": "Client Profile", "body": prof_body})
            if note:
                tabs.append({"label": "Nurses' Notes", "body": note})
            if data:
                tabs.append({"label": "Initial Data", "body": "\n".join("• " + d for d in data)})

            ctx = f"{title} — {profile}" if profile else title
            built = {}

            def add_item(n, qtype, stem, extra):
                iid = f"{cid}-q{n}"
                rec = {
                    "id": iid, "type": qtype, "difficulty": cdiff, "calibrated": False,
                    "clientNeed": need, "section": 17, "topic": focus or "NGN Unfolding Case",
                    "context": ctx, "cjmm": CJMM_BY_STEP[n - 1],
                    "stem": stem, "rationale": qk[str(n)]["rationale"] or "See rationale.",
                }
                rec.update(extra)
                built[n] = rec  # keyed by item number; committed in order at the end

            ok = True

            def stem_of(n):
                b = blocks[n]
                return b[0] if b else ""

            # ---- Item 1 & 6: matrix --------------------------------------------
            for n in (1, 6):
                rows, cols = [], None
                for ln in blocks[n][1:]:
                    rm = ROW_RE.match(ln)
                    if rm:
                        rows.append(rm.group(2).strip())
                        if cols is None:
                            cols = [rm.group(3).strip(), rm.group(4).strip()]
                if not rows or not cols:
                    skip(f"matrix-shape-q{n}"); ok = False; break
                correct = matrix_correct(rows, cols, qk[str(n)]["head"], case_fail)
                add_item(n, "matrix", stem_of(n),
                         {"rows": rows, "columns": cols, "mode": "single", "correct": correct})
            if not ok:
                case_fail("matrix build failed"); continue

            # ---- Item 2: select-all --------------------------------------------
            opts2 = [OPT_RE.match(l).group(2).strip() for l in blocks[2][1:] if OPT_RE.match(l)]
            head2 = re.sub(r"^.*?:\s*", "", qk["2"]["head"])
            idx2 = sorted(set(letters_to_idx(head2)))
            if len(opts2) < 2 or not idx2 or max(idx2) >= len(opts2):
                skip("bad-select-all"); case_fail("q2"); continue
            add_item(2, "select-all", stem_of(2), {"options": opts2, "correct": idx2})

            # ---- Item 3: bowtie ------------------------------------------------
            def opt_line(prefix, n=3):
                ln = next((l for l in blocks[n] if l.lower().startswith(prefix)), "")
                ln = ln.split(":", 1)[1] if ":" in ln else ""
                return [x.strip(" .") for x in ln.split(";") if x.strip(" .")]
            cond_o = opt_line("priority hypothesis options")
            act_o = opt_line("action options")
            mon_o = opt_line("monitoring options")
            m3 = re.search(r"Priority hypothesis:\s*(.*?)\.?\s*Actions?:\s*(.*?)\.?\s*"
                           r"Monitor(?:ing)?:\s*(.*)$", qk["3"]["head"], re.I | re.S)
            if not (cond_o and act_o and mon_o and m3):
                skip("bad-bowtie"); case_fail("q3 parse"); continue
            ci = _find(m3.group(1), cond_o)
            ai = sorted({_find(x, act_o) for x in m3.group(2).split(";")} - {-1})
            pi = sorted({_find(x, mon_o) for x in m3.group(3).split(";")} - {-1})
            if ci < 0 or not ai or not pi:
                skip("bowtie-unmatched"); case_fail("q3 match"); continue
            add_item(3, "bowtie", stem_of(3), {
                "condition": {"options": cond_o, "correct": ci},
                "actions": {"options": act_o, "correct": ai},
                "parameters": {"options": mon_o, "correct": pi},
            })

            # ---- Item 4: dropdown-cloze ----------------------------------------
            sentence = " ".join(blocks[4][1:]).strip()
            parts = re.split(r"(\[[^\]]*\])", sentence)
            segments, blanks = [], []
            for tok in parts:
                if tok.startswith("[") and tok.endswith("]"):
                    bopts = [x.strip() for x in re.split(r"\s+/\s+", tok[1:-1].strip()) if x.strip()]
                    blanks.append(bopts)
                    segments.append({"kind": "blank", "options": bopts, "correct": 0})
                elif tok.strip():
                    segments.append({"kind": "text", "text": tok.strip()})
            ans4 = re.sub(r"^.*?cloze:\s*", "", qk["4"]["head"], flags=re.I)
            ans4_parts = [x.strip(" .") for x in re.split(r"\s+/\s+", ans4) if x.strip(" .")]
            bi = 0
            okc = len(blanks) >= 1 and len(ans4_parts) >= len(blanks)
            for sgmt in segments:
                if sgmt["kind"] == "blank":
                    ci2 = _find(ans4_parts[bi] if bi < len(ans4_parts) else "", sgmt["options"])
                    if ci2 < 0:
                        okc = False
                    sgmt["correct"] = max(ci2, 0)
                    bi += 1
            if not okc:
                skip("bad-cloze"); case_fail("q4"); continue
            add_item(4, "dropdown-cloze", stem_of(4), {"segments": segments})

            # ---- Item 5: ordered-response --------------------------------------
            opts5 = [OPT_RE.match(l).group(2).strip() for l in blocks[5][1:] if OPT_RE.match(l)]
            order_lines = qk["5"]["body"]
            steps = []
            for ol in order_lines:
                j = _find(ol, opts5)
                steps.append(opts5[j] if j >= 0 else ol.strip())
            if len(steps) < 2 or len(steps) != len(opts5):
                skip("bad-ordered"); case_fail("q5"); continue
            add_item(5, "ordered-response", stem_of(5), {"steps": steps})

            # Commit only a fully-built case, with items + questionIds in CJMM
            # order 1..6 (matrix items 1 & 6 are built together, out of sequence).
            if len(built) != 6:
                skip("incomplete-build"); case_fail("not all 6 items built"); continue
            for n in range(1, 7):
                items.append(built[n])
            qids = [built[n]["id"] for n in range(1, 7)]
            cases.append({"id": cid, "title": title, "tabs": tabs, "questionIds": qids})

    return cases, items, skips, fails


def emit_cases(cases, items):
    write_json(CASES_OUT, cases)
    write_json(CASE_ITEMS_OUT, items)
    update_manifest({"cases": len(cases)})
    return CASES_OUT, CASE_ITEMS_OUT


PARSERS = {"fab": parse_fab, "bowtie": parse_bowtie, "dd": parse_dd,
           "emr": parse_emr, "sata": parse_sata}
def emit(key, records):
    fname, mkey = OUT[key]
    path = f"{ASSETS_DIR}/{fname}"
    write_json(path, records)
    update_manifest({mkey: len(records)})
    return path, mkey


def main():
    grand = 0
    for key in ("fab", "bowtie", "dd", "emr", "sata"):
        if key not in ONLY:
            continue
        recs, stats, skips = PARSERS[key]()
        # de-dup by id
        seen, clean_recs = set(), []
        dups = 0
        for r in recs:
            if r["id"] in seen:
                dups += 1
                continue
            seen.add(r["id"])
            clean_recs.append(r)
        by_need, by_type = {}, {}
        for r in clean_recs:
            by_need[r["clientNeed"]] = by_need.get(r["clientNeed"], 0) + 1
            by_type[r["type"]] = by_type.get(r["type"], 0) + 1
        grand += len(clean_recs)
        print(f"\n=== {key.upper()} ===")
        print(f"  kept: {len(clean_recs)}  dups-dropped: {dups}")
        print(f"  by type: {json.dumps(by_type)}")
        print(f"  by need: {json.dumps(by_need)}")
        if skips:
            print(f"  SKIPPED: {json.dumps(skips)} = {sum(skips.values())}")
        if DRY_RUN:
            print(f"  sample: {json.dumps(clean_recs[0], ensure_ascii=False)[:700]}")
        else:
            path, mkey = emit(key, clean_recs)
            print(f"  wrote {len(clean_recs)} -> {path} (manifest.{mkey})")

    if "cases" in ONLY:
        cases, items, skips, fails = parse_cases()
        by_type = {}
        for r in items:
            by_type[r["type"]] = by_type.get(r["type"], 0) + 1
        grand += len(items)
        print("\n=== CASES (NGN 150) ===")
        print(f"  cases: {len(cases)}  items: {len(items)}")
        print(f"  item by type: {json.dumps(by_type)}")
        if skips:
            print(f"  SKIPPED: {json.dumps(skips)} = {sum(skips.values())}")
        if fails:
            print(f"  MATCH WARNINGS ({len(fails)}):")
            for w in fails[:25]:
                print(f"     {w}")
        if DRY_RUN:
            sample_case = json.dumps(cases[0], ensure_ascii=False)[:500] if cases else "none"
            print(f"  sample case: {sample_case}")
            for t in ("matrix", "select-all", "bowtie", "dropdown-cloze", "ordered-response"):
                s = next((x for x in items if x["type"] == t), None)
                print(f"  sample {t}: {json.dumps(s, ensure_ascii=False)[:420] if s else 'none'}")
        else:
            cases_out, items_out = emit_cases(cases, items)
            print(f"  wrote {len(cases)} cases -> {cases_out}")
            print(f"  wrote {len(items)} case-items -> {items_out} (manifest.cases)")

    print(f"\nGRAND TOTAL kept across selected banks: {grand}")
    if DRY_RUN:
        print("(--dry-run: no files written)")


if __name__ == "__main__":
    main()
