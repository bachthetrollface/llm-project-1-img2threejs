# Wooden table: timeboxed img2threejs test

Approximate procedural reconstruction from the supplied single image. Verified preview after 186 seconds from local state initialization. This is an abbreviated skill trial, not a completed quality-gated skill run.

## Result
13 named mesh parts: five tabletop boards, four legs, and four apron rails. Rounded edges, procedural canvas wood textures, PBR material, studio lighting, and approximate contact shadows. Viewer supports orbit, fixed views, wireframe, exploded parts, and client-side GLB download.

## Verification
Reference: clear isolated object, 1024 × 1024 PNG; technical image probe passed. Browser preview inspected against the reference and camera adjusted once. TypeScript checked by the project build. The production configuration includes both the existing grater and the new table.

## Limits
Grain, knots, wear, proportions, and hidden joinery are approximated. The rendered grain is visibly simpler and more regular than the photograph. Full staged pass gates, texture projection, detailed topology checks, and GLB roundtrip validation were omitted to honor the requested runtime. Local skill state remains incomplete; no full-pipeline pass is claimed. The generated assessment is an initial scaffold.

## Open
http://127.0.0.1:5173/table.html

Source: ../src/createWoodenTableModel.ts and ../src/table-main.ts.
