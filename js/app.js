/*
 * HealthInsight AI - chat interface.
 *
 * The conversation is a list of steps. Each step stores its answer under a
 * named key in `patient`, so the analysis never depends on the position of an
 * answer in an array.
 */
(function () {
  'use strict';

  const Risk = window.HealthRisk;

  // Contact form: GitHub Pages cannot run PHP. Paste a form endpoint here
  // (for example https://formspree.io/f/xxxxxxx) to receive messages directly.
  // While it is empty, the form opens the visitor's e-mail app instead.
  const CONTACT_ENDPOINT = '';
  const CONTACT_EMAIL = 'enio.danttas@gmail.com';

  const SKIP = 'skip';

  // ---------------------------------------------------------------------------
  // Step parsers. Each returns { value } or { error }.
  // ---------------------------------------------------------------------------

  function numberIn(min, max, unit) {
    return function (text) {
      const n = Risk.parseNumber(text);
      if (Number.isNaN(n) || n < min || n > max) {
        return { error: 'Please enter a number between ' + min + ' and ' + max + (unit ? ' ' + unit : '') + '.' };
      }
      return { value: n };
    };
  }

  function yesNo(text) {
    const v = Risk.parseYesNo(text);
    return v === null ? { error: "Please answer 'yes' or 'no'." } : { value: v };
  }

  function choice(options) {
    return function (text) {
      const key = String(text).trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(options, key)) return { value: options[key] };
      return { error: 'Please choose one of: ' + Object.keys(options).join(', ') + '.' };
    };
  }

  const STEPS = [
    {
      key: 'reference',
      section: 'Identification',
      optional: true,
      prompt: "Patient reference (initials or a nickname). <em>Please don't use real names.</em>",
      parse: text => ({ value: String(text).slice(0, 40) })
    },
    { key: 'age', prompt: 'Age (years, adults 18+):', parse: numberIn(18, 120, 'years') },
    {
      key: 'sex',
      prompt: 'Sex, used for sex-specific clinical reference ranges (male / female):',
      parse: choice({ male: 'male', m: 'male', female: 'female', f: 'female' })
    },
    {
      key: 'ethnicity',
      prompt: 'Ethnicity:<br>1 - White<br>2 - Black or African American<br>3 - Asian<br>4 - Hispanic or Latino' +
        '<br>5 - Native American or Alaska Native<br>6 - Native Hawaiian or Other Pacific Islander<br>7 - Other',
      parse: choice({ 1: 'white', 2: 'black', 3: 'asian', 4: 'hispanic', 5: 'native_american', 6: 'pacific_islander', 7: 'other' })
    },
    { key: 'heightCm', prompt: 'Height (cm):', parse: numberIn(100, 230, 'cm') },
    { key: 'weightKg', prompt: 'Weight (kg):', parse: numberIn(25, 300, 'kg') },
    { key: 'waistCm', optional: true, prompt: 'Waist circumference (cm):', parse: numberIn(40, 200, 'cm') },

    {
      key: 'familyDiabetes',
      section: 'Medical history',
      prompt: 'Does a parent or sibling have diabetes? (yes/no)',
      parse: yesNo
    },
    {
      key: 'hypertensionDiagnosed',
      prompt: 'Has the patient ever been diagnosed with high blood pressure or taken medication for it? (yes/no)',
      parse: yesNo
    },
    {
      key: 'gestationalDiabetes',
      prompt: 'Has the patient ever been diagnosed with gestational diabetes? (yes/no)',
      when: p => p.sex === 'female',
      parse: yesNo
    },

    {
      key: 'physicallyActive',
      section: 'Lifestyle',
      prompt: 'Is the patient physically active, with at least 150 minutes of moderate activity per week? (yes/no)',
      parse: yesNo
    },
    {
      key: 'smoking',
      prompt: 'Smoking status:<br>1 - Never smoked<br>2 - Former smoker<br>3 - Current smoker',
      parse: choice({ 1: 'never', 2: 'former', 3: 'current' })
    },
    {
      key: 'alcoholPerWeek',
      optional: true,
      prompt: 'Average number of alcoholic drinks per week (0 if none):',
      parse: numberIn(0, 100, 'drinks')
    },

    {
      key: 'bloodPressure',
      section: 'Measurements',
      prompt: 'Blood pressure (e.g. 120/80 mmHg):',
      parse: function (text) {
        const bp = Risk.parseBloodPressure(text);
        if (!bp || bp.systolic < 70 || bp.systolic > 260 || bp.diastolic < 40 || bp.diastolic > 160 || bp.systolic <= bp.diastolic) {
          return { error: 'Please enter systolic/diastolic, for example 120/80.' };
        }
        return { value: bp };
      }
    },
    { key: 'cholesterol', optional: true, prompt: 'Total cholesterol (mg/dL):', parse: numberIn(70, 500, 'mg/dL') },
    { key: 'glucose', optional: true, prompt: 'Blood glucose (mg/dL):', parse: numberIn(40, 600, 'mg/dL') },
    {
      key: 'glucoseFasting',
      prompt: 'Was that glucose measured fasting (at least 8 hours without food)? (yes/no)',
      when: p => p.glucose != null,
      parse: yesNo
    },
    { key: 'hba1c', optional: true, prompt: 'HbA1c (%):', parse: numberIn(3, 20, '%') }
  ];

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let patient = {};
  let current = -1;   // index in STEPS, -1 = not started
  let history = [];   // indexes of answered steps, for "back"
  let finished = false;
  let busy = false;

  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');
  const inputForm = document.getElementById('chatForm');

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // User text is always inserted as text, never as HTML.
  function showUser(text) {
    const message = document.createElement('div');
    message.className = 'chat-message user';
    const p = document.createElement('p');
    p.textContent = text;
    message.appendChild(p);
    chatMessages.appendChild(message);
    scrollToBottom();
  }

  // Only for HTML built by this file. Interpolated user values must go through escapeHtml.
  function showAssistant(html) {
    const message = document.createElement('div');
    message.className = 'chat-message assistant';
    message.innerHTML = '<p>' + html + '</p>';
    chatMessages.appendChild(message);
    scrollToBottom();
    return message;
  }

  function withTyping(callback) {
    busy = true;
    const typing = showAssistant('Typing...');
    typing.classList.add('typing');
    setTimeout(function () {
      typing.remove();
      busy = false;
      callback();
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Flow
  // ---------------------------------------------------------------------------

  function nextStepIndex(from) {
    for (let i = from + 1; i < STEPS.length; i++) {
      if (!STEPS[i].when || STEPS[i].when(patient)) return i;
    }
    return -1;
  }

  function askCurrent() {
    const step = STEPS[current];
    let html = '';
    if (step.section) html += '<strong>' + step.section + '</strong><br>';
    html += step.prompt;
    if (step.optional) html += "<br><small>Optional: type 'skip' if not available.</small>";
    showAssistant(html);
  }

  function start() {
    patient = {};
    history = [];
    finished = false;
    current = nextStepIndex(-1);
    showAssistant(
      "Hello! I'll collect some information about the patient and compare it with published clinical guidelines." +
      '<br><br>This is a <strong>prototype</strong>. It does not diagnose anything, and nothing you type leaves this browser.' +
      "<br><br>You can type <strong>back</strong> to correct the previous answer or <strong>restart</strong> at any time."
    );
    askCurrent();
  }

  function goBack() {
    if (finished) {
      finished = false;
    } else if (!history.length) {
      showAssistant('This is the first question.');
      return;
    }
    current = history.pop();
    delete patient[STEPS[current].key];
    askCurrent();
  }

  function handleAnswer(text) {
    const step = STEPS[current];
    let result;
    if (step.optional && text.trim().toLowerCase() === SKIP) {
      result = { value: null };
    } else {
      result = step.parse(text);
    }
    if (result.error) {
      showAssistant('⚠️ ' + result.error);
      return;
    }

    patient[step.key] = result.value;
    history.push(current);
    // Clear answers of conditional steps that no longer apply (e.g. after "back").
    STEPS.forEach(function (s) {
      if (s.when && !s.when(patient)) delete patient[s.key];
    });

    const next = nextStepIndex(current);
    if (next === -1) {
      finished = true;
      withTyping(showReport);
    } else {
      current = next;
      withTyping(askCurrent);
    }
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  function toRiskInput(p) {
    return {
      age: p.age,
      sex: p.sex,
      asian: p.ethnicity === 'asian',
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      waistCm: p.waistCm,
      familyDiabetes: p.familyDiabetes,
      hypertensionDiagnosed: p.hypertensionDiagnosed,
      gestationalDiabetes: p.gestationalDiabetes === true,
      physicallyActive: p.physicallyActive,
      smoking: p.smoking,
      alcoholPerWeek: p.alcoholPerWeek,
      systolic: p.bloodPressure.systolic,
      diastolic: p.bloodPressure.diastolic,
      cholesterol: p.cholesterol,
      glucose: p.glucose,
      glucoseFasting: p.glucoseFasting === true,
      hba1c: p.hba1c
    };
  }

  const LEVEL_ICON = { ok: '✅', watch: '⚠️', high: '🔶', urgent: '🚨', unknown: '❔' };

  function reportHtml(p, result) {
    let html = '<div class="report">';
    html += '<strong>📊 Screening summary' + (p.reference ? ' – ' + escapeHtml(p.reference) : '') + '</strong>';
    html += '<table><thead><tr><th>Measure</th><th>Value</th><th>Result</th><th>Source</th></tr></thead><tbody>';
    result.findings.forEach(function (f) {
      html += '<tr class="level-' + f.level + '"><td>' + f.name + '</td><td>' + escapeHtml(f.value) + '</td><td>' +
        LEVEL_ICON[f.level] + ' ' + f.label + (f.note ? '<br><small>' + f.note + '</small>' : '') +
        '</td><td>' + f.source + '</td></tr>';
    });
    html += '</tbody></table>';

    const ada = result.adaRisk;
    html += '<p class="report-block"><strong>ADA type 2 diabetes risk score: ' + ada.score + ' / ' + ada.max + '</strong> – ' +
      (ada.increasedRisk ? '🔶 increased risk (score ≥ 5)' : '✅ below the increased-risk threshold') + '<br><small>';
    html += ada.points.length
      ? ada.points.map(item => escapeHtml(item.label) + ' (+' + item.points + ')').join(' · ')
      : 'No risk points.';
    html += '</small></p>';

    html += '<p class="report-block"><strong>Suggested next steps</strong></p><ul>';
    result.recommendations.forEach(function (r) { html += '<li>' + r + '</li>'; });
    html += '</ul>';

    html += '<p class="report-block"><small>Rule-based screening using published guidelines (CDC, ADA, ACC/AHA, NCEP, NHLBI, NIAAA) ' +
      'and the ADA Type 2 Diabetes Risk Test (Bang et al., 2009). This is not a diagnosis and has not been clinically validated. ' +
      'Results must be interpreted by a healthcare professional.</small></p>';
    html += '</div>';
    return html;
  }

  function showReport() {
    const html = reportHtml(patient, Risk.assess(toRiskInput(patient)));
    showAssistant(html);
    document.getElementById('printArea').innerHTML = html;

    const actions = showAssistant(
      '<button type="button" class="report-action" data-action="print">Print / save as PDF</button> ' +
      '<button type="button" class="report-action" data-action="restart">New evaluation</button>' +
      "<br><small>You can also type 'back' to change the last answer.</small>"
    );
    actions.addEventListener('click', function (event) {
      const action = event.target.getAttribute('data-action');
      if (action === 'print') window.print();
      if (action === 'restart') restart();
    });
  }

  function restart() {
    showAssistant('🔄 Starting a new evaluation.');
    start();
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  inputForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text || busy || current === -1) return;
    messageInput.value = '';
    showUser(text);

    const command = text.toLowerCase();
    if (command === 'restart') return restart();
    if (command === 'back') return goBack();
    if (finished) {
      showAssistant("The evaluation is complete. Type 'restart' for a new patient or 'back' to change the last answer.");
      return;
    }
    handleAnswer(text);
  });

  messageInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      inputForm.requestSubmit();
    }
  });

  document.getElementById('tryButton').addEventListener('click', function () {
    const container = document.getElementById('platformContainer');
    container.hidden = false;
    container.scrollIntoView({ behavior: 'smooth' });
    if (current === -1) start();
    messageInput.focus();
  });

  // ---------------------------------------------------------------------------
  // Contact form
  // ---------------------------------------------------------------------------

  const contactForm = document.getElementById('contactForm');
  const contactStatus = document.getElementById('contactStatus');

  contactForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(contactForm);

    if (!CONTACT_ENDPOINT) {
      const subject = 'HealthInsight AI - collaboration request from ' + data.get('name');
      const body = data.get('message') + '\n\n' + data.get('name') + ' <' + data.get('email') + '>';
      window.location.href = 'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      contactStatus.textContent = 'Your e-mail app should open with the message ready to send. If it does not, write to ' + CONTACT_EMAIL + '.';
      return;
    }

    contactStatus.textContent = 'Sending...';
    fetch(CONTACT_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        contactForm.reset();
        contactStatus.textContent = 'Thank you! Your message was sent.';
      })
      .catch(function () {
        contactStatus.textContent = 'The message could not be sent. Please write to ' + CONTACT_EMAIL + '.';
      });
  });

  // Exposed for automated tests only.
  window.HealthInsightChat = { steps: STEPS, getPatient: () => patient };
})();
