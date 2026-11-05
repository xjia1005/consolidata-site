'use strict';

const CustomerSurvey = (() => {
  const fields = [
    ['company', 'Business name'], ['website', 'Website'], ['role', 'Name and role'],
    ['offers', 'What you sell and who buys'], ['goal', 'Business goal and timeframe'],
    ['decision', 'Decision to make'], ['product', 'Product or service'], ['price', 'Price per unit'],
    ['units', 'Units sold'], ['period', 'Sales period'], ['currency', 'Currency'],
    ['product-role', 'Current view of product role'], ['unit-cost', 'Known direct cost per unit'], ['costs', 'Costs, returns or margin'],
    ['sales', 'Sales trends'], ['buyer', 'Customer situation'], ['reasons', 'Buying reasons and alternatives'],
    ['channels', 'Discovery and purchase channels'], ['times', 'Busy or quiet periods'],
    ['marketing', 'Marketing activity and results'], ['materials', 'Materials available later'],
    ['experience', 'Customer experience and support'], ['team', 'Team and external help'],
    ['constraints', 'Practical constraints']
  ];
  const clean = (value) => String(value == null ? '' : value).trim();
  const estimateRevenue = (data) => {
    const price = clean(data.price), units = clean(data.units);
    if (!price || !units || !['week', 'month', 'year'].includes(data.period) || !['USD', 'CAD'].includes(data.currency)) return null;
    const p = Number(price), u = Number(units);
    if (!Number.isFinite(p) || !Number.isFinite(u) || p < 0 || u < 0 || !Number.isInteger(u)) return null;
    const total = p * u;
    return Number.isFinite(total) ? total : null;
  };
  const summarize = (data) => {
    const insights = [], next = [];
    if (clean(data.goal)) insights.push('Your stated goal: ' + clean(data.goal));
    else insights.push('Your business goal has not yet been provided.');
    if (clean(data.product)) insights.push('First offer to discuss: ' + clean(data.product) + '. Its role and profitability still need evidence.');
    else insights.push('A product or service to discuss has not yet been selected.');
    const revenue = estimateRevenue(data);
    const money = (amount) => new Intl.NumberFormat('en-US', {style: 'currency', currency: data.currency}).format(amount);
    if (revenue !== null) {
      insights.push('Illustrative gross sales for the stated ' + data.period + ': ' + money(revenue) + ' (' + clean(data.units) + ' units × ' + clean(data.price) + ' per unit). This is not profit; discounts, taxes, refunds and costs are not included.');
      if (data.period === 'month' && Number.isFinite(revenue * 12)) insights.push('Illustrative annual run rate for this one offer: ' + money(revenue * 12) + ' if every month is identical. This is not actual annual revenue and does not account for seasonality or other products.');
    }
    else insights.push('No sales estimate: price, units, currency and the same sales period are all needed.');
    const cost = clean(data['unit-cost']), price = clean(data.price);
    if (cost && price && ['USD', 'CAD'].includes(data.currency) && Number.isFinite(Number(cost)) && Number(cost) >= 0 && Number.isFinite(Number(price)) && Number(price) > 0) {
      const remainder = Number(price) - Number(cost);
      if (Number.isFinite(remainder)) insights.push('Price less the stated direct cost per unit: ' + money(remainder) + '. This is not business profit or a complete margin; other costs, discounts, returns and taxes may apply.');
    }
    if (!clean(data.reasons)) next.push('Option A — explore why customers buy, what they compare and what evidence is available.');
    else next.push('Option A — review the buying reasons you shared and check which are supported by customer evidence.');
    if (!clean(data.channels) && !clean(data.times)) next.push('Option B — map how customers find and buy from you, including busy and quiet periods if relevant.');
    else next.push('Option B — review the channels and timing you described and identify what can be measured.');
    next.push('Discuss which option fits your goal, then agree scope and review a tailored proposal before any paid work.');
    return {insights, next, revenue};
  };
  const report = (data) => {
    const result = summarize(data);
    return [
      'CONSOLIDATA CUSTOMER SURVEY — CS-2026-11-04-V6',
      'Prepared by the person completing the survey.', '',
      ...fields.map(([key, label]) => label + ': ' + (clean(data[key]) || 'Not provided')),
      '', 'DISCUSSION POINTS', ...result.insights.map((x) => '- ' + x), '',
      'SUGGESTED NEXT STEPS', ...result.next.map((x, i) => (i + 1) + '. ' + x), '',
      'These prompts use only the supplied answers; they are not a diagnosis or a guarantee.'
    ].join('\n');
  };
  const questionGroups = [['company', 'website'], ...fields.slice(2).map(([key]) => [key])];
  return {fields, questionGroups, estimateRevenue, summarize, report};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CustomerSurvey;

if (typeof document !== 'undefined') {
  const form = document.getElementById('customer-survey');
  const result = document.getElementById('survey-result');
  if (form && result) {
    let text = '';
    const summary = document.getElementById('survey-summary');
    const shareStatus = document.getElementById('share-status');
    const cloudSetup = document.getElementById('survey-cloud-setup');
    const cloudMessage = document.getElementById('survey-cloud-message');
    const cloudConsent = document.getElementById('survey-cloud-consent');
    const invite = new URLSearchParams(window.location.hash.slice(1)).get('invite');
    let cloudSession = null;
    let cloudReady = false;
    const purposes = {
      company: 'To prepare for a conversation about the right business.',
      website: 'To review your public products and information before we meet.',
      role: 'To understand your role in the decisions we discuss.',
      offers: 'To understand the products or services you sell and the people who buy them.',
      goal: 'To focus our conversation on the business result and timeframe that matter to you.',
      decision: 'To identify the specific decision you want to make next.',
      product: 'To choose one offer as a useful starting point for the discussion.',
      price: 'To understand this offer’s pricing and, with a matching sales quantity and period, estimate gross sales.',
      units: 'To estimate gross sales for this offer when a matching price, currency and period are available.',
      period: 'To keep sales figures tied to the correct week, month or year.',
      currency: 'To use the correct currency when discussing prices and costs.',
      'product-role': 'To understand how you currently use this offer in your business; its role still needs evidence.',
      'unit-cost': 'To compare the stated price with known direct cost; this alone does not calculate company profit.',
      costs: 'To identify other expenses, discounts, returns or margins that affect the economics.',
      sales: 'To understand the longer-term sales context and possible seasonal changes.',
      buyer: 'To understand who buys, uses and pays, and what they want to achieve.',
      reasons: 'To identify the reasons customers give for buying, waiting or choosing an alternative.',
      channels: 'To see how customers discover you and how they complete a purchase.',
      times: 'To identify busy or quiet periods that may matter to a restaurant or local business.',
      marketing: 'To understand what you have already tried and what results are available.',
      materials: 'To identify existing evidence we could review later with your permission.',
      experience: 'To find questions or difficulties across buying, using and getting support.',
      team: 'To understand the work your existing team handles and where outside help could be useful.',
      constraints: 'To make a future proposal practical for your timeline, people and budget.'
    };
    const originalSections = Array.from(form.querySelectorAll('fieldset'));
    const reviewButton = form.querySelector('button[type="submit"]');
    const wizard = document.createElement('div');
    wizard.className = 'survey-wizard';
    const progressArea = document.createElement('div');
    progressArea.className = 'survey-progress';
    const progressText = document.createElement('p');
    progressText.className = 'survey-progress-text';
    progressText.setAttribute('aria-live', 'polite');
    const progress = document.createElement('progress');
    progress.max = CustomerSurvey.questionGroups.length;
    progress.setAttribute('aria-label', 'Question progress');
    progressArea.append(progressText, progress);
    const panels = CustomerSurvey.questionGroups.map((keys, index) => {
      const panel = document.createElement('section');
      panel.className = 'survey-question';
      panel.tabIndex = -1;
      panel.setAttribute('aria-labelledby', 'question-label-' + index);
      if (keys.length > 1) {
        const heading = document.createElement('h2');
        heading.id = 'question-label-' + index;
        heading.textContent = 'Your business';
        panel.classList.add('survey-question-group');
        panel.append(heading);
      }
      keys.forEach((key) => {
        const input = form.elements.namedItem(key);
        const label = form.querySelector('label[for="' + key + '"]');
        if (!input || !label || !purposes[key]) throw new Error('Incomplete survey question: ' + key);
        const note = input.nextElementSibling && input.nextElementSibling.tagName === 'SMALL' ? input.nextElementSibling : null;
        if (keys.length === 1) label.id = 'question-label-' + index;
        const purpose = document.createElement('p');
        purpose.className = 'why';
        purpose.id = 'question-purpose-' + key;
        purpose.textContent = 'Why we ask: ' + purposes[key];
        input.setAttribute('aria-describedby', purpose.id);
        panel.append(label, purpose, input);
        if (note) panel.append(note);
      });
      return panel;
    });
    originalSections.forEach((section) => section.remove());
    const navigation = document.createElement('div');
    navigation.className = 'survey-navigation';
    const back = document.createElement('button');
    back.type = 'button'; back.textContent = 'Back'; back.className = 'button survey-secondary';
    const skip = document.createElement('button');
    skip.type = 'button'; skip.textContent = 'Skip for now'; skip.className = 'survey-skip';
    const next = document.createElement('button');
    next.type = 'button'; next.textContent = 'Next question →'; next.className = 'button button-primary';
    navigation.append(back, skip, next, reviewButton);
    wizard.append(progressArea, ...panels, navigation);
    form.insertBefore(wizard, document.getElementById('survey-status'));
    let current = 0;
    const showQuestion = (index, focus = true) => {
      current = Math.max(0, Math.min(index, panels.length - 1));
      panels.forEach((panel, i) => { panel.hidden = i !== current; });
      progress.value = current + 1;
      progressText.textContent = 'Question ' + (current + 1) + ' of ' + panels.length;
      back.hidden = current === 0;
      next.hidden = current === panels.length - 1;
      skip.hidden = current === panels.length - 1;
      reviewButton.hidden = current !== panels.length - 1;
      result.hidden = true;
      if (focus) {
        panels[current].focus({preventScroll: true});
        progressArea.scrollIntoView({block: 'start'});
      }
    };
    showQuestion(0, false);
    const value = (name) => {
      const input = form.elements.namedItem(name);
      return input && typeof input.value === 'string' ? input.value.trim() : '';
    };
    const collect = () => Object.fromEntries(CustomerSurvey.fields.map(([key]) => [key, value(key)]));
    const setBusy = (busy) => navigation.querySelectorAll('button').forEach((button) => { button.disabled = busy; });
    const saveCurrent = async () => {
      if (!cloudReady) return false;
      setBusy(true);
      try {
        await cloudSession.save(collect());
        cloudMessage.textContent = 'Your answers are saved to your private survey.';
        return true;
      } catch (_) {
        cloudMessage.textContent = 'Answers could not be confirmed as saved. Stay on this page and try again; contact us if the problem continues.';
        return false;
      } finally { setBusy(false); }
    };
    back.addEventListener('click', async () => { if (await saveCurrent()) showQuestion(current - 1); });
    next.addEventListener('click', async () => { if (await saveCurrent()) showQuestion(current + 1); });
    skip.addEventListener('click', async () => { if (await saveCurrent()) showQuestion(current + 1); });
    const fill = (target, items) => {
      target.replaceChildren();
      items.forEach((item) => {
        const node = document.createElement(target.tagName === 'OL' ? 'li' : 'p');
        node.textContent = item;
        target.append(node);
      });
    };
    form.addEventListener('input', () => { result.hidden = true; });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (current < panels.length - 1) { showQuestion(current + 1); return; }
      if (!await saveCurrent()) return;
      setBusy(true);
      try {
        const confirmation = await cloudSession.submit();
        if (confirmation.status !== 'submitted') throw new Error('not_submitted');
      } catch (_) {
        cloudMessage.textContent = 'Your submission could not be confirmed. Your answers remain on this page; please try again.';
        setBusy(false);
        return;
      }
      setBusy(false);
      const data = collect(), evaluation = CustomerSurvey.summarize(data);
      fill(document.getElementById('survey-insights'), evaluation.insights);
      fill(document.getElementById('survey-next'), evaluation.next);
      text = CustomerSurvey.report(data);
      summary.textContent = text;
      shareStatus.textContent = 'Your survey was submitted and saved. We can review it before your conversation.';
      result.hidden = false;
      result.focus();
    });
    document.getElementById('copy-summary').addEventListener('click', async () => {
      try {
        if (!navigator.clipboard) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
        shareStatus.textContent = 'Copied. Your submitted survey remains saved.';
      } catch (_) {
        shareStatus.textContent = 'Copy is unavailable here. Select the answers above and copy them, or download the file.';
        summary.focus();
      }
    });
    document.getElementById('download-summary').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url; link.download = 'customer-survey-CS-2026-11-04-v6.txt';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      shareStatus.textContent = 'Download started. Your submitted survey remains saved.';
    });
    const enableCloud = () => {
      cloudReady = true;
      cloudConsent.hidden = true;
      cloudMessage.textContent = 'Your private survey is connected. Answers are saved when you move between questions.';
      document.getElementById('survey-storage-description').textContent = 'Your private survey answers are stored in ConsoliData’s AWS account for the consultation. Keep your private link confidential. Do not include passwords, payment details or customer contact lists.';
      form.inert = false;
      showQuestion(current, false);
    };
    cloudSetup.hidden = false;
    form.inert = true;
    if (invite) {
      try {
        cloudSession = new SurveySession(invite, window.fetch.bind(window));
        cloudSession.open().then((record) => {
          CustomerSurvey.fields.forEach(([key]) => {
            const input = form.elements.namedItem(key);
            if (input && typeof record.answers[key] === 'string') input.value = record.answers[key];
          });
          if (record.consent_version === 'survey-storage-v2') enableCloud();
          else {
            cloudMessage.textContent = 'Please review how this private survey is stored.';
            cloudConsent.hidden = false;
          }
        }).catch(() => { cloudMessage.textContent = 'This private survey could not be opened. Check your link or contact us; no answers were saved.'; });
      } catch (_) { cloudMessage.textContent = 'This private survey link is invalid. Contact us for a new link.'; }
      document.getElementById('survey-consent-button').addEventListener('click', async () => {
        if (!document.getElementById('survey-storage-consent').checked) {
          cloudMessage.textContent = 'Please agree to storage and processing before continuing, or contact us to discuss another way.';
          return;
        }
        try { await cloudSession.agreeToStorage(); enableCloud(); }
        catch (_) { cloudMessage.textContent = 'Your agreement could not be saved. Please try again.'; }
      });
    } else {
      cloudMessage.textContent = 'This survey needs a private invitation. If you have booked a conversation, contact us for your personal link.';
    }
  }
}
