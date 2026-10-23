"""Red letters: where Jesus is speaking, for every translation.
Source: World English Bible British Edition USFX (public domain), which marks the words of Jesus with <wj>.
Those spans are carried onto each translation's own wording by aligning the verse word by word (difflib),
then snapped to the nearest punctuation, so a span starts at an opening quote / after "said," and ends at
the end of the sentence. Verses where the alignment is too weak to trust are left in black.
Writes data/red/<translation>.json = {"Book C:V": [[start, end], ...]}  (character offsets into that
translation's verse text).
Usage: python3 tools/build_redletter.py path/to/eng-gb-webbe.usfx.xml"""
import sys, os, re, json, difflib, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODES = {"MAT": "Matthew", "MRK": "Mark", "LUK": "Luke", "JHN": "John", "ACT": "Acts", "1CO": "1 Corinthians",
         "2CO": "2 Corinthians", "1TI": "1 Timothy", "REV": "Revelation"}
SKIP = {"f", "x", "s", "h", "toc", "id", "ide", "d", "cl", "cp", "ms", "mt"}

def parse_usfx(path):
    s = open(path, encoding="utf-8").read()
    out = {}                       # ref -> (text, [[s,e],...])
    for m in re.finditer(r'<book id="(\w+)"', s):
        if m.group(1) not in CODES: continue
        name = CODES[m.group(1)]
        body = s[m.end(): s.find("</book>", m.end())]
        ch = 0; ref = None; buf = []; spans = []; wj = False; skip = 0; start = None
        def close():
            nonlocal start
            if ref is None: return
            if wj and start is not None: spans.append([start, len("".join(buf))])
            text = "".join(buf)
            # trim and normalise whitespace, keeping span offsets right
            out[ref] = (text, spans[:])
        for tok in re.finditer(r"<(/?)(\w+)([^>]*?)(/?)>|([^<]+)", body):
            if tok.group(5) is not None:
                if not skip and ref:
                    buf.append(re.sub(r"\s+", " ", tok.group(5)))
                continue
            closing, tag, attrs, selfc = tok.group(1), tok.group(2), tok.group(3), tok.group(4)
            if tag in SKIP and not selfc:
                skip += -1 if closing else 1; continue
            if tag == "c" and not closing:
                ch = int(re.search(r'id="(\d+)"', attrs).group(1))
            elif tag == "v" and not closing:
                close()
                v = int(re.search(r'id="(\d+)"', attrs).group(1))
                ref = f"{name} {ch}:{v}"; buf = []; spans = []; start = 0 if wj else None
            elif tag == "ve":
                close(); ref = None
            elif tag == "wj":
                if closing:
                    if wj and start is not None and ref: spans.append([start, len("".join(buf))])
                    wj = False; start = None
                else:
                    wj = True; start = len("".join(buf)) if ref else None
        close()
    # tidy: strip leading space, merge touching spans
    res = {}
    for ref, (t, sp) in out.items():
        lead = len(t) - len(t.lstrip())
        t2 = t.strip()
        sp = [[max(0, a - lead), min(len(t2), b - lead)] for a, b in sp if b - lead > 0 and b > a]
        merged = []
        for a, b in sp:
            if merged and a - merged[-1][1] <= 1: merged[-1][1] = b
            else: merged.append([a, b])
        if merged and any(t2[a:b].strip(" “”‘’\"'") for a, b in merged): res[ref] = (t2, merged)
    return res

WORD = re.compile(r"[A-Za-z0-9À-ɏ]+(?:[’'][A-Za-z]+)?")
BRIT = {"baptised": "baptized", "honour": "honor", "neighbour": "neighbor", "saviour": "savior", "labour": "labor",
        "favour": "favor", "colour": "color", "behaviour": "behavior", "realise": "realize", "recognise": "recognize"}
def norm(w):
    w = unicodedata.normalize("NFKD", w.lower()).encode("ascii", "ignore").decode()
    return BRIT.get(w, w)
def words(t): return [(m.start(), m.end(), norm(m.group())) for m in WORD.finditer(t)]

SPEECH = {"said", "saying", "saith", "says", "say", "answered", "answering", "replied", "spake", "spoke", "cried", "crying"}
OPEN_Q = "“‘\"'"
END_PUNCT = ".,;:?!”’\"')—"
def snap_start(t, i):
    """Move a start back over an opening quote, and forward past 'said,'-style intros already handled."""
    while i > 0 and t[i - 1] in OPEN_Q: i -= 1
    return i
def snap_end(t, j):
    while j < len(t) and t[j] in END_PUNCT: j += 1
    return j

INTRO = re.compile(r"\b(said|saith|says|saying|answered|answering|replied|spake|spoke|cried|crying|commanded|told \w+)\b[^,:;.?!“”\"]{0,60}[,:]\s*", re.I)
def quote_segments(tgt):
    segs = []; depth = 0; st = None
    for m in re.finditer(r"[“”\"]", tgt):
        ch = m.group()
        if ch == "“" or (ch == '"' and depth == 0):
            if depth == 0: st = m.start()
            depth += 1
        else:
            if depth == 0: segs.append([0, m.end()])
            else:
                depth -= 1
                if depth == 0: segs.append([st, m.end()])
    if depth > 0: segs.append([st, len(tgt)])
    return segs

def tail_speech(src, spans, tgt):
    """Fallback for 'Jesus answered and said unto him, …' verses: one speech that runs from an
    introduction to the end of the verse, in both texts."""
    if len(spans) != 1: return None
    a, b = spans[0]
    if not src[:a].strip(" “‘\"'") or src[b:].strip(" ”’\"'.,;:?!"): return None
    if not INTRO.search(src[:a + 1]): return None
    if re.search(r"[“”\"]", tgt):                     # quoted: the quotes are the speech (one speaker in this verse)
        return quote_segments(tgt) or None
    m = INTRO.search(tgt)
    if not m or m.end() > 0.65 * len(tgt) or m.end() >= len(tgt): return None
    return [[m.end(), len(tgt)]]

def map_verse(src, spans, tgt):
    sw, tw = words(src), words(tgt)
    if not sw or not tw: return None
    covered = sum(min(b, e) - max(a, s) for a, b in spans for s, e, _ in sw if min(b, e) > max(a, s))
    total = sum(e - s for s, e, _ in sw)
    # Jesus speaks (nearly) the whole verse: the whole target verse is red.
    if covered >= 0.94 * total:
        # …unless the translation adds its own "Jesus told him" around quotation marks: then only the quotes.
        segs = quote_segments(tgt)
        if segs and sum(b - a for a, b in segs) < 0.9 * len(tgt.strip()): return segs
        return [[0, len(tgt)]]
    sm = difflib.SequenceMatcher(None, [w for *_, w in sw], [w for *_, w in tw], autojunk=False)
    blocks = [b for b in sm.get_matching_blocks() if b.size]
    matched = sum(b.size for b in blocks)
    if matched < 0.45 * min(len(sw), len(tw)): return tail_speech(src, spans, tgt)   # too different to align word by word
    amap = {}
    for b in blocks:
        for k in range(b.size): amap[b.a + k] = b.b + k
    def to_t(i, side):
        if i in amap: return amap[i], 0
        prev = max((k for k in amap if k < i), default=None); nxt = min((k for k in amap if k > i), default=None)
        if prev is None and nxt is None: return None, 99
        if prev is None: return max(0, amap[nxt] - (nxt - i)), nxt - i
        if nxt is None: return min(len(tw) - 1, amap[prev] + (i - prev)), i - prev
        # between two anchors: interpolate
        f = (i - prev) / (nxt - prev)
        return round(amap[prev] + f * (amap[nxt] - amap[prev])), min(i - prev, nxt - i)
    def edges(snap):
        out = []
        for a, b in spans:
            si = next((k for k, (s0, e0, _) in enumerate(sw) if e0 > a), None)
            ei = max((k for k, (s0, e0, _) in enumerate(sw) if s0 < b), default=None)
            if si is None or ei is None or ei < si: continue
            ts, ds = to_t(si, 0); te, de = to_t(ei, 1)
            if ts is None or te is None or ds > 2 or de > 2 or te < ts: return None
            at_start = not src[:a].strip(" “‘\"'"); at_end = not src[b:].strip(" ”’\"'.,;:?!")
            if snap and not at_start and not starts_clause(ts):
                near = [k for k in range(max(0, ts - 3), min(len(tw), ts + 4)) if starts_clause(k)]
                if not near: return None
                ts = min(near, key=lambda k: abs(k - ts))
            if snap and not at_end and not ends_clause(te):
                near = [k for k in range(max(0, te - 3), min(len(tw), te + 4)) if ends_clause(k) and k >= ts]
                if not near: return None
                te = min(near, key=lambda k: abs(k - te))
            # Never start on the speech verb itself ("saying, …", "said to him, …"): skip to the next clause.
            if snap and not at_start and tw[ts][2] in SPEECH:
                nxt = next((k for k in range(ts + 1, min(te + 1, ts + 6)) if starts_clause(k)), None)
                if nxt is not None: ts = nxt
            start = 0 if at_start else snap_start(tgt, tw[ts][0])
            end = len(tgt) if at_end else snap_end(tgt, tw[te][1])
            out.append([start, end])
        return out or None
    def starts_clause(k): return k == 0 or re.search(r"[,:;.?!—]\s*[“‘\"']?\s*$", tgt[:tw[k][0]])
    def ends_clause(k): return k == len(tw) - 1 or re.match(r"^[”’\"']?[,:;.?!—]", tgt[tw[k][1]:])
    # Same wording as the WEB (the WEB family): carry the edges straight across.
    if matched >= 0.9 * max(len(sw), len(tw)): return edges(False)
    inv = {tb: sa for sa, tb in amap.items()}
    def src_in_red(k):
        s0, e0, _ = sw[k]; return any(a <= s0 and e0 <= b + 1 for a, b in spans)
    def t_word_red(k):
        """Is target word k inside Jesus' words? Use its aligned source word, else the nearest aligned ones."""
        if k in inv: return src_in_red(inv[k])
        prev = max((x for x in inv if x < k), default=None); nxt = min((x for x in inv if x > k), default=None)
        votes = [src_in_red(inv[x]) for x in (prev, nxt) if x is not None]
        return votes and all(votes)
    # Translations with quotation marks: colour the quoted parts that Jesus speaks.
    if re.search(r"[“”\"]", tgt):
        segs = []; depth = 0; st = None
        for m in re.finditer(r"[“”\"]", tgt):
            ch = m.group()
            if ch == "“" or (ch == '"' and depth == 0):
                if depth == 0: st = m.start()
                depth += 1
            else:
                if depth == 0: segs.append([0, m.end()])            # quote opened in an earlier verse
                else:
                    depth -= 1
                    if depth == 0: segs.append([st, m.end()])
        if depth > 0: segs.append([st, len(tgt)])                # carries on into the next verse
        if not segs: return None
        out = []
        for a, b in segs:
            ks = [k for k, (s0, e0, _) in enumerate(tw) if s0 >= a and e0 <= b]
            if not ks: continue
            red = sum(1 for k in ks if t_word_red(k))
            if red >= 0.6 * len(ks): out.append([a, b])
        return out or None
    # No quotation marks (KJV, ASV, BBE…): map the edges, then snap each to a punctuation boundary.
    return edges(True)

def main():
    red = parse_usfx(sys.argv[1])
    src = open(os.path.join(ROOT, "app.js"), encoding="utf-8").read()
    files = dict(re.findall(r'^\s*(\w+):\{name:.*?file:"([^"]+)"', src, re.M))
    os.makedirs(os.path.join(ROOT, "data/red"), exist_ok=True)
    print(len(red), "verses with words of Jesus in the WEB")
    for key, f in files.items():
        d = json.load(open(os.path.join(ROOT, f), encoding="utf-8"))
        books = {b["name"]: b for b in d["books"]}
        res = {}; miss = 0; have = 0
        for ref, (t, spans) in red.items():
            name, cv = ref.rsplit(" ", 1); c, v = map(int, cv.split(":"))
            b = books.get(name)
            tgt = b and len(b["chapters"]) >= c and len(b["chapters"][c - 1]) >= v and b["chapters"][c - 1][v - 1]
            if not tgt: continue
            have += 1
            m = map_verse(t, spans, tgt)
            if m: res[ref] = m
            else: miss += 1
        json.dump(res, open(os.path.join(ROOT, f"data/red/{key}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"{key:10s} {len(res):5d} red verses, {miss:4d} left black of {have}")

if __name__ == "__main__":
    main()
