// Full-quadratic OLS model fitted in R to the 24 recorded product temperatures.
// u = initial mix temperature - 22.5; v = blast time - 2.25.
export function predictIceCreamTemperature(temperature: number, blastTime: number): number {
  if (!Number.isFinite(temperature) || !Number.isFinite(blastTime) ||
      temperature < 20 || temperature > 25 || blastTime < 1.5 || blastTime > 3) {
    throw new RangeError('Use initial mix temperature 20–25°C and blast time 1.5–3.0 s.');
  }
  const u = temperature - 22.5;
  const v = blastTime - 2.25;
  return -4.387500000000003 + 0.10250000000000037*u - 4.74*v
    - 0.20100000000000007*u*u - 2.800000000000001*v*v + 0.00999999999999922*u*v;
}

export const TEMPERATURE_METRICS = {
  name: 'Quadratic OLS', mae: 0.814256705659932, rmse: 0.983277816350508,
  r2: 0.884234452509237, baselineMae: 2.742424242424243,
};
