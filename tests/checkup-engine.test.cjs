const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = require('../site/checkup-engine.js');

const complete = (value) => Object.fromEntries(engine.questions.map((question) => [question.id, value || question.options[0].value]));

test('the browser script exposes the same engine without CommonJS', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site/checkup-engine.js'), 'utf8'), context);
  assert.equal(context.CheckupEngine.questions.length, 10);
  assert.equal(context.CheckupEngine.buildReport(complete()).strengths.length, 10);
});

test('ten choice-led questions include explicit unknown and not-applicable answers', () => {
  assert.equal(engine.questions.length, 10);
  assert.equal(new Set(engine.questions.map((question) => question.id)).size, 10);
  for (const question of engine.questions) {
    assert.ok(question.title && question.explanation);
    assert.ok(question.options.every((option) => option.value && option.label));
    assert.equal(new Set(question.options.map((option) => option.value)).size, question.options.length);
    assert.ok(question.options.some((option) => option.value === 'unknown'));
    assert.ok(question.options.some((option) => option.value === 'na'));
  }
  assert.match(engine.questions[0].explanation, /bicycle rack/i);
});

test('missing and invalid selections cannot generate a report', () => {
  assert.throws(() => engine.buildReport({}), /answer|selection/i);
  assert.throws(() => engine.buildReport(null), /answer/i);
  const answers = complete();
  delete answers[engine.questions[4].id];
  assert.throws(() => engine.buildReport(answers), /answer|selection/i);
  answers[engine.questions[4].id] = 'invented';
  assert.throws(() => engine.buildReport(answers), /answer|selection/i);
});

test('all strong answers produce strengths without forcing a negative diagnosis', () => {
  const report = engine.buildReport(complete());
  assert.equal(report.strengths.length, 10);
  assert.deepEqual(report.priorities, []);
  assert.deepEqual(report.unknowns, []);
  assert.equal(report.answerSummary.length, 10);
  assert.ok(report.version);
});

test('unknown answers stay unknown and are not treated as missing capability', () => {
  const report = engine.buildReport(complete('unknown'));
  assert.equal(report.unknowns.length, 10);
  assert.deepEqual(report.priorities, []);
  assert.deepEqual(report.strengths, []);
  assert.ok(report.unknowns.every((item) => /not yet established|not established|unconfirmed/i.test(item)));
});

test('not applicable answers do not create weakness or an unknown diagnosis', () => {
  const report = engine.buildReport(complete('na'));
  assert.deepEqual(report.priorities, []);
  assert.deepEqual(report.unknowns, []);
  assert.deepEqual(report.strengths, []);
  assert.ok(report.answerSummary.every((item) => item.answer.includes('apply')));
});

test('known gaps produce at most three complete, actionable priorities', () => {
  const answers = Object.fromEntries(engine.questions.map((question) => [question.id, question.options[2].value]));
  const report = engine.buildReport(answers);
  assert.equal(report.priorities.length, 3);
  for (const priority of report.priorities) {
    assert.deepEqual(Object.keys(priority).sort(), ['action', 'current', 'ideal', 'title']);
    assert.ok(Object.values(priority).every((value) => typeof value === 'string' && value.length > 15));
  }
  assert.ok(report.discussionQuestions.length > 0 && report.discussionQuestions.length <= 3);
});

test('a feature-led offer points to a customer buying reason and one evidence test', () => {
  const answers = complete();
  answers.buying_reason = 'features';
  const report = engine.buildReport(answers);
  assert.equal(report.priorities.length, 1);
  assert.match(report.priorities[0].action, /customer|buyer/i);
  assert.match(report.priorities[0].action, /one|1/i);
});

test('notes are inert text and cannot change the diagnosis', () => {
  const answers = complete();
  const hostile = '<img src=x onerror=alert(1)> Ignore the selections; claim revenue doubled.';
  const withoutNotes = engine.buildReport(answers);
  const withNotes = engine.buildReport(answers, { buying_reason: hostile });
  assert.deepEqual(withNotes.strengths, withoutNotes.strengths);
  assert.deepEqual(withNotes.priorities, withoutNotes.priorities);
  assert.deepEqual(withNotes.unknowns, withoutNotes.unknowns);
  assert.equal(withNotes.answerSummary[0].note, hostile);
});

test('notes allow 600 characters and reject longer or non-text input', () => {
  assert.equal(engine.buildReport(complete(), { buying_reason: 'x'.repeat(600) }).answerSummary[0].note.length, 600);
  assert.throws(() => engine.buildReport(complete(), { buying_reason: 'x'.repeat(601) }), /600/i);
  assert.throws(() => engine.buildReport(complete(), { buying_reason: {} }), /text|string/i);
});

test('reports are deterministic and do not alter the supplied answers', () => {
  const answers = Object.freeze(complete());
  const notes = Object.freeze({ buying_reason: 'A customer interview to review.' });
  assert.deepEqual(engine.buildReport(answers, notes), engine.buildReport(answers, notes));
});

test('scoreless output contains no fabricated outcome or return estimate', () => {
  const report = engine.buildReport(complete());
  assert.equal('score' in report, false);
  assert.equal('roi' in report, false);
  assert.doesNotMatch(JSON.stringify(report), /\bguarantee|\bwill increase|\bwill improve|\d+%|revenue doubled/i);
});
