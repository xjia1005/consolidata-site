(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CheckupCheckout = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function sanitizeCampaign(value) {
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : '';
  }
  function checkoutState(config = {}) {
    let validLink = false;
    try {
      const url = new URL(config.paymentLink);
      validLink = url.protocol === 'https:' && url.hostname === 'buy.stripe.com' && !url.username && !url.password && url.pathname.length > 1;
    } catch { /* Missing configuration is an expected review state. */ }
    // This explicitly approved delivery model has no paid-access entitlement.
    // Public flags select checkout presentation; they never verify a payment.
    const ready = validLink && config.mode === 'live' && config.price === 27 &&
      config.currency === 'USD' && config.fulfillmentReady === true &&
      config.delivery === 'shareable-browser-report';
    return {
      ready,
      paymentUrl: ready ? config.paymentLink : null,
      reason: ready
        ? 'Opening your Marketing Checkup payment form. After payment, complete the questionnaire and download your report.'
        : 'Checkout is temporarily unavailable. Please contact us for help.'
    };
  }
  return Object.freeze({ checkoutState, sanitizeCampaign });
});
