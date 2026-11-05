# Knee extension norms

A small web page that compares **isometric knee extensor strength measured at 90° of
knee flexion** with published reference equations from healthy adults. For each
reference it gives the **% of predicted** and the **z-score** against the lower limit
of normal (LLN, 5th percentile).

References used, all with the knee at 90°:

- Hogrel et al. 2007, *Arch Phys Med Rehabil* (seated, strap and load cell)
- Seymour et al. 2010, *Eur Respir J* (supine, strain gauge)
- Tanguay et al. 2023, *ERJ Open Res* (seated, Biodex)

Sources, checks and design decisions are documented in
[docs/references.md](docs/references.md).

## Use

Open `index.html` in a browser. There is no build step, no server and no data leaves
the browser.

## Project layout

```
index.html            page markup
css/style.css         styles (light and dark)
js/equations.js       reference equations and calculations (no DOM, also loaded by the tests)
js/app.js             form, chart, table and tooltip
tests/                Node tests of the equations
docs/references.md    sources and decisions
AGENTS.md             rules for coding agents and contributors
```

`js/equations.js` is a classic script (not an ES module) so that the page keeps
working when opened directly from disk.

## Tests

Requires Node.js 18 or later, no dependencies:

```
node --test tests/
```

The tests check that each equation reproduces values published in its source
article, the sex coding, the unit conversion and the input guards.

## Disclaimer

For information purposes only. Not a substitute for professional medical advice,
diagnosis or treatment.

## Author and license

Damien Bachasson. Released under the [MIT License](LICENSE).
