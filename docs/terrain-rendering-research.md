# Aether: terrain fidelity research and implementation roadmap

Research date: 10 October 2026. Inspected renderer baseline: `d7984d26bd9ae51ea87477bfe78e16509e0d54bb`.

## Decision

Replace the current reliance on procedural color noise with a coherent terrain data pipeline, separate physical detail scales, and a measured material/geometry cache. Preserve seamless planetary exploration and GitHub Pages delivery. First prove one reference landscape from ground to orbit, then generalize it to planet profiles.

The recent shader changes improve individual symptoms but do not establish an AAA content pipeline. Higher output resolution, more noise, and more texture samples cannot invent missing landform structure. The audit below describes the recorded baseline; the architecture remains a staged roadmap.

## Current implementation — terrain-17

The reference/detail/formation pipeline now runs at the landing region on every landable solar-system planet. Shared rules select temperate catchments, dry mesas, volcanic shields/calderas, glacial troughs, or airless impact terrain. Hydraulic/thermal strengths and 2 m residual rules differ by profile; near-vacuum profiles do not run hydraulic droplets or carve subordinate water channels. Active volcanism can override the airless substrate. Each region retains its touchdown pad and the shared rendered contact path. Cache identity includes seed, temperature, pressure, activity, water and ice settings; same-seed profiles coexist in the worker. This generalizes representative regions, not metre-scale erosion over the entire sphere.

The material worker composes **linear albedo, roughness, occlusion, blend height, world-space relief-normal gradients, and geological overlays**. Both planetary parent masks and local eroded reference masks participate. Mineral veins and flow-associated sediment tint use the same substrate weights; relief normals are analytic derivatives of the blended mesoscopic height. Five profile palettes and distinct volcanic/glacial relief rules participate in this composition. Wet darkening requires enabled liquid water and suitable temperature/pressure; flow alone cannot make vacuum dust wet. Metre-scale scanned colour, normal and surface maps remain independently evaluated close up, with the cached geological tint and overlay roughness retained; arbitrary imported decal stacks and original scanned UV material baking are not implemented.

The virtual surface is 65,536 × 32,768 texels (approximately 5.75 m spacing at the equator). A 30-page cache, one-pixel shared halos, a resident coarse spherical parent, a local reference mask and a page table share one **1560 × 1813 RGBA8 atlas: 11,313,120 bytes**. The dimensions fit WebGL2's 2048 minimum maximum texture size. Parent sampling uses the same pole-reflected cubic reconstruction as worker masks. Procedural mesoscopic shading remains available when a page is absent. Unresolved page detail fades over 8–32 m footprints instead of magnifying/aliasing the page. A new page uploads four 130 × 130 rectangles and its mapping (270,404 bytes; an eviction also clears one four-byte mapping), rather than refreshing the complete atlas. World changes still perform a full clear/upload. Residency and geological-overlay diagnostics are selectable.

Ocean bands now compute real horizontal displacement with the same inverse FFT as height. Per-band deformation Jacobians drive compression foam; periodic semi-Lagrangian transport and exponential decay preserve history. Height slopes account for the horizontal deformation, and near water in High quality uses a first-order inverse of the choppy surface. The 15 Hz current/next height, foam and displacement textures stay synchronized. There are twelve 64² RGBA float textures; water uses 14 fragment samplers and terrain/outcrops remain within 16. Diagnostics include the last ocean CPU update duration and base-level texture budget.

The coastal region now runs a **worker-owned, first-order Saint-Venant solver** on the same 128² terrain-sampled bathymetry at 4 m spacing (508 m extent). Hydrostatic reconstruction and Rusanov face fluxes preserve lake-at-rest states and support wet/dry fronts. CFL-limited substeps, bed friction, reflective boundaries and an offshore wave-driving sponge control evolution. The sponge is an imposed sinusoidal incident condition, not a coupling to the FFT spectrum. Depth is capped at 32 m in the simulation; this is a bounded shallow-water region, not a global ocean solver. Wetness is stored and decays over 12 s after water recedes. Foam responds to flow compression/Froude number, travels with the depth-averaged flow, and decays over 3 s; this is an approximate breaking indicator, not resolved air entrainment or overturning geometry.

Two packed dynamic frames occupy unused 128² atlas rectangles below the static bathymetry/distance field. Height (±8 m, 16 bits), foam and wetness upload in two rectangles: **131,072 bytes per update**, targeted at 15 Hz. One request can be in flight; stale epochs cannot upload after recentering/world changes. The worker bounds catch-up to 0.2 s per request. Rendering interpolates the previous/current frame with a nominal one-update delay, applies simulated near-shore height/normal and thin run-up against actual opaque terrain depth, and shares stored wetness with ground darkening/roughness. Atlas allocation and sampler counts remain unchanged (water 15, terrain/outcrops ≤16). Frozen water suppresses run-up, and the timed analytic wash remains a worker-unavailable fallback. Numerical tests cover still water, conservation with forcing disabled, propagation, wetting/drying, bounded foam, worker transfers and reset isolation. A local Node 128² beach test averaged about 5.6 ms per 15 Hz update over four simulated seconds; this is not a browser/GPU frame-time claim. Visual/GPU acceptance remains open.

The worker now selects up to **128 active shallow breaking emitters** from flow compression/Froude production, with stable strength ordering. Lingering foam, dry cells and depths above 4 m do not emit. Six-float emitter records add at most 3,072 transferred bytes per update. A bounded **2,048-instance** pool launches deterministic ballistic droplet bundles with flow-directed horizontal velocity, gravity, 6–18 mm sprite radii and lifetimes below 0.85 s. These sprites approximate unresolved spray; they are not an air/water simulation or physically sized individual drops. Reset/recentering clears particle history, frozen/debug views hide spray, and expired particles stop drawing. The spray pass runs after water in the same target with existing water/terrain depth tests, alpha blending and depth writes disabled. It adds no sampler or texture allocation; instance buffers total 81,920 bytes. All eleven shader programs link. Moving-camera visual appearance, blending/sorting and GPU cost remain unverified in a working WebGL browser.

Active shallow breaking fronts also drive **parametric overturning sheets** in High quality. Selection requires positive compression production, moving shallow water (0.08–3 m depth) and water elevation above mean sea level greater than 35% of local water depth. Every cell is considered so a narrow wet front is not skipped. Up to 32 spatially separated sources (at least 12 m apart) supply position, water level, flow, breaking intensity and depth. A 48-sheet pool retains matching fronts across updates and animates each sheet through a 1.2 s growth/curl/collapse cycle. Radius is bounded by depth and 0.5 m; the cross-section folds past vertical, while its lateral edges taper back to the sampled coastal water surface. Analytic sheet tangents determine the normal, shared sky radiance supplies reflection, and the lip grades into a foam-like film. The existing atlas supplies current water height and wet coverage in the vertex stage. The sheets render after water and before spray, with depth tests/writes and double-sided alpha blending; frozen/debug/Low-quality views suppress them and world/recenter resets clear history. Each sheet has 384 triangles, capped at 18,432 triangles; source records add at most 896 bytes per worker update. All twelve shader programs link. A 60 s numerical beach run activated at most 20 simultaneous sheets within the fixed 48-sheet pool.

These sheets are a bounded visual closure, not physically reconstructed overturning geometry from the Saint-Venant equations. They do not model impact volumes, entrained air or mass exchange with spray. Appearance, transparent ordering, transitions at the base and representative GPU cost still require browser visual acceptance. The fluid solver remains depth-averaged.

| Gate | Latest evidence | Status |
| --- | --- | --- |
| Five detailed representative planet profiles | Distinct geometry, safe touchdown, boundary continuity, shared fine halos, rendered contacts, climate invalidation and production-worker cache isolation | Numerically passed |
| Regional material composition and bounded streaming | Four-channel worker transfers, analytic normal/height agreement, longitude halos, atlas-bank separation, 30-page eviction/reset and bounded rectangle uploads | Numerically passed |
| Horizontal ocean deformation and foam transport | Hermitian displacement, Jacobian compression, periodic edge transport, decay/rewind isolation and current/next texture scheduling | Numerically passed |
| Coastal fluid region | Lake-at-rest balance, closed-domain volume, wave propagation, positivity, run-up, foam bounds, stored drying, worker/frame isolation and atlas uploads | Numerically passed |
| Solver-driven spray | Active-breaking selection, dry/deep exclusion, deterministic pool bounds, ballistic lifetime, reset isolation and depth render state | Numerically passed |
| Overturning sheet approximation | Source spacing, wet/shallow exclusion, lifecycle matching, pool bounds, folding cross-section, tapered edges and depth render state | Numerically passed |
| GLSL compatibility | All twelve exported programs link; terrain/outcrops ≤16 samplers, water 15 | Passed |
| Moving ground-to-orbit visual acceptance and representative GPU frame times | Available environment does not provide a working browser WebGL context | Open |
| Shallow-water coastal solver | First-order depth-averaged solver, incident sponge, foam transport and stored wetness are implemented for one bounded region | Implemented; visual acceptance open |
| Breaking-wave spray | Solver-driven ballistic droplet bundles implemented; visual acceptance remains open | Implemented; visual acceptance open |
| Overturning/breaking surf geometry | Solver-driven parametric sheets implemented as a visual approximation; physically reconstructed overturning and impact volumes remain open | Visual approximation implemented; acceptance open |
| Full scanned PBR and arbitrary decal-stack page baking | Regional procedural PBR/overlays are composed; fine scans remain shader evaluated | Open |
| WebGPU/clipmap/CBT migration | Requires measurements identifying a bottleneck; no speculative backend migration | Deferred |

The older milestones below record what was delivered at each revision. This section supersedes their remaining-work statements. Numerical/shader checks are not a claim of photorealism, a passed visual comparison, or native 1080p 60 fps.

## Implementation status — first reference region

The first implementation adds worker-generated hydraulic/thermal erosion to Nacre's reference area, cached metre-based heights, terrain-derived soil/exposure/drainage/horizon masks, shared rendered-surface contact, per-channel Gaussianized stochastic colour blending, dedicated procedural snow maps, atmospheric PBR environment lighting, and fixed inspection heights with seven surface diagnostics. Enlarged 24 m and 120 m rock scans are removed. The 8192 m grid has 16 m samples, full influence inside a 2.7 km radius and a smooth transition ending at 3.9 km.

The next implementation adds 2 m parent-guided geometric refinement in shared-halo tiles, narrow connected channels, sediment margins and resistant ledges. A bounded worker-prefetched cache preserves identical fallback/resident heights. Fractured contour-aligned outcrop meshes use embedded foundations, terrain PBR materials, matching shadow fades and exact triangle contacts. Placement is budgeted across frames. The default seed contains 290 formations; the Outcrops inspection target provides the same height presets as Terrain.

Determinism, region continuity, height-gradient continuity, contact parity, worker transfers, cache bounds, embedded foundations and contrast reconstruction pass numerical tests. All nine GLSL program pairs compile and link within the WebGL2 minimum sampler budget, including terrain and outcrops with environment lighting. Visual acceptance remains open because the development browser cannot create WebGL. This was the reference-region milestone. The implementation below extends it; visual acceptance remains separate from code and numerical checks.

## Remaining-roadmap implementation — terrain-11

- **Connected world data:** `planet-data.js` builds a deterministic 256×129 spherical field with 32,514 unique graph nodes, wrapping longitude and sharing each pole. Priority-flood routing connects depressions to sea outlets (or a minimum on dry worlds); six erosion/deposition passes derive soil, exposure, flow and shelter. Its approximately 1.47 km meridional spacing is a global routing backbone, not metre-scale planet-wide erosion. The correction shares the existing rendering/contact height path and fades away around the proven reference region. Cache identity includes all terrain configuration, with three resident worlds and generation-tagged requests.
- **Material residency:** a worker composes 128² soil/exposure/drainage/horizon pages with matching one-pixel halos. A 32-page GPU atlas shares the existing reference-mask sampler with a page table and the local reference mask. Parent vertex data is always available, old mappings are invalidated on eviction, and world changes discard stale replies. The atlas occupies 4,330,560 bytes. Residency diagnostics show parent versus page data. This caches layer masks; it does **not** yet bake every PBR channel and decal into streamed material pages.
- **Distributable textures:** thirteen KTX2 assets include full mip chains, ETC1S sRGB colour and UASTC linear Gaussian colour, data maps and normal slope moments. Three.js r186's loader/transcoder dependencies are vendored. Input images are vertically flipped during encoding to match the existing texture convention. Source-image preparation remains a fallback when compressed loading fails. Gaussian maps and inverse histograms are prepared offline on the compressed path. Checked-in compressed files total 42,078,137 bytes; this is a download-size measurement, not a frame-rate claim.
- **Filtered normals:** custom mip chains filter slope means and second moments separately, recovering an isotropic unresolved variance used in terrain roughness. Flat-surface and opposing-slope tests cover the calculation. This is an isotropic approximation, not full anisotropic LEAN or PCA/mip-corrected histogram reconstruction.
- **Captured geometry:** a CC0 Poly Haven `rock_face_01` proxy supplies one outcrop variant, simplified from 20,174 to 1,500 triangles with reported relative error 0.00913. Its original dimensions are retained with bounded scale variation; embedded foundations, triangle contacts and matching shadow fades use the existing formation path. The material remains the terrain's triplanar substrate, rather than the scan's original UV texture set. Other formations remain procedural.
- **Ocean statistics:** reflection roughness now uses a table of unresolved slope variance calculated from the three actual wind spectra. Crest-foam energy persists with a three-second exponential decay. This remains a steepness-based approximation: horizontal-displacement Jacobians, transported foam, run-up/wet sand and breaking surf are not implemented.
- **Measurement:** exportable diagnostics record browser/GPU identity, drawing-buffer size, camera/sun/world settings, bounded frame interval and CPU percentiles, optional disjoint-safe GPU timings, surface texture-byte estimates and cache residency. Direction-aware prefetch extends fine terrain and material-mask requests.
- **World rules:** the global generator applies reduced weathering to cold, hot and near-airless configurations. Organic ground is an explicit disabled-by-default capability; water/air do not imply biology. The existing climate/region system still provides planetary surface identity. The full reference erosion/detail/formation pipeline has not been replicated in every planetary profile.

### Acceptance status after terrain-11

| Gate | Evidence | Status |
| --- | --- | --- |
| Deterministic heights, wrapped routing, poles and contacts | Numeric tests plus the real worker module graph | Passed |
| Bounded mask-page residency and invalidation | Halo, longitude seam, eviction and reset tests | Passed |
| KTX2 containers, full mips and normal-moment chains | Checked-in asset tests and loader dependency import | Passed |
| GLSL compatibility / minimum sampler budget | All ten exported program pairs compile and link; terrain/outcrops use at most 16 samplers | Passed |
| Ground-to-orbit visual comparisons and moving descent | Requires a browser with working WebGL | Open |
| Native 1080p 60 fps on a named GPU | Diagnostics implemented; no representative GPU capture available | Open |
| WebGPU/clipmap/CBT migration | Conditional on a GPU profile establishing a bottleneck | Deferred, not implemented |
| Fully composed PBR/decal page streaming, complete profile rollout, advanced surf | Not covered by the mask cache or coarse routing backbone | Open |

Do not describe the entire AAA roadmap as accepted. The remaining visual and performance gates cannot be passed by numerical tests, and the broader items above remain actual engineering work.


## Findings from the audited baseline

| Area | Observed implementation | Consequence / proposed correction |
| --- | --- | --- |
| Material assets | Three scanned families; color/normal images 2048²; packed roughness/AO/height images 1024² | Ground scans are already detailed. Expand material identity and structure before increasing every image to 8K. |
| Physical scale | Close scans cover approximately 1.5–2 m; the rock scan is also mapped over 24 m and 120 m | Enlarging a close scan enlarges its features. It supplies texture but does not supply convincing regional geology. |
| Stochastic mapping | Three random patches blended per active triplanar axis, with shared transforms across PBR channels | Randomization helps repetition; ordinary weighted blending can reduce contrast. The current code has no histogram-preserving color transform. |
| Geometry | Six cube-face quadtrees, 16×16 cells per patch, up to level 14 in High quality, stitched/morphed edges | Keep the working continuity system initially. Supply better multiresolution heights; investigate GPU displacement after measurement. |
| Landforms | Warped noise, crater shapes and a small set of regional templates; local synthetic tributary graph | These are useful starting forms, not a general hydraulic/thermal erosion model. |
| Surface masks | Three interpolated attributes for deposition, bedrock and regional influence; most global terrain receives zero geology attributes | Materials outside the reference areas rely heavily on slope and unrelated noise. Build shared flow, soil and exposure maps. |
| Snow / grass | Temperature/slope masks plus procedural colors and adjusted roughness/normal strength | These are not dedicated snow, ice or organic-ground PBR assets. Color cannot create their optical/physical behavior. |
| Lighting | Direct sun, hemisphere ambient, single-scattering atmosphere, short-range screen-space contact AO | Material relief and distant forms lack sufficiently coherent indirect lighting and wider terrain occlusion. |
| Water | Three CPU FFT bands of 64² samples; radial displacement; simplified footprint roughness; screen-space terrain reflections | A good prototype foundation, but not a complete multiscale ocean BRDF or shoreline simulation. |

These observations are a code audit. Their exact contribution to a particular screenshot requires GPU diagnostics. An image cropped to a nearly uniform surface does not reliably identify whether it is terrain snow, frozen ocean, or another material.

## Resolution is three separate budgets

1. **Source detail:** the geometry, textures and material masks actually contain the feature.
2. **Resident detail:** the necessary mesh/texture pages are loaded at the correct resolution.
3. **Screen detail:** the feature covers enough pixels and survives filtering and lighting.

Aether's nominal 2048-pixel scan over 2 m has 1024 texels/m, about 0.98 mm per texel before random scale transforms. The same image over 24 m has about 85 texels/m; over 120 m, about 17 texels/m. These numbers say nothing about whether the pictured feature belongs at those physical scales.

At nadir, a 60° vertical field of view, 1080 image pixels vertically, and 1000 m above a flat surface imply about 1.07 m per pixel: `2 * altitude * tan(FOV/2) / imageHeight`. Oblique views have a larger, anisotropic footprint. Millimetre gravel cannot remain individually resolved there. Channels, outcrops, snow distribution and terraces can. Distant fidelity therefore requires meaningful larger structures and correctly filtered material statistics, rather than the persistence of every tiny stone.

Do not globally sharpen or force negative mip bias to hide a lack of structure. First establish texture residency, footprint and geometry error; excessive sharpening can exchange blur for shimmer.

## Lessons from public production and research sources

**Star Citizen — scale-specific content and geology.** A 2019 interview with CIG environment artists describes separate global planet appearance, regional height/material maps, and close ground/geology materials. It also discusses hydraulic, thermal and wind erosion, and using flow to influence color. The applicable lesson is to derive related data from a common landform model. This is a published historical workflow, not a claim to know the full current Genesis implementation. [1]

**Far Cry 4 — adaptive virtual texturing.** Ubisoft's GDC presentation uses a physical page cache and adapts virtual image sizes by terrain sector. It discusses caching material composition and decals, filtering across pages, and spreading page generation over frames during travel. Virtual texturing makes rich content affordable; it does not generate missing geological structure. [2]

**Unreal — geometry and texture virtualization are distinct.** Epic describes hierarchical geometry clusters and demand streaming in Nanite, while treating virtual textures as a separate system. Nanite's displacement facilities add geometry detail from material data. This supports separating Aether's geometry and texture budgets; it does not imply that Nanite can be enabled in Three.js. [3]

**Stochastic textures — preserve the distribution.** Heitz and Neyret explain why ordinary patch blending can soften features and reduce contrast. Their histogram-preserving method transforms the input before blending and reconstructs its distribution afterward. Aether currently implements random tiling without that full preprocessing/reconstruction step. Applicability must be tested by material: structured rock beds need directional mapping rather than arbitrary rotation. [4]

**Horizon — placement is a system.** Guerrilla's public description of Horizon Zero Dawn discusses runtime procedural assembly around the player. For Aether, translate this into terrain-conditioned rock/outcrop placement with persistent identities and predictable residency, rather than uniformly distributed variations of one shape. [5]

**Battlefront — captured content matters.** DICE's GDC session describes its use of photogrammetry as part of an artistic production workflow. Scanned terrain and outcrop examples provide a stronger benchmark than visually plausible noise alone. [6]

**Geometry clipmaps and concurrent binary trees — scalable detail.** Clipmaps provide nested cached terrain grids with continuous transitions. More recent CBT research extends GPU adaptive subdivision to planetary geometry. These are alternatives worth benchmarking, not reasons to immediately discard Aether's working cube-face continuity and contact system. Native research timings must not be treated as browser performance promises. [7][8]

**Filtered normals — retain unresolved surface behavior.** LEAN mapping represents normal distributions so filtering can change the highlight correctly instead of just averaging away the bumps. This is relevant to distant ice, wet rock and water. Adapting it to Aether's BRDF needs explicit validation. [9]

## Proposed Aether architecture

The following parameters and modules are design proposals, not documented universal AAA settings.

### Shared world data

Use deterministic world tiles keyed by planet ID, seed, generator version, cube face, level and coordinates. Generate or load them in workers; cache them independently of the mesh cache.

Each tile should expose height and residual height levels, material IDs/weights, soil depth, sediment, flow accumulation, wetness, curvature, snow mass/exposure and placement constraints. Maintain one authoritative height representation for rendering and contact. Never duplicate a subtly different erosion or displacement algorithm in the rover path.

Hydrology must connect across tile boundaries. Independently eroding random tiles with a small border is insufficient for large river networks. Start with coarse connected drainage, then refine inside tiles with halos and fixed boundary conditions. Coordinate terrain normals, mask downsampling and residual heights across cube-face seams.

Climate determines weathering and surface inventories; geology determines substrate. Water and temperature do not automatically imply life. Give planets an explicit biological/organic-ground capability. Keep surface grass materials separate from optional vegetation geometry.

### Separate content by physical scale

| Scale | Data/content | Representation |
| --- | --- | --- |
| Planet / tens of kilometres | Continental shape, major ranges, impact basins, mineral provinces and ice sheets | Coarse planetary height/albedo/classification pyramid |
| Kilometres to hundreds of metres | Eroded ridges, drainage, glaciers, canyon systems and depositional areas | Regional height tiles and coherent material masks |
| Hundreds to a few metres | Outcrops, gullies, talus, bed orientation, snow drifts and sediment fans | Height residuals, regional normal maps, directional materials, embedded meshes and decals |
| Metres to centimetres | Surface cracks, gravel, soil, snow grain and exposed rock | Physically scaled PBR scans, selective parallax and bounded near-field relief |
| Below a pixel | Unresolved surface variation | Filtered roughness / normal statistics and averaged color |

The scale ranges overlap intentionally. Geometry, color and shading should all represent the same formation while gradually changing representation. Do not blend different unrelated scenes according to camera distance.

### Materials

Start with a compact reference library: appropriate bedrock, fractured rock, talus, fine sediment, sand/gravel, snow and ice; add organic ground only for applicable worlds. Author base color without baked directional lighting, consistent normal orientation, calibrated roughness and height in physical units. Calibrate height midpoint and amplitude across material transitions.

Use histogram-preserving stochastic sampling for suitable granular textures. Preserve bed orientation for stratified rock and wind direction for dunes. Use a shared height-aware blend for all PBR channels. Avoid strong disconnected color noise that ignores soil, flow or substrate.

Bake complex regional layer composition and decals into cached material pages. Evaluate fine local detail separately where useful. Start with a modest tile material cache in WebGL2; add a full virtual page table and feedback only when the residency profile justifies it. Never freeze view-dependent lighting into reusable material pages.

Compress distributable textures with KTX2/Basis and device-appropriate GPU formats. Favor quality-sensitive encoding for normal/roughness data; keep authoritative terrain heights at sufficient precision rather than blindly putting them into an 8-bit lossy material codec. Khronos explains the different color/data tradeoffs, and Three.js provides KTX2 loading. [10][11]

### Geometry

Keep the cube-face quadtree for the first reference area, with screen-space error and existing morph/stitch behavior. Replace repeated CPU procedural evaluation with cached terrain samples and residuals. Add conservative vertex displacement only where the mesh can resolve it. A normal map changes lighting, not silhouette or collision.

Use selective parallax occlusion for near views of suitable surfaces. It also does not change silhouettes, shadows or rover contact by itself, so it should not carry large relief. Large cracks and ledges need real geometry or embedded meshes. Contact sampling must include any displacement large enough to affect the tyres.

Later compare a GPU height-grid/clipmap path with adaptive CBT subdivision. A hybrid local grid under a planetary quadtree needs explicit transition ownership: no overlapping surfaces, double drawing or divergent collision heights.

### Lighting, water and presentation

Establish calibrated neutral lighting before tuning the atmosphere. Add sky/environment illumination and cached terrain horizon visibility; then compare under multiple sun angles. Use local contact AO to complement broader occlusion, not to paint every surface dark. Diagnose haze and tone mapping with material and atmosphere debug modes.

Preserve current FFT water initially. The later ocean pass should measure each cascade's missing slope variance and transfer it into the distant reflection model, add controlled horizontal choppiness and persistent foam, and provide a shoreline-specific solution. Increasing FFT size alone is not enough. Frozen ocean must be a dedicated ice material, separate from land snow.

Keep native resolution as the reference. Add temporal antialiasing only with reliable motion vectors, disocclusion handling and LOD-aware history rejection; assess trails and blur during descent before accepting it. Upscaling is a performance tradeoff after source detail is credible.

## WebGL2 versus WebGPU

WebGL2 can deliver a substantial visual improvement using good terrain data, workers, cached material tiles, real embedded rock assets and disciplined filtering. Keep it for the first content proof.

WebGPU becomes useful when GPU generation, subdivision, culling, FFT and cache composition dominate. A migration to Three.js WebGPURenderer is not a constructor substitution: current `onBeforeCompile` and ShaderMaterial customizations need to be ported to node materials/TSL. Its WebGL2 fallback does not remove the need for a fallback implementation of compute-dependent algorithms. [12]

Do not begin by attempting to reproduce the entire Nanite renderer. First demonstrate the visual result with a smaller terrain-specialized system, then spend on the bottlenecks the GPU captures actually show.

## Implementation sequence and acceptance gates

### 1. Diagnose and establish a reference

Add reproducible camera sites/paths and debug modes for surface identity, material weights, selected mip, pixel footprint, height, normals, mesh spacing, snow, water depth, cache residency and atmosphere. Record browser/GPU, drawing-buffer dimensions, frame-time percentiles and texture memory estimates.

Capture the same area at approximately 2 m, 20 m, 200 m, 2 km and orbital range, plus grazing light. Include a moving descent and a cold surface. Determine whether a suspect pale surface is land snow or sea ice before changing its shader. Shader compilation and numerical tests cannot pass the visual-quality gate.

### 2. Prove one coherent landscape

Build a roughly 4×4 km reference region with eroded landforms and aligned height/material/placement masks. Add dedicated rock, sediment, snow/ice assets where relevant and correctly scaled detail. Compare current and proposed stochastic blending on identical lighting and source textures.

Gate: clear drainage and outcrop structure from altitude; convincing scale and relief at ground level; no coarse noise camouflage. Approval is a visual comparison, not a promise of AAA equivalence.

### 3. Cache and stream without losing the result

Implement worker tile generation, stable tile keys, parent fallbacks, bounded GPU memory, cache invalidation, coarse-to-fine scheduling and travel-direction prefetch. Add KTX2 assets and material tile composition. Keep a usable parent resident until a child and its neighbours are ready.

Gate: no visible blank tiles, recurring texture blur, seam cracks or CPU stalls during the reference descent; sustain a declared performance target on a named GPU. A provisional desktop goal is 60 fps at native 1080p, subject to baseline measurement; no mobile or 4K guarantee is implied.

### 4. Add meaningful physical relief and lighting

Add near-field displacement/contact parity, embedded outcrop meshes, terrain occlusion and indirect illumination. Validate discontinuities at mesh/cache LOD boundaries and between rock assets and terrain.

Gate: close silhouettes, contact and shadows agree; surface detail remains stable under movement and changing sun direction.

### 5. Generalize to planets and advance the GPU path

Convert the proven region generator/material rules into dry, temperate, volcanic, glacial and airless profiles. Retain common world data and use planet-specific inventories. Migrate costly stages to WebGPU selectively if profiling supports it; upgrade ocean multiscale shading after terrain fidelity is established.

Gate: each world has a distinct geological/material identity rather than a common texture recolored; representative regions pass the same ground-to-orbit capture suite.

## Source list

1. [CIG environment artists: Star Citizen texturing and terrain production, Adobe Substance interview (2019)](https://www.adobe.com/products/substance3d/magazine/star-citizen-texturing-sci-fi-open-world-game-substance.html).
2. [Ka Chen, Ubisoft: Adaptive Virtual Texture Rendering in Far Cry 4, GDC 2015 slides](https://media.gdcvault.com/gdc2015/presentations/Chen_Ka_AdaptiveVirtualTexture.pdf).
3. [Epic: Nanite Virtualized Geometry](https://dev.epicgames.com/documentation/unreal-engine/nanite-virtualized-geometry-in-unreal-engine).
4. [Heitz and Neyret: High-Performance By-Example Noise using a Histogram-Preserving Blending Operator (HPG 2018)](https://eheitzresearch.wordpress.com/722-2/); [Deliot and Heitz practical follow-up](https://eheitzresearch.wordpress.com/738-2/).
5. [Guerrilla: GPU-Based Procedural Placement in Horizon Zero Dawn (2017)](https://www.guerrilla-games.com/read/gpu-based-procedural-placement-in-horizon-zero-dawn).
6. [DICE: Photogrammetry and Star Wars Battlefront, GDC 2016](https://www.gdcvault.com/play/1023272/Photogrammetry-and-Star-Wars-Battlefront). Session description reviewed; this research does not claim to have watched the full video.
7. [Asirvatham and Hoppe: Terrain Rendering Using GPU-Based Geometry Clipmaps, GPU Gems 2](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-2-terrain-rendering-using-gpu-based-geometry).
8. [Benyoub and Dupuy: Concurrent Binary Trees for Large-Scale Game Components (2024)](https://arxiv.org/abs/2407.02215), [SIGGRAPH 2024 presentation abstract](https://advances.realtimerendering.com/s2024/).
9. [Olano and Baker: LEAN Mapping](https://userpages.cs.umbc.edu/olano/papers/lean/).
10. [Khronos: KTX 2.0 / Basis Universal Developer Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXDeveloperGuide.md).
11. [Three.js: KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html).
12. [Three.js: WebGPURenderer overview and migration constraints](https://threejs.org/manual/pages/webgpurenderer).

Public production sources explain particular published implementations, not one universal AAA standard. Proposed parameters and priorities above are engineering recommendations for Aether. Browser visual verification remains outstanding because the available cloud browser cannot create a WebGL context.

### Procedural shoreline foam revision (terrain-10)

The supplied close shoreline capture showed coarse, regularly spaced white blobs. The previous implementation thresholded a single metre-scale value-noise field. This revision separates patch coverage from bubble film: two jittered cellular layers at approximately 5.6 cm and 16 cm site spacing use the gap between nearest and second-nearest distances to form thin films. A warped, two-scale envelope controls clustered coverage; shallow-depth modulation provides an animated wash. Arithmetic hashing replaces the sine hash. World-space triplanar projection avoids polar texture stretching. Unresolved cellular layers converge toward their estimated mean film coverage (0.27), rather than becoming larger bubbles or aliasing; expensive cell searches are skipped once unresolved and in foam-free deep water. Foam receives rough diffuse/sky lighting and masks the sharp water reflection.

This is an artistic procedural surface approximation, not exact fluid mathematics. There is no persistent transported foam field, wet-sand run-up, bubble coalescence simulation, or overturning surf. Crest coverage remains a height/steepness heuristic. NVIDIA's primary CGDC 2015 presentation explains the more complete path: horizontal-displacement Jacobian detects compression/breaking, turbulent foam energy accumulates then dissipates exponentially and spatially, and shore distance fields orient incoming waves. These require additional simulation work; the present radial-displacement ocean does not provide that Jacobian. Source: https://developer.download.nvidia.com/assets/gameworks/downloads/regular/events/cgdc15/CGDC2015_ocean_simulation_en.pdf (slides 13–18, 23–35). Shader linking and existing numerical regressions verify compatibility, not photorealism or browser frame rate.

### Regional material channels (terrain-12)

The worker now composes linear albedo and packed roughness/occlusion/blend-height alongside geology masks. All channels share world coordinates and one-pixel halos, and the same bounded 32-slot residency table. The combined atlas occupies 8656960 bytes; no additional fragment sampler is required. Parent shading evaluates the same regional substrate rules to avoid a residency-dependent material change. Climate blankets and scanned close-up detail remain shader-evaluated. Height is stored for future regional blending, not geometric displacement.

This is regional substrate composition, not complete scanned PBR/decal baking: cached normals, decal inventories, detailed erosion across all planetary profiles, advanced surf, and browser GPU/visual acceptance remain open.
