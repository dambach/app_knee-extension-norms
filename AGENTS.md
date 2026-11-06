# AGENTS.md

Static web page comparing isometric knee extension strength (knee at 90°) with published
reference equations: % of predicted and z-score against the lower limit of normal.
Deployed by GitHub Pages from `main`: <https://dambach.github.io/app_knee-extension-norms/>

## Commands

- Run: open `index.html` in a browser (must work from `file://`).
- Test: `node --test tests/` — run before every commit.

## Rules

- Plain HTML, CSS and JavaScript: no build step, no dependency, classic `<script src>` (no ES modules).
- `js/equations.js` (equations, calculations) and `js/export.js` (CSV) have no DOM access. Any change to it needs
  a test and an update of `docs/references.md`, which records sources and design decisions.
- Only references measured with the knee at 90° of flexion. Every value comes from the original
  article, with its table or page; never invent or estimate one.
- UI copy in US English, neutral (no "you"). The result is the main emphasis; orange means
  "below the lower limit of normal" only. Use the color tokens in `css/style.css`.
- No patient data leaves the browser; no third-party request except Bunny Fonts (no Google Fonts).
  Never commit the articles (PDF, DOCX).
