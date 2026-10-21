"""Build Selah's original-language data from STEPBible.

Usage:  python3 tools/build_lexicon.py /path/to/STEPBible-Data
Writes  data/orig/NN.json (one per book) and data/lex/XNN.json (lexicon + concordance buckets).

Source: https://github.com/STEPBible/STEPBible-Data (Tyndale House, Cambridge), CC BY 4.0
  - Translators Amalgamated OT+NT/TAHOT*.txt, TAGNT*.txt  (word-by-word tagged Hebrew OT and Greek NT)
  - Lexicons/TBESH*.txt, TBESG*.txt                        (brief lexicons of extended Strong's numbers)
Verse keys follow the KJV-style grid in data/bible.json: when a row carries [C.V] that English number is used;
(C.V) Hebrew and {C.V} alternate numbers are ignored. Psalm titles are stored as verse 0.
"""
import sys
STEP=(sys.argv[1] if len(sys.argv)>1 else '.').rstrip('/')+'/'
import re,glob,json,collections,sys
D=STEP+'Translators Amalgamated OT+NT/'
# Ref shapes: Bk.C.V  /  Bk.C.V(heb C.V)  /  Bk.C.V[KJV C.V]  /  Bk.C.V{alt C.V}
REF=re.compile(r'^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\)|\[(\d+)\.(\d+)\]|\{(\d+)\.(\d+)\})?#(\d+)=(\S+)$')
def rows(pattern):
  for f in sorted(glob.glob(D+pattern)):
    for line in open(f,encoding='utf-8'):
      c=line.rstrip('\n').split('\t')
      m=REF.match(c[0])
      if m: yield f,m,c
order=[];seen=set()
heb=[];grk=[]
for pat,lst in (('TAHOT Gen*',heb),('TAHOT Jos*',heb),('TAHOT Job*',heb),('TAHOT Isa*',heb),('TAGNT Mat*',grk),('TAGNT Act*',grk)):
  for f,m,c in rows(pat):
    bk=m[1]
    if bk not in seen: seen.add(bk); order.append(bk)
    lst.append((m,c))
# verse 0 / psalm titles?

import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bible=json.load(open(ROOT+'/data/bible.json'))
names=[b['name'] for b in bible['books']]
code2name=dict(zip(order,names))
grid=set()
for b in bible['books']:
  for ci,ch in enumerate(b['chapters']):
    for vi,_ in enumerate(ch): grid.add((b['name'],ci+1,vi+1))
def keep_heb(t): return t[0] in 'LQ'
def keep_grk(t): return ('N' in t) or ('K' in t)
words=collections.defaultdict(list)
skipped=collections.Counter()
for lang,lst,keep in (('H',heb,keep_heb),('G',grk,keep_grk)):
  for m,c in lst:
    t=m[11]
    if not keep(t): skipped[lang+':'+t]+=1; continue
    c_,v_=(int(m[6]),int(m[7])) if m[6] else (int(m[2]),int(m[3]))   # [..] is the KJV/English number
    words[(code2name[m[1]],c_,v_)].append((lang,m,c))
keys=set(words)
off=[k for k in keys if k not in grid and k[2]!=0]
miss=[k for k in grid if k not in keys]

import re,json,collections,os,glob,html
from html.parser import HTMLParser
OUT=ROOT+'/data'
# ---------- verse ids in grid order ----------
vid={}; i=0
for b in bible['books']:
  for ci,ch in enumerate(b['chapters']):
    for vi,_ in enumerate(ch): vid[(b['name'],ci+1,vi+1)]=i; i+=1
def clean_tr(s): return s.replace('/','').replace('.','').lower()
def clean_gloss(s): return re.sub(r'<([^>]*)>',r'(\1)',s.replace('/ ',' ').replace('/','')).strip()
def norm_strong(s):
  m=re.match(r'([HG])(\d+)([A-Za-z]?)',s); 
  return (m[1]+m[2].zfill(4)+m[3].upper()) if m else None
perbook=collections.defaultdict(dict)
conc=collections.defaultdict(set); counts=collections.Counter()
for (bn,c,v),lst in words.items():
  out=[]
  for lang,m,col in lst:
    t=m[11]
    if lang=='H':
      orig=re.sub('[\u0591-\u05AF\u05BD]','',col[1].replace('/','').replace('\\',''))   # keep vowels, drop cantillation
      tr=clean_tr(col[2]); gl=clean_gloss(col[3])
      segs=col[4].split('\\')[0].split('/'); msegs=col[5].split('/')
      main=next((k for k,sg in enumerate(segs) if sg.startswith('{')),len(segs)-1)
      st=norm_strong(segs[main].strip('{}'))
      mo=(msegs[main] if main<len(msegs) else msegs[-1])
      if main>0 and not mo.startswith('H'): mo='H'+mo   # language prefix only on first segment
      fl='q' if t.startswith('Q') else ''
    else:
      mm=re.match(r'^(.*?)\s*\((.*)\)\s*$',col[1]); orig=(mm[1] if mm else col[1]).replace('[','').replace(']','')
      tr=(mm[2] if mm else '').replace('[','').replace(']','')
      gl=clean_gloss(col[2]); sm=col[3].split('=',1); st=norm_strong(sm[0]); mo=sm[1] if len(sm)>1 else ''
      fl='' if 'N' in t else 'v'          # 'v' = not in the critical (NA) text, e.g. Matt 17:21
    rec=[orig,tr,gl,st or '',mo]
    if fl: rec.append(fl)
    out.append(rec)
    if st:
      counts[st]+=1
      conc[st].add(vid[(bn,c,max(v,1))])
  perbook[bn][f"{c}:{v}"]=out
os.makedirs(OUT+'/orig',exist_ok=True)
sizes=[]
for k,bn in enumerate(names):
  p=f"{OUT}/orig/{k+1:02d}.json"
  json.dump(perbook[bn],open(p,'w'),ensure_ascii=False,separators=(',',':'))
  sizes.append((os.path.getsize(p),bn))
print('orig files',len(sizes),'total MB',round(sum(s for s,_ in sizes)/1e6,1),'largest',sorted(sizes)[-3:])
# ---------- lexicon ----------
BK={code:name for code,name in code2name.items()}
def ref_to_r(x):
  m=re.match(r'\s*([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)',x)
  if m and m[1] in BK: return f"{BK[m[1]]} {int(m[2])}:{int(m[3])}"
class San(HTMLParser):
  def __init__(s): super().__init__(convert_charrefs=True); s.o=[]; s.a=0
  def handle_starttag(s,tag,attrs):
    tag=tag.lower()
    if tag in('b','i'): s.o.append(f'<{tag}>')
    elif tag=='br': s.o.append('<br>')
    elif tag=='ref':
      r=None
      for k,vv in attrs:
        r=r or ref_to_r(k.strip("'\"=") if vv is None else (vv or ''))
      if not r:
        raw=s.get_starttag_text() or ''; mm=re.search(r"ref\s*=\s*'([^']*)'",raw); r=ref_to_r(mm[1]) if mm else None
      if s.a==0 and r: s.o.append(f'<a data-r="{html.escape(r)}">'); s.a=1
      elif s.a: s.a+=1
      else: s.a=-1 if False else 0
  def handle_endtag(s,tag):
    tag=tag.lower()
    if tag in('b','i'): s.o.append(f'</{tag}>')
    elif tag=='ref' and s.a>0:
      s.a-=1
      if s.a==0: s.o.append('</a>')
  def handle_data(s,d): s.o.append(html.escape(d,quote=False))
def sanitize(h):
  h=re.sub(r"<ref='([^']*)'>",lambda m:f'<ref data="{m[1]}">',h)
  p=San(); p.feed(h); p.close(); out=''.join(p.o)
  if p.a>0: out+='</a>'
  out=re.sub(r'_{2,}\s*','',out)
  out=re.sub(r'(<br>\s*){3,}','<br><br>',out).strip()
  out=re.sub(r'^(<br>\s*)+','',out)
  # balance b/i
  for t in('b','i'):
    d=out.count(f'<{t}>')-out.count(f'</{t}>')
    if d>0: out+=f'</{t}>'*d
  return out
# fix: attrs come as [('data','Mat.5.43')]
def ref_attr(attrs):
  for k,vv in attrs:
    if k=='data' and vv: return ref_to_r(vv)
San.handle_starttag.__defaults__=None
def _start(s,tag,attrs):
  tag=tag.lower()
  if tag in('b','i'): s.o.append(f'<{tag}>')
  elif tag=='br': s.o.append('<br>')
  elif tag=='ref':
    r=ref_attr(attrs)
    if s.a>0: s.a+=1
    elif r: s.o.append(f'<a data-r="{html.escape(r)}">'); s.a=1
San.handle_starttag=_start
LEX={}
for f in glob.glob(STEP+'Lexicons/TB*.txt'):
  for line in open(f,encoding='utf-8'):
    c=line.rstrip('\n').split('\t')
    if len(c)<8 or not re.match(r'^[HG]\d',c[0]): continue
    key=norm_strong(c[1].split('=')[0].strip())
    if not key or key in LEX: continue
    LEX[key]={'l':c[3],'t':c[4],'p':c[5],'g':c[6].strip(),'d':sanitize(c[7])}
used=set(counts)
missing=[k for k in used if k not in LEX]
print('lexicon entries',len(LEX),'strongs used',len(used),'used but not in lexicon',len(missing),sorted(missing)[:20])
def b36(n):
  s='0123456789abcdefghijklmnopqrstuvwxyz'; o=''
  while True:
    n,r=divmod(n,36); o=s[r]+o
    if not n: return o
buckets=collections.defaultdict(dict)
def lookup(key):
  if key in LEX: return LEX[key],None
  base=key[:5]
  for cand in [base]+[base+x for x in 'GHIJKLABCDEF']:
    if cand in LEX: return LEX[cand],cand
  return {'l':'','t':'','p':'','g':'','d':''},None
unresolved=[]
for key in sorted(used|set()):
  ent,alias=lookup(key); e=dict(ent)
  if alias: e['a']=alias
  if not e['g']: unresolved.append(key)
  ids=sorted(conc[key]); prev=0; ds=[]
  for x in ids: ds.append(b36(x-prev)); prev=x
  e['n']=counts[key]; e['v']=','.join(ds)
  num=int(key[1:5]); buckets[f"{key[0]}{num//200:02d}"][key]=e
os.makedirs(OUT+'/lex',exist_ok=True)
for f in glob.glob(OUT+'/lex/*.json'): os.remove(f)
bs=[]
for bk,d in buckets.items():
  p=f"{OUT}/lex/{bk}.json"; json.dump(d,open(p,'w'),ensure_ascii=False,separators=(',',':')); bs.append((os.path.getsize(p),bk))
print('unresolved after fallback',unresolved)
print('lex buckets',len(bs),'total MB',round(sum(s for s,_ in bs)/1e6,1),'largest',sorted(bs)[-3:])
