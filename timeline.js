"use strict";
/* Selah — a timeline of the Bible, Creation to Patmos (Home → Timeline, #/timeline, #/timeline/<event>).
   Hand-curated: ~95 events in 12 eras, each with its passage and, where they exist, artwork (pictures.js),
   a place on the map (maps.js) or a journey. Dates follow the conservative chronology used by most study Bibles
   (Exodus c. 1446 BC, the temple begun 966 BC, the crucifixion AD 30 or 33); they're approximate before Solomon,
   and where scholars differ widely the event carries a note. The early chapters of Genesis are left undated. */

// era: [id, title, span label, one-line summary, art id?]
const TL_ERAS=[
  ["primeval","Beginnings","Genesis 1–11","Creation, the fall, the flood and Babel — the world before Abraham.",null],
  ["patriarchs","The Patriarchs","c. 2166–1805 BC","God calls Abraham and keeps his promise through Isaac, Jacob and Joseph.",null],
  ["exodus","Egypt and the Exodus","c. 1700–1406 BC","Slavery, deliverance, the covenant at Sinai and forty years in the wilderness.","sinai"],
  ["conquest","Conquest and Judges","c. 1406–1050 BC","Israel enters the land; judges rise and fall in a cycle of sin and rescue.",null],
  ["kingdom","The United Kingdom","c. 1050–931 BC","Saul, David and Solomon; Jerusalem becomes the city of God’s temple.",null],
  ["divided","The Divided Kingdom","931–586 BC","Israel and Judah go separate ways; the prophets call both back to God.","prophet"],
  ["exile","Exile","605–538 BC","Babylon takes Judah captive; God’s word reaches his people far from home.",null],
  ["return","The Return","538–c. 430 BC","Exiles come home, rebuild the temple and the walls, and renew the covenant.",null],
  ["between","Between the Testaments","c. 430–5 BC","Persia, Greece and Rome rule; the stage is set for the Messiah.",null],
  ["christ","The Life of Christ","c. 6 BC–AD 30/33","The Word became flesh: birth, ministry, death and resurrection of Jesus.",null],
  ["church","The Early Church","AD 30/33–c. 95","The Spirit is poured out and the gospel goes from Jerusalem to Rome.",null]
];
// event: [id, era, sort year (negative = BC, null = undated), date label, title, passage, summary, extras {art, place, journey, note}]
const TL_EVENTS=[
  ["creation","primeval",null,"","Creation","Genesis 1:1-2:3","God makes the heavens and the earth in six days and rests on the seventh.",{art:"genesis-creation"}],
  ["fall","primeval",null,"","The fall","Genesis 3:1-24","Adam and Eve disobey; sin and death enter the world, and God promises a coming victor.",{art:"genesis-fall"}],
  ["cain","primeval",null,"","Cain and Abel","Genesis 4:1-16","Cain murders his brother, and sin spreads to the next generation.",{}],
  ["flood","primeval",null,"","The flood","Genesis 6:9-9:17","God judges a violent world, saves Noah’s family in the ark, and sets his bow in the clouds.",{art:"genesis-flood"}],
  ["babel","primeval",null,"","The tower of Babel","Genesis 11:1-9","Humanity unites to make a name for itself; God confuses their language and scatters them.",{art:"genesis-babel"}],

  ["abram-born","patriarchs",-2166,"c. 2166 BC","Abram born in Ur","Genesis 11:26-31","Terah’s son is born in Ur of the Chaldees.",{place:"a6cf75c"}],
  ["call","patriarchs",-2091,"c. 2091 BC","The call of Abram","Genesis 12:1-9","At 75, Abram leaves Haran for a land God will show him, with a promise to bless all nations.",{art:"genesis-abraham",place:"a6d9af3",journey:"abraham"}],
  ["covenant","patriarchs",-2081,"c. 2081 BC","God’s covenant with Abram","Genesis 15:1-21","Abram believes the LORD, and it is counted to him as righteousness.",{}],
  ["sodom","patriarchs",-2067,"c. 2067 BC","Sodom and Gomorrah destroyed","Genesis 19:1-29","Fire falls on the cities of the plain; Lot is rescued.",{}],
  ["isaac","patriarchs",-2066,"c. 2066 BC","Isaac born","Genesis 21:1-7","The promised son is born to Abraham at 100 and Sarah at 90.",{art:"genesis-isaac"}],
  ["moriah","patriarchs",-2050,"","Abraham offers Isaac","Genesis 22:1-19","On Mount Moriah God provides a ram in Isaac’s place: “The LORD will provide.”",{}],
  ["twins","patriarchs",-2006,"c. 2006 BC","Jacob and Esau born","Genesis 25:19-26","Rebekah’s twins struggle even before birth; the older will serve the younger.",{}],
  ["ladder","patriarchs",-1929,"c. 1929 BC","Jacob’s ladder","Genesis 28:10-22","Fleeing Esau, Jacob dreams of a stairway to heaven and God renews the promise.",{place:"a64f355"}],
  ["israel","patriarchs",-1909,"c. 1909 BC","Jacob becomes Israel","Genesis 32:22-32","Jacob wrestles until daybreak and is renamed Israel.",{}],
  ["joseph-sold","patriarchs",-1898,"c. 1898 BC","Joseph sold into Egypt","Genesis 37:12-36","Joseph’s jealous brothers sell him to traders bound for Egypt.",{}],
  ["joseph-rules","patriarchs",-1885,"c. 1885 BC","Joseph rules in Egypt","Genesis 41:37-57","Pharaoh sets Joseph over Egypt to store grain against the famine.",{place:"af301ca"}],
  ["to-egypt","patriarchs",-1876,"c. 1876 BC","Israel moves to Egypt","Genesis 46:1-7","Jacob’s family, seventy strong, settles in Goshen.",{}],
  ["joseph-dies","patriarchs",-1805,"c. 1805 BC","Death of Joseph","Genesis 50:22-26","“God meant it for good.” Joseph dies, asking that his bones be carried home.",{}],

  ["slavery","exodus",-1600,"","Slavery in Egypt","Exodus 1:8-14","A new king who knew not Joseph sets taskmasters over Israel.",{}],
  ["moses-born","exodus",-1526,"c. 1526 BC","Moses born","Exodus 2:1-10","Hidden in a basket on the Nile, the baby is raised in Pharaoh’s house.",{}],
  ["bush","exodus",-1446.5,"c. 1446 BC","The burning bush","Exodus 3:1-15","God calls Moses at Horeb and reveals his name: I AM THAT I AM.",{}],
  ["passover","exodus",-1446,"c. 1446 BC","Passover and the Exodus","Exodus 12:1-42","The firstborn of Egypt die; Israel, sheltered by the lamb’s blood, goes free.",{place:"a079b21",journey:"exodus",note:"This is the “early date,” from 1 Kings 6:1 (480 years before the temple). Many scholars prefer a 13th-century date, c. 1270–1260 BC; the dates of the patriarchs move with it."}],
  ["red-sea","exodus",-1445.9,"c. 1446 BC","Crossing the sea","Exodus 14:1-31","The waters part for Israel and close over Pharaoh’s army.",{}],
  ["sinai","exodus",-1445.8,"c. 1446 BC","The law given at Sinai","Exodus 19:1-20:21","At the mountain God gives the Ten Commandments and makes Israel his people.",{art:"sinai",place:"abfba2a"}],
  ["calf","exodus",-1445.7,"c. 1446 BC","The golden calf","Exodus 32:1-35","While Moses is on the mountain, Aaron makes an idol; Moses intercedes.",{}],
  ["tabernacle","exodus",-1445,"c. 1445 BC","The tabernacle set up","Exodus 40:1-38","The glory of the LORD fills the tent of meeting.",{}],
  ["spies","exodus",-1444,"c. 1444 BC","The twelve spies","Numbers 13:1-14:38","Ten spies spread fear; only Joshua and Caleb trust God. Forty years of wandering begin.",{place:"ac2cef0"}],
  ["serpent","exodus",-1407,"c. 1407 BC","The bronze serpent","Numbers 21:4-9","Those bitten look to the serpent on the pole and live.",{art:"bronze-serpent"}],
  ["moses-dies","exodus",-1406,"c. 1406 BC","Death of Moses","Deuteronomy 34:1-12","Moses sees the land from Mount Nebo and dies; Joshua takes his place.",{place:"aefaa2d"}],

  ["jordan","conquest",-1405.9,"c. 1406 BC","Crossing the Jordan","Joshua 3:1-4:24","The river stops as the ark goes in; Israel crosses into Canaan on dry ground.",{}],
  ["jericho","conquest",-1405.8,"c. 1406 BC","The fall of Jericho","Joshua 6:1-27","The walls fall at the trumpet blast; Rahab’s house is spared.",{}],
  ["division","conquest",-1399,"c. 1399 BC","The land divided","Joshua 14:1-5","The tribes receive their inheritance by lot.",{}],
  ["choose","conquest",-1375,"c. 1375 BC","“Choose you this day”","Joshua 24:1-28","At Shechem Joshua renews the covenant: “As for me and my house, we will serve the LORD.”",{place:"adf74d4"}],
  ["deborah","conquest",null,"","Deborah and Barak","Judges 4:1-5:31","A prophetess judges Israel and leads the victory over Sisera.",{note:"The judges’ dates are uncertain; some of their periods overlapped."}],
  ["gideon","conquest",null,"","Gideon","Judges 6:1-8:35","With three hundred men God routs the Midianites.",{}],
  ["samson","conquest",null,"","Samson","Judges 13:1-16:31","A Nazirite of great strength fights the Philistines.",{}],
  ["ruth","conquest",null,"","Ruth","Ruth 1:1-4:22","A Moabite widow’s loyalty brings her into the line of David.",{}],
  ["samuel","conquest",null,"","Samuel called","1 Samuel 3:1-21","“Speak; for thy servant heareth.” The boy in the tabernacle becomes a prophet.",{}],

  ["saul","kingdom",-1050,"c. 1050 BC","Saul made king","1 Samuel 10:1-27","Samuel anoints Saul as Israel’s first king.",{}],
  ["goliath","kingdom",null,"","David and Goliath","1 Samuel 17:1-58","The shepherd boy fells the giant in the name of the LORD of hosts.",{}],
  ["david-king","kingdom",-1010,"c. 1010 BC","David becomes king","2 Samuel 2:1-7","After Saul’s death David is anointed king over Judah at Hebron.",{place:"a85151a"}],
  ["jerusalem","kingdom",-1003,"c. 1003 BC","David takes Jerusalem","2 Samuel 5:1-10","David captures Zion and makes Jerusalem his capital.",{place:"a15257a"}],
  ["davidic","kingdom",-1000,"","God’s covenant with David","2 Samuel 7:1-17","God promises David a house and a throne established for ever.",{}],
  ["solomon","kingdom",-970,"c. 970 BC","Solomon becomes king","1 Kings 1:28-53","David’s son is anointed and asks God for wisdom.",{}],
  ["temple","kingdom",-966,"966–959 BC","The first temple","1 Kings 8:1-66","Solomon builds the house of the LORD; the cloud of glory fills it.",{}],

  ["split","divided",-931,"931 BC","The kingdom divides","1 Kings 12:1-24","Ten tribes follow Jeroboam; Judah stays with Rehoboam.",{}],
  ["carmel","divided",-860,"c. 860 BC","Elijah on Mount Carmel","1 Kings 18:20-40","Fire falls from heaven: “The LORD, he is God.”",{}],
  ["elisha","divided",-850,"c. 850 BC","Elisha takes up Elijah’s mantle","2 Kings 2:1-15","Elijah is taken up in a whirlwind; Elisha receives a double portion.",{}],
  ["jonah","divided",-760,"c. 760 BC","Jonah preaches in Nineveh","Jonah 3:1-10","The city repents, and God relents.",{place:"a70fd5d"}],
  ["isaiah","divided",-740,"c. 740 BC","Isaiah’s vision","Isaiah 6:1-13","In the year King Uzziah died, Isaiah sees the Lord: “Here am I; send me.”",{}],
  ["samaria","divided",-722,"722 BC","Israel falls to Assyria","2 Kings 17:1-23","Samaria is taken and the northern tribes are carried away.",{}],
  ["hezekiah","divided",-701,"701 BC","Jerusalem spared from Sennacherib","2 Kings 19:14-37","Hezekiah prays, and the angel of the LORD strikes the Assyrian camp.",{}],
  ["jeremiah","divided",-627,"627 BC","Jeremiah’s call","Jeremiah 1:1-19","“Before I formed thee in the belly I knew thee.”",{}],
  ["josiah","divided",-622,"622 BC","Josiah finds the book of the law","2 Kings 22:1-23:3","The law is read and the king leads Judah in renewing the covenant.",{}],

  ["daniel","exile",-605,"605 BC","Daniel taken to Babylon","Daniel 1:1-21","Nebuchadnezzar carries off young nobles; Daniel resolves not to defile himself.",{place:"a217d18"}],
  ["ezekiel","exile",-593,"593 BC","Ezekiel’s vision","Ezekiel 1:1-28","By the river Chebar the exiled priest sees the glory of God.",{}],
  ["fall-jerusalem","exile",-586,"586 BC","Jerusalem destroyed","2 Kings 25:1-21","Babylon burns the temple and the city; Judah goes into exile.",{place:"a15257a"}],
  ["furnace","exile",null,"","The fiery furnace","Daniel 3:1-30","Three friends refuse to bow and walk unharmed in the fire with a fourth.",{}],
  ["lions","exile",-539,"c. 539 BC","Daniel in the lions’ den","Daniel 6:1-28","Daniel keeps praying, and God shuts the lions’ mouths.",{}],

  ["cyrus","return",-538,"538 BC","Cyrus lets the exiles go home","Ezra 1:1-11","The Persian king decrees that the temple be rebuilt.",{}],
  ["second-temple","return",-516,"516 BC","The temple rebuilt","Ezra 6:13-22","Urged on by Haggai and Zechariah, the people finish and dedicate the house of God.",{}],
  ["esther","return",-479,"c. 479 BC","Esther made queen","Esther 2:16-18","“For such a time as this” — a Jewish queen in Persia saves her people.",{}],
  ["ezra","return",-458,"458 BC","Ezra returns","Ezra 7:1-10","The scribe sets his heart to study, do and teach the law of the LORD.",{}],
  ["walls","return",-445,"445 BC","Nehemiah rebuilds the walls","Nehemiah 2:1-20","The king’s cupbearer leads the rebuilding of Jerusalem’s walls in 52 days.",{}],
  ["malachi","return",-430,"c. 430 BC","Malachi","Malachi 4:1-6","The last of the Old Testament prophets promises Elijah before the day of the LORD.",{}],

  ["alexander","between",-333,"333 BC","Alexander conquers the East","Daniel 8:5-8","Greece overruns Persia — the he-goat of Daniel’s vision.",{note:"Daniel 8:21 names the goat as the king of Greece."}],
  ["dedication","between",-164,"164 BC","The temple rededicated","John 10:22","After the Maccabean revolt the temple is cleansed — remembered at the Feast of the Dedication (Hanukkah), which Jesus kept.",{}],
  ["herod","between",-37,"37 BC","Herod the Great made king","Matthew 2:1","Rome sets Herod over Judea; he will rebuild the temple on a grand scale.",{}],

  ["jesus-born","christ",-5,"c. 6–4 BC","The birth of Jesus","Luke 2:1-20","Born in Bethlehem and laid in a manger; angels announce good tidings to shepherds.",{place:"a112427",note:"Herod died in 4 BC, so Jesus was born a little before — our calendar’s year 1 is off by a few years."}],
  ["magi","christ",-4.9,"c. 5 BC","The wise men and the flight to Egypt","Matthew 2:1-23","Magi worship the child; Joseph takes his family to Egypt to escape Herod.",{}],
  ["boy-jesus","christ",8,"c. AD 8","Jesus in the temple at twelve","Luke 2:41-52","“Wist ye not that I must be about my Father’s business?”",{}],
  ["baptism","christ",28,"c. AD 26–29","The baptism of Jesus","Matthew 3:13-17","The Spirit descends like a dove: “This is my beloved Son.”",{note:"Two chronologies are common: ministry c. AD 26–30 with the crucifixion in AD 30, or c. AD 29–33 with the crucifixion in AD 33."}],
  ["temptation","christ",28.1,"","Tempted in the wilderness","Matthew 4:1-11","Forty days of fasting; Jesus answers the devil with Scripture.",{}],
  ["cana","christ",28.2,"","Water into wine at Cana","John 2:1-11","The first of his signs, and his disciples believe on him.",{}],
  ["nicodemus","christ",28.3,"","Jesus and Nicodemus","John 3:1-21","“Ye must be born again… For God so loved the world.”",{}],
  ["sermon","christ",28.5,"","The Sermon on the Mount","Matthew 5:1-7:29","The beatitudes, the Lord’s prayer, and the house built on the rock.",{}],
  ["five-thousand","christ",29,"","Feeding the five thousand","John 6:1-14","Five loaves and two fish: “I am the bread of life.”",{}],
  ["peter-confession","christ",29.3,"","Peter’s confession","Matthew 16:13-20","“Thou art the Christ, the Son of the living God.”",{place:"ab7bf48"}],
  ["transfiguration","christ",29.4,"","The transfiguration","Matthew 17:1-13","Jesus shines on the mountain with Moses and Elijah.",{}],
  ["lazarus","christ",29.8,"","Lazarus raised","John 11:1-44","“I am the resurrection, and the life.” Lazarus comes out of the tomb.",{}],
  ["entry","christ",29.9,"AD 30 or 33","The triumphal entry","Matthew 21:1-11","Jesus rides into Jerusalem on a colt: “Hosanna to the son of David.”",{}],
  ["supper","christ",29.95,"","The Last Supper","Luke 22:7-23","“This is my body which is given for you.”",{}],
  ["cross","christ",30,"AD 30 or 33","The crucifixion","John 19:16-37","“It is finished.” Jesus dies on the cross outside Jerusalem.",{place:"a15257a"}],
  ["resurrection","christ",30.01,"","The resurrection","John 20:1-18","The tomb is empty; Mary Magdalene meets the risen Lord.",{}],
  ["ascension","christ",30.1,"","The ascension","Acts 1:6-11","Jesus is taken up, promising the Spirit and his return.",{}],

  ["pentecost","church",30.2,"AD 30 or 33","Pentecost","Acts 2:1-41","The Spirit comes; Peter preaches and three thousand are baptized.",{}],
  ["stephen","church",34,"c. AD 34","Stephen martyred","Acts 7:54-60","The first martyr sees Jesus standing at God’s right hand.",{}],
  ["damascus","church",34.5,"c. AD 34","Saul meets Jesus","Acts 9:1-19","On the Damascus road the persecutor becomes the apostle.",{place:"a69c1d4"}],
  ["cornelius","church",38,"c. AD 38","Peter and Cornelius","Acts 10:1-48","The Spirit falls on Gentiles: God shows no partiality.",{}],
  ["journey1","church",46,"c. AD 46–48","Paul’s first journey","Acts 13:1-14:28","Barnabas and Saul are sent out from Antioch to Cyprus and Galatia.",{journey:"paul1"}],
  ["council","church",49,"c. AD 49","The council at Jerusalem","Acts 15:1-35","Gentile believers need not be circumcised — saved by grace, as Jews are.",{}],
  ["journey2","church",49.5,"c. AD 49–51","Paul’s second journey","Acts 15:36-18:22","The gospel crosses into Europe: Philippi, Thessalonica, Athens, Corinth.",{journey:"paul2"}],
  ["journey3","church",52,"c. AD 52–57","Paul’s third journey","Acts 18:23-21:16","Three years in Ephesus, then farewell to the elders at Miletus.",{journey:"paul3"}],
  ["arrest","church",57,"c. AD 57","Paul arrested in Jerusalem","Acts 21:27-36","A riot at the temple; Paul is taken into Roman custody.",{}],
  ["shipwreck","church",59,"c. AD 59–60","Voyage to Rome and shipwreck","Acts 27:1-28:16","Storm, shipwreck on Malta, and at last Rome.",{journey:"rome"}],
  ["rome","church",61,"c. AD 60–62","Paul preaches in Rome","Acts 28:30-31","Two years in his own hired house, preaching the kingdom of God unhindered.",{place:"afc8e7a"}],
  ["ad70","church",70,"AD 70","Jerusalem and the temple destroyed","Luke 21:5-24","Rome destroys the temple, as Jesus foretold: not one stone left upon another.",{note:"The event itself is recorded by historians such as Josephus; the passage is Jesus’ prophecy of it."}],
  ["patmos","church",95,"c. AD 95","John’s vision on Patmos","Revelation 1:9-20","Exiled for the word of God, John sees the risen Christ among the lampstands.",{place:"a8f60f3"}]
];

const TL={sel:null};
EXTRA_VIEWS.timeline=renderTimeline;
HOME_TOOLS.push({go:"timeline",title:"Timeline",sub:()=>"Creation to Patmos"});
EXTRA_ROUTES.timeline={hash:()=>"#/timeline"+(TL.sel?"/"+TL.sel:""), apply:parts=>{ TL.sel=parts[0]||null; }};

const tlPassage=r=>r.replace(/-/g,"–");
const tlBook=r=>(parsePassage(r)||{}).book;
function renderTimeline(){
  const v=$("#view"), reading=state.book;
  v.innerHTML=`<div class="tl-screen">
    <div class="tl-eras" role="navigation" aria-label="Eras">${TL_ERAS.map(e=>`<button data-era="${e[0]}">${esc(e[1])}</button>`).join("")}</div>
    <div class="tl-head"><h2>The story of the Bible</h2>
      <p>Not to scale. Dates before Solomon are approximate; where scholars differ widely, an event says so. Events from <b>${esc(reading)}</b>, the book you’re reading, are marked.</p></div>
    ${TL_ERAS.map(e=>{
      const art=e[4]&&artById(e[4]);
      const evs=TL_EVENTS.filter(x=>x[1]===e[0]);
      return `<section class="tl-era" id="era-${e[0]}"><div class="tl-era-head">
          <div><div class="tl-era-span">${esc(e[2])}</div><h3>${esc(e[1])}</h3><p>${esc(e[3])}</p></div>
          ${art&&!evs.some(x=>x[7].art===e[4])?`<button class="tl-era-art" data-art="${e[4]}" aria-label="${esc(art.title)}"><img src="${artSrc(art)}" alt="${esc(art.alt)}" loading="lazy"></button>`:""}
        </div>
        <ol class="tl-list">${evs.map(tlEventHTML).join("")}</ol></section>`;
    }).join("")}
    <div class="tl-foot">Dates follow the chronology used in most study Bibles (an early Exodus, c. 1446 BC). Passages are in the ${esc(TRANSLATIONS[state.trans].full)}.</div>
  </div>`;
  v.querySelectorAll(".tl-eras button").forEach(b=>b.onclick=()=>{ const el=$("#era-"+b.dataset.era); scrollToEl(el); });
  v.querySelectorAll("[data-read]").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.read));
  v.querySelectorAll("[data-place]").forEach(b=>b.onclick=()=>openPlace(b.dataset.place));
  v.querySelectorAll("[data-journey]").forEach(b=>b.onclick=()=>{ MAP.mode="journeys"; MAP.journey=b.dataset.journey; MAP.sel=null; MAP.fit=true; showView("maps"); });
  v.querySelectorAll("[data-art]").forEach(b=>b.onclick=()=>{ const i=ART.findIndex(a=>a.id===b.dataset.art); if(i>=0) openLightbox(i,ART); });
  v.querySelectorAll(".tl-ev").forEach(li=>li.querySelector(".tl-title").onclick=()=>{
    const open=!li.classList.contains("open");
    v.querySelectorAll(".tl-ev.open").forEach(x=>x.classList.remove("open"));
    li.classList.toggle("open",open);
    TL.sel=open?li.dataset.id:null; setRoute(EXTRA_ROUTES.timeline.hash(),true);
  });
  // Era chips follow the scroll.
  const chips=[...v.querySelectorAll(".tl-eras button")];
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ const id=e.target.id.slice(4);
    chips.forEach(c=>c.classList.toggle("on",c.dataset.era===id)); const on=chips.find(c=>c.dataset.era===id); if(on) on.scrollIntoView({block:"nearest",inline:"center"}); } }),{rootMargin:"-45% 0px -50% 0px"});
  v.querySelectorAll(".tl-era").forEach(s=>io.observe(s));
  // Open on the event in the address, otherwise on the first event from the book being read.
  const target=TL.sel&&v.querySelector(`.tl-ev[data-id="${CSS.escape(TL.sel)}"]`);
  if(target){ target.classList.add("open"); requestAnimationFrame(()=>scrollToEl(target)); }
  else{ const mine=v.querySelector(".tl-ev.mine"); if(mine&&state.book!=="Genesis") requestAnimationFrame(()=>scrollToEl(mine)); }
}
function scrollToEl(el){
  if(!el) return;
  const off=($("#topbar")||{offsetHeight:0}).offsetHeight+($(".tl-eras")||{offsetHeight:0}).offsetHeight+8;
  window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-off,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}
function tlEventHTML(e){
  const [id,,,date,title,ref,sum,x]=e, art=x.art&&artById(x.art), mine=tlBook(ref)===state.book;
  return `<li class="tl-ev${mine?" mine":""}${art?" has-art":""}" data-id="${id}">
    <div class="tl-dot"></div>
    <div class="tl-card">
      <button class="tl-title" aria-expanded="false"><span class="tl-date">${esc(date||"")}</span><span class="tl-name">${esc(title)}</span>${mine?'<span class="tl-mine">reading</span>':""}</button>
      <div class="tl-body">
        ${art?`<button class="tl-art" data-art="${x.art}"><img src="${artSrc(art)}" alt="${esc(art.alt)}" loading="lazy"></button>`:""}
        <p>${esc(sum)}</p>
        ${x.note?`<p class="tl-note">${esc(x.note)}</p>`:""}
        <div class="tl-acts"><button class="tl-btn" data-read="${esc(ref)}">Read ${esc(tlPassage(ref))}</button>
          ${x.place?`<button class="tl-btn ghost" data-place="${x.place}">📍 Map</button>`:""}
          ${x.journey?`<button class="tl-btn ghost" data-journey="${x.journey}">Follow the journey</button>`:""}</div>
      </div></div></li>`;
}
