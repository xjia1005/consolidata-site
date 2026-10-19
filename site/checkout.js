'use strict';
const checkoutStatus = document.getElementById('checkout-status');
if (checkoutStatus && window.CheckupCheckout) {
  const state = window.CheckupCheckout.checkoutState(window.CONSOLIDATA_CHECKUP);
  checkoutStatus.textContent = state.reason;
  const button = document.getElementById('stripe-checkout');
  if (button && state.ready) {
    button.href = state.paymentUrl;
    button.removeAttribute('aria-disabled');
    button.textContent = 'Continue to Stripe · US$27';
  }
}
document.getElementById('stripe-checkout')?.addEventListener('click', function (event) {
  if (this.getAttribute('aria-disabled') === 'true') event.preventDefault();
});
// Deliberately ignore paid/session_id query parameters. They are not payment proof.
