"use strict";
/* Selah — Bible trivia (Home → Bible trivia, #/trivia).
   Rounds of 10. Question kinds:
     • hand-written questions, each tied to the passage that answers it (TRIVIA_Q)
     • Finish the verse — a well-known verse cut in two; pick the true ending (from the translation being read)
     • Which book? — a well-known verse; pick the book it's in
   Every hand-written question carries a key word (k) that must appear in its passage; a test checks them all,
   so an answer can always be shown in Scripture. After each answer the verse is shown with a link to read it. */

// [question, answer, [3 wrong answers], passage, "ot"|"nt", difficulty 1-3, key word found in the passage]
const TRIVIA_Q=[
 ["On which day did God make the sun, moon and stars?","The fourth day",["The first day","The third day","The sixth day"],"Genesis 1:14-19","ot",1,"fourth"],
 ["What did God make from the rib he took from Adam?","A woman",["A garden","An altar","The animals"],"Genesis 2:21-22","ot",1,"rib"],
 ["Who was the first son of Adam and Eve?","Cain",["Abel","Seth","Enoch"],"Genesis 4:1","ot",1,"Cain"],
 ["Who lived 969 years, longer than anyone else in the Bible?","Methuselah",["Noah","Adam","Enoch"],"Genesis 5:27","ot",2,"Methuselah"],
 ["Which man “walked with God: and he was not; for God took him”?","Enoch",["Elijah","Noah","Abel"],"Genesis 5:24","ot",2,"Enoch"],
 ["What were the names of Noah’s three sons?","Shem, Ham and Japheth",["Cain, Abel and Seth","Abram, Nahor and Haran","Reuben, Simeon and Levi"],"Genesis 6:10","ot",1,"Japheth"],
 ["How many days and nights did it rain in the flood?","Forty",["Seven","Twelve","A hundred and fifty"],"Genesis 7:12","ot",1,"forty"],
 ["What came back to Noah with an olive leaf in its mouth?","A dove",["A raven","A sparrow","An eagle"],"Genesis 8:11","ot",1,"olive"],
 ["What sign did God give that he would never again flood the earth?","A bow in the cloud",["A star in the east","A pillar of fire","A burning bush"],"Genesis 9:13","ot",1,"bow"],
 ["What was the name of Abram’s wife?","Sarai",["Rebekah","Rachel","Hagar"],"Genesis 11:29","ot",1,"Sarai"],
 ["Who looked back at Sodom and became a pillar of salt?","Lot’s wife",["Sarah","Lot’s daughter","Hagar"],"Genesis 19:26","ot",1,"pillar of salt"],
 ["How old was Abraham when Isaac was born?","A hundred",["Seventy-five","Ninety","A hundred and twenty"],"Genesis 21:5","ot",2,"hundred"],
 ["What did Esau sell his birthright for?","Bread and a pottage of lentils",["Thirty pieces of silver","A flock of sheep","His father’s blessing"],"Genesis 25:29-34","ot",2,"pottage"],
 ["Where did Jacob dream of a ladder reaching to heaven?","Bethel",["Beer-sheba","Hebron","Shechem"],"Genesis 28:12-19","ot",2,"Beth-el"],
 ["How many years did Jacob serve Laban for Rachel?","Fourteen",["Seven","Twenty","Ten"],"Genesis 29:20-30","ot",3,"seven years"],
 ["How many sons did Jacob have?","Twelve",["Ten","Seven","Thirteen"],"Genesis 35:22","ot",2,"twelve"],
 ["What did Jacob give Joseph that made his brothers jealous?","A coat of many colors",["A signet ring","A silver cup","The birthright"],"Genesis 37:3-4","ot",1,"coat"],
 ["Which brother suggested selling Joseph instead of killing him?","Judah",["Reuben","Benjamin","Simeon"],"Genesis 37:26-27","ot",3,"Judah"],
 ["For how many pieces of silver was Joseph sold?","Twenty",["Thirty","Ten","Fifty"],"Genesis 37:28","ot",2,"twenty"],
 ["In Pharaoh’s dream, seven thin cows ate up seven…","Fat cows",["Ears of grain","Sheep","Lions"],"Genesis 41:4","ot",2,"kine"],
 ["What was found hidden in Benjamin’s sack?","Joseph’s silver cup",["Gold coins","A dagger","A stolen idol"],"Genesis 44:2-12","ot",2,"cup"],
 ["Who found baby Moses in the river?","Pharaoh’s daughter",["Miriam","His mother","Zipporah"],"Exodus 2:5-6","ot",1,"daughter of Pharaoh"],
 ["What did God tell Moses to take off at the burning bush?","His shoes",["His cloak","His ring","His turban"],"Exodus 3:5","ot",1,"shoes"],
 ["Who was Moses’ brother?","Aaron",["Hur","Jethro","Korah"],"Exodus 4:14","ot",1,"Aaron"],
 ["What was the first plague on Egypt?","The water turned to blood",["Frogs","Locusts","Darkness"],"Exodus 7:20","ot",1,"blood"],
 ["What was the last plague on Egypt?","The death of the firstborn",["Hail","Boils","Darkness"],"Exodus 12:29","ot",1,"first-born"],
 ["Which sea did God part for Israel?","The Red Sea",["The Dead Sea","The Sea of Galilee","The Great Sea"],"Exodus 15:4","ot",1,"Red Sea"],
 ["What bread did God send from heaven in the wilderness?","Manna",["Matzah","Showbread","Barley loaves"],"Exodus 16:31","ot",1,"Manna"],
 ["Where did God give the Ten Commandments?","Mount Sinai",["Mount Carmel","Mount Zion","The Mount of Olives"],"Exodus 19:20","ot",1,"Sinai"],
 ["Who made the golden calf?","Aaron",["Moses","Joshua","Korah"],"Exodus 32:1-4","ot",1,"calf"],
 ["How many men did Moses send to spy out Canaan?","Twelve",["Two","Seven","Forty"],"Deuteronomy 1:23","ot",2,"twelve"],
 ["Which two spies said Israel could take the land?","Joshua and Caleb",["Moses and Aaron","Eldad and Medad","Nadab and Abihu"],"Numbers 14:6","ot",1,"Caleb"],
 ["What did Moses lift up on a pole so the bitten people could live?","A serpent of brass",["A golden calf","The ark","A lamb"],"Numbers 21:9","ot",1,"serpent"],
 ["What animal spoke to Balaam?","His donkey",["A serpent","A camel","A raven"],"Numbers 22:28","ot",2,"ass"],
 ["Who led Israel into the promised land after Moses died?","Joshua",["Caleb","Aaron","Gideon"],"Joshua 1:1-2","ot",1,"Joshua"],
 ["Who hid the two spies on her roof in Jericho?","Rahab",["Deborah","Ruth","Jael"],"Joshua 2:1-6","ot",1,"Rahab"],
 ["Which city’s walls fell down after Israel marched around it?","Jericho",["Ai","Jerusalem","Hebron"],"Joshua 6:1-20","ot",1,"Jericho"],
 ["Which judge tested God with a fleece?","Gideon",["Samson","Barak","Ehud"],"Judges 6:36-40","ot",1,"fleece"],
 ["How many men did Gideon take into battle against Midian?","Three hundred",["Ten thousand","Twelve","Seven hundred"],"Judges 7:7","ot",2,"three hundred"],
 ["As a Nazirite, what must never touch Samson’s head?","A razor",["Oil","Wine","A crown"],"Judges 16:17","ot",2,"razor"],
 ["Who betrayed Samson to the Philistines?","Delilah",["Jael","Rahab","Michal"],"Judges 16:18","ot",1,"Delilah"],
 ["Who said, “Thy people shall be my people, and thy God my God”?","Ruth",["Naomi","Orpah","Esther"],"Ruth 1:16","ot",1,"thy God my God"],
 ["Whom did Ruth marry?","Boaz",["Obed","Elimelech","Jesse"],"Ruth 4:13","ot",1,"Boaz"],
 ["Who was Samuel’s mother?","Hannah",["Peninnah","Elisabeth","Rachel"],"1 Samuel 1:20","ot",1,"Hannah"],
 ["Who was Israel’s first king?","Saul",["David","Samuel","Solomon"],"1 Samuel 10:21-24","ot",1,"Saul"],
 ["Who was David’s father?","Jesse",["Obed","Boaz","Saul"],"1 Samuel 16:1","ot",1,"Jesse"],
 ["What instrument did David play to calm Saul?","The harp",["The trumpet","The flute","Cymbals"],"1 Samuel 16:23","ot",1,"harp"],
 ["What did David use to bring down Goliath?","A sling and a stone",["A spear","A sword","A bow"],"1 Samuel 17:49-50","ot",1,"sling"],
 ["Who was Saul’s son and David’s closest friend?","Jonathan",["Abner","Absalom","Ish-bosheth"],"1 Samuel 18:1","ot",1,"Jonathan"],
 ["Which prophet told David a story about a poor man’s lamb?","Nathan",["Gad","Samuel","Elijah"],"2 Samuel 12:1-7","ot",2,"Nathan"],
 ["What did Solomon ask God to give him?","An understanding heart",["Riches","A long life","Victory over his enemies"],"1 Kings 3:9","ot",1,"understanding"],
 ["Who built the first temple in Jerusalem?","Solomon",["David","Zerubbabel","Herod"],"1 Kings 6:1","ot",1,"Solomon"],
 ["Which queen came to test Solomon with hard questions?","The queen of Sheba",["Jezebel","Esther","Vashti"],"1 Kings 10:1","ot",2,"Sheba"],
 ["Which wicked queen was married to King Ahab?","Jezebel",["Athaliah","Vashti","Michal"],"1 Kings 16:31","ot",2,"Jezebel"],
 ["What fed Elijah by the brook Cherith?","Ravens",["Doves","An angel","A widow"],"1 Kings 17:6","ot",2,"ravens"],
 ["On which mountain did Elijah face the prophets of Baal?","Mount Carmel",["Mount Sinai","Mount Hermon","Mount Nebo"],"1 Kings 18:19-20","ot",2,"Carmel"],
 ["How was Elijah taken up into heaven?","By a whirlwind",["In his sleep","On a cloud","Up a ladder"],"2 Kings 2:11","ot",1,"whirlwind"],
 ["Who asked for a double portion of Elijah’s spirit?","Elisha",["Gehazi","Jehu","Obadiah"],"2 Kings 2:9","ot",1,"Elisha"],
 ["In which river did Naaman dip seven times to be healed?","The Jordan",["The Nile","The Euphrates","The Abanah"],"2 Kings 5:14","ot",2,"Jordan"],
 ["Which eight-year-old became king, and later found the book of the law?","Josiah",["Joash","Hezekiah","Uzziah"],"2 Kings 22:1-8","ot",3,"Josiah"],
 ["Who led the rebuilding of Jerusalem’s walls after the exile?","Nehemiah",["Ezra","Zerubbabel","Haggai"],"Nehemiah 2:17","ot",2,"wall"],
 ["Which Jewish queen of Persia saved her people?","Esther",["Vashti","Bathsheba","Abigail"],"Esther 2:17","ot",1,"Esther"],
 ["Who raised Esther as his own daughter?","Mordecai",["Haman","Ahasuerus","Hegai"],"Esther 2:7","ot",2,"Mordecai"],
 ["Which man of Uz lost everything yet did not curse God?","Job",["Lot","Jonah","Naboth"],"Job 1:1-22","ot",1,"Job"],
 ["Psalm 23 begins, “The LORD is my…”","Shepherd",["Light","Rock","Fortress"],"Psalms 23:1","ot",1,"shepherd"],
 ["Whose proverbs open the book of Proverbs?","Solomon’s",["David’s","Agur’s","Lemuel’s"],"Proverbs 1:1","ot",2,"Solomon"],
 ["Which prophet said, “Here am I; send me”?","Isaiah",["Jeremiah","Ezekiel","Amos"],"Isaiah 6:8","ot",1,"send me"],
 ["Which prophet saw a valley of dry bones come to life?","Ezekiel",["Daniel","Isaiah","Joel"],"Ezekiel 37:1-10","ot",2,"bones"],
 ["Who were thrown into the fiery furnace?","Shadrach, Meshach and Abed-nego",["Peter, James and John","Shem, Ham and Japheth","Eldad, Medad and Hur"],"Daniel 3:19-23","ot",1,"Meshach"],
 ["What wrote on the wall at Belshazzar’s feast?","The fingers of a man’s hand",["An angel with a sword","Daniel","A burning coal"],"Daniel 5:5","ot",2,"fingers"],
 ["Why was Daniel thrown into the lions’ den?","He kept praying to his God",["He broke the king’s idol","He refused the king’s food","He hid the king’s enemies"],"Daniel 6:10-16","ot",1,"prayed"],
 ["To which city did God send Jonah?","Nineveh",["Tarshish","Joppa","Babylon"],"Jonah 1:2","ot",1,"Nineveh"],
 ["What swallowed Jonah?","A great fish",["A sea serpent","A crocodile","Leviathan"],"Jonah 1:17","ot",1,"great fish"],
 ["Which prophet foretold that a ruler would come from Bethlehem?","Micah",["Malachi","Hosea","Nahum"],"Micah 5:2","ot",3,"lehem"],
 ["Which book closes the Old Testament?","Malachi",["Zechariah","Haggai","Nehemiah"],"Malachi 1:1","ot",1,"Malachi"],

 ["In which town was Jesus born?","Bethlehem",["Nazareth","Jerusalem","Capernaum"],"Matthew 2:1","nt",1,"Bethlehem"],
 ["What gifts did the wise men bring?","Gold, frankincense and myrrh",["Silver, wine and oil","Gold, silver and bronze","Bread, wine and salt"],"Matthew 2:11","nt",1,"myrrh"],
 ["Who was the mother of John the Baptist?","Elisabeth",["Mary","Anna","Salome"],"Luke 1:57-60","nt",2,"Elisabeth"],
 ["Which aged prophetess saw the baby Jesus in the temple?","Anna",["Elisabeth","Lydia","Dorcas"],"Luke 2:36-38","nt",3,"Anna"],
 ["In which river was Jesus baptized?","The Jordan",["The Nile","The Euphrates","The Kidron"],"Matthew 3:13","nt",1,"Jordan"],
 ["How many days did Jesus fast in the wilderness?","Forty",["Seven","Twelve","Three"],"Matthew 4:2","nt",1,"forty"],
 ["What work did Peter and Andrew do when Jesus called them?","They were fishermen",["They were tax collectors","They were tentmakers","They were shepherds"],"Matthew 4:18","nt",1,"fishers"],
 ["Which disciple was a tax collector?","Matthew",["Thomas","Philip","Bartholomew"],"Matthew 9:9","nt",2,"Matthew"],
 ["How many apostles did Jesus choose?","Twelve",["Seven","Seventy","Three"],"Luke 6:13","nt",1,"twelve"],
 ["What was Jesus’ first sign in John’s Gospel?","Turning water into wine",["Healing a blind man","Feeding the five thousand","Walking on the sea"],"John 2:1-11","nt",1,"signs"],
 ["Who came to Jesus by night and heard, “Ye must be born anew”?","Nicodemus",["Zacchaeus","Lazarus","Joseph of Arimathaea"],"John 3:1-7","nt",1,"Nicodemus"],
 ["In Jesus’ parable, which seed is the least, yet grows into a tree?","The mustard seed",["The fig seed","The olive pit","The wheat grain"],"Matthew 13:31-32","nt",1,"mustard"],
 ["How many loaves did the boy have when Jesus fed the five thousand?","Five",["Seven","Twelve","Three"],"John 6:9","nt",1,"five"],
 ["How many baskets of leftovers were gathered after feeding the five thousand?","Twelve",["Seven","Five","Three"],"John 6:13","nt",2,"twelve"],
 ["Who walked on the water toward Jesus?","Peter",["John","Andrew","Thomas"],"Matthew 14:29","nt",1,"Peter"],
 ["Whose head did Herodias’ daughter ask for?","John the Baptist’s",["Peter’s","Stephen’s","James’s"],"Matthew 14:8","nt",2,"Baptist"],
 ["In the parable, who stopped to help the man beaten on the road?","A Samaritan",["A priest","A Levite","An innkeeper"],"Luke 10:30-34","nt",1,"Samaritan"],
 ["Which sister sat at Jesus’ feet while Martha served?","Mary",["Joanna","Susanna","Salome"],"Luke 10:39","nt",1,"Mary"],
 ["In the parable of the lost son, what job did he take when his money ran out?","Feeding swine",["Fishing","Keeping sheep","Collecting taxes"],"Luke 15:15","nt",2,"swine"],
 ["How many lepers did Jesus heal, of whom only one came back to give thanks?","Ten",["Seven","Twelve","Five"],"Luke 17:12-17","nt",2,"ten"],
 ["Who climbed a sycamore tree to see Jesus?","Zacchaeus",["Bartimaeus","Nicodemus","Matthew"],"Luke 19:1-4","nt",1,"sycomore"],
 ["What did Jesus put on the eyes of the man born blind?","Clay",["Oil","Water from the Jordan","A cloth"],"John 9:6","nt",2,"clay"],
 ["Whom did Jesus raise after four days in the tomb?","Lazarus",["Jairus’ daughter","The widow’s son","Dorcas"],"John 11:39-44","nt",1,"Lazarus"],
 ["What did Jesus call the first and great commandment?","Love the Lord thy God with all thy heart",["Honor thy father and thy mother","Remember the sabbath day","Thou shalt not kill"],"Matthew 22:37-38","nt",2,"heart"],
 ["Jesus said, “I am the way, and the truth, and the…”","Life",["Light","Door","Vine"],"John 14:6","nt",1,"life"],
 ["Who betrayed Jesus?","Judas Iscariot",["Peter","Thomas","Barabbas"],"Matthew 26:14-16","nt",1,"Judas"],
 ["For how many pieces of silver was Jesus betrayed?","Thirty",["Twenty","Forty","Fifty"],"Matthew 26:15","nt",1,"thirty"],
 ["Who denied Jesus three times?","Peter",["Judas","Thomas","John"],"Matthew 26:69-75","nt",1,"thrice"],
 ["Which governor sentenced Jesus?","Pontius Pilate",["Herod","Caiaphas","Felix"],"Matthew 27:1-2","nt",1,"Pilate"],
 ["Which prisoner was released instead of Jesus?","Barabbas",["Simon","Onesimus","Ananias"],"Matthew 27:26","nt",1,"Barabbas"],
 ["Who was made to carry Jesus’ cross?","Simon of Cyrene",["Joseph of Arimathaea","John","Nicodemus"],"Luke 23:26","nt",2,"Cyrene"],
 ["Who first met the risen Jesus at the tomb in John’s Gospel?","Mary Magdalene",["Peter","Mary his mother","Salome"],"John 20:14-18","nt",2,"Magdalene"],
 ["Which disciple would not believe until he saw Jesus’ wounds?","Thomas",["Philip","Peter","Nathanael"],"John 20:25-27","nt",1,"Thomas"],
 ["From which mount did Jesus ascend into heaven?","The mount called Olivet",["Mount Sinai","Mount Tabor","Mount Zion"],"Acts 1:9-12","nt",3,"Olivet"],
 ["What sat upon the disciples at Pentecost?","Tongues like fire",["Crowns of gold","Doves","Haloes of light"],"Acts 2:3","nt",1,"fire"],
 ["About how many were added to the church at Pentecost?","Three thousand",["Five hundred","Twelve thousand","A hundred and twenty"],"Acts 2:41","nt",2,"three thousand"],
 ["Who was the first Christian martyr?","Stephen",["James","Peter","Philip"],"Acts 7:59","nt",1,"Stephen"],
 ["Philip explained Isaiah to an official from which land?","Ethiopia",["Egypt","Persia","Cyprus"],"Acts 8:27","nt",2,"Ethiopians"],
 ["Where was Saul going when a light from heaven blinded him?","Damascus",["Antioch","Tarsus","Jericho"],"Acts 9:3","nt",1,"Damascus"],
 ["Where were the disciples first called Christians?","Antioch",["Jerusalem","Rome","Ephesus"],"Acts 11:26","nt",2,"Antioch"],
 ["Who was sent out with Saul on the first missionary journey?","Barnabas",["Silas","Timothy","Luke"],"Acts 13:2","nt",2,"Barnabas"],
 ["Who prayed and sang hymns with Paul in the Philippian jail?","Silas",["Barnabas","Timothy","Peter"],"Acts 16:25","nt",1,"Silas"],
 ["Which young man fell from a window while Paul preached late?","Eutychus",["Onesimus","Tychicus","Erastus"],"Acts 20:9","nt",3,"Eutychus"],
 ["On which island was Paul shipwrecked?","Melita (Malta)",["Crete","Cyprus","Patmos"],"Acts 28:1","nt",2,"Melita"],
 ["What fastened on Paul’s hand on Malta without harming him?","A viper",["A scorpion","A crab","A dog"],"Acts 28:3","nt",1,"viper"],
 ["Which chapter says love “suffereth long, and is kind”?","1 Corinthians 13",["Romans 8","John 3","Hebrews 11"],"1 Corinthians 13:4","nt",1,"kind"],
 ["Paul lists the fruit of the Spirit in which letter?","Galatians",["Ephesians","Philippians","Colossians"],"Galatians 5:22","nt",2,"fruit of the Spirit"],
 ["In the armor of God, what is the sword of the Spirit?","The word of God",["Faith","Prayer","Truth"],"Ephesians 6:17","nt",1,"word of God"],
 ["Paul called which young pastor his “true child in faith”?","Timothy",["Titus","Philemon","Silas"],"1 Timothy 1:2","nt",2,"Timothy"],
 ["Which runaway slave is the subject of Paul’s letter to Philemon?","Onesimus",["Tychicus","Epaphras","Demas"],"Philemon 1:10","nt",3,"Onesimus"],
 ["Which chapter recounts heroes of faith: “By faith Abel… by faith Enoch…”?","Hebrews 11",["James 2","Romans 4","Galatians 3"],"Hebrews 11:4-5","nt",2,"By faith"],
 ["On which island did John receive the Revelation?","Patmos",["Crete","Cyprus","Malta"],"Revelation 1:9","nt",1,"Patmos"],
 ["To how many churches did John write in Revelation?","Seven",["Twelve","Three","Four"],"Revelation 1:11","nt",1,"seven"]
];
// Well-known verses for "Finish the verse" and "Which book?"
const TRIVIA_VERSES=["Genesis 1:1","Genesis 1:27","Exodus 20:3","Deuteronomy 6:5","Joshua 1:9","1 Samuel 16:7","Psalms 1:1","Psalms 19:1","Psalms 23:1","Psalms 27:1","Psalms 46:1","Psalms 46:10","Psalms 119:105","Psalms 121:1","Proverbs 3:5","Proverbs 22:6","Ecclesiastes 3:1","Isaiah 9:6","Isaiah 40:31","Isaiah 53:5","Isaiah 53:6","Jeremiah 29:11","Lamentations 3:22","Micah 6:8","Matthew 5:3","Matthew 5:14","Matthew 6:33","Matthew 7:7","Matthew 11:28","Matthew 28:19","Mark 10:45","Luke 2:11","John 1:1","John 3:16","John 8:32","John 10:11","John 11:25","John 14:6","John 15:5","Acts 1:8","Romans 3:23","Romans 5:8","Romans 6:23","Romans 8:28","Romans 12:2","1 Corinthians 13:4","2 Corinthians 5:17","Galatians 2:20","Ephesians 2:8","Philippians 4:13","Colossians 3:23","Hebrews 11:1","Hebrews 13:8","James 1:22","1 Peter 5:7","1 John 1:9","1 John 4:8","Revelation 21:4","Revelation 22:13"];
const TRIVIA_MODES=[["mixed","Mixed","A bit of everything"],["ot","Old Testament","Genesis to Malachi"],["nt","New Testament","Matthew to Revelation"],["finish","Finish the verse","Famous verses, cut in two"],["book","Which book?","Name the book a verse is in"]];

const TRV={round:null, mode:store.get("triviaMode","mixed")};
EXTRA_VIEWS.trivia=renderTrivia;
HOME_TOOLS.push({go:"trivia",title:"Bible trivia",open:()=>{ TRV.round=null; },sub:()=>{ const b=store.get("triviaBest",{}), top=Math.max(0,...Object.values(b)); return top?`Best score ${top}/10`:"Test what you know"; }});
EXTRA_ROUTES.trivia={hash:()=>"#/trivia", apply:()=>{ TRV.round=null; }};

const shuffle=a=>{ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function verseFor(r){ const p=parsePassage(r); return p?passageVerses(p):[]; }
// Split a verse at a word boundary near the middle: [start, ending].
function splitVerse(t){
  const w=t.split(" "); if(w.length<6) return null;
  const k=Math.max(3,Math.min(w.length-3,Math.round(w.length*0.5)));
  return [w.slice(0,k).join(" "), w.slice(k).join(" ")];
}
const clip=(s,n=110)=>s.length>n?s.slice(0,n).replace(/\s+\S*$/,"")+"…":s;
function makeFinish(used){
  const pool=shuffle(TRIVIA_VERSES.filter(r=>!used.has(r)&&textOf(r)));
  for(const r of pool){
    const sp=splitVerse(textOf(r)); if(!sp) continue;
    const others=shuffle(TRIVIA_VERSES.filter(x=>x!==r&&textOf(x))).map(x=>splitVerse(textOf(x))).filter(Boolean).map(x=>clip(x[1])).filter(e=>e!==clip(sp[1])).slice(0,3);
    used.add(r);
    return {kind:"finish", q:`“${sp[0]} …”`, sub:"Finish the verse", answer:clip(sp[1]), wrong:others, ref:r, d:2};
  }
  return null;
}
function makeBook(used){
  const pool=shuffle(TRIVIA_VERSES.filter(r=>!used.has(r)&&textOf(r)));
  const r=pool[0]; if(!r) return null; used.add(r);
  const book=parseRef(r).book, nt=bookNum(book)>39;
  const same=BOOKS.filter(b=>b.name!==book&&(bookNum(b.name)>39)===nt).map(b=>b.name);
  return {kind:"book", q:`“${clip(textOf(r),220)}”`, sub:"Which book is this verse in?", answer:book, wrong:shuffle(same).slice(0,3), ref:r, d:2};
}
function makeRound(mode){
  const used=new Set(), qs=[];
  const hand=t=>shuffle(TRIVIA_Q.filter(q=>!t||q[4]===t)).map(q=>({kind:"q",q:q[0],answer:q[1],wrong:q[2],ref:q[3],d:q[5]}));
  if(mode==="finish") for(let i=0;i<10;i++){ const x=makeFinish(used); if(x) qs.push(x); }
  else if(mode==="book") for(let i=0;i<10;i++){ const x=makeBook(used); if(x) qs.push(x); }
  else if(mode==="ot"||mode==="nt") qs.push(...hand(mode).slice(0,10));
  else{
    const h=hand(null);
    // mixed: 7 questions (easy first), a Finish the verse and a Which book
    const easy=h.filter(x=>x.d===1), rest=h.filter(x=>x.d>1);
    qs.push(...easy.slice(0,4),...rest.slice(0,3));
    const f=makeFinish(used), b=makeBook(used); if(f) qs.push(f); if(b) qs.push(b);
    qs.push(...rest.slice(3,4));
    qs.sort((a,b2)=>a.d-b2.d);
  }
  return {mode, qs:qs.slice(0,10).map(x=>({...x, opts:shuffle([x.answer,...x.wrong])})), i:0, score:0, streak:0, best:0, picked:null, missed:[]};
}

function renderTrivia(){
  const v=$("#view"), R=TRV.round;
  if(!R){
    const best=store.get("triviaBest",{});
    v.innerHTML=`<div class="trv-screen"><div class="trv-head"><h2>Bible trivia</h2><p>Ten questions a round. Every answer comes with the verse that settles it.</p></div>
      <div class="trv-modes">${TRIVIA_MODES.map(([k,t,s])=>`<button class="trv-mode${k===TRV.mode?" on":""}" data-m="${k}"><b>${esc(t)}</b><span>${esc(s)}</span>${best[k]!=null?`<i>Best ${best[k]}/10</i>`:""}</button>`).join("")}</div>
      <button class="btn-primary trv-start" id="trvStart">Start</button>
      <div class="trv-foot">${TRIVIA_Q.length} questions written from Scripture, plus ${TRIVIA_VERSES.length} well-known verses — quoted from the ${esc(TRANSLATIONS[state.trans].full)}.</div></div>`;
    v.querySelectorAll(".trv-mode").forEach(b=>b.onclick=()=>{ TRV.mode=b.dataset.m; store.set("triviaMode",TRV.mode); v.querySelectorAll(".trv-mode").forEach(x=>x.classList.toggle("on",x===b)); });
    $("#trvStart").onclick=()=>{ TRV.round=makeRound(TRV.mode); renderTrivia(); };
    return;
  }
  if(R.i>=R.qs.length) return renderTriviaEnd();
  const q=R.qs[R.i], answered=R.picked!=null, vs=answered?verseFor(q.ref):[];
  v.innerHTML=`<div class="trv-screen trv-play">
    <div class="trv-top"><button class="lex-back" id="trvQuit">‹ Quit</button>
      <div class="trv-progress" aria-label="Question ${R.i+1} of ${R.qs.length}">${R.qs.map((_,k)=>`<i class="${k<R.i?"done":k===R.i?"now":""}"></i>`).join("")}</div>
      <span class="trv-score">${R.score} pt${R.score===1?"":"s"}${R.streak>1?` · 🔥 ${R.streak}`:""}</span></div>
    <div class="trv-card"><div class="trv-sub">${esc(q.sub||(q.d===3?"Harder":q.d===2?"Medium":"Warm-up"))}</div><div class="trv-q${q.kind!=="q"?" quote":""}">${verseHTML(q.q)}</div></div>
    <div class="trv-opts">${q.opts.map((o,k)=>{ const cls=!answered?"":o===q.answer?" right":o===R.picked?" wrong":" dim";
      return `<button class="trv-opt${cls}" data-k="${k}" ${answered?"disabled":""}><span class="trv-l">${"ABCD"[k]}</span>${esc(o)}</button>`; }).join("")}</div>
    ${answered?`<div class="trv-answer ${R.picked===q.answer?"ok":"no"}"><b>${R.picked===q.answer?"Right!":"Not quite — it’s "+esc(q.answer.replace(/^(A|An|The) /,w=>w.toLowerCase()))+"."}</b>
        <div class="trv-verse"><span>${esc(q.ref.replace(/-/g,"–"))}</span> ${vs.slice(0,4).map(x=>verseHTML(x.text)).join(" ")}${vs.length>4?"…":""}</div>
        <div class="trv-next"><button class="btn-ghost" id="trvRead">Read in context</button><button class="btn-primary" id="trvNext">${R.i+1<R.qs.length?"Next question":"See your score"}</button></div></div>`:""}
  </div>`;
  $("#trvQuit").onclick=()=>{ TRV.round=null; renderTrivia(); };
  v.querySelectorAll(".trv-opt").forEach(b=>b.onclick=()=>{
    if(R.picked!=null) return;
    R.picked=q.opts[+b.dataset.k];
    if(R.picked===q.answer){ R.score++; R.streak++; R.best=Math.max(R.best,R.streak); } else { R.streak=0; R.missed.push(q); }
    renderTrivia(); const a=$(".trv-answer"); if(a) a.scrollIntoView({block:"nearest",behavior:"smooth"});
  });
  const nx=$("#trvNext"); if(nx){ nx.onclick=()=>{ R.i++; R.picked=null; renderTrivia(); window.scrollTo(0,0); }; nx.focus({preventScroll:true}); }
  const rd=$("#trvRead"); if(rd) rd.onclick=()=>gotoVerse(q.ref);
}
function renderTriviaEnd(){
  const v=$("#view"), R=TRV.round, best=store.get("triviaBest",{}), prev=best[R.mode];
  if(!R.saved){ R.saved=true; R.newBest=prev==null||R.score>prev; if(R.newBest){ best[R.mode]=R.score; store.set("triviaBest",best); } }
  const msg=R.score===10?"A perfect round!":R.score>=8?"Excellent — you know your Bible.":R.score>=5?"Well done.":"Every round is a chance to learn — read the verses below.";
  v.innerHTML=`<div class="trv-screen"><div class="trv-end"><div class="trv-big">${R.score}<small>/${R.qs.length}</small></div>
      <h2>${msg}</h2>${R.newBest&&R.score>0?'<div class="trv-badge">New best</div>':""}${R.best>2?`<p>Longest streak: ${R.best}</p>`:""}
      <div class="trv-next"><button class="btn-primary" id="trvAgain">Play again</button><button class="btn-ghost" id="trvMenu">Choose a round</button></div></div>
    ${R.missed.length?`<div class="lbl" style="padding:0 16px">Worth reading</div><div class="trv-missed">${R.missed.map(q=>`<button class="trv-m" data-r="${esc(q.ref)}"><span class="trv-m-q">${esc(q.kind==="q"?q.q:q.sub)}</span><span class="trv-m-a">${esc(q.answer)} — ${esc(q.ref.replace(/-/g,"–"))}</span></button>`).join("")}</div>`:""}</div>`;
  $("#trvAgain").onclick=()=>{ TRV.round=makeRound(R.mode); renderTrivia(); };
  $("#trvMenu").onclick=()=>{ TRV.round=null; renderTrivia(); };
  v.querySelectorAll(".trv-m").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}
