"""Bible dictionary: Easton's Bible Dictionary (1897) with Hitchcock's Bible Names (meanings), both public domain,
from the CCEL ThML editions (via neuu-org/bible-dictionary-dataset, data/00_raw/ccel/xml).
Writes data/dict/index.json = {"t": [[term, file letter, hitchcock meaning or ""], ...]}
       data/dict/<letter>.json = {term: html}
html keeps paragraphs and italics; Scripture references become <a data-r="Exodus 4:27-30">…</a> and
"see" links become <a data-t="Moses">Moses</a>.
Usage: python3 tools/build_dictionary.py easton_ebd2.xml hitchcock_bible_names.xml"""
import sys, os, re, json, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OSIS = "Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev".split()

def book_names():
    d = json.load(open(os.path.join(ROOT, "data/bible.json"), encoding="utf-8"))
    return dict(zip(OSIS, [b["name"] for b in d["books"]]))

def osis_to_ref(o, names):
    parts = o.replace("Bible:", "").split("-")
    a = parts[0].split(".")
    if len(a) < 2 or a[0] not in names: return None
    bk = names[a[0]]
    c1 = a[1]; v1 = a[2] if len(a) > 2 else None
    if v1 is None: return f"{bk} {c1}"
    ref = f"{bk} {c1}:{v1}"
    if len(parts) > 1:
        b = parts[1].split(".")
        if len(b) >= 3 and b[0] == a[0]:
            ref += f"-{b[2]}" if b[1] == c1 else f"-{b[1]}:{b[2]}"
    return ref

def clean_def(x, names, terms_lc):
    x = re.sub(r"<scripCom[^>]*/>|<scripCom[^>]*>.*?</scripCom>", "", x, flags=re.S)
    def see(m):
        t = re.search(r"term=([^\"&]+)", m.group(1)); txt = re.sub(r"<[^>]+>", "", m.group(2))
        key = t and terms_lc.get(t.group(1).replace("_", " ").replace("+", " ").lower())
        disp = txt.title() if txt.isupper() else txt
        return f'<a data-t="{html.escape(key)}">{html.escape(disp)}</a>' if key else disp
    x = re.sub(r"<a ([^>]*)>(.*?)</a>", see, x, flags=re.S)
    def sref(m):
        o = re.search(r'osisRef="([^"]+)"', m.group(1)); r = o and osis_to_ref(o.group(1), names)
        txt = re.sub(r"<[^>]+>", "", m.group(2))
        return f'<a data-r="{html.escape(r)}">{txt}</a>' if r else txt
    x = re.sub(r"<scripRef([^>]*)>(.*?)</scripRef>", sref, x, flags=re.S)
    x = re.sub(r"<p[^>]*>", "<p>", x)
    x = re.sub(r"</?(?!p\b|/p\b|i\b|/i\b|a\b|/a\b)[^>]*>", "", x)          # keep only p, i, a
    x = re.sub(r"\s+", " ", x).replace("<p> ", "<p>").replace(" </p>", "</p>").strip()
    return x

def main():
    ez, hc = sys.argv[1], sys.argv[2]
    names = book_names()
    s = open(ez, encoding="utf-8").read()
    pairs = re.findall(r"<term[^>]*>(.*?)</term>\s*<def[^>]*>(.*?)</def>", s, flags=re.S)
    terms = [re.sub(r"<[^>]+>|\s+", " ", t).strip() for t, _ in pairs]
    terms_lc = {}
    for t in terms: terms_lc.setdefault(t.lower(), t)
    h = open(hc, encoding="utf-8").read()
    meaning = {}
    for t, d in re.findall(r"<term[^>]*>(.*?)</term>\s*<def[^>]*>(.*?)</def>", h, flags=re.S):
        meaning[re.sub(r"\s+", " ", t).strip().lower()] = re.sub(r"<[^>]+>|\s+", " ", d).strip()
    out = {}; index = []
    for (t, d), term in zip(pairs, terms):
        if len(term) < 2: continue                               # the letter headings ("A", "B"…)
        body = clean_def(d, names, terms_lc)
        if not re.sub(r"<[^>]+>", "", body).strip(): continue
        letter = re.sub(r"[^a-z]", "", term.lower())[:1] or "a"
        if term in out.get(letter, {}): body = out[letter][term] + body
        out.setdefault(letter, {})[term] = body
    for letter, entries in out.items():
        for term in entries: index.append([term, letter, meaning.get(term.lower(), "")])
    # Names Easton lacks but Hitchcock explains: meaning only.
    have = {t.lower() for t, _, _ in index}
    for k, m in meaning.items():
        if k not in have:
            index.append([k.title() if k.islower() else k, "", m])
    index.sort(key=lambda x: x[0].lower())
    os.makedirs(os.path.join(ROOT, "data/dict"), exist_ok=True)
    for letter, entries in out.items():
        json.dump(entries, open(os.path.join(ROOT, f"data/dict/{letter}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump({"t": index}, open(os.path.join(ROOT, "data/dict/index.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    n = sum(len(e) for e in out.values())
    print(n, "Easton entries;", sum(1 for x in index if x[2]), "with name meanings;", len(index), "index terms")

if __name__ == "__main__":
    main()
