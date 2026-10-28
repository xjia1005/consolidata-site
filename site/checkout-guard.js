(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CheckupCheckout=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function sanitizeCampaign(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value)?value:'';}
  function validStripeCheckout(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='checkout.stripe.com'&&!u.username&&!u.password&&u.pathname.startsWith('/c/');}catch{return false;}}
  function checkoutState(config){const ready=Boolean(config&&config.price===47&&config.currency==='USD'&&config.delivery==='email-pdf-attachment'&&config.purchase_enabled===true);return{ready,reason:ready?'Secure payment is available. Review the report details and total before paying. Your report is emailed after verified payment.':'This assessment preview can save your answers and work email. Payment is unavailable until the payment and report-email services are configured and verified. No charge will be requested.'};}
  return Object.freeze({sanitizeCampaign,validStripeCheckout,checkoutState});
});
