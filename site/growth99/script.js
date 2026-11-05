const menuButton = document.querySelector('[data-menu-button]');
const menu = document.querySelector('[data-menu]');
if (menuButton && menu) {
  const menuLabel = menuButton.querySelector('.sr-only');
  const setMenuOpen = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    if (menuLabel) menuLabel.textContent = open ? 'Close navigation' : 'Open navigation';
  };
  menuButton.addEventListener('click', () => setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      menuButton.focus();
    }
  });
}
document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

const callForm = document.querySelector('[data-call-request]');
const callResult = document.querySelector('[data-call-result]');
if (callForm instanceof HTMLFormElement && callResult instanceof HTMLElement) {
  const clearResult = () => {
    callResult.hidden = true;
    callResult.replaceChildren();
  };
  callForm.addEventListener('input', clearResult);
  callForm.addEventListener('reset', clearResult);
  callForm.addEventListener('submit', (event) => {
    event.preventDefault();
    for (const field of callForm.querySelectorAll('input[required], textarea[required]')) {
      field.setCustomValidity(field.value.trim() ? '' : 'Please enter this detail.');
    }
    if (!callForm.reportValidity()) return;
    const value = (name) => {
      const field = callForm.elements.namedItem(name);
      return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.value.trim() : '';
    };
    const request = [
      'CONSOLIDATA — 20-minute sales-workflow call request',
      '',
      'Name: ' + value('name'),
      'Company: ' + value('company'),
      'Work email: ' + value('email'),
      'Phone (optional): ' + value('phone'),
      'WeChat (optional): ' + value('wechat'),
      'Public page (optional): ' + value('page'),
      '',
      'Sales question:',
      value('question'),
      '',
      'Preferred times and time zone: ' + value('times'),
      '',
      'Please reply to agree a meeting time.'
    ].join('\n');
    clearResult();
    const heading = document.createElement('strong');
    heading.textContent = 'Your request is prepared. Nothing has been sent.';
    const note = document.createElement('p');
    note.textContent = 'Review the text below. Copy it or open your email app and send it yourself. A meeting time still needs personal confirmation.';
    const preview = document.createElement('pre');
    preview.textContent = request;
    preview.tabIndex = 0;
    preview.setAttribute('aria-label', 'Prepared call request');
    const actions = document.createElement('div');
    actions.className = 'request-actions';
    const email = document.createElement('a');
    email.className = 'button button-primary';
    email.textContent = 'Open email draft';
    email.href = 'mailto:alvinj@consolidatats.com?subject=' + encodeURIComponent('20-minute sales-workflow call request') + '&body=' + encodeURIComponent(request);
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'button button-quiet';
    copy.textContent = 'Copy request';
    copy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(request);
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'Select and copy the text above';
        preview.focus();
      }
    });
    actions.append(email, copy);
    callResult.append(heading, note, preview, actions);
    callResult.hidden = false;
    callResult.focus();
  });
  callForm.addEventListener('input', (event) => {
    const field = event.target;
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.setCustomValidity('');
  });
  // Fail closed: enable inputs only after both submit and change handlers exist.
  const fields = callForm.querySelector('[data-call-fields]');
  if (fields instanceof HTMLFieldSetElement) {
    fields.disabled = false;
    const status = callForm.querySelector('[data-request-status]');
    if (status instanceof HTMLElement) status.hidden = true;
  }
}
