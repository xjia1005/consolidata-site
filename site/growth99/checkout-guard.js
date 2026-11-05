(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CheckupCheckout=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function sanitizeCampaign(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value)?value:'';}
  function validStripeCheckout(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='checkout.stripe.com'&&!u.port&&!u.username&&!u.password&&u.pathname.startsWith('/c/');}catch{return false;}}
  function clientContext(config,location){
    const invalid=Object.freeze({valid:false,mode:'invalid',apiBase:'',storageKey:''});
    if(!config||config.price!==99||config.currency!=='USD'||!location)return invalid;
    if(config.paymentMode==='sandbox'){
      if(location.origin!=='http://127.0.0.1:4200'||location.pathname!=='/sandbox-assessment.html'||config.assessmentUrl!=='sandbox-assessment.html'||config.apiBase!=='http://127.0.0.1:4200/api/checkup-sandbox'||config.delivery!=='private-review-pdf')return invalid;
      return Object.freeze({valid:true,mode:'sandbox',apiBase:config.apiBase,storageKey:'consolidata_growth_assessment99_sandbox_v1'});
    }
    if(config.paymentMode!=='live'||location.pathname!=='/growth-assessment.html'||config.assessmentUrl!=='growth-assessment.html'||config.apiBase!=='/api/checkup'||config.delivery!=='email-pdf-attachment')return invalid;
    return Object.freeze({valid:true,mode:'live',apiBase:'/api/checkup',storageKey:'consolidata_growth_assessment99_v1'});
  }
  function checkoutState(config,mode='live'){
    const sandbox=mode==='sandbox';
    const delivery=sandbox?'private-review-pdf':'email-pdf-attachment';
    const matchingMode=sandbox?config?.payment_mode==='sandbox':mode==='live'&&(config?.payment_mode===undefined||config.payment_mode==='live');
    const ready=Boolean(config&&matchingMode&&config.price===99&&config.currency==='USD'&&config.delivery===delivery&&config.purchase_enabled===true);
    if(sandbox)return{ready,reason:ready?'Sandbox checkout is available for a simulated US$99 payment. No actual money is charged. The report is prepared for private operator review; no email is sent.':'Sandbox payment or private report review is unavailable. No live checkout will be opened and no email is sent.'};
    return{ready,reason:ready?'Secure payment is available. Review the report details and total before paying. Your report is emailed after verified payment.':'This assessment preview can save your answers and work email. Payment is unavailable until the payment and report-email services are configured and verified. No charge will be requested.'};
  }
  return Object.freeze({sanitizeCampaign,validStripeCheckout,clientContext,checkoutState});
});
