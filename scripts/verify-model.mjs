import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { predictOverrun, OPTIMUM } from '../src/lib/overrun-model.ts';
import { predictIceCreamTemperature } from '../src/lib/temperature-model.ts';

const csv = (name) => readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8')
  .trim().split(/\r?\n/).slice(1).map(row => row.split(',').map(x => x.replace(/^"|"$/g, '')));
const grid = csv('model-grid.csv');
assert.equal(grid.length, 1581);
let maximumDifference = 0;
for (const row of grid) {
  const values = row.map(Number);
  assert.ok(values.every(Number.isFinite));
  const prediction = predictOverrun(values[0], values[1]);
  maximumDifference = Math.max(maximumDifference, Math.abs(prediction - values[2]));
}
assert.ok(maximumDifference < 1e-10);
const tested = csv('tested-conditions.csv');
assert.equal(tested.length, 12);
for (const row of tested) {
  assert.ok(Math.abs(predictOverrun(Number(row[1]), Number(row[2])) - Number(row[5])) < 1e-10);
}
assert.ok(Math.abs(predictOverrun(25, 3) - 32.2371522196659) < 1e-10);
assert.ok(Math.abs(predictOverrun(20, 1.5) - 22.452386515353975) < 1e-10);
assert.ok(Math.abs(predictOverrun(25, 3) - OPTIMUM.prediction) < 1e-10);
for (const input of [[19.9,2],[25.1,2],[22,1.49],[22,3.01],[NaN,2],[22,Infinity]]) {
  assert.throws(() => predictOverrun(...input), RangeError);
}
console.log(`Verified ${grid.length} R-exported grid predictions and ${tested.length} tested conditions; maximum difference ${maximumDifference}.`);
const temperatureGrid=csv('temperature-grid.csv');
assert.equal(temperatureGrid.length,1581);
let temperatureError=0;
for(const row of temperatureGrid){
  const values=row.map(Number);assert.ok(values.every(Number.isFinite));
  temperatureError=Math.max(temperatureError,Math.abs(predictIceCreamTemperature(values[0],values[1])-values[9]));
}
assert.ok(temperatureError<1e-10);
const temperatureSummary=JSON.parse(readFileSync(new URL('../public/temperature-results.json',import.meta.url),'utf8'));
for(const row of temperatureSummary.tested)assert.ok(Math.abs(predictIceCreamTemperature(row.T_mix0,row.t_blast)-row.prediction)<1e-10);
for(const input of [[19.9,2],[25.1,2],[22,1.49],[22,3.01],[NaN,2],[22,Infinity]])assert.throws(()=>predictIceCreamTemperature(...input),RangeError);
console.log(`Verified ${temperatureGrid.length} temperature grid settings and 12 conditions; maximum difference ${temperatureError}.`);
