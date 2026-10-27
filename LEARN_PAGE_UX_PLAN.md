# Learn page UI/UX improvement plan

Prepared: 2026-10-27  
Page: https://lld-with-ui.vercel.app/learn  
Status: implemented locally; final CI and deployed verification pending.

## Goal

Make the page answer three questions immediately: **Where should I start? Where
did I leave off? What should I learn next?** Give learners quick access to useful
content, with the same visual care as the project's home page and the related
learning applications.

This plan covers the `/learn` landing page, its catalog/navigation behavior and
the connections into existing lessons. The content delivery roadmap remains in
`LLD_LEARNING_CURRICULUM_PLAN.md`.

## What the current review found

Reviewed the deployed React page, catalog source, theme styles and lesson progress
storage. Captured light/dark desktop and mobile layouts at 1440px and 390px.
Backend reads were isolated during the visual review; this was not a backend
availability test. Screenshots and measurements are under
`/home/prem/validation/lld-learn-ux-plan/`.

1. **The useful controls arrive late.** A large introduction, progress explanation
   and availability callout appear before search and the first lesson. Search fell
   below the first screen in the reviewed mobile layout.
2. **The catalog mixes learning with publication planning.** The deployed version
   shows ten available lessons among 69 topics. Many sections contain only a
   planned-topic disclosure, making the page long without offering an action.
3. **Cards provide little help choosing.** Most repeat the same learning-process
   subtitle and Available label. Entire card contents are underlined, weakening
   the title/description/metadata hierarchy.
4. **The recommended sequence is hard to see.** Catalog grouping differs from the
   prerequisite-aware publication order; constructors appear far down the current
   fundamentals group even though the guided sequence teaches them earlier.
5. **Personal navigation is limited.** Resume does not name the last opened topic
   on the landing page. Bookmarking requires opening a lesson, and there are no
   reviewed/not-reviewed or section filters.
6. **Discovery state is temporary.** Search and bookmark filters live only in the
   page component, so returning from a lesson can require finding the same place
   again.
7. **The visual treatment needs refinement.** Excess vertical space, repetitive
   outlined rows and a heavy initial heading-focus rectangle make the experience
   feel more like a document index than a learning destination.

The additional lessons under development should flow into the redesign through
the canonical manifest. Counts and availability must reflect the actual deployed
publication state rather than a fixed number from this review.

## Proposed experience

### 1. A compact, useful first screen — highest priority

- Keep the page title and a short value statement.
- For a new visitor, offer one clear **Start learning** action, naming the first
  published lesson from the manifest.
- For a returning visitor, show a **Continue learning** card with the last opened
  lesson title, its reading estimate and a direct link.
- Offer a smaller **Next unreviewed lesson** suggestion based on the guided
  publication order. Prerequisites provide guidance rather than access locks.
- Show a compact count such as “3 of 16 available lessons marked reviewed.” A
  subtle progress bar can visualize this personal checklist, with its meaning
  available in text. It must not imply mastery or completion of planned topics.
- Move detailed storage/publication explanations into a concise, expandable
  “About this curriculum” area. Keep actual storage failures visible.

Use only recorded information: the app knows the last opened lesson, bookmarks
and review marks. It does not know reading position or minutes remaining.

### 2. Separate available learning from the roadmap

Provide two clearly named views:

| View | Purpose | Behavior |
|---|---|---|
| Available lessons — default | Find something useful to open now | Published lessons only; sections without published content stay out of this view. |
| Full roadmap | Understand the complete curriculum | All canonical topics, grouped with explicit Available/Planned labels and expandable planned sections. |

Keep a small roadmap link/count visible from the default view so future coverage
is discoverable. Planned topics must not look like failed links, locked lessons,
or already completed content. Preserve proposed-addition labels.

### 3. Clear catalog navigation and filters

- Desktop: a compact curriculum rail beside the catalog. Group pattern and
  concurrency subcategories under readable parent sections.
- Mobile/tablet: replace the rail with an accessible section selector and compact
  filters; avoid a wide desktop sidebar squeezed into the page.
- Search title, section and short lesson outcome. Use curated manifest metadata
  for summaries; catalog browsing must not load every lesson content chunk.
- Support section, review status and bookmarked filters, plus an explicit sort:
  **Recommended order** by default and **Alphabetical** as an alternative.
- Show active filters, an accurate available-result count and one Clear filters
  action. Empty states should explain how to recover and offer the roadmap when
  matches exist only among planned topics.
- Put shareable, non-sensitive discovery state in URL query parameters. Restore
  filters, scroll position and appropriate focus when returning from a lesson.
  Learner notes and answers must never appear in URLs.

### 4. Lesson cards that help users choose

Use a consistent card hierarchy:

1. Lesson title and a restrained section/sequence cue.
2. One sentence describing the learning outcome.
3. Reading estimate and relevant prerequisite guidance.
4. Reviewed/bookmarked indicators when applicable, with a clear opening action.

Use a two-column grid where space supports readable cards and a single column on
phones. Add deliberate spacing and consistent hover/focus treatment. Remove
blanket underlining from supporting card text while keeping navigation obvious.

Add a bookmark toggle directly on each available lesson card. Use an article with
separate navigation and action elements, following the home page's corrected
interaction structure: buttons must not be nested inside links. Bookmark actions
must preserve saved notes and other lesson metadata.

Do not invent difficulty ratings or mastery badges. Reading times, prerequisite
IDs and publication order come from `curriculum.js`.

### 5. Responsive visual polish and accessibility

- Reuse the existing light/dark theme tokens, accent controls, radii, typography
  and component conventions from the refreshed module library.
- Make search and the learning action visible near the top of ordinary mobile
  screens; keep explanations concise enough to support this.
- Use restrained section icons and status accents with text equivalents.
- Refine the heading-focus treatment while preserving accessible route focus;
  avoid the heavy full-width outline as the default visual presentation.
- Keep keyboard focus visible, controls at least 44px high, and text/status
  contrast at least 4.5:1 in both themes.
- Make sticky navigation account for the shared header and never obscure focused
  cards, section headings or results. Mobile controls must not trap scrolling.
- Keep the shared Learning Home/DSA/LLD/HLD/CS navigation and theme control
  consistent. Review the prominence of developer utilities on this learner page.

## Proposed layout

Desktop:

```text
Shared learning navigation and theme
Breadcrumb

Learn low-level design          Start / Continue lesson
Short introduction             Next unreviewed suggestion
Compact review checklist

Available lessons | Full roadmap
Search                       Filters / Sort

Curriculum sections     Lesson card       Lesson card
                        Lesson card       Lesson card
                        ...

About the curriculum / browser storage details
```

Mobile:

```text
Shared navigation
Title and short introduction
Start / Continue card
Compact review checklist
Available lessons | Full roadmap
Search
Section / Filters
Lesson cards in one column
About the curriculum
```

The visible layout is the same for new and returning learners; the primary action
adapts to saved state. The all-reviewed state offers review/practice actions and
accurately describes currently published content.

## Implementation order

| Phase | Deliverable | Review gate |
|---|---|---|
| 1 — Hierarchy and layout | Compact hero, correctly named Start/Continue action, available/roadmap separation, card layout and responsive structure | Review desktop/mobile in both themes with real manifest data. |
| 2 — Discovery | Section navigation, search metadata, review/bookmark filters, recommended/alphabetical sorting and empty states | Verify combinations, planned-only matches, keyboard use and URL/back navigation. |
| 3 — Personal continuity | Named resume, next-unreviewed suggestion, card bookmarks and return scroll/focus | Verify fresh, returning, all-reviewed and storage-failure states; preserve notes and existing progress. |
| 4 — Final verification | Accessibility, performance, regression checks and deployment review | Green required CI and actual deployed route/resource checks before closing the page review. |

Keep commits reviewable by concern. Use the repository's branch/PR workflow;
merge only after the required checks pass.

## Expected files and boundaries

- `frontend/src/pages/Learn.jsx`: landing-page composition and navigation behavior.
- Catalog-specific components/styles if separation improves maintainability;
  keep catalog styling scoped so lesson reading pages retain their verified layout.
- `frontend/src/learning/curriculum.js`: small catalog metadata additions, keeping
  this the single publication/prerequisite source.
- Lesson progress hook only where catalog actions require safe metadata updates.
  Preserve `lld-lessons-v1`, current notes, bookmarks, review marks and resume data.
- Relevant catalog/navigation/storage tests and `COMPLETION_HANDOFF.md` evidence.

Backend business logic and curriculum publication are separate workstreams. The
redesign must accommodate new lessons without declaring unfinished topics complete.
Analytics page visits continue through the existing React integration; filter URLs
must retain query/fragment redaction. Actual Vercel collection remains a separate
dashboard/deployment verification item.

## Acceptance checks

- A fresh visitor can identify and open the starting lesson without interpreting
  the full roadmap. A returning visitor sees the actual last opened title.
- Available/roadmap counts, review denominators, durations and links match the
  manifest, including when additional lessons are published.
- Search and filters preserve input focus; Clear filters recovers from empty
  results. A planned-only match is explained without presenting an available link.
- Back navigation restores discovery context and a sensible focus/scroll target.
- Bookmarking a card does not navigate, change review status or overwrite saved
  notes. Existing progress survives the redesign; storage problems remain explicit.
- Recommended order respects published prerequisites; every lesson stays directly
  accessible. Review marks remain a personal checklist.
- Verify light/dark at 320, 390, 768, 1280 and 1440px, keyboard-only operation,
  browser zoom, reduced motion, text contrast and absence of page-level overflow.
- Catalog browsing remains independent of backend availability and lazy-loads
  lesson content only on entry. Failed imports retain explicit recovery.
- Run the required frontend/backend suites, lint, production build and existing
  chunk budgets. Record browser evidence and perform deployed checks after release.

## Definition of done

The redesigned page has passed the checks above and its deployed behavior has
been reviewed. This closes the `/learn` landing-page UX work; the separate full
curriculum and 60-module completion plans retain their own delivery gates.


## Implementation evidence — 2026-10-27

Implemented the compact named Start/Continue card, available/roadmap views,
metadata-only outcome search, section/review/bookmark filters, recommended and
alphabetical order, independent card bookmark buttons and URL discovery state.
Catalog departure positions are bounded in tab memory (30 entries); breadcrumb,
previous/next/prerequisite links and browser Back preserve discovery context.
After a full reload, filters remain in the URL but precise departure positions
are intentionally not persisted. Notes never enter navigation state or URLs.

The rail stays in normal flow to avoid covering focused content. Mobile uses a
section selector. Clear filters and removing a card from bookmarked results move
focus to stable controls; returning from the hero restores the hero action.
The all-reviewed state remains visible on mobile and links to system practice.

The progress hook now merges metadata with the latest stored notes and retains
unsaved drafts/warnings when writes fail or another tab broadcasts (RCA-122).
The key and normalized schema are unchanged. localStorage is not transactional
and cross-device synchronization is not provided.

Local production-build browser evidence is in
`/home/prem/validation/lld-learn-redesign/`: 60 scenario views across ten
light/dark × 320/390/768/1280/1440 contexts, plus 16 all-reviewed, bookmark,
storage-failure and 200% CSS-zoom views. No page-level overflow or application
exceptions were observed. Checked catalog text/control contrast was at least
5.00:1. CSS zoom is reflow evidence, not a claim of testing browser chrome zoom.
Search begins at approximately 782px on a 390px viewport (previously 1135px),
and 696px at 1440px (previously 904px). Screenshot heights were 1000px.

The harness serves built assets without starting an application server and
returns unavailable API responses. It verifies backend-independent browsing;
it does not prove hosted backend availability or deployed asset MIME types.
Curriculum publication stays at the manifest's ten lessons; separate unpublished
lesson work is not included in this UI change. Actual analytics collection still
requires its separate Vercel dashboard/deployment check.

Local checks passed: 2622 backend tests, 801 frontend tests across 51 files, Maven
package, lint (zero errors; 14 existing warnings), production build and chunk
budgets (entry 313174 bytes; largest non-entry 57287 bytes).
