"""Scope/compatibility gate for this static service-positioning release."""
from pathlib import Path
import hashlib,json,re,subprocess

ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site'
BASE='fb803c0655d12e238055cd47e755acebe31dcf6a'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True,encoding='utf-8')
allowed={'site/index.html','site/services.html','site/book.html','site/llms.txt','site/site-manifest.json','site/growth99/customer-loop.css','site/assets/customer-feedback-funnel-en-20261116.svg','site/assets/customer-feedback-funnel-en-20261116.png','tools/validate-checkup.py','tools/build-customer-feedback-site.py','tools/verify-customer-feedback-release.py'}
changed=set(git('diff','--name-only',BASE).splitlines())
assert all(p in allowed or p.startswith(('docs/tasks/2026-11-16-customer-feedback','verification/customer-loop/')) for p in changed),changed-allowed
before=git('show',BASE+':site/book.html');after=(SITE/'book.html').read_text(encoding='utf-8')
booking=lambda s:re.findall(r'href="(https://cal\.com/[^\"]+)"',s)
assert booking(before)==booking(after)==['https://cal.com/consolidata/marketing-conversation']
assert re.findall(r'href="mailto:[^\"]+"',before)==re.findall(r'href="mailto:[^\"]+"',after)
section=lambda s:re.search(r'<section\b[^>]*id="acceptance".*?</section>',s,re.S).group()
assert section(git('show',BASE+':site/services.html'))==section((SITE/'services.html').read_text(encoding='utf-8'))
manifest=json.loads((SITE/'site-manifest.json').read_text(encoding='utf-8'));old=json.loads(git('show',BASE+':site/site-manifest.json'))
for key in ['price','questionCount','assessmentUrl','purchaseUrl','readinessEndpoint','emailEndpoint','actionStatus','delivery','deliverable','method','limitations','firstEnterpriseValidation']:
    assert manifest[key]==old[key],key
assert manifest['primaryService']['name']=='Customer Journey Improvement Service'
for ext,digest in [('svg','c6d948f55e28b75c45780ba015eba26950a45d5c1b422bc38c7f0fb09e65e49d'),('png','9acd3476044d6391f90f1421a498308ee47f0c6c24362879efd33ab7ec885591')]:
    assert hashlib.sha256((SITE/f'assets/customer-feedback-funnel-en-20261116.{ext}').read_bytes()).hexdigest()==digest
protected=[]
for rel in git('ls-tree','-r','--name-only',BASE).splitlines():
    if rel.startswith(('site/','backend/','deploy/')) and rel not in allowed:
        raw=subprocess.check_output(['git','show',BASE+':'+rel],cwd=ROOT)
        assert (ROOT/rel).is_file() and (ROOT/rel).read_bytes().replace(b'\r\n',b'\n')==raw.replace(b'\r\n',b'\n'),rel
        protected.append(rel)
result={'status':'passed','base':BASE,'changed_tracked_paths':sorted(changed),'protected_public_backend_deploy_files':len(protected),'existing_booking_destination_unchanged':True,'mail_links_unchanged':True,'acceptance_section_exact':True,'assessment_manifest_fields_unchanged':True,'approved_funnel_assets_exact':True,'scope':'source protection, not payment/provider readiness or business effectiveness'}
dest=ROOT/'verification/customer-loop';dest.mkdir(parents=True,exist_ok=True)
(dest/'source-scope-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
