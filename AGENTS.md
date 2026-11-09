# GPA Calculator — Agent Guide

## Repo structure

Static app: `index.html`, `css/style.css`, and Vanilla JS files in `js/`. Cloudflare Pages Functions live in `functions/`; deployable Google Apps Script source lives in `google-apps-script/`. There is no build step or linter; regression tests use the built-in Node test runner via `npm.cmd test` in Windows PowerShell.

Deployed on Cloudflare Pages. Opening `index.html` locally works for GPA features but not `/api/sync`.

## Page structure

Single scrolling page, no tabs. Three `<section class="panel">` in order:

| id | Purpose |
|----|---------|
| `#section-import` | Paste BKEL transcript, parse, apply |
| `#section-summary` | Cumulative GPA, chart, graduation goal, per-semester and retake tables |
| `#section-semesters` | Student name/MSSV plus the editable semester accordion |

Summary sits **above** the editor: it is what users come for. `renderAll()` renders both sections unconditionally; edits in `#section-semesters` re-render the summary (debounced 250ms via `scheduleSummary()` for typing, immediate for add/delete).

Import-apply scrolls to `#section-summary` with `scrollIntoView`.

## Data model (`data` object, persisted to `localStorage` key `gpaData`)

```js
{
  studentName: string,
  studentId: string,       // 7-12 digits, validated but never blocking
  targetGpa: string,
  expectedRemainingGpa: string, // default "3", used by improvement scenarios
  gradRequiredCredits: number,   // default 130
  semesters: [{ name: string, subjects: [{ name, credits, grade10 }] }]
}
```

`loadData()` deletes `scale` and `selectedUni` from anything it reads — leftovers from when the app supported multiple universities. The grade scale is no longer per-user state.

## Critical logic

- **Retake detection**: `isRetake()` checks if a subject name (lowercased, trimmed) appears in any earlier semester. Badge class: `retake-badge`.
- **Cumulative GPA**: `getUniqueSubjects()` groups by trimmed lowercase name, takes max `grade10` per group → only highest grade counts.
- **Before-improvement baseline**: `calcCumulativeOriginal()` takes first occurrence of each subject name.
- **BKEL parser** (`parseBKEL`): tab-separated text, header regex `/Năm học\s+(\d{4}\s*-\s*\d{4})\s*\/\s*Học kỳ\s+(\d+)/`. Columns: 0=STT, 2=name, 3=grade10, 4=letter, 5=credits. Filters out RT/DT/KD/VP/CH/CT grades, zero-credit subjects, and "Không in trên bảng điểm" status. Returns semesters reversed (portal newest-first → oldest-first).
- **Chart**: SVG viewBox, GPA10 normalized to 0-4 scale (÷2.5). Two lines: GPA4 (solid indigo), GPA10 (dashed emerald).
- **Grade scale**: fixed `HCMUT_SCALE` in `js/constants.js`, read directly by `findGrade()`. There is no scale editor and no university picker — the app is HCMUT-only.
- **Grade colour**: `gradeToneClass()` (`js/render.js`) maps an exact Hệ 4 value to one of 8 classes `g-4 g-35 g-3 g-25 g-2 g-15 g-1 g-0`. Each class sets `--g-fg`/`--g-bg`; `.data-table td.cell-letter[class*="g-"]` applies them. Keyed on the exact value, not a range, so each level is visually distinct; A+ and A share a colour because both are 4.0. `GRADE_TONES` in `google-apps-script/Code.gs` holds the same 8 hex pairs so the Sheet matches — **change both together**. Averaged GPAs (e.g. 3.25) match no level, so those use `gpaBandTone()` in the Apps Script instead.
- **Student info**: `validateStudentInfo()` only flags an invalid MSSV (red border + message). It never blocks input. Sync to Sheets skips itself when the MSSV is invalid, inside `syncParsedImport()`.
- **Semester accordion**: `saveExpandedState()`/`applySemesterStates()` preserves collapse state across re-renders via the `is-collapsed` class on `.semester-card`.
- **Constraints**: manual entry maxes out at 12 semesters and 12 subjects per semester. BKEL import and `/api/sync` accept up to 24 semesters and 50 subjects per semester; oversized imports are rejected before changing saved data.
- **Target GPA**: card in the summary section. Formula: `(target × totalRequired − currentGPA × currentCredits) / remainingCredits`. The three goal inputs update `#goal-result-content` and `#goal-scenarios-content` live after a short debounce without re-rendering the inputs.
- **Improvement scenarios**: `calculateImprovementScenarios()` projects graduation GPA using `expectedRemainingGpa`, then suggests up to three retake profiles (A, B+, mixed). Retakes replace the currently counted best attempt and never add credits. The UI aggregates selected real subjects into A/B+ credit totals and does not list subject names.

## Google Sheet sync

- Triggered after a successful BKEL parse; sync failure never blocks import-apply.
- Frontend obtains a Turnstile token and posts parsed semesters to `/api/sync`.
- `functions/api/sync.js` validates the request, verifies Turnstile, resolves each subject's letter/gpa4 against its server-owned HCMUT scale, flags `retake` (subject seen in an earlier semester) and `counted` (this instance is the highest grade, so it feeds cumulative GPA), then forwards the `schemaVersion: 2` record to Google Apps Script. Apps Script never re-derives grades.
- Google Apps Script writes **one tab per student**, named `Họ tên-MSSV`. MSSV is the sole identity key: a renamed student gets their tab renamed, never duplicated. Tab lookup order — stored name in the index row, then suffix scan for `-<MSSV>`, then insert.
- Each student tab: rows 1-4 identity, rows 6-7 cumulative summary, row 9 the subject table header (frozen), then all subjects with a bold per-semester summary row. Written in a single `setValues()`.
- An index tab (`INDEX_SHEET_NAME`, e.g. `TỔNG HỢP`) upserts one row per student by MSSV. The tab link uses `setRichTextValue().setLinkUrl()`, not a `HYPERLINK` formula — formula argument separators are locale-dependent (`;` in vi-VN) and would render `#ERROR!`.
- Script Properties: `SPREADSHEET_ID`, `INDEX_SHEET_NAME`, `API_SECRET`. No Drive access — the old JSON-file-on-Drive backup was removed.
- `safeSheetText()` prefixes `=+-@` to block formula injection; MSSV cells use number format `@`.

## Style conventions

- Vietnamese UI throughout.
- **No CSS framework and no icon font.** Tailwind and Phosphor CDNs were removed; `css/style.css` is hand-written and token-based (`--accent`, `--text`, `--border`, `--radius`, `--s1..--s7` on `:root`). Style with semantic class names, never utility classes. Icons are inline SVG with class `icon` and `aria-hidden="true"`; never put an icon inside `#import-parse` (its label is swapped via `textContent`).
- Font is Be Vietnam Pro from Google Fonts. Dark mode redefines the tokens in `@media (prefers-color-scheme: dark)` before the shell marker; never hard-code colours after it. See `DESIGN.md`.
- No gradients. Depth comes from `1px solid var(--border)` plus a soft resting shadow on `.panel`; nested cards stay flat and only interactive controls receive motion feedback.
- Colour carries meaning. Indigo is the single interface accent; green, amber, and red are reserved for semantic result states. Grade cells remain tinted per Hệ 4 level.
- No comments in code per preference.
- All event bindings in `bindEvents()`; markup built as template strings in `js/render.js`, escaped with `esc()`.
- render → collect → save pattern: `renderAll()` calls `validateStudentInfo()` + `renderSemesters()` + `renderSummary()`.

## Git workflow

- When the user asks to push Git changes, do not combine all work into one large commit. Split it into coherent commits by concern (for example: runtime logic, tests, and documentation) before pushing.
- Keep every commit independently understandable and avoid mixing unrelated pre-existing user changes into those commits.
