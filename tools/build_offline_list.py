"""Write data/files.json: every on-demand file (translations, Hebrew/Greek, lexicons, cross-references, artwork)
with its size, so the app's "Download everything" button can save them all for offline use.
Run after changing anything in data/.   Usage: python3 tools/build_offline_list.py"""
import os,json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files=['data/intros.json','data/web.json','data/kjv.json','data/topics.json','data/lexindex.json','data/mapbase.json','data/places.json']
for d in ('orig','lex','xrefs','comm/jfb','comm/mh','tr','red','dict'):
  files+=sorted(f'data/{d}/{f}' for f in os.listdir(f'{ROOT}/data/{d}') if f.endswith('.json'))
files+=sorted(f'img/art/{f}' for f in os.listdir(f'{ROOT}/img/art') if f.endswith('.jpg'))
out=[{'p':p,'s':os.path.getsize(f'{ROOT}/{p}')} for p in files]
json.dump({'files':out,'bytes':sum(x['s'] for x in out)},open(f'{ROOT}/data/files.json','w'),separators=(',',':'))
print(len(out),'files',round(sum(x['s'] for x in out)/1e6,1),'MB')
