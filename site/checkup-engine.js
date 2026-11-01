(function (root, factory) {
  const bank = typeof module === 'object' && module.exports ? require('./assessment-bank.js') : root.AssessmentBank;
  const api = factory(bank);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CheckupEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (bank) {
  'use strict';
  if (!bank || !Array.isArray(bank.questions) || bank.questions.length !== 30) return null;
  const questions = bank.questions.map(q => Object.freeze({
    id: q.id, title: q.prompt_en, explanation: q.why_it_matters_en,
    answer_type: q.answer_type, unknown_help: q.unknown_action_en,
    group: bank.core_question_ids.includes(q.id) ? 'Company context and the next decision' :
      Object.values(bank.branches).find(branch => branch.question_ids.includes(q.id))?.label_en || '',
    options: Object.freeze((q.options || []).map(option => Object.freeze({value: option.value, label: option.label_en})))
  }));
  const ids = new Set(questions.map(q => q.id));
  function validText(value, maximum, codepoints) {
    if (typeof value !== 'string' || (codepoints ? Array.from(value).length : value.length) > maximum) return false;
    for (const character of value) {
      const point = character.codePointAt(0);
      if ((point < 32 && ![9, 10, 13].includes(point)) || point === 127 || (point >= 0xD800 && point <= 0xDFFF)) return false;
    }
    return true;
  }
  function validateAnswers(answers, notes = {}) {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length !== questions.length || Object.keys(answers).some(id => !ids.has(id))) throw new TypeError('Record an answer or an explicit unknown for each of the 30 questions.');
    if (!notes || typeof notes !== 'object' || Array.isArray(notes) || Object.keys(notes).some(id => !ids.has(id))) throw new TypeError('Optional context must belong to a listed question.');
    for (const q of questions) {
      const value = answers[q.id];
      if (q.answer_type === 'text') {
        if (!validText(value, 1500, true)) throw new TypeError('Use text of up to 1,500 characters for: ' + q.title);
      } else if (q.answer_type === 'multi_select') {
        const allowed = new Set(q.options.map(option => option.value));
        if (!Array.isArray(value) || value.length > allowed.size || new Set(value).size !== value.length || value.some(item => typeof item !== 'string' || !allowed.has(item))) throw new TypeError('Use only the listed choices for: ' + q.title);
      } else throw new TypeError('The question type is not supported by this assessment.');
      if (notes[q.id] !== undefined && !validText(notes[q.id], 600, false)) throw new TypeError('Each optional context note must be 600 characters or fewer without control characters.');
    }
    return true;
  }
  function coverage(answers, notes = {}) {
    validateAnswers(answers, notes);
    const unknowns = questions.filter(q => {
      const value = answers[q.id];
      return Array.isArray(value) ? !value.length || value.includes('unknown') : !value.trim() || new Set(['unknown','unknown / deferred','not sure',"i don't know",'i do not know','n/a','na']).has(value.trim().toLowerCase());
    }).length;
    return {answered: questions.length, unknowns};
  }
  return Object.freeze({questions: Object.freeze(questions), validateAnswers, coverage});
});
