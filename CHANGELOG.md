# Changelog

## 2026-11 – Corrected screening logic

### Fixed
- **Wrong results.** Answers were stored in an array shifted by one position, so the analysis used weight as height, the ethnicity code as weight, cholesterol as blood pressure and waist circumference as glucose. For example, a 175 cm / 95 kg patient was reported with BMI 1.1 ("Normal"), and a healthy patient with 110/70 mmHg was reported as "Elevated" blood pressure. Answers are now stored by name, and regression tests cover both cases.
- **Blood pressure categories** now follow ACC/AHA: values ≥ 130/80 are "Stage 1 hypertension range", not "Elevated".
- **Glucose** now asks whether the measurement was fasting. Non-fasting values below 200 mg/dL are reported as inconclusive instead of being classified.
- **Contact form** returned HTTP 405 because GitHub Pages cannot run PHP, so messages were never delivered. It now opens the visitor's e-mail app, or posts to a form service if `CONTACT_ENDPOINT` is set.
- **Security:** user input was inserted as HTML (XSS). It is now always rendered as text. The PHP mailer, which allowed e-mail header injection, was removed.

### Removed
- The "Results sent to your e-mail" message: no e-mail was ever sent. It is replaced by "Print / save as PDF".
- Questions whose answers were never used (allergies, surgeries, free-text diet and medical history). The patient name is replaced by an optional reference, to avoid collecting identifiable data.

### Added
- Use of all collected data: age, sex, ethnicity, waist, family history, diagnosed hypertension, gestational diabetes, physical activity, smoking, alcohol, cholesterol and HbA1c.
- ADA Type 2 Diabetes Risk Test score with a per-item breakdown.
- Source guideline shown for every result, plus suggested next steps.
- `back`, `restart` and `skip` commands, and range validation for every number.
- Prototype disclaimer, mobile layout and print layout.
- Unit tests (`tests/`) and a GitHub Actions workflow.

### Changed
- The page text describes the prototype as rule-based. Machine-learning models are on the roadmap, after validation on public data.
