"""Build the extra English translations onto Selah's 31,102-verse grid (KJV/English versification).

Sources
  ebible  BibleNLP/ebible corpus: one verse per line, aligned to metadata/vref.txt ("original" versification);
          mapped to English numbering with metadata/eng.vrs (the Paratext mapping file). Psalm titles map to
          verse 0 and become the book's `headings`; "<range>" lines (verses the translation joins) are recorded
          in `joined` so the reader can say "included in verse N".
  sm      scrollmapper/bible_databases JSON (already English-style numbering). Psalm titles that a source runs
          into verse 1 are split off by matching the ASV title's length, as for the KJV.

Every result is checked chapter by chapter against the KJV: a chapter is flagged when its verses match the KJV's
neighbouring verse better than the same verse (a slipped alignment). Flagged chapters are printed; the build
refuses to write a translation with more than a handful.

Output: data/tr/<id>.json  {books:[{name, chapters, headings?, joined?}]}  (same shape as data/bible.json)
Usage:  python3 -I tools/build_translations.py <ebible repo dir> <scrollmapper json dir> [ids…]
"""
import json, os, re, sys, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EB, SM = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])

GRID = json.load(open(f"{ROOT}/data/bible.json"))["books"]
NAMES = [b["name"] for b in GRID]
CODES = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split()
CI = {c: i for i, c in enumerate(CODES)}
KJV = json.load(open(f"{ROOT}/data/kjv.json"))["books"]
ASV = GRID

# id: (source, file, )
WL = os.environ.get("WLDEH", "/tmp/claude-0/probe/wldeh/bibles")
# id: (source kind, path).  ebible = BibleNLP/ebible corpus file; sm = scrollmapper JSON; wl = wldeh/bible-api folder
SOURCES = {
  "bsb":      ("usfm", "bsb"),
  "lsv":      ("wl", "en-lsv"),
  "fbv":       ("ebible", "corpus/eng-engfbv.txt", "en-fbv"),
  "webbe":     ("ebible", "corpus/eng-engwebpb.txt", "en-webbe"),
  "wmb":       ("ebible", "corpus/eng-engwmb.txt", "en-wmb"),
  "geneva":   ("wl", "en-gnv"),
  "dra":      ("wl", "en-dra"),
  "jps":      ("wl", "en-ojps"),
  "brenton":  ("wl", "en-engbrent"),
  "lxxup":    ("wl", "en-US-lxxup"),
  "rv":       ("ebible", "old/eng-eng-rv.txt"),
  "ylt":      ("sm", "YLT.json"),
  "darby":    ("sm", "Darby.json"),
  "webster":  ("sm", "Webster.json"),
  "bbe":      ("sm", "BBE.json"),
  "oeb":      ("sm", "OEB.json", ("ebible", "corpus/eng-engoebus.txt")),
  "noyes":    ("sm", "Noyes.json"),
  "nheb":     ("sm", "NHEB.json"),
  "acv":      ("sm", "ACV.json"),
  "cpdv":     ("sm", "CPDV.json"),
  "rotherham":("sm", "Rotherham.json"),
  "anderson": ("sm", "Anderson.json"),
  "haweis":   ("sm", "Haweis.json"),
  "twenty":   ("sm", "Twenty.json"),
  "tyndale":  ("sm", "Tyndale.json", ("ebible", "corpus/eng-engtnt.txt")),
  "wycliffe": ("sm", "Wycliffe.json"),
  # used only to test the pipeline against Selah's own aligned texts
  "_kjv":     ("ebible", "old/eng-eng-kjv.txt"),
  "_asv":     ("ebible", "old/eng-eng-asv.txt"),
}

def empty_grid():
    return [{"name": b["name"], "chapters": [[""] * len(c) for c in b["chapters"]], "headings": {}, "joined": {}} for b in GRID]

# ---------- versification mapping (original → English) ----------
REF = re.compile(r"^([1-4A-Z][A-Z0-9]{2}) (\d+):(\d+)(?:-(\d+))?$")
def expand(s):
    m = REF.match(s.strip())
    if not m: return None
    b, c, v1 = m.group(1), int(m.group(2)), int(m.group(3))
    v2 = int(m.group(4)) if m.group(4) else v1
    return [(b, c, v) for v in range(v1, v2 + 1)]
SPLITS = {}                                         # English verse with no words of its own -> English verse holding them
def load_map():
    org2eng = {}
    for line in open(f"{EB}/metadata/eng.vrs", encoding="utf-8"):
        line = line.split("#")[0].strip() if not line.startswith("#!") else line[2:].strip()
        if "=" not in line: continue
        L, R = [x.strip().lstrip("&") for x in line.split("=", 1)]
        a, b = expand(L), expand(R)
        if not a or not b: continue
        if len(a) == len(b):
            for x, y in zip(a, b): org2eng[y] = x
        elif len(a) == 1:                         # several original verses → one English verse
            for y in b: org2eng[y] = a[0]
        else:                                     # one original verse → several English: put it on the first
            for i, y in enumerate(b): org2eng[y] = a[min(i, len(a) - 1)]
            for x in a[len(b):]: SPLITS[x] = a[len(b) - 1]
    return org2eng

# ---------- reading the sources as (book code, chapter, verse, text) in their own numbering ----------
def read_ebible(path, vref):
    lines = open(f"{EB}/{path}", encoding="utf-8").read().split("\n")
    for ref, text in zip(vref, lines):
        text = text.strip()
        if text: m = REF.match(ref); yield m.group(1), int(m.group(2)), int(m.group(3)), text
ROMAN = {"I ": "1 ", "II ": "2 ", "III ": "3 "}
SM_ALIAS = {"Psalm": "Psalms", "Song of Songs": "Song of Solomon", "Revelation of John": "Revelation", "Canticle of Canticles": "Song of Solomon"}
def read_sm(path):
    src = json.load(open(f"{SM}/{path}"))
    for sb in src["books"]:
        name = SM_ALIAS.get(sb["name"], sb["name"])
        for r, n in ROMAN.items():
            if name.startswith(r): name = n + name[len(r):]
        if name not in NAMES: continue
        code = CODES[NAMES.index(name)]
        for c in sb["chapters"]:
            for v in c["verses"]:
                t = re.sub(r"\s+", " ", v["text"]).strip()
                if t: yield code, c["chapter"], v["verse"], t

def flat(s): return re.sub(r"[^a-z0-9]", "", s.lower())
WL_NAMES = {flat(n): n for n in NAMES}
WL_NAMES.update({"kingsi": "1 Samuel", "kingsii": "2 Samuel", "kingsiii": "1 Kings", "kingsiv": "2 Kings", "chroniclesi": "1 Chronicles",
  "chroniclesii": "2 Chronicles", "esaias": "Isaiah", "jeremias": "Jeremiah", "jezekiel": "Ezekiel", "osee": "Hosea", "aggus": "Haggai",
  "aggaeus": "Haggai", "ambacum": "Habakkuk", "malachias": "Malachi", "michas": "Micah", "michaeas": "Micah", "naum": "Nahum", "obdias": "Obadiah",
  "sophonias": "Zephaniah", "zacharias": "Zechariah", "jonas": "Jonah", "thesongofsolomon": "Song of Solomon", "songofsongs": "Song of Solomon",
  "yochanan": "John", "1yochanan": "1 John", "2yochanan": "2 John", "3yochanan": "3 John", "jacob": "James", "judah": "Jude",
  "estherfreek": "Esther", "esthergreek": "Esther", "danielgreek": "Daniel", "psalm": "Psalms", "canticles": "Song of Solomon"})
def read_wl(folder):
    base = f"{WL}/{folder}/books"
    for bdir in sorted(os.listdir(base)):
        key = flat(bdir); name = WL_NAMES.get(key)
        ezraneh = key in ("ezra", "ezraandnehemiah") and len(os.listdir(f"{base}/{bdir}/chapters")) > 10
        if not name and not ezraneh: continue
        for fn in os.listdir(f"{base}/{bdir}/chapters"):
            if not fn.endswith(".json"): continue
            for v in json.load(open(f"{base}/{bdir}/chapters/{fn}"))["data"]:
                if not str(v["verse"]).isdigit() or not str(v["chapter"]).isdigit(): continue    # Greek Esther's lettered additions
                c, vv = int(v["chapter"]), int(v["verse"]); nm = name or "Ezra"
                if ezraneh and c > 10: nm, c = "Nehemiah", c - 10                                # LXX 2 Esdras 11–23 = Nehemiah 1–13
                t = re.sub(r"\s+", " ", v["text"]).strip()
                if t: yield CODES[NAMES.index(nm)], c, vv, t

HELLOAO = os.environ.get("HELLOAO", "/tmp/claude-0/probe/HelloAOLab_bible-api/bible")
def read_usfm(folder):
    """USFM (HelloAOLab/bible-api): footnotes \\f…\\f* and cross-references \\x…\\x* removed; \\d Psalm titles → verse 0."""
    for fn in sorted(os.listdir(f"{HELLOAO}/{folder}")):
        if not fn.endswith(".usfm"): continue
        src = open(f"{HELLOAO}/{folder}/{fn}", encoding="utf-8-sig").read()
        m = re.search(r"\\id (\w{3})", src)
        if not m or m.group(1) not in CI: continue
        code = m.group(1)
        src = re.sub(r"\\f .*?\\f\*", "", src, flags=re.S)
        src = re.sub(r"\\x .*?\\x\*", "", src, flags=re.S)
        src = re.sub(r"\\w ([^|\\]*?)(?:\|[^\\]*)?\\w\*", r"\1", src)
        # drop whole heading-type lines, turn Psalm titles into verse 0, then split on chapter/verse markers
        keep = []
        for line in src.split("\n"):
            mk = re.match(r"\s*\\(s\d?|r|mt\d?|h|toc\d|id|ide|ms\d?|mr|sp|cl|rem|is\d?|ip|imt\d?)\b", line)
            if mk: continue
            line = re.sub(r"^\s*\\d\b", r"\\v 0 ", line)
            keep.append(line)
        text = " ".join(keep)
        c = 0
        for part in re.split(r"(\\c \d+|\\v \d+[a-z]?(?:-\d+)?)", text):
            mc = re.match(r"\\c (\d+)", part); mv = re.match(r"\\v (\d+)", part)
            if mc: c = int(mc.group(1)); v = 1; continue          # some files start verse 1 without a marker
            if mv: v = int(mv.group(1)); continue
            if c and v is not None:
                t = re.sub(r"\\\+?[a-z]+\d?\*?", " ", part)
                t = re.sub(r"\s+", " ", t).strip()
                if t: yield code, c, v, t

def load_vul(name="vul"):
    """Vulgate (or Septuagint) numbering → original numbering (metadata/<name>.vrs lines read  X = ORG)."""
    v2o = {}
    for line in open(f"{EB}/metadata/{name}.vrs", encoding="utf-8"):
        line = line.split("#")[0].strip()
        if "=" not in line: continue
        L, R = [x.strip().lstrip("&") for x in line.split("=", 1)]
        a, b = expand(L), expand(R)
        if not a or not b: continue
        if len(a) == len(b):
            for x, y in zip(a, b): v2o.setdefault(x, y)
        elif len(a) == 1: v2o.setdefault(a[0], b[0])
        else:
            for i, x in enumerate(a): v2o.setdefault(x, b[min(i, len(b) - 1)])
    return v2o

# ---------- placing verses on the English grid ----------
FIXES = [   # footnotes run into the text of a few verses filled from wldeh (WEB family)
  (re.compile(r"cors\d+:\d+ 1 cor is the same as a homer, or about 55\.9 U\. S\. gallons \(liquid\) or 211 lit(?:er|re)s or 6 bushels"), "cors"),
  (re.compile(r"Amen\.\d+:\d+ TR places verses 24-26 after Romans 16:24 as verses 25-27\."), "Amen."),
  (re.compile(r"Behold,\d+:\d+ “Behold”, from “הִנֵּה”, means look at, take notice, observe, see, or gaze at\. It is often used as an interjection\. "), "Behold, "),
]
def clean(t):
    for rx, rep in FIXES: t = rx.sub(rep, t)
    m = re.fullmatch(r"(.{30,}?)(?:\s+\1)+", t.strip())                 # the same verse repeated by a source
    if m: t = m.group(1)
    t = re.sub(r"\s*\(\d{1,3}[-:]\d{1,3}\)\s*", " ", t)        # "(32-2)" Hebrew verse numbers kept by some sources
    t = t.replace(" || ", " ").replace("||", " ").replace("[]", "")
    return re.sub(r"\s+", " ", t).strip()
def place(records, mapfn, splits=False):
    out = empty_grid(); stat = collections.Counter(); last = {}
    for b, c, v, text in records:
        if text != "<range>": text = clean(text)
        if not text or re.match(r"^\d+:\d+ ", text): continue           # empty, or a footnote standing alone
        if b == "ROM" and c == 14 and v >= 24: c, v = 16, v + 1         # doxology printed at Romans 14:24-26
        if b not in CI: stat["non-canon"] += 1; continue
        eb, ec, ev = mapfn((b, c, v))
        if eb not in CI: stat["mapped-out"] += 1; continue
        bi = CI[eb]; book = out[bi]; chs = book["chapters"]
        if text == "<range>":
            if bi in last and 1 <= ec <= len(chs) and 1 <= ev <= len(chs[ec - 1]) and not chs[ec - 1][ev - 1]:
                book["joined"][f"{ec}:{ev}"] = f"{last[bi][0]}:{last[bi][1]}"; stat["joined"] += 1
            continue
        if ev == 0:
            book["headings"][f"{ec}:1"] = (book["headings"].get(f"{ec}:1", "") + " " + text).strip(); stat["titles"] += 1; continue
        if 1 <= ec <= len(chs) and 1 <= ev <= len(chs[ec - 1]):
            cur = chs[ec - 1][ev - 1]
            if cur == text or (cur and text in cur): continue            # the same verse given twice by a source
            chs[ec - 1][ev - 1] = (cur + " " + text).strip() if cur else text
            if cur: stat["merged"] += 1
            last[bi] = (ec, ev)
        elif bi in last:                           # beyond the English grid: keep the words on the verse before
            lc, lv = last[bi]; chs[lc - 1][lv - 1] += " " + text; stat["appended"] += 1
        else: stat["lost"] += 1
    if splits:
        for (eb, ec, ev), (hb, hc, hv) in SPLITS.items():
            if eb not in CI: continue
            book = out[CI[eb]]; chs = book["chapters"]
            if 1 <= ec <= len(chs) and 1 <= ev <= len(chs[ec - 1]) and not chs[ec - 1][ev - 1] and chs[hc - 1][hv - 1]:
                book["joined"][f"{ec}:{ev}"] = f"{hc}:{hv}"; stat["split"] += 1
    return out, stat

def ch_score(ch, bi, ci):
    k = KJV[bi]["chapters"][ci]
    return sum(x for x in (sim(t, k[i]) if t else None for i, t in enumerate(ch)) if x is not None)
def ch_flag(ch, bi, ci):
    k = KJV[bi]["chapters"][ci]; n = len(ch)
    d = [x for x in (sim(ch[i], k[i]) for i in range(n)) if x is not None]
    if n < 4 or len(d) < 4: return False
    nx = [x for x in (sim(ch[i], k[i + 1]) for i in range(n - 1)) if x is not None]
    pv = [x for x in (sim(ch[i], k[i - 1]) for i in range(1, n)) if x is not None]
    D = sum(d) / len(d); N = sum(nx) / max(1, len(nx)); P = sum(pv) / max(1, len(pv))
    if max(N, P) > D * 1.15 and max(N, P) > 0.25: return True
    # a short run of verses one place off (e.g. the first verses of a chapter)
    g = lambda i, j: (sim(ch[i], k[j]) or 0) if 0 <= j < n and ch[i] else 0
    for s0 in range(0, n - 3):
        w = range(s0, s0 + 4)
        diag = sum(g(i, i) for i in w); off = max(sum(g(i, i + 1) for i in w), sum(g(i, i - 1) for i in w))
        if off > 1.6 and off > diag * 2: return True
    return False
def copy_ch(dst, src, ci):
    dst["chapters"][ci] = list(src["chapters"][ci])
    for key in ("headings", "joined"):
        for k in [k for k in dst[key] if k.split(":")[0] == str(ci + 1)]: del dst[key][k]
        for k, v in src[key].items():
            if k.split(":")[0] == str(ci + 1): dst[key][k] = v
def dp_repair(book, bi, window):
    """Re-seat the verses of a few chapters on the grid in order, maximising agreement with the KJV.
    Verses keep their order and none is dropped; grid slots may stay empty."""
    items = [book["chapters"][ci][vi] for ci in window for vi in range(len(book["chapters"][ci])) if book["chapters"][ci][vi]]
    slots = [(ci, vi) for ci in window for vi in range(len(book["chapters"][ci]))]
    n, m = len(items), len(slots)
    if n == 0: return False
    S = [[(sim(items[i], KJV[bi]["chapters"][slots[j][0]][slots[j][1]]) or 0) for j in range(m)] for i in range(n)]
    NEG = -1e9
    # f[i][j]: best for the first i verses on the first j slots, verse i-1 sitting in slot j-1 (or earlier)
    f = [[NEG] * (m + 1) for _ in range(n + 1)]; how = [[0] * (m + 1) for _ in range(n + 1)]
    for j in range(m + 1): f[0][j] = 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            opts = [(f[i][j - 1], 1), (f[i - 1][j - 1] + S[i - 1][j - 1], 2)]
            if i > 1: opts.append((f[i - 1][j] + S[i - 1][j - 1] * 0.8 - 0.05, 3))   # join with the verse before
            f[i][j], how[i][j] = max(opts)
    old = sum(ch_score(book["chapters"][ci], bi, ci) for ci in window)
    if f[n][m] <= old * 1.05: return False
    place_at = [None] * n; i, j = n, m
    while i > 0:
        h = how[i][j]
        if h == 1: j -= 1
        elif h == 2: place_at[i - 1] = slots[j - 1]; i -= 1; j -= 1
        else: place_at[i - 1] = slots[j - 1]; i -= 1
    new = {ci: [""] * len(book["chapters"][ci]) for ci in window}
    for t, (ci, vi) in zip(items, place_at): new[ci][vi] = (new[ci][vi] + " " + t).strip()
    if any(ch_flag(new[ci], bi, ci) for ci in window): return False
    for ci in window:
        book["chapters"][ci] = new[ci]
        for k in [k for k in book["joined"] if int(k.split(":")[0]) == ci + 1]: del book["joined"][k]
        # a slot left empty because its words were joined to the verse before
        lastv = None
        for vi, t in enumerate(new[ci]):
            if t: lastv = vi
            elif lastv is not None: book["joined"][f"{ci+1}:{vi+1}"] = f"{ci+1}:{lastv+1}"
    return True

def best_of(cands):
    """cands: [(grid, stat)] built under different numberings. Keep the best per book, then repair slipped chapters
    by taking that chapter and the one before it from another candidate when that fits the KJV better."""
    out = []; stat = cands[0][1]; picks = collections.Counter(); repaired = 0
    for bi in range(len(GRID)):
        scores = [sum(ch_score(ch, bi, ci) for ci, ch in enumerate(g[bi]["chapters"])) for g, _ in cands]
        k = max(range(len(cands)), key=lambda i: (scores[i], -i)); picks[k] += 1
        book = json.loads(json.dumps(cands[k][0][bi]))
        for ci in range(len(book["chapters"])):
            if not ch_flag(book["chapters"][ci], bi, ci): continue
            done = False
            for alt, _ in cands:
                ab = alt[bi]
                for pair in ([ci - 1, ci], [ci, ci + 1], [ci - 1, ci, ci + 1]):
                    pair = [x for x in pair if 0 <= x < len(book["chapters"])]
                    old = sum(ch_score(book["chapters"][x], bi, x) for x in pair)
                    new = sum(ch_score(ab["chapters"][x], bi, x) for x in pair)
                    if new > old * 1.05 and not any(ch_flag(ab["chapters"][x], bi, x) for x in pair):
                        for x in pair: copy_ch(book, ab, x)
                        repaired += 1; done = True; break
                if done: break
            if not done and ch_flag(book["chapters"][ci], bi, ci):
                for window in ([ci - 1, ci], [ci, ci + 1], [ci - 1, ci, ci + 1]):
                    window = [x for x in window if 0 <= x < len(book["chapters"])]
                    if dp_repair(book, bi, window): repaired += 1; break
        out.append(book)
    stat["book-picks"] = dict(picks); stat["repaired"] = repaired
    return out, stat

norm = lambda s: re.sub(r"[^a-z]", "", s.lower())
def split_titles(out, stat):
    """Sources that run a Psalm's title into verse 1: split it off at the sentence break nearest the ASV title's length."""
    ps = out[NAMES.index("Psalms")]; ah = ASV[NAMES.index("Psalms")].get("headings", {})
    for ci, ch in enumerate(ps["chapters"]):
        key = f"{ci+1}:1"; t = ch[0]
        if key in ps["headings"] or key not in ah or not t or re.match(r"^[֐-׿]", ah[key]): continue
        target = len(norm(ah[key]))
        if len(norm(t)) < target + 15: continue    # verse 1 has no room for a title: the source left it out
        cands = [m.end() for m in re.finditer(r"[.:;]\s+", t)]
        if not cands: continue
        best = min(cands, key=lambda i: abs(len(norm(t[:i])) - target))
        if abs(len(norm(t[:best])) - target) <= max(14, target * 0.45):
            ps["headings"][key] = t[:best].strip(); ch[0] = t[best:].strip(); stat["titles"] += 1

# ---------- validation against the KJV ----------
STOP = set("the and of to in that he his for unto shall is be with not they him them i a it was all which my me thou thy thee ye you your their this are from but by have as were on we she her our said there when then upon will so who also what out up at an or".split())
def toks(s): return {w[:5] for w in re.findall(r"[a-z]+", s.lower()) if w not in STOP and len(w) > 2}
def sim(a, b):
    A, B = toks(a), toks(b)
    return len(A & B) / max(1, min(len(A), len(B))) if A and B else None
def validate(out):
    flagged = []; tot = []; covered = 0; total = 0
    for bi, book in enumerate(out):
        for ci, ch in enumerate(book["chapters"]):
            k = KJV[bi]["chapters"][ci]; n = len(ch); total += n
            covered += sum(1 for t in ch if t)
            d = [sim(ch[i], k[i]) for i in range(n)]
            nx = [sim(ch[i], k[i + 1]) for i in range(n - 1)]
            pv = [sim(ch[i], k[i - 1]) for i in range(1, n)]
            dv = [x for x in d if x is not None]
            if dv: tot += dv
            if n < 4 or len(dv) < 4: continue
            D = sum(dv) / len(dv)
            N = sum(x for x in nx if x is not None) / max(1, len([x for x in nx if x is not None]))
            P = sum(x for x in pv if x is not None) / max(1, len([x for x in pv if x is not None]))
            if max(N, P) > D * 1.15 and max(N, P) > 0.25: flagged.append((NAMES[bi], ci + 1, round(D, 2), round(max(N, P), 2)))
    return flagged, (sum(tot) / len(tot) if tot else 0), covered / total

vref = open(f"{EB}/metadata/vref.txt").read().split("\n")
M = load_map(); V = load_vul("vul"); LX = load_vul("lxx")
os.makedirs(f"{ROOT}/data/tr", exist_ok=True)
report = {}
FOOT = re.compile(r"[A-Za-z,;.!?”’)\]]\d{1,3}:\d{1,3} ")
def build(kind, path):
    recs = list(read_ebible(path, vref) if kind == "ebible" else read_sm(path) if kind == "sm" else read_usfm(path) if kind == "usfm" else read_wl(path))
    chain = lambda T: (lambda r: M.get(T.get(r, r), T.get(r, r)))
    return best_of([place(recs, lambda r: r), place(recs, lambda r: M.get(r, r), True),
                    place(recs, chain(V), True), place(recs, chain(LX), True)])
for tid, spec in SOURCES.items():
    kind, path = spec[0], spec[1]
    if ONLY and tid not in ONLY: continue
    out, stat = build(kind, path)
    if len(spec) > 2:
        # Fill verses the base source lost from a complete copy (whose footnotes are run into the text).
        base_books = json.loads(json.dumps(out))
        fk, fp = spec[2] if isinstance(spec[2], tuple) else ("wl", spec[2])
        fill, _ = build(fk, fp); stat["filled"] = 0; feet = []
        for bi, book in enumerate(out):
            for ci, ch in enumerate(book["chapters"]):
                for vi, t in enumerate(ch):
                    f = fill[bi]["chapters"][ci][vi]
                    if not t and f and not book["joined"].get(f"{ci+1}:{vi+1}"):
                        ch[vi] = f; stat["filled"] += 1
                        if FOOT.search(f): feet.append((f"{NAMES[bi]} {ci+1}:{vi+1}", f))
            for k, v in fill[bi]["headings"].items():
                if k not in book["headings"] and not FOOT.search(v): book["headings"][k] = v
        stat["filled-with-footnote"] = len(feet)
        # A book taken wholly from the fill source must be complete, or it's left out (the reader falls back with a note).
        for bi, book in enumerate(out):
            if any(t for ch in base_books[bi]["chapters"] for t in ch): continue
            have = sum(1 for ch in book["chapters"] for t in ch if t) + len(book["joined"])
            need = sum(1 for ch in KJV[bi]["chapters"] for t in ch if t)
            if 0 < have < need * 0.995:
                book["chapters"] = [[""] * len(c) for c in book["chapters"]]; book["joined"] = {}; book["headings"] = {}
                stat["fill-books-dropped"] = stat.get("fill-books-dropped", 0) + 1
        for r, f in feet: print("   FOOTNOTE?", r, "|", f[:220])
    if tid == "webbe":
        # Psalm titles (\\d) from the WEB British Edition USFX in seven1m/open-bibles
        ux = open(os.environ.get("OPENBIBLES", "/tmp/claude-0/probe/seven1m_open-bibles") + "/eng-gb-webbe.usfx.xml", encoding="utf-8").read()
        i = ux.find('<book id="PSA"'); ps = ux[i:ux.find("</book>", i)]
        for m in re.finditer(r'<c id="(\d+)"\s*/>\s*<d>(.*?)</d>', ps, re.S):
            t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(2))).strip()
            if t: out[NAMES.index("Psalms")]["headings"][f"{m.group(1)}:1"] = t
    split_titles(out, stat)
    # Empty verses whose words a neighbour plainly carries (the source joined two verses): say so.
    stat["joined-by-length"] = 0
    for bi, book in enumerate(out):
        for ci, ch in enumerate(book["chapters"]):
            if not any(ch): continue
            k = KJV[bi]["chapters"][ci]
            for vi, t in enumerate(ch):
                key = f"{ci+1}:{vi+1}"
                if t or not k[vi] or book["joined"].get(key): continue
                for nb in (vi - 1, vi + 1):
                    if 0 <= nb < len(ch) and ch[nb] and k[nb] and len(ch[nb]) > 1.6 * len(k[nb]) and len(ch[nb]) > 0.7 * (len(k[nb]) + len(k[vi])):
                        book["joined"][key] = f"{ci+1}:{nb+1}"; stat["joined-by-length"] += 1; break
    flagged, avg, cov = validate(out)
    # verses the KJV has but this build doesn't, in books the translation covers at all
    missing = []
    for bi, book in enumerate(out):
        if not any(t for ch in book["chapters"] for t in ch): continue
        for ci, ch in enumerate(book["chapters"]):
            for vi, t in enumerate(ch):
                if not t and not book["joined"].get(f"{ci+1}:{vi+1}") and KJV[bi]["chapters"][ci][vi]: missing.append(f"{NAMES[bi]} {ci+1}:{vi+1}")
    stat["missing"] = len(missing)
    report[tid] = {"coverage": round(cov, 4), "avg_sim": round(avg, 3), "flagged": len(flagged), "stat": dict(stat)}
    print(f"{tid:10s} coverage {cov:6.1%}  sim {avg:.2f}  flagged {len(flagged):3d}  {dict(stat)}")
    for f in flagged[:8]: print("            ", f)
    if missing: print("             missing e.g.", missing[:10])
    if tid.startswith("_"):
        json.dump({"books": out}, open(f"/tmp/claude-0/probe/{tid}.json", "w"), ensure_ascii=False); continue
    for b in out:
        if not b["headings"]: del b["headings"]
        if not b["joined"]: del b["joined"]
    if len(flagged) > 12:
        print("            NOT WRITTEN — too many slipped chapters"); continue
    json.dump({"books": out}, open(f"{ROOT}/data/tr/{tid}.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(report, open("/tmp/claude-0/probe/report.json", "w"), indent=1)
