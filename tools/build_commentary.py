"""Build the per-book commentary files the verse sheet's "Commentary" tab reads.

Source: public-domain commentaries from bible.helloao.org (Jamieson-Fausset-Brown, Matthew Henry),
as gzipped JSON lines with {book, chapter, start_verse, end_verse, text}.

Output: data/comm/<id>/NN.json  =  {"intro": html, "ch": {"3": [[start, end, html], ...]}}
  - row [0,0,...] in a chapter is that chapter's introduction (JFB also puts its notes on verse 1 there)
  - html is built here from escaped text: <p>, <h5> for ALL-CAPS headings, <b> for the JFB word
    being explained ("In the beginning--…"), and <a class="cref" data-r="John 3:16"> for references
    that point at a real verse.

Usage: python3 -I tools/build_commentary.py <source dir>
"""
import gzip, json, os, re, sys, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
WORKS = {"jfb": "jamieson-fausset-brown", "mh": "matthew-henry"}

CODES = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split()
BIBLE = json.load(open(f"{ROOT}/data/bible.json"))["books"]
NAMES = [b["name"] for b in BIBLE]
VCOUNT = [[len(c) for c in b["chapters"]] for b in BIBLE]

# Abbreviations as these two commentaries write them ("Co1 13:4", "Joh 3:16", "Psa 23:1") → book index.
AB = {}
def ab(i, *forms):
    for f in forms: AB[f] = i
for i, n in enumerate(NAMES): AB[n] = i
ab(0,"Gen"); ab(1,"Exo","Ex"); ab(2,"Lev"); ab(3,"Num"); ab(4,"Deu","Duet","Deut"); ab(5,"Jos","Josh"); ab(6,"Jdg","Judg")
ab(7,"Rut","Rth"); ab(8,"Sa1","1Sa","1 Sa","1 Sam"); ab(9,"Sa2","2Sa","2 Sa","2 Sam"); ab(10,"Kg1","1Ki","1 Kings","1 Ki")
ab(11,"Kg2","2Ki","2 Kings","2 Ki"); ab(12,"Ch1","1Ch","1 Chr"); ab(13,"Ch2","2Ch","2 Chr"); ab(14,"Ezr","Ezra"); ab(15,"Neh")
ab(16,"Est","Esth"); ab(17,"Job"); ab(18,"Psa","Ps"); ab(19,"Pro","Prov"); ab(20,"Ecc"); ab(21,"Sol","Son","Song"); ab(22,"Isa")
ab(23,"Jer"); ab(24,"Lam"); ab(25,"Eze","Ezek"); ab(26,"Dan"); ab(27,"Hos","Hosea"); ab(28,"Joe","Joel"); ab(29,"Amo","Amos")
ab(30,"Oba"); ab(31,"Jon"); ab(32,"Mic"); ab(33,"Nah"); ab(34,"Hab"); ab(35,"Zep"); ab(36,"Hag"); ab(37,"Zac","Zec")
ab(38,"Mal"); ab(39,"Mat","Mt"); ab(40,"Mar","Mark"); ab(41,"Luk","Luke","Lu"); ab(42,"Joh","John"); ab(43,"Act","Acts")
ab(44,"Rom"); ab(45,"Co1","1Co"); ab(46,"Co2","2Co"); ab(47,"Gal"); ab(48,"Eph"); ab(49,"Phi"); ab(50,"Col")
ab(51,"Th1","1Th"); ab(52,"Th2","2Th"); ab(53,"Ti1","1Ti"); ab(54,"Ti2","2Ti"); ab(55,"Tit"); ab(56,"Plm","Phm"); ab(57,"Heb")
ab(58,"Jam"); ab(59,"Pe1","1Pe"); ab(60,"Pe2","2Pe"); ab(61,"Jo1","1Jo"); ab(62,"Jo2","2Jo"); ab(63,"Jo3","3Jo"); ab(64,"Jde","Jud"); ab(65,"Rev")
BOOK_RE = "|".join(sorted((re.escape(k) for k in AB), key=len, reverse=True))
# Escaped text is matched, so the pattern works on html-escaped strings (no & < > in references).
REF = re.compile(rf"(?<![\w])({BOOK_RE})\.? (\d+):(\d+)(?:\s?[-–]\s?(\d+))?((?:;\s?\d+:\d+(?:\s?[-–]\s?\d+)?)*)")
TAIL = re.compile(r"(;\s?)(\d+):(\d+)(?:\s?[-–]\s?(\d+))?")
stats = {"links": 0, "bad": 0}

def ok(bi, c, v, v2):
    if not (1 <= c <= len(VCOUNT[bi])): return False
    n = VCOUNT[bi][c - 1]
    return 1 <= v <= n and (v2 is None or v < v2 <= n)

def link(bi, c, v, v2, label, full=True):
    v2 = int(v2) if v2 else None
    if not ok(bi, c, v, v2):
        stats["bad"] += 1; return label
    stats["links"] += 1
    r = f"{NAMES[bi]} {c}:{v}" + (f"-{v2}" if v2 else "")
    return f'<a class="cref" data-r="{r}">{r if full else label}</a>'

def refs(s):
    def one(m):
        bi = AB[m.group(1)]; c, v = int(m.group(2)), int(m.group(3))
        head_end = m.end(4) if m.group(4) else m.end(3)
        out = link(bi, c, v, m.group(4), m.group(0)[:head_end - m.start()])
        rest = m.group(5) or ""
        out += TAIL.sub(lambda t: t.group(1) + link(bi, int(t.group(2)), int(t.group(3)), t.group(4), t.group(0)[len(t.group(1)):], False), rest)
        return out
    return REF.sub(one, s)

CAPS = re.compile(r"^[^a-z]*[A-Z]{3}[^a-z]*$")
def to_html(text, work):
    out = []
    for line in re.split(r"\n", text):
        line = line.strip()
        if not line: continue
        if work == "jfb" and re.fullmatch(r"[1-3]? ?[A-Z][a-z]+(?: [A-Z][a-z]+)* \d+:\d+(?:-\d+)?", line):
            continue                                    # "Genesis 1:1" marker line — the sheet already says where you are
        e = html.escape(line, quote=False)
        if CAPS.match(re.sub(r"\(.*?\)", "", line)) and len(line) < 160:
            out.append(f"<h5>{refs(e)}</h5>"); continue
        if work == "jfb":
            m = re.match(r"(.{1,90}?)--", e)
            if m and "." not in m.group(1)[:-1]:
                e = f"<b>{m.group(1)}</b>—" + e[m.end():]
        e = e.replace("--", "—")
        out.append(f"<p>{refs(e)}</p>")
    return "".join(out)

for wid, fname in WORKS.items():
    books = {}
    for l in gzip.open(f"{SRC}/{fname}.en.jsonl.gz", "rt"):
        r = json.loads(l)
        if r["book"] not in CODES: continue
        bi = CODES.index(r["book"])
        b = books.setdefault(bi, {"intro": "", "ch": {}})
        h = to_html(r["text"], wid)
        if r["chapter"] == 0: b["intro"] += h; continue
        if r["chapter"] > len(VCOUNT[bi]): continue
        b["ch"].setdefault(str(r["chapter"]), []).append([r["start_verse"], r["end_verse"], h])
    os.makedirs(f"{ROOT}/data/comm/{wid}", exist_ok=True)
    tot = 0
    for bi, b in books.items():
        for rows in b["ch"].values(): rows.sort(key=lambda x: (x[0], x[1]))
        p = f"{ROOT}/data/comm/{wid}/{bi + 1:02d}.json"
        json.dump(b, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
        tot += os.path.getsize(p)
    missing = [NAMES[i] for i in range(66) if i not in books]
    print(wid, len(books), "books", round(tot / 1e6, 1), "MB", "missing:", missing)
print(stats)
