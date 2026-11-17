"""Homepage-only impact/scope check against the independently verified live baseline."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import hashlib,io,json,subprocess,tarfile

ROOT=Path(__file__).resolve().parents[1]
BASE='004af2cabcd3bc15b6341fc65a449bd577733c26'
ASSET='site/assets/proposal-feedback-medical-devices-20261116.webp'
ALLOWED={'site/index.html',ASSET,'tools/verify-homepage-proposal-loop.py','docs/tasks/2026-11-16-homepage-proposal-loop.md'}
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
class Page(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.links=[];self.images=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag in ('a','link','script','img'):
            for k in ('href','src'):
                if a.get(k):self.links.append({'tag':tag,'url':a[k]})
        if tag=='img':self.images.append(a)
home=(ROOT/'site/index.html').read_text(encoding='utf-8');page=Page();page.feed(home)
assert len(page.ids)==len(set(page.ids))
assert 'CurvaFix' not in home
for text in ['one feedback system','Clinical review','Nursing &amp; staff training','Procurement','Logistics &amp; implementation','company-owned','actual purchases','contract renewal where applicable']:
    assert text in home,text
for link in page.links:
    u=urlsplit(link['url'])
    if u.scheme or u.netloc:continue
    target=ROOT/'site'/(u.path or 'index.html')
    assert target.is_file(),link
    if u.fragment and not u.path:assert u.fragment in page.ids,link
assert any(i.get('src')==ASSET.removeprefix('site/') and i.get('width')=='1672' and i.get('height')=='941' for i in page.images)
changed=set(git('diff','--name-only',BASE).decode().splitlines())
untracked=set(git('ls-files','--others','--exclude-standard').decode().splitlines())
assert not (changed|untracked)-ALLOWED,(changed|untracked)-ALLOWED
archive=git('archive','--format=tar',BASE,'site','backend','deploy')
protected=[];text_suffixes={'.html','.css','.js','.json','.txt','.xml','.py','.sh','.md','.service','.conf'}
with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
    for entry in tar:
        if not entry.isfile() or entry.name=='site/index.html':continue
        old=tar.extractfile(entry).read();current=(ROOT/entry.name).read_bytes()
        if Path(entry.name).suffix in text_suffixes:
            old=old.replace(b'\r\n',b'\n');current=current.replace(b'\r\n',b'\n')
        assert current==old,entry.name
        protected.append({'path':entry.name,'sha256':hashlib.sha256(current).hexdigest()})
impact={'status':'PASS','kind':'homepage-only equivalent impact/dependency map','base':BASE,'codecraft_registry':'historical; no generator available, existing architecture unchanged','changed_paths':sorted(changed|untracked),'public_changes':['site/index.html',ASSET],'new_dependency':{'from':'site/index.html','to':ASSET},'homepage_ids':page.ids,'homepage_dependencies':page.links,'protected_file_count':len(protected),'protected':protected,'no_css_js_backend_config_or_other_page_change':True,'old_assets_retained':True,'scope_not_business_effectiveness':True}
dest=ROOT/'private/homepage-proposal-loop/impact-map.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(impact,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:impact[k] for k in ['status','base','changed_paths','protected_file_count','no_css_js_backend_config_or_other_page_change']}))
