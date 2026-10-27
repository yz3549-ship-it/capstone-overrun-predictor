# Quadratic ridge model

Let `T` be initial mix temperature in degrees Celsius and `t` be blast time in seconds.

```text
u = (T - 22.5) / 2.08514414057075
v = (t - 2.25) / 0.571040240720161

overrun (%) = 26.2968485321196
            + 0.121982170143558 * u
            + 3.61364266511866  * v
            + 0.589747468127915 * u^2
            - 0.365630817113613 * v^2
            + 0.527637497959947 * u*v
```

Only pre-experiment temperature and time are inputs. The regularization parameter is 0.316227766016838. The analysis seed was 20260911. Model-family performance was compared using outer leave-one-condition-out validation and inner five-fold grouped tuning for machine learning models. The final ridge model was selected by the prespecified one-standard-error preference rule.

The 12 groups consist of temperatures 20, 22.5, and 25 degrees Celsius crossed with times 1.5, 2.0, 2.5, and 3.0 seconds. Inputs outside that domain and nonfinite inputs are rejected. Estimates between tested combinations are model interpolations.

The source workbook is not included. The included condition-level summaries and prediction grid reproduce what is displayed by the interface. This repository contains no hosting credentials or server bindings.

At the tested condition with the highest observed mean (25 degrees Celsius, 3.0 seconds), observed overrun was 32.18 +/- 1.20% (mean +/- sample SD, two observations), and the fitted prediction was 32.24%. The 95% bootstrap fitted-response interval was 31.25-33.23%. Bootstrap results condition on the available replicate variation and the selected ridge form.

## Ice cream temperature model

This independent model predicts recorded product temperature, not initial mix temperature. It uses no measured overrun or other post-experiment input.

```text
u = T - 22.5
v = t - 2.25
T_ice (°C) = -4.3875 + 0.1025*u - 4.74*v - 0.201*u^2 - 2.8*v^2 + 0.01*u*v
```

Quadratic OLS had the lowest outer leave-one-condition-out MAE (0.814°C), RMSE 0.983°C and pooled predictive R² 0.884. All methods used the same 12 groups; ML tuning used five inner grouped folds with seed 20260911. Candidate primary models were additive, interaction and quadratic OLS, quadratic ridge, radial SVR, random forest and gradient boosting. Time-only OLS forms were exploratory ablations. The one-standard-error threshold was 0.947633°C; quadratic OLS, ridge and gradient boosting qualified. Preference for simpler parametric forms selected quadratic OLS. This heuristic is not a significance test. Gradient boosting had the best ML MAE (0.885°C).

All 24 measurements were retained. The two responses use separate models and target-specific units; MAEs should not be compared numerically across targets. Estimates are intended for the same formulation and observed operating domain. More independent batches are needed to evaluate external generalization. Included temperature intervals come from 1,000 within-condition bootstrap samples with the quadratic form fixed and describe the fitted mean response.
