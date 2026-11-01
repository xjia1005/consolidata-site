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
for page in SITE.glob('*.html'):
    body = page.read_text(encoding='utf-8')
    parser = Links(); parser.feed(body); pages[page.name] = parser
    assert '<html lang="en"' in body and 'viewport' in body and '<h1' in body, page.name
    assert not re.search(r'US\$(?:27|47)\b', body), page.name
    assert '5kQ00l3Vf4t0a8AaE983C0e' not in body, page.name
    for asset in re.findall(r'(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"', body):
        url = urlsplit(asset)
        if not url.scheme and not url.netloc:
            assert url.query == 'v=20261101-growth99', (page.name, asset)
for name, page in pages.items():
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc: continue
        target = (SITE / (unquote(url.path) or name)).resolve()
        assert target.is_relative_to(SITE.resolve()) and target.is_file(), (name, link)
        if url.fragment and target.suffix == '.html': assert unquote(url.fragment) in pages[target.name].ids, (name, link)
home = (SITE / 'index.html').read_text(encoding='utf-8')
assert 'US$99' in home[home.index('<body'):]
assert 'What is holding growth back?' in home
assert '30 questions' in home and 'VENTURE-BACKED STARTUP LEADERS' in home
assert 'data-purchase-availability' in home
assert 'Start assessment' in home
assert 'noindex' not in home
assert 'assessment.html' in pages['index.html'].links
structured = re.search(r'<script type="application/ld\+json">(.*?)</script>', home, re.S)
assert structured and json.loads(structured.group(1))['@type'] == 'Service'
offer = json.loads(structured.group(1))['offers']
assert str(offer['price']) == '99' and offer['priceCurrency'] == 'USD'
assert offer['url'] == 'https://cdatats.com/assessment.html'
config = (SITE / 'config.js').read_text(encoding='utf-8')
assert "price: 99" in config and "currency: 'USD'" in config
assert "delivery: 'email-pdf-attachment'" in config and 'paymentLink:' not in config
assessment = (SITE / 'assessment.html').read_text(encoding='utf-8')
assert 'noindex' in assessment and 'document attached to email' in assessment
assert assessment.index('id="email-view"') < assessment.index('id="purchase-view"')
assert 'US$99 one-time, plus applicable tax' in assessment[assessment.index('id="purchase-view"'):]
assert 'max="30"' in assessment and 'id="question-answer"' in assessment
for action in re.finditer(r'<a\b([^>]*)>(.*?)</a>', home, re.S | re.I):
    if re.search(r'class="[^"]*button-primary', action.group(1)):
        assert 'href="assessment.html"' in action.group(1), action.group(2)
for forbidden in ('download-text','download-json','print-report','report-strengths','report-priorities','report-summary'):
    assert forbidden not in pages['assessment.html'].ids, forbidden
engine = (SITE / 'checkup-engine.js').read_text(encoding='utf-8')
assert 'buildReport' not in engine and 'answerSummary' not in engine
assert 'Bearer ' in (SITE / 'assessment.js').read_text(encoding='utf-8')
manifest = json.loads((SITE / 'site-manifest.json').read_text(encoding='utf-8'))
assert manifest['price']['amount'] == 99 and manifest['price']['currency'] == 'USD'
assert manifest['questionCount'] == 30
assert manifest['delivery'] == 'email-pdf-attachment' and manifest['purchaseUrl'] is None
assert manifest['emailEndpoint'] == '/api/checkup/email'
assert '/api/checkup/config' in (SITE / 'llms.txt').read_text(encoding='utf-8')
bank = json.loads((ROOT / 'backend/questions.json').read_text(encoding='utf-8'))
public_source = (SITE / 'assessment-bank.js').read_text(encoding='utf-8')
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
code_map = json.loads((ROOT / 'system_registry/codecraft/codebase-map.json').read_text(encoding='utf-8'))
assert code_map['version'] == 5 and code_map['price']['amount'] == 99
assert code_map['questionCount'] == 30
node_ids = {node['id'] for node in code_map['nodes']}
assert len(node_ids) == len(code_map['nodes'])
for node in code_map['nodes']:
    assert set(node['dependsOn']).issubset(node_ids), node['id']
    assert all((ROOT / filename).is_file() for filename in node['files']), node['id']
for location in ET.parse(SITE/'sitemap.xml').findall('.//{*}loc'):
    url = urlsplit(location.text)
    assert url.scheme == 'https' and url.netloc == 'cdatats.com'
    assert (SITE/(url.path.lstrip('/') or 'index.html')).is_file()
assert not any(SITE.rglob('*.pem')) and not any(SITE.rglob('.env*'))
print('PASS:99USD/30-question source, links, cache identities, private-report boundaries, bank parity and capability map; provider readiness not established')
