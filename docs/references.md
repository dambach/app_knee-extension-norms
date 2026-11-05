# Reference equations: sources, checks and decisions

This file records where every value used in `js/equations.js` comes from, which
references were left out and why, and the design decisions behind the results
shown by the app. The articles themselves are not stored in this repository.

## Scope

The app compares an **isometric knee extension** measurement taken with the
**knee at 90° of flexion** against reference equations whose protocol uses the
same knee angle. Knee extensor torque depends strongly on knee angle, so norms
measured at another angle are not used.

## References used

### Hogrel et al. 2007

Hogrel JY, Payan CA, Ollivier G, et al. Development of a French isometric strength
normative database for adults using quantitative muscle testing. *Arch Phys Med
Rehabil.* 2007;88(10):1289–97. doi:10.1016/j.apmr.2007.07.011

| Item | Value | Source |
|---|---|---|
| Position | Seated, hip and knee at 90° flexion, strap at the ankle proximal to the malleolus | Table 1 |
| Lever arm | Measured from the lateral knee joint to the center of the strap | Table 3, Methods |
| Equations (N·m) | Right: 66.37 − 0.87 × age + 46.09 × sex + 1.21 × weight; Left: 78.00 − 0.87 × age + 49.70 × sex + 0.96 × weight | Table 5 |
| Residual SD | 35.05 (right), 33.93 (left) N·m, pooled across sexes | Table 5 |
| Sex coding | Male = 1 (the equation reproduces the Table 2 means at the Table 4 sample means) | Tables 2, 4, 5 |
| Sample | 262 healthy adults, 20–80 yr. Men 43.6 ± 15.8 yr, 78.0 ± 11.4 kg; women 46.5 ± 17.1 yr, 61.4 ± 10.3 kg | Methods, Table 4 |
| Trial kept | Best of ≥ 3 trials | Methods |

### Seymour et al. 2010

Seymour JM, Spruit MA, Hopkinson NS, et al. The prevalence of quadriceps weakness in
COPD and the relationship with disease severity. *Eur Respir J.* 2010;36(1):81–8.
doi:10.1183/09031936.00104909 (Europe PMC author manuscript PMC3039205)

| Item | Value | Source |
|---|---|---|
| Position | Supine, knee at 90°, hip immobilized, Edwards apparatus | Methods, p. 3 |
| Equation (kg) | 56.2 − 0.30 × age + 0.68 × FFM (kg) − 0.15 × height (cm) − 3.42 if female | Results, p. 4 |
| Residual SD | 8.58 kg, pooled across sexes | Results, p. 4 |
| Weakness | z < −1.645 (8 % of healthy subjects below this cut-off) | Results, p. 4 |
| Sample | 212 healthy adults, 40–90 yr, 44 % men; 64 ± 9 yr, 1.67 ± 0.09 m, FFM 47.6 ± 11.4 kg | Methods, Table 1 |
| Trial kept | Greatest of ≥ 3 reproducible efforts, highest force sustained over 1 s | Methods |

### Tanguay et al. 2023

Tanguay S, Saey D, et al. Reference equations for quadriceps strength, endurance and
power: a multicentre study. *ERJ Open Res.* 2023;9(5):00313-2023.
doi:10.1183/23120541.00313-2023

| Item | Value | Source |
|---|---|---|
| Position | Seated on a Biodex, hip and knee at 90°, trunk and hip strapped, dominant leg | Online supplement |
| Equation (N·m) | −982.2 + 12.6 × age − 50.5 × sex + 742.7 × height (m) + 1.6 × BMI − 8.6 × age × height (m) | Table 2 |
| Sex coding | **Male = 0**, female = 1 | Table 2 footnote |
| SEE | 32.16 N·m, pooled across sexes | Table 2 |
| Weakness | LLN at the 5th percentile | Methods |
| Sample | 158 healthy adults, 40–89 yr, 47 % men; 62 ± 12 yr, 1.69 ± 0.08 m, BMI 25.8 ± 4.0 | Methods, Table 1 |
| Trial kept | **Mean of the 2 best** reproducible (within 10 %) of 5 trials | Online supplement |
| Device note shown in the app | Measured on a Biodex: fixed dynamometry (strap and load cell) may give lower values in the strongest subjects | See cross-check below |

## References not used

| Reference | Reason |
|---|---|
| McKay et al. 2017 (1000 Norms Project) | Knee at **60°** of flexion (1000 Norms Project protocol booklet, p. 40). Only age- and sex-band means, no individual prediction equation |
| Harbo et al. 2012 | Isometric knee angle given only as "neutral joint position" |
| Neder et al. 1999 | Isokinetic (concentric) testing |
| Decramer et al. 1997 | Derivation sample and age range not reported |

## Design decisions

- **Result**: % of predicted and z-score = (measured − predicted) / residual SD. The
  lower limit of normal (LLN) is the 5th percentile, z = −1.645, the weakness
  threshold used by Seymour and Tanguay. The fixed 80 % of predicted cut-off is
  not used because it is not derived from the reference data.
- **Pooled residual SD**: all three articles publish a single residual SD for both
  sexes. Strength varies less in absolute terms in women, so the LLN is too low for
  women. The app keeps z and LLN for Seymour and Tanguay with a caution, and shows
  **% of predicted only** for Hogrel in women (LLN about 29 % of predicted for a
  65-year-old woman otherwise). Sex-specific SDs are not invented.
- **Atypical profile**: a caution is shown when a predictor of an equation is more
  than 1.5 SD from the reference sample mean (sex-specific for Hogrel, pooled for
  Seymour and Tanguay).
- **Lever arm**: torque = force × perpendicular distance from the knee axis to the
  line of action of the strap, i.e. to the **center** of the strap. With the leg
  vertical and the strap horizontal this distance is measured along the tibia.
  Measuring to the lower edge of the strap overestimates torque by about half the
  strap width (≈ 8 % for a 5 cm strap at 33 cm). The field has no default value.
- **Input ranges**: values outside plausible adult ranges are not computed, which
  also covers partial typing (e.g. "1" on the way to "170").

## Cross-check with published healthy-sample means

Each equation reproduces its own sample: Hogrel (Table 2 means) z ≈ 0, Tanguay
(Table 1) z = +0.03, Seymour (Table 1, sex-weighted) z = −0.34. Applied to other
samples, Tanguay predicts about 35 % more than Hogrel near 62 years and about 50 %
more near 44 years: the mean healthy man of Hogrel (43.6 yr, 176 cm, 78 kg,
168.9 N·m) has z = −2.67 with Tanguay. Possible causes are the device (Biodex vs
fixed frame and strap), the populations, and extrapolation of the Tanguay equation
below about 50 years. Tanguay is best read with Biodex measurements in people aged
55 or more.

For reference, Hogrel, Benveniste & Bachasson (*Physiol Meas* 2020,
doi:10.1088/1361-6579/ab6b49) found a mean difference of −1.7 N·m between a fixed
strap dynamometer (MyoQuad) and a Biodex in patients with inclusion body myositis
(mean torque about 30 N·m); agreement at higher torques was not tested.
