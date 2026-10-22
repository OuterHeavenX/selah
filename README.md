# Selah — ASV Study Bible (prototype)

Phone-first Bible study web app. John is the curated showcase; the full
Protestant canon ships as readable text.

## What's in v0.1
- Reader: full ASV and WEB text (66 books, standard 31,102-verse
  numbering), Psalm titles and Psalm 119 letter headings, chapter
  navigation, tap any verse for the study sheet.
- Verse sheet tabs: **Cross-refs** (342,694 ranked refs across the whole Bible),
  **Parallels** (14 Gospel parallel sets, side-by-side),
  **Words** (tap a word → every occurrence in John or the whole Bible),
  **Mark** (4 highlight colors + study notes, saved on-device).
- Settings (⚙, or tap the translation badge): translation (ASV, WEB, KJV),
  side-by-side second translation (stacked on phones, two columns on wide
  screens, inline in book view), text size, book view, theme Light/Dark/Auto,
  read-aloud speed, commentary on/off and source (`settings.js`; other
  features add their own section to `SETTINGS_SECTIONS`).
- Commentary tab: Jamieson-Fausset-Brown (default) or Matthew Henry, the note
  covering the tapped verse, plus the chapter and book introductions and every
  note on the chapter; references inside notes are links. Switchable off in
  Settings (`commentary.js`).
- Maps (`maps.js`, Home → Maps, `#/maps`): a parchment map of the biblical world
  with 1,247 places. Search a place to see where it is, how certain the location
  is and every verse that names it; follow six journeys stop by stop (Abraham,
  the Exodus, Paul's three journeys, the voyage to Rome); or see the places in
  the chapter you're reading. Pinch/drag/wheel to zoom; the verse sheet's
  Cross-refs tab links the places named in a verse. Feature screens register
  through `EXTRA_VIEWS`, `HOME_TOOLS` and `EXTRA_ROUTES`.
- Timeline (`timeline.js`, Home → Timeline, `#/timeline/<event>`): 98 events in 11
  eras from Creation to Patmos, each linked to its passage and, where they exist,
  its artwork, map place or journey. Conservative study-Bible dates (early Exodus
  c. 1446 BC); Genesis 1–11 undated; disputed dates carry a note. Events from the
  book you're reading are marked.
- Memory verses (`memory.js`, `#/memory`): add from the verse sheet (Mark →
  Memorize) or by reference; flash-card review with a first-letters hint and a
  Leitner schedule (1, 2, 4, 7, 14, 30, 60 days). Journal (`journal.js`,
  `#/journal`): entries with linked passages, autosave, a S.O.A.P. guide, search;
  start one from any verse. Both sync and back up through `SYNC_STORES`
  (items `mv:<id>`, `jn:<id>`); the Mark tab takes extra buttons via `MARK_ACTIONS`.
- Hebrew / Greek tab: every verse's original words in order — original script,
  transliteration, English gloss, Strong's number. Tap a word for its lexicon
  entry (definition, parsing of that form, every verse that uses it).
- Search (`search.js`): three modes, each with its own address (`#/search?q=…&m=heb&in=nt`).
  **Words** — phrase search in the current translation, falling back to verses
  with all the words; **Hebrew & Greek** — find a word by Strong's number (G26,
  H430), the word, its transliteration (agape, chesed) or meaning (love) and list
  every verse using it; **Topics** — Nave's Topical Bible, 5,319 topics A–Z, with
  passages readable in place. Words and Hebrew & Greek narrow to a testament or
  a book. The Cross-refs tab also lists the Nave's topics that cite the verse.
- Christ: curated trails — John (I AM sayings, titles, prophecies, signs,
  the spine of John), Matthew's fulfilment quotations, the parables, the
  mighty works in Mark, Old Testament promises of the Messiah, Psalms read
  of Christ, and the early church's hymns in the letters.
- Images: a picture Bible — a timeline per book (Genesis has all 20 major
  stories laid out, 4 illustrated so far; Exodus, Numbers, the Prophets),
  numbered scenes on each poster link to their verses, full-screen viewer.
  Pieces marked `home:true` also rotate on the Home screen (`pictures.js`).
- Book view (iPad landscape / wide screens ≥900px): two pages side by side
  with a 3D page turn — drag, swipe, tap the page edge, or use the arrow keys.
  Chapters flow into each other; a toggle switches back to scrolling.
  Lives in `book.js`.
- Reading plans: John in 21 days, Gospels in 30, Psalms & Proverbs in 60,
  NT in 90, Bible in a year — today's reading on Home, checkmarks, streak.
  Days are balanced by verse count (`plans.js`).
- Read aloud: ▶ Listen in the reader uses the device's built-in voices,
  highlights the verse being read, follows it (scrolling or turning book
  pages) and continues into the next chapter; 0.8–1.4× speed (`readaloud.js`).
- Share as image: ⇪ in the verse sheet (or "Share this verse" in Mark) makes
  a 4:5 card — Parchment, Ink or Artwork style, 1–6 verses — and opens the
  share sheet or downloads a PNG (`share.js`).
- Sync: Saved → Sync between devices. Email + password sign-in (Supabase
  project "Selah"); highlights, notes and plan progress sync automatically,
  newest change per item wins, deletions sync too, works offline and catches
  up later (`sync.js`, table `public.user_data`, function `selah_sync`).
- Links and back button: every screen has an address (`#/read/John/3/16`,
  `#/images/Genesis`, `#/search?q=grace` …); shared verse links open straight
  to the passage; the phone's back button closes the verse sheet / picture
  viewer first, then steps back through screens (`router.js`).
- Saved: highlights + notes list, plus Backup: save a file with highlights,
  notes and plan progress and restore it on another device (merges, never
  deletes). Light/dark themes.

## Data
- `data/bible.json` — American Standard Version (1901), public domain.
  Rebuilt 2026-10-21 from scrollmapper/bible_databases `ASV.json`, which keeps
  standard (KJV) verse numbering. Verses the ASV omits (Matt 17:21, John 5:4,
  Acts 8:37, …) are kept as empty strings so numbering never shifts; the app
  shows them as "not in the ASV text". Psalm titles live in each book's
  optional `headings` map (`"3:1": "A Psalm of David…"`), not in verse 1.
- `data/web.json` — World English Bible, public domain. Realigned to the same
  31,102-verse numbering (Romans doxology moved from 14:24-26 to 16:25-27;
  Luke 17:36, Acts 8:37, 15:34, 24:7 kept as empty slots), leaked "(Elohim)"
  footnotes removed and curly-quote spacing repaired.
- `data/orig/NN.json` (one per book, 01 = Genesis … 66 = Revelation) and
  `data/lex/XNN.json` (lexicon + concordance, bucketed by Strong's number) —
  built by `tools/build_lexicon.py` from STEPBible Data (Tyndale House,
  Cambridge, CC BY 4.0): TAHOT/TAGNT tagged texts and the TBESH/TBESG brief
  lexicons. Loaded only when a verse's Hebrew/Greek tab is opened.
- Both translations share one verse grid, so highlights, notes and
  cross-refs (keyed "Book C:V") stay on the same verse when switching.
- `data/xrefs/NN.json` — OpenBible.info cross-references for the whole Bible
  (CC BY), derived primarily from the Treasury of Scripture Knowledge. One file
  per book, loaded when that book is opened; negative-voted rows dropped,
  ranked by votes, capped at 50 per verse. Built by `tools/build_xrefs.py`.
- `data/kjv.json` — King James Version (1769), public domain, from
  scrollmapper/bible_databases; Psalm titles split into `headings`
  (`tools/build_kjv.py`).
- `data/comm/jfb/NN.json`, `data/comm/mh/NN.json` — Jamieson, Fausset & Brown
  (1871) and Matthew Henry (1706–1721), public domain, via bible.helloao.org.
  `{intro, ch:{"3":[[startVerse,endVerse,html],…]}}`; row [0,0] is the chapter
  introduction (JFB puts its verse-1 notes there). Matthew Henry has no Song of
  Solomon in this edition. Built by `tools/build_commentary.py`, which also turns
  references like "Co1 13:4" into links (only when the verse exists). "Download
  everything" saves only the commentary chosen in Settings.
- `data/topics.json` — Nave's Topical Bible (1896) from BibleData by Brady
  Stephenson (CC BY 4.0, `NavesTopicalDictionary.csv`): `{t:[[name,[[depth,label,refs,see?]…]]…]}`,
  refs as verse ids (ranges as `[first,last]`). `data/lexindex.json` — every
  Hebrew/Greek word `[strong, lemma, translit, gloss, uses]`. Both built by
  `tools/build_topics.py`.
- `data/mapbase.json`, `data/places.json` — Natural Earth 1:10m land, lakes and
  rivers (public domain) and OpenBible.info Bible Geocoding Data (CC BY 4.0), the
  best-scored identification per place with a 0–2 confidence, plus the journeys.
  Built by `tools/build_maps.py` (own clipping and simplification, no GIS libraries).
- `data/study.json` — hand-curated: 45 Gospel parallel sets and 11 study
  trails (John; Matthew, Mark & Luke; Old Testament; the letters).

## Regenerate data
Raw downloads live in `data/raw/` (kept out of the app). The build script
logic is documented in the 2026-10-19 session; rerun pieces as needed.

## Deploy
Static files — serve the repo root over HTTPS (GitHub Pages).
No build step, no backend.

Offline + install: `manifest.webmanifest`, icons in `img/icons/`, and the
service worker `sw.js`. The ASV, study data and artwork are cached on first
visit; Hebrew/Greek, lexicons, cross-references and the WEB are cached as
they're used, or all at once from Saved → Offline → Download everything
(list in `data/files.json`, rebuilt by `tools/build_offline_list.py`).

Versioning — keep these in step:
- Code or style change: bump the `?v=` on every script/stylesheet in
  `index.html` **and** `SHELL_V` in `sw.js` (same number).
- Anything in `data/` or `img/art/` changed: bump `DATA_V` in **both**
  `app.js` and `sw.js`, then rerun `tools/build_offline_list.py`.

## Sync backend (Supabase)
Project `Selah` (ref `vxhoiyjodwzjzvfrbqvv`, free plan, us-east-2).
- `public.user_data(user_id, items jsonb, updated_at)` with row-level security:
  each signed-in user can only read and write their own row.
- `public.selah_sync(changes jsonb)` merges changed items (newest `t` wins per
  item) and returns the user's full item map; callable by signed-in users only.
- The page uses the project's publishable key (safe to ship); there is no
  server code. Auth settings → URL Configuration must list the site URL so
  confirmation and password-reset emails link back here.
- Free projects pause after about a week without use; restore from the
  dashboard and sync resumes (the app keeps working locally meanwhile).

## Art
`img/art/*.jpg` (900px wide), described in `pictures.js`:
- `ART` — each piece (title, passage, caption, alt text, numbered `panels`
  with their verses, and `home:true` if it should rotate on Home).
- `PICTURE_BOOKS` — each book's stories in order; set `art:"<id>"` on a story
  to show its picture (stories without art show as "picture to come").
After adding art: bump `DATA_V` in `app.js` and `sw.js`, and rerun
`tools/build_offline_list.py`.

## Roadmap
- "Mirroring verses": parallel view is built; chiasmus marking is open.
- NASB text: copyrighted by the Lockman Foundation — needs a license;
  the app is translation-agnostic, so licensed text drops into bible.json.
