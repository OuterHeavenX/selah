"""Build data/xrefs/NN.json (one per book) from OpenBible.info cross references.

Usage:  python3 tools/build_xrefs.py /path/to/cross_references.txt
Source: https://www.openbible.info/labs/cross-references/ (CC BY), derived mainly from the
Treasury of Scripture Knowledge. Rows with negative votes are dropped; each verse keeps its
50 highest-voted references. Entries are [toVerseId, votes] or [toVerseId, votes, rangeEndId],
where ids index the KJV-style verse grid of data/bible.json (0 = Genesis 1:1).
"""
import sys,os,json,re,collections
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODES="Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev".split()
bible=json.load(open(ROOT+'/data/bible.json'))
vid={}; i=0
for bi,b in enumerate(bible['books']):
  for ci,ch in enumerate(b['chapters']):
    for vi,_ in enumerate(ch): vid[(CODES[bi],ci+1,vi+1)]=i; i+=1
def parse(r):
  m=re.match(r'^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$',r); return vid.get((m[1],int(m[2]),int(m[3]))) if m else None
out=collections.defaultdict(lambda:collections.defaultdict(list)); bad=0; neg=0
src=sys.argv[1]
for line in open(src,encoding='utf-8'):
  c=line.rstrip('\n').split('\t')
  if len(c)<3 or not re.match(r'^[1-3]?[A-Za-z]+\.\d',c[0]): continue
  v=int(c[2])
  if v<0: neg+=1; continue
  fr=re.match(r'^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$',c[0])
  a,_,z=c[1].partition('-')
  ta=parse(a); tz=parse(z) if z else None
  if not fr or (fr[1],int(fr[2]),int(fr[3])) not in vid or ta is None or (z and tz is None): bad+=1; continue
  bi=CODES.index(fr[1]); key=f"{int(fr[2])}:{int(fr[3])}"
  e=[ta,v]+([tz] if tz and tz!=ta else [])
  out[bi][key].append(e)
os.makedirs(ROOT+'/data/xrefs',exist_ok=True); tot=0; sz=0
for bi in range(66):
  d={}
  for k,L in out[bi].items():
    seen=set(); L2=[]
    for e in sorted(L,key=lambda e:-e[1]):
      sig=(e[0],e[2] if len(e)>2 else None)
      if sig in seen: continue
      seen.add(sig); L2.append(e)
    d[k]=L2[:50]; tot+=len(d[k])
  p=f"{ROOT}/data/xrefs/{bi+1:02d}.json"; json.dump(d,open(p,'w'),separators=(',',':')); sz+=os.path.getsize(p)
print('kept',tot,'dropped negative',neg,'unmapped',bad,'MB',round(sz/1e6,1))
