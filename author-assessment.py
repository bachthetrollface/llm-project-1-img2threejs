import json
from pathlib import Path

root = Path(__file__).parent
assessment = json.loads((root/'assessment.json').read_text())
p = assessment['preSpecAssessment']
p['objectClass'] = dict(primaryType='tapered box grater', primaryDomain='object', formLanguage=['hard-surface','geometric'], structureKind=['layered shell','repeated modules'], motionPotential=['static prop','whole-object transform','detachable'], materialFamilies=['metal'], notes='Four thin perforated panels; no visible handle. Hidden patterns inferred.')
p['complexity']['scores'] = dict(silhouetteComplexity=1,componentCount=2,hierarchyDepth=2,repetitionDensity=3,materialLayerCount=2,localDetailDensity=3,occlusionRisk=2,actionReadinessNeed=1)
p['complexity']['estimatedCounts'] = dict(macroComponents=5,mesoComponents=8,microFeatureGroups=5,materialLayers=3,repetitionSystems=4)
p['complexity']['reasoning'] = ['Simple tapered silhouette but hundreds of true perforations, raised cutting lips, folded seams, rolled edge and worn metal require complex detail authoring.']
p['unknownsToResolveBeforeImplementation'] = ['Rear and far-side patterns inferred at confidence 0.5; no exact reconstruction claim.', 'Absolute dimensions unavailable; use normalized units.', 'Wear maps are approximate, not exact scratch placement.']
entries = [
 ('taper','contour','front-panel','tapered-outline','Full-height trapezoid, top width 0.68 of bottom.',[.41,.28,.28,.52],.98),
 ('front-holes','hole','front-panel','perforations','Staggered rows of elongated oval/teardrop through holes.',[.44,.35,.22,.39],.98),
 ('side-holes','hole','left-panel','perforations','Dense oval through holes visible on narrow face.',[.34,.34,.08,.36],.95),
 ('cutting-lips','ridge','front-lips','raised-lips','Thin protruding cutting hoods border the lower portions of apertures.',[.45,.36,.2,.3],.85),
 ('rolled-rim','bevel','base-rim','rolled-edge','Rounded rectangular roll at the base projects beyond panels.',[.32,.71,.38,.1],.98),
 ('top-mouth','hole','top-front','open-mouth','Top is open, with a thin folded edge and no bridge handle.',[.38,.27,.23,.07],.96),
 ('corner-fold','seam','corner-0','fold','Vertical folded corner produces a bright seam.',[.41,.3,.02,.48],.95),
 ('rear-dark','contour','back-panel','interior','Rear top interior is dark and perforated; no solid top cap.',[.41,.27,.15,.04],.85),
 ('scratches','scratch','steel','scratches','Fine vertical and short diagonal scratches on the front metal.',[.47,.32,.12,.12],.9),
 ('mottling','stain','steel','mottling','Low contrast worn roughness mottling on unpainted metal.',[.46,.53,.16,.2],.9),
 ('rim-polish','gloss','rim-steel','polished-edge','Base rim carries narrow low-roughness highlights.',[.43,.77,.25,.04],.95),
 ('lip-polish','gloss','cut-steel','cut-edge','Small bright cutting edge highlights adjacent to dark cavities.',[.46,.35,.16,.36],.85)
]
details=[]
for did,kind,target,feature,desc,region,confidence in entries:
    typ='material.localOverrides' if target in ['steel','rim-steel','cut-steel'] else 'component.localFeatures'
    details.append(dict(id=did,kind=kind,description=desc,region=dict(zip(['x','y','width','height'],region)),scale='micro' if kind in ['scratch','stain','gloss'] else 'meso',affects='geometry' if typ.startswith('component') else 'roughness/normal',mapsTo=dict(type=typ,ref=f'{target}.{feature}'),evidenceRef='full-object',confidence=confidence))
p['detailInventory'].update(scanMethod='component-zones',targetMinDetails=10,details=details)
assessment['qualityContract']['definitionOfDone'] = ['A hollow four-panel tapered grater with correct top/base width ratio, real staggered apertures, raised cutting lips, folded seams and a rounded projecting base rim.', 'Silver satin metal with independent roughness and normal variation, gray studio lighting and contact shadow.', 'Named clickable and explodable panels; four orbit views prove volume and open mouth. Rear face and wear remain explicitly approximate.']
(root/'assessment.json').write_text(json.dumps(assessment,indent=2))
(root/'detail-inventory.json').write_text(json.dumps(dict(sourceImage=assessment['sourceImage'],detailInventory=p['detailInventory']),indent=2))
