# Nature Studio: procedural leaves and WebGPU rendering

Research and first implementation: 22 October 2026. Implementation uses the repository's pinned Three.js 0.186.0 WebGPU backend. Open `index.html#/nature` from the shared Aether shell (DEV → Nature Studio).

## Findings and design decision

A leaf is a thin, curved, heterogeneous scattering surface with a hierarchical vascular system. More random noise is not a substitute for its structure. The first implementation prioritizes silhouette, curvature, coordinated veins and tissue shading. It is an authoring study and instancing demonstrator, not yet a planetary vegetation system or measured botanical reproduction.

Separate three problems: generating an asset, drawing many copies, and representing a canopy when individual leaves become subpixel. Generate expensive detail once, reuse GPU resources, and reduce representation complexity with projected screen size. WebGPU does not remove fragment overdraw, texture bandwidth, aliasing or CPU submission costs.

## 1. Composition from organ scale to tissue scale

- **Petiole and midrib:** the attachment establishes the bending anchor. The vascular hierarchy should taper from midrib to secondary and tertiary veins. A petiole mesh and junction into branches remain future work; the current blade is anchored at its base.
- **Lamina outline:** leaf length, width, location of maximum width, apex, base, lobes, teeth and left/right asymmetry are independent useful authoring dimensions. Outline should agree with veins: oak secondaries tend toward lobes; birch teeth and secondaries should eventually share landmarks.
- **Three-dimensional blade:** longitudinal bending, transverse cupping, torsion, corrugation around veins, tip droop and edge curl operate at different scales. A perfectly flat quad cannot reproduce a close-up silhouette.
- **Surface:** cuticle and wax affect roughness and specular highlights. Veins alter height and local transmission. Pigment variation should be spatially correlated, not independent RGB noise.
- **Front/back:** upper and lower epidermis can have different brightness, roughness, hairs and visible vein relief. The first material has a modest underside color difference; separate side-specific roughness and relief are still needed.
- **Microstructure:** epidermal cells and stomata are usually too small for explicit game geometry. Fade normal detail through mipmapping and eventually use normal-variance roughness filtering to prevent sparkling.
- **Life history:** young, mature and senescent tissue should vary coherently. Damage should follow meaningful edge tears, insect holes or localized lesions. The current age control is an artistic pigment/dryness approximation, not a biochemical simulation.

## 2. Shape and venation algorithms

Runions et al. (2005) describe growth toward auxin sources, removal/redistribution of sources near veins, and changes caused by leaf growth. Both open branching and closed reticulate networks are supported. Their model is a strong basis for a future constrained vein solver, rather than drawing arbitrary branching noise [1].

Recommended production authoring sequence:

1. Establish outline landmarks and the primary midrib.
2. Place species-conditioned secondaries with varying insertion angle and spacing.
3. Grow tertiary veins toward bounded attractors within the lamina, using a spatial grid for neighbor queries.
4. Add controlled anastomoses for reticulation; reject crossings inconsistent with the chosen venation class.
5. Compute widths from downstream demand, taper terminals, and rasterize the resulting graph into multiple material channels.
6. Relax the blade into a curved surface while keeping one UV parameterization across geometry and maps.

The first implementation deliberately uses a simpler deterministic hierarchical graph, curved secondary paths, small branches and cross connections. It does **not** implement the auxin solver or Voronoi network from the paper. One graph supplies height and transmission cues so those cues stay coordinated. Silhouette is a parameterized half-width function, not a biological growth simulation. Birch, oak and willow are visibly distinct species-inspired families; botanical fidelity needs reference matching.

For authoring, generate a small bank of genuinely different seeded leaves per species. Instance those variants with size, orientation, pigment and phase variation. Thousands of unique 1K texture sets would defeat the memory budget.

## 3. Leaf optics

PROSPECT models spectral reflectance and transmittance using chemical constituents and a structure parameter [2]. This supports separating pigment absorption from surface reflection and tissue scattering. It does not imply that an RGB green tint or a generic glass material is an accurate leaf model.

Use a dielectric surface (metalness zero), spatial roughness, restrained tangent-space normals and two-sided shading. The view should respond to backlighting: thin lamina transmits more than the midrib. Avoid emissive fake glow, which remains visible without illumination, and avoid glass-like refraction for ordinary foliage.

The implemented `MeshSSSNodeMaterial` is Three.js's experimental approximate scattering extension [3]. A packed linear texture controls transmission weight and roughness; albedo is sRGB and normals are linear. This is a controllable lighting approximation, **not** spectral PROSPECT, thickness in millimetres, or energy-conserving measured leaf transport. A later custom foliage BSDF should explicitly budget reflected/transmitted diffuse energy and independently model upper/lower surfaces.

Test under front light, grazing light, rear light and neutral illumination. Avoid approving a material from one attractive backlit view alone.

## 4. Geometry and distance representation

Initial budgets are engineering starting points, not measured optimal settings:

| Level | Screen height | Current representation | Triangles per leaf |
|---|---:|---|---:|
| LOD 0 | >280 CSS pixels | 64 × 16 curved grid | 2,048 |
| LOD 1 | 80–280 px | 16 × 8 curved grid | 256 |
| LOD 2 | 18–80 px | 4 × 4 curved grid | 32 |
| LOD 3 | <18 px | 2 × 2 coarse blade | 8 |

The study estimates projected size from leaf length, camera FOV, viewport height and distance to the population center. Ten-percent hysteresis prevents rapid switching near thresholds. This is population-wide LOD, not per-instance GPU selection; rotated/scaled instances and depth spread only approximately match the estimate. Geometry switches can still pop. Fine serrations are intentionally lost in coarse geometry. Zoom out or force a level to inspect the tradeoff.

For production use, move from leaves to branch clusters and then whole-canopy impostors. Do not draw every individual leaf indefinitely, even if each has only two triangles. Preserve canopy coverage, depth layering, normal distribution and approximate self-shadowing. Cross-fade adjacent representations with a stable dither, accounting for temporal AA and avoiding doubled shadow density during transitions.

At middle distance, use tight cutout meshes instead of enormous transparent rectangles. Alpha testing avoids transparency sorting but still costs fragment work. Alpha-to-coverage requires MSAA; it is not an alternative to mipmap coverage preservation [4,5]. Coverage-preserving alpha mipmaps keep distant foliage from disappearing [5]. These cutout/impostor steps are planned; the current blade meshes are opaque and double-sided, so they need no alpha mask.

## 5. CPU, GPU and memory

Implemented:

- Dedicated module worker builds 1,024² albedo, normal and packed transmission/roughness/height maps on parameter changes. Typed buffers transfer back without cloning their contents.
- Each map is generated once per recipe. Mipmaps and anisotropic filtering improve minification; no per-frame procedural texture baking occurs.
- Each visible population shares one material and geometry through `InstancedMesh`. Static matrices are uploaded when the population is built, not every frame. Instancing reduces draw submissions [6].
- Wind deformation is a TSL vertex expression driven by time, instance phase and base-to-tip stiffness. CPU animation does not loop over leaves. This follows the GPU animation principle demonstrated by Crytek and NVIDIA [7,8].
- Four LOD batches are allocated; one is visible at a time. The CPU updates one group-level LOD decision. Bounds include displacement padding. Controls and rendering still require ordinary per-frame CPU work.
- Device pixel ratio is capped at 1.75. Recipe rebakes dispose old textures, materials, geometry and instance resources. Page teardown terminates the worker and renderer.

Three RGBA8 1K maps cost about 12 MiB at base level and about 16 MiB including a complete mip chain. Temporary worker height and output arrays add authoring memory. Instance matrices cost 64 bytes each, duplicated across four LOD batches in this study; 4,096 leaves use about 1 MiB of matrices across those batches. These are analytical storage estimates, excluding driver overhead, buffers and render targets.

GPU wind currently displaces positions but does not analytically rotate the shading normals. Its deliberately small amplitude reduces the discrepancy. Larger bending requires a deformation-consistent normal transformation, shared gust fields, branch-level motion and wind-expanded bounds. Do not use a CPU physics simulation per leaf.

Future forest architecture: spatial cells with conservative bounds → frustum/occlusion selection → LOD and visible-list compaction in compute → indirect instanced draws. WebGPU indirect commands can consume GPU-generated visibility without CPU readback [9,10]. Start with cluster-level CPU culling if profiling says it is sufficient; compute culling is not free and should not precede an actual bottleneck.

## 6. Validation and acceptance gates

The studio exposes seed, species, age, curl, wind, light azimuth, map inspection, wireframe, population and manual/automatic LOD. Export stores a reproducible JSON recipe. FPS is a wall-clock browser frame estimate, not GPU timestamp timing or a performance guarantee.

Automated model checks cover finite geometry, UV bounds, index bounds, triangle winding, triangle budgets, deterministic veins and LOD hysteresis. Browser validation should compile the real WebGPU shader, exercise every family and debug mode, switch population and LOD, orbit through the underside and inspect worker failures. Software-adapter checks validate functionality only; hardware performance must be measured on the intended devices.

Before engine integration:

1. Compare silhouettes and vein landmarks against licensed macro photographs or real specimens at fixed physical scale.
2. Validate all four illumination configurations and underside shading. Add petioles, more realistic reticulation and vein-driven corrugation.
3. Measure CPU frame work, GPU render time, draw submissions, resident texture memory and overdraw at 1080p/1440p on integrated and discrete GPUs.
4. Tune cluster sizes and LOD using actual projected pixel sizes, hysteresis and transition captures.
5. Add branch clusters, cutout atlases with coverage-preserving mips and canopy impostors before planetary distribution.
6. Integrate species selection with biome, season, moisture and terrain; retain stable seeds across streaming boundaries.

No claim of photorealism, 60 FPS at a stated population, or forest-scale optimization is justified until those checks pass on target hardware.

## Primary references

1. Runions et al., *Modeling and visualization of leaf venation patterns*, SIGGRAPH 2005: https://algorithmicbotany.org/papers/venation.sig2005.html
2. Féret and de Boissieu, PROSPECT documentation and model parameters: https://jbferet.gitlab.io/prospect/articles/prospect1.html
3. Three.js MeshSSSNodeMaterial: https://threejs.org/docs/pages/MeshSSSNodeMaterial.html
4. Three.js Material, alpha-to-coverage: https://threejs.org/docs/pages/Material.html
5. Microsoft DirectXTex coverage-preserving mipmaps: https://github.com/Microsoft/DirectXTex/wiki/ScaleMipMapsAlphaForCoverage
6. Three.js InstancedMesh: https://threejs.org/docs/pages/InstancedMesh.html
7. Sousa, *Vegetation Procedural Animation and Shading in Crysis*: https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis
8. Zioma, *GPU-Generated Procedural Wind Animations for Trees*: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-6-gpu-generated-procedural-wind-animations-trees
9. WebGPU Fundamentals, optimization: https://webgpufundamentals.org/webgpu/lessons/webgpu-optimization.html
10. W3C WebGPU specification: https://www.w3.org/TR/webgpu/
11. NVIDIA, *Next-Generation SpeedTree Rendering*, representation and shading tradeoffs: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-4-next-generation-speedtree-rendering

## Validation record for this change

`npm run build`, `npm run check`, and the complete `npm test` suite passed locally. Additional worker tests exercise all three families, deterministic output, RGBA channel sizes, opaque alpha and normal normalization. Local visual WebGPU validation could not run: no Chromium binary was installed and the attempted browser download returned a truncated archive. Appearance, shader execution and hardware frame-rate remain unverified; no screenshots or performance claims accompany this first implementation.


## Tree and branch authoring extension

Nature Studio now defaults to a whole tree. Switch to a leafy branch or the original leaf study. Seeded species-inspired branch architecture produces tapered parent-connected segments; leaves use stable twig attachment frames and short instanced petioles. Family, height, depth, density, size and foliage visibility are editable. Recipe v2 preserves these inputs. The birch, oak and willow profiles vary branching spread and willow droop; these are authoring approximations, not botanical growth simulations.

Bark segments merge into one draw, petioles share one instanced draw, and the leaf population shares the existing four geometry LODs and GPU wind material. Attachments are capped at 6,000 leaves. Leaf wind is anchored at the stalk; woody branches remain static. The entire tree currently shares one leaf LOD selection. Cluster culling, branch LODs, shadow optimization and distant tree impostors remain future work; this is a tree authoring preview, not a forest renderer. The generation and assembly run on the CPU when controls change, while existing tissue texture generation stays in its worker.
