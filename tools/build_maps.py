"""Build the map data: data/mapbase.json (coastline, lakes, rivers) and data/places.json (every Bible place).

Projection: plain equirectangular, x scaled by cos(31.5°) so Israel keeps its shape.
  x = (lon - LON0) * KX     y = (LAT1 - lat) * KY        (1 unit ≈ 1.1 km)
mapbase.json: {w, h, proj:[LON0, LAT1, KX, KY], land: "svg path", lakes: "svg path", rivers: [[name, "svg path"], ...]}
places.json:  {"p": [[id, name, x, y, type, confidence 0-2, alternatives, modern, [verse ids], openbible slug], ...], "j": journeys}
  confidence: 2 = location known, 1 = probable, 0 = uncertain (OpenBible.info's scores)

Sources: Natural Earth 1:10m land, lakes, rivers (public domain);
         OpenBible.info Bible Geocoding Data (CC BY 4.0), ancient.jsonl.
Usage: python3 -I tools/build_maps.py <natural-earth geojson dir> <openbible data dir>
"""
import json, math, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NE, OB = sys.argv[1], sys.argv[2]
LON0, LON1, LAT0, LAT1 = 10.0, 56.0, 20.0, 43.5
KY = 100.0
KX = KY * math.cos(math.radians(31.5))
W, H = (LON1 - LON0) * KX, (LAT1 - LAT0) * KY
proj = lambda lon, lat: ((lon - LON0) * KX, (LAT1 - lat) * KY)
PAD = 2.0                                                      # degrees kept outside the frame so shores don't stop at the edge
BOX = (LON0 - PAD, LAT0 - PAD, LON1 + PAD, LAT1 + PAD)

def clip_ring(ring, box):
    """Sutherland–Hodgman against an axis-aligned box (polygon fill only, so border-hugging edges are fine)."""
    x0, y0, x1, y1 = box
    edges = [(lambda p: p[0] >= x0, lambda a, b: (x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0]))),
             (lambda p: p[0] <= x1, lambda a, b: (x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0]))),
             (lambda p: p[1] >= y0, lambda a, b: (a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0)),
             (lambda p: p[1] <= y1, lambda a, b: (a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1))]
    out = ring
    for inside, cross in edges:
        if not out: break
        src, out = out, []
        prev = src[-1]
        for cur in src:
            if inside(cur):
                if not inside(prev): out.append(cross(prev, cur))
                out.append(cur)
            elif inside(prev): out.append(cross(prev, cur))
            prev = cur
    return out

def clip_line(line, box):
    """Split a polyline into the runs that fall inside the box (rivers are short; vertex test is enough)."""
    x0, y0, x1, y1 = box
    runs, cur = [], []
    for p in line:
        if x0 <= p[0] <= x1 and y0 <= p[1] <= y1: cur.append(p)
        else:
            if len(cur) > 1: runs.append(cur)
            cur = []
    if len(cur) > 1: runs.append(cur)
    return runs

def simplify(pts, tol):
    """Douglas–Peucker, iterative."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-9
        best, bi = -1, -1
        for i in range(a + 1, b):
            d = abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L
            if d > best: best, bi = d, i
        if best > tol:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def path(rings, closed, tol):
    out = []
    for r in rings:
        pr = simplify([proj(*p) for p in r], tol)
        if len(pr) < (4 if closed else 2): continue
        if closed:                                             # drop specks
            area = abs(sum(pr[i][0] * pr[i - 1][1] - pr[i - 1][0] * pr[i][1] for i in range(len(pr)))) / 2
            if area < 40: continue
        s = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pr)
        out.append(s + ("Z" if closed else ""))
    return "".join(out)

def polys(geom):
    if geom["type"] == "Polygon": return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon": return geom["coordinates"]
    return []

def in_box(coords):
    xs = [c[0] for c in coords]; ys = [c[1] for c in coords]
    return not (max(xs) < BOX[0] or min(xs) > BOX[2] or max(ys) < BOX[1] or min(ys) > BOX[3])

land = []
for f in json.load(open(f"{NE}/ne_10m_land.geojson"))["features"]:
    for poly in polys(f["geometry"]):
        ring = poly[0]
        if in_box(ring):
            c = clip_ring([tuple(p) for p in ring], BOX)
            if len(c) > 3: land.append(c)
lakes = []
for f in json.load(open(f"{NE}/ne_10m_lakes.geojson"))["features"]:
    for poly in polys(f["geometry"]):
        if in_box(poly[0]): lakes.append([tuple(p) for p in poly[0]])
RIVERS = {"Jordan", "Nile", "Euphrates", "Tigris", "Orontes", "Litani", "Yarmuk", "Halys", "Kızılırmak", "Kizilirmak", "Araxes", "Aras", "Karun", "Khabur", "Balikh", "Meander", "Büyük Menderes", "Tiber", "Rosetta Branch", "Damietta Branch", "Barada", "Kishon", "Zarqa", "Wadi Mujib"}
rivers = {}
for f in json.load(open(f"{NE}/ne_10m_rivers_lake_centerlines.geojson"))["features"]:
    pr = f["properties"]; name = pr.get("name") or pr.get("name_en") or ""
    if not any(r.lower() in name.lower() for r in RIVERS): continue
    g = f["geometry"]; lines = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
    for ln in lines:
        for run in clip_line([tuple(p) for p in ln], BOX): rivers.setdefault(name, []).append(run)

base = {"w": round(W), "h": round(H), "proj": [LON0, LAT1, round(KX, 4), KY], "pad": [round(PAD * KX * 0.95), round(PAD * KY * 0.95)],
        "land": path(land, True, 0.6), "lakes": path(lakes, True, 0.3),
        "rivers": [[n, path(r, False, 0.5)] for n, r in sorted(rivers.items())]}
json.dump(base, open(f"{ROOT}/data/mapbase.json", "w"), separators=(",", ":"))
print("mapbase", round(os.path.getsize(f"{ROOT}/data/mapbase.json") / 1e3), "KB; rivers:", sorted(rivers))

# ---------- places ----------
BIBLE = json.load(open(f"{ROOT}/data/bible.json"))["books"]
VC = [[len(c) for c in b["chapters"]] for b in BIBLE]
START = []; n = 0
for b in VC:
    START.append([]);
    for c in b: START[-1].append(n); n += c
CODES = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split()
def vid(usx):
    m = re.match(r"(\w+) (\d+):(\d+)", usx or "")
    if not m or m.group(1) not in CODES: return None
    b, c, v = CODES.index(m.group(1)), int(m.group(2)), int(m.group(3))
    if 1 <= c <= len(VC[b]) and 1 <= v <= VC[b][c - 1]: return START[b][c - 1] + v - 1
    return None
strip = lambda s: re.sub(r"<[^>]+>", "", s or "").strip()
places, skipped, offmap = [], 0, []
for line in open(f"{OB}/ancient.jsonl"):
    p = json.loads(line)
    ids = p.get("identifications") or []
    vs = sorted({v for v in (vid(x.get("usx")) for x in p.get("verses", [])) if v is not None})
    if not ids or not vs: skipped += 1; continue
    best = max(ids, key=lambda i: (i.get("score") or {}).get("vote_total", 0))
    res = (best.get("resolutions") or [{}])[0]
    if not res.get("lonlat"): skipped += 1; continue
    lon, lat = map(float, res["lonlat"].split(","))
    x, y = proj(lon, lat)
    if not (0 <= x <= W and 0 <= y <= H): offmap.append(p["friendly_id"])
    score = (best.get("score") or {}).get("vote_total", 0)
    conf = 2 if score >= 450 else 1 if score >= 200 else 0
    kind = (best.get("types") or p.get("types") or ["place"])[0]
    name = re.sub(r" \d+$", "", p["friendly_id"])
    places.append([p["id"], name, round(x, 1), round(y, 1), kind, conf, len(ids) - 1, strip(best.get("description"))[:80], vs, p.get("url_slug", "")])

# Journeys: stops are OpenBible ids, each with the verse that names that leg.
J = [
 ["abraham", "Abraham’s journey", "Genesis 11:31–13:18", [
   ["a6cf75c", "Genesis 11:31"], ["a6d9af3", "Genesis 11:31"], ["adf74d4", "Genesis 12:6"], ["a64f355", "Genesis 12:8"],
   ["a1cb244", "Genesis 12:9"], ["af301ca", "Genesis 12:10"], ["a1cb244", "Genesis 13:1"], ["a64f355", "Genesis 13:3"], ["a85151a", "Genesis 13:18"]]],
 ["exodus", "The Exodus", "Exodus 12 – Deuteronomy 34", [
   ["a079b21", "Exodus 12:37"], ["aa28709", "Exodus 12:37"], ["a27d0e0", "Exodus 13:20"], ["ababfd2", "Exodus 14:2"], ["ad3970d", "Exodus 15:23"],
   ["a2410c1", "Exodus 15:27"], ["a0f54e4", "Exodus 16:1"], ["a05ebb7", "Exodus 17:1"], ["abfba2a", "Exodus 19:1-2"], ["ae7836a", "Numbers 11:34"],
   ["a1b6474", "Numbers 11:35"], ["ac2cef0", "Numbers 13:26"], ["ad8027f", "Numbers 20:22"], ["a0ef1e1", "Numbers 21:10"], ["a0574da", "Numbers 21:11"],
   ["ab5161f", "Numbers 21:12"], ["a4cc324", "Numbers 21:13"], ["af64fb3", "Numbers 25:1"], ["aefaa2d", "Deuteronomy 34:1"]]],
 ["paul1", "Paul’s first journey", "Acts 13–14", [
   ["ae41ab4", "Acts 13:1-3"], ["a6d306d", "Acts 13:4"], ["afa863b", "Acts 13:5"], ["a314765", "Acts 13:6"], ["aff04b8", "Acts 13:13"],
   ["a6c704a", "Acts 13:14"], ["ae425aa", "Acts 13:51"], ["af0719d", "Acts 14:6"], ["aa401a9", "Acts 14:20"], ["af0719d", "Acts 14:21"],
   ["ae425aa", "Acts 14:21"], ["a6c704a", "Acts 14:21"], ["aff04b8", "Acts 14:25"], ["ac744c1", "Acts 14:25"], ["ae41ab4", "Acts 14:26"]]],
 ["paul2", "Paul’s second journey", "Acts 15:36–18:22", [
   ["ae41ab4", "Acts 15:35-36"], ["aa401a9", "Acts 16:1"], ["af0719d", "Acts 16:1"], ["a91c509", "Acts 16:8"], ["a68750d", "Acts 16:11"],
   ["a6a7150", "Acts 16:11"], ["a49e1d0", "Acts 16:12"], ["a4bdea7", "Acts 17:1"], ["ab20df9", "Acts 17:1"], ["afa9d8e", "Acts 17:1"],
   ["a62fe31", "Acts 17:10"], ["a1fe6e7", "Acts 17:15"], ["a6f437a", "Acts 18:1"], ["aa31dd3", "Acts 18:18"], ["a5feb15", "Acts 18:19"],
   ["a58735e", "Acts 18:22"], ["a15257a", "Acts 18:22"], ["ae41ab4", "Acts 18:22"]]],
 ["paul3", "Paul’s third journey", "Acts 18:23–21:17", [
   ["ae41ab4", "Acts 18:23"], ["a0f440a", "Acts 18:23"], ["a5feb15", "Acts 19:1"], ["a69e1b8", "Acts 20:1"], ["a6f437a", "Acts 20:2-3"],
   ["a49e1d0", "Acts 20:6"], ["a91c509", "Acts 20:6"], ["a0a2ca7", "Acts 20:13"], ["a33910d", "Acts 20:14"], ["a4c2c75", "Acts 20:15"],
   ["acf6ec0", "Acts 20:15"], ["a55027d", "Acts 20:15"], ["a398e5d", "Acts 21:1"], ["a4218ee", "Acts 21:1"], ["ade301b", "Acts 21:1"],
   ["a160272", "Acts 21:3"], ["abc2af0", "Acts 21:7"], ["a58735e", "Acts 21:8"], ["a15257a", "Acts 21:15-17"]]],
 ["rome", "Paul’s voyage to Rome", "Acts 27–28", [
   ["a58735e", "Acts 25:13"], ["a98e4d7", "Acts 27:3"], ["aa4b3e2", "Acts 27:5"], ["ab793ce", "Acts 27:7"], ["aae626a", "Acts 27:8"],
   ["a57835d", "Acts 28:1"], ["a1e3697", "Acts 28:12"], ["a63bb26", "Acts 28:13"], ["a4488e9", "Acts 28:13"], ["a121d5e", "Acts 28:15"],
   ["afef438", "Acts 28:15"], ["afc8e7a", "Acts 28:16"]]],
]
have = {p[0] for p in places}
for j in J:
    miss = [s[0] for s in j[3] if s[0] not in have]
    assert not miss, (j[0], miss)
json.dump({"p": places, "j": J}, open(f"{ROOT}/data/places.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(places), "places", skipped, "skipped;", len(offmap), "outside the map:", offmap[:12],
      round(os.path.getsize(f"{ROOT}/data/places.json") / 1e3), "KB")
