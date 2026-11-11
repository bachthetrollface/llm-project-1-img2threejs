"""Record a human-readable agent vision scorecard after inspecting its comparison image."""
import json,subprocess,sys
from pathlib import Path
R=Path(__file__).parent;K=Path('/Users/minhthutran/.codex/skills/img2threejs');pid=sys.argv[1];F=R/'evidence'/pid;S=R/'object-sculpt-spec.json'
review=json.loads((F/'vision-review.json').read_text())
for name,key,expected in [('diagnose_render','passed',True),('turntable_gate','passed',True),('self_intersection','selfIntersecting',False)]:
 g=json.loads((F/(name+'.json')).read_text())
 if g.get(key)!=expected or g.get('errors'):raise SystemExit(f'Cannot accept: {name} failed or unevaluated')
def command(args):
 p=subprocess.run(['python3',*map(str,args)],cwd=K,text=True,capture_output=True)
 if p.returncode:print(p.stdout,p.stderr);raise SystemExit(p.returncode)
 return p.stdout
features=[dict(id=k,score=v,notes=review['summary']) for k,v in review['features'].items()]
(F/'feature-reviews.json').write_text(json.dumps(features))
(F/'layer-scores.json').write_text(json.dumps(review['layers']))
command([K/'forge/stage3_build/orchestrate_passes.py','check',S,'--pass-id',pid])
command([K/'forge/stage4_review/append_review.py',S,'--pass-id',pid,'--fidelity',review['overall'],'--action','continue','--summary',review['summary'],'--render-screenshot',F/'reference.png','--reference-screenshot',R/'public/reference.png','--comparison-image',F/'comparison.png','--ai-vision-score',review['overall'],'--layer-scores-json',F/'layer-scores.json','--feature-reviews-json',F/'feature-reviews.json','--ai-vision-notes',review['summary'],'--map-stripped-render',F/'silhouette.png','--review-viewpoints-json',json.dumps(['reference','front','right','rear','left','thickness-axis','long-axis']),'--require-screenshot-files','--in-place'])
evidence={'build-current-pass':R/'src/createGraterModel.ts','render-capture':F/'reference.png','review-contract-read':K/'grimoire/review/gates_reference.md','tier1-diagnostics':F/'diagnose_render.json','multi-angle-review':F/'turntable_gate.json','pass-gate-check':F/'diagnose_render.json','ai-review-recorded':F/'vision-review.json','pipeline-sync':S}
for step,path in evidence.items():command([K/'forge/state.py','mark',step,'--state',R/'.img2threejs/state.json','--evidence',path])
command([K/'forge/stage3_build/orchestrate_passes.py','sync',S,'--in-place'])
print(command([K/'forge/next.py','--state',R/'.img2threejs/state.json']))
