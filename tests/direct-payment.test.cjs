const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {checkoutState} = require('../site/checkout-guard.js');
const site = name => fs.readFileSync(path.join(__dirname,'../site',name),'utf8');
const configContext = {window:{}};
vm.runInNewContext(site('config.js'),configContext);
const config = configContext.window.CONSOLIDATA_CHECKUP;

test('all six priced purchase entries open the existing payment form directly',()=>{
  let count = 0;
  for(const filename of ['index.html','faq.html','terms.html']) {
    for(const [,href,markup] of site(filename).matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const text=markup.replace(/<[^>]*>/g,'');
      if(!/(?:Get.*checkup|Review.*checkup)/i.test(text))continue;
      count++;
      assert.equal(href,config.paymentLink,filename+': '+text);
    }
  }
  assert.equal(count,6);
});

function runLegacy(settings,search='') {
  const redirects=[];
  const button={href:config.paymentLink,textContent:'',attrs:{},setAttribute(name,value){this.attrs[name]=value},getAttribute(name){return this.attrs[name]},removeAttribute(name){delete this.attrs[name];if(name==='href')delete this.href}};
  const status={textContent:''};
  const context={window:{CONSOLIDATA_CHECKUP:settings,CheckupCheckout:{checkoutState},location:{search,replace:url=>redirects.push(url)}},document:{getElementById:id=>id==='checkout-status'?status:id==='stripe-checkout'?button:null}};
  vm.runInNewContext(site('checkout.js'),context);
  return {redirects,button,status};
}
test('legacy checkout automatically replaces its history entry with the payment form',()=>{
  assert.deepEqual(runLegacy(config).redirects,[config.paymentLink]);
});
test('legacy checkout never forwards query strings or arbitrary destinations',()=>{
  assert.deepEqual(runLegacy(config,'?next=https://evil.example&paid=true&session_id=cs_fake').redirects,[config.paymentLink]);
});
test('unready legacy checkout remains on site without a payment link',()=>{
  for(const settings of [{},{...config,mode:'review'},{...config,paymentLink:'https://evil.example/x'}]) {
    const result=runLegacy(settings);
    assert.deepEqual(result.redirects,[]);
    assert.ok(!result.button.href);
  }
});
test('legacy page offers a labelled real payment fallback without JavaScript',()=>{
  assert.ok(site('checkout.html').includes('href="'+config.paymentLink+'"'));
  assert.ok(!/Continue to Stripe|Loading checkout/.test(site('checkout.html')));
});
test('legacy redirect scripts use a fresh cache identity after replacing the old click flow',()=>{
  assert.ok(/src="checkout\.js\?v=direct-20261019"/.test(site('checkout.html')));
  assert.ok(/src="checkout-guard\.js\?v=direct-20261019"/.test(site('checkout.html')));
});
test('discovery describes the direct destination and omits the obsolete interstitial',()=>{
  const manifest=JSON.parse(site('site-manifest.json'));
  assert.equal(manifest.purchaseUrl,config.paymentLink);
  assert.ok(!site('sitemap.xml').includes('/checkout.html'));
});
