// Reference equations and pure calculations. No DOM access here, so this file
// can be loaded by the page (classic <script>) and by Node for the tests.
//
// Every coefficient was checked against the original article; the source table
// or page is given next to it. Conventions: `male` is 1 for men, 0 for women;
// height is in cm, weight and fat-free mass in kg, age in years.
// `sd` is the residual SD (or SEE) of the regression, used for z-score and LLN.

const EQUATIONS = [
  {
    id: 'hogrel', author: 'Hogrel', year: 2007, unit: 'Nm',
    ages: [20, 80], // Methods: healthy adults aged 20 to 80 years
    needs: ['age', 'weight'],
    sideSpecific: true,
    // Table 5, knee extension right / left (N·m). Sex coded male = 1: the equation
    // reproduces the Table 2 means at the Table 4 sample means.
    predict: p => p.side === 'left'
      ? 78.00 - 0.87 * p.age + 49.70 * p.male + 0.96 * p.weight
      : 66.37 - 0.87 * p.age + 46.09 * p.male + 1.21 * p.weight,
    sd: p => p.side === 'left' ? 33.93 : 35.05, // Table 5, "SD"
    // One residual SD for both sexes (~35 N·m) is too large for women's predicted values (~80–100 N·m).
    zUnreliable: p => !p.male,
    limitation: 'Single residual SD for both sexes (about 35 N·m), too large relative to women\'s predicted values: for women, only % predicted is shown.',
    // Table 4: sample mean and SD by sex for the predictors used.
    sample: p => p.male
      ? { age: [43.6, 15.8], weight: [78.0, 11.4] }
      : { age: [46.5, 17.1], weight: [61.4, 10.3] },
    protoShort: 'Seated · hip 90° · knee 90°',
    protocol: {
      device: 'QMT system: fixed frame, strain-gauge load cell, strap at the ankle',
      position: 'Seated, hip and knee at 90° flexion', // Table 1
      leg: 'Right and left (side-specific equations)',
      trial: 'Best of ≥ 3 trials (extra trial if 2 differed by ≥ 10 %)',
      population: '262 healthy French adults, 20–80 yr. Men: 43.6 ± 15.8 yr, 78.0 ± 11.4 kg; women: 46.5 ± 17.1 yr, 61.4 ± 10.3 kg'
    },
    formula: 'Right: 66.37 − 0.87 × age + 46.09 × male + 1.21 × weight<br>Left: 78.00 − 0.87 × age + 49.70 × male + 0.96 × weight<br>Residual SD: 35.05 (right), 33.93 (left) N·m',
    citation: 'Hogrel JY, Payan CA, Ollivier G, et al. Development of a French isometric strength normative database for adults using quantitative muscle testing. Arch Phys Med Rehabil. 2007;88(10):1289–97.',
    doi: '10.1016/j.apmr.2007.07.011'
  },
  {
    id: 'seymour', author: 'Seymour', year: 2010, unit: 'kg',
    ages: [40, 90], // Methods: healthy volunteers aged 40–90
    needs: ['age', 'height', 'ffm'],
    // Results, p. 4 of the Europe PMC author manuscript (QMVC in kg).
    predict: p => 56.2 - 0.30 * p.age + 0.68 * p.ffm - 0.15 * p.height - 3.42 * (1 - p.male),
    sd: () => 8.58, // Results: residual standard deviation 8.58 kg; weakness = z < −1.645
    limitation: 'Single residual SD for both sexes: the LLN is probably too low for women.',
    // Table 1, healthy subjects, sexes pooled.
    sample: () => ({ age: [64, 9], height: [167, 9], ffm: [47.6, 11.4] }),
    protoShort: 'Supine · knee 90°',
    protocol: {
      device: 'Edwards chair: strain gauge strapped at the ankle',
      position: 'Supine, knee at 90° flexion, hip immobilized', // Methods, p. 3
      leg: 'Not specified',
      trial: 'Greatest of ≥ 3 reproducible efforts (highest force sustained over 1 s)',
      population: '212 healthy adults (UK), 40–90 yr, 44 % men. 64 ± 9 yr, 167 ± 9 cm, FFM 47.6 ± 11.4 kg'
    },
    formula: '56.2 − 0.30 × age + 0.68 × FFM (kg) − 0.15 × height (cm) − 3.42 if female<br>Residual SD: 8.58 kg',
    citation: 'Seymour JM, Spruit MA, Hopkinson NS, et al. The prevalence of quadriceps weakness in COPD and the relationship with disease severity. Eur Respir J. 2010;36(1):81–8.',
    doi: '10.1183/09031936.00104909'
  },
  {
    id: 'tanguay', author: 'Tanguay', year: 2023, unit: 'Nm',
    ages: [40, 89], // Methods: healthy individuals aged 40 to 89 years
    needs: ['age', 'height', 'weight'],
    // Table 2, strengthISOM (N·m). Units: age (yr), height (m), BMI (kg/m²).
    // Sex is coded male = 0, female = 1 (Table 2 footnote).
    predict: p => {
      const h = p.height / 100, bmi = p.weight / (h * h), female = 1 - p.male;
      return -982.2 + 12.6 * p.age - 50.5 * female + 742.7 * h + 1.6 * bmi - 8.6 * p.age * h;
    },
    sd: () => 32.16, // Table 2, SEE
    limitation: 'Single residual SD for both sexes: the LLN is probably too low for women.',
    // Table 1, healthy individuals, sexes pooled.
    sample: () => ({ age: [62, 12], height: [169, 8], bmi: [25.8, 4.0] }),
    protoShort: 'Seated · hip 90° · knee 90°',
    protocol: {
      device: 'Biodex System Pro 3 or 4 (computerized dynamometer)',
      position: 'Seated, hip and knee at 90° flexion, trunk and hip strapped', // online supplement
      leg: 'Dominant leg',
      trial: 'Mean of the 2 best reproducible (within 10 %) of 5 trials', // online supplement
      population: '158 healthy adults (Canada, Sweden, Belgium), 40–89 yr, 47 % men. 62 ± 12 yr, 169 ± 8 cm, BMI 25.8 ± 4.0'
    },
    formula: '−982.2 + 12.6 × age − 50.5 × female + 742.7 × height (m) + 1.6 × BMI − 8.6 × age × height (m)<br>SEE: 32.16 N·m',
    citation: 'Tanguay S, Saey D, et al. Reference equations for quadriceps strength, endurance and power: a multicentre study. ERJ Open Res. 2023;9(5):00313-2023.',
    doi: '10.1183/23120541.00313-2023',
    trialNote: 'Reference uses the mean of the 2 best trials; using the best trial instead slightly overestimates z.'
  }
];

const G = 9.81;
const LLN_Z = -1.645; // 5th percentile
const NEED_LABELS = { age: 'age', height: 'height', weight: 'weight', ffm: 'fat-free mass' };
const UNIT_LABEL = { Nm: 'N·m', kg: 'kg' };
// A predictor further than this many SD from the reference sample mean triggers a caution.
const EDGE_SD = 1.5;
const SAMPLE_LABELS = { age: ['age', 'yr'], height: ['height', 'cm'], weight: ['weight', 'kg'], ffm: ['FFM', 'kg'], bmi: ['BMI', 'kg/m²'] };
// Plausible adult ranges. Values outside are not computed (this also covers partial typing, e.g. "1" on the way to "170").
const LIMITS = {
  age: [18, 100, 'yr'], height: [100, 230, 'cm'], weight: [25, 250, 'kg'],
  ffm: [15, 120, 'kg'], lever: [10, 60, 'cm']
};
const MEASURED_LIMITS = { kg: [1, 200, 'kg'], Nm: [5, 600, 'N·m'] };

const rangeText = ([lo, hi, u]) => `${lo}–${hi} ${u}`;

// Parses a raw input string: NaN when empty or outside [lo, hi]; `invalid` only when out of range.
function parseField(raw, [lo, hi]) {
  const s = String(raw).trim(), v = parseFloat(s);
  const invalid = s !== '' && !(Number.isFinite(v) && v >= lo && v <= hi);
  return { value: invalid || s === '' ? NaN : v, invalid };
}

// Converts between force at the strap (kg) and torque (N·m) using the lever arm in cm.
function convert(value, from, to, leverCm) {
  if (from === to) return value;
  const m = leverCm / 100;
  return from === 'kg' ? value * G * m : value / (G * m);
}

// Applies one reference equation to the inputs `p`
// ({ male, side, age, height, weight, ffm, measured, unit, lever, invalid }).
function evaluate(eq, p) {
  const bad = eq.needs.find(k => p.invalid[k]);
  if (bad) return { ok: false, reason: `Check ${NEED_LABELS[bad]} (${rangeText(LIMITS[bad])})` };
  const missing = eq.needs.filter(k => Number.isNaN(p[k])).map(k => NEED_LABELS[k]);
  if (missing.length) return { ok: false, reason: `Enter ${missing.join(', ')}` };
  const predicted = eq.predict(p);
  const sd = eq.sd(p);
  if (!(predicted > 0)) return { ok: false, reason: 'Predicted value ≤ 0 for these inputs' };
  const lln = predicted + LLN_Z * sd;
  if (p.invalid.measured) {
    return { ok: false, predicted, lln, reason: `Check measured strength (${rangeText(MEASURED_LIMITS[p.unit])})` };
  }
  if (Number.isNaN(p.measured)) return { ok: false, predicted, lln, reason: 'Enter measured strength' };
  if (p.unit !== eq.unit && p.invalid.lever) {
    return { ok: false, predicted, lln, reason: `Check lever arm (${rangeText(LIMITS.lever)})` };
  }
  if (p.unit !== eq.unit && Number.isNaN(p.lever)) {
    return { ok: false, predicted, lln, reason: `Enter lever arm to convert to ${UNIT_LABEL[eq.unit]}` };
  }
  const measured = convert(p.measured, p.unit, eq.unit, p.lever);
  const warnings = [];
  const ageOut = p.age < eq.ages[0] || p.age > eq.ages[1];
  if (ageOut) warnings.push(`Age outside reference range (${eq.ages[0]}–${eq.ages[1]} yr)`);
  const values = { ...p, bmi: p.weight / ((p.height / 100) ** 2) };
  const atEdge = Object.entries(eq.sample(p))
    .filter(([k, [m, s]]) => Math.abs((values[k] - m) / s) > EDGE_SD)
    .map(([k, [m, s]]) => {
      const [label, u] = SAMPLE_LABELS[k];
      const v = k === 'bmi' ? values[k].toFixed(1) : values[k];
      return `${label} ${v} ${u} (sample ${m} ± ${s})`;
    });
  if (atEdge.length) {
    warnings.push(`Profile at the edge of the reference sample: ${atEdge.join(', ')}; interpret with caution`);
  }
  // The published residual SD is pooled across sexes, which makes the LLN too low for women.
  const pctOnly = eq.zUnreliable ? eq.zUnreliable(p) : false;
  const pooledFemale = !p.male && !pctOnly;
  if (pctOnly) warnings.push('z-score and LLN not shown for women: residual SD pooled across sexes is too large');
  if (pooledFemale) warnings.push('Residual SD pooled across sexes: the LLN is probably too low for women');
  return {
    ok: true, predicted, lln, sd, measured, warnings, ageOut, atEdge: atEdge.length > 0, pctOnly, pooledFemale,
    z: (measured - predicted) / sd,
    pct: measured / predicted * 100
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EQUATIONS, G, LLN_Z, LIMITS, MEASURED_LIMITS, UNIT_LABEL,
    parseField, convert, evaluate, rangeText
  };
}
