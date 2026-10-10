# Aether — Planet Explorer

Static Three.js exploration prototype. Serve `dist/` with a static HTTP server, e.g. `python -m http.server 8000 --directory dist`.

- Continuous spherical planet, 60 km radius, deterministic ridges and impact craters. Nacre Basin now uses a cached hydraulic/thermal erosion height field with aligned drainage, soil, rock exposure and horizon visibility. Its centre blends into the older basin at 2.7–3.9 km, then into planetary terrain at 4.2–6.5 km.
- Six cube-face quadtrees, 16×16 patches, up to level 14, stitched coarse/fine edges, isolated radial skirts, shared height-field normals, incremental generation and mesh eviction.
- Camera-relative render origin; metre-based CPU coordinates.
- Depth-aware single-scattering atmospheric integration with Rayleigh and Mie terms and planetary sunlight occlusion. This version ray marches directly; it does not yet precompute scattering lookup tables.
- Three local Poly Haven scanned material families: bedrock, sandy gravel and cracked dry sediment. Stochastic triplanar mapping randomizes scan orientation as well as tile offsets, with matching normal reorientation; scanned height controls material transitions. Interpolated deposition and bedrock masks follow the same geology as the mesh and are stitched across LOD boundaries. Packed surface textures store roughness in R, ambient occlusion in G and height in B. Colour and normal maps are 2K, packed data maps 1K. Colour is sRGB; data maps remain linear. Triplanar normals are reoriented into planet space before blending, then transformed into view space. UV variation is consistent across PBR channels.
- Rover R06 GLB from the user's existing project. Simplified surface-constrained driving with slope acceleration and damped suspension, fixed 120 Hz steps; not a general rigid-body vehicle solver.
- Orbit, guided descent/ascent, free flight, rover chase camera, keyboard/touch controls, sunlight/atmosphere/exposure controls.

## Known limitations

LOD edges are stitched, morph continuously, and isolate skirt lighting. High-speed travel may show detail arriving. Wheel and rock contact samples the currently visible stitched terrain triangles and the new fractured outcrop triangles. Ordinary scattered boulders and pebbles remain visual objects without colliders. Erosion runs on the reference basin; the rest of the planet uses procedural landforms. No caves, clouds, terrain self-shadowing at planetary scale, multiple scattering, or atmospheric LUTs. Atmospheric planet shadow uses the reference sphere. Each wheel is repositioned independently against the terrain under a damped chassis; this is a kinematic contact solver, not full articulated rigid-body suspension. This intentionally small planet is not Earth-scale.

## Assets

Poly Haven assets are CC0: https://polyhaven.com/license
- https://polyhaven.com/a/rock_boulder_dry — Dimitrios Savva, Rico Cilliers
- https://polyhaven.com/a/sandy_gravel — see source asset page for authorship
- https://polyhaven.com/a/mud_cracked_dry_03 — Dario Barresi, Dimitrios Savva
Textures are bundled locally, not hotlinked. Original scan height maps are used for material blending, not exaggerated mesh displacement. The small geometric relief is deterministic and shared by rendering and contact. Larger outcrops and near-field pebbles use stable planet-cell IDs and distance fading, with eight separately generated rock silhouettes, per-instance mineral tints and multi-point foundations for large formations.

Material scan scale: rock 1.8 m, gravel 2 m, cracked mud 1.5 m. A sediment-cover slider changes exposed bedrock. MSAA and 2048-pixel local shadows improve edge and contact quality; short-range screen-space contact occlusion supplements local shadows; there is no global illumination.
Three.js MIT licence in dist/vendor/THREE-LICENSE.txt.
The Rover R06 asset comes from the user's prior project.

## Validation

Run `npm run check && npm test` for shared-edge normals, same-level and coarse/fine edge alignment, cube-face transitions and skirt isolation, plus tyre clearance, deterministic rock/pebble placement, regional continuity, erosion repeatability, reference contact and stochastic contrast preservation. Fine-detail checks cover shared tile halos, gradient continuity, worker/fallback identity, bounded memory, embedded foundations and independent outcrop mesh raycasts. GitHub Actions compiles and links terrain with/without environment lighting, outcrops and their shadows, rock, shadow, water, atmosphere and sky-environment GLSL before deployment.

With `glslangValidator` installed, run `node scripts/export-shaders.mjs /tmp/aether-shaders` then `node scripts/check-shaders.mjs /tmp/aether-shaders`. The check also enforces the WebGL2 minimum of sixteen fragment texture samplers. Terrain uses sixteen with environment lighting, including Three's DFG lookup and local shadow map; snow grain/albedo shares the surface map to fit this budget.

The rover is bundled as losslessly compressed `dist/rover.glb.gz` and decompressed in the browser before loading. Geometry and embedded textures are unchanged. Requires a modern browser with WebGL 2 and DecompressionStream support.


### Planet atlas and world generation

Open **Planet atlas** to inspect connected climate regions and select a dry, gently sloping landing site. **Orbit selected site** relocates the orbital camera; **Land & explore** then performs the continuous local descent. Latitude/longitude fields support keyboard selection. Regeneration returns the camera to orbit and clears terrain meshes and pending work.

Session controls include deterministic world seed, relief (0.25–3×), equatorial temperature (−60–60 °C), sea level (−1000–1000 m), relative atmosphere density (0–2×), and volcanic activity (0–1). Nacre Basin remains a stable authored starting region. The rest of the planet changes with the seed. Latitude and elevation drive an approximate temperature field; a continuous regional moisture field, temperature, and activity blend ice, desert, volcanic and sediment/rock materials. Sea level controls a depth-composited ocean; ocean landing is blocked and the rover stops at shorelines. This is an artistic climate model, not a physical habitability or ocean simulation.

Terrain LOD uses an 18% split/merge hysteresis band to reduce repeated switching near thresholds; child groups replace parents only once all four are ready. CPU vertex geomorphing now blends positions, normals, geology and biome data over 0.48 seconds in both directions. Child groups start on parent triangles; parents return only after their children collapse onto them. Ground contacts use the morphed surface. Existing scanned PBR textures provide detail, with biome tint and normal-strength blends; this does not yet include dedicated scanned snow or basalt assets.

`npm test` also checks world repeatability, map coordinate round trips, climate ranges, biome coverage, sea level classification, and mesh disposal during regeneration.

### Seeded solar systems

**Solar system** opens a top-down orbital map with seven generated bodies and M/K/G/F main-sequence reference stars. Select a planet to inspect its orbit, year, radius, surface gravity, flux, albedo and equilibrium temperature. The time slider and playback advance Keplerian orbits. Map distances are logarithmically compressed and body markers are enlarged for readability. Generation changes the map; **Explore** transfers the selected solid world into the existing 3D explorer. Gas/ice giants are catalog and orbital-map objects only.

Each solid world carries a deterministic terrain seed, temperature, relief, sea level, surface-water/ice inventory, atmospheric density, activity and relative gravity into exploration. Each world's custom atlas settings are retained while moving between planets during the session; Reset restores that body's generated profile. The default Nacre world retains its original basin. Other planets use the global height field without copying the Nacre basin. Surface water and ice can be toggled separately in the atlas. Airless hot worlds do not inherit oceans or polar snow. Gravity scales the rover's slope response; suspension and handling remain a kinematic approximation.

The star presets and planet populations are illustrative, not a statistical planet-formation model. Periods use `365.25 * sqrt(a³ / Mstar)` in days, AU and solar masses, neglecting planet mass. Orbital positions solve Kepler's equation. The reference habitable band assumes incident flux from 0.35 to 1.1 times Earth's; its boundaries scale with the square root of luminosity. It uses mean orbital distance and does not model climate stability over an eccentric orbit or star-dependent atmospheric spectra. Equilibrium temperature uses `278.3 * (L * (1 - albedo) / a²)^0.25` kelvin (uniform redistribution), excluding greenhouse warming. An illustrative atmospheric warming term and equatorial offset supply the surface-climate preset. Day length and axial tilt are generated catalog data, with no seasonal simulation yet.

Physics context: [NASA: habitable zones](https://science.nasa.gov/exoplanets/habitable-zone/) and [NASA: orbital motion and Kepler's laws](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/). Being inside the reference band does not establish habitability.

Physical planet radii and masses are catalog properties. All explored bodies retain the existing compact 60 km geometry and simplified atmosphere; stellar lighting is artistically scaled. Interplanetary travel is an explicit scene transfer, not continuous AU-scale flight. The solar-system map remains usable without WebGL, with surface exploration disabled. Tests cover closed and nonintersecting generated orbits, reference Earth calculations, deterministic systems, solid-body travel guards and climate/profile isolation.


### Continuous terrain detail

LOD changes now interpolate for 0.48 seconds, including lighting and material masks, rather than swapping immediately. Refinement starts slightly farther away, with the existing 18% hysteresis band retained. Nested splits wait for their parent transition; coarsening collapses descendants before restoring an ancestor. Shared edges and skirts follow the current morphed geometry, and terrain contact tolerates up to 2 mm of Float32 edge error.

Coarse terrain normals use a wider height sampling footprint (up to 100 m), reducing tiny slopes being stretched across large distant triangles. Procedural grain and weathering fade toward their mean when their features become smaller than a pixel. The directional shadow map is local to rover mode; this change addresses distant terrain lighting rather than increasing shadow-map resolution. Browser visual confirmation still requires WebGL support.


### LOD performance

Morphed patches now mark only their own buffers and dependent stitched edges for upload. Unchanged quadtree selections reuse their edge plans without reuploading all visible geometry. Scatter tracks the revisions of patches intersecting its local footprint; distant morph animation no longer rebuilds every nearby rock's contact and instance matrices. Local geometry changes still refresh foundations. The fragment shader skips scans whose blend weight is exactly zero, preserving positive-weight contributions and explicit texture gradients.

Run `node scripts/benchmark-lod.mjs` for a reproducible CPU-only fixture with 196 visible patches and four morphing patches. In the development container, median morph CPU time fell from 4.631 ms to 1.391 ms and attribute update counts fell from 30,000 to 2,250 over 30 frames. These measure this workload, not browser FPS or GPU frame time. Morphing remains on the CPU to keep the existing collision sampler aligned with the rendered triangles; this change does not introduce GPU-only displacement.

### Featured terrain regions

Open **Planet atlas**, choose a **Featured region**, then **Orbit selected site** and **Land & explore**. Saffron Badlands has sandstone mesas and branching channels; Obsidian Caldera has a broad volcanic shield and crater rim; Zephyr Dunes has asymmetric dune ridges and sparse rocks. Shortcuts search for dry, gentle landing sites and respect the current water and terrain settings.

These regions change geometry, distant colour, roughness, fine surface normals and rock distribution. They reuse the existing three scanned PBR families; dedicated basalt and dune scans are not included. Region boundaries blend continuously into the global terrain. Seed changes rotate their locations and change their detail; the original Nacre starting basin remains intact. Ice and oceans still follow planet settings. Region templates are artistic landforms, not an erosion simulation.

`npm test` checks distinct landform profiles, continuous region boundaries, deterministic regeneration, landing safety and reduced dune scatter. `scripts/region-baseline.json` records the previous terrain at the same default locations, and `scripts/region-metrics.mjs` measures comparable 10 km areas. Existing selective LOD buffer uploads and local scatter invalidation are retained; no additional terrain texture samplers or vertex attributes are introduced.

### Stable local shadows

The rover shadow map uses a 48 m footprint at 2048² resolution and radius-2 PCF filtering. Its light-space grid is snapped in planet coordinates before applying the floating origin, reducing camera-induced shimmer. This retains the existing map memory budget. Shadows remain local to rover mode; distant terrain dark areas are surface lighting, not this shadow map. `scripts/test-shadows.mjs` checks camera invariance and polar light directions.

### Water edge stability

Ocean fragments intersect an analytic sea-level sphere and write its projected depth, eliminating planar ocean-triangle depth errors at shorelines. Surface normals and ice latitude use that same sphere. Approach cameras use a tighter near plane for depth precision; balanced quality retains 2× MSAA where supported (high uses 4×). Terrain geomorphing still changes the shoreline as terrain detail resolves; this is not temporal antialiasing.


### Ocean surface response and close-range terrain

The analytic sea-level sphere retains its depth-correct shoreline intersection. Open water now uses a restrained view-angle reflection tint, two low-amplitude animated wave-normal bands and a narrow solar glint; polar ice remains rougher than liquid water. These effects change shading normals only, so wave animation cannot move the sea-level collision or shoreline. This is a lightweight procedural reflection approximation, not screen-space or ray-traced reflection.

High quality terrain refines one additional quadtree level near the camera (level 14; approximately 0.46 m base grid spacing on this 60 km body) to reduce close-range faceting. Balanced quality remains capped at level 12. The finer level is local to the camera and increases geometry work in the nearest patches.


### Cinematic coast and terrain inspection

Open `?view=coast` for an immediate coastal flight view, or `?view=terrain` for a close view of the reference basin. The Coast and Terrain buttons also switch views during exploration. Coast finds a real sea-level crossing of the current height field and respects dry worlds; it does not change the seed or sea level.

The rendering pipeline now resolves opaque terrain first, composites a fullscreen analytic sea into a separate colour/depth target, then integrates atmosphere using the resulting surface depth. Water includes depth absorption and shallow bottom visibility, guarded screen-space refraction, four filtered wind-wave normal bands, Fresnel sky reflection, bounded terrain screen-space reflection in High quality, GGX sunlight and a broken shallow-water foam band. Screen-space reflections fall back to the procedural sky outside available scene information. Waves currently change normals, not physical sea displacement.

Terrain adds a wet shoreline material response and screen-space geometric-error refinement to the existing distance and hysteresis rules. Local shadows also work in low-altitude free flight, and High quality includes short-range depth-based contact occlusion. Module release versions are consistent throughout the graph so the atmosphere, atlas, terrain, rocks and water share world settings. Balanced quality skips terrain screen-space reflections and contact occlusion. These changes are a visual development stage; they do not constitute the full rendering, asset and simulation stack of a commercial AAA game.

## Spectral ocean quality pass

Three deterministic 64×64 Phillips-spectrum bands (768 m, 137 m, 23 m) evolve using deep-water dispersion and inverse FFT. The WebGL2 renderer receives interpolated height/slope textures at 15 Hz, avoiding a renderer migration. Triplanar planet-space sampling avoids a longitude seam. A bounded radial intersection correction displaces visible open water, fading near shorelines, ice, grazing rays and orbital distances. Filtered wave energy broadens distant sun reflections; water reflects the same single-scattering coefficients and density profiles as the atmosphere. Broad mineral variation and warped terrain ridges improve altitude views. Vegetation is excluded.

This is not full Bruneton ocean BRDF or multi-scattering atmosphere: wave energy uses a simplified isotropic roughness approximation, displacement is radial (no horizontal choppiness), and shoreline foam is procedural rather than a shallow-water solver. CPU FFT updates measured about 5 ms per three-band update on the development machine; browser/GPU performance and visual appearance need inspection.

### Terrain distance correction
LOD now measures every cell centre rather than nine samples, with a 1.15 pixel high-quality error target. Vertex normals use a sampling footprint tied to mesh spacing to suppress unresolved ridge lighting. Scan blending follows pixel footprint, with mesoscale sediment/mineral and strata shading between ground and orbital views. Aerosol scattering and its scale height are reduced to retain terrain contrast. Visual confirmation is still required; the development cloud browser has no WebGL context.

The reference upgrade removes the previous 24 m and 120 m rock-scan bands. Distant colour now follows terrain-derived soil and exposed rock. High-quality mode uses up to 2× device pixel ratio and 16× anisotropy where supported.

Elevation material belts use latitude and a 6.5°C/km lapse rate, rainfall, atmospheric pressure and water availability. Temperate lowlands receive patchy grass surface color (no vegetation geometry); dry/hot/airless worlds retain mineral ground. Uplands expose cooler rock, with slope- and temperature-dependent snow accumulation and blue glacier ice. Climate uniforms update when changing planets or atlas settings.

Snow uses a continuous temperature/slope cover rather than coarse noise islands. Glacier tint is limited to cold, low-slope deposition hollows; fine directional fractures replace enlarged rock-scan brightness. Snow suppresses underlying rock normals and uses subtle wind drift relief.

### Eroded reference landscape

Open `?view=terrain&altitude=200` to inspect Nacre from 200 m. **Inspect terrain at** offers 2 m, 20 m, 200 m, 2 km and 75 km over the same location. **Surface view** exposes materials, drainage, soil/rock exposure, normals, pixel footprint, snow and sky visibility. Water is blue in diagnostic views. `planetExplorer.getState()` reports drawing-buffer resolution and active erosion statistics.

`terrain-data.js` generates a deterministic 513² height field spanning 8192 m at 16 m spacing, transports sediment with 100,000 hydraulic droplets, and relaxes talus over twelve thermal passes. Final heights determine flow accumulation, soil/exposure and an eight-direction horizon visibility estimate. Catmull-Rom reconstruction and bounded fine relief feed the existing quadtree and rendered-surface contact sampler. A worker prepares the data before entering the reference world, with up to three seed results cached. This establishes a local region, not connected planet-wide hydrology or texture streaming.

Colour scans are rank-transformed per channel into an approximately Gaussian distribution in a worker. Stochastic patch and triplanar blends normalize variance; an inverse-CDF lookup reconstructs linear albedo. This prevents the ordinary blend's contrast loss in the numerical fixture. It is a simplified per-channel implementation, without PCA colour decorrelation or mip-specific histogram correction. Source scans still define normal/roughness/height channels. Dedicated procedural snow/firn maps supply grain, crust, normals and roughness; grass remains surface colour rather than a captured grass material or vegetation mesh.

The atmospheric radiance model now supplies a prefiltered environment map for PBR sky lighting. Terrain-derived horizon visibility attenuates diffuse skylight. This improves coherent ambient response but does not add bounced global illumination or long-range terrain shadow maps. Initial erosion/material preparation adds loading time; the recorded Node fixture prepares and tests the reference in about 2.5 s, not a browser performance guarantee.

This implements the first reference-region milestone from [the research roadmap](docs/terrain-rendering-research.md). Full virtual texturing, KTX2 assets, captured outcrop geometry, planet-wide erosion and WebGPU migration remain future stages. Numerical tests and GLSL compilation pass; the development browser lacks WebGL, so the visual-quality gate remains open for live inspection.

### Fine geology and fractured outcrops

Use **Outcrops** or `?view=outcrops&altitude=20` for a downhill view of exposed bedrock. The height selector retains this inspection target at 2 m, 20 m, 200 m, 2 km and orbital range. The existing Terrain view remains available for direct landscape comparisons.

`terrain-detail.js` adds a continuous 2 m residual lattice to the 16 m parent field. Narrow channel segments connect downhill nodes from the parent flow map, sediment berms follow their margins, and selected exposed shoulders develop resistant ledges and broken rock. This is parent-guided geometric refinement, not a second hydraulic simulation or new source scan. Influence fades around the safe landing area and from 2.45–2.7 km. Tiles span 128 m with shared Catmull-Rom halos. Sparse fallback samples and worker-prepared tiles are rounded identically, so residency changes never alter mesh or contact heights. Workers prefetch neighbouring tiles with at most two requests outstanding. The main fine-tile cache holds at most 192 tiles, approximately 3.45 MB per cached reference world.

The default seed places 290 contour-aligned formations, each made from three fractured polygonal slabs with irregular roofs, chamfers and stepped faces. Eight geometric variants use the same physically scaled PBR surface pipeline as terrain. Foundation probes seat their bases inside the currently rendered ground; local LOD changes refresh their placement. Placement runs with a 4 ms CPU budget and gives nearby formations priority, while a rotating queue advances distant work. Formations reveal over 0.48 s and fade between 2.6–3.4 km; shadow shaders share their fades. Geometry is procedural, not photogrammetric.

Outcrop contacts use a spatial index and exact rays through the rendered, Float32 instance transforms and triangles. Terrain foundations query the ground alone, preventing collision feedback. Wheels, nearby scatter and camera clearance use the combined surface. Rover slope response includes the outcrops and blocks upward steps exceeding 1 m per movement step; this is still kinematic driving, not a rigid-body collision engine.

Run `node scripts/benchmark-detail.mjs` for the CPU stress fixture. On the development container, the 290 formations initialized over 27 budgeted calls; placement median was 4.27 ms and p95 4.86 ms under forced full-field invalidation. The existing 196-patch morph fixture remained about 0.54 ms median. These are CPU measurements, not browser frame rates. All nine exported shader variants link within the WebGL2 sixteen-sampler limit, including outcrop PBR lighting and shadows. GPU visual inspection remains required.
