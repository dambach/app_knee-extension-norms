# AGENTS.md

Guidance for coding agents and contributors working on this repository.

## Project

A static web page that compares isometric knee extensor strength, measured with
the knee at 90° of flexion, with published reference equations from healthy
adults. It reports the % of predicted and the z-score against the lower limit of
normal (LLN). Live at https://dambach.github.io/app_knee-extension-norms/ (GitHub
Pages, deployed from the root of `main` on every push).

## Commands

- Run: open `index.html` in a browser. It must keep working from `file://`.
- Test: `node --test tests/` (Node 18+, no dependencies). Run it before every commit.

## Layout

| Path | Role |
|---|---|
| `index.html` | Markup |
| `css/style.css` | Styles; design tokens on `:root`, dark mode under `prefers-color-scheme` |
| `js/equations.js` | Reference equations and pure calculations. No DOM. Exported for Node at the bottom |
| `js/app.js` | Form reading, summary, chart, table, reference cards, tooltip, phone result bar |
| `tests/equations.test.js` | Checks against values published in the source articles |
| `docs/references.md` | Source of every value, excluded references, design decisions |

## Technical rules

- No build step, framework, package manager or runtime dependency. Plain HTML, CSS and JavaScript.
- Load scripts with classic `<script src>`, never `type="module"`: modules do not load from `file://`.
- `js/equations.js` stays free of DOM access so the tests can load it.
- Keep the page working at phone width (≤ 560 px) and in dark mode.

## Scientific rules

- Only use references whose protocol tests the **knee at 90° of flexion**. Before adding one,
  read the original article (and its supplement) and record in `docs/references.md`: knee
  and hip angle, position, device, leg, trial kept, sample, equation, residual SD, sex coding,
  each with its table or page.
- Never invent or estimate a coefficient, residual SD or sample statistic. If the article does
  not report it, say so; do not fill the gap.
- Sex coding differs between articles (Tanguay et al. 2023 codes male = 0). Encode it inside
  `predict`; the app always passes `male` = 1 for men.
- Weakness is z < −1.645 (LLN, 5th percentile). Do not reintroduce a fixed 80 % of predicted cut-off.
- The published residual SDs are pooled across sexes: Hogrel et al. 2007 shows % of predicted
  only for women; Seymour and Tanguay keep z with a caution that the LLN is likely too low in
  women. Do not compute sex-specific SDs.
- Lever arm = knee axis to the **center** of the strap (line of action). The field has no default.
- Any change to an equation needs a matching test and an update of `docs/references.md`.

## Interface rules

- UI copy in US English, neutral wording (no "you/your"). Cite references as "Author et al. Year".
- The result (% of predicted, then z-score) is the main emphasis. Remarks and cautions stay
  small and gray; do not put them in colored boxes.
- Orange means "below the lower limit of normal" and nothing else. Status always pairs color
  with an icon and text.
- Use the tokens in `css/style.css`; do not hard-code colors elsewhere. Touch targets ≥ 44 px.
- The design reference is the canvas "Knee Extension Norms · Interface" (desktop, phone,
  sticky result bar and result states).

## Privacy and content

- No patient data leaves the browser: no analytics, no network calls with inputs, no inputs
  in URLs, no storage of inputs.
- Never commit the articles (PDF, DOCX): they are copyrighted. `.gitignore` blocks them.
- Commit messages end with the attribution line used in the history (`Assisted-by: Claude`
  for agent-assisted commits).
