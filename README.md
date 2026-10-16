# Capstone Overrun Predictor

Interactive prediction of ice cream overrun from initial mix temperature and blast time, using the fitted quadratic ridge model reported in Yamin Zhuang's capstone study.

This repository reproduces the prediction interface locally. The interface and model are adapted from the hosted [Overrun Predictor](https://capstone-overrun-predictor-yz.zym216.chatgpt.site/). This standalone version uses React and Vite and needs no ChatGPT account, API key, Cloudflare account, database, or R installation. Predictions are calculated in your browser.

## Run locally

Install [Node.js](https://nodejs.org/) version 22.13 or newer. Then open a terminal:

```bash
git clone https://github.com/yz3549-ship-it/capstone-overrun-predictor.git
cd capstone-overrun-predictor
git checkout v1.0.0
npm ci
npm run dev
```

Open the local address printed in the terminal, normally `http://127.0.0.1:5173`. Move either slider or enter a numeric value to update overrun. Use **Ctrl+C** in the terminal to stop the server. Internet access is needed for the initial dependency installation; the running predictor uses local files.

Alternatively, download the repository ZIP from GitHub, extract it, open a terminal in the extracted folder, and run `npm ci` followed by `npm run dev`.

## Verify and build

```bash
npm test
npm run build
npm run preview
```

`npm test` compares the browser prediction function against all 1,581 reference predictions exported from the fitted R model, checks the 12 tested combinations, and verifies rejection of invalid inputs. The maximum permitted difference is 1e-10 percentage points. `npm run build` checks TypeScript and creates a production build in `dist/`. `npm run preview` serves that build locally.

## Model and input domain

| Input | Meaning | Accepted range |
| --- | --- | --- |
| `T_mix0` | Initial mix temperature | 20-25 degrees Celsius |
| `t_blast` | Blast duration | 1.5-3.0 seconds |

The model was fitted to 24 observations at 12 experimental combinations with two observations each. Condition-held-out validation gave MAE 1.252 percentage points, RMSE 1.549 percentage points, and pooled predictive R-squared 0.853. At 25 degrees Celsius and 3.0 seconds, the prediction is **32.2371522196659%**.

The source data version is identified by workbook MD5 `13222519c0889dbfbb11fe8a83a22efb`. The interface retains the October 4, 2026 model version; the standalone reproduction package is version 1.0.0.

## What is reproduced

- `src/lib/overrun-model.ts`: fitted coefficients, standardization constants, domain checks, and inference function.
- `public/model-grid.csv`: predictions and bootstrap fitted-response intervals on the full in-range grid.
- `public/tested-conditions.csv`: condition means, sample SDs, and fitted predictions.
- `src/App.tsx`: sliders, numeric inputs, response curve, validation metrics, and tested-condition comparison.

This package reproduces inference from the fitted model. It does not retrain or rerun the model-selection analysis. See [MODEL_CARD.md](MODEL_CARD.md) for the model equation and interpretation.

## Interpretation

The displayed bootstrap interval describes variation in the fitted response using within-condition resampling with the ridge penalty fixed. It is not an individual future-run prediction interval. The displayed optimum is the model maximum inside the tested domain, not proof of a universal process optimum. Higher overrun alone does not establish better product quality.
