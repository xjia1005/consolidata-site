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
    assert.ok(!site(name).includes('US$27'),name);
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
  assert.ok(html.indexOf('id="purchase-view"')<html.indexOf('US$47'));
  assert.match(html,/US\$47 one-time, plus applicable tax/);
  assert.ok(site('assessment.js').includes("api('/email'"));
  for(const id of ['download-text','download-json','print-report','report-strengths','report-priorities','report-summary'])assert.ok(!html.includes('id="'+id+'"'));
  assert.ok(!/URL\.createObjectURL|window\.print|\.buildReport\(/.test(site('assessment.js')));
});

test('B home preserves the A headline with price-free entry and all action buttons omit prices',()=>{
  const home=site('index.html');assert.match(home,/Which marketing spend is worth repeating\?/);
  assert.match(home,/Your next budget decision needs a clearer picture\./);
  assert.ok(!/US\$|\b47\b|data-checkup-price/.test(home));assert.match(home,/>Start assessment</);
  for(const name of ['index.html','assessment.html','faq.html','terms.html','checkout.html']){
    for(const action of site(name).matchAll(/<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/gi))assert.ok(!/US\$|\$\s*47|\b47\b/.test(action[2]),name+' '+action[2]);
  }
  for(const asset of ['assessment.js','checkup-engine.js','checkout-guard.js','assessment.css'])assert.ok(site('assessment.html').includes(asset+'?v=20261027-b1'));
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
  assert.equal(manifest.price.amount,47);assert.equal(manifest.delivery,'email-pdf-attachment');assert.equal(manifest.purchaseUrl,null);
  assert.equal(manifest.emailEndpoint,'/api/checkup/email');assert.equal(manifest.version,'assessment-first-b-20261027');
  assert.ok(site('llms.txt').includes('/api/checkup/config'));assert.ok(!site('sitemap.xml').includes('/checkout.html'));
});
