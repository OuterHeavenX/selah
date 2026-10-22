"""Build data/kjv.json (King James Version, 1769 text, public domain) on the app's 31,102-verse grid.

Usage:  python3 tools/build_kjv.py /path/to/scrollmapper/bible_databases/formats/json/KJV.json
Psalm titles (which the source runs into verse 1) and Psalm 119's letter headings become the book's
`headings` map, like the ASV."""
import sys,os,json,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=json.load(open(sys.argv[1]))
asv=json.load(open(ROOT+'/data/bible.json'))
names=[b['name'] for b in asv['books']]
norm=lambda s:re.sub(r'[^a-z]','',s.lower())
books=[]; split=0; nomatch=[]
for bi,b in enumerate(src['books']):
  chs=[]
  for c in b['chapters']:
    n=max(v['verse'] for v in c['verses']); arr=['']*n
    for v in c['verses']: arr[v['verse']-1]=re.sub(r'\s+',' ',v['text']).strip()
    chs.append(arr)
  assert len(chs)==len(asv['books'][bi]['chapters']), names[bi]
  for ci,ch in enumerate(chs): assert len(ch)==len(asv['books'][bi]['chapters'][ci]), (names[bi],ci+1)
  heads={}
  if names[bi]=='Psalms':
    ah=asv['books'][bi].get('headings',{})
    for ci,ch in enumerate(chs):
      t=ch[0]; key=f"{ci+1}:1"
      if key in ah and not re.match(r'^[֐-׿]',ah[key]):
        # KJV wording differs from the ASV's: split at the sentence break whose length best matches the ASV title.
        target=len(norm(ah[key]))
        cands=[m.end() for m in re.finditer(r'\.\s+',t)]
        best=min(cands,key=lambda i:abs(len(norm(t[:i]))-target)) if cands else None
        if best and abs(len(norm(t[:best]))-target)<=max(14,target*0.45):
          heads[key]=t[:best].strip(); ch[0]=t[best:].strip(); split+=1
        else:
          # Two titles end mid-sentence; mark their end by hand.
          manual={18:"and from the hand of Saul: And he said,",54:"Doth not David hide himself with us?"}.get(ci+1)
          i=t.find(manual) if manual else -1
          if i>=0: heads[key]=t[:i+len(manual)].strip(); ch[0]=t[i+len(manual):].strip(); split+=1
          else: nomatch.append((ci+1,t[:70],ah[key][:60]))
    for ci in [118]:
      for vi,t in enumerate(chs[ci]):
        m=re.match(r'^([֐-׿])\s+([A-Z]+)\.?\s*',t)
        if m: heads[f"{ci+1}:{vi+1}"]=f"{m[1]} {m[2]}"; chs[ci][vi]=t[m.end():]
  books.append({'name':names[bi],'chapters':chs,**({'headings':heads} if heads else {})})
json.dump({'books':books},open(ROOT+'/data/kjv.json','w'),ensure_ascii=False,separators=(',',':'))
print('psalm titles split',split,'unmatched',len(nomatch),nomatch[:5],'| MB',round(os.path.getsize(ROOT+'/data/kjv.json')/1e6,1))
