// Page logic: reads the form, renders the summary, chart, table, reference cards,
// tooltip and the phone result bar. All calculations live in equations.js.

// The z axis never extends beyond these bounds; more extreme values are pinned to the edge.
const Z_FLOOR = -8, Z_CEIL = 4;
// Last computed inputs and results, read by the export.
let lastState = null;
const FIELD_LABELS = { age: 'age', height: 'height', weight: 'weight', ffm: 'fat-free mass', measured: 'measured strength', lever: 'lever arm' };

const $ = id => document.getElementById(id);
const fmt = (v, unit) => unit === 'kg' ? v.toFixed(1) : v.toFixed(0);
const fmtZ = z => (z < 0 ? '−' : '+') + Math.abs(z).toFixed(2);
const refName = eq => `${eq.author} et al. ${eq.year}`;
const listText = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const ICON = {
  down: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  info: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
  pencil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>',
  lowArrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--low-line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="below the lower limit of normal"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>'
};

// Reads one numeric field; flags it and shows the expected range when out of range.
function readField(id, range) {
  const el = $(id), err = $(`${id}-err`);
  const f = parseField(el.value, range);
  el.setAttribute('aria-invalid', f.invalid ? 'true' : 'false');
  if (f.invalid) {
    err.textContent = `Expected ${rangeText(range)}`;
    err.hidden = false;
    el.setAttribute('aria-describedby', err.id);
  } else {
    err.hidden = true;
    el.removeAttribute('aria-describedby');
  }
  return f;
}

function readInputs() {
  const p = {
    male: document.querySelector('input[name="sex"]:checked').value === 'male' ? 1 : 0,
    side: document.querySelector('input[name="side"]:checked').value,
    unit: document.querySelector('input[name="unit"]:checked').value,
    invalid: {}
  };
  for (const k of Object.keys(LIMITS)) {
    const f = readField(k, LIMITS[k]);
    p[k] = f.value;
    if (f.invalid) p.invalid[k] = true;
  }
  const m = readField('measured', MEASURED_LIMITS[p.unit]);
  p.measured = m.value;
  if (m.invalid) p.invalid.measured = true;
  return p;
}

// One sentence above the chart: the verdict first, then what is still missing.
function summarize(results) {
  const scored = results.filter(x => x.r.ok && !x.r.pctOnly);
  const low = scored.filter(x => x.r.z < LLN_Z);
  const waiting = results.filter(x => !x.r.ok);
  const parts = [];
  let tone = 'na';
  if (scored.length) {
    if (low.length) {
      tone = 'low';
      parts.push(`${low.length} of ${scored.length} reference${scored.length > 1 ? 's' : ''} below the lower limit of normal (${listText(low.map(x => refName(x.eq)))}).`);
    } else {
      tone = 'ok';
      parts.push(scored.length > 1 ? 'No reference below the lower limit of normal.' : 'Within the normal range.');
    }
  }
  if (waiting.length) {
    const invalid = [...new Set(waiting.filter(x => x.r.invalid).map(x => FIELD_LABELS[x.r.field]))];
    const missing = [...new Set(waiting.filter(x => !x.r.invalid && x.r.field).map(x => FIELD_LABELS[x.r.field]))];
    const n = waiting.length === results.length ? 'all three references' : `${waiting.length === 1 ? refName(waiting[0].eq) : `${waiting.length} references`}`;
    if (invalid.length) parts.push(`Check ${listText(invalid)} to compute ${n}.`);
    else if (missing.length) parts.push(`Enter ${listText(missing)} to compute ${n}.`);
  }
  if (!parts.length && results.some(x => x.r.pctOnly)) parts.push('% of predicted only for this reference.');
  return { text: parts.join(' '), tone, low: low.length, scored: scored.length };
}

function trackHtml(r, x, zMin, zMax) {
  let html = `<div class="zone" style="width:${x(LLN_Z)}%"></div>`;
  for (let t = Math.ceil(zMin); t <= zMax; t++) {
    if (t !== 0) html += `<div class="gl" style="left:${x(t)}%"></div>`;
  }
  html += `<div class="ln lln" style="left:${x(LLN_Z)}%"></div><div class="ln pred" style="left:${x(0)}%"></div>`;
  const x0 = x(0), xz = x(r.z);
  html += `<div class="stem" style="left:${Math.min(x0, xz)}%;width:${Math.abs(xz - x0)}%"></div>`;
  html += `<div class="pt${r.z < zMin || r.z > zMax ? ' clipped' : ''}" style="left:${xz}%"></div>`;
  return html;
}

function rowHtml({ eq, r }, i, x, zMin, zMax) {
  const head = `<p class="ref-name">${refName(eq)}</p><p class="proto">${eq.protoShort}</p>`;
  const note = text => `<span class="note">${ICON.info}${text}</span>`;
  if (!r.ok) {
    const icon = r.invalid ? ICON.alert : ICON.pencil;
    return `<div class="chart-row" data-i="${i}" tabindex="0" aria-label="${refName(eq)}: not computed. ${r.reason}">
      <div class="name">${head}<div class="chips"><span class="chip na">Not computed</span></div></div>
      <div class="plot"><div class="track"><div class="msg missing${r.invalid ? ' invalid' : ''}">${icon}${r.reason}</div></div>
      <div class="vals"><p class="pct empty">—</p><p class="z">&nbsp;</p></div></div></div>`;
  }
  const notes = [
    r.pctOnly && note('One residual SD for both sexes, too large for women'),
    r.pooledFemale && note('LLN likely too low in women'),
    r.ageOut && note(`Age outside reference range (${eq.ages[0]}–${eq.ages[1]} yr)`),
    r.atEdge && note('Atypical vs reference sample')
  ].filter(Boolean).join('');
  if (r.pctOnly) {
    return `<div class="chart-row" data-i="${i}" tabindex="0" aria-label="${refName(eq)}: ${r.pct.toFixed(0)} percent of predicted; z-score not shown for women">
      <div class="name">${head}<div class="chips"><span class="chip na">% predicted only</span>${notes}</div></div>
      <div class="plot"><div class="track"><div class="msg info">z-score not shown for women</div></div>
      <div class="vals"><p class="pct">${r.pct.toFixed(0)} %</p><p class="z">z —</p></div></div></div>`;
  }
  const low = KneeExport.statusOf(r) === 'Below LLN';
  const chip = low
    ? `<span class="chip low">${ICON.down}Below LLN</span>`
    : `<span class="chip ok">${ICON.check}Within normal</span>`;
  return `<div class="chart-row" data-i="${i}" tabindex="0"
      aria-label="${refName(eq)}: ${r.pct.toFixed(0)} percent of predicted, z-score ${r.z.toFixed(2)}${low ? ', below the lower limit of normal' : ''}">
    <div class="name">${head}<div class="chips">${chip}${notes}</div></div>
    <div class="plot"><div class="track">${trackHtml(r, x, zMin, zMax)}</div>
    <div class="vals"><p class="pct">${r.pct.toFixed(0)} %</p><p class="z">z ${fmtZ(r.z)}</p></div></div></div>`;
}

function render() {
  const p = readInputs();
  $('measured-unit').textContent = UNIT_LABEL[p.unit];
  const results = EQUATIONS.map(eq => ({ eq, r: evaluate(eq, p) }));
  const zs = results.filter(x => x.r.ok && !x.r.pctOnly).map(x => x.r.z);
  const zMin = Math.max(Z_FLOOR, Math.min(-4, Math.floor(Math.min(...zs, 0) - 0.5)));
  const zMax = Math.min(Z_CEIL, Math.max(2, Math.ceil(Math.max(...zs, 0) + 0.5)));
  const x = z => (Math.min(Math.max(z, zMin), zMax) - zMin) / (zMax - zMin) * 100;

  // Measured value, with its conversion when a lever arm is given
  const ms = $('measured-summary');
  if (Number.isNaN(p.measured)) {
    ms.textContent = '';
  } else if (Number.isNaN(p.lever)) {
    ms.innerHTML = `Measured <strong>${fmt(p.measured, p.unit)} ${UNIT_LABEL[p.unit]}</strong>`;
  } else {
    const other = p.unit === 'kg' ? 'Nm' : 'kg';
    ms.innerHTML = `Measured <strong>${fmt(p.measured, p.unit)} ${UNIT_LABEL[p.unit]}</strong> = ` +
      `${fmt(convert(p.measured, p.unit, other, p.lever), other)} ${UNIT_LABEL[other]} at a ${p.lever} cm lever arm`;
  }

  const sum = summarize(results);
  $('summary').innerHTML = sum.text ? `<span class="dot-flag ${sum.tone}" aria-hidden="true"></span>${sum.text}` : '';

  // Chart header labels and axis
  $('head-labels').innerHTML =
    `<span class="lbl-lln" style="left:${x(LLN_Z)}%">LLN</span><span style="left:${x(0)}%">Predicted</span>`;
  let axis = '';
  for (let t = zMin; t <= zMax; t++) {
    const label = t === 0 ? '0' : (t < 0 ? '−' : '+') + Math.abs(t);
    const pos = t === zMin ? 'left:0;transform:none' : t === zMax ? 'left:auto;right:0;transform:none' : `left:${x(t)}%`;
    axis += `<span class="${t % 2 ? 'odd' : ''}" style="${pos}">${label}</span>`;
  }
  $('axis').innerHTML = axis;

  $('rows').innerHTML = results.map((res, i) => rowHtml(res, i, x, zMin, zMax)).join('');

  // Table view
  $('table-body').innerHTML = results.map(({ eq, r }) => {
    const u = UNIT_LABEL[eq.unit];
    const pred = r.predicted > 0 ? `${fmt(r.predicted, eq.unit)} ${u}` : '—';
    const lln = r.predicted > 0 && !r.pctOnly ? `${fmt(r.lln, eq.unit)} ${u}` : '—';
    const meas = r.ok ? `${fmt(r.measured, eq.unit)} ${u}` : '—';
    const z = r.ok && !r.pctOnly ? fmtZ(r.z) : '—';
    const pct = r.ok ? `${r.pct.toFixed(0)} %` : '—';
    const notes = KneeExport.notesOf(eq, r);
    return `<tr><td>${refName(eq)}${eq.sideSpecific ? ` (${p.side})` : ''}</td>
      <td class="num">${pred}</td><td class="num">${lln}</td><td class="num">${meas}</td>
      <td class="num">${pct}</td><td class="num">${z}</td><td class="notes">${notes}</td></tr>`;
  }).join('');

  // Phone result bar
  $('sticky-summary').innerHTML = sum.scored
    ? `<span class="dot-flag ${sum.tone}" aria-hidden="true"></span>${sum.low ? `${sum.low} of ${sum.scored} below the LLN` : 'None below the LLN'}`
    : `<span class="dot-flag na" aria-hidden="true"></span>Result pending`;
  $('sticky-grid').innerHTML = results.map(({ eq, r }) => {
    const name = `${eq.author} ${eq.year}`;
    if (!r.ok) return `<div class="cell"><p class="cell-name">${name}</p><p class="cell-pct empty">—</p><p class="cell-z">${FIELD_LABELS[r.field] || ''}</p></div>`;
    const low = !r.pctOnly && r.z < LLN_Z;
    return `<div class="cell"><p class="cell-name">${name}</p><p class="cell-pct">${r.pct.toFixed(0)} %${low ? ICON.lowArrow : ''}</p><p class="cell-z">${r.pctOnly ? 'z —' : `z ${fmtZ(r.z)}`}</p></div>`;
  }).join('');

  window.__results = results;
  lastState = { p, results };
  fillPrintInputs(p);
  const canExport = results.some(x => x.r.ok);
  $('btn-print').disabled = !canExport;
  $('btn-csv').disabled = !canExport;
}

function renderRefs() {
  $('refs-list').innerHTML = EQUATIONS.map(eq => `<article class="card ref-card">
    <h3>${refName(eq)}</h3>
    <div class="pills"><span class="pill accent">${eq.protoShort}</span><span class="pill">${UNIT_LABEL[eq.unit]}</span></div>
    <dl>
      <dt>Position</dt><dd>${eq.protocol.position}</dd>
      <dt>Device</dt><dd>${eq.protocol.device}</dd>
      <dt>Leg</dt><dd>${eq.protocol.leg}</dd>
      <dt>Value kept</dt><dd>${eq.protocol.trial}</dd>
      <dt>Reference group</dt><dd>${eq.protocol.population}</dd>
      <dt>Limitation</dt><dd>${eq.limitation}</dd>
    </dl>
    <p class="eq">${eq.formula}</p>
    <p class="cite">${eq.citation} <a href="https://doi.org/${eq.doi}" target="_blank" rel="noopener">doi:${eq.doi}</a></p>
  </article>`).join('');
}

// Tooltip on hover / focus
const tip = $('tooltip');
function showTip(row, clientX, clientY) {
  const { eq, r } = window.__results[+row.dataset.i];
  const u = UNIT_LABEL[eq.unit];
  tip.innerHTML = `<div class="tt-title">${refName(eq)}</div>` + (r.ok
    ? `<div class="tt-row">Predicted <b>${fmt(r.predicted, eq.unit)} ${u}</b></div>
       ${r.pctOnly ? '' : `<div class="tt-row">LLN (5th pct) <b>${fmt(r.lln, eq.unit)} ${u}</b></div>`}
       <div class="tt-row">Measured <b>${fmt(r.measured, eq.unit)} ${u}</b></div>
       <div class="tt-row">% predicted <b>${r.pct.toFixed(0)} %</b></div>
       ${r.pctOnly ? '' : `<div class="tt-row">z-score <b>${fmtZ(r.z)}</b></div>`}` +
      [...r.warnings, eq.trialNote, eq.deviceNote].filter(Boolean).map(w => `<div class="tt-note">${w}</div>`).join('')
    : `<div class="tt-row">${r.reason}</div>`);
  const pad = 14, rect = tip.getBoundingClientRect();
  let left = clientX + pad, top = clientY + pad;
  if (left + rect.width > window.innerWidth - 8) left = clientX - rect.width - pad;
  if (top + rect.height > window.innerHeight - 8) top = clientY - rect.height - pad;
  // Keep the whole tooltip on screen (phones: the tap is near the middle).
  left = Math.max(8, Math.min(left, window.innerWidth - rect.width - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - rect.height - 8));
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
  tip.classList.add('show');
}
const rows = $('rows');
rows.addEventListener('mousemove', e => {
  const row = e.target.closest('.chart-row');
  row ? showTip(row, e.clientX, e.clientY) : tip.classList.remove('show');
});
rows.addEventListener('mouseleave', () => tip.classList.remove('show'));
rows.addEventListener('focusin', e => {
  const row = e.target.closest('.chart-row');
  if (!row) return;
  const b = row.getBoundingClientRect();
  showTip(row, b.left + b.width / 2, b.bottom);
});
rows.addEventListener('focusout', () => tip.classList.remove('show'));
// Touch screens have no mouseleave and tapping a blank area may not remove focus:
// a tap outside the rows, a scroll or Escape closes the tooltip.
const hideTip = () => {
  tip.classList.remove('show');
  if (document.activeElement && document.activeElement.classList.contains('chart-row')) document.activeElement.blur();
};
document.addEventListener('pointerdown', e => { if (!e.target.closest('.chart-row')) hideTip(); });
window.addEventListener('scroll', () => tip.classList.remove('show'), { passive: true });
rows.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });

// Export: printable report and CSV. Patient ID and date are read only here and
// never stored or sent.
const pad2 = n => String(n).padStart(2, '0');
const localDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const localDateTime = d => `${localDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const exportMeta = () => ({
  patientId: $('patient-id').value.trim(),
  measurementDate: $('measurement-date').value,
  generatedAt: new Date().toISOString()
});

function fillPrintHead() {
  const meta = exportMeta();
  $('print-patient').textContent = meta.patientId || '—';
  $('print-date').textContent = meta.measurementDate || '—';
  $('print-generated').textContent = localDateTime(new Date());
}

function fillPrintInputs(p) {
  const v = (x, u) => Number.isFinite(x) ? `${x} ${u}` : '—';
  let strength = v(p.measured, UNIT_LABEL[p.unit]);
  if (Number.isFinite(p.measured) && Number.isFinite(p.lever)) {
    const other = p.unit === 'kg' ? 'Nm' : 'kg';
    strength += ` (${fmt(convert(p.measured, p.unit, other, p.lever), other)} ${UNIT_LABEL[other]})`;
  }
  const items = [
    ['Sex', p.male ? 'Male' : 'Female'], ['Age', v(p.age, 'yr')],
    ['Height', v(p.height, 'cm')], ['Weight', v(p.weight, 'kg')],
    ['Fat-free mass', v(p.ffm, 'kg')], ['Side tested', p.side === 'left' ? 'Left' : 'Right'],
    ['Measured strength', strength], ['Lever arm', v(p.lever, 'cm')]
  ];
  $('print-inputs').innerHTML = items.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('');
}

function downloadCsv() {
  if (!lastState) return;
  const meta = exportMeta();
  const csv = KneeExport.buildCsv(lastState.p, lastState.results, meta);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = KneeExport.csvFilename(meta);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// The table is part of the report: open it for printing, then restore it.
const tableView = document.querySelector('details.table-view');
let tableWasOpen = false;
window.addEventListener('beforeprint', () => {
  fillPrintHead();
  tableWasOpen = tableView.open;
  tableView.open = true;
});
window.addEventListener('afterprint', () => { tableView.open = tableWasOpen; });

$('measurement-date').value = localDate(new Date());
$('patient-id').addEventListener('input', fillPrintHead);
$('measurement-date').addEventListener('input', fillPrintHead);
// Browsers use the page title as the default PDF file name.
const pageTitle = document.title;
$('btn-print').addEventListener('click', () => {
  document.title = KneeExport.fileBase(exportMeta());
  window.print();
});
window.addEventListener('afterprint', () => { document.title = pageTitle; });
$('btn-csv').addEventListener('click', downloadCsv);

// Hide the phone result bar while the full result is on screen.
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    $('sticky-bar').classList.toggle('is-hidden', entry.isIntersecting);
  }, { threshold: 0.25 }).observe($('result'));
}

$('inputs').addEventListener('input', render);
$('inputs').addEventListener('change', render);
renderRefs();
render();
fillPrintHead();
