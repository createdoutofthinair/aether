# Aether: complete WebGPU migration and planetary renderer plan

Date: 15 October 2026. Audited baseline: `0f3bf3d704ff301437e880eff2e6e5aa6c0c732c`. This is an execution plan, not a claim that the migration is implemented or that visual acceptance has passed.

## 1. Decision and scope

Keep Three.js as the rendering framework and build a modular planetary runtime above it. Introduce its WebGPURenderer in parallel with the current WebGLRenderer. Port one representative terrain region before moving the complete scene. Retain the existing world generation, contact rules, assets and tested numerical algorithms wherever their behavior is correct.

WebGPU is a rendering/compute API, not a solution for bad terrain data, floating objects, poor material scale or inconsistent collision. Migration and fidelity improvements have separate acceptance gates. Avoid simultaneous changes to algorithms and rendering unless an incompatibility requires them; document intentional changes.

The migration covers terrain, material streaming, lighting, shadows, atmospheric integration, ocean rendering, coastal effects, rocks, rover rendering, material editing, profiling, browser delivery and resource recovery. Later work includes compute acceleration, vegetation and broader planetary content. Multiplayer, full volumetric surf, gas-giant interiors, a native engine, and WebXR are separate projects; this plan does not imply they are supported.

Visual review will be performed manually by the user in conversation. **Do not reintroduce automated screenshot capture, Playwright, screenshot CI, or a screenshot export button.** Keep numerical tests, shader/backend smoke checks and ordinary deployment CI. Manual diagnostics are acceptable.

## 2. Current implementation and compatibility inventory

The repository vendors Three.js; `dist/vendor/three.core.js` reports revision 186. The application explicitly constructs `T.WebGLRenderer`. Planetary rendering is custom code on Three.js, rather than a graphics engine built from scratch. Verify the chosen dependency version against this baseline before changing imports.

| Subsystem | Current location | Migration treatment |
| --- | --- | --- |
| Application setup and scene orchestration | `dist/app.js`, `entry.js`, `navigation.js` | Extract lifecycle and render passes; keep user controls |
| Planet geometry, LOD and sampling | `terrain.js`, `regions.js`, `terrain-detail.js` | Separate numeric data from Three.js objects; port geometry adapter |
| Planet/global/reference data | `planet-data.js`, `terrain-data.js`, `planet-profiles.js` | Preserve CPU algorithms and deterministic cache identities |
| Workers and caches | `planet-worker.js`, `terrain-worker.js`, cache modules | Preserve transferable data, epoch guards and bounded scheduling |
| Terrain shader modifications | `shaders.js` | Replace onBeforeCompile modifications with explicit TSL node material |
| Material composition | `page-pbr.js`, `regional-material.js`, `normal-moments.js`, `stochastic-material.js` | Preserve semantics; split offline/CPU composition from GPU sampling |
| Material residency | `material-pages.js`, `material-page-worker.js` | Introduce backend-neutral requests and renderer-owned uploads |
| Compressed/scanned assets | `compressed-materials.js`, `scanned-outcrop.js`, `dist/compressed`, `dist/scans` | Verify decoding/transcoding and format capabilities on selected backend |
| Lighting and sky illumination | `sky-light.js`, app PMREM setup | Port environment generation and document colour/exposure conventions |
| Shadows | `shadows.js`, app shadow setup | Port supported shadow path; compare aliasing and bias manually |
| Ocean spectrum | `ocean-spectrum.js` | Retain CPU reference initially; separate simulation from GPU textures |
| Water/atmospheric passes | `water.js`, `shaders.js`, app render targets | Port GLSL and rebuild depth/compositing contracts |
| Coastal simulation | `coastal-solver.js`, `coastal-worker.js`, `coastal-flow.js`, `coastal.js` | Preserve depth-averaged worker solver first |
| Spray and wave sheets | `coastal-spray.js`, `coastal-crests.js` | Port shaders and buffers; preserve bounded pools and lifecycle |
| Grounding/rocks/outcrops | `grounding.js`, `outcrops.js` | Separate contact and placement from GPU draw representation |
| Rover | app GLTFLoader and custom movement/contact | Preserve asset and controls; validate contacts separately |
| Material editing | `material-editor.js`, `material-mixer.js`, `procedural-materials.js` | Share material description across editor and planetary renderer |
| Measurements | `render-metrics.js` | Replace direct WebGL assumptions with backend-specific providers |
| Deployment | `.github/workflows/pages.yml`, `vite.config.js` | Keep GitHub Pages; add reproducible build when introducing source modules |

Do not assume the vendored WebGL build includes all WebGPU/TSL modules. Do not combine mismatched Three.js core, addons and decoder releases. Inventory every ShaderMaterial, RawShaderMaterial, onBeforeCompile hook, direct renderer context operation and render-target format before porting.

## 3. Source-backed constraints

Three.js documents that WebGPURenderer has asynchronous initialization, uses a separate import/build path, and provides a WebGL2 fallback. Existing ShaderMaterial, RawShaderMaterial and onBeforeCompile customizations require porting to node materials/TSL; custom post-processing must also be adapted. Its documentation still describes the renderer as experimental and warns that feature coverage and performance can differ by scene. [1]

WebGPU capabilities must be negotiated from the selected adapter/device. Timestamp queries are optional, limits are explicit, and device loss must be handled. Never equate a missing timing feature with a failed renderer, or a requested high-performance adapter with a guaranteed discrete GPU. [2]

These constraints inform the migration; all architecture, budgets and phase gates below are proposed project decisions.

## 4. Target architecture

Use one application state and one active renderer per session. Keep legacy WebGL and new WebGPU paths selectable while migrating. Compare them in separate sessions, rather than maintaining two full GPU worlds at once.

| Layer | Responsibilities | Forbidden dependencies |
| --- | --- | --- |
| World/domain | Planet configuration, seeds, geological rules, coordinates, terrain/contact queries, material descriptions | DOM, renderer objects, GPU handles |
| Simulation | Fixed-step rover/coastal state, CPU ocean reference, deterministic placement | Render frame timing as authoritative physics time |
| Data/streaming | Worker scheduling, cache epochs, tile payloads, residency requests, asset manifests | Renderer-private fields |
| Render description | Visible tile list, camera/origin, lighting state, material identities, effect state | Direct worker ownership or physics mutation |
| Renderer backend | Three.js scene objects, node materials, render passes, upload queues, GPU resources, profiling | Recomputing independent collision surfaces |
| Application/editor | Input, menus, material editing, diagnostics, manual inspection controls | Shader source concatenation or atlas implementation details |

Suggested source layout, introduced incrementally:

```text
src/domain/        world, coordinates, terrain queries, material schemas
src/simulation/    rover, ocean reference, coast, deterministic placement
src/streaming/     tiles, caches, workers, requests, asset loading
src/render/        scene descriptions, backend contract, resource accounting
src/render/webgl/  adapter for the existing renderer
src/render/webgpu/ renderer, TSL materials, passes, compute modules
src/editor/        material editing and inspection controls
src/app/           startup, lifecycle, input, session configuration
```

`dist/` remains the deployable build output. Migrate source ownership deliberately: do not let generated files become the source of truth. Keep workers resolvable under the GitHub Pages `/aether/` base path.

### Backend contract

Define operations such as initialize(capabilities), resize(viewport), applyScene(description), enqueueUploads(payloads), render(frame), collectMetrics(), recover(), and dispose(). Keep resource ownership explicit. Scene descriptions carry numeric arrays, IDs and immutable settings; they do not contain live GPU resources.

Terrain payloads specify tile ID, version/epoch, coordinate frame, geometric error, bounds, heights/residuals, normal convention, halo and parent mapping. Materials specify linear colour, roughness meaning, occlusion, normal space, height units, coverage and layer order. Snapshot these schemas before implementing adapters.

## 5. Coordinate, time and numerical contracts

- Use double-precision JavaScript world positions and camera-relative float GPU coordinates. Apply origin changes atomically to geometry, water, shadows, effects and contact visualizations.
- Declare units: metres, seconds, radians, physical or artistic temperatures as applicable. Document planet radius versus terrain elevation versus water datum.
- Declare texture row direction, tangent handedness, normal-map orientation, cube-face conventions and wrap/halo behavior.
- Keep simulation time separate from RAF time. Use a bounded fixed-step accumulator with an explicit catch-up policy; rendering interpolates state.
- Keep rover and placement queries on the CPU authoritative surface during migration. A future GPU detail displacement must have a matched CPU contact representation or be explicitly sub-contact-scale visual detail.
- Do not promise bit-identical CPU/GPU results. Specify tolerances from contact clearance, tile spacing and simulation scales before each compute port; measure maximum and RMS error.
- Represent material/planet edits with generations. Reject obsolete worker results and queued uploads after a generation change.

## 6. Rendering and material design

Start with a forward PBR path using Three.js node materials. A deferred renderer, custom engine or a wholesale raw-WGSL rewrite is not a prerequisite. Use TSL for renderer-integrated shading. Consider isolated WGSL compute only if public integration APIs and measured benefits justify it; do not depend on Three.js private backend fields.

Define a small stable set of material features. Avoid recompiling pipelines on every slider change: ordinary edits update uniforms/data; structural changes switch explicit cached variants. Compile likely variants before they become visible when the pinned Three.js API supports it.

Port material behavior in this order:

1. Linear albedo, roughness, metallic and correct display conversion.
2. Near scan normals, normal orientation and scale.
3. Stochastic sampling and world-space/triplanar projection.
4. Geology masks and height-aware material composition.
5. Filtered normal moments and roughness adjustment.
6. Regional page data, parent fallback and page transitions.
7. Ordered decals, snow, organic masks and editor previews.

Each step must be inspectable in isolation. Preserve existing debug views for materials, normals, drainage, residency and geological overlays. Correctness is not established by making a screenshot more saturated or hiding seams with fog.

### Render-pass dependencies

Specify inputs/outputs for every pass before implementation:

- Opaque geometry produces linear colour and a defined depth representation.
- Water samples opaque colour/depth without sampling a texture being written in the same pass. Separate resources or supported pass structures prevent feedback hazards.
- Coastal sheets and spray depth-test against the agreed scene/water depth representation; define which effects write depth and how transparency is ordered.
- Atmospheric integration reconstructs rays using the chosen depth convention and projection; avoid scattering twice through water and atmosphere composition.
- Tone/display conversion occurs once, after HDR scene composition. Environment maps, albedo and colour textures have explicit colour spaces.
- Resize, DPR and quality changes recreate only size-dependent resources, then refresh all references atomically.

Depth conventions, reversed depth availability and multisample resolves must be verified for the chosen Three.js version. Do not copy WebGL depth-reconstruction mathematics unchanged without checking.

## 7. Streaming and memory

Retain CPU-generated material pages initially. Abstract the upload mechanism: batch dirty rectangles/layers, bound per-frame bytes and request counts, and prohibit hidden full-atlas uploads during routine page arrival. Verify the selected Three.js public upload API supports the needed behavior; if not, benchmark a public alternative before choosing texture arrays or a new atlas layout.

Texture arrays are an option, not an automatic decision: compare atlas padding, mip halos, filtering, backend limits and update costs. Fine authored decals are a separate fidelity milestone; migrating coarse pages does not magically create centimetre-resolution assets.

Every allocation must have an owner, byte estimate, lifetime and recovery source. Count render targets, multisampling, mipmaps, compressed blocks, geometry, storage buffers and decoder/CPU staging separately. Browser APIs may not expose true VRAM usage; label tracked estimates accurately.

Queue prioritization: visible missing parents first, then visible children, then movement-directed prefetch, then background work. Cap outstanding worker jobs, uploads and completed-but-uninstalled payloads. Cancel/ignore stale requests on world changes. Under pressure, reduce prefetch and page/detail budgets before abandoning visible coverage.

## 8. Proposed performance targets

These are initial engineering targets, not measurements or hardware guarantees. Phase 0 selects actual reference devices and adjusts targets transparently.

| Tier | Initial target | Tracked GPU allocation ceiling | Notes |
| --- | --- | --- | --- |
| Desktop High | 1920×1080, DPR 1; p95 frame interval ≤16.7 ms | 768 MiB | Representative discrete GPU, actual model recorded |
| Desktop Balanced | 1280×720, DPR 1; p95 ≤33.3 ms | 384 MiB | Representative integrated GPU |
| Reduced/mobile | 960×540 or device-specific equivalent; p95 ≤33.3 ms | 192 MiB | Capability-gated, reduced surf/shadows/detail; validate selected devices |

For Desktop High, a provisional GPU budget is terrain/opaque 5 ms, shadows 2 ms, water/coast 2 ms, atmosphere/post 2 ms, compute 1 ms and 2 ms reserve: 14 ms total. Main-thread application work should target ≤4 ms p95; CPU and GPU times overlap and must not simply be added. Record p99 separately, with a provisional ≤33.3 ms warm-traversal goal. Do not use median FPS alone.

Start upload throttling at 4 MiB/frame on High and 1 MiB/frame on Balanced; these are tunable caps, not required bandwidth. Start with a 2 ms main-thread budget for streaming installation. Disable or reduce expensive effects individually if measurements exceed the tier budget.

Record browser/version, device/GPU identity where available, resolution, DPR, quality, backend, sample duration, cold/warm state, worker costs, upload bytes and observed resource peaks. GPU timings are optional; never substitute CPU submit time and label it GPU time. Fix draw accounting so it includes all scene passes. Avoid synchronous readback or mapping on the frame path.

## 9. Ordered implementation phases

Complete a phase's gates before enabling its dependent features by default. Work in reviewable commits; do not execute all phases in one uninspectable rewrite.

### Phase 0 — baseline and migration audit

Deliver dependency/feature inventory, current architecture map, selected reference devices, manual reference views and a risk register. Record measured performance for terrain, coast and orbit with existing diagnostics. Check asset integrity, including KTX2 data, without committing unrelated local asset changes. Record known defects separately from migration regressions.

Gate: reproducible launch, fixed world/site settings, documented performance baseline, and user-reviewed starting views. Missing hardware measurements remain explicitly pending; do not fabricate them.

### Phase 1 — reproducible dependency and build foundation

Pin one compatible Three.js release with matching addons/decoders. Choose npm/build-managed imports or a reproducibly vendored complete module set; prefer npm plus Vite for new source ownership. Add a lockfile for that build migration, validate licensing, hashed asset references, base paths and worker URLs. Preserve existing Pages test/deploy behavior. Do not add screenshot tooling.

Gate: clean install/build, no mixed Three.js copies, GLB/KTX2/worker loading works under `/aether/`, and the unchanged WebGL scene renders correctly.

### Phase 2 — extract domain and shared surface contracts

Separate numerical coordinates, world configuration, terrain sampling, placement and contact from rendering objects. Introduce immutable schemas and explicit conversion adapters. Move modules gradually; preserve existing numerical regression tests.

Gate: world/terrain/contact algorithms can run in Node without DOM or renderer initialization; existing results stay within their prior tolerances; rover/contact behavior remains unchanged.

### Phase 3 — backend bootstrap and capability policy

Add WebGPU initialization, backend selection and a minimal mesh/material scene. During migration, the default remains legacy WebGL; a development selection enables WebGPU. Distinguish legacy WebGLRenderer from WebGPURenderer's WebGL fallback in diagnostics. Handle unavailable adapters, initialization errors, optional features and limits. Provide an intelligible recovery/fallback message.

Gate: real-browser startup, resize and shutdown work; unavailable WebGPU still launches the supported legacy scene. GPU-compute-dependent features are explicitly disabled or use CPU alternatives on fallback.

### Phase 4 — one-region terrain geometry

Render the same tile payloads with a simple node material. Reproduce culling, bounds, edge stitching, LOD morphing, origin shifts and tile disposal. Keep CPU tile selection initially. Ensure camera-relative precision does not alter contact placement.

Gate: manual ground/approach/orbit comparison, longitude/pole boundaries, rapid camera motion, no cracks or unstable origin shifts, and bounded resident geometry. This gate evaluates geometry before complex materials.

### Phase 5 — terrain PBR and material parity

Implement the ordered material-port steps in section 6. Use a deliberately small reference asset set first. Verify albedo colour space, normal handedness, height units, scan scale, distant roughness and layer blending.

Gate: manual dry/wet/low-sun inspections and debug views; no new repetition, black sediment, inverted normals or distance-dependent highlight shimmer. Numerical composition and worker parity tests continue to pass.

### Phase 6 — material residency and authored layers

Port page installation, partial uploads, parent fallback, generation handling and coarse orbital coverage. Preserve layer ordering/import/export and update behavior. Introduce finer pages only after measuring residency and upload costs; keep that change distinguishable from renderer parity.

Gate: shared page borders remain continuous, parent-to-child material transitions are acceptable, edited/removed layers clear correctly, world switches cannot reuse stale pages, memory and queued work remain bounded.

### Phase 7 — lighting, environment and shadows

Port sky illumination/environment generation and the supported shadow path. Document radiance/exposure conventions. Tune shadow fitting, bias and near/far transitions against fixed lighting views; evaluate cascades only if needed and supported.

Gate: manual close-shadow and low-sun checks on terrain, rover and rocks; no detached contact shadows or excessive acne. Verify environment refresh does not cause recurring stalls or allocations.

### Phase 8 — atmosphere and compositing

Port atmospheric scattering and depth reconstruction to TSL. Build explicit colour/depth targets and a supported post-processing chain. Test near-ground, limb/orbit, underwater if supported, and atmosphere-free worlds. Keep quality and physical plausibility claims separate.

Gate: stable silhouette, correct horizon, no depth-edge flicker, no double display conversion, and correct resizing/MSAA behavior. Reconstructed positions must agree with known scene test points.

### Phase 9 — ocean rendering with the CPU reference

Port water shading, absorption/refraction, reflection approximation, horizontal displacement, spectral variance and foam sampling. Feed the existing CPU spectrum through the new upload adapter. Preserve time/rewind behavior.

Gate: manual calm/windy coast and orbital-water checks; no water/terrain gaps, texture orientation reversal, excessive transparency ordering errors or new seams. CPU spectral regression tests remain the reference.

### Phase 10 — coastal solver, crest sheets and spray

Preserve the worker solver. Port data upload/interpolation, wet-sand history, spray buffers and curling-sheet shaders. Keep pool limits and world-switch resets. Explicitly retain the limitation that curling sheets are visual approximations above a depth-averaged solver, not resolved volumetric breaking waves.

Gate: coast review in motion, stable world/quality resets, bounded effect counts, shoreline intersections and credible foam/spray scale. Do not accept numerically passing particles as proof of realistic surf.

### Phase 11 — rocks, outcrops, rover and editing integration

Port instancing, scanned geometry and rover materials. Share terrain/contact queries across rocks, rover and terrain. Eliminate independent placement heights. Reconnect material-editor previews to the same material description and dirty-generation logic used by terrain.

Gate: manual wheel contact on slopes and LOD changes, no hovering outcrops, stable follow camera, consistent editor/planet appearance, responsive live parameter updates and no accidental pipeline recompilation storm.

### Phase 12 — measured compute pilot

Select one workload from profiling: ocean FFT, visibility/placement or page composition. Prefer the CPU ocean reference as a well-tested compute candidate if it is actually expensive. Measure dispatch, uploads and synchronization, not kernel time alone. Preserve a CPU path and explicit feature policy.

Gate: agreed CPU/GPU error tolerances pass; no frame-path readback; total application cost improves on target devices; memory stays within tier limits. If there is no material benefit, retain CPU execution and close the experiment with evidence.

### Phase 13 — additional compute and GPU-driven visibility

Only after the pilot, evaluate GPU frustum/occlusion culling, bounded compaction, indirect draws and page baking. Implement supported public integration paths or document an ADR for a contained custom subsystem. Handle buffer overflow and visibility-history invalidation on teleport/origin changes. Do not prematurely hide topology/contact ownership in the GPU.

Gate: equivalent visible coverage, no overflow-induced disappearance, measured CPU reduction, bounded resource lifecycle and valid CPU/fallback behavior.

### Phase 14 — content fidelity and vegetation

Expand material families and formation types with physically coherent scale and explicit biome placement. Introduce vegetation only on configured life-capable worlds. Use deterministic density/species/slope/moisture masks, instanced near plants, simplified mid-distance forms and filtered distant coverage. Plan wind, translucency, terrain anchoring, crossfades and shadow limits together.

Gate: user-reviewed reference landscapes, no floating plants, unstable fades or repetitive scatter; ground-to-orbit scale consistency; tier budgets hold. This is content/quality expansion, not a requirement for basic WebGPU parity.

### Phase 15 — lifecycle, stress and device matrix

Exercise resize/DPR changes, quality switches, repeated planet travel, tab suspension/resume, decoder/worker failure, device loss and renderer teardown. Recreate resources from authoritative CPU/asset state. Bound recovery attempts and use fallback/reload UI if recovery is unavailable. Do not poll adapter capabilities every frame.

Gate: repeated travel does not cause monotonic retained allocations; recoverable failures restore a coherent scene; unrecoverable failures give clear controls. Validate selected desktop/integrated/mobile browsers on actual hardware.

### Phase 16 — release decision and default switch

Collect per-feature parity, known limitations and device evidence. Enable WebGPU by default only after terrain, atmosphere, water, editor and rover gates are accepted. Preserve a backend override while the new path stabilizes. Capability-dependent compute remains optional.

Gate: user accepts manual visuals, target-device performance is documented, ordinary CI/build/deploy passes, rollback is verified, and unresolved regressions have explicit owners and mitigations.

### Phase 17 — retire redundant legacy code

Remove the old WebGL-specific shader implementation only after a documented support period and acceptance of the replacement/fallback behavior. Keep shared numerical algorithms, asset builders and CPU reference tests. Update documentation and dependencies to match the supported matrix.

Gate: no retained app path depends on removed GLSL hooks or WebGL-only metrics; clean build and manual smoke review pass. Do not call WebGPURenderer's WebGL fallback equivalent to the removed legacy renderer without validating its materials/effects.

## 10. Manual visual review protocol

The user supplies screenshots or observations here. Provide stable site/settings controls and debug modes, but no automatic capture or screenshot CI. Record each reviewed view's backend, commit, planet seed/profile, site coordinates, camera height/direction, sun angle, simulation time, quality, resolution and DPR.

| Review set | Required observations |
| --- | --- |
| Terrain geometry | Ground/20 m/200 m/2 km/orbit and descent; slopes; seams; rapid travel; poles/longitude wrap |
| Materials | Dry sediment/rock, wet shoreline, snow/ice, volcanic, airless; scan scale; distant highlights |
| Objects/contact | Rover stationary/driving/braking; steep and stitched terrain; rock/outcrop bases |
| Coast | Calm and stronger waves; stationary and moving views; foam lifecycle; spray/sheets; wet-sand drying |
| Lighting | Low/mid/high sun; moving shadows; atmosphere-free and atmospheric worlds |
| Streaming/editor | Cold and warm travel; authored-layer add/reorder/remove; planet edits; parent fallback |
| Lifecycle | Window resize, DPR/quality switch, return from background tab, repeated planet visits |

Review motion as well as still images. A screenshot cannot establish absence of shimmer, popping or contact jitter. Numerical tests and shader compilation are necessary technical checks; they do not close visual gates. Log fixes by defect and reproduce the same scene after each relevant change.

## 11. Risks and rollback

| Risk | Mitigation / stop condition |
| --- | --- |
| Port looks different because colour/depth conventions changed | Isolate a simple reference material/pass; establish linear/HDR/depth contracts before adding effects |
| WebGPU increases total frame time | Profile real-device total cost; retain legacy path and reject unsupported performance claims |
| GPU terrain differs from collision | Keep CPU authority; matched residual data or bounded visual-only displacement |
| Hidden full texture uploads | Instrument bytes/rectangles; benchmark public upload options before redesigning atlas storage |
| Pipeline compilation stalls | Stable variants, uniform-driven edits, supported precompilation, measured warm-up |
| CPU/GPU synchronization dominates compute | Keep results on GPU, use asynchronous diagnostic readback only, compare end-to-end workload |
| Device/browser feature gaps | Explicit capability tiers, optional features and documented degraded effects |
| World changes install stale data | Epoch validation at worker completion and GPU installation |
| Unbounded resources | Per-owner accounting, capped queues, teardown/recovery tests and sustained travel review |
| Migration becomes an uncontrolled rewrite | One region, one subsystem, one reviewable phase; preserve the legacy app until acceptance |

Each phase commit must leave a usable default application. Use a migration branch and an opt-in entry/backend switch until Phase 16. Rollback means selecting the supported legacy backend or reverting the relevant integration commit, not resetting unrelated world data. Avoid changing content and renderer defaults together.

## 12. Definition of complete

The migration is complete when the selected WebGPU default, supported fallback and lifecycle work; migrated materials/passes no longer depend on legacy GLSL hooks; all retained numerical tests/build checks pass; the user accepts the manual reference views; reference-device performance/memory evidence exists; editor, rover and all five profiles work; and documentation matches the actual capabilities.

“Complete” does not mean Star Citizen-scale production content, guaranteed AAA fidelity on every browser, a full fluid simulation, or completion of every optional compute/content extension. Record migration completion separately from Phases 13–14 expansion and the existing terrain-fidelity roadmap.

## 13. Execution instructions and reusable prompts

Start with Phases 0–2. Do not begin by swapping WebGLRenderer for WebGPURenderer in the monolithic app. First implementation deliverable: an audit/ADR, reproducible source/build foundation, shared domain contracts, and an unchanged working WebGL application.

For every implementation phase, inspect the latest repo, identify its dependencies, state its acceptance evidence, implement the bounded scope, run relevant tests, document pending manual/hardware checks, and publish the reviewable change. Do not replace user review with screenshot automation. Use numerical tests where they protect contracts; do not manufacture tests that merely repeat the implementation.

### Start prompt

> Read docs/webgpu-migration-plan.md and the current repository. Execute Phase 0, then the safe foundation work in Phases 1–2. Preserve the current visual behavior and deployment. Audit Three.js/GLSL dependencies, establish renderer-independent world/terrain/contact contracts, and pin a coherent build. Keep WebGL the default. Do not add screenshot tooling. Report measured evidence and explicitly pending manual/device gates; do not claim visual acceptance from numerical tests.

### Continue prompt

> Read docs/webgpu-migration-plan.md and the execution log. Implement the next dependency-ready phase in a reviewable change. Preserve shared terrain/contact data and fallback behavior. Run relevant checks, update the phase log with actual evidence, and push/deploy only the intended changes. Leave manual visual acceptance pending until I review it here.

### Visual correction prompt

> Use my supplied view/observations and the recorded scene settings to reproduce the defect. Identify whether it comes from geometry/data, material shading, depth/compositing, streaming, placement or simulation. Fix that cause within the current phase, preserve other behavior, and give me the settings needed to inspect the same view again. Do not add a screenshot pipeline.

### Compute pilot prompt

> Profile the accepted WebGPU scene on the available target hardware. Select one measured expensive workload with a CPU reference. Implement a bounded compute alternative, compare numerical error and total frame/upload/synchronization cost, and retain CPU/fallback operation. If no representative GPU is available, implement only the experiment and numerical checks; do not assert a measured speedup.

### Execution log template

| Phase | Commit | Implemented scope | Numerical/build evidence | Manual visual evidence | Device performance | Open defects / next gate |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Pending | Audit and baseline | Pending | User review required | Actual devices required | Establish contracts before renderer port |

No calendar estimate is asserted before the audit: shader/pass compatibility, real-device findings and visual rework determine effort. Update estimates after the one-region terrain/material proof, rather than promising the whole migration from a class-name change.

## 14. Primary references

Accessed 15 October 2026. Re-check API details against the pinned Three.js release during implementation.

1. Three.js WebGPURenderer overview and migration constraints: https://threejs.org/manual/pages/webgpurenderer.html
2. W3C WebGPU specification (features, limits, device lifecycle): https://www.w3.org/TR/webgpu/
3. Three.js WebGPU post-processing: https://threejs.org/manual/pages/webgpu-postprocessing.html
4. Three.js migration guide: https://github.com/mrdoob/three.js/wiki/Migration-Guide

Related project documents: [Terrain rendering research](terrain-rendering-research.md) and [Terrain page authoring](terrain-page-authoring.md).
