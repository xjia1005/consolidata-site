(() => {
  'use strict';

  const config = window.CONSOLIDATA_CHECKUP;
  if (config && Number.isFinite(config.price) && config.price > 0 && config.currency === 'USD') {
    const label = 'US$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(config.price);
    document.querySelectorAll('[data-checkup-price]').forEach((node) => {
      node.textContent = label;
    });
  }

  const fieldset = document.querySelector('[data-sample-fields]');
  const result = document.querySelector('[data-sample-result]');
  const status = document.querySelector('[data-sample-status]');
  if (!(fieldset instanceof HTMLFieldSetElement) || !(result instanceof HTMLElement)) return;

  const target = {
    title: result.querySelector('[data-sample-title]'),
    current: result.querySelector('[data-sample-current]'),
    ideal: result.querySelector('[data-sample-ideal]'),
    action: result.querySelector('[data-sample-action]')
  };
  if (Object.values(target).some((node) => !(node instanceof HTMLElement))) return;

  const interpretations = Object.freeze({
    features: {
      title: 'Turn one feature into a buying-reason hypothesis.',
      current: 'Your selection describes a message centered on what the product does. It leaves the buyer\'s situation and reason to act open for review.',
      ideal: 'The buyer can recognize a real situation and understand why the feature matters in that situation.',
      action: 'Choose one feature. Add who needs it, when they need it and the result they care about. Check the wording against a real customer conversation.'
    },
    reasons: {
      title: 'Keep the buying reason and check its evidence.',
      current: 'You say your message names a buyer, a situation and a reason to act. That is a useful starting point; this answer alone does not confirm demand.',
      ideal: 'Recent customer words or behavior support the reason, with a record of what happened after the message.',
      action: 'Choose one buying reason and trace it through a message, the purchase path and an order record before deciding what to repeat.'
    },
    mixed: {
      title: 'Separate supported reasons from working assumptions.',
      current: 'Your selection describes a connection between product features and buying reasons. The supporting customer evidence still needs to be checked.',
      ideal: 'One clear buying reason has a visible source, and any assumptions stay labelled for review.',
      action: 'Take one current message. Mark its feature, proposed buying reason and supporting customer evidence. Keep an open question wherever the evidence is missing.'
    },
    unknown: {
      title: 'Use one recent purchase to make the question concrete.',
      current: 'You have marked the message as unknown. This keeps the uncertainty visible and does not establish that your message is weak.',
      ideal: 'You can describe why one actual customer chose the offer, while keeping their words separate from your interpretation.',
      action: 'Review one recent purchase or customer conversation. Write down the situation, the reason given and the source, then compare it with the current message.'
    }
  });

  fieldset.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.name !== 'sample-message') return;
    const interpretation = interpretations[event.target.value];
    if (!interpretation) return;
    fieldset.querySelectorAll('.sample-choice').forEach((label) => {
      const input = label.querySelector('input');
      label.classList.toggle('is-selected', Boolean(input && input.checked));
    });
    target.title.textContent = interpretation.title;
    target.current.textContent = interpretation.current;
    target.ideal.textContent = interpretation.ideal;
    target.action.textContent = interpretation.action;
    result.hidden = false;
    if (status instanceof HTMLElement) status.hidden = true;
  });

  fieldset.disabled = false;
  if (status instanceof HTMLElement) status.textContent = 'Choose an answer to see the example interpretation. Your selection stays on this page and is not saved.';
})();
