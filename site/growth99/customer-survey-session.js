'use strict';

/* Capability-scoped cloud session. Not wired to a public route until the
   customer/owner authentication and data-handling review has passed. */
class SurveySession {
  constructor(token, fetcher) {
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(token || '') || typeof fetcher !== 'function') throw new Error('invalid_invitation');
    this.token = token;
    this.fetcher = fetcher;
    this.revision = null;
    this.busy = false;
  }
  async call(path, options = {}) {
    const response = await this.fetcher('/studio/customer-surveys/public/' + path, {
      ...options,
      headers: {...(options.headers || {}), Authorization: 'Bearer ' + this.token},
      credentials: 'same-origin', cache: 'no-store', redirect: 'error'
    });
    let data;
    try { data = await response.json(); } catch (_) { throw new Error('invalid_server_response'); }
    if (!response.ok) throw new Error(data.error || 'survey_request_failed');
    return data;
  }
  async open() {
    const record = await this.call('survey');
    if (!Number.isInteger(record.revision) || !record.answers || typeof record.answers !== 'object') throw new Error('invalid_server_response');
    this.revision = record.revision;
    return record;
  }
  async agreeToStorage() {
    return this.call('consent', {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({version:'survey-storage-v2'})});
  }
  async submit() {
    if (this.revision === null) throw new Error('open_session_first');
    try {
      return await this.call('submit', {method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({revision:this.revision})});
    } catch (error) {
      try {
        const latest = await this.call('survey');
        if (latest.revision === this.revision && latest.submitted_revision === this.revision && latest.export_revision === this.revision && latest.export_valid === true)
          return {status:'submitted', revision:this.revision, reconciled:true};
      } catch (_) { /* preserve original failure */ }
      throw error;
    }
  }
  async save(answers) {
    if (this.revision === null) throw new Error('open_session_first');
    if (this.busy) throw new Error('save_in_progress');
    this.busy = true;
    try {
      try {
        const result = await this.call('answers', {method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({answers, revision: this.revision})});
        if (result.revision !== this.revision && result.revision !== this.revision + 1) throw new Error('invalid_server_response');
        this.revision = result.revision;
        return result;
      } catch (error) {
        // A response can be lost after the write. Reconcile without overwriting.
        try {
          const latest = await this.call('survey');
          const normalize = (value) => JSON.stringify(Object.keys(value).sort().map((key) => [key, value[key]]));
          if ((latest.revision === this.revision || latest.revision === this.revision + 1) && normalize(latest.answers) === normalize(answers)) {
            this.revision = latest.revision;
            return {revision: latest.revision, reconciled: true};
          }
        } catch (_) { /* preserve the original failure */ }
        throw error;
      }
    } finally { this.busy = false; }
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = {SurveySession};
