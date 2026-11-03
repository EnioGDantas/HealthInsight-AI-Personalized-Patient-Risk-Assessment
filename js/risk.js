/*
 * HealthInsight AI - screening rules (pure functions, no DOM).
 *
 * Every threshold below comes from a published guideline. The source is noted
 * next to each function so a clinician or reviewer can check it.
 *
 * This file runs both in the browser (window.HealthRisk) and in Node
 * (require('./js/risk.js')) so it can be unit tested.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Parsing helpers
  // ---------------------------------------------------------------------------

  // Returns the first number found in the text ("170 cm" -> 170), or NaN.
  function parseNumber(text) {
    const match = String(text).replace(',', '.').match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  // "120/80", "120 / 80 mmHg" -> { systolic: 120, diastolic: 80 }, or null.
  function parseBloodPressure(text) {
    const match = String(text).match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (!match) return null;
    return { systolic: Number(match[1]), diastolic: Number(match[2]) };
  }

  // yes / y / no / n -> true / false, anything else -> null.
  function parseYesNo(text) {
    const value = String(text).trim().toLowerCase();
    if (value === 'yes' || value === 'y') return true;
    if (value === 'no' || value === 'n') return false;
    return null;
  }

  function bmi(heightCm, weightKg) {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  // ---------------------------------------------------------------------------
  // Classifications. Each returns { label, level, note } where level is one of
  // 'ok' | 'watch' | 'high' | 'urgent' | 'unknown'.
  // ---------------------------------------------------------------------------

  // CDC adult BMI categories.
  // https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
  function classifyBmi(value) {
    if (value < 18.5) return { label: 'Underweight', level: 'watch' };
    if (value < 25) return { label: 'Healthy weight', level: 'ok' };
    if (value < 30) return { label: 'Overweight', level: 'watch' };
    if (value < 35) return { label: 'Obesity class 1', level: 'high' };
    if (value < 40) return { label: 'Obesity class 2', level: 'high' };
    return { label: 'Obesity class 3 (severe)', level: 'high' };
  }

  // ACC/AHA blood pressure categories (2017, kept in the 2025 guideline).
  // The patient is placed in the higher category of systolic or diastolic.
  function classifyBloodPressure(systolic, diastolic) {
    if (systolic > 180 || diastolic > 120) {
      return {
        label: 'Severe hypertension range (>180 and/or >120)',
        level: 'urgent',
        note: 'Needs prompt medical evaluation.'
      };
    }
    if (systolic >= 140 || diastolic >= 90) return { label: 'Stage 2 hypertension range', level: 'high' };
    if (systolic >= 130 || diastolic >= 80) return { label: 'Stage 1 hypertension range', level: 'high' };
    if (systolic >= 120) return { label: 'Elevated', level: 'watch' };
    return { label: 'Normal', level: 'ok' };
  }

  // ADA Standards of Care - diagnostic ranges for plasma glucose.
  // Only fasting glucose can be classified as normal / prediabetes.
  // A non-fasting value is only meaningful when it is >= 200 mg/dL.
  function classifyGlucose(mgdl, fasting) {
    if (fasting) {
      if (mgdl >= 126) return { label: 'Diabetes range (fasting >= 126 mg/dL)', level: 'high', note: 'Needs a confirmatory test.' };
      if (mgdl >= 100) return { label: 'Prediabetes range (fasting 100-125 mg/dL)', level: 'watch' };
      if (mgdl < 70) return { label: 'Low (< 70 mg/dL)', level: 'watch', note: 'Possible hypoglycemia; check with a clinician.' };
      return { label: 'Normal (fasting < 100 mg/dL)', level: 'ok' };
    }
    if (mgdl >= 200) return { label: 'Diabetes range (random >= 200 mg/dL)', level: 'high', note: 'Needs a confirmatory test.' };
    return {
      label: 'Inconclusive (non-fasting)',
      level: 'unknown',
      note: 'A non-fasting value below 200 mg/dL cannot rule diabetes in or out. Use fasting glucose or HbA1c.'
    };
  }

  // ADA Standards of Care - HbA1c ranges.
  function classifyHba1c(percent) {
    if (percent >= 6.5) return { label: 'Diabetes range (>= 6.5%)', level: 'high', note: 'Needs a confirmatory test.' };
    if (percent >= 5.7) return { label: 'Prediabetes range (5.7-6.4%)', level: 'watch' };
    return { label: 'Normal (< 5.7%)', level: 'ok' };
  }

  // NCEP ATP III total cholesterol categories.
  function classifyTotalCholesterol(mgdl) {
    if (mgdl >= 240) return { label: 'High (>= 240 mg/dL)', level: 'high' };
    if (mgdl >= 200) return { label: 'Borderline high (200-239 mg/dL)', level: 'watch' };
    return { label: 'Desirable (< 200 mg/dL)', level: 'ok' };
  }

  // NHLBI waist circumference cut-offs (men > 102 cm, women > 88 cm).
  // For people of Asian descent the IDF cut-offs are lower (90 / 80 cm).
  function classifyWaist(cm, sex, asian) {
    const limit = sex === 'male' ? (asian ? 90 : 102) : (asian ? 80 : 88);
    if (cm > limit) return { label: 'Increased risk (> ' + limit + ' cm)', level: 'watch' };
    return { label: 'Within recommended range (<= ' + limit + ' cm)', level: 'ok' };
  }

  // NIAAA: heavy drinking is more than 14 drinks/week for men, more than 7 for women.
  function classifyAlcohol(drinksPerWeek, sex) {
    const limit = sex === 'male' ? 14 : 7;
    if (drinksPerWeek > limit) return { label: 'Above recommended limit (> ' + limit + ' drinks/week)', level: 'watch' };
    return { label: 'Within recommended limit', level: 'ok' };
  }

  // ---------------------------------------------------------------------------
  // ADA Type 2 Diabetes Risk Test
  // Bang H. et al., Ann Intern Med 2009;151:775-783 (developed on NHANES).
  // The original uses a height/weight chart; BMI cut-offs are used here as an
  // approximation of that chart. For Asian Americans the first cut-off is
  // BMI 23, following the ADA screening recommendation.
  // A score of 5 or more means increased risk for type 2 diabetes.
  // ---------------------------------------------------------------------------
  function adaRiskScore(p) {
    const points = [];
    const add = (label, value) => { if (value > 0) points.push({ label: label, points: value }); };

    add('Age ' + p.age, p.age >= 60 ? 3 : p.age >= 50 ? 2 : p.age >= 40 ? 1 : 0);
    add('Male sex', p.sex === 'male' ? 1 : 0);
    add('History of gestational diabetes', p.sex === 'female' && p.gestationalDiabetes ? 1 : 0);
    add('Parent or sibling with diabetes', p.familyDiabetes ? 1 : 0);
    add('Diagnosed high blood pressure', p.hypertensionDiagnosed ? 1 : 0);
    add('Not physically active', p.physicallyActive ? 0 : 1);

    const firstCut = p.asian ? 23 : 25;
    const b = bmi(p.heightCm, p.weightKg);
    add('BMI ' + b.toFixed(1), b >= 40 ? 3 : b >= 30 ? 2 : b >= firstCut ? 1 : 0);

    const score = points.reduce((sum, item) => sum + item.points, 0);
    return { score: score, max: 10, increasedRisk: score >= 5, points: points };
  }

  // ---------------------------------------------------------------------------
  // Full assessment. `p` is the patient object built by the chat (see app.js).
  // Optional values are null when the user skipped them.
  // ---------------------------------------------------------------------------
  function assess(p) {
    const findings = [];
    const recommendations = [];

    const bmiValue = bmi(p.heightCm, p.weightKg);
    const bmiClass = classifyBmi(bmiValue);
    findings.push(Object.assign({ name: 'BMI', value: bmiValue.toFixed(1) + ' kg/m²', source: 'CDC' }, bmiClass));
    if (bmiValue >= 25) recommendations.push('Discuss weight management (nutrition and physical activity) with a clinician.');

    if (p.waistCm != null) {
      findings.push(Object.assign({ name: 'Waist circumference', value: p.waistCm + ' cm', source: p.asian ? 'IDF' : 'NHLBI' },
        classifyWaist(p.waistCm, p.sex, p.asian)));
    }

    const bpClass = classifyBloodPressure(p.systolic, p.diastolic);
    findings.push(Object.assign({ name: 'Blood pressure', value: p.systolic + '/' + p.diastolic + ' mmHg', source: 'ACC/AHA' }, bpClass));
    if (bpClass.level === 'urgent') {
      recommendations.push('Blood pressure in the severe range: seek prompt medical evaluation.');
    } else if (bpClass.level !== 'ok') {
      recommendations.push('Confirm blood pressure with repeated or out-of-office measurements; reduce sodium and stay active.');
    }

    if (p.glucose != null) {
      const g = classifyGlucose(p.glucose, p.glucoseFasting);
      findings.push(Object.assign({ name: p.glucoseFasting ? 'Fasting glucose' : 'Non-fasting glucose', value: p.glucose + ' mg/dL', source: 'ADA' }, g));
    }
    if (p.hba1c != null) {
      findings.push(Object.assign({ name: 'HbA1c', value: p.hba1c + '%', source: 'ADA' }, classifyHba1c(p.hba1c)));
    }
    const glycemic = findings.filter(f => f.source === 'ADA');
    if (glycemic.some(f => f.level === 'high')) {
      recommendations.push('Glucose or HbA1c in the diabetes range: a confirmatory test and clinical follow-up are needed.');
    } else if (glycemic.some(f => f.level === 'watch')) {
      recommendations.push('Glucose or HbA1c in the prediabetes range: lifestyle changes and periodic retesting are recommended.');
    }

    if (p.cholesterol != null) {
      const c = classifyTotalCholesterol(p.cholesterol);
      findings.push(Object.assign({ name: 'Total cholesterol', value: p.cholesterol + ' mg/dL', source: 'NCEP ATP III' }, c));
      if (c.level !== 'ok') recommendations.push('Cholesterol above desirable: a full lipid panel (LDL, HDL) is needed for cardiovascular risk.');
    }

    if (p.smoking === 'current') {
      findings.push({ name: 'Smoking', value: 'Current smoker', label: 'Major cardiovascular risk factor', level: 'high', source: 'USPSTF' });
      recommendations.push('Offer smoking cessation support.');
    }

    if (p.alcoholPerWeek != null) {
      const a = classifyAlcohol(p.alcoholPerWeek, p.sex);
      findings.push(Object.assign({ name: 'Alcohol', value: p.alcoholPerWeek + ' drinks/week', source: 'NIAAA' }, a));
      if (a.level !== 'ok') recommendations.push('Alcohol intake above recommended limits: consider brief counseling.');
    }

    if (!p.physicallyActive) {
      recommendations.push('Aim for at least 150 minutes per week of moderate physical activity.');
    }

    const ada = adaRiskScore(p);
    const conclusiveGlycemic = glycemic.filter(f => f.level !== 'unknown');
    if (ada.increasedRisk && !conclusiveGlycemic.length) {
      recommendations.push('ADA risk score >= 5: screening with fasting glucose or HbA1c is recommended.');
    }

    if (!recommendations.length) recommendations.push('No risk flags found in the data provided. Keep routine check-ups.');

    return { findings: findings, adaRisk: ada, recommendations: recommendations };
  }

  const api = {
    parseNumber: parseNumber,
    parseBloodPressure: parseBloodPressure,
    parseYesNo: parseYesNo,
    bmi: bmi,
    classifyBmi: classifyBmi,
    classifyBloodPressure: classifyBloodPressure,
    classifyGlucose: classifyGlucose,
    classifyHba1c: classifyHba1c,
    classifyTotalCholesterol: classifyTotalCholesterol,
    classifyWaist: classifyWaist,
    classifyAlcohol: classifyAlcohol,
    adaRiskScore: adaRiskScore,
    assess: assess
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.HealthRisk = api;
  }
})(this);
