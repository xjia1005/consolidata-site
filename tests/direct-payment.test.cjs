const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const site=name=>fs.readFileSync(path.join(__dirname,'../site',name),'utf8');
test('public entry pages lead to the questionnaire and have no old direct payment link',()=>{
  for(const name of ['index.html','faq.html','terms.html','checkout.html']){
    assert.ok(site(name).includes('assessment.html'),name);
    assert.ok(!site(name).includes('5kQ00l3Vf4t0a8AaE983C0e'),name);
    assert.ok(!/US\$(?:27|47)\b/.test(site(name)),name);
  }
});
test('legacy entry redirects only to the questionnaire and never forwards parameters',()=>{
  const targets=[];vm.runInNewContext(site('checkout.js'),{window:{location:{search:'?paid=true&next=https://evil.example',replace:url=>targets.push(url)}}});
  assert.deepEqual(targets,['assessment.html']);
});
test('assessment separates email save from a plainly priced purchase review and has no full-report controls',()=>{
  const html=site('assessment.html');
  assert.match(html,/id="delivery-email"[^>]*type="email"[^>]*required/);
  assert.match(html,/id="confirm-email"[^>]*type="email"[^>]*required/);
  assert.ok(html.indexOf('id="email-view"')<html.indexOf('id="purchase-view"'));
  assert.match(html.slice(html.indexOf('id="purchase-view"')),/US\$99 one-time, plus applicable tax/);
  assert.ok(site('assessment.js').includes("api('/email'"));
  for(const id of ['download-text','download-json','print-report','report-strengths','report-priorities','report-summary'])assert.ok(!html.includes('id="'+id+'"'));
  assert.ok(!/URL\.createObjectURL|window\.print|\.buildReport\(/.test(site('assessment.js')));
});

test('home discloses99USD and30questions with one assessment action and current asset identities',()=>{
  const home=site('index.html');assert.match(home,/What is holding growth back\?/);
  assert.match(home.slice(home.indexOf('<body')),/US\$99/);
  assert.match(home,/30 questions/);assert.match(home,/VENTURE-BACKED STARTUP LEADERS/);
  assert.match(home,/>Start assessment</);assert.ok(!home.includes('id="call-request"'));
  const primaryLinks=[...home.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].filter(action=>/class="[^"]*button-primary/.test(action[1]));
  assert.ok(primaryLinks.length>0);
  for(const action of primaryLinks)assert.match(action[1],/href="assessment\.html"/);
  for(const asset of ['assessment-bank.js','assessment.js','checkup-engine.js','checkout-guard.js','assessment.css'])assert.ok(site('assessment.html').includes(asset+'?v=20261101-growth99'));
});
test('status uses a bearer header and fragment return data, never query-string entitlement',()=>{
  const js=site('assessment.js');
  assert.ok(js.includes("'Authorization':'Bearer '+assessmentId"));
  assert.ok(js.includes('location.hash.slice(1)'));
  assert.ok(!js.includes('/status?'));
  assert.ok(!/get\('paid'\)|get\('session_id'\)/.test(js));
  assert.ok(js.includes('delivery_uncertain'));
  assert.ok(js.includes("data.can_resume_checkout===true&&data.delivery_status==='not_requested'"));
});
test('discovery contract describes server-controlled email delivery and no fixed payment URL',()=>{
  const manifest=JSON.parse(site('site-manifest.json'));
  assert.equal(manifest.price.amount,99);assert.equal(manifest.questionCount,30);assert.equal(manifest.delivery,'email-pdf-attachment');assert.equal(manifest.purchaseUrl,null);
  assert.equal(manifest.emailEndpoint,'/api/checkup/email');assert.equal(manifest.version,'growth-assessment99-20261101');
  assert.ok(site('llms.txt').includes('/api/checkup/config'));assert.ok(!site('sitemap.xml').includes('/checkout.html'));
});
