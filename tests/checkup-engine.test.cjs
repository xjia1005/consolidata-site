const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../site/checkup-engine.js');
const bank=require('../site/assessment-bank.js');
const server=JSON.parse(fs.readFileSync(path.join(__dirname,'../backend/questions.json'),'utf8'));
const valid=()=>Object.fromEntries(engine.questions.map(q=>[q.id,q.answer_type==='text'?'A bounded fictional answer for '+q.id:[q.options[0].value]]));

test('all30 reviewed questions, options and grouping data agree with server bank',()=>{
  assert.equal(engine.questions.length,30);
  const publicFields=['schema_version','core_question_ids','questions','branches','value_dimensions'];
  assert.deepEqual(Object.keys(bank),publicFields);
  assert.deepEqual(bank,Object.fromEntries(publicFields.map(key=>[key,server[key]])));
  assert.equal(bank.pricing_experiment,undefined);
  assert.equal(bank.report_fields,undefined);
  assert.deepEqual(engine.questions.map(q=>q.id),server.questions.map(q=>q.id));
  engine.questions.forEach((q,i)=>{
    const original=server.questions[i];
    assert.equal(q.title,original.prompt_en);
    assert.equal(q.explanation,original.why_it_matters_en);
    assert.equal(q.answer_type,original.answer_type);
    assert.deepEqual(q.options,(original.options||[]).map(o=>({value:o.value,label:o.label_en})));
  });
});

test('browser engine exposes only question validation and coverage, no complete paid report',()=>{
  assert.deepEqual(Object.keys(engine),['questions','validateAnswers','coverage']);
  assert.equal(engine.buildReport,undefined);
  assert.ok(engine.questions.every(q=>!q.strength&&!q.priority&&!q.discussion&&!q.unknown));
  assert.ok(!/function buildReport|answerSummary|strengths:|priorities:/.test(fs.readFileSync(require.resolve('../site/checkup-engine.js'),'utf8')));
});

test('coverage records explicit, blank and mixed unknowns without a success score',()=>{
  const answers=valid();
  answers.C01='Unknown / deferred';answers.C02='  ';answers.C04=['reach','unknown'];answers.C06=[];
  assert.deepEqual(engine.coverage(answers),{answered:30,unknowns:4});
  assert.deepEqual(Object.keys(engine.coverage(valid())),['answered','unknowns']);
});

test('allunknown is a valid truthful complete record',()=>{
  const answers=Object.fromEntries(engine.questions.map(q=>[q.id,q.answer_type==='text'?'Unknown / deferred':['unknown']]));
  assert.equal(engine.validateAnswers(answers),true);
  assert.deepEqual(engine.coverage(answers),{answered:30,unknowns:30});
});

test('missing IDs and malformed or invented choices are rejected',()=>{
  const incomplete=valid();delete incomplete.C01;
  for(const answers of [undefined,null,[],incomplete,{...valid(),extra:'x'},
    {...valid(),C01:[]},{...valid(),C04:'reach'},{...valid(),C04:['invented']},
    {...valid(),C04:['reach','reach']},{...valid(),C04:[null]}])assert.throws(()=>engine.validateAnswers(answers));
});

test('textanswers use Unicode codepoints and reject excess and unsupported control text',()=>{
  assert.equal(engine.validateAnswers({...valid(),C01:'😀'.repeat(1500)}),true);
  for(const answer of ['x'.repeat(1501),'😀'.repeat(1501),'has\u0000control','\u007f','\ud800'])assert.throws(()=>engine.validateAnswers({...valid(),C01:answer}));
  assert.equal(engine.validateAnswers({...valid(),C01:'one\ntwo\tthree\r\n'}),true);
});

test('optional context uses bounded UTF16 text on known questions',()=>{
  assert.equal(engine.validateAnswers(valid(),{C01:'x'.repeat(600)}),true);
  assert.equal(engine.validateAnswers(valid(),{C01:'😀'.repeat(300)}),true);
  for(const notes of [[],{C01:'x'.repeat(601)},{C01:'😀'.repeat(301)},{C01:{}},{extra:'x'},
    {C01:'has\u0001control'},{C01:'\u007f'},{C01:'\udc00'}])assert.throws(()=>engine.validateAnswers(valid(),notes));
});

test('bounded unknown markers match the server contract without interpreting natural prose',()=>{
  for(const answer of ['unknown',' Unknown / deferred ','not sure',"I don't know",'I do not know','N/A','na','']){
    const answers={...valid(),C01:answer};
    assert.equal(engine.coverage(answers).unknowns,1);
  }
  assert.equal(engine.coverage({...valid(),C01:'We need to investigate unknown demand in this group.'}).unknowns,0);
});
