# Aether — Planet Explorer

Static Three.js exploration prototype. Serve `dist/` with a static HTTP server, e.g. `python -m http.server 8000 --directory dist`.

- Continuous spherical planet, 60 km radius, deterministic ridges and impact craters. Nacre Basin adds a winding dry channel, terraces, mesas and small geometric surface relief across the landing region, blending into the planet over 4.2–6.5 km.
- Six cube-face quadtrees, 16×16 patches, up to level 13, stitched coarse/fine edges, isolated radial skirts, shared height-field normals, incremental generation and mesh eviction.
- Camera-relative render origin; metre-based CPU coordinates.
- Depth-aware single-scattering atmospheric integration with Rayleigh and Mie terms and planetary sunlight occlusion. This version ray marches directly; it does not yet precompute scattering lookup tables.
- Three local Poly Haven scanned material families: bedrock, sandy gravel and cracked dry sediment. Stochastic triplanar mapping reduces repeating patterns; scanned height controls material transitions. Packed surface textures store roughness in R, ambient occlusion in G and height in B. Colour and normal maps are 2K, packed data maps 1K. Colour is sRGB; data maps remain linear. Triplanar normals are reoriented into planet space before blending, then transformed into view space. UV variation is consistent across PBR channels.
- Rover R06 GLB from the user's existing project. Simplified surface-constrained driving with slope acceleration and damped suspension, fixed 120 Hz steps; not a general rigid-body vehicle solver.
- Orbit, guided descent/ascent, free flight, rover chase camera, keyboard/touch controls, sunlight/atmosphere/exposure controls.

## Known limitations

LOD edges are stitched and skirt lighting is isolated; refinement does not yet geomorph. High-speed travel may show detail arriving. Wheel and rock contact samples the currently visible stitched terrain triangles. Rocks are visual scatter and have no colliders. The basin is an erosion-inspired procedural landform, not a hydraulic erosion simulation. No caves, clouds, terrain self-shadowing at planetary scale, multiple scattering, or atmospheric LUTs. Atmospheric planet shadow uses the reference sphere. Each wheel is repositioned independently against the terrain under a damped chassis; this is a kinematic contact solver, not full articulated rigid-body suspension. This intentionally small planet is not Earth-scale.

## Assets

Poly Haven assets are CC0: https://polyhaven.com/license
- https://polyhaven.com/a/rock_boulder_dry — Dimitrios Savva, Rico Cilliers
- https://polyhaven.com/a/sandy_gravel — see source asset page for authorship
- https://polyhaven.com/a/mud_cracked_dry_03 — Dario Barresi, Dimitrios Savva
Textures are bundled locally, not hotlinked. Original scan height maps are used for material blending, not exaggerated mesh displacement. The small geometric relief is deterministic and shared by rendering and contact. Larger outcrops and near-field pebbles use stable planet-cell IDs and distance fading.

Material scan scale: rock 1.8 m, gravel 2 m, cracked mud 1.5 m. A sediment-cover slider changes exposed bedrock. MSAA and 2048-pixel local shadows improve edge and contact quality; there is no screen-space ambient occlusion or global illumination yet.
Three.js MIT licence in dist/vendor/THREE-LICENSE.txt.
The Rover R06 asset comes from the user's prior project.

## Validation

Run `npm run check && npm test` for shared-edge normals, same-level and coarse/fine edge alignment, cube-face transitions and skirt isolation, plus tyre clearance, deterministic rock/pebble placement, regional continuity and asset availability. GitHub Actions compiles and links terrain, rock, shadow and atmosphere GLSL before deployment.

The rover is bundled as losslessly compressed `dist/rover.glb.gz` and decompressed in the browser before loading. Geometry and embedded textures are unchanged. Requires a modern browser with WebGL 2 and DecompressionStream support.
