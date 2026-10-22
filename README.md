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
- Hebrew / Greek tab: every verse's original words in order — original script,
  transliteration, English gloss, Strong's number. Tap a word for its lexicon
  entry (definition, parsing of that form, every verse that uses it).
- Search: whole-Bible text search with highlighted snippets.
- Christ: curated trails — John (I AM sayings, titles, prophecies, signs,
  the spine of John), Matthew's fulfilment quotations, the parables, the
  mighty works in Mark, Old Testament promises of the Messiah, Psalms read
  of Christ, and the early church's hymns in the letters.
- Images: artwork in Bible order, full-screen viewer, links to the passage;
  the same pieces rotate on the Home screen.
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
- `data/study.json` — hand-curated: 45 Gospel parallel sets and 11 study
  trails (John; Matthew, Mark & Luke; Old Testament; the letters).

## Regenerate data
Raw downloads live in `data/raw/` (kept out of the app). The build script
logic is documented in the 2026-10-19 session; rerun pieces as needed.

## Deploy
Static files — serve the repo root over HTTPS (GitHub Pages).
No build step, no backend. When any file in `data/` changes, bump `DATA_V`
in `app.js` and the `?v=` on `app.js`/`style.css` in `index.html` so phones
don't keep stale cached copies.

## Art
`img/art/*.jpg` (900px wide). Listed in the `ART` array in `app.js` in the
order the scenes appear in Scripture; the Home slideshow and the Images tab
both read from it. To add a piece, drop the JPEG in `img/art/` and insert an
entry (title, passage, caption, alt text) at its place in the story.

## Roadmap
- "Mirroring verses": parallel view is built; chiasmus marking is open.
- NASB text: copyrighted by the Lockman Foundation — needs a license;
  the app is translation-agnostic, so licensed text drops into bible.json.
