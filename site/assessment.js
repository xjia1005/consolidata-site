(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const engine = window.CheckupEngine;
  if (!engine || engine.questions.length !== 30 || !window.CheckupCheckout) { byId('load-error').hidden = false; return; }
  const views = ['question-view', 'review-view', 'email-view', 'purchase-view', 'status-view'];
  const storageKey = 'consolidata_growth_assessment99_v1';
  let answers = {}, notes = {}, step = 0, editing = false, assessmentId = '', runtime = null, busy = false;
  let savedEmail = '', maskedEmail = '', canResume = false, resumed = false;
  let lockedControls = new Map();
  const noteInput = byId('question-note');
  const textAnswer = byId('question-answer');
  const lastStep = engine.questions.length - 1;
  const notice = text => { byId('checkup-status').textContent = text; };
  function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function showView(id, heading) { views.forEach(view => { byId(view).hidden = view !== id; }); byId('restart-area').hidden = id === 'status-view'; if (heading) { byId(heading).focus({preventScroll:true}); byId(heading).scrollIntoView({block:'start'}); } }
  function setError(id, text) { byId(id).textContent = text; byId(id).hidden = !text; }
  function saveToken(value) { assessmentId = value; try { if(value) sessionStorage.setItem(storageKey,value); else sessionStorage.removeItem(storageKey); } catch { /* This open page still keeps its token. */ } }
  function setBusy(value) {
    if (value === busy) return;
    busy = value;
    if (busy) {
      lockedControls = new Map();
      document.querySelectorAll('main button, main input, main textarea, main fieldset').forEach(control => {
        lockedControls.set(control, control.disabled);
        control.disabled = true;
      });
    } else {
      lockedControls.forEach((disabled, control) => { control.disabled = disabled; });
      lockedControls.clear();
    }
    byId('open-checkout').disabled = busy || !savedEmail || !window.CheckupCheckout.checkoutState(runtime).ready;
    byId('start-new-checkup').setAttribute('aria-disabled', String(busy));
    byId('start-new-checkup').setAttribute('tabindex', busy ? '-1' : '0');
  }
  function invalidateAssessment() { saveToken(''); savedEmail='';maskedEmail='';canResume=false;resumed=false;byId('delivery-email').value='';byId('confirm-email').value='';setError('email-error','');setError('checkout-error',''); }
  function showEmail() { byId('resume-email-note').hidden=!resumed;byId('resume-email-note').textContent=maskedEmail?'The saved address is '+maskedEmail+'. Enter the same address again to continue an existing checkout.':'Confirm the address for this saved assessment before reviewing the purchase.';byId('edit-answers').hidden=resumed;showView('email-view','email-title'); }
  function showPurchase() { byId('purchase-email').textContent='Report email: '+maskedEmail;byId('purchase-edit-answers').hidden=resumed;showView('purchase-view','purchase-title'); }
  function updateCount() { byId('answer-count').textContent = Object.keys(answers).length + ' of ' + engine.questions.length + ' recorded'; byId('note-count').textContent = noteInput.value.length + ' / 600'; byId('answer-character-count').textContent = Array.from(textAnswer.value).length + ' / 1,500'; }
  function keepNote() { const id = engine.questions[step].id; if(noteInput.value) notes[id] = noteInput.value; else delete notes[id]; }
  function unknownAnswer(q) { return q.answer_type === 'text' ? 'Unknown / deferred' : q.options.some(option => option.value === 'unknown') ? ['unknown'] : []; }
  function keepAnswer() { const q = engine.questions[step]; if(q.answer_type === 'text') answers[q.id] = textAnswer.value; }
  function answerLabel(q, value) { if(q.answer_type === 'text')return value || 'Unknown / deferred'; return Array.isArray(value) && value.length ? value.map(item=>q.options.find(option=>option.value===item)?.label || item).join('\n') : 'Unknown / deferred'; }
  function recordCurrent() {
    keepAnswer(); keepNote(); const q = engine.questions[step];
    if(q.answer_type === 'text' ? !answers[q.id]?.trim() : !answers[q.id]?.length) answers[q.id] = unknownAnswer(q);
    const complete = Object.fromEntries(engine.questions.map(question => [question.id, unknownAnswer(question)]));
    try { engine.validateAnswers({...complete, ...answers}, notes); return true; }
    catch(error) { setError('question-error', error.message); (q.answer_type === 'text' ? textAnswer : byId('question-options').querySelector('input'))?.focus(); return false; }
  }
  function showQuestion(focus=true) {
    const q = engine.questions[step]; showView('question-view');
    byId('step-label').textContent = 'Question ' + (step+1) + ' of ' + engine.questions.length; byId('question-progress').max = engine.questions.length; byId('question-progress').value = step+1;
    byId('question-title').textContent = q.title; byId('question-explanation').textContent = q.explanation;
    byId('question-group').textContent = q.group;
    byId('question-unknown-help').textContent = q.unknown_help;
    const fields = byId('question-options'); fields.replaceChildren(element('legend','Select all that apply','sr-only'));
    fields.hidden = q.answer_type === 'text'; byId('text-answer-group').hidden = q.answer_type !== 'text';
    textAnswer.value = q.answer_type === 'text' ? answers[q.id] || '' : '';
    q.options.forEach(option => { const label = element('label',undefined,'answer-option'); const input = document.createElement('input'); input.type='checkbox'; input.name='answer'; input.value=option.value; input.checked=Array.isArray(answers[q.id]) && answers[q.id].includes(option.value); input.addEventListener('change',()=>{ if(busy)return;answers[q.id]=Array.from(fields.querySelectorAll('input')).filter(choice=>choice.checked).map(choice=>choice.value); byId('question-error').hidden=true; updateCount(); }); label.append(input,element('span',option.label)); fields.append(label); });
    noteInput.value = notes[q.id] || ''; byId('question-error').hidden=true; byId('previous-question').disabled=step===0;
    byId('next-question').textContent = editing ? 'Save and review' : step===lastStep ? 'Review my answers' : 'Next question'; updateCount();
    if(focus){byId('question-title').focus({preventScroll:true});byId('question-title').scrollIntoView({block:'start'});}
  }
  function showReview() {
    keepNote(); const list = byId('review-answers'); list.replaceChildren();
    engine.questions.forEach((q,index)=>{ const item=element('li'); item.append(element('h3',(index+1)+'. '+q.title),element('p',answerLabel(q,answers[q.id]),'review-answer-text')); if(notes[q.id])item.append(element('p',notes[q.id],'summary-note')); const button=element('button','Edit answer','button button-quiet answer-edit'); button.type='button'; button.addEventListener('click',()=>{if(busy)return;step=index;editing=true;showQuestion();});item.append(button);list.append(item); });
    showView('review-view','review-title');
  }
  async function api(path, options={}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response=await fetch('/api/checkup'+path,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal,headers:{'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
    } catch (error) {
      throw new Error(error.name === 'AbortError' ? 'The service took too long to respond. Your answers remain on this page. Please try again or contact us for help.' : 'The checkup service could not be reached. Your answers remain on this page. Please try again.');
    } finally { clearTimeout(timeout); }
    let data; try{data=await response.json();}catch{throw new Error('The checkup service could not respond. Your answers remain on this page. Please try again.');}
    if(!response.ok)throw new Error(data?.error?.message || 'The request could not be completed. Please try again.');
    return data;
  }
  async function loadConfig() {
    try { runtime=await api('/config'); const state=window.CheckupCheckout.checkoutState(runtime); byId('service-status').textContent=state.ready?'Start with the questions. You can review a report purchase after adding your work email. No charge is made by starting.':state.reason;byId('purchase-availability').textContent=state.reason;byId('open-checkout').disabled=busy||!savedEmail||!state.ready; }
    catch { runtime=null;const message='Payment availability could not be checked. You can answer the questions and save your work email if the assessment service is available. No payment will be requested until checkout and email delivery are ready.';byId('service-status').textContent=message;byId('purchase-availability').textContent=message;byId('open-checkout').disabled=true; }
  }
  byId('next-question').addEventListener('click',()=>{ if(busy||!recordCurrent())return; if(editing||step===lastStep){editing=false;showReview();}else{step++;showQuestion();} });
  byId('previous-question').addEventListener('click',()=>{if(busy)return;keepAnswer();keepNote();if(step>0){step--;showQuestion();}});
  byId('defer-question').addEventListener('click',()=>{if(busy)return;keepNote();const q=engine.questions[step];answers[q.id]=unknownAnswer(q);showQuestion(false);notice('Marked unknown or deferred. You can return and edit this answer.');});
  textAnswer.addEventListener('input',()=>{if(busy)return;keepAnswer();setError('question-error','');updateCount();});
  noteInput.addEventListener('input',()=>{if(!busy)updateCount();});
  byId('review-back').addEventListener('click',()=>{if(busy)return;step=lastStep;editing=false;showQuestion();});
  byId('create-preview').addEventListener('click',async()=>{
    if(busy)return;setError('preview-error','');
    if(!byId('submit-consent').checked){setError('preview-error','Please confirm that you understand how these answers will be submitted.');byId('submit-consent').focus();return;}
    try {engine.validateAnswers(answers,notes);}catch(error){setError('preview-error',error.message);return;}
    setBusy(true);byId('create-preview').textContent='Preparing your preview…';
    try { const source=window.CheckupCheckout.sanitizeCampaign(new URLSearchParams(location.search).get('src')); const data=await api('/assessments',{method:'POST',body:JSON.stringify({answers,notes,...(source?{source}:{})})}); if(typeof data.assessment_id!=='string'||!/^[A-Za-z0-9_-]{20,160}$/.test(data.assessment_id)||!data.preview||typeof data.preview.message!=='string')throw new Error('The preview response was incomplete. Please try again.');saveToken(data.assessment_id);savedEmail='';maskedEmail='';resumed=false;byId('preview-coverage').textContent=data.preview.answered+' answers received. '+data.preview.unknowns+' marked as unknown.';byId('preview-message').textContent=data.preview.message;showEmail();notice('Your answers are saved. Add your work email to review the optional purchase. No payment has been made.');await loadConfig(); }
    catch(error){setError('preview-error',error.message);}
    finally{setBusy(false);byId('create-preview').textContent='Continue to email';}
  });
  ['edit-answers','purchase-edit-answers'].forEach(id=>byId(id).addEventListener('click',()=>{if(busy||resumed)return;invalidateAssessment();showReview();}));
  byId('change-email').addEventListener('click',()=>{if(busy)return;showEmail();});
  byId('email-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;setError('email-error','');const email=byId('delivery-email').value.trim(), confirmation=byId('confirm-email').value.trim();
    const validEmail=email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    byId('delivery-email').setCustomValidity(validEmail?'':'Enter a valid work email address.');byId('confirm-email').setCustomValidity(email.toLowerCase()===confirmation.toLowerCase()?'':'The email addresses must match.');
    if(!validEmail||email.toLowerCase()!==confirmation.toLowerCase()){setError('email-error',!validEmail?'Enter a valid work email address.':'The email addresses must match.');byId('email-form').reportValidity();return;}
    if(!byId('email-form').reportValidity())return;
    if(!assessmentId){setError('email-error','Complete and submit your assessment before adding an email.');return;}
    setBusy(true);byId('save-email').textContent='Saving your email…';
    try{const data=await api('/email',{method:'POST',body:JSON.stringify({assessment_id:assessmentId,email})});if(typeof data.masked_email!=='string'||!data.masked_email)throw new Error('Your email could not be confirmed. Please try again.');savedEmail=email;maskedEmail=data.masked_email;showPurchase();notice('Your email is saved. Review the price and report details before paying.');await loadConfig();}
    catch(error){setError('email-error',error.message);}
    finally{setBusy(false);byId('save-email').textContent='Continue to purchase review';}
  });
  byId('open-checkout').addEventListener('click',async()=>{
    if(busy)return;setError('checkout-error','');
    if(!assessmentId||!savedEmail){setError('checkout-error','Save and confirm your work email before continuing.');return;}
    if(!window.CheckupCheckout.checkoutState(runtime).ready){setError('checkout-error','Checkout is not available yet. No payment has been requested. Please try again later.');return;}
    setBusy(true);byId('open-checkout').textContent='Opening secure payment…';
    try {const data=await api('/checkout',{method:'POST',body:JSON.stringify({assessment_id:assessmentId,email:savedEmail})});if(!window.CheckupCheckout.validStripeCheckout(data.checkout_url))throw new Error('A secure payment page could not be verified. Please contact us.');location.assign(data.checkout_url);}
    catch(error){setError('checkout-error',error.message);setBusy(false);byId('open-checkout').textContent='Continue to secure payment';}
  });
  ['delivery-email','confirm-email'].forEach(id=>byId(id).addEventListener('input',()=>{if(busy)return;byId(id).setCustomValidity('');setError('email-error','');}));
  async function refreshStatus() {
    if(busy)return;setBusy(true);setError('status-error','');
    canResume=false;byId('status-checkout').hidden=true;
    try {const data=await api('/status',{headers:{'Authorization':'Bearer '+assessmentId}});const payments={unpaid:'Payment has not been verified.',pending:'Payment confirmation is pending.',paid:'Payment is verified.',canceled:'Payment was canceled.'};const deliveries={not_requested:'A report email has not been requested.',pending:'Your report email is queued.',sending:'Your report email is being prepared for sending.',sent_accepted:'The email service accepted your report email. Check your inbox and spam folder; inbox delivery is not guaranteed by this status.',retry_pending:'Your report email is awaiting a retry. Please check again or contact us.',failed:'Your report email could not be sent. Please contact us for delivery help.',delivery_uncertain:'Delivery needs review. Contact support with your order reference; please do not purchase again.'};byId('payment-status').textContent=payments[data.payment_status]||'The payment status is not available.';byId('delivery-status').textContent=deliveries[data.delivery_status]||'Delivery needs review. Contact support with your order reference; please do not purchase again.';maskedEmail=typeof data.masked_email==='string'?data.masked_email:'';byId('status-email').textContent=maskedEmail?'Report email: '+maskedEmail:'';canResume=data.can_resume_checkout===true&&data.delivery_status==='not_requested';byId('status-checkout').hidden=!canResume; }
    catch(error){setError('status-error',error.message);}
    finally{setBusy(false);}
  }
  byId('refresh-status').addEventListener('click',refreshStatus);
  byId('resume-purchase').addEventListener('click',()=>{if(busy||!canResume)return;resumed=true;savedEmail='';byId('preview-coverage').textContent='Continue your saved assessment.';byId('preview-message').textContent='The complete report will be emailed after verified payment.';byId('delivery-email').value='';byId('confirm-email').value='';showEmail();});
  byId('start-new-checkup').addEventListener('click',event=>{if(busy){event.preventDefault();return;}saveToken('');});
  byId('restart-checkup').addEventListener('click',()=>{if(busy)return;answers={};notes={};step=0;editing=false;invalidateAssessment();byId('submit-consent').checked=false;showQuestion();notice('The answers on this page were cleared.');});
  const fragment=new URLSearchParams(location.hash.slice(1));const returned=fragment.get('assessment');
  if(returned&&/^[A-Za-z0-9_-]{20,160}$/.test(returned)){saveToken(returned);try{history.replaceState(null,'',location.pathname);}catch{}showView('status-view','status-title');refreshStatus();}
  else { let stored='';try{stored=sessionStorage.getItem(storageKey)||'';}catch{}if(stored&&/^[A-Za-z0-9_-]{20,160}$/.test(stored)){assessmentId=stored;showView('status-view','status-title');refreshStatus();}else showQuestion(false); }
  loadConfig();
})();
