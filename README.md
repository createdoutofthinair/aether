# Aether — Planet Explorer

Static Three.js exploration prototype. Serve `dist/` with a static HTTP server, e.g. `python -m http.server 8000 --directory dist`.

- Continuous spherical planet, 60 km radius, deterministic ridges and impact craters.
- Six cube-face quadtrees, 16×16 patches, up to level 13, stitched coarse/fine edges, isolated radial skirts, shared height-field normals, incremental generation and mesh eviction.
- Camera-relative render origin; metre-based CPU coordinates.
- Depth-aware single-scattering atmospheric integration with Rayleigh and Mie terms and planetary sunlight occlusion. This version ray marches directly; it does not yet precompute scattering lookup tables.
- Local Poly Haven rock/gravel colour, OpenGL normal, roughness and ambient-occlusion maps. Colour is sRGB; data maps remain linear. Triplanar normals are reoriented into planet space before blending, then transformed into view space. UV variation is consistent across PBR channels.
- Rover R06 GLB from the user's existing project. Simplified surface-constrained driving with slope acceleration and damped suspension, fixed 120 Hz steps; not a general rigid-body vehicle solver.
- Orbit, guided descent/ascent, free flight, rover chase camera, keyboard/touch controls, sunlight/atmosphere/exposure controls.

## Known limitations

LOD edges are stitched and skirt lighting is isolated; refinement does not yet geomorph. High-speed travel may show detail arriving. Collision uses the continuous height function; coarse visual LOD can differ slightly. Rocks are visual scatter and have no colliders. No erosion simulation, caves, clouds, terrain self-shadowing at planetary scale, multiple scattering, or atmospheric LUTs. Atmospheric planet shadow uses the reference sphere. Rover suspension is chassis-level, not independent per-wheel physical suspension. This intentionally small planet is not Earth-scale.

## Assets

Poly Haven assets are CC0: https://polyhaven.com/license
- https://polyhaven.com/a/rock_boulder_dry — Dimitrios Savva, Rico Cilliers
- https://polyhaven.com/a/sandy_gravel — see source asset page for authorship
Textures are bundled at 2K, not hotlinked.
Three.js MIT licence in dist/vendor/THREE-LICENSE.txt.
The Rover R06 asset comes from the user's prior project.

## Validation

Run `node scripts/test-terrain.mjs` for shared-edge normals, same-level and coarse/fine edge alignment, cube-face transitions and skirt isolation.

The rover is bundled as losslessly compressed `dist/rover.glb.gz` and decompressed in the browser before loading. Geometry and embedded textures are unchanged. Requires a modern browser with WebGL 2 and DecompressionStream support.
