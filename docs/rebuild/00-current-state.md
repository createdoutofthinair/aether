# P0: current implementation audit

Audited 11 October 2026 at commit `0f3bf3d704ff301437e880eff2e6e5aa6c0c732c`. Main and the local checkout agree. No applicable `AGENTS.md` was found in the repository or workspace ancestry. The application is authored under `dist/`; it is also the deployment directory.

## Finding and recommendation

Aether contains reusable algorithms, useful numerical fixtures and locally bundled content. The existing renderer is a compact Three.js/WebGL2 prototype whose fixed planet scale, render-dependent contact, independent material preview, limited lighting and missing vegetation do not fulfill the expanded planetary goal.

Proceed with a controlled native platform experiment, keeping the current app as the reference. Reuse verified data, asset preparation and tests where their contracts match the replacement. A broad source deletion is not justified by the reported visual symptoms: those symptoms have not been reproduced on an available GPU in this audit.

## Evidence actually obtained

| ID | Action and result | What this establishes |
| --- | --- | --- |
| E-P0-CHECK | `npm run check` passed: 46 authored modules | JavaScript parsing, not runtime rendering |
| E-P0-TEST | `npm test` passed: all 30 test scripts | Their numerical, worker, validation and asset assertions |
| E-P0-HTTP | Eight loopback Vite endpoints returned valid content | Entry, editor, workers, manifest, WASM and rover delivery |
| E-P0-ASSETS | Inventory: 30 binary files, 94,908,343 total bytes | Bundled source + compressed/fallback payload, not bytes downloaded on one successful launch |
| E-P0-ROVER | Gzip/GLB headers and length verified; six named wheels found | Valid container and expected node names, not a rendered/physical asset approval |
| E-P0-LOD | Existing CPU fixture: 196 patches, 4 morphing; 0.516 ms median, 2,250 attribute updates over 30 frames | This container's isolated CPU workload only |
| E-P0-DETAIL | Existing CPU fixture: 290 formations, 24 initialization frames, 4.246 ms median and 4.533 ms p95 | A bounded placement fixture, not end-to-end frame time |
| E-P0-CACHE | Actual mesh eviction retained 40,032 bytes of original/render arrays on one evicted node; cache retained 1,566 nodes | Eviction does not retire the node's CPU payload; long-run growth is still to measure |
| E-P0-CONTACT | Same reference directions at levels 5/10/13 returned different contact heights | Contact depends on chosen render triangles; see exact fixture values below |
| E-P0-METRICS | A pre-reset query was consumed in the post-reset GPU sample buffer | Bookkeeping defect reproduced with synthetic query values; no GPU duration was measured |
| E-P0-SOURCES | Rock, gravel and mud albedo source images were visually inspected | Recognisable scanned substrate; no runtime scale, normal, roughness or seam approval |
| E-P0-SHADERS | Twelve program pairs exported successfully | Source generation only; local compilation/linking blocked without `glslangValidator` |
| E-P0-CI | Baseline GitHub Actions run completed successfully; shader compile and rover verification steps succeeded | Remote functional checks on this exact baseline, not GPU/visual acceptance |

Raw records: [functional log](evidence/p0-functional.log), [inventory](evidence/p0-baseline.json), [experiments](evidence/p0-experiments.json), [HTTP smoke](evidence/p0-http-smoke.json), [CI metadata](evidence/p0-ci.json). Timings are specific to this agent container. They do not describe the user's computer.

The test log's `Coastal solver failed: test failure` line is intentional: `scripts/test-coastal-flow.mjs` injects a failure and asserts isolation. The complete command exited successfully.

`npm ci` could not run because there is no tracked lockfile. Installing the existing development dependencies with `npm install --ignore-scripts --no-package-lock --no-audit --no-fund` succeeded. No dependency declaration was changed. This preserves the audit baseline; reproducible locking belongs to M0.

The default Vite host encountered this container's `uv_interface_addresses` restriction. Binding `127.0.0.1` starts successfully. The HTTP check ran with server and client in the same process, avoiding this environment's cross-command loopback limitation. This is not evidence of a desktop networking defect.

No target GPU, native engine installation, native desktop surface, actual WebGL frame or movement recording was inspected. This environment has Node 24.19.0 and a C++ 13.3 compiler, but no exposed `/dev/dri` or Unreal installation. An attempt to install the shader compiler failed on this environment's package-manager privilege limitations. The current [baseline CI run](https://github.com/createdoutofthinair/aether/actions/runs/38147002852) and its job/step metadata were subsequently inspected: the test and deploy jobs succeeded, including the shader-compile and rover-verify steps. CI metadata is remote functional evidence; it provides no rendered-image or target GPU evidence.

## Actual data and frame flow

| Stage | Current path and ownership |
| --- | --- |
| Configuration | `world.js` mutable settings and environment; `solar.js` profiles; `system-ui.js` per-body session profiles; `atlas.js` user changes |
| Planet data | `planet-cache.js` snapshots inputs and delegates to `planet-worker.js`; `planet-data.js` produces spherical drainage residuals/masks |
| Reference data | `terrain-cache.js` / `terrain-worker.js` generate profile-specific 513² regions; `terrain-detail.js` supplies 2 m residual tiles and features |
| Render topology | `PlanetTerrain` in `terrain.js`: six cube-face quadtrees, 16×16 cells, level 14 High / 12 Balanced, stitched/morphed geometry |
| Grounded objects | `grounding.js` scattered rocks/pebbles; `outcrops.js` fractured/scanned formations with exact radial triangle contact |
| Materials | `compressed-materials.js` and `materials.js`; `page-pbr.js` → `material-page-worker.js` → `MaterialPageCache`; `shaders.js` production evaluation |
| Physical movement | `app.js` 120 Hz kinematic drive and wheel repositioning; `PlanetTerrain.sample` selects currently visible ground plus outcrop contacts |
| Ocean and coast | `ocean-spectrum.js` CPU FFT; `app.js:prepareCoast`; `CoastalFlow` → worker-owned `CoastalSolver`; crest and spray pools |
| Final frame | Camera/body update → camera-relative root → local sun shadow → terrain LOD/morph/object update → water/coastal state → material uploads → opaque scene target → water target → crests → spray → atmosphere/exposure output |
| Observation | Saved entry views, surface diagnostics, `planetExplorer.getState()` and manual `performance()` export |

`updateEnvironment` derives a small prefiltered sky environment from the atmospheric model. The main scene uses linear half-float targets; the atmosphere pass applies the final presentation. This is not the material editor's studio-lighting/output path.

### Coordinate and contact limits

`terrain.js` exports `R=60000`; `planet-data.js`, `material-pages.js` and `page-pbr.js` also embed that scale. Every explored solid body's geometry uses it, even when the catalog radius differs. Travel between bodies invokes `configureWorld` / `configureEnvironment` / `applyWorld`, not continuous interplanetary flight.

CPU positions use JavaScript numbers. Meshes keep local Float32 positions around patch anchors; the camera-relative root improves rendering precision. The production material coordinate attribute remains absolute Float32 body position. Scaling the same representation to much larger planets requires a precision experiment; changing only `R` does not establish precision, materials or physics correctness.

`sampleGround` raycasts the currently selected stitched/morphed patch and otherwise falls back to the continuous height function. This keeps contact aligned to current rendering, but makes contact dependent on LOD/residency. Selected static patch samples after installing the production eroded reference produced:

| Reference x/z (m) | Level 5 height (m) | Level 10 height (m) | Level 13 height (m) | Range (m) |
| --- | --- | --- | --- | --- |
| 0 / 0 | 132.493 | 120.039 | 120.023 | 12.470 |
| 700 / 250 | 510.319 | 522.882 | 523.450 | 13.130 |
| 1100 / 800 | 613.213 | 603.048 | 602.344 | 10.868 |

These deliberately selected levels are not the live near-rover LOD selection. The values prove a dependency, not a 13 m runtime wheel defect. Existing independent triangle-raycast tests are useful and pass. They do not drive the actual rover through streaming, suspension, model transforms and camera motion together.

The rebuild needs a stable collision/surface authority, explicit disagreement limits, and separately visible render/collision readiness. Test the actual wheel world matrices and tyre support during a drive before diagnosing the reported sinking.

### Streaming and invalidation

Planet and reference caches retain three worlds; fine tiles are bounded to 192 per reference; material pages have 30 slots and at most two pending page requests. Material and coastal epochs reject stale results, with real worker tests for several protocols.

`PlanetTerrain.update` disposes old mesh geometry once its node map exceeds 1,500 entries, but leaves node entries and their original/render arrays. The fixture demonstrates retained CPU payload. Traverse new regions and return while measuring node count, arrays and process memory to determine practical growth. Do not infer a fixed 1,500-node memory cap from that threshold.

The mesh queue is reprioritized on selection updates; the main thread generates up to four patches and a nominal seven millisecond budget. One synchronous patch can overrun that budget. Reference generation and planetary generation maintain inflight maps, but do not globally bound every requested world or actively cancel all stale generation. Session profiles and authored-layer maps also need a lifetime budget.

Hydraulic attributes participate in shading, while the current morph/stitch key list covers positions, normals, surface masks and biomes. Investigate hydraulic transitions under a debug view before attributing dark patches to this difference.

### Materials and authoring

The editor comment explicitly describes a separate preview, not a planet preset. `patchMixer` uses UV sample scales, three preview layers and editor mask semantics. Planet shading uses stochastic triplanar scan evaluation, geology/climate masks, filtered pages and ordered elliptical decals. Their tone/lighting and coordinate semantics also differ.

Recipes persist in editor localStorage and export version-2 JSON. Planet decals export a separate version-1 placement schema; the planet renderer does not import the editor recipe. Shared source textures are reusable, but preview/world recipe equivalence is currently unimplemented.

The page atlas is 1,560×1,813 RGBA8 (11,313,120 bytes). Its virtual grid is 65,536×32,768, approximately 5.75 m spacing at the equator on this compact body. A page is coarse composition; close scans still evaluate independently. Coastal fields share atlas banks. Replacing this layout requires explicit format, channel and ownership contracts rather than copying allocation constants.

### Water, atmosphere, shadows and vegetation

Three 64² spectral bands use CPU FFT and twelve float textures with current/next interpolation at 15 Hz. Horizontal displacement and advected foam are present in code, superseding earlier README descriptions of normals-only water. A 128² coastal grid at 4 m spacing uses first-order depth-averaged flow, wet/dry fronts and stored foam/wetness. Its offshore forcing is a sinusoidal sponge rather than a coupled FFT boundary.

Parametric sheets and sprites approximate overturning and spray after the water pass. They do not make the depth-averaged solver a volumetric fluid simulation. Transparent ordering, grazing intersections, continuity and real cost remain open GPU cases.

Atmosphere uses direct single-scattering integration and supplies the sky environment. Local PCF sun shadows are snapped around the camera/rover; no planet-scale terrain shadow or complete bounced lighting is implemented. The final app lacks a complete temporal history/motion-vector reconstruction pipeline. Vegetation geometry, population, wind and ecological placement are absent; tinted grass substrate is not vegetation.

## Salvage matrix

| Subsystem | Disposition | Evidence and required work |
| --- | --- | --- |
| Deterministic world/profile rules | Retain concepts, adapt schema | Existing repeatability/planet tests; separate catalog body properties from geometry and version the schema |
| Region/erosion/detail generators | Retain as reference, investigate port | Pure generators and halo tests; prove cross-region drainage, physical scale and offline/runtime budgets |
| Spherical topology and edge fixtures | Retain fixtures, investigate renderer replacement | Working numerical seams/morph; compare engine patch geometry and collision on an actual GPU |
| Coordinates and planetary scale | Replace contract | Fixed radius embedded across paths; body/frame hierarchy and large-scale precision required |
| Render-dependent contacts | Replace authority, retain raycast tests | E-P0-CONTACT; define canonical queries and independently bounded collision residency |
| Rover solver | Replace for target fidelity | Current kinematic approximation; reuse model only after scale, materials and vehicle requirements are verified |
| Rocks/outcrop placement | Retain IDs/content, repair or port logic | Stable-ID tests and grounded geometry; GPU fade/silhouette/transform checks pending |
| Asset conversion and channels | Retain after import validation | Local maps, pyramids, normal moments, scan metadata and licenses; target engine parity still needed |
| Material/page caches | Retain design/fixtures, adapt implementation | Epochs, halos and rectangle uploads; target-native resource formats/lifetime need new implementation |
| Material editor integration | Replace shared evaluator contract | Separate preview recipe and production system; no parity acceptance |
| Lighting/shadows/atmosphere | Investigate replacement | Limited current stack; native renderer candidate and atmosphere-scale experiments |
| Spectral/coastal algorithms | Retain as reference, investigate integration | Numerical conservation/FFT/history tests; boundary coupling, visuals and GPU cost unresolved |
| Vegetation | New subsystem | Required by expanded scope; no current asset/render/simulation implementation |
| Diagnostics | Retain manual workflow, repair measurement contract | E-P0-METRICS and rolling 600-frame window; full-run raw timings/build identity needed |
| Deployment and build | Retain reference distribution, replace native build path | Static Pages works as defined; native packaged build/toolchain lock not implemented |

## Reported defect reproduction inventory

Each candidate starts from the default system seed 6, G star, Nacre settings (`seed=6, relief=1, temperature=18, water=-180, pressure=1, activity=.45`), enabled water/ice/basin, High quality and exposure 1.1. These are **candidate reproduction procedures**, not confirmed GPU reproductions. The precise entry views are specified in [10-validation.md](10-validation.md).

| ID / severity | Symptom, candidate action | Relevant path; discriminating experiment | Status |
| --- | --- | --- | --- |
| D01 / high | Wheels sink; land, drive a slope and cross refinement | `app.js:drive/groundWheels`, `wheelLift`, `sampleGround`; log actual transformed wheel clearances before/after LOD change | Reported; V03 blocked |
| D02 / high | Floating formations; `?view=outcrops&altitude=2`, approach and retreat | `OutcropField.update`, foundations and Float32 matrices; compare ground-only foundation with rendered triangles | Reported; numerical foundation tests pass, V04 blocked |
| D03 / high | Rocks pop/disappear; slow approach then reverse at fade/placement thresholds | `RockField.update`, screen-space discard, instance bounds; show stable ID, distance, fade and readiness | Reported; V04/V11 blocked |
| D04 / high | Noisy/repeated/muddy substrate; fixed terrain altitude ladder | `patchTerrain`, footprint filtering, stochastic scans and pages; isolate albedo, normals, footprint, residency | Reported; V01/V02/V05 blocked |
| D05 / high | Jagged/shimmering shadows; slow camera movement at low sun | `positionSunShadow`, local PCF map and bias; replay light/camera separately | Reported; grid math passes, V10 blocked |
| D06 / high | Water-edge flicker; coast at grazing angle, move slowly | `waterFragment`, opaque depth, terrain morph and run-up; compare paused terrain/water and depth | Reported; V09 blocked |
| D07 / high | Foam looks implausible; coast under still and moving camera | FFT foam / `CoastalSolver` / crest/spray passes; isolate each source and inspect transport/scale | Reported; numerical tests pass, V09 blocked |
| D08 / high | Faceting/dark patches; terrain ladder with normals/drainage views | Mesh spacing, broad normals, hydraulic data and composition; compare same location across LOD/light | Reported; V05/V07 blocked |
| D09 / medium | CPU payload retained after mesh eviction | `PlanetTerrain.update`; E-P0-CACHE then long route/allocation trace | Confirmed fixture; practical severity unmeasured |
| D10 / high for validation | Measurement reset crosses GPU query history | `RenderMetrics.reset/end`; E-P0-METRICS, then delayed query/reset on GPU | Confirmed logic fixture; not fixed in P0 |
| D11 / feature gap | Editor preview cannot establish world recipe parity | `patchMixer` vs `patchTerrain/page-pbr`; apply one declared recipe to both paths | Confirmed absent integration; V13 deferred |

## Assets and provenance

| Content | Current provenance / channels / scale | Reuse action |
| --- | --- | --- |
| Dry boulder, sandy gravel, cracked mud | README and editor link Poly Haven source pages and CC0; the current [license](https://polyhaven.com/license) was checked. Sandy Gravel's source page identifies Charlotte Baglioni and a 2.1 m source width. 2,048² albedo/normal; 1,024² packed R roughness/G AO/B blend-height. Aether's declared tiles: 1.8 / 2 / 1.5 m | Retain source maps; record scale overrides and validate color decoding, normal orientation, compression and imported material response |
| Thirteen KTX2 maps | `compressed/manifest.json`, preparation/compression scripts, normal moments and stochastic histogram | Retain preparation semantics; select the new runtime format/cook explicitly |
| Page scan pyramids | `page-scans.bin`, `bake-page-scans.py`, filtered moment tests | Retain as numerical reference; avoid mistaking coarse pyramids for near-field authored content |
| Rock Face 01 geometry | Attribution and metadata identify Dario Barresi / Poly Haven / CC0; source 20,174 triangles simplified to 1,500; recorded relative simplification error .00913 | Retain source and metadata; visually inspect silhouette, normals and foundations in target importer |
| Rover R06 | Prior user project; Blender glTF export metadata, 7 meshes, 8 materials, 10 embedded images. External redistribution provenance not documented here | Investigate rights/source ownership and reimport suitability before shipping; audit does not assume permission beyond existing use |
| Procedural rocks, snow, moss, lichen | Authored modules; deterministic generated data | Retain algorithms where useful; reference specimens still required |
| Three.js and Basis tooling | Bundled MIT/Apache license files and runtime dependencies | Preserve notices if distributed; a native replacement may not use the runtime code |
| Vegetation | No bundled tree/grass/forest asset set | New art/content work with declared species, scale, channels, bounds and provenance |

Checksums and exact file sizes are in the inventory. Source image inspection cannot certify every PBR channel or scanned model. No additional assets were purchased or downloaded.

## Repair versus rebuild by work package

| Required outcome | Repair current browser path | Native reference-world path |
| --- | --- | --- |
| Reliable inspection | Repair reset/history; export full-run timings, build/scene identity and reproducible routes | Use engine profiler plus same evidence/route contract; prove packaged local launch |
| Real planet scale and stable driving | Replace embedded scale/coordinate/contact assumptions and implement independent collision streaming | Integrate body/region frames, spherical terrain and stable physics; engine support needs proof |
| Production material parity | Unify preview/planet recipe semantics; adapt current sampler-limited shaders | Shared versioned recipe/cook semantics and target-engine shading parity |
| Convincing lighting and temporal stability | Build missing render systems around current custom shaders | Integrate established engine systems; verify support on runtime spherical meshes |
| Dense vegetation | Add assets, placement, representations, culling, wind and shadows | Add assets and ecology; validate supported foliage path and dynamic costs |
| Runtime procedural worlds | Preserve current seed path while strengthening budgets/cancellation | Prove runtime generation and collision in package; offline-only baked demo is insufficient |

Both routes need better evidence and content. A native engine may reduce renderer/tooling work, but cannot automatically solve spherical streaming or seed generation. A custom C++/Rust renderer additionally owns the full rendering and editor stack. A fair decision needs the representative packaged experiment and the actual target machine; no calendar/cost estimate is invented from this audit.

P0 exits with every core subsystem assigned a disposition or experiment. The next independent work is P1 target finalization and P2's bounded platform experiment. Local visual acceptance stays blocked until actual evidence arrives.
