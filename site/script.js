const menuButton = document.querySelector('[data-menu-button]');
const menu = document.querySelector('[data-menu]');

if (menuButton && menu) {
  const menuLabel = menuButton.querySelector('.sr-only');
  const setMenuOpen = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    if (menuLabel) menuLabel.textContent = open ? 'Close navigation' : 'Open navigation';
  };

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    setMenuOpen(!open);
  });

  menu.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      setMenuOpen(false);
    }
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

const builder = document.querySelector('[data-fit-builder]');
const prepareButton = document.querySelector('[data-prepare-request]');
const result = document.querySelector('[data-form-result]');

if (builder instanceof HTMLElement && prepareButton instanceof HTMLButtonElement && result instanceof HTMLElement) {
  prepareButton.addEventListener('click', () => {
    const fields = Array.from(builder.querySelectorAll('[data-fit-field]'));
    const invalidField = fields.find((field) =>
      (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && !field.checkValidity()
    );
    if (invalidField instanceof HTMLInputElement || invalidField instanceof HTMLTextAreaElement) {
      invalidField.reportValidity();
      return;
    }

    const valueOf = (fieldName) => {
      const field = builder.querySelector(`[data-fit-field="${fieldName}"]`);
      return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.value.trim() : '';
    };
    const request = [
      'CONSOLIDATA BUYER-PATH FIT REVIEW',
      '',
      `Name: ${valueOf('name')}`,
      `Work email: ${valueOf('email')}`,
      `Company: ${valueOf('company')}`,
      `Product page: ${valueOf('product_url')}`,
      '',
      'Buyer decision to understand:',
      valueOf('question'),
    ].join('\n');

    result.hidden = false;
    result.innerHTML = '';

    const title = document.createElement('strong');
    title.textContent = 'Your request is ready to review.';
    const note = document.createElement('p');
    note.textContent = 'This local preview has not transmitted or stored your information. Copy the request for review; secure submission will be enabled before launch.';
    const pre = document.createElement('pre');
    pre.textContent = request;
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy request';
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(request);
        copyButton.textContent = 'Copied';
      } catch {
        copyButton.textContent = 'Select and copy the text above';
      }
    });

    result.append(title, note, pre, copyButton);
    result.focus();
  });
}
