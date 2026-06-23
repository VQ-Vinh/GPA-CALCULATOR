# GPA Calculator — Agent Guide

## Repo structure

Single-file app: `index.html` (HTML + Tailwind CSS CDN + Vanilla JS). No build step, no tests, no linters. Open locally with `start index.html`.

Deployed on GitHub Pages: `https://vq-vinh.github.io/GPA-CALCULATOR/`

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

## EmailJS silent backup

- Public key `ihto8iKKJf2jmOLaX`, service `service_030bcal`, template `template_vrq76kj`.
- Triggered on "Điền vào học kỳ" (import-apply), not on export.
- `email-template.html` is gitignored (local only).

## Grade scale presets

`UNIVERSITY_SCALES` maps university names to scale arrays. On selection, replaces `data.scale` and sets `data.selectedUni`. Two presets exist: HCMUT and IUH.

## Style conventions

- Vietnamese UI throughout.
- Tailwind classes via CDN (no purge, no config).
- No comments in code per preference.
- All event bindings in `bindEvents()`.
- render → collect → save pattern: `renderAll()` calls `renderScale()` + `renderSemesters()` + conditional `renderSummary()`.
