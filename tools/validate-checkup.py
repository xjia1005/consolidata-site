"""Static contract checks for the US$47 server-verified email-attachment product."""
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
    assert 'US$27' not in body and '5kQ00l3Vf4t0a8AaE983C0e' not in body, page.name
for name, page in pages.items():
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc: continue
        target = (SITE / (unquote(url.path) or name)).resolve()
        assert target.is_relative_to(SITE.resolve()) and target.is_file(), (name, link)
        if url.fragment and target.suffix == '.html': assert unquote(url.fragment) in pages[target.name].ids, (name, link)
home = (SITE / 'index.html').read_text(encoding='utf-8')
assert 'US$' not in home and 'data-checkup-price' not in home
assert 'Which marketing spend is worth repeating?' in home
assert 'Your next budget decision needs a clearer picture.' in home
assert 'Start assessment' in home
assert 'noindex' not in home
assert 'assessment.html' in pages['index.html'].links
structured = re.search(r'<script type="application/ld\+json">(.*?)</script>', home, re.S)
assert structured and json.loads(structured.group(1))['@type'] == 'Service'
assert 'offers' not in json.loads(structured.group(1))
config = (SITE / 'config.js').read_text(encoding='utf-8')
assert "price: 47" in config and "currency: 'USD'" in config
assert "delivery: 'email-pdf-attachment'" in config and 'paymentLink:' not in config
assessment = (SITE / 'assessment.html').read_text(encoding='utf-8')
assert 'noindex' in assessment and 'PDF attachment' in assessment
assert assessment.index('id="email-view"') < assessment.index('id="purchase-view"') < assessment.index('US$47')
assert 'US$47 one-time, plus applicable tax' in assessment
for name in ('index.html','assessment.html','faq.html','terms.html','checkout.html'):
    text=(SITE/name).read_text(encoding='utf-8')
    for action in re.finditer(r'<(button|a)\b[^>]*>(.*?)</\1>',text,re.S|re.I):
        assert not re.search(r'US\$|\b47\b', action.group(2)), (name,action.group(2))
for forbidden in ('download-text','download-json','print-report','report-strengths','report-priorities','report-summary'):
    assert forbidden not in pages['assessment.html'].ids, forbidden
engine = (SITE / 'checkup-engine.js').read_text(encoding='utf-8')
assert 'buildReport' not in engine and 'answerSummary' not in engine
assert 'Bearer ' in (SITE / 'assessment.js').read_text(encoding='utf-8')
manifest = json.loads((SITE / 'site-manifest.json').read_text(encoding='utf-8'))
assert manifest['price']['amount'] == 47 and manifest['price']['currency'] == 'USD'
assert manifest['delivery'] == 'email-pdf-attachment' and manifest['purchaseUrl'] is None
assert manifest['emailEndpoint'] == '/api/checkup/email'
assert '/api/checkup/config' in (SITE / 'llms.txt').read_text(encoding='utf-8')
for location in ET.parse(SITE/'sitemap.xml').findall('.//{*}loc'):
    url = urlsplit(location.text)
    assert url.scheme == 'https' and url.netloc == 'cdatats.com'
    assert (SITE/(url.path.lstrip('/') or 'index.html')).is_file()
assert not any(SITE.rglob('*.pem')) and not any(SITE.rglob('.env*'))
print('PASS: B assessment-first, separate work-email save and US$47 purchase review, email-only report contracts')
