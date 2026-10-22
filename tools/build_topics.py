"""Build data/topics.json (Nave's Topical Bible) and data/lexindex.json (a small index of every Hebrew/Greek word).

topics.json: {"t": [[name, [[depth, label, refs, see?], ...]], ...]}
  name   topic as Nave prints it (upper case), e.g. "FAITH"
  depth  0 = entry, 1 = sub-entry
  refs   flat list of verse ids (index into the app's 31,102-verse grid); a range is a 2-item list [first, last]
  see    name of another topic this line points to ("See FAITH IN CHRIST")
lexindex.json: [[strong, lemma, translit, gloss, uses], ...] from data/lex/*.json

Source: Nave's Topical Bible via BibleData (Brady Stephenson, CC BY 4.0), NavesTopicalDictionary.csv.
Usage: python3 -I tools/build_topics.py <path to NavesTopicalDictionary.csv>
"""
import csv, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIBLE = json.load(open(f"{ROOT}/data/bible.json"))["books"]
VC = [[len(c) for c in b["chapters"]] for b in BIBLE]
START = []                      # START[b][c] = verse id of b c:1
n = 0
for b in VC:
    row = []
    for c in b: row.append(n); n += c
    START.append(row)
TOTAL = n

CODES = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split()
CODE = {c: i for i, c in enumerate(CODES)}
CODE.update({"1JHN": 61, "Jude": 64, "JUDE": 64, "So": 21, "SOS": 21, "SON": 21, "EZE": 25, "JOE": 28, "NAH": 33, "MAR": 40, "PHI": 49, "JAM": 58})
BOOKPAT = "|".join(sorted(map(re.escape, CODE), key=len, reverse=True))
FIRST = re.compile(rf"(?<![A-Za-z0-9])({BOOKPAT}) (?=\d)")
SEG = re.compile(r"^\s*(?:(" + BOOKPAT + r") )?(\d+)(?::(\d+)(?:-(\d+)(?::(\d+))?)?)?((?:\s?,\s?\d+(?:-\d+)?)*)\s*$")
bad = {"seg": 0, "ref": 0}

def vid(b, c, v):
    if not (1 <= c <= len(VC[b])) or not (1 <= v <= VC[b][c - 1]): return None
    return START[b][c - 1] + v - 1

def parse_refs(s):
    out, book = [], None
    s = re.sub(rf"\.\s+(?=(?:{BOOKPAT}) \d)", "; ", s)          # "PSA 2:7. HEB 1:5"
    for seg in s.split(";"):
        seg = seg.strip().rstrip(".")
        seg = re.sub(r"(?i)^(?:compare\s+)?(?:with|and|cf\.?)\s+", "", seg)   # "with 1SA 2:31"
        seg = re.sub(rf"^So (?=(?:{BOOKPAT}) \d)", "", seg)
        if not seg: continue
        m = SEG.match(seg)
        if not m: bad["seg"] += 1; continue
        if m.group(1): book = CODE[m.group(1)]
        if book is None: bad["seg"] += 1; continue
        c = int(m.group(2))
        if not m.group(3):                                   # whole chapter
            if 1 <= c <= len(VC[book]): out.append([START[book][c - 1], START[book][c - 1] + VC[book][c - 1] - 1])
            else: bad["ref"] += 1
            continue
        v = int(m.group(3))
        if m.group(5):                                       # 1:1-2:3
            a, z = vid(book, c, v), vid(book, int(m.group(4)), int(m.group(5)))
        else:
            a = vid(book, c, v); z = vid(book, c, int(m.group(4))) if m.group(4) else None
        if a is None: bad["ref"] += 1; continue
        out.append([a, z] if z is not None and z > a else a)
        for extra in re.findall(r"(\d+)(?:-(\d+))?", m.group(6) or ""):
            a = vid(book, c, int(extra[0])); z = vid(book, c, int(extra[1])) if extra[1] else None
            if a is None: bad["ref"] += 1; continue
            out.append([a, z] if z is not None and z > a else a)
    return out

rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8-sig")))
names = {r["subject"].strip().upper(): r["subject"].strip() for r in rows}
topics = []
for r in rows:
    name = r["subject"].strip()
    lines = []
    for raw in r["entry"].split("\n"):
        if not raw.strip(): continue
        depth = 1 if re.match(r"^\s{2,}", raw) else 0
        t = raw.strip().lstrip("-").strip()
        t = re.sub(r"\[\d+\]", "", t)                        # Nave's internal topic numbers
        see = None
        m = re.match(r"(?i)^see (?:also )?(.+)$", t)
        if m:
            target = m.group(1).strip().rstrip(".").upper()
            if target in names: see = names[target]
        fm = FIRST.search(t)
        label, refs = (t[:fm.start()].strip(), parse_refs(t[fm.start():])) if fm else (t, [])
        label = label.rstrip(",;: ")
        if not label and not refs: continue
        line = [depth, label, refs]
        if see: line.append(see)
        lines.append(line)
    if lines: topics.append([name, lines])
json.dump({"t": topics}, open(f"{ROOT}/data/topics.json", "w"), ensure_ascii=False, separators=(",", ":"))
nrefs = sum(len(l[2]) for t in topics for l in t[1])
print(len(topics), "topics", nrefs, "refs", round(os.path.getsize(f"{ROOT}/data/topics.json") / 1e6, 2), "MB", bad)

# Hebrew / Greek word index for "search by Strong's number, word or meaning"
idx = []
for f in sorted(os.listdir(f"{ROOT}/data/lex")):
    if not f.endswith(".json"): continue
    for s, e in json.load(open(f"{ROOT}/data/lex/{f}")).items():
        if not e.get("n"): continue
        idx.append([s, e.get("l", ""), e.get("t", ""), re.sub(r"^:\s*", "", e.get("g", "")), e["n"]])
json.dump(idx, open(f"{ROOT}/data/lexindex.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(idx), "words", round(os.path.getsize(f"{ROOT}/data/lexindex.json") / 1e6, 2), "MB")
