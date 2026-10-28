const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../site/checkup-engine.js');
const server=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../backend/questions.json'),'utf8'));
const valid=()=>Object.fromEntries(engine.questions.map(q=>[q.id,q.options[0].value]));
test('public questions agree with server ids and all selected choices',()=>{
  assert.equal(engine.questions.length,10);
  assert.deepEqual(engine.questions.map(q=>q.id),server.definitions.map(q=>q.id));
  engine.questions.forEach((q,i)=>assert.deepEqual(q.options.map(o=>o.value),[...server.definitions[i].values,'unknown','na']));
});
test('public engine provides no report builder or private finding rules',()=>{
  assert.equal(engine.buildReport,undefined);
  assert.ok(engine.questions.every(q=>!q.strength&&!q.priority&&!q.discussion&&!q.unknown));
  assert.ok(!/function buildReport|discussionQuestions|answerSummary|strengths:|priorities:/.test(fs.readFileSync(require.resolve('../site/checkup-engine.js'),'utf8')));
});
test('coverage accepts all known choices but exposes only answer coverage',()=>{
  const answers=valid();answers[engine.questions[0].id]='unknown';answers[engine.questions[1].id]='na';
  assert.deepEqual(engine.coverage(answers),{answered:10,unknowns:1});
});
test('missing, malformed and unknown answers cannot be submitted as complete',()=>{
  const incomplete=valid();delete incomplete[engine.questions[0].id];
  for(const answers of [undefined,null,[],incomplete,{...valid(),extra:'x'},{...valid(),[engine.questions[0].id]:'invalid'}])assert.throws(()=>engine.validateAnswers(answers));
});
test('notes require bounded text on known questions',()=>{
  const id=engine.questions[0].id;
  assert.equal(engine.validateAnswers(valid(),{[id]:'x'.repeat(600)}),true);
  for(const notes of [[],{[id]:'x'.repeat(601)},{[id]:{}},{extra:'x'}])assert.throws(()=>engine.validateAnswers(valid(),notes));
});
