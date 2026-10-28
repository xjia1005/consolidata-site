const {test}=require('node:test');
const assert=require('node:assert/strict');
const {checkoutState,validStripeCheckout,sanitizeCampaign}=require('../site/checkout-guard.js');
const ready={price:47,currency:'USD',delivery:'email-pdf-attachment',purchase_enabled:true};
test('only a matching configured server response enables checkout',()=>{
  assert.equal(checkoutState(ready).ready,true);
  for(const config of [null,{}, {...ready,price:27},{...ready,currency:'CAD'},{...ready,purchase_enabled:false},{...ready,delivery:'shareable-browser-report'}])assert.equal(checkoutState(config).ready,false);
});
test('return flags and payment references cannot enable checkout or issue entitlement',()=>{
  assert.equal(checkoutState({paid:true,session_id:'cs_fake',price:47}).ready,false);
  assert.equal(checkoutState({...ready,paid:true}).paymentUrl,undefined);
});
test('checkout destination is a hosted HTTPS Stripe checkout URL',()=>{
  assert.equal(validStripeCheckout('https://checkout.stripe.com/c/pay/cs_live_example#fragment'),true);
  for(const value of ['javascript:alert(1)','https://checkout.stripe.com.evil.example/c/pay/x','http://checkout.stripe.com/c/pay/x','https://user@checkout.stripe.com/c/pay/x','https://evil.example/c/pay/x','https://buy.stripe.com/old','https://checkout.stripe.com/account'])assert.equal(validStripeCheckout(value),false);
});
test('source codes reject email addresses, paths, URLs and excessive length',()=>{
  assert.equal(sanitizeCampaign('CDTS-LI-20261027_001'),'CDTS-LI-20261027_001');
  for(const value of ['a@b.com','https://example.com','../secret','x'.repeat(81),'',null])assert.equal(sanitizeCampaign(value),'');
});
