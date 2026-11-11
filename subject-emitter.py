"""Subject-specific additions unsupported by the generic generator, driven by saved spec data.
Run after the skill generator for the currently unlocked pass only.
"""
import json
from pathlib import Path
root=Path(__file__).parent
spec=json.loads((root/'object-sculpt-spec.json').read_text())
path=root/'src/createGraterModel.ts';src=path.read_text()
if '// BEGIN GRATER SUBJECT EXTENSION' in src:
 src=src.split('// BEGIN GRATER SUBJECT EXTENSION')[0]+src.split('// END GRATER SUBJECT EXTENSION')[1]
code='''// BEGIN GRATER SUBJECT EXTENSION
  // Subject-specific rolled bead, preserving a real rounded cross-section.
  const rimDescription = GRATER_RIM;
  if (meshes['base-rim']) {
    const r=rimDescription, points:THREE.Vector3[]=[];
    for(let i=0;i<r.segments;i++){
      const a=i/r.segments*Math.PI*2;
      // Rounded-rectangle radial intersection with rounded corner offset.
      const dx=Math.cos(a), dy=Math.sin(a), w=r.width/2-r.cornerRadius, h=r.depth/2-r.cornerRadius;
      const t=Math.min(w/Math.max(.00001,Math.abs(dx)),h/Math.max(.00001,Math.abs(dy)));
      const px=dx*t, py=dy*t;
      points.push(new THREE.Vector3(px+dx*r.cornerRadius,py+dy*r.cornerRadius,0));
    }
    const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');
    meshes['base-rim'].geometry.dispose();
    meshes['base-rim'].geometry=new THREE.TubeGeometry(curve,r.segments,r.tubeRadius,r.radialSegments,true);
  }
  // Stamped cutting hoods: one genuinely curved instanced strip per aperture.
  for (const [id,description] of Object.entries(GRATER_LIPS)) {
    const old=meshes[id]; if(!old)continue;
    const d=description as {holes:{x:number;y:number;rx:number;ry:number}[];rise:number;arcSegments:number;bandWidth:number};
    const pos:number[]=[], idx:number[]=[], N=d.arcSegments;
    for(let layer=0;layer<2;layer++)for(let edge=0;edge<2;edge++)for(let i=0;i<=N;i++){
      const a=Math.PI+i/N*Math.PI, radial=edge===0?1.08:.94;
      pos.push(Math.cos(a)*radial,Math.sin(a)*radial,.009+d.rise*Math.sin(a)**2-layer*.003);
    }
    const stride=N+1;
    function quad(a:number,b:number,c:number,e:number){idx.push(a,b,c,a,c,e);}
    for(let i=0;i<N;i++){
      quad(i,i+1,stride+i+1,stride+i);
      quad(2*stride+i,3*stride+i,3*stride+i+1,2*stride+i+1);
      quad(i,2*stride+i,2*stride+i+1,i+1);
      quad(stride+i,stride+i+1,3*stride+i+1,3*stride+i);
    }
    quad(0,stride,3*stride,2*stride);quad(N,2*stride+N,3*stride+N,stride+N);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
    const replacement=new THREE.InstancedMesh(geo,old.material,d.holes.length);
    replacement.name=id;replacement.userData={...old.userData,componentId:id,explodeWithParent:true};
    const m=new THREE.Matrix4();for(let i=0;i<d.holes.length;i++){const h=d.holes[i];m.compose(new THREE.Vector3(h.x,h.y,0),new THREE.Quaternion(),new THREE.Vector3(h.rx,h.ry,1));replacement.setMatrixAt(i,m);}
    replacement.instanceMatrix.needsUpdate=true;replacement.castShadow=true;replacement.receiveShadow=true;
    old.parent!.add(replacement);old.parent!.remove(old);old.geometry.dispose();meshes[id]=replacement;
  }
  // Measured proportion adjustment, baked in geometry; component pivots retain identity scale.
  root.updateMatrixWorld(true);
  const warp=new THREE.Matrix4().makeScale(GRATER_X_SCALE,1,1);
  for(const mesh of Object.values(meshes)){
    if(mesh instanceof THREE.InstancedMesh)continue;
    const localWarp=new THREE.Matrix4().copy(mesh.matrixWorld).invert().multiply(warp).multiply(mesh.matrixWorld);
    mesh.geometry.applyMatrix4(localWarp);mesh.geometry.computeVertexNormals();
  }
  // Independent seeded microchannels. The narrow reference crop is evidence, not a tile.
  const size=1024, albedo=new Uint8Array(size*size*4), rough=new Uint8Array(size*size*4), normal=new Uint8Array(size*size*4), anis=new Uint8Array(size*size*4);
  const noise=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7+42)*43758.5453;return n-Math.floor(n);};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const k=(y*size+x)*4, broad=Math.sin(x*.018+y*.007)*.5+Math.sin(x*.043-y*.011)*.25;
    const grain=Math.sin(x*2.3+noise(0,Math.floor(y/60))*.2);
    const value=Math.round(194+broad*3+(noise(x,y)-.5)*1.5);
    albedo.set([value,value+1,value+1,255],k);
    const rv=Math.round(150+broad*9+grain*6+(noise(x+87,y)-.5)*6);rough.set([rv,rv,rv,255],k);
    normal.set([Math.round(128+grain*3),Math.round(128+(noise(x,y+71)-.5)*1.2),255,255],k);
    anis.set([255,128,220,255],k);
  }
  function dataMap(data:Uint8Array<ArrayBuffer>,color:boolean){const t=new THREE.DataTexture(data,size,size);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.needsUpdate=true;return t;}
  const metalMaps={albedo:dataMap(albedo,true),roughness:dataMap(rough,false),normal:dataMap(normal,false),anisotropy:dataMap(anis,false)};
  for(const [id,mesh]of Object.entries(meshes)){
    if(id==='root'||id==='scratch-field')continue;
    const mat=mesh.material as THREE.MeshPhysicalMaterial;
    mat.map=metalMaps.albedo;mat.roughnessMap=metalMaps.roughness;mat.normalMap=metalMaps.normal;
    mat.normalScale.set(.22,.22);mat.bumpMap=null;mat.displacementMap=null;mat.aoMap=null;
    mat.roughness=id.includes('rim')||id.startsWith('corner')||id.startsWith('top-')?.30:.58;
    mat.anisotropy=.55;mat.anisotropyMap=metalMaps.anisotropy;mat.needsUpdate=true;
    mat.userData.surfaceSource='reference-constrained independent procedural microchannels; extracted source maps retained as evidence';
  }
  // Interior caps need cavity occlusion; a single environment lookup has no self-occlusion.
  for(const id of ['front-panel','right-panel','back-panel','left-panel']){
    const mesh=meshes[id];if(!mesh)continue;
    const outer=mesh.material as THREE.MeshPhysicalMaterial;
    outer.roughness=.50;
    const inner=new THREE.MeshBasicMaterial({color:0x303030,side:THREE.DoubleSide});
    inner.userData.approximation='Interior environment attenuation approximates cavity occlusion; no path-traced GI.';
    const edge=outer.clone();edge.envMapIntensity=.30;
    const normal=mesh.geometry.getAttribute('normal');const index=mesh.geometry.index;
    const count=index?index.count:normal.count;mesh.geometry.clearGroups();let start=0,last=-1;
    for(let i=0;i<count;i+=3){const ni=index?index.getX(i):i;const z=normal.getZ(ni);const mi=z<-.7?1:Math.abs(z)<.7?2:0;
      if(mi!==last){if(i>start)mesh.geometry.addGroup(start,i-start,last);start=i;last=mi;}
    }mesh.geometry.addGroup(start,count-start,last);mesh.material=[outer,inner,edge];
  }
  // END GRATER SUBJECT EXTENSION
'''
rim=next(c['geometryDescriptor']['graterRolledRim'] for c in spec['componentTree'] if c['id']=='base-rim')
lips={c['id']:c['geometryDescriptor']['graterLips'] for c in spec['componentTree'] if 'graterLips' in c['geometryDescriptor']}
code=code.replace('GRATER_RIM',json.dumps(rim)).replace('GRATER_LIPS',json.dumps(lips)).replace('GRATER_X_SCALE',str(spec.get('reconstructionAdjustments',{}).get('globalXScale',1.04)))
src=src.replace('  root.userData.sculptRuntime =',code+'  root.userData.sculptRuntime =',1)
path.write_text(src)
