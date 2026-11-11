import json, subprocess, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).parent;SKILL=Path('/Users/minhthutran/.codex/skills/img2threejs')
pid=sys.argv[1];folder=ROOT/'evidence'/pid;spec=ROOT/'object-sculpt-spec.json'
for f in folder.glob('raw-*.png'):Image.open(f).crop((0,0,700,700)).save(folder/f.name.removeprefix('raw-'))
def run(name,args):
 p=subprocess.run(['python3',str(SKILL/'forge/stage4_review'/name),*map(str,args)],capture_output=True,text=True,cwd=SKILL)
 text=p.stdout;start=text.find('{')
 try:data=json.loads(text[start:])
 except Exception:data={'stdout':text,'stderr':p.stderr,'returncode':p.returncode}
 (folder/(name.removesuffix('.py')+'.json')).write_text(json.dumps(data,indent=2));return data
# Shape diagnostics use an annotated contour and real unlit browser capture.
tier=run('diagnose_render.py',['--reference',ROOT/'evidence/intake/annotated-silhouette-reference.png','--render',folder/'silhouette.png','--map-stripped-render',folder/'silhouette.png','--spec',spec,'--pass-id',pid,'--in-place','--json'])
multi=run('diagnose_render_multi_angle.py',['--reference',folder/'reference.png','--orbit',folder/'right.png','--orbit',folder/'rear.png','--json'])
turn=run('turntable_gate.py',sum([['--capture',f'{a}={folder/v}'] for a,v in [(0,'front.png'),(90,'right.png'),(180,'rear.png'),(270,'left.png')]],[])+['--allow-holes','--json'])
if (folder/'runtime.json').exists():
 runtime=json.loads((folder/'runtime.json').read_text())
 for m in runtime['meshes']:
  p=m['positions'];m['vertices']=[p[i:i+3] for i in range(0,len(p),3)]
  if m.get('normals'):m['normals']=[m['normals'][i:i+3] for i in range(0,len(m['normals']),3)]
  if not m.get('indices'):m['indices']=list(range(len(m['vertices'])))
 (folder/'meshes.json').write_text(json.dumps(runtime))
 run('self_intersection.py',[folder/'meshes.json','--max-samples',12,'--json'])
 run('attachment_anchor.py',[spec,'--json'])
run('interior_difference.py',[ROOT/'public/reference.png',folder/'reference.png','--json'])
print(json.dumps({'pass':pid,'tier1':tier.get('passed'),'shape':tier.get('checks'),'failures':tier.get('failures'),'multiAngle':multi,'turntable':turn},indent=2))
