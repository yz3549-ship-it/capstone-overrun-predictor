'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  FlaskConical,
  Info,
  RotateCcw,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Timer,
  TrendingUp,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  MODEL_METRICS,
  MODEL_VERSION,
  MODEL_RANGE,
  OPTIMUM,
  predictOverrun,
} from '@/lib/overrun-model';

type GridRow = {
  temperature: number;
  blastTime: number;
  prediction: number;
  lower: number;
  upper: number;
  optimumFrequency: number;
};

type TestedCondition = {
  id: string;
  temperature: number;
  blastTime: number;
  observedMean: number;
  observedSd: number;
  prediction: number;
  lower: number;
  upper: number;
  rank: number;
};

function clean(value: string) {
  return value.replace(/^"|"$/g, '');
}

function rowsFromCsv(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => line.split(',').map(clean));
}

function parseGrid(text: string): GridRow[] {
  return rowsFromCsv(text).map((row) => ({
    temperature: Number(row[0]),
    blastTime: Number(row[1]),
    prediction: Number(row[2]),
    lower: Number(row[3]),
    upper: Number(row[4]),
    optimumFrequency: Number(row[5]),
  }));
}

function parseTestedConditions(text: string): TestedCondition[] {
  return rowsFromCsv(text).map((row) => ({
    id: row[0],
    temperature: Number(row[1]),
    blastTime: Number(row[2]),
    observedMean: Number(row[3]),
    observedSd: Number(row[4]),
    prediction: Number(row[5]),
    lower: Number(row[6]),
    upper: Number(row[7]),
    rank: Number(row[8]),
  }));
}

function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

function ResponseCurve({
  data,
  currentBlastTime,
  currentPrediction,
}: {
  data: Array<{ blastTime: number; prediction: number }>;
  currentBlastTime: number;
  currentPrediction: number;
}) {
  const width = 720;
  const height = 300;
  const padding = { top: 18, right: 22, bottom: 42, left: 52 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const yMin = 20;
  const yMax = 33;
  const x = (value: number) =>
    padding.left + ((value - 1.5) / (3 - 1.5)) * innerWidth;
  const y = (value: number) =>
    padding.top + (1 - (value - yMin) / (yMax - yMin)) * innerHeight;
  const line = data
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${x(point.blastTime).toFixed(2)} ${y(point.prediction).toFixed(2)}`,
    )
    .join(' ');
  const yTicks = [20, 24, 28, 32];
  const xTicks = [1.5, 2, 2.5, 3];

  return (
    <div className="w-full overflow-hidden rounded-xl bg-muted/25 p-2">
      <svg
        aria-label="Predicted overrun across blast time at the selected initial mix temperature"
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#d7e1e5"
              strokeDasharray="4 5"
            />
            <text
              x={padding.left - 11}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {tick}%
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="#e5ecef"
            />
            <text
              x={x(tick)}
              y={height - 16}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {tick.toFixed(1)}
            </text>
          </g>
        ))}
        <path
          d={line}
          fill="none"
          stroke="#1b6d8c"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <line
          x1={x(currentBlastTime)}
          x2={x(currentBlastTime)}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="#d07142"
          strokeDasharray="5 5"
          strokeWidth="2"
        />
        <circle
          cx={x(currentBlastTime)}
          cy={y(currentPrediction)}
          fill="#d07142"
          r="7"
          stroke="#ffffff"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  const [temperature, setTemperature] = useState(25);
  const [blastTime, setBlastTime] = useState(3);
  const [gridRows, setGridRows] = useState<GridRow[]>([]);
  const [testedConditions, setTestedConditions] = useState<TestedCondition[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/model-grid.csv').then((response) => response.text()),
      fetch('/tested-conditions.csv').then((response) => response.text()),
    ]).then(([gridText, testedText]) => {
      if (!active) return;
      setGridRows(parseGrid(gridText));
      setTestedConditions(parseTestedConditions(testedText));
    });
    return () => {
      active = false;
    };
  }, []);

  const prediction = useMemo(
    () => predictOverrun(temperature, blastTime),
    [temperature, blastTime],
  );
  const differenceFromOptimum = prediction - OPTIMUM.prediction;

  const nearestGridSetting = useMemo(() => {
    if (!gridRows.length) return null;
    return gridRows.reduce((nearest, row) => {
      const rowDistance =
        Math.abs(row.temperature - temperature) / 0.1 +
        Math.abs(row.blastTime - blastTime) / 0.05;
      const nearestDistance =
        Math.abs(nearest.temperature - temperature) / 0.1 +
        Math.abs(nearest.blastTime - blastTime) / 0.05;
      return rowDistance < nearestDistance ? row : nearest;
    });
  }, [blastTime, gridRows, temperature]);

  const testedCondition = useMemo(
    () =>
      testedConditions.find(
        (row) =>
          Math.abs(row.temperature - temperature) < 0.0001 &&
          Math.abs(row.blastTime - blastTime) < 0.0001,
      ) ?? null,
    [blastTime, temperature, testedConditions],
  );

  const topConditions = useMemo(
    () => [...testedConditions].sort((a, b) => a.rank - b.rank).slice(0, 3),
    [testedConditions],
  );

  const curveData = useMemo(
    () =>
      Array.from({ length: 31 }, (_, index) => {
        const curveBlastTime = Number((1.5 + index * 0.05).toFixed(2));
        return {
          blastTime: curveBlastTime,
          prediction: Number(
            predictOverrun(temperature, curveBlastTime).toFixed(4),
          ),
        };
      }),
    [temperature],
  );

  const resetToOptimum = () => {
    setTemperature(OPTIMUM.temperature);
    setBlastTime(OPTIMUM.blastTime);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Snowflake className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading text-base font-semibold tracking-tight">
                Overrun Predictor
              </p>
              <p className="text-xs text-muted-foreground">
                Current data · {MODEL_VERSION.dataDate}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="hidden border-primary/20 bg-primary/5 text-primary sm:inline-flex"
          >
            <ShieldCheck data-icon="inline-start" />
            Grouped cross-validation
          </Badge>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <div className="mb-7 max-w-3xl">
          <Badge className="mb-3 bg-accent text-accent-foreground">
            Interactive prediction tool
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-balance md:text-4xl">
            Estimate ice cream overrun before the experiment
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Adjust the initial mix temperature and blast time to obtain an
            instant estimate from the quadratic ridge machine learning model
            fitted to the current laboratory data.
          </p>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <Card className="border-0 shadow-[0_18px_50px_rgb(28_57_78/8%)] ring-border">
            <CardHeader className="border-b border-border/70 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FlaskConical className="size-5 text-primary" />
                Experiment settings
              </CardTitle>
              <CardDescription>
                Inputs outside the observed range are rejected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-2">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Thermometer className="size-4 text-primary" />
                    <div>
                      <label
                        className="font-medium"
                        htmlFor="temperature-input"
                      >
                        Initial mix temperature
                      </label>
                      <p className="text-xs text-muted-foreground">
                        T_mix0 · {MODEL_RANGE.temperature.min.toFixed(1)} to{' '}
                        {MODEL_RANGE.temperature.max.toFixed(1)}°C
                      </p>
                    </div>
                  </div>
                  <Input
                    id="temperature-input"
                    aria-label="Initial mix temperature"
                    className="w-24 text-right font-mono tabular-nums"
                    type="number"
                    min={MODEL_RANGE.temperature.min}
                    max={MODEL_RANGE.temperature.max}
                    step="0.1"
                    value={temperature}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (
                        Number.isFinite(value) &&
                        value >= MODEL_RANGE.temperature.min &&
                        value <= MODEL_RANGE.temperature.max
                      ) {
                        setTemperature(value);
                      }
                    }}
                  />
                </div>
                <Slider
                  aria-label="Initial mix temperature"
                  min={MODEL_RANGE.temperature.min}
                  max={MODEL_RANGE.temperature.max}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(value) =>
                    setTemperature(Number(value[0].toFixed(1)))
                  }
                  className="py-2"
                />
                <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                  <span>20.0</span>
                  <span>22.5</span>
                  <span>25.0</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Timer className="size-4 text-primary" />
                    <div>
                      <label className="font-medium" htmlFor="blast-input">
                        Blast time
                      </label>
                      <p className="text-xs text-muted-foreground">
                        t_blast · {MODEL_RANGE.blastTime.min.toFixed(2)} to{' '}
                        {MODEL_RANGE.blastTime.max.toFixed(2)} s
                      </p>
                    </div>
                  </div>
                  <Input
                    id="blast-input"
                    aria-label="Blast time"
                    className="w-24 text-right font-mono tabular-nums"
                    type="number"
                    min={MODEL_RANGE.blastTime.min}
                    max={MODEL_RANGE.blastTime.max}
                    step="0.05"
                    value={blastTime}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (
                        Number.isFinite(value) &&
                        value >= MODEL_RANGE.blastTime.min &&
                        value <= MODEL_RANGE.blastTime.max
                      ) {
                        setBlastTime(value);
                      }
                    }}
                  />
                </div>
                <Slider
                  aria-label="Blast time"
                  min={MODEL_RANGE.blastTime.min}
                  max={MODEL_RANGE.blastTime.max}
                  step={0.05}
                  value={[blastTime]}
                  onValueChange={(value) =>
                    setBlastTime(Number(value[0].toFixed(2)))
                  }
                  className="py-2"
                />
                <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                  <span>1.50</span>
                  <span>2.25</span>
                  <span>3.00</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between gap-3 bg-muted/35">
              <p className="text-xs text-muted-foreground">
                Observed domain only
              </p>
              <Button variant="outline" size="sm" onClick={resetToOptimum}>
                <RotateCcw data-icon="inline-start" />
                Highest fitted setting
              </Button>
            </CardFooter>
          </Card>

          <Card className="result-card border-0 text-white shadow-[0_24px_70px_rgb(14_52_75/22%)] ring-0">
            <CardHeader className="pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">
                    Predicted overrun
                  </p>
                  <CardTitle className="mt-2 text-white">
                    Current model estimate
                  </CardTitle>
                </div>
                <Badge className="bg-white/12 text-white ring-1 ring-white/15">
                  {MODEL_METRICS.name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between pt-6">
              <div>
                <output
                  aria-live="polite"
                  aria-label={`Predicted overrun ${prediction.toFixed(2)} percent`}
                  className="block font-mono text-6xl font-semibold tracking-[-0.06em] tabular-nums md:text-7xl"
                >
                  {formatPercent(prediction)}
                </output>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/70">
                  {nearestGridSetting ? (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs tabular-nums ring-1 ring-white/10">
                      Fitted response 95% interval {formatPercent(nearestGridSetting.lower)}–
                      {formatPercent(nearestGridSetting.upper)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/10">
                      Loading uncertainty interval
                    </span>
                  )}
                </div>
                <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
                  Estimate for T_mix0 {temperature.toFixed(2)}°C and t_blast{' '}
                  {blastTime.toFixed(2)} s, computed from the current fitted ridge
                  model. The bootstrap interval describes the fitted response
                  at the nearest grid setting, not a future individual run.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/12 bg-white/7 p-4">
                  <p className="text-xs text-white/60">Exploratory optimum</p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                    {formatPercent(OPTIMUM.prediction)}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    T_mix0 25.0 · t_blast 3.0
                  </p>
                </div>
                <div className="rounded-xl border border-white/12 bg-white/7 p-4">
                  <p className="text-xs text-white/60">Difference from optimum</p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-lg font-semibold tabular-nums">
                    {differenceFromOptimum > -0.005 ? (
                      'At optimum'
                    ) : (
                      <>
                        {differenceFromOptimum.toFixed(2)} pp
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Within the tested range
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-white/10 bg-black/10 text-xs text-white/65">
              In-range model estimate · not a universal process optimum
            </CardFooter>
          </Card>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ['Grouped MAE', `${MODEL_METRICS.mae.toFixed(2)} pp`],
            ['Mean baseline MAE', `${MODEL_METRICS.baselineMae.toFixed(2)} pp`],
            ['Grouped RMSE', `${MODEL_METRICS.rmse.toFixed(2)} pp`],
            ['Predictive R²', MODEL_METRICS.r2.toFixed(3)],
            [
              'Training design',
              `${MODEL_METRICS.observations} runs · ${MODEL_METRICS.conditions} conditions`,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="border-0 shadow-sm ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="size-5 text-primary" />
                Response across blast time
              </CardTitle>
              <CardDescription>
                Predicted overrun at T_mix0 {temperature.toFixed(2)} as t_blast changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponseCurve
                data={curveData}
                currentBlastTime={blastTime}
                currentPrediction={prediction}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>t_blast</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#d07142]" />
                  Current setting
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-0 shadow-sm ring-border">
              <CardHeader>
                <CardTitle className="text-lg">Setting context</CardTitle>
                <CardDescription>
                  Relationship to the current 12-condition experiment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-muted/55 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {testedCondition ? 'Tested condition' : 'Model-only setting'}
                  </p>
                  {testedCondition ? (
                    <>
                      <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
                        {formatPercent(testedCondition.observedMean)} observed mean
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Two replicates · SD {testedCondition.observedSd.toFixed(2)} pp
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      This exact combination was not directly tested. Treat the
                      result as an in-range interpolation from the model.
                    </p>
                  )}
                </div>

                {nearestGridSetting && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Interval basis</p>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                        {nearestGridSetting.temperature.toFixed(1)}, {' '}
                        {nearestGridSetting.blastTime.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conditional bootstrap frequency</p>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                        {OPTIMUM.stability.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert className="border-amber-200 bg-amber-50/75 text-amber-950">
              <Info />
              <AlertTitle>Exploratory model</AlertTitle>
              <AlertDescription className="text-amber-900/75">
                Pooled validation R² is {MODEL_METRICS.r2.toFixed(3)}. Entire
                conditions were held out for validation. Two replicates per
                condition support in-range comparison, not a guaranteed result
                for a new batch. Bootstrap frequency assumes this fixed ridge
                model and the available within-condition replicates.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <Card className="mt-8 border-0 shadow-sm ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Top tested conditions</CardTitle>
            <CardDescription>
              Highest model predictions among the 12 measured combinations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Rank</th>
                    <th className="pb-3 font-medium">T_mix0</th>
                    <th className="pb-3 font-medium">t_blast</th>
                    <th className="pb-3 font-medium">Predicted</th>
                    <th className="pb-3 font-medium">Observed mean</th>
                    <th className="pb-3 text-right font-medium">Fitted response 95% interval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {topConditions.length ? (
                    topConditions.map((row) => (
                      <tr key={row.id}>
                        <td className="py-3 font-mono tabular-nums">{row.rank}</td>
                        <td className="py-3 font-mono tabular-nums">
                          {row.temperature.toFixed(1)}
                        </td>
                        <td className="py-3 font-mono tabular-nums">
                          {row.blastTime.toFixed(1)}
                        </td>
                        <td className="py-3 font-mono font-semibold tabular-nums">
                          {formatPercent(row.prediction)}
                        </td>
                        <td className="py-3 font-mono tabular-nums">
                          {formatPercent(row.observedMean)}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums">
                          {formatPercent(row.lower)}–{formatPercent(row.upper)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-4 text-muted-foreground" colSpan={6}>
                        Loading tested-condition results
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <footer className="mt-8 flex flex-col gap-2 border-t border-border/80 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Quadratic ridge ML · grouped leave-one-condition-out validation</p>
          <p>Model range T_mix0 20–25°C · t_blast 1.5–3.0 s</p>
        </footer>
      </section>
    </main>
  );
}
