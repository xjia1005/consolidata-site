(() => {
  'use strict';
  const config = window.CONSOLIDATA_CHECKUP;
  if (config && config.price === 99 && config.currency === 'USD') {
    document.querySelectorAll('[data-checkup-price]').forEach(node => { node.textContent = 'US$99'; });
  }
  const availability = document.querySelectorAll('[data-purchase-availability]');
  const showAvailability = text => { availability.forEach(node => { node.textContent = text; }); };
  const unavailable = 'Report purchase is currently unavailable. You can review the assessment without paying.';
  if (availability.length) {
    if (typeof fetch !== 'function') showAvailability(unavailable);
    else {
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timeout = controller ? setTimeout(() => controller.abort(), 8000) : null;
      fetch('/api/checkup/config', {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},...(controller ? {signal:controller.signal} : {})})
        .then(response => { if (!response.ok) throw new Error('unavailable'); return response.json(); })
        .then(value => {
          const ready = value.price === 99 && value.currency === 'USD' && value.delivery === 'email-pdf-attachment' && value.purchase_enabled === true;
          showAvailability(ready ? 'Report purchase is available after you review your answers and confirm your work email.' : unavailable);
        })
        .catch(() => showAvailability(unavailable))
        .finally(() => { if (timeout !== null) clearTimeout(timeout); });
    }
  }
  const fieldset = document.querySelector('[data-sample-fields]');
  const result = document.querySelector('[data-sample-result]');
  const status = document.querySelector('[data-sample-status]');
  if (!(fieldset instanceof HTMLFieldSetElement) || !(result instanceof HTMLElement)) return;
  const target = {
    title:result.querySelector('[data-sample-title]'),current:result.querySelector('[data-sample-current]'),
    ideal:result.querySelector('[data-sample-ideal]'),action:result.querySelector('[data-sample-action]')
  };
  if (Object.values(target).some(node => !(node instanceof HTMLElement))) return;
  const interpretations = Object.freeze({
    reach: {
      title:'Check how suitable customers encounter you.',
      current:'You selected a possible shortfall in suitable customer exposure. The cause remains open.',
      ideal:'A defined customer group, its actual search or work setting, one campaign and the actions that followed.',
      action:'Review one permitted campaign with its intended audience and exposure evidence. Ask suitable customers where they actually looked for help.'
    },
    first_value: {
      title:'Observe a real first task.',
      current:'You selected difficulty completing a useful first task after starting. Setup, product fit, missing inputs and delivery may each matter.',
      ideal:'The steps, waiting, help and rework required from preparation to the first useful result.',
      action:'Observe a permitted task and compare a successful and a stalled case. Identify what observation would support or weaken each explanation.'
    },
    purchase: {
      title:'Review the actual purchase decision.',
      current:'You selected interest that does not become a purchase. The people involved, value, credibility, timing and transition effort remain questions.',
      ideal:'Permitted accounts of completed, postponed and declined purchases, including who decided and what they compared.',
      action:'Map the buying participants and review one completed and one postponed decision before choosing a change to the package or purchase path.'
    },
    unknown: {
      title:'Define what evidence would help first.',
      current:'You selected uncertainty about where the shortfall occurs. That is useful information for the next review.',
      ideal:'A consistent customer group, observation period, comparison and definition of a useful action.',
      action:'Choose one decision and the smallest permitted record or customer observation that could change it. Preserve the unknowns until you have that evidence.'
    }
  });
  fieldset.addEventListener('change', event => {
    if (!(event.target instanceof HTMLInputElement) || event.target.name !== 'sample-message') return;
    const selected = interpretations[event.target.value];
    if (!selected) return;
    fieldset.querySelectorAll('.sample-choice').forEach(label => {
      const input = label.querySelector('input');
      label.classList.toggle('is-selected', Boolean(input && input.checked));
    });
    for (const key of Object.keys(target)) target[key].textContent = selected[key];
    result.hidden = false;
    if (status instanceof HTMLElement) status.hidden = true;
  });
  fieldset.disabled = false;
  if (status instanceof HTMLElement) status.textContent = 'Choose an example to see a possible evidence check. Your selection stays on this page and is not saved.';
})();
