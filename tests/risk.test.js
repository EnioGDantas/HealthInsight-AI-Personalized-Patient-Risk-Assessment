/*
 * Unit tests for js/risk.js.
 *
 * Node:    node tests/risk.test.js
 * Browser: open tests/index.html
 */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const Risk = isNode ? require('../js/risk.js') : root.HealthRisk;

  const results = [];
  function test(name, fn) {
    try {
      fn();
      results.push({ name: name, ok: true });
    } catch (error) {
      results.push({ name: name, ok: false, error: error.message });
    }
  }
  function equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error((message || 'value') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    }
  }

  function patient(overrides) {
    return Object.assign({
      age: 30, sex: 'female', asian: false, heightCm: 170, weightKg: 65, waistCm: 80,
      familyDiabetes: false, hypertensionDiagnosed: false, gestationalDiabetes: false,
      physicallyActive: true, smoking: 'never', alcoholPerWeek: 0,
      systolic: 110, diastolic: 70, cholesterol: 170, glucose: 85, glucoseFasting: true, hba1c: null
    }, overrides);
  }
  function finding(result, name) {
    return result.findings.find(f => f.name === name);
  }

  // --- Parsing --------------------------------------------------------------

  test('parseNumber accepts units and decimal comma', function () {
    equal(Risk.parseNumber('170 cm'), 170);
    equal(Risk.parseNumber('5,8'), 5.8);
    equal(Number.isNaN(Risk.parseNumber('abc')), true);
  });

  test('parseBloodPressure', function () {
    equal(Risk.parseBloodPressure('120 / 80 mmHg').systolic, 120);
    equal(Risk.parseBloodPressure('120/80').diastolic, 80);
    equal(Risk.parseBloodPressure('240'), null);
  });

  // --- Guideline thresholds -------------------------------------------------

  test('BMI categories (CDC)', function () {
    equal(Risk.classifyBmi(18.4).label, 'Underweight');
    equal(Risk.classifyBmi(24.9).label, 'Healthy weight');
    equal(Risk.classifyBmi(25).label, 'Overweight');
    equal(Risk.classifyBmi(30).label, 'Obesity class 1');
    equal(Risk.classifyBmi(40).label, 'Obesity class 3 (severe)');
  });

  test('Blood pressure categories (ACC/AHA)', function () {
    equal(Risk.classifyBloodPressure(119, 79).label, 'Normal');
    equal(Risk.classifyBloodPressure(125, 79).label, 'Elevated');
    equal(Risk.classifyBloodPressure(125, 82).label, 'Stage 1 hypertension range');
    equal(Risk.classifyBloodPressure(130, 70).label, 'Stage 1 hypertension range');
    equal(Risk.classifyBloodPressure(140, 85).label, 'Stage 2 hypertension range');
    equal(Risk.classifyBloodPressure(185, 100).level, 'urgent');
  });

  test('Glucose (ADA): fasting vs non-fasting', function () {
    equal(Risk.classifyGlucose(99, true).level, 'ok');
    equal(Risk.classifyGlucose(100, true).level, 'watch');
    equal(Risk.classifyGlucose(126, true).level, 'high');
    equal(Risk.classifyGlucose(150, false).level, 'unknown');
    equal(Risk.classifyGlucose(200, false).level, 'high');
  });

  test('HbA1c (ADA)', function () {
    equal(Risk.classifyHba1c(5.6).level, 'ok');
    equal(Risk.classifyHba1c(5.7).level, 'watch');
    equal(Risk.classifyHba1c(6.5).level, 'high');
  });

  test('Waist cut-offs depend on sex and Asian descent', function () {
    equal(Risk.classifyWaist(95, 'male', false).level, 'ok');
    equal(Risk.classifyWaist(95, 'male', true).level, 'watch');
    equal(Risk.classifyWaist(89, 'female', false).level, 'watch');
  });

  // --- ADA risk score -------------------------------------------------------

  test('ADA risk score adds the published points', function () {
    // Age 55 (2) + male (1) + family history (1) + hypertension (1) + inactive (1) + BMI 31 (2) = 8
    const score = Risk.adaRiskScore(patient({
      age: 55, sex: 'male', familyDiabetes: true, hypertensionDiagnosed: true,
      physicallyActive: false, heightCm: 175, weightKg: 95
    }));
    equal(score.score, 8);
    equal(score.increasedRisk, true);
  });

  test('ADA risk score: healthy young woman is low risk', function () {
    equal(Risk.adaRiskScore(patient()).score, 0);
  });

  test('ADA risk score: Asian BMI cut-off starts at 23', function () {
    // BMI 24.2
    equal(Risk.adaRiskScore(patient({ asian: false, weightKg: 70 })).score, 0);
    equal(Risk.adaRiskScore(patient({ asian: true, weightKg: 70 })).score, 1);
  });

  // --- Regression: cases that were wrong in the original prototype ----------

  test('Regression: obese, hypertensive, diabetic patient is flagged', function () {
    const result = Risk.assess(patient({
      age: 55, sex: 'male', heightCm: 175, weightKg: 95, waistCm: 105,
      systolic: 150, diastolic: 95, cholesterol: 240, glucose: 140, glucoseFasting: true
    }));
    equal(finding(result, 'BMI').label, 'Obesity class 1', 'BMI');
    equal(finding(result, 'BMI').value, '31.0 kg/m²', 'BMI value');
    equal(finding(result, 'Blood pressure').label, 'Stage 2 hypertension range', 'BP');
    equal(finding(result, 'Fasting glucose').level, 'high', 'glucose');
    equal(finding(result, 'Total cholesterol').level, 'high', 'cholesterol');
    equal(finding(result, 'Waist circumference').level, 'watch', 'waist');
  });

  test('Regression: healthy patient is not flagged', function () {
    const result = Risk.assess(patient());
    result.findings.forEach(function (f) { equal(f.level, 'ok', f.name); });
    equal(result.recommendations.length, 1);
  });

  test('Optional values can be skipped', function () {
    const result = Risk.assess(patient({ waistCm: null, cholesterol: null, glucose: null, alcoholPerWeek: null }));
    equal(finding(result, 'Total cholesterol'), undefined);
    equal(finding(result, 'Waist circumference'), undefined);
  });

  test('High ADA score without lab values recommends screening', function () {
    const result = Risk.assess(patient({
      age: 62, sex: 'male', familyDiabetes: true, physicallyActive: false, glucose: null
    }));
    equal(result.recommendations.some(r => r.indexOf('ADA risk score') === 0), true);
  });

  // --- Report ---------------------------------------------------------------

  const failed = results.filter(r => !r.ok);
  if (isNode) {
    results.forEach(r => console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : '\n     ' + r.error)));
    console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
    if (failed.length) process.exit(1);
  } else {
    root.TEST_RESULTS = results;
  }
})(this);
