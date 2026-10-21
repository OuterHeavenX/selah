# Selah — ASV Study Bible (prototype)

Phone-first Bible study web app. John is the curated showcase; the full
Protestant canon ships as readable text.

## What's in v0.1
- Reader: full ASV text (66 books, 31,086 verses), chapter navigation,
  tap any verse for the study sheet.
- Verse sheet tabs: **Cross-refs** (11,714 ranked refs across John),
  **Parallels** (14 Gospel parallel sets, side-by-side),
  **Words** (tap a word → every occurrence in John or the whole Bible),
  **Mark** (4 highlight colors + study notes, saved on-device).
- Search: whole-Bible text search with highlighted snippets.
- Christ: curated trails through John — the seven "I AM" sayings,
  titles of Christ, prophecies fulfilled, the seven signs,
  and a 12-verse "spine of John".
- Saved: highlights + notes list. Light/dark themes.

## Data
- `data/bible.json` — American Standard Version (1901), public domain.
  Built from thiagobodruk/bible `en_asv.json` (book names were localized;
  remapped to English via abbrev table).
- `data/xrefs_john.json` — OpenBible.info cross-reference data (CC-BY),
  derived primarily from the Treasury of Scripture Knowledge. John-sourced
  rows only, deduped, ranked by votes, capped at 50/verse.
- `data/study_john.json` — hand-curated: parallels + Christology trails.

## Regenerate data
Raw downloads live in `data/raw/` (kept out of the app). The build script
logic is documented in the 2026-10-19 session; rerun pieces as needed.

## Deploy
Static files — serve the repo root over HTTPS (GitHub Pages).
No build step, no backend.

## Roadmap
- Cross-refs for the whole canon (currently John only).
- Strong's word studies (needs a tagged text decision: KJV+Strong's vs ASV).
- "Mirroring verses": parallel view is built; chiasmus marking is open.
- NASB text: copyrighted by the Lockman Foundation — needs a license;
  the app is translation-agnostic, so licensed text drops into bible.json.
