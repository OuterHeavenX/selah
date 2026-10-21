# Selah — ASV Study Bible (prototype)

Phone-first Bible study web app. John is the curated showcase; the full
Protestant canon ships as readable text.

## What's in v0.1
- Reader: full ASV and WEB text (66 books, standard 31,102-verse
  numbering), Psalm titles and Psalm 119 letter headings, chapter
  navigation, tap any verse for the study sheet.
- Verse sheet tabs: **Cross-refs** (11,714 ranked refs across John),
  **Parallels** (14 Gospel parallel sets, side-by-side),
  **Words** (tap a word → every occurrence in John or the whole Bible),
  **Mark** (4 highlight colors + study notes, saved on-device).
- Search: whole-Bible text search with highlighted snippets.
- Christ: curated trails through John — the seven "I AM" sayings,
  titles of Christ, prophecies fulfilled, the seven signs,
  and a 12-verse "spine of John".
- Images: artwork in Bible order, full-screen viewer, links to the passage;
  the same pieces rotate on the Home screen.
- Book view (iPad landscape / wide screens ≥900px): two pages side by side
  with a 3D page turn — drag, swipe, tap the page edge, or use the arrow keys.
  Chapters flow into each other; a toggle switches back to scrolling.
  Lives in `book.js`.
- Saved: highlights + notes list. Light/dark themes.

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
- Both translations share one verse grid, so highlights, notes and
  cross-refs (keyed "Book C:V") stay on the same verse when switching.
- `data/xrefs_john.json` — OpenBible.info cross-reference data (CC-BY),
  derived primarily from the Treasury of Scripture Knowledge. John-sourced
  rows only, deduped, ranked by votes, capped at 50/verse.
- `data/study_john.json` — hand-curated: parallels + Christology trails.

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
- Cross-refs for the whole canon (currently John only).
- Strong's word studies (needs a tagged text decision: KJV+Strong's vs ASV).
- "Mirroring verses": parallel view is built; chiasmus marking is open.
- NASB text: copyrighted by the Lockman Foundation — needs a license;
  the app is translation-agnostic, so licensed text drops into bible.json.
