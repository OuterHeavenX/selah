"use strict";
/* Selah — the picture Bible.
   ART: every illustration. `home:true` pieces also rotate on the Home screen.
   PICTURE_BOOKS: each book's stories in Bible order; a story with `art` shows that piece,
   one without is a placeholder for a picture still to come.
   To add art: drop a ~900px-wide JPEG in img/art/, add it to ART, and set `art:"<id>"` on its story
   (then bump DATA_V in app.js and sw.js so phones fetch it). */

const ART=[
  {id:"genesis-creation", file:"img/art/genesis-creation.jpg", w:900, h:1125, focus:"50% 30%",
   title:"Creation", ref:"Genesis 1:1-2:3",
   alt:"Ink-and-wash poster of the six days of creation around a bearded figure reaching out over light, sea, land, sun and moon, animals, and the first man and woman",
   caption:"God speaks and the world takes shape, day by day — light out of darkness, the waters divided, land and plants, the lights of heaven, creatures of sea and air, and finally the animals and humanity made in his image.",
   panels:[["I","Light from darkness","Genesis 1:1-5"],["II","The sky and waters divided","Genesis 1:6-8"],["III","Dry land and vegetation","Genesis 1:9-13"],
           ["IV","Sun, moon and stars","Genesis 1:14-19"],["V","Sea creatures and birds","Genesis 1:20-23"],["VI","Land animals and humanity","Genesis 1:24-31"]]},
  {id:"genesis-fall", file:"img/art/genesis-fall.jpg", w:900, h:1125, focus:"50% 25%",
   title:"The Fall & the first murder", ref:"Genesis 3:1-4:16",
   alt:"Ink-and-wash poster of the serpent at the tree, Adam and Eve hiding in shame, the cherub guarding Eden, Cain and Abel's offerings, the murder, and Cain wandering",
   caption:"The serpent’s question, the fruit taken, the hiding and the exile from Eden — and outside the garden, the first brothers: an offering accepted, an offering refused, and the first blood spilled on the ground.",
   panels:[["I","The temptation","Genesis 3:1-6"],["II","The fall","Genesis 3:7-13"],["III","Exile from Eden","Genesis 3:22-24"],
           ["IV","Cain and Abel","Genesis 4:1-7"],["V","The first murder","Genesis 4:8"],["VI","Judgment and wandering","Genesis 4:9-16"]]},
  {id:"genesis-flood", file:"img/art/genesis-flood.jpg", w:900, h:1125, focus:"50% 45%",
   title:"The Great Flood", ref:"Genesis 6:1-9:17",
   alt:"Ink-and-wash poster of a corrupted world, Noah chosen, the ark built, animals boarding two by two, the ark on stormy waters, the dove returning, and the rainbow covenant",
   caption:"A world filled with violence, and one man who walked with God. The ark is built, the animals come in, the fountains of the deep break open — and when the waters go down, God sets his bow in the cloud as a promise.",
   panels:[["I","A world corrupted","Genesis 6:5-12"],["II","Noah chosen","Genesis 6:8-10"],["III","The ark built","Genesis 6:13-22"],["IV","Two by two","Genesis 7:1-16"],
           ["V","The flood","Genesis 7:17-24"],["VI","Waters receding","Genesis 8:1-19"],["VII","The covenant","Genesis 9:8-17"]]},
  {id:"genesis-babel", file:"img/art/genesis-babel.jpg", w:900, h:1125, focus:"50% 30%",
   title:"The Tower of Babel", ref:"Genesis 11:1-9",
   alt:"Ink-and-wash poster of builders raising a great brick tower into the clouds, their speech confused, the work abandoned and the people scattered across the earth",
   caption:"One people with one language set out to make a name for themselves with a tower reaching to heaven. The Lord comes down, confuses their speech, and the builders scatter across the face of the earth.",
   panels:[["I","One people, one language","Genesis 11:1-2"],["II","The tower begun","Genesis 11:3-4"],["III","Reaching the heavens","Genesis 11:4-5"],
           ["IV","Languages confused","Genesis 11:6-7"],["V","The work stops","Genesis 11:8"],["VI","Scattered across the earth","Genesis 11:9"]]},
  {id:"genesis-abraham", file:"img/art/genesis-abraham.jpg", w:900, h:1125, focus:"50% 30%",
   title:"The Call of Abraham", ref:"Genesis 12:1-25:11",
   alt:"Ink-and-wash poster of Abraham with his staff, his caravan leaving Haran, the starry covenant sky, Sarah and Abraham told of a son, Sodom burning, baby Isaac, Abraham and Isaac climbing the mountain, and the ram caught in the thicket",
   caption:"God calls Abram to leave his country for a land he will be shown. Under a sky full of stars the promise is sealed; Sodom falls; the son of promise is born at last — and on the mountain, the LORD provides the ram in Isaac’s place.",
   panels:[["I","The call","Genesis 12:1-9"],["II","The covenant","Genesis 15:1-21"],["III","Promise of Isaac","Genesis 18:1-15"],["IV","Sodom & Gomorrah","Genesis 19:1-29"],
           ["V","Isaac born","Genesis 21:1-7"],["VI","The test of faith","Genesis 22:1-10"],["VII","The ram provided","Genesis 22:11-14"]]},
  {id:"genesis-isaac", file:"img/art/genesis-isaac.jpg", w:900, h:1125, focus:"50% 30%",
   title:"The Life of Isaac", ref:"Genesis 21:1-28:9",
   alt:"Ink-and-wash poster of Isaac with his staff, his birth to Abraham and Sarah, the covenant under the stars, Rebekah at the well, Isaac meeting Rebekah, digging the wells, the twins Esau and Jacob, and the blind Isaac giving the blessing",
   caption:"The son of promise is born. God renews the covenant with him, a bride is found for him at the well, he re-digs his father’s wells, and in his old age the blessing passes — by Rebekah’s plan — to Jacob rather than Esau.",
   panels:[["I","The promised son","Genesis 21:1-7"],["II","The covenant continues","Genesis 26:1-5"],["III","Rebekah at the well","Genesis 24:10-27"],["IV","Isaac and Rebekah","Genesis 24:62-67"],
           ["V","The wells of Isaac","Genesis 26:17-22"],["VI","Esau and Jacob","Genesis 25:19-34"],["VII","The blessing","Genesis 27:1-40"]]},
  {id:"sinai", file:"img/art/sinai.jpg", w:900, h:1125, focus:"50% 30%", home:true,
   title:"Moses and Aaron at Sinai", ref:"Exodus 32:15-20",
   alt:"Ink drawing of Moses holding the stone tablets beside Aaron in the high priest's garments, with the tabernacle and the golden calf",
   caption:"Moses brings the tablets of the testimony down the mountain while Aaron stands in the high priest’s garments; the tabernacle, the ark and the golden calf are sketched around them."},
  {id:"bronze-serpent", file:"img/art/bronze-serpent.jpg", w:900, h:1125, focus:"50% 28%", home:true,
   title:"The bronze serpent", ref:"Numbers 21:4-9", also:"John 3:14-15",
   alt:"Ink drawing of Moses raising the bronze serpent on a pole above the people of Israel, with a technical sketch of the serpent",
   caption:"Bitten by fiery serpents, Israel looks to the bronze serpent on the pole and lives — the picture Jesus takes for himself: “as Moses lifted up the serpent in the wilderness, even so must the Son of man be lifted up.”"},
  {id:"prophet", file:"img/art/prophet.jpg", w:900, h:1125, focus:"50% 38%", home:true,
   title:"The prophet and the scrolls", ref:null,
   alt:"Ink drawing of an old prophet poring over scrolls, with the temple sketched behind him",
   caption:"An old prophet bent over the scrolls of the word of the Lord, the temple sketched behind him."}
];
const HOME_ART=ART.filter(a=>a.home);
const artById=id=>ART.find(a=>a.id===id);
const artSrc=a=>a.file+"?v="+DATA_V;

const PICTURE_BOOKS=[
  {book:"Genesis", stories:[
    {title:"Creation", ref:"Genesis 1:1-2:3", art:"genesis-creation"},
    {title:"The Fall & the first murder", ref:"Genesis 3:1-4:16", art:"genesis-fall"},
    {title:"The Great Flood", ref:"Genesis 6:1-9:17", art:"genesis-flood"},
    {title:"The Tower of Babel", ref:"Genesis 11:1-9", art:"genesis-babel"},
    {title:"The Call of Abraham", ref:"Genesis 12:1-25:11", art:"genesis-abraham"},
    {title:"Hagar and Ishmael", ref:"Genesis 16:1-16"},
    {title:"The Life of Isaac", ref:"Genesis 21:1-28:9", art:"genesis-isaac"},
    {title:"Jacob’s ladder", ref:"Genesis 28:10-22"},
    {title:"Jacob wrestles with God", ref:"Genesis 32:22-32"},
    {title:"Joseph sold by his brothers", ref:"Genesis 37:1-36"},
    {title:"Joseph in Potiphar’s house and in prison", ref:"Genesis 39:1-40:23"},
    {title:"Joseph interprets Pharaoh’s dreams", ref:"Genesis 41:1-57"},
    {title:"Joseph makes himself known", ref:"Genesis 45:1-15"},
    {title:"Jacob blesses his sons", ref:"Genesis 49:1-33"}]},
  {book:"Exodus", stories:[
    {title:"Moses in the basket", ref:"Exodus 2:1-10"},
    {title:"The burning bush", ref:"Exodus 3:1-4:17"},
    {title:"The plagues of Egypt", ref:"Exodus 7:14-11:10"},
    {title:"The Passover", ref:"Exodus 12:1-42"},
    {title:"Crossing the Red Sea", ref:"Exodus 14:1-31"},
    {title:"Manna from heaven", ref:"Exodus 16:1-36"},
    {title:"The Ten Commandments", ref:"Exodus 19:1-20:21"},
    {title:"The golden calf", ref:"Exodus 32:1-35", art:"sinai"},
    {title:"The tabernacle raised", ref:"Exodus 40:1-38"}]},
  {book:"Numbers", stories:[
    {title:"The twelve spies", ref:"Numbers 13:1-14:45"},
    {title:"Water from the rock", ref:"Numbers 20:1-13"},
    {title:"The bronze serpent", ref:"Numbers 21:4-9", art:"bronze-serpent"},
    {title:"Balaam and his donkey", ref:"Numbers 22:21-35"}]},
  {book:"The Prophets", stories:[
    {title:"The prophet and the scrolls", ref:null, art:"prophet"}]}
];

/* ---------- Images view: a picture timeline, one book at a time ---------- */
function chapterSpan(ref){
  const p=parsePassage(ref||""); if(!p) return "";
  const name=p.book==="Psalms"?"Psalm":p.book;
  return p.ch2&&p.ch2!==p.ch?`${name} ${p.ch}–${p.ch2}`:`${name} ${p.ch}`;
}
function renderImages(){
  const v=$("#view");
  let cur=store.get("picBook","Genesis");
  if(!PICTURE_BOOKS.some(b=>b.book===cur)) cur="Genesis";
  const bk=PICTURE_BOOKS.find(b=>b.book===cur);
  const drawn=b=>b.stories.filter(s=>s.art).length;
  const seq=bk.stories.filter(s=>s.art).map(s=>artById(s.art));
  v.innerHTML=`<h2 class="section-title">Images</h2>
  <div class="section-sub">A picture Bible in story order. Choose a book, tap a picture to see it full size, or tap a numbered scene to read it.</div>
  <div class="pb-books" role="tablist">${PICTURE_BOOKS.map(b=>`<button class="chip${b.book===cur?" on":""}" data-b="${esc(b.book)}" role="tab" aria-selected="${b.book===cur}">${esc(b.book)} <span class="pb-count">${drawn(b)}${b.stories.length>drawn(b)?"/"+b.stories.length:""}</span></button>`).join("")}</div>
  <div class="pb-progress">${drawn(bk)} of ${bk.stories.length} ${bk.stories.length===1?"scene":"scenes"} illustrated${bk.stories.length>drawn(bk)?" · the rest are marked for pictures to come":""}</div>
  <ol class="pb-timeline">`+bk.stories.map(s=>{
    const a=s.art&&artById(s.art);
    if(!a) return `<li class="pb-node todo"><div class="pb-dot"></div><div class="pb-body">
      <div class="pb-ref">${esc(chapterSpan(s.ref))}</div><h3>${esc(s.title)}</h3>
      <div class="pb-todo"><span>Picture to come</span><button class="pb-read" data-r="${esc(s.ref)}">Read ${esc(s.ref)} →</button></div></div></li>`;
    return `<li class="pb-node"><div class="pb-dot"></div><div class="pb-body">
      ${s.ref?`<div class="pb-ref">${esc(chapterSpan(s.ref))}</div>`:""}<h3>${esc(s.title)}</h3>
      <figure class="art-card pb-card">
        <button class="art-img" data-i="${seq.indexOf(a)}" aria-label="View ${esc(a.title)} full size"><img src="${artSrc(a)}" alt="${esc(a.alt)}" width="${a.w}" height="${a.h}" loading="lazy" decoding="async"></button>
        <figcaption><p>${esc(a.caption)}</p>
          ${a.panels?`<div class="pb-panels">${a.panels.map(([n,l,r])=>`<button class="pb-panel" data-r="${esc(r)}"><b>${n}</b> ${esc(l)}</button>`).join("")}</div>`:""}
          ${a.ref?`<button class="typ-link pb-read" data-r="${esc(a.ref)}">Read ${esc(a.ref)} →</button>`:""}
          ${a.also?`<button class="typ-link pb-read" data-r="${esc(a.also)}">Fulfilled in ${esc(a.also)} →</button>`:""}
        </figcaption></figure></div></li>`;
  }).join("")+`</ol>`;
  v.querySelectorAll(".pb-books .chip").forEach(b=>b.onclick=()=>{ store.set("picBook",b.dataset.b); renderImages(); setRoute(routeFor("images"),true); });
  v.querySelectorAll(".art-img").forEach(b=>b.onclick=()=>openLightbox(+b.dataset.i,seq));
  v.querySelectorAll(".pb-read,.pb-panel").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}
