const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const engine=require('../site/checkup-engine.js');
const checkout=require('../site/checkout-guard.js');

// Minimal event-capable DOM fixture. It executes the actual application handlers;
// deferred fetch responses reproduce the user's navigation window deterministically.
class Element {
  constructor(tag, registry) {
    this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attrs={};
    this.disabled=false;this.hidden=false;this.value='';this.checked=false;this.textContent='';
    registry.push(this);this.registry=registry;
  }
  append(...nodes) { for(const node of nodes){if(node.parent)node.parent.children=node.parent.children.filter(x=>x!==node);this.children.push(node);node.parent=this;} }
  replaceChildren(...nodes) {this.children.forEach(x=>{x.parent=null;});this.children=[];this.append(...nodes);}
  addEventListener(type, fn) {(this.listeners[type]??=[]).push(fn);}
  trigger(type, event={}) {let result;for(const fn of this.listeners[type]||[])result=fn({preventDefault(){},target:this,...event});return result;}
  click() {if(!this.disabled)return this.trigger('click');}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  removeAttribute(name){delete this.attrs[name];}
  setCustomValidity(text){this.validationMessage=text;}
  reportValidity(){return true;}
  focus(){}
  scrollIntoView(){}
  querySelectorAll(selector){const results=[];const visit=node=>{for(const child of node.children){if(child.tagName===selector.toUpperCase())results.push(child);visit(child);}};visit(this);return results;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}
const response=(data,ok=true)=>({ok,json:async()=>data});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function application({ready=true,initialToken='',hash='',payment='unpaid',delivery='not_requested',resumeAllowed=false}={}) {
  const registry=[],ids=new Map(),previews=[],emails=[],statuses=[],checkouts=[],assignments=[],stored=new Map();
  if(initialToken)stored.set('consolidata_checkup_assessment',initialToken);
  const html=fs.readFileSync(path.join(__dirname,'../site/assessment.html'),'utf8');
  for(const [,tag,attrs] of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const match=attrs.match(/\bid="([^"]+)"/);if(!match)continue;
    const node=new Element(tag,registry);node.hidden=/\bhidden\b/.test(attrs);node.disabled=/\bdisabled\b/.test(attrs);ids.set(match[1],node);
  }
  const get=id=>{assert.ok(ids.has(id),'Missing fixture element '+id);return ids.get(id);};
  const location={search:'',hash,pathname:'/assessment.html',assign:url=>assignments.push(url)};
  const context={window:{CheckupEngine:engine,CheckupCheckout:checkout},location,history:{replaceState(){location.hash='';}},
    sessionStorage:{setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key),getItem:key=>stored.get(key)||null},
    document:{getElementById:get,createElement:tag=>new Element(tag,registry),querySelectorAll:()=>registry.filter(node=>['BUTTON','INPUT','TEXTAREA','FIELDSET'].includes(node.tagName))},
    URLSearchParams,AbortController,setTimeout,clearTimeout,
    fetch:(url,options)=>{
      if(url.endsWith('/config'))return Promise.resolve(response({price:47,currency:'USD',purchase_enabled:ready,delivery:'email-pdf-attachment'}));
      if(url.endsWith('/status')){statuses.push(options);return Promise.resolve(response({payment_status:payment,delivery_status:delivery,masked_email:'b***@example.com',can_resume_checkout:resumeAllowed}));}
      const held=deferred(),call={...held,body:JSON.parse(options.body)};
      if(url.endsWith('/assessments'))previews.push(call);
      else if(url.endsWith('/email'))emails.push(call);
      else if(url.endsWith('/checkout'))checkouts.push(call);
      else throw new Error('Unexpected fixture request '+url);
      return held.promise;
    }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../site/assessment.js'),'utf8'),context);
  function completeQuestions(){for(let i=0;i<10;i++){const choice=get('question-options').querySelectorAll('input')[0];choice.checked=true;choice.trigger('change');get('next-question').click();}get('submit-consent').checked=true;}
  function choose(value){const input=get('question-options').querySelectorAll('input').find(x=>x.value===value);assert.ok(input);input.checked=true;input.trigger('change');}
  const token=()=>stored.get('consolidata_checkup_assessment');
  async function completePreview(){completeQuestions();const pending=get('create-preview').trigger('click');const assessment='assessment_fixture_'+'x'.repeat(24);previews.at(-1).resolve(previewResponse(assessment));await pending;return assessment;}
  async function saveEmail(email='buyer@example.com'){get('delivery-email').value=email;get('confirm-email').value=email;const pending=get('email-form').trigger('submit');emails.at(-1).resolve(response({masked_email:'b***@example.com'}));await pending;}
  return{get,previews,emails,statuses,checkouts,assignments,completeQuestions,completePreview,saveEmail,choose,token,stored,location};
}
const previewResponse=token=>response({assessment_id:token,preview:{answered:10,unknowns:0,message:'Limited coverage preview.'}});

test('delayed preview locks review/back/edit and cannot attach an old token to edited answers',async()=>{
  const app=application();await flush();app.completeQuestions();
  const pending=app.get('create-preview').trigger('click');
  assert.equal(app.previews.length,1);
  assert.equal(app.previews[0].body.answers.review_ownership,'named');
  assert.equal(app.get('review-back').disabled,true);
  assert.equal(app.get('submit-consent').disabled,true);
  assert.equal(app.get('question-note').disabled,true);
  const lastEdit=app.get('review-answers').children[9].querySelector('button');
  assert.equal(lastEdit.disabled,true);
  // Force queued/programmatic events too: handlers must preserve the in-flight snapshot.
  app.get('review-back').trigger('click');lastEdit.trigger('click');app.choose('informal');
  app.get('next-question').trigger('click');app.get('create-preview').trigger('click');
  assert.equal(app.get('question-view').hidden,true);
  assert.equal(app.get('review-view').hidden,false);
  assert.equal(app.previews.length,1);
  const firstToken='assessment_first_'+'x'.repeat(24);
  app.previews[0].resolve(previewResponse(firstToken));await pending;
  assert.equal(app.token(),firstToken);
  app.get('edit-answers').click();
  assert.equal(app.get('review-answers').children[9].children[1].textContent,engine.questions[9].options[0].label);
  // Editing is allowed after completion; a fresh preview must use the new answers/token.
  app.get('review-answers').children[9].querySelector('button').click();app.choose('informal');app.get('next-question').click();
  const second=app.get('create-preview').trigger('click');
  assert.equal(app.previews[1].body.answers.review_ownership,'informal');
  const secondToken='assessment_second_'+'y'.repeat(24);
  app.previews[1].resolve(previewResponse(secondToken));await second;
  assert.equal(app.token(),secondToken);
});

test('delayed checkout locks edit and new-checkup navigation until the redirect',async()=>{
  const app=application();await flush();app.completeQuestions();
  const preview=app.get('create-preview').trigger('click');const token='assessment_checkout_'+'z'.repeat(24);
  app.previews[0].resolve(previewResponse(token));await preview;
  await app.saveEmail();
  const pending=app.get('open-checkout').trigger('click');
  assert.equal(app.checkouts.length,1);assert.equal(app.checkouts[0].body.assessment_id,token);
  assert.equal(app.get('purchase-edit-answers').disabled,true);assert.equal(app.get('delivery-email').disabled,true);
  app.get('purchase-edit-answers').trigger('click');app.get('change-email').trigger('click');
  let prevented=false;app.get('start-new-checkup').trigger('click',{preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(app.get('purchase-view').hidden,false);assert.equal(app.token(),token);
  app.checkouts[0].resolve(response({checkout_url:'https://checkout.stripe.com/c/pay/cs_fixture'}));await pending;
  assert.deepEqual(app.assignments,['https://checkout.stripe.com/c/pay/cs_fixture']);assert.equal(app.token(),token);
});

test('work email saves before provider setup, then purchase review exposes price with payment blocked',async()=>{
  const app=application({ready:false});await flush();const token=await app.completePreview();
  assert.equal(app.get('email-view').hidden,false);assert.equal(app.get('purchase-view').hidden,true);
  assert.equal(app.get('save-email').disabled,false);assert.equal(app.checkouts.length,0);
  await app.saveEmail();
  assert.equal(app.emails[0].body.assessment_id,token);assert.equal(app.emails[0].body.email,'buyer@example.com');
  assert.equal(app.get('purchase-view').hidden,false);assert.equal(app.get('email-view').hidden,true);
  assert.equal(app.get('purchase-email').textContent,'Report email: b***@example.com');
  assert.equal(app.get('open-checkout').disabled,true);assert.match(app.get('purchase-availability').textContent,/Payment is unavailable/);
  app.get('open-checkout').trigger('click');assert.equal(app.checkouts.length,0);
  assert.deepEqual([...app.stored.values()],[token]);
});

test('invalid or mismatching email cannot reach the save endpoint or payment',async()=>{
  const app=application();await flush();await app.completePreview();
  for(const [email,confirmation] of [['bad address','bad address'],['buyer@example.com','different@example.com']]){
    app.get('delivery-email').value=email;app.get('confirm-email').value=confirmation;
    await app.get('email-form').trigger('submit');assert.equal(app.emails.length,0);assert.equal(app.get('email-error').hidden,false);
  }
  assert.equal(app.get('email-view').hidden,false);assert.equal(app.checkouts.length,0);
});

test('delayed email save locks edit and navigation; an error preserves the email step for retry',async()=>{
  const app=application();await flush();const token=await app.completePreview();
  app.get('delivery-email').value='buyer@example.com';app.get('confirm-email').value='buyer@example.com';
  const pending=app.get('email-form').trigger('submit');
  assert.equal(app.get('edit-answers').disabled,true);assert.equal(app.get('delivery-email').disabled,true);
  app.get('edit-answers').trigger('click');app.get('restart-checkup').trigger('click');app.get('email-form').trigger('submit');
  assert.equal(app.emails.length,1);assert.equal(app.token(),token);
  app.emails[0].resolve(response({error:{code:'service_unavailable',message:'Please try saving your email again.'}},false));await pending;
  assert.equal(app.get('email-view').hidden,false);assert.equal(app.get('save-email').disabled,false);
  assert.match(app.get('email-error').textContent,/try saving/);assert.equal(app.get('delivery-email').value,'buyer@example.com');
  assert.equal(app.get('purchase-view').hidden,true);assert.equal(app.checkouts.length,0);
});

test('editing answers invalidates the saved assessment and email before a fresh submission',async()=>{
  const app=application();await flush();await app.completePreview();await app.saveEmail();
  app.get('purchase-edit-answers').click();assert.equal(app.token(),undefined);assert.equal(app.get('review-view').hidden,false);
  assert.equal(app.get('delivery-email').value,'');assert.equal(app.get('confirm-email').value,'');
  app.get('open-checkout').trigger('click');assert.equal(app.checkouts.length,0);
  const pending=app.get('create-preview').trigger('click');const fresh='assessment_changed_'+'y'.repeat(24);
  app.previews[1].resolve(previewResponse(fresh));await pending;
  assert.equal(app.get('email-view').hidden,false);assert.equal(app.token(),fresh);assert.equal(app.get('open-checkout').disabled,true);
});

test('an open pending checkout resumes only by server permission and reconfirms the same saved address',async()=>{
  const token='assessment_cancel_'+'z'.repeat(24);
  const app=application({hash:'#assessment='+token+'&payment=cancel',payment:'pending',resumeAllowed:true});await flush();
  assert.equal(app.location.hash,'');assert.equal(app.statuses[0].headers.Authorization,'Bearer '+token);
  assert.equal(app.get('status-checkout').hidden,false);app.get('resume-purchase').click();
  assert.equal(app.get('email-view').hidden,false);assert.equal(app.get('edit-answers').hidden,true);
  assert.match(app.get('resume-email-note').textContent,/same address/);await app.saveEmail();
  assert.equal(app.emails[0].body.assessment_id,token);assert.equal(app.get('purchase-view').hidden,false);
  const pending=app.get('open-checkout').trigger('click');assert.equal(app.checkouts[0].body.assessment_id,token);
  app.checkouts[0].resolve(response({checkout_url:'https://checkout.stripe.com/c/pay/cs_retry'}));await pending;
  assert.equal(app.assignments[0],'https://checkout.stripe.com/c/pay/cs_retry');
});

test('processing, paid or uncertain status without server permission cannot resume despite return flags',async()=>{
  for(const [payment,delivery] of [['paid','pending'],['pending','not_requested'],['unpaid','delivery_uncertain'],['unknown','not_requested'],['canceled','not_requested'],['unpaid','not_requested']]){
    const app=application({initialToken:'assessment_status_'+'s'.repeat(24),hash:'#payment=success',payment,delivery});await flush();
    assert.equal(app.get('status-checkout').hidden,true);app.get('resume-purchase').trigger('click');
    assert.equal(app.get('email-view').hidden,true);assert.equal(app.get('purchase-view').hidden,true);assert.equal(app.checkouts.length,0);
  }
});

test('the resume flag must be boolean true and report delivery must not have started',async()=>{
  for(const [resumeAllowed,delivery] of [['true','not_requested'],[true,'delivery_uncertain'],[true,'sending']]){
    const app=application({initialToken:'assessment_resume_'+'a'.repeat(24),payment:'pending',delivery,resumeAllowed});await flush();
    assert.equal(app.get('status-checkout').hidden,true);app.get('resume-purchase').trigger('click');
    assert.equal(app.get('email-view').hidden,true);assert.equal(app.checkouts.length,0);
  }
});

test('a rejected delayed preview restores controls and permits a real edit',async()=>{
  const app=application();await flush();app.completeQuestions();
  const pending=app.get('create-preview').trigger('click');
  app.previews[0].resolve(response({error:{message:'The preview could not be prepared.'}},false));await pending;
  assert.equal(app.get('review-back').disabled,false);assert.equal(app.get('submit-consent').disabled,false);
  assert.equal(app.get('preview-error').hidden,false);assert.equal(app.token(),undefined);
  app.get('review-answers').children[9].querySelector('button').click();
  assert.equal(app.get('question-view').hidden,false);
});
