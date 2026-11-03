# 🧠 HealthInsight AI – Patient Risk Screening Prototype

## Overview

**HealthInsight AI** is a browser-based prototype of a virtual health assistant. Through a step-by-step chat, it collects basic patient information (demographics, history, lifestyle and measurements) and screens it for chronic disease risk: obesity, hypertension, type 2 diabetes and high cholesterol.

**Current status: rule-based prototype.** Every result comes from a published clinical guideline or a validated risk score, listed below. Machine-learning models are on the roadmap. They will be added only after they are validated against these baselines on public health datasets.

> ⚠️ This is a demonstration prototype. It is **not a medical device**, it does **not** provide a diagnosis, and it has not been clinically validated. Do not enter real patient data. Everything runs in the browser, and no data is stored or sent anywhere.

---

## 🩺 What the prototype evaluates

| Measure | Categories | Source |
|---|---|---|
| BMI | Underweight, healthy, overweight, obesity class 1–3 | CDC adult BMI categories |
| Blood pressure | Normal, elevated, stage 1, stage 2, severe range | ACC/AHA (2017, kept in the 2025 guideline) |
| Fasting glucose | Normal < 100, prediabetes 100–125, diabetes range ≥ 126 mg/dL | ADA Standards of Care |
| Non-fasting glucose | Diabetes range ≥ 200 mg/dL, otherwise inconclusive | ADA Standards of Care |
| HbA1c | Normal < 5.7, prediabetes 5.7–6.4, diabetes range ≥ 6.5% | ADA Standards of Care |
| Total cholesterol | Desirable < 200, borderline 200–239, high ≥ 240 mg/dL | NCEP ATP III |
| Waist circumference | Men > 102 cm, women > 88 cm (Asian descent: 90 / 80 cm) | NHLBI / IDF |
| Alcohol | Men > 14, women > 7 drinks/week | NIAAA |
| Smoking | Current smoker flagged | USPSTF |
| **Type 2 diabetes risk** | **ADA risk score 0–10; ≥ 5 = increased risk** | **ADA Risk Test (Bang et al., Ann Intern Med 2009)** |

Notes:
- The ADA Risk Test uses a height/weight chart. This prototype approximates it with BMI cut-offs (25 / 30 / 40, or 23 for Asian Americans as recommended by the ADA).
- Values in the "diabetes range" always require a confirmatory test by a clinician.

---

## 🚀 Features

- 💬 **Conversational interface** with input validation, optional fields (`skip`), `back` to fix the previous answer and `restart`.
- 📊 **Screening summary** with the value, category and guideline source for each measure, the ADA risk score breakdown and suggested next steps.
- 🖨️ **Print / save as PDF** of the summary.
- 🔒 **Privacy by design:** no backend, no storage, user input is never rendered as HTML.
- ✅ **Unit tests** for all clinical rules, run automatically on GitHub Actions.

---

## 📁 Project Structure

```
├── index.html               # Page layout
├── js/
│   ├── risk.js              # Clinical rules and ADA risk score (pure functions, no DOM)
│   └── app.js               # Chat flow and report rendering
├── style/
│   └── styles.css           # Styles, including mobile and print
├── images/
│   └── background.jpg
├── tests/
│   ├── risk.test.js         # Unit tests (Node or browser)
│   └── index.html           # Runs the tests in the browser
└── .github/workflows/
    └── tests.yml            # CI: runs the unit tests on every push
```

---

## 🧪 How to Use

1. Clone this repository:
   ```bash
   git clone https://github.com/EnioGDantas/HealthInsight-AI-Personalized-Patient-Risk-Assessment.git
   ```
2. Open `index.html` in a modern browser, or use the GitHub Pages link below.

### Running the tests

```bash
node tests/risk.test.js
```

Or open `tests/index.html` in a browser.

### Contact form

GitHub Pages only serves static files, so it cannot run a PHP mailer. By default, the contact form opens the visitor's e-mail app with the message ready to send. To receive messages directly, create a free form endpoint (for example on [Formspree](https://formspree.io)) and paste its URL into `CONTACT_ENDPOINT` at the top of `js/app.js`.

---

## 🔮 Roadmap

| Step | Status | Notes |
|---|---|---|
| Guideline-based screening + ADA risk score | ✅ Done | This version |
| Validation study on public data | 🔜 Next | NHANES (CDC): compare the ADA score with ML models (logistic regression, gradient boosting) using AUROC, calibration, decision curves and subgroup (fairness) analysis, plus SHAP. Report following TRIPOD+AI. |
| Cardiovascular risk | 🔜 Planned | AHA PREVENT equations (requires HDL and eGFR) |
| Structured form for clinicians | 🔜 Planned | Faster than the chat for professional use |
| Backend API (FastAPI) | 🔜 Planned | Only needed once a trained model exists |
| FHIR / EHR integration | 🔜 Planned | Test with Synthea synthetic patients |
| Clinical pilot | 🔜 Planned | Retrospective, de-identified, with ethics (IRB) approval |

---

## 🌐 Hosting via GitHub Pages

`https://eniogdantas.github.io/HealthInsight-AI-Personalized-Patient-Risk-Assessment/`

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md).

---

## 📄 License

**Custom License – Educational Use Only**  
© 2025 [Enio Dantas](mailto:enio.danttas@gmail.com)

This project is provided **strictly for academic, demonstration, and non-commercial purposes**.

### ❌ You may NOT:
- Redistribute or publish this project or parts of it  
- Modify and reuse for commercial or governmental use  
- Deploy this project for production without explicit permission

### ✅ You may:
- Study and review the source code  
- Reference or fork for internal learning or testing  
- Use it as inspiration for similar educational projects

---
## 📰 News

📌 [How AI Is Preventing Chronic Disease: Inside the HealthInsight AI Platform](https://medium.com/@enio.danttas/how-ai-is-preventing-chronic-disease-inside-the-healthinsight-ai-platform-6810ea84cbef)  
🗓️ Published: June 2025  

---
## 🤝 Contact

📧 Email: [enio.danttas@gmail.com](mailto:enio.danttas@gmail.com)  
🔗 LinkedIn: [linkedin.com/in/eniogdantas](https://linkedin.com/in/eniogdantas)
