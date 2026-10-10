# Aether: terrain fidelity research and implementation roadmap

Research date: 10 October 2026. Inspected renderer baseline: `d7984d26bd9ae51ea87477bfe78e16509e0d54bb`.

## Decision

Replace the current reliance on procedural color noise with a coherent terrain data pipeline, separate physical detail scales, and a measured material/geometry cache. Preserve seamless planetary exploration and GitHub Pages delivery. First prove one reference landscape from ground to orbit, then generalize it to planet profiles.

The recent shader changes improve individual symptoms but do not establish an AAA content pipeline. Higher output resolution, more noise, and more texture samples cannot invent missing landform structure. The audit below describes the recorded baseline; the architecture remains a staged roadmap.

## Implementation status — first reference region

The first implementation adds worker-generated hydraulic/thermal erosion to Nacre's reference area, cached metre-based heights, terrain-derived soil/exposure/drainage/horizon masks, shared rendered-surface contact, per-channel Gaussianized stochastic colour blending, dedicated procedural snow maps, atmospheric PBR environment lighting, and fixed inspection heights with seven surface diagnostics. Enlarged 24 m and 120 m rock scans are removed. The 8192 m grid has 16 m samples, full influence inside a 2.7 km radius and a smooth transition ending at 3.9 km.

The next implementation adds 2 m parent-guided geometric refinement in shared-halo tiles, narrow connected channels, sediment margins and resistant ledges. A bounded worker-prefetched cache preserves identical fallback/resident heights. Fractured contour-aligned outcrop meshes use embedded foundations, terrain PBR materials, matching shadow fades and exact triangle contacts. Placement is budgeted across frames. The default seed contains 290 formations; the Outcrops inspection target provides the same height presets as Terrain.

Determinism, region continuity, height-gradient continuity, contact parity, worker transfers, cache bounds, embedded foundations and contrast reconstruction pass numerical tests. All nine GLSL program pairs compile and link within the WebGL2 minimum sampler budget, including terrain and outcrops with environment lighting. Visual acceptance remains open because the development browser cannot create WebGL. This is a reference-region milestone, not completion of the whole roadmap: global connected erosion, material page streaming, KTX2 conversion, photogrammetric outcrops, normal-distribution filtering and WebGPU work remain unimplemented. Gaussianization is per channel without PCA or mip-specific histogram correction; new snow maps and outcrop geometry are procedural, not scanned. The finer terrain is a structured residual on the existing eroded field, not separately eroded tiles. No GPU frame-rate target has been established.

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
