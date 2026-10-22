// Checks every trivia question: its passage exists and contains the key word (ASV), and options are 4 distinct. Usage: node tools/check_trivia.js
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(__dirname+'/../trivia.js','utf8');
const ctx={EXTRA_VIEWS:{},HOME_TOOLS:[],EXTRA_ROUTES:{},store:{get:(k,d)=>d,set(){}},console};
vm.createContext(ctx); vm.runInContext(src.replace(/const (TRIVIA_Q|TRIVIA_VERSES)=/g,'globalThis.$1='),ctx);
const bibles={asv:JSON.parse(fs.readFileSync(__dirname+'/../data/bible.json')).books,kjv:JSON.parse(fs.readFileSync(__dirname+'/../data/kjv.json')).books,web:JSON.parse(fs.readFileSync(__dirname+'/../data/web.json')).books};
function passage(B,ref){
  let m=ref.match(/^(.+?) (\d+):(\d+)(?:-(\d+)(?::(\d+))?)?$/); if(!m) return null;
  const b=B.find(x=>x.name===m[1]); if(!b) return null;
  const c1=+m[2],v1=+m[3],c2=m[5]?+m[4]:c1,v2=m[5]?+m[5]:(m[4]?+m[4]:v1); let out=[];
  for(let c=c1;c<=c2;c++){ const ch=b.chapters[c-1]; if(!ch) return null; const a=c===c1?v1:1, z=c===c2?v2:ch.length; if(z>ch.length) return null; for(let v=a;v<=z;v++) out.push(ch[v-1]); }
  return out.join(' ');
}
let bad=0;
for(const q of ctx.TRIVIA_Q){
  const [qq,ans,wrong,ref,t,d,k]=q;
  const res=Object.fromEntries(Object.entries(bibles).map(([n,B])=>{ const p=passage(B,ref); return [n,p==null?'NOREF':p.toLowerCase().includes(k.toLowerCase())]; }));
  const opts=[ans,...wrong]; const dup=new Set(opts).size!==4||wrong.length!==3;
  if(!res.asv||res.asv==='NOREF'||dup||!['ot','nt'].includes(t)){ bad++; console.log('CHECK',ref,k,JSON.stringify(res),dup?'DUP':'', '|',qq); }
  else if(res.kjv!==true||res.web!==true) console.log('  (asv ok; other translations)',ref,k,JSON.stringify(res));
}
for(const r of ctx.TRIVIA_VERSES){ if(!passage(bibles.asv,r)) { bad++; console.log('VERSE missing',r); } }
console.log(ctx.TRIVIA_Q.length,'questions,',ctx.TRIVIA_VERSES.length,'verses; problems:',bad);
