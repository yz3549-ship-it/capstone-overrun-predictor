import { useEffect, useState } from 'react';
import { predictIceCreamTemperature, TEMPERATURE_METRICS } from '@/lib/temperature-model';

type Comparison = {model:string;label:string;family:string;MAE:number;RMSE:number;R2:number;selected:boolean};
type Condition = {T_mix0:number;t_blast:number;observed_mean:number;observed_sd:number};
type Summary = {comparison:Comparison[];tested:Condition[]};

export function TemperaturePrediction({temperature,blastTime}:{temperature:number;blastTime:number}) {
  const [summary,setSummary] = useState<Summary|null>(null);
  const [failed,setFailed] = useState(false);
  useEffect(()=>{let active=true;fetch('/temperature-results.json').then(r=>{if(!r.ok)throw new Error('Unavailable');return r.json() as Promise<Summary>;}).then(x=>{if(active)setSummary(x);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[]);
  const prediction=predictIceCreamTemperature(temperature,blastTime);
  const observed=summary?.tested.find(x=>Math.abs(x.T_mix0-temperature)<1e-6&&Math.abs(x.t_blast-blastTime)<1e-6);
  const curve=Array.from({length:31},(_,i)=>({t:1.5+i*.05,y:predictIceCreamTemperature(temperature,1.5+i*.05)}));
  const x=(t:number)=>60+(t-1.5)/1.5*620;
  const y=(temp:number)=>20+(-2-temp)/10*210;
  return <details open className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-7 shadow-sm">
    <summary className="cursor-pointer font-heading text-xl font-semibold">Product temperature analysis</summary>
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><p className="mt-2 text-sm text-muted-foreground">Response curve, validation metrics and model comparison · measured immediately after discharge.</p>
      <p className="mt-2 text-sm">Selected model: quadratic OLS response surface · Traditional statistics</p></div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-4">
      {Object.entries({'Grouped MAE':`${TEMPERATURE_METRICS.mae.toFixed(3)}°C`,'Grouped RMSE':`${TEMPERATURE_METRICS.rmse.toFixed(3)}°C`,'Predictive R²':TEMPERATURE_METRICS.r2.toFixed(3),'Baseline MAE':`${TEMPERATURE_METRICS.baselineMae.toFixed(3)}°C`}).map(([k,v])=><div key={k} className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 font-mono font-semibold">{v}</p></div>)}
    </div>
    <p className="mt-4 text-sm">{observed?`Observed at this tested condition: ${observed.observed_mean.toFixed(2)} ± ${observed.observed_sd.toFixed(2)}°C (mean ± SD, n = 2).`:summary?'This exact setting was not tested; the result is an in-range model estimate.':failed?'Observed-condition summaries are temporarily unavailable.':'Loading observed-condition summaries…'}</p>
    <div className="mt-5 rounded-xl bg-muted/25 p-2">
      <svg viewBox="0 0 720 275" role="img" aria-label="Predicted ice cream temperature across blast time" className="w-full h-auto">
        {[-12,-10,-8,-6,-4,-2].map(t=><g key={t}><line x1="60" x2="680" y1={y(t)} y2={y(t)} stroke="#d7e1e5" strokeDasharray="4 5"/><text x="50" y={y(t)+4} textAnchor="end" fill="#526776" fontSize="12">{t}°C</text></g>)}
        {[1.5,2,2.5,3].map(t=><text key={t} x={x(t)} y="253" textAnchor="middle" fill="#526776" fontSize="12">{t.toFixed(1)} s</text>)}
        <path d={curve.map((p,i)=>`${i?'L':'M'}${x(p.t)},${y(p.y)}`).join(' ')} fill="none" stroke="#21683e" strokeWidth="4"/>
        <line x1={x(blastTime)} x2={x(blastTime)} y1="20" y2="230" stroke="#d07142" strokeDasharray="5 5"/>
        <circle cx={x(blastTime)} cy={y(prediction)} r="6" fill="#d07142" stroke="white" strokeWidth="2"/>
      </svg>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">Initial mix temperature {temperature.toFixed(2)}°C · Prediction is the fitted mean response.</p>
    <details className="mt-5 border-t border-border pt-4"><summary className="cursor-pointer font-medium">Compare traditional and machine learning temperature models</summary>
      <p className="mt-3 text-sm text-muted-foreground">All models held out the same 12 conditions. ML tuning used inner five-fold grouped validation. Lower MAE is better; the quadratic OLS model had the lowest MAE. Time-only models are exploratory comparisons.</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Model</th><th className="p-2 text-left">Type</th><th className="p-2 text-right">MAE (°C)</th><th className="p-2 text-right">RMSE (°C)</th><th className="p-2 text-right">R²</th></tr></thead>
      <tbody>{summary?.comparison.slice().sort((a,b)=>a.MAE-b.MAE).map(r=><tr key={r.model} className={r.selected?'bg-primary/10 font-semibold border-b':'border-b'}><td className="p-2">{r.label}{r.selected?' (selected)':''}</td><td className="p-2">{r.family}</td><td className="p-2 text-right font-mono">{r.MAE.toFixed(3)}</td><td className="p-2 text-right font-mono">{r.RMSE.toFixed(3)}</td><td className="p-2 text-right font-mono">{r.R2.toFixed(3)}</td></tr>)}</tbody></table></div>
    </details>
  </details>;
}
