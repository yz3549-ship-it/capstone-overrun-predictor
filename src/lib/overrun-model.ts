export const MODEL_RANGE = {
  temperature: { min: 20, max: 25 },
  blastTime: { min: 1.5, max: 3 },
} as const;

export const MODEL_VERSION = {
  dataDate: 'October 4, 2026',
  sourceMd5: '13222519c0889dbfbb11fe8a83a22efb',
  seed: 20260911,
  lambda: 0.316227766016838,
} as const;

export const OPTIMUM = {
  temperature: 25,
  blastTime: 3,
  prediction: 32.2371522196659,
  interval: [31.2453906753555, 33.231642060434] as const,
  stability: 100,
} as const;

export const MODEL_METRICS = {
  name: 'Quadratic ridge',
  mae: 1.25236756660987,
  rmse: 1.54889254984147,
  r2: 0.853360139100642,
  baselineMae: 3.97988884300081,
  observations: 24,
  conditions: 12,
} as const;

// Coefficients exported from the current R ridge fit, acting on standardized
// polynomial features. Verified against all 1,581 R grid predictions.
export const RIDGE_COEFFICIENTS = [
  26.2968485321196, 0.121982170143558, 3.61364266511866,
  0.589747468127915, -0.365630817113613, 0.527637497959947,
] as const;
export const X_CENTER = [22.5, 2.25] as const;
export const X_SCALE = [2.08514414057075, 0.571040240720161] as const;

export function isWithinModelRange(temperature: number, blastTime: number) {
  return (
    Number.isFinite(temperature) && Number.isFinite(blastTime) &&
    temperature >= MODEL_RANGE.temperature.min &&
    temperature <= MODEL_RANGE.temperature.max &&
    blastTime >= MODEL_RANGE.blastTime.min &&
    blastTime <= MODEL_RANGE.blastTime.max
  );
}

export function predictOverrun(temperature: number, blastTime: number) {
  if (!isWithinModelRange(temperature, blastTime)) {
    throw new RangeError(
      'Inputs must remain within T_mix0 20–25 and t_blast 1.5–3.0.',
    );
  }

  const u = (temperature - X_CENTER[0]) / X_SCALE[0];
  const v = (blastTime - X_CENTER[1]) / X_SCALE[1];
  const [intercept, linearT, linearTime, squareT, squareTime, interaction] = RIDGE_COEFFICIENTS;
  return intercept + linearT * u + linearTime * v + squareT * u ** 2 +
    squareTime * v ** 2 + interaction * u * v;
}
