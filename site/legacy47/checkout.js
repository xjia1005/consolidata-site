'use strict';
const checkoutStatus = document.getElementById('checkout-status');
const checkoutButton = document.getElementById('stripe-checkout');
const checkoutState = window.CheckupCheckout?.checkoutState(window.CONSOLIDATA_CHECKUP);
if (checkoutState?.ready) {
  if (checkoutButton) checkoutButton.href = checkoutState.paymentUrl;
  if (checkoutStatus) checkoutStatus.textContent = checkoutState.reason;
  // Retire the old extra-click route. Never forward query strings or claim payment.
  window.location.replace(checkoutState.paymentUrl);
} else {
  if (checkoutStatus) checkoutStatus.textContent = 'Payment is temporarily unavailable. Please email alvinj@consolidatats.com for help.';
  if (checkoutButton) {
    checkoutButton.removeAttribute('href');
    checkoutButton.setAttribute('aria-disabled', 'true');
    checkoutButton.textContent = 'Payment unavailable';
  }
}
