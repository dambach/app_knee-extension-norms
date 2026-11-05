// Run with: node --test tests/
// Checks the reference equations against values published in the source articles
// and the guards used by the page.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EQUATIONS, LLN_Z, LIMITS, parseField, convert, evaluate } = require('../js/equations.js');

const eq = id => EQUATIONS.find(e => e.id === id);
const close = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: got ${actual.toFixed(2)}, expected ${expected} ± ${tol}`);
const inputs = p => ({ side: 'right', ffm: NaN, lever: NaN, invalid: {}, ...p });

test('Hogrel 2007 reproduces its Table 2 means at the Table 4 sample means', () => {
  const h = eq('hogrel');
  const men = { male: 1, age: 43.6, weight: 78.0 }, women = { male: 0, age: 46.5, weight: 61.4 };
  close(h.predict({ ...men, side: 'right' }), 168.9, 1, 'men, right');
  close(h.predict({ ...men, side: 'left' }), 164.1, 1, 'men, left');
  close(h.predict({ ...women, side: 'right' }), 100.9, 1, 'women, right');
  close(h.predict({ ...women, side: 'left' }), 96.2, 1, 'women, left');
});

test('Tanguay 2023 reproduces its healthy-sample mean (Table 1: 169.0 N·m, 47 % men)', () => {
  const t = eq('tanguay');
  const p = { age: 62, height: 169, weight: 74.4 };
  const pred = 0.47 * t.predict({ ...p, male: 1 }) + 0.53 * t.predict({ ...p, male: 0 });
  close(pred, 169.0, 3, 'sample-weighted prediction');
});

test('Tanguay 2023 codes sex as male = 0: women are 50.5 N·m lower', () => {
  const t = eq('tanguay'), p = { age: 65, height: 170, weight: 70 };
  close(t.predict({ ...p, male: 1 }) - t.predict({ ...p, male: 0 }), 50.5, 1e-9, 'sex difference');
});

test('Seymour 2010 equation, hand-computed values', () => {
  const s = eq('seymour'), p = { age: 65, height: 170, ffm: 52 };
  close(s.predict({ ...p, male: 1 }), 46.56, 1e-9, 'man');
  close(s.predict({ ...p, male: 0 }), 43.14, 1e-9, 'woman (−3.42 kg)');
});

test('z-score is −1.645 at the lower limit of normal', () => {
  const t = eq('tanguay');
  const base = inputs({ male: 1, age: 65, height: 170, weight: 70, unit: 'Nm' });
  const lln = t.predict(base) + LLN_Z * t.sd(base);
  close(evaluate(t, { ...base, measured: lln }).z, -1.645, 1e-9, 'z at LLN');
});

test('kg ↔ N·m conversion uses the lever arm', () => {
  close(convert(65, 'kg', 'Nm', 33), 210.43, 0.01, '65 kg at 33 cm');
  close(convert(convert(65, 'kg', 'Nm', 33), 'Nm', 'kg', 33), 65, 1e-9, 'round trip');
});

test('input parsing: empty, out of range, valid', () => {
  assert.deepEqual(parseField('', LIMITS.height).invalid, false);
  assert.ok(Number.isNaN(parseField('', LIMITS.height).value));
  assert.equal(parseField('1', LIMITS.height).invalid, true); // partial typing of "170"
  assert.equal(parseField('170', LIMITS.height).value, 170);
});

test('out-of-range height is not computed (no runaway z-score)', () => {
  const r = evaluate(eq('tanguay'), inputs({ male: 1, age: 65, height: NaN, weight: 70, measured: 150, unit: 'Nm', invalid: { height: true } }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /Check height/);
});

test('strength in kg needs a lever arm for N·m equations, not for Seymour', () => {
  const p = inputs({ male: 1, age: 65, height: 170, weight: 70, ffm: 52, measured: 30, unit: 'kg' });
  assert.match(evaluate(eq('hogrel'), p).reason, /Enter lever arm/);
  assert.equal(evaluate(eq('seymour'), p).ok, true);
});

test('pooled residual SD: Hogrel shows % predicted only for women, others flag the LLN', () => {
  const p = inputs({ male: 0, age: 65, height: 160, weight: 60, ffm: 40, measured: 25, unit: 'kg', lever: 32 });
  assert.equal(evaluate(eq('hogrel'), p).pctOnly, true);
  assert.equal(evaluate(eq('seymour'), p).pooledFemale, true);
  assert.equal(evaluate(eq('tanguay'), p).pooledFemale, true);
  const m = inputs({ ...p, male: 1 });
  assert.equal(evaluate(eq('hogrel'), m).pctOnly, false);
  assert.equal(evaluate(eq('tanguay'), m).pooledFemale, false);
});

test('profile far from the reference sample is flagged', () => {
  // 41-year-old man, 181 cm, 78 kg: younger than Tanguay's sample (62 ± 12), typical for Hogrel men.
  const p = inputs({ male: 1, age: 41, height: 181, weight: 78, ffm: 63, measured: 65, unit: 'kg', lever: 33 });
  assert.equal(evaluate(eq('tanguay'), p).atEdge, true);
  assert.equal(evaluate(eq('hogrel'), p).atEdge, false);
});
