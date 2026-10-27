const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkoutState, sanitizeCampaign } = require('../site/checkout-guard.js');

test('unconfigured checkout stays closed', () => {
  assert.equal(checkoutState({ price: 47, currency: 'USD' }).ready, false);
});
test('a link alone cannot enable paid checkout', () => {
  assert.equal(checkoutState({ price: 47, currency: 'USD', paymentLink: 'https://buy.stripe.com/test_abc' }).ready, false);
});
test('static preview cannot enable live checkout even with a claimed ready flag', () => {
  assert.equal(checkoutState({ mode: 'review', price: 47, currency: 'USD', paymentLink: 'https://buy.stripe.com/abc', fulfillmentReady: true }).ready, false);
});
test('an unverified return URL does not count as payment', () => {
  assert.equal(checkoutState({ price: 47, currency: 'USD', session_id: 'cs_live_fake', paid: true }).ready, false);
});
test('lookalike and insecure links cannot enable checkout', () => {
  for (const paymentLink of ['https://buy.stripe.com.evil.example/x', 'javascript:alert(1)', 'http://buy.stripe.com/x']) {
    assert.equal(checkoutState({ mode: 'live', price: 47, currency: 'USD', paymentLink, fulfillmentReady: true }).ready, false);
  }
});
test('campaign labels reject arbitrary personal text and are bounded', () => {
  assert.equal(sanitizeCampaign('reasons-email-01'), 'reasons-email-01');
  assert.equal(sanitizeCampaign('alice@example.com'), '');
  assert.equal(sanitizeCampaign('x'.repeat(81)), '');
});

const launch = {mode:'live',price:47,currency:'USD',paymentLink:'https://buy.stripe.com/abc',fulfillmentReady:true,delivery:'shareable-browser-report'};
test('explicit lightweight delivery enables the configured Stripe destination', () => {
  assert.equal(checkoutState(launch).ready, true);
  assert.equal(checkoutState(launch).paymentUrl, launch.paymentLink);
});

test('the current offer rejects the old27USD configured amount', () => {
  assert.equal(checkoutState({...launch,price:27}).ready, false);
});
test('no payment entitlement is issued and return parameters change nothing', () => {
  assert.deepEqual(checkoutState({...launch,paid:true,session_id:'cs_fake'}), checkoutState(launch));
  assert.equal(checkoutState({...launch,delivery:'verified-order'}).ready,false);
  assert.equal(checkoutState({...launch,currency:'CAD'}).ready,false);
  assert.equal(checkoutState({...launch,price:29}).ready,false);
  assert.equal(checkoutState({...launch,mode:'review'}).ready,false);
});
