(function () {
  'use strict';
  const engine = window.CheckupEngine;
  const byId = function (id) { return document.getElementById(id); };
  if (!engine) { byId('load-error').hidden = false; return; }

  let answers = {};
  let notes = {};
  let step = 0;
  let editing = false;
  let report = null;
  const views = ['question-view', 'review-view', 'report-view'];
  const noteInput = byId('question-note');

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function focusHeading(id) {
    byId(id).focus({ preventScroll: true });
    byId(id).scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  function showView(id) {
    views.forEach(function (view) { byId(view).hidden = view !== id; });
    byId('restart-area').hidden = false;
  }

  function clearReport() {
    report = null;
    ['report-strengths', 'report-unknowns', 'report-priorities', 'report-discussion', 'report-summary'].forEach(function (id) { byId(id).replaceChildren(); });
    byId('report-overview').textContent = '';
  }

  function updateCount() {
    byId('answer-count').textContent = Object.keys(answers).length + ' of 10 answered';
    byId('note-count').textContent = noteInput.value.length + ' / 600';
  }

  function showQuestion(shouldFocus) {
    const question = engine.questions[step];
    showView('question-view');
    byId('step-label').textContent = 'Question ' + (step + 1) + ' of 10';
    byId('question-progress').value = step + 1;
    byId('question-title').textContent = question.title;
    byId('question-explanation').textContent = question.explanation;
    byId('question-error').hidden = true;
    byId('edit-notice').hidden = !editing;
    const options = byId('question-options');
    options.replaceChildren();
    options.removeAttribute('aria-invalid');
    question.options.forEach(function (option, index) {
      const label = element('label', undefined, 'answer-option');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'checkup-answer';
      input.value = option.value;
      input.id = 'answer-' + question.id + '-' + index;
      input.checked = answers[question.id] === option.value;
      input.required = true;
      input.addEventListener('change', function () {
        answers[question.id] = option.value;
        byId('question-error').hidden = true;
        options.removeAttribute('aria-invalid');
        updateCount();
      });
      label.append(input, element('span', option.label));
      options.append(label);
    });
    noteInput.value = notes[question.id] || '';
    byId('back-button').hidden = editing || step === 0;
    byId('next-button').textContent = editing ? 'Save and return to review' : step === 9 ? 'Review my answers' : 'Next question';
    updateCount();
    if (shouldFocus) focusHeading('question-title');
  }

  function appendAnswer(list, answer, number, editable) {
    const item = element('li');
    item.append(element('h3', number + '. ' + answer.title), element('p', answer.answer));
    if (answer.note) {
      item.append(element('p', 'Your note:', 'summary-note-label'), element('p', answer.note, 'summary-note'));
    }
    if (editable) {
      const edit = element('button', 'Edit answer ' + number, 'button button-quiet answer-edit');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Edit answer ' + number + ': ' + answer.title);
      edit.addEventListener('click', function () {
        clearReport();
        step = number - 1;
        editing = true;
        showQuestion(true);
      });
      item.append(edit);
    }
    list.append(item);
  }

  function answerSummary() {
    return engine.questions.map(function (question) {
      const selected = question.options.find(function (option) { return option.value === answers[question.id]; });
      return { title: question.title, answer: selected ? selected.label : 'No answer selected.', note: notes[question.id] || '' };
    });
  }

  function showReview() {
    editing = false;
    showView('review-view');
    const list = byId('review-list');
    list.replaceChildren();
    answerSummary().forEach(function (answer, index) { appendAnswer(list, answer, index + 1, true); });
    byId('report-error').hidden = true;
    focusHeading('review-title');
  }

  function renderList(id, items, emptyId) {
    const list = byId(id);
    list.replaceChildren();
    items.forEach(function (text) { list.append(element('li', text)); });
    if (emptyId) byId(emptyId).hidden = items.length > 0;
  }

  function buildReport() {
    try { report = engine.buildReport(answers, notes); }
    catch (error) {
      byId('report-error').textContent = error.message;
      byId('report-error').hidden = false;
      return;
    }
    showView('report-view');
    const hasPriorities = report.priorities.length > 0;
    byId('report-overview').textContent = hasPriorities
      ? 'Your answers identify a few places to make the next marketing decision easier. Start with one action from the priorities below.'
      : report.strengths.length === 10
        ? 'You describe established practices across all ten topics. No priority gap is indicated by these answers. Use your next review to check the evidence and keep what is useful.'
        : report.unknowns.length
          ? 'Your answers leave questions to clarify. Check existing records before deciding whether a practice needs to change.'
          : 'Your selected answers do not establish a priority gap. Topics marked “does not apply” are kept in your summary without a negative diagnosis.';
    renderList('report-strengths', report.strengths, 'strengths-empty');
    renderList('report-unknowns', report.unknowns, 'unknowns-empty');
    renderList('report-discussion', report.discussionQuestions);
    const priorities = byId('report-priorities');
    priorities.replaceChildren();
    byId('priorities-empty').hidden = hasPriorities;
    report.priorities.forEach(function (priority, index) {
      const article = element('article', undefined, 'priority-card');
      article.append(element('h4', (index + 1) + '. ' + priority.title));
      const details = element('dl');
      [['Current situation', priority.current], ['Useful next state', priority.ideal], ['One action', priority.action]].forEach(function (row) {
        details.append(element('dt', row[0]), element('dd', row[1]));
      });
      article.append(details);
      priorities.append(article);
    });
    const summary = byId('report-summary');
    summary.replaceChildren();
    report.answerSummary.forEach(function (answer, index) { appendAnswer(summary, answer, index + 1, false); });
    byId('checkup-status').textContent = 'Your complete report is ready.';
    focusHeading('report-title');
  }

  function reportText() {
    const lines = ['CONSOLIDATA — Marketing Checkup', 'Fixed-rule report version ' + report.version, '', byId('report-overview').textContent, byId('report-view').querySelector('.report-basis').textContent, '', 'Practices you describe'];
    lines.push(...(report.strengths.length ? report.strengths.map(function (text) { return '- ' + text; }) : [byId('strengths-empty').textContent]));
    lines.push('', 'Unknowns to clarify', ...(report.unknowns.length ? report.unknowns.map(function (text) { return '- ' + text; }) : [byId('unknowns-empty').textContent]), '', 'A focused set of priorities (up to three, in question order)');
    if (!report.priorities.length) lines.push(byId('priorities-empty').textContent);
    report.priorities.forEach(function (priority, index) { lines.push('', (index + 1) + '. ' + priority.title, 'Current situation: ' + priority.current, 'Useful next state: ' + priority.ideal, 'One action: ' + priority.action); });
    lines.push('', 'Questions for your next review', ...report.discussionQuestions.map(function (text) { return '- ' + text; }), '', 'Your complete answer summary');
    report.answerSummary.forEach(function (answer, index) {
      lines.push('', (index + 1) + '. ' + answer.title, answer.answer);
      if (answer.note) lines.push('Your note: ' + answer.note);
    });
    lines.push('', 'No report or call request is sent automatically.', 'Payment or access help: alvinj@consolidatats.com. Do not send card details.');
    return lines.join('\n');
  }

  function download(format) {
    if (!report) return;
    const content = format === 'json' ? JSON.stringify({ basis: 'Self-reported choices, fixed rules; notes do not change findings. No independent verification or outcome estimate.', report: report }, null, 2) : reportText();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'consolidata-marketing-checkup.' + (format === 'json' ? 'json' : 'txt');
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    byId('checkup-status').textContent = 'Your browser has been asked to download the report. Check your downloads.';
  }

  noteInput.addEventListener('input', function () { notes[engine.questions[step].id] = noteInput.value; updateCount(); });
  byId('question-form').addEventListener('submit', function (event) {
    event.preventDefault();
    if (!answers[engine.questions[step].id]) {
      byId('question-error').hidden = false;
      byId('question-options').setAttribute('aria-invalid', 'true');
      byId('question-options').querySelector('input').focus();
      return;
    }
    if (editing || step === 9) showReview();
    else { step += 1; showQuestion(true); }
  });
  byId('back-button').addEventListener('click', function () { if (step > 0) { step -= 1; showQuestion(true); } });
  byId('review-back').addEventListener('click', function () { step = 9; editing = true; showQuestion(true); });
  byId('build-report').addEventListener('click', buildReport);
  byId('edit-answers').addEventListener('click', function () { clearReport(); showReview(); });
  byId('download-text').addEventListener('click', function () { download('text'); });
  byId('download-json').addEventListener('click', function () { download('json'); });
  byId('print-report').addEventListener('click', function () { if (report) window.print(); });
  byId('restart-checkup').addEventListener('click', function () {
    if (!window.confirm('Clear all answers, notes and the current report, and restart this checkup? Download a copy first if you want to keep it.')) return;
    answers = {};
    notes = {};
    step = 0;
    editing = false;
    clearReport();
    byId('review-list').replaceChildren();
    byId('report-error').textContent = '';
    byId('report-error').hidden = true;
    byId('checkup-status').textContent = 'Checkup restarted. All answers, notes and the previous report have been cleared.';
    showQuestion(true);
  });
  showQuestion(false);
}());
