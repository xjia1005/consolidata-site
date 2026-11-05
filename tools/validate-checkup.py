"""Static contracts for the US$99/30-question private-report candidate.

These checks validate source coherence, not payment or delivery readiness.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
ASSETS = SITE / 'growth99'
ASSET_QUERY = 'v=20261103-brand-live99'

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if 'id' in data:
            assert data['id'] not in self.ids, 'Duplicate ID: ' + data['id']
            self.ids.add(data['id'])
        for key in ('src', 'href'):
            if data.get(key): self.links.append(data[key])

pages = {}
for page in SITE.rglob('*.html'):
    body = page.read_text(encoding='utf-8')
    parser = Links(); parser.feed(body); pages[str(page.relative_to(SITE)).replace('\\','/')] = parser
    legacy = page.name == 'assessment.html' or 'legacy47' in page.parts
    assert '<html lang="en"' in body and 'viewport' in body and '<h1' in body, page.name
    assert legacy or not re.search(r'US\$(?:27|47)\b', body), page.name
    assert '5kQ00l3Vf4t0a8AaE983C0e' not in body, page.name
    for asset in re.findall(r'(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"', body):
        url = urlsplit(asset)
        if not url.scheme and not url.netloc and not legacy:
            survey_asset = page.name == 'customer-survey.html' and (url.path, url.query) in (('growth99/customer-survey.css', 'v=5'), ('growth99/customer-survey.js', 'v=8'), ('growth99/customer-survey-session.js', 'v=2'), ('growth99/customer-survey-recording.js', 'v=1'))
            assert url.path.startswith('growth99/') and (url.query == ASSET_QUERY or (url.path == 'growth99/outcome-home.css' and url.query == 'v=20261104-1') or (url.path == 'growth99/brand-readable.css' and url.query == 'v=20261104-brand-v3') or survey_asset), (page.name, asset)
for name, page in pages.items():
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc: continue
        target = ((SITE / url.path.lstrip('/')) if url.path.startswith('/') else (SITE / name).parent / (unquote(url.path) or Path(name).name)).resolve()
        assert target.is_relative_to(SITE.resolve()) and target.is_file(), (name, link)
        if url.fragment and target.suffix == '.html': assert unquote(url.fragment) in pages[str(target.relative_to(SITE.resolve())).replace('\\','/')].ids, (name, link)
home = (SITE / 'index.html').read_text(encoding='utf-8')
assert 'a compelling reason to pay' in home
assert 'noindex' not in home
assert 'growth-assessment.html' in pages['index.html'].links
assert 'book.html' in pages['index.html'].links
assert 'VENTURE-BACKED STARTUP LEADERS' not in home
config = (ASSETS / 'config.js').read_text(encoding='utf-8')
assert "price: 99" in config and "currency: 'USD'" in config
assert "delivery: 'email-pdf-attachment'" in config and 'paymentLink:' not in config
assessment = (SITE / 'growth-assessment.html').read_text(encoding='utf-8')
assert 'noindex' in assessment and 'document attached to email' in assessment
assert assessment.index('id="email-view"') < assessment.index('id="purchase-view"')
assert 'US$99 one-time, plus applicable tax' in assessment[assessment.index('id="purchase-view"'):]
assert 'max="30"' in assessment and 'id="question-answer"' in assessment
for action in re.finditer(r'<a\b([^>]*)>(.*?)</a>', home, re.S | re.I):
    if re.search(r'class="[^"]*button-primary', action.group(1)):
        assert 'href="book.html"' in action.group(1), action.group(2)
for forbidden in ('download-text','download-json','print-report','report-strengths','report-priorities','report-summary'):
    assert forbidden not in pages['growth-assessment.html'].ids, forbidden
engine = (ASSETS / 'checkup-engine.js').read_text(encoding='utf-8')
assert 'buildReport' not in engine and 'answerSummary' not in engine
assert 'Bearer ' in (ASSETS / 'assessment.js').read_text(encoding='utf-8')
manifest = json.loads((SITE / 'site-manifest.json').read_text(encoding='utf-8'))
assert manifest['price']['amount'] == 99 and manifest['price']['currency'] == 'USD'
assert manifest['questionCount'] == 30
assert manifest['delivery'] == 'email-pdf-attachment' and manifest['purchaseUrl'] is None
assert manifest['emailEndpoint'] == '/api/checkup/email'
assert '/api/checkup/config' in (SITE / 'llms.txt').read_text(encoding='utf-8')
for filename in ('faq.html', 'llms.txt', 'site-manifest.json'):
    disclosure = (SITE / filename).read_text(encoding='utf-8')
    for required in ('OpenAI or Anthropic', '30 answers and optional notes', 'verified payment', 'delivery email'):
        assert required.casefold() in disclosure.casefold(), (filename, required)
    assert not re.search(r'No external artificial intelligence|not independently verified or interpreted by an external artificial intelligence|no independent business audit, external artificial intelligence analysis', disclosure, re.I), filename
assert 'copies cited quotations directly from saved answers and notes' in manifest['method']
assert 'not a causal diagnosis' in ' '.join(manifest['limitations'])
bank = json.loads((ROOT / 'backend/questions.json').read_text(encoding='utf-8'))
public_source = (ASSETS / 'assessment-bank.js').read_text(encoding='utf-8')
public_match = re.search(r'function\(\)\{return (\{.*\});\}\);', public_source, re.S)
assert public_match, 'Public bank wrapper missing'
public_bank = json.loads(public_match.group(1))
public_fields = {'schema_version', 'core_question_ids', 'questions', 'branches', 'value_dimensions'}
assert set(public_bank) == public_fields
assert public_bank == {key: bank[key] for key in public_fields}
ids = [question['id'] for question in bank['questions']]
assert len(ids) == len(set(ids)) == 30 and len(bank['core_question_ids']) == 6
assert len(bank['branches']) == 6 and all(len(branch['question_ids']) == 4 for branch in bank['branches'].values())
assert all(question['answer_type'] in {'text', 'multi_select'} for question in bank['questions'])
assert set(bank['value_dimensions']) == {'outcome', 'likelihood', 'delay', 'effort'}
assert assessment.index('assessment-bank.js') < assessment.index('checkup-engine.js') < assessment.index('assessment.js')
for location in ET.parse(SITE/'sitemap.xml').findall('.//{*}loc'):
    url = urlsplit(location.text)
    assert url.scheme == 'https' and url.netloc == 'cdatats.com'
    assert (SITE/(url.path.lstrip('/') or 'index.html')).is_file()
assert not any(SITE.rglob('*.pem')) and not any(SITE.rglob('.env*'))
print('PASS:99USD/30-question source, links, cache identities, private-report boundaries, and bank parity; provider readiness not established')
