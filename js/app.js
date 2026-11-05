// Page logic: reads the form, renders the chart, table, reference cards and tooltip.
// All calculations live in equations.js, loaded before this file.

// The z axis never extends beyond these bounds; more extreme values are pinned to the edge.
const Z_FLOOR = -8, Z_CEIL = 4;

const $ = id => document.getElementById(id);
const fmt = (v, unit) => unit === 'kg' ? v.toFixed(1) : v.toFixed(0);
const fmtZ = z => (z < 0 ? '−' : '+') + Math.abs(z).toFixed(2);

// Reads one numeric field and flags it in the form when out of range.
function readField(id, range) {
  const el = $(id);
  const f = parseField(el.value, range);
  el.setAttribute('aria-invalid', f.invalid ? 'true' : 'false');
  return f;
}

function readInputs() {
  const p = {
    male: document.querySelector('input[name="sex"]:checked').value === 'male' ? 1 : 0,
    side: document.querySelector('input[name="side"]:checked').value,
    unit: $('unit').value,
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

function render() {
  const p = readInputs();
  const results = EQUATIONS.map(eq => ({ eq, r: evaluate(eq, p) }));
  const zs = results.filter(x => x.r.ok && !x.r.pctOnly).map(x => x.r.z);
  const zMin = Math.max(Z_FLOOR, Math.min(-4, Math.floor(Math.min(...zs, 0) - 0.5)));
  const zMax = Math.min(Z_CEIL, Math.max(2, Math.ceil(Math.max(...zs, 0) + 0.5)));
  const x = z => (Math.min(Math.max(z, zMin), zMax) - zMin) / (zMax - zMin) * 100;

  // Measured summary
  const s = $('measured-summary');
  if (Number.isNaN(p.measured)) {
    s.textContent = '';
  } else if (Number.isNaN(p.lever)) {
    s.innerHTML = `Measured: <strong>${fmt(p.measured, p.unit)} ${UNIT_LABEL[p.unit]}</strong>`;
  } else {
    const other = p.unit === 'kg' ? 'Nm' : 'kg';
    s.innerHTML = `Measured: <strong>${fmt(p.measured, p.unit)} ${UNIT_LABEL[p.unit]}</strong> ` +
      `= ${fmt(convert(p.measured, p.unit, other, p.lever), other)} ${UNIT_LABEL[other]} at a ${p.lever} cm lever arm`;
  }

  // Grid, LLN zone and axis
  let grid = `<div class="zone" style="width:${x(LLN_Z)}%"></div>`;
  for (let t = zMin; t <= zMax; t++) {
    grid += `<div class="gl" style="left:${x(t)}%"></div><div class="tick${t % 2 ? ' odd' : ''}" style="left:${x(t)}%">${t === 0 ? '0' : (t < 0 ? '−' : '+') + Math.abs(t)}</div>`;
  }
  grid += `<div class="gl ref" style="left:${x(LLN_Z)}%"></div><div class="top" style="left:${x(LLN_Z)}%">LLN</div>`;
  grid += `<div class="gl ref" style="left:${x(0)}%"></div><div class="top" style="left:${x(0)}%">Pred.</div>`;
  $('grid-layer').innerHTML = grid;

  // Rows
  $('rows').innerHTML = results.map(({ eq, r }, i) => {
    const name = `<b>${eq.author} et al. ${eq.year}</b><span class="proto">${eq.protoShort}</span>`;
    if (!r.ok) {
      return `<div class="row" data-i="${i}" tabindex="0">
        <div class="name">${name}<span class="status na">Not computed</span></div>
        <div class="track"><span class="na-msg" style="left:0">${r.reason}</span></div><span class="zval"></span></div>`;
    }
    const vals = z => `<span class="zval"><span>${r.pct.toFixed(0)} %</span><span>${z}</span></span>`;
    if (r.pctOnly) {
      const pflags = ['SD too large for women', r.ageOut && 'age out of range', r.atEdge && 'atypical vs reference sample'].filter(Boolean);
      return `<div class="row" data-i="${i}" tabindex="0"
          aria-label="${eq.author} et al. ${eq.year}: ${r.pct.toFixed(0)} percent of predicted; z-score not shown for women">
        <div class="name">${name}<span class="status na">% predicted only</span><span class="status warn">⚠ ${pflags.join(' · ')}</span></div>
        <div class="track"><span class="na-msg" style="left:0">z-score not shown for women</span></div>
        ${vals('—')}</div>`;
    }
    const low = r.z < LLN_Z;
    const status = low
      ? `<span class="status low"><span aria-hidden="true">▼</span> Below LLN</span>`
      : `<span class="status ok"><span aria-hidden="true">✓</span> Within normal</span>`;
    const flags = [r.ageOut && 'age out of range', r.atEdge && 'atypical vs reference sample', r.pooledFemale && 'LLN likely too low in women'].filter(Boolean);
    const warn = flags.length ? `<span class="status warn">⚠ ${flags.join(' · ')}</span>` : '';
    const x0 = x(0), xz = x(r.z);
    return `<div class="row" data-i="${i}" tabindex="0"
        aria-label="${eq.author} et al. ${eq.year}: z-score ${r.z.toFixed(2)}, ${r.pct.toFixed(0)} percent of predicted${low ? ', below lower limit of normal' : ''}">
      <div class="name">${name}${status}${warn}</div>
      <div class="track">
        <div class="stem" style="left:${Math.min(x0, xz)}%;width:${Math.abs(xz - x0)}%"></div>
        <div class="dot${r.z < zMin || r.z > zMax ? ' clipped' : ''}" style="left:${xz}%"></div>
      </div>
      ${vals(fmtZ(r.z))}</div>`;
  }).join('');

  // Table
  $('table-body').innerHTML = results.map(({ eq, r }) => {
    const u = UNIT_LABEL[eq.unit];
    const pred = r.predicted > 0 ? `${fmt(r.predicted, eq.unit)} ${u}` : '—';
    const lln = r.predicted > 0 && !r.pctOnly ? `${fmt(r.lln, eq.unit)} ${u}` : '—';
    const meas = r.ok ? `${fmt(r.measured, eq.unit)} ${u}` : '—';
    const z = r.ok && !r.pctOnly ? fmtZ(r.z) : '—';
    const pct = r.ok ? `${r.pct.toFixed(0)} %` : '—';
    const notes = r.ok ? [...r.warnings, eq.trialNote].filter(Boolean).join('; ') : r.reason;
    return `<tr><td>${eq.author} et al. ${eq.year}${eq.sideSpecific ? ` (${p.side})` : ''}</td>
      <td class="num">${pred}</td><td class="num">${lln}</td><td class="num">${meas}</td>
      <td class="num">${pct}</td><td class="num">${z}</td><td class="notes">${notes}</td></tr>`;
  }).join('');

  window.__results = results;
}

function renderRefs() {
  $('refs-list').innerHTML = EQUATIONS.map(eq => `<article class="ref-card">
    <h3>${eq.author} et al. ${eq.year}</h3>
    <dl>
      <dt>Position</dt><dd>${eq.protocol.position}</dd>
      <dt>Device</dt><dd>${eq.protocol.device}</dd>
      <dt>Leg</dt><dd>${eq.protocol.leg}</dd>
      <dt>Value kept</dt><dd>${eq.protocol.trial}</dd>
      <dt>Reference group</dt><dd>${eq.protocol.population}</dd>
      <dt>Unit</dt><dd>${UNIT_LABEL[eq.unit]}</dd>
      <dt>Limitation</dt><dd>${eq.limitation}</dd>
    </dl>
    <div class="eq">${eq.formula}</div>
    <p class="cite">${eq.citation} <a href="https://doi.org/${eq.doi}" target="_blank" rel="noopener">doi:${eq.doi}</a></p>
  </article>`).join('');
}

// Tooltip on hover / focus
const tip = $('tooltip');
function showTip(row, clientX, clientY) {
  const { eq, r } = window.__results[+row.dataset.i];
  const u = UNIT_LABEL[eq.unit];
  tip.innerHTML = `<div class="tt-title">${eq.author} et al. ${eq.year}</div>` + (r.ok
    ? `<div class="tt-row">Predicted <b>${fmt(r.predicted, eq.unit)} ${u}</b></div>
       ${r.pctOnly ? '' : `<div class="tt-row">LLN (5th pct) <b>${fmt(r.lln, eq.unit)} ${u}</b></div>`}
       <div class="tt-row">Measured <b>${fmt(r.measured, eq.unit)} ${u}</b></div>
       <div class="tt-row">% predicted <b>${r.pct.toFixed(0)} %</b></div>
       ${r.pctOnly ? '' : `<div class="tt-row">z-score <b>${fmtZ(r.z)}</b></div>`}` +
      [...r.warnings, eq.trialNote].filter(Boolean).map(w => `<div class="tt-note">${w}</div>`).join('')
    : `<div class="tt-row">${r.reason}</div>`);
  const pad = 14, rect = tip.getBoundingClientRect();
  let left = clientX + pad, top = clientY + pad;
  if (left + rect.width > window.innerWidth - 8) left = clientX - rect.width - pad;
  if (top + rect.height > window.innerHeight - 8) top = clientY - rect.height - pad;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
  tip.classList.add('show');
}
const rows = $('rows');
rows.addEventListener('mousemove', e => {
  const row = e.target.closest('.row');
  row ? showTip(row, e.clientX, e.clientY) : tip.classList.remove('show');
});
rows.addEventListener('mouseleave', () => tip.classList.remove('show'));
rows.addEventListener('focusin', e => {
  const row = e.target.closest('.row');
  if (!row) return;
  const b = row.getBoundingClientRect();
  showTip(row, b.left + b.width / 2, b.bottom);
});
rows.addEventListener('focusout', () => tip.classList.remove('show'));

$('inputs').addEventListener('input', render);
$('inputs').addEventListener('change', render);
renderRefs();
render();
