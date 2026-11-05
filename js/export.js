// Export helpers: result status wording and CSV building. No DOM access, so the
// tests can load this file. Wrapped in one namespace to stay clear of the other
// scripts' globals.
const KneeExport = (() => {
  const LLN = typeof LLN_Z !== 'undefined' ? LLN_Z : require('./equations.js').LLN_Z;

  const CSV_COLUMNS = [
    'patient_id', 'measurement_date', 'generated_at',
    'sex', 'age_yr', 'height_cm', 'weight_kg', 'ffm_kg', 'side',
    'measured_value', 'measured_unit', 'lever_arm_cm',
    'reference', 'doi', 'reference_unit',
    'predicted', 'lln', 'measured_in_reference_unit', 'pct_predicted', 'z_score',
    'status', 'notes'
  ];

  // Same wording as the chips on the page.
  function statusOf(r) {
    if (!r.ok) return 'Not computed';
    if (r.pctOnly) return '% predicted only';
    return r.z < LLN ? 'Below LLN' : 'Within normal';
  }

  // Notes as in the table view.
  function notesOf(eq, r) {
    return r.ok ? [...r.warnings, eq.trialNote, eq.deviceNote].filter(Boolean).join('; ') : r.reason;
  }

  // Rounding as on the page: kg with 1 decimal, N·m with none.
  const inUnit = (v, unit) => Number.isFinite(v) ? v.toFixed(unit === 'kg' ? 1 : 0) : '';
  const raw = v => Number.isFinite(v) ? String(v) : '';

  // RFC 4180: quote fields holding a comma, a quote or a line break; double the quotes.
  function cell(v) {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  // One row per reference. `meta` = { patientId, measurementDate, generatedAt }.
  function buildCsv(p, results, meta) {
    const lines = [CSV_COLUMNS.join(',')];
    for (const { eq, r } of results) {
      const hasPred = r.predicted > 0;
      const row = [
        meta.patientId || '', meta.measurementDate || '', meta.generatedAt || '',
        p.male ? 'male' : 'female', raw(p.age), raw(p.height), raw(p.weight), raw(p.ffm), p.side,
        raw(p.measured), p.unit, raw(p.lever),
        `${eq.author} et al. ${eq.year}`, eq.doi, eq.unit,
        hasPred ? inUnit(r.predicted, eq.unit) : '',
        hasPred && !r.pctOnly ? inUnit(r.lln, eq.unit) : '',
        r.ok ? inUnit(r.measured, eq.unit) : '',
        r.ok ? r.pct.toFixed(1) : '',
        r.ok && !r.pctOnly ? r.z.toFixed(2) : '',
        statusOf(r), notesOf(eq, r)
      ];
      lines.push(row.map(cell).join(','));
    }
    // BOM so spreadsheet software detects UTF-8.
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  // The patient ID is never put in the file name.
  const csvFilename = meta => `knee-extension-norms_${meta.measurementDate || 'undated'}.csv`;

  return { CSV_COLUMNS, statusOf, notesOf, buildCsv, csvFilename };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = KneeExport;
