// Run with: node --test tests/
// Checks the CSV export built from the same results as the page.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EQUATIONS, evaluate } = require('../js/equations.js');
const { CSV_COLUMNS, statusOf, buildCsv, csvFilename } = require('../js/export.js');

const inputs = p => ({ side: 'right', ffm: NaN, lever: NaN, invalid: {}, ...p });
const resultsFor = p => EQUATIONS.map(eq => ({ eq, r: evaluate(eq, p) }));
const meta = { patientId: 'P-001', measurementDate: '2026-11-05', generatedAt: '2026-11-05T20:00:00.000Z' };

// Minimal RFC 4180 parser for the checks.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
    else field += c;
  }
  return rows;
}
const toObjects = csv => {
  const [header, ...rows] = parseCsv(csv.replace(/^﻿/, ''));
  return { header, rows: rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]]))) };
};

const man = inputs({ male: 1, age: 41, height: 181, weight: 78, ffm: 63, measured: 65, unit: 'kg', lever: 33 });
const woman = inputs({ male: 0, age: 65, height: 160, weight: 60, ffm: 40, measured: 25, unit: 'kg', lever: 32 });

test('CSV has a BOM, the expected header and one row per reference', () => {
  const csv = buildCsv(man, resultsFor(man), meta);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.endsWith('\r\n'));
  const { header, rows } = toObjects(csv);
  assert.deepEqual(header, CSV_COLUMNS);
  assert.equal(rows.length, EQUATIONS.length);
  assert.deepEqual(rows.map(r => r.reference), ['Hogrel et al. 2007', 'Seymour et al. 2010', 'Tanguay et al. 2023']);
});

test('values use dot decimals and match the page rounding', () => {
  const { rows } = toObjects(buildCsv(man, resultsFor(man), meta));
  const tanguay = rows.find(r => r.reference.startsWith('Tanguay'));
  assert.equal(tanguay.patient_id, 'P-001');
  assert.equal(tanguay.measurement_date, '2026-11-05');
  assert.equal(tanguay.measured_in_reference_unit, '210');
  assert.equal(tanguay.pct_predicted, '75.5');
  assert.equal(tanguay.z_score, '-2.12');
  assert.equal(tanguay.status, 'Below LLN');
  const seymour = rows.find(r => r.reference.startsWith('Seymour'));
  assert.equal(seymour.reference_unit, 'kg');
  assert.equal(seymour.measured_in_reference_unit, '65.0');
});

test('notes with commas or quotes are quoted (RFC 4180)', () => {
  const csv = buildCsv(man, resultsFor(man), { ...meta, patientId: 'Doe, "J"' });
  assert.ok(csv.includes('"Doe, ""J"""'));
  const { rows } = toObjects(csv);
  assert.equal(rows[0].patient_id, 'Doe, "J"');
  assert.match(rows.find(r => r.reference.startsWith('Tanguay')).notes, /Biodex/);
});

test('women: Hogrel has no z-score or LLN, the others keep them', () => {
  const { rows } = toObjects(buildCsv(woman, resultsFor(woman), meta));
  const hogrel = rows.find(r => r.reference.startsWith('Hogrel'));
  assert.equal(hogrel.status, '% predicted only');
  assert.equal(hogrel.z_score, '');
  assert.equal(hogrel.lln, '');
  assert.notEqual(hogrel.pct_predicted, '');
  assert.notEqual(rows.find(r => r.reference.startsWith('Seymour')).z_score, '');
});

test('not computed rows have empty results and the reason as note', () => {
  const p = inputs({ male: 1, age: 65, height: 170, weight: 70, measured: 30, unit: 'kg' });
  const { rows } = toObjects(buildCsv(p, resultsFor(p), meta));
  for (const r of rows) {
    assert.equal(r.status, 'Not computed');
    assert.equal(r.z_score, '');
    assert.equal(r.pct_predicted, '');
    assert.notEqual(r.notes, '');
  }
  assert.equal(rows[0].ffm_kg, '');
  assert.equal(rows[0].lever_arm_cm, '');
});

test('status wording and file name', () => {
  assert.equal(statusOf({ ok: false }), 'Not computed');
  assert.equal(statusOf({ ok: true, pctOnly: true }), '% predicted only');
  assert.equal(statusOf({ ok: true, z: -2 }), 'Below LLN');
  assert.equal(statusOf({ ok: true, z: 0.3 }), 'Within normal');
  assert.equal(csvFilename(meta), 'knee-extension-norms_2026-11-05.csv');
  assert.equal(csvFilename({}), 'knee-extension-norms_undated.csv');
});
