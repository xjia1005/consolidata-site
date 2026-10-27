"""Dependency-free static launch checks. Run from any current working directory."""
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
            if data.get(key):
                self.links.append(data[key])

assert SITE.is_dir()
pages = {}
for page in SITE.glob('*.html'):
    body = page.read_text(encoding='utf-8')
    parser = Links()
    parser.feed(body)
    pages[page.name] = parser
    assert '<html lang="en"' in body, page.name
    assert 'viewport' in body and '<h1' in body, page.name
    assert not re.search(r'\b(?:US\$|USD\s*)27\b', body), page.name + ': stale offer price'
    assert not re.search(r'Local review|Payments are not open|Payment unavailable|US\$6,500|Free preview mode|no live checkout', body, re.I), page.name
for name, page in pages.items():
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = (SITE / (unquote(url.path) or name)).resolve()
        assert target.is_relative_to(SITE.resolve()) and target.is_file(), (name, link)
        if url.fragment and target.suffix == '.html':
            assert unquote(url.fragment) in pages[target.name].ids, (name, link)
home = (SITE / 'index.html').read_text(encoding='utf-8')
assert 'US$47' in home and 'Which marketing spend is worth repeating?' in home
assert 'noindex' not in home
config = (SITE / 'config.js').read_text(encoding='utf-8')
assert "currency: 'USD'" in config and "price: 47" in config
assert "delivery: 'shareable-browser-report'" in config
payment_url = re.search(r"paymentLink: '([^']+)'", config).group(1)
for name in ['index.html', 'faq.html', 'terms.html']:
    assert 'checkout.html' not in pages[name].links, name + ': obsolete extra-click purchase link'
    assert payment_url in pages[name].links, name + ': missing direct payment entry'
for item in ['checkout.html','assessment.html','checkup-engine.js','assessment.js','checkout.js','robots.txt','sitemap.xml','llms.txt','site-manifest.json']:
    assert (SITE / item).is_file(), item
assert 'noindex' in (SITE / 'assessment.html').read_text(encoding='utf-8')
manifest = json.loads((SITE / 'site-manifest.json').read_text(encoding='utf-8'))
assert manifest['price']['amount'] == 47 and manifest['price']['currency'] == 'USD'
assert not re.search(r'\b(?:US\$|USD\s*)27\b', (SITE / 'llms.txt').read_text(encoding='utf-8'))
assert manifest['purchaseUrl'] == payment_url
assert '/checkout.html' not in (SITE / 'sitemap.xml').read_text(encoding='utf-8')
tree = ET.parse(SITE / 'sitemap.xml')
for location in tree.findall('.//{*}loc'):
    url = urlsplit(location.text)
    assert url.scheme == 'https' and url.netloc == 'cdatats.com'
    assert (SITE / (url.path.lstrip('/') or 'index.html')).is_file()
assert not any(SITE.rglob('*.pem')) and not any(SITE.rglob('.env*'))
print('PASS: checkup pages, links, fragments, launch disclosures and discovery metadata')
