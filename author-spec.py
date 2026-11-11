"""Author subject-specific reconstruction data; all measurements are approximate normalized units."""
import copy, importlib.util, json, math, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).parent
loader=importlib.util.spec_from_file_location('spec_helpers','/Users/minhthutran/.codex/skills/img2threejs/forge/stage2_spec/new_sculpt_spec.py')
helpers=importlib.util.module_from_spec(loader); loader.loader.exec_module(helpers)
s=json.loads((ROOT/'object-sculpt-spec.json').read_text())
template=copy.deepcopy(s['materials'][0])
s['scores']=dict(object_isolation=.98,silhouette_readability=.95,depth_inference=.72,primitive_decomposition=.93,material_procedurality=.85,occlusion_risk=.4,interaction_fit=.95)
s['assumptions']=['Rear perforations inferred; no handle added because none is visible.','Normalized dimensions, not manufacturing measurements.','Scratch placement approximate.']
s['coordinateFrame']=dict(front='+Z',up='+Y',scaleReference='height 2.6 normalized units; base at Y=0')
s['silhouette']=dict(boundingShape='hollow truncated rectangular pyramid',aspectRatios=[dict(name='height/base-width',value=1.733),dict(name='top/base-width',value=.68)],symmetry='bilateral rectangular shell',dominantCurves=['rounded projecting base perimeter'],negativeSpaces=['open top','open bottom','staggered through holes on four panels'],landmarks=['top mouth','four base corners','front lateral seam'])
s['viewEvidence'][0]['observations']=json.loads((ROOT/'grater-analysis.json').read_text())['observations']['relationships']
s['viewEvidence'][0]['confidence']=.94
s['referenceCamera'].update(fovDegrees=30,positionHint=[-4.0,3.4,7.0],orientation=dict(yaw=-.4,pitch=.22,roll=0),note='Approximate long focal length three-quarter camera; refine framing against actual browser render.')
s['qualityTargets']['reviewViewpoints']=['reference','front','right','rear','left','grazing']
s['performanceBudget'].update(targetTriangles=60000,maxDrawCalls=50,textureSize=1024,fpsTarget=30)
materials=[]
for mid,rough in [('steel',.36),('rim-steel',.22),('cut-steel',.25),('hidden',.36)]:
 m=copy.deepcopy(template);m.update(id=mid,name=mid,baseColor='#C3C4C5',color='#C3C4C5',type='physical',finishClass='brushed-steel')
 m['albedo']=dict(dominant='#C3C4C5',secondary=['#B2B3B4','#C7C8C9'],samplingNotes='Neutral metal crop (443,316)-(623,355), palette sampled by analyze_texture.py; not a physical reflectance measurement.')
 m['colorVariation']=dict(palette=['#C3C4C5','#B2B3B4','#C7C8C9'],pattern='brushed',amplitude=.035,heightCorrelation=0)
 m['roughness']=dict(base=rough,variation=.10,map='independent-procedural-field',localResponse='fine vertical brushed scratches and mottled handling wear')
 m['metalness']=dict(base=1.,variation=0.)
 m['normal']=dict(pattern='brushed',strength=.07,scale=80,space='tangent')
 m['bump']=dict(pattern='scratches',amplitude=.0006,scale=90)
 m['surfaceFrequencyBands']=[dict(id='macro',frequency=3,amplitude=.025,role='broad wear mottling'),dict(id='meso',frequency=23,amplitude=.04,role='handling scratches'),dict(id='micro',frequency=180,amplitude=.018,role='brushed metal highlight breakup')]
 m['wear']=dict(edgeWear=.2,scratches=['fine mostly vertical streaks'],chips=[])
 m['localOverrides']=[dict(id='scratches',region='panel surface',roughness=.43,normalStrength=.06,evidenceRefs=['full-object']),dict(id='mottling',region='lower panel',roughness=.47,dirtAmount=.02,evidenceRefs=['full-object']),dict(id='polished-edge',region='folded rim',roughness=.18,evidenceRefs=['full-object']),dict(id='cut-edge',region='cutting lip',roughness=.22,evidenceRefs=['full-object'])]
 if mid=='hidden':m['opacity']=0
 materials.append(m)
s['materials']=materials
tree=[]
def node(cid,prim,parent='root',pos=(0,0,0),scale=(1,1,1),mat='steel',level='meso',rot=(0,0,0),features=(),topology='assembled-solid',importance=.8):
 n=helpers._cnode(cid,cid.replace('-',' ').title(),prim,parent,pos,scale,material=mat,role='panel' if 'panel' in cid else 'detail',level=level,rotation=rot,importance=importance,anim_role='root' if parent is None else 'static-part',pivot_mode='base',topology_class=topology,topology_rationale='Thin formed metal sheet or folded trim with discrete hard edges; actual cavities remain open.',local_features=[dict(id=x,kind='hole' if x in ['perforations','open-mouth'] else 'ridge',description=x,evidenceRefs=['full-object']) for x in features])
 n['fidelityTier']='blockout' if level=='macro' else ('structural-pass' if level=='meso' else 'form-refinement')
 n['actionProfile']['collider'].update(scale=[1.5,2.6,1.05],offset=[0,1.3,0],notes='Broad proxy only; actual holes excluded from collision.')
 n['geometryDescriptor']['topologyIntent']='subject-specific metal grater reconstruction'
 tree.append(n);return n
root=node('root','box',None,mat='hidden',level='macro');root['role']='body'
root['actionProfile']['sockets']=[dict(id='grip',name='grip',position=[0,2.6,0],rotation=[0,0,0],purpose='whole prop grip'),dict(id='base-contact',name='base-contact',position=[0,0,0],rotation=[0,0,0],purpose='support plane')]
panels=[];holeRecords={}
for i,name in enumerate(['front','right','back','left']):
 phi=i*math.pi/2; wide=i%2==0; wb,wt,depth=(1.5,1.02,1.05) if wide else (1.05,.70,1.5)
 topDepth=.70 if wide else 1.02
 slope=math.atan((depth-topDepth)/2/2.6);sa,ca=math.sin(slope),math.cos(slope);sp,cp=math.sin(phi),math.cos(phi)
 # Convert Ry(phi) Rx(-slope) to the generator's XYZ Euler convention.
 rot=[math.atan2(-sa,cp*ca),math.asin(max(-1,min(1,sp*ca))),math.atan2(sp*sa,cp)]
 h=2.6/ca
 n=node(f'{name}-panel','extrude',pos=[sp*depth/2,.045,cp*depth/2],rot=rot,level='macro',features=['tapered-outline','perforations','interior'])
 n['confidence']=.96 if name in ['front','left'] else .5
 holes=[];records=[]
 rows=11;cols=6 if wide else 4
 for row in range(rows):
  yy=.30+row*.195; wid=wb+(wt-wb)*(yy/h)
  for col in range(cols):
   xx=(col-(cols-1)/2)*((wid-.25)/(cols-1)) + (.022 if row%2 else -.014)
   rx=.034*(1+.07*math.sin(row*7+col*3));ry=.060*(1+.08*math.cos(row*2+col*9))
   loop=[]
   for k in range(20):
    a=-k/20*math.tau
    # Top rounded, lower tip narrowed to approximate punched teardrop apertures.
    yyoff=math.sin(a)*ry
    xxoff=math.cos(a)*rx*(.87+.13*math.sin(a))
    loop.append([xx+xxoff,yy+yyoff])
   holes.append(loop);records.append(dict(x=xx,y=yy,rx=rx,ry=ry))
 n['geometryDescriptor']['profile2D']=dict(points=[[-wb/2,.01],[wb/2,.01],[wt/2,h],[-wt/2,h]],depth=.008,holes=holes)
 n['dimensions'].update(width=wb,height=h,depth=.008)
 panels.append(n['id']);holeRecords[name]=records
 # Top fold: thin transverse bar follows each panel and leaves top open.
 tf=node('top-'+name,'extrude',parent=n['id'],pos=[0,h-.012,0],mat='rim-steel',features=['open-mouth'])
 tf['geometryDescriptor']['profile2D']=dict(points=[[-wt/2,-.012],[wt/2,-.012],[wt/2,.012],[-wt/2,.012]],depth=.018)
 # Meso corner seam, in panel local coordinates, overlaps adjoining edge.
 seam=node(f'corner-{i}','extrude',parent=n['id'],mat='rim-steel',features=['fold'])
 seam['geometryDescriptor']['profile2D']=dict(points=[[wb/2-.012,.01],[wb/2+.008,.01],[wt/2+.008,h],[wt/2-.012,h]],depth=.02)
 # Prototype is expanded into one InstancedMesh per face by subject-emitter.py.
 lip=node(name+'-lips','extrude',parent=n['id'],mat='cut-steel',level='micro',features=['raised-lips'])
 lip['geometryDescriptor']['profile2D']=dict(points=[[-.035,0],[.035,0],[.030,.014],[-.030,.014]],depth=.004)
 lip['geometryDescriptor']['graterLips']=dict(holes=records,rise=.014,arcSegments=12,bandWidth=.006)

def rounded_rect(w,d,r):
 pts=[]
 for cx,cy,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
  for j in range(9):
   a=math.radians(start+j*90/8);pts.append([cx+math.cos(a)*r,cy+math.sin(a)*r])
 return pts
rim=node('base-rim','extrude',pos=[0,.05,0],rot=[math.pi/2,0,0],mat='rim-steel',level='macro',features=['rolled-edge'])
rim['geometryDescriptor']['profile2D']=dict(points=rounded_rect(1.61,1.16,.10),depth=.045,holes=[list(reversed(rounded_rect(1.47,1.02,.06)))])
rim['geometryDescriptor']['graterRolledRim']=dict(width=1.56,depth=1.11,cornerRadius=.08,tubeRadius=.025,segments=128,radialSegments=8)
scratch=node('scratch-field','box',parent='front-panel',scale=[.001,.001,.001],mat='hidden',level='micro',features=['surface-scratches'])
scratch['importance']=.1
s['componentTree']=tree
s['repetitionSystems']=[dict(id=f'{name}-perforations',name=f'{name} punched apertures and cutting lips',level='micro',count=len(records),parent=name+'-panel',elementComponentIds=[name+'-panel',name+'-lips'],realization='procedural-extruded-holes-and-instanced-hoods',buildsGeometry=True,placement=dict(mode='staggered-grid',rows=11),notes='Actual profile2D hole loops and graterLips descriptor are authoritative; no duplicate decorative mesh.') for name,records in holeRecords.items()]
for d in s['preSpecAssessment']['detailInventory']['details']:d['mapsTo']['ref']=d['mapsTo']['ref'].replace('.', '/',1)
s['featureReviewTargets']=[dict(id='tapered-hollow-body',name='Tapered four-face hollow body and unobstructed mouth',tier='critical',passIds=['blockout','structural-pass','form-refinement'],minimumScore=.8,mustPass=True,componentRefs=panels,evidenceRefs=['full-object']),dict(id='rolled-base',name='Projecting rounded rectangular base rim',tier='critical',passIds=['blockout','form-refinement'],minimumScore=.8,mustPass=True,componentRefs=['base-rim'],evidenceRefs=['full-object']),dict(id='punched-pattern',name='True staggered oval openings and raised cutting lips',tier='critical',passIds=['structural-pass','form-refinement'],minimumScore=.8,mustPass=True,componentRefs=panels,evidenceRefs=['full-object']),dict(id='satin-metal',name='Neutral satin steel with worn roughness and reflective rim',tier='critical',passIds=['material-pass','surface-pass','lighting-pass'],minimumScore=.75,mustPass=True,componentRefs=panels+['base-rim'],evidenceRefs=['full-object'])]
for bp in s['buildPasses']:
 bp['componentRefs']=['root']
s['lightingFromPhoto']=[dict(type='key light',position=[-3,6,4],intensity=4,color='#FFFFFF'),dict(type='fill light',position=[4,3,2],intensity=1.2,color='#F2F4F5'),dict(type='environment light',intensity=1.0,color='#D3D3D3'),dict(type='presentation',exposure=1,toneMapping='ACESFilmic',background='#CCCCCC',contactShadow='soft grounded')]
s['risks']=['Single photograph cannot reveal rear patterns or manufacturing dimensions.','Small lip shape and scratches approximate.','PBR extraction provides image evidence, not physical material measurement.']
(ROOT/'object-sculpt-spec.json').write_text(json.dumps(s,indent=2))
