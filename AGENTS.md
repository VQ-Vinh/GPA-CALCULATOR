# GPA Calculator — Agent Guide

## Repo structure

Static app: `index.html`, `css/style.css`, and Vanilla JS files in `js/`. Cloudflare Pages Functions live in `functions/`; deployable Google Apps Script source lives in `google-apps-script/`. No build step, tests, or linters.

Deployed on Cloudflare Pages. Opening `index.html` locally works for GPA features but not `/api/sync`.

## Tab indices (0-based)

| Index | Tab | Notes |
|-------|-----|-------|
| 0 | Hướng dẫn | static guide, no data |
| 1 | Thang điểm | grade scale editor |
| 2 | Nhập tự động | BKEL import |
| 3 | Học kỳ | semester & subject editor |
| 4 | Tổng kết | cumulative summary + chart |

`switchTab(n)` — import-apply calls `switchTab(3)` to land on Học kỳ. `renderSummary()` triggers at index 4. Collect/save data on tabs 1 and 3.

## Data model (`data` object, persisted to `localStorage` key `gpaData`)

```js
{
  studentName: string,
  studentId: string,       // 7-12 digits
  selectedUni: string,     // backward-compat, may be ''
  scale: [{ from, to, letter, gpa4 }],
  semesters: [{ name: string, subjects: [{ name, credits, grade10 }] }]
}
```

## Critical logic

- **Retake detection**: `isRetake()` checks if a subject name (lowercased, trimmed) appears in any earlier semester. Badge class: `retake-badge`.
- **Cumulative GPA**: `getUniqueSubjects()` groups by trimmed lowercase name, takes max `grade10` per group → only highest grade counts.
- **Before-improvement baseline**: `calcCumulativeOriginal()` takes first occurrence of each subject name.
- **BKEL parser** (`parseBKEL`): tab-separated text, header regex `/Năm học\s+(\d{4}\s*-\s*\d{4})\s*\/\s*Học kỳ\s+(\d+)/`. Columns: 0=STT, 2=name, 3=grade10, 4=letter, 5=credits. Filters out RT/DT/KD/VP/CH/CT grades, zero-credit subjects, and "Không in trên bảng điểm" status. Returns semesters reversed (portal newest-first → oldest-first).
- **Chart**: SVG viewBox, GPA10 normalized to 0-4 scale (÷2.5). Two lines: GPA4 (solid indigo), GPA10 (dashed emerald).
- **Student info lock**: semester tab blocked until `studentName` non-empty and `studentId` matches `/^\d{7,12}$/`.
- **Semester accordion**: `saveExpandedState()`/`applySemesterStates()` preserves collapse state across re-renders.
- **Constraints**: max 12 semesters, max 12 subjects per semester.
- **Target GPA**: section in summary tab. Formula: `(target × totalRequired − currentGPA × currentCredits) / remainingCredits`. Needs `data.targetGpa` and `data.gradRequiredCredits` (default 130). Button `#apply-goal` triggers `renderSummary()` re-render.

## Google Sheet sync

- Triggered after a successful BKEL parse; sync failure never blocks import-apply.
- Frontend obtains a Turnstile token and posts parsed semesters plus the current scale to `/api/sync`.
- `functions/api/sync.js` validates the request, verifies Turnstile, resolves each subject's letter/gpa4 against the scale, flags `retake` (subject seen in an earlier semester) and `counted` (this instance is the highest grade, so it feeds cumulative GPA), then forwards the `schemaVersion: 2` record to Google Apps Script. Apps Script never re-derives grades.
- Google Apps Script writes **one tab per student**, named `Họ tên-MSSV`. MSSV is the sole identity key: a renamed student gets their tab renamed, never duplicated. Tab lookup order — stored name in the index row, then suffix scan for `-<MSSV>`, then insert.
- Each student tab: rows 1-4 identity, rows 6-7 cumulative summary, row 9 the subject table header (frozen), then all subjects with a bold per-semester summary row. Written in a single `setValues()`.
- An index tab (`INDEX_SHEET_NAME`, e.g. `TỔNG HỢP`) upserts one row per student by MSSV. The tab link uses `setRichTextValue().setLinkUrl()`, not a `HYPERLINK` formula — formula argument separators are locale-dependent (`;` in vi-VN) and would render `#ERROR!`.
- Script Properties: `SPREADSHEET_ID`, `INDEX_SHEET_NAME`, `API_SECRET`. No Drive access — the old JSON-file-on-Drive backup was removed.
- `safeSheetText()` prefixes `=+-@` to block formula injection; MSSV cells use number format `@`.
- Setup instructions and required environment variables are in `docs/google-sheet-sync.md`.

## Grade scale presets

`UNIVERSITY_SCALES` maps university names to scale arrays. On selection, replaces `data.scale` and sets `data.selectedUni`. Two presets exist: HCMUT and IUH.

## Style conventions

- Vietnamese UI throughout.
- Tailwind classes via CDN (no purge, no config).
- No comments in code per preference.
- All event bindings in `bindEvents()`.
- render → collect → save pattern: `renderAll()` calls `renderScale()` + `renderSemesters()` + conditional `renderSummary()`.
