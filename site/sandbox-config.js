// Dedicated local sandbox only. The client also checks the exact page and origin.
window.CONSOLIDATA_CHECKUP = Object.freeze({
  price: 99,
  currency: 'USD',
  paymentMode: 'sandbox',
  assessmentUrl: 'sandbox-assessment.html',
  apiBase: 'http://127.0.0.1:4200/api/checkup-sandbox',
  delivery: 'private-review-pdf'
});
