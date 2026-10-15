# Aether Planetary Rebuild Plan and Prompts

This is the original version-1.0 guide. Read [STATUS.md](STATUS.md) for the executed steps and current next action; the original delivery/starting statements below describe the guide's creation date.

Version 1.0 • 11 October 2026

Build a native-first planetary explorer with convincing terrain, materials, water, atmosphere, vegetation and surface travel, with continuous transitions from the ground to space. Reach this through a measured reference world, reproducible local GPU inspection and small accepted milestones.

This is the execution guide for producing the detailed engineering specification and then implementing it. The engine choice remains a decision to prove. The milestone sequence, required specifications, evidence rules and prompts below are ready to use.

At delivery, the live repository documentation and latest commit have been inspected for this guide. The complete P0 code/runtime audit is the next task. Hardware targets and the final engine choice remain open; engine-specific specifications will be produced in P3. M0–M12 are planned work for the rebuild, and none is marked implemented or accepted by this guide.

## Start here

1. Open a coding session with access to the Aether repository. Use GPT-6.1 Sol Max for the audit, or Astra Max if you prefer to keep the initial planning together.
2. Attach this guide and run **Prompt 1** in the prompt section. It establishes the current baseline and creates the planning workspace.
3. Run **Prompt 2** to define the hardware, scope and visual targets.
4. Switch to **Astra Max** for **Prompt 3**, the platform decision, and **Prompt 4**, the detailed architecture.
5. Run **Prompt 5** in a separate review session with the resulting specifications. Resolve its findings with **Prompt 6**.
6. Run **Prompt 7** to build the local inspection foundation. Then use **Prompt 8** to implement one bounded milestone or work package at a time.
7. Use **Prompt 9** for visual review and **Prompt 10** to continue in a new session.

The first coding outcome is an inspectable, measurable renderer with a tiny test scene. A polished reference region follows. Planet diversity and solar-system scale follow acceptance of that reference.

## Project baseline and constraints

The source repository is [createdoutofthinair/aether](https://github.com/createdoutofthinair/aether). The inspected main-branch baseline is [0f3bf3d704ff301437e880eff2e6e5aa6c0c732c](https://github.com/createdoutofthinair/aether/commit/0f3bf3d704ff301437e880eff2e6e5aa6c0c732c), committed on 11 October 2026.

The existing project uses JavaScript, Three.js and WebGL2. Its current planning reference is [docs/terrain-rendering-research.md](https://github.com/createdoutofthinair/aether/blob/0f3bf3d704ff301437e880eff2e6e5aa6c0c732c/docs/terrain-rendering-research.md). The repository README and roadmap describe considerable implemented terrain, material, water and diagnostic work, while explicitly leaving moving-camera visual acceptance and representative GPU performance open. Historical sections describe different implementation stages; the audit must resolve their status against current code.

The current commit removes the automated screenshot workflow and capture UI. **Keep visual review local and manually initiated. Do not restore the GitHub screenshot pipeline or the removed capture UI.** Saved views, debug overlays, reproducible routes and manual measurement exports are appropriate foundations. The user can capture images or recordings locally and supply them for review.

This conversation expands the target to include vegetation. The previous terrain/water scope excluded vegetation; that earlier exclusion does not govern this rebuild.

Known reported symptoms to turn into reproduction cases include:

- Wheels intersecting the ground, floating rocks, and unstable contact during terrain refinement.
- Rocks or terrain detail appearing and disappearing visibly.
- Repetitive materials, muddy or noisy close-up surfaces, faceted landforms and unexplained dark patches.
- Jagged or shimmering shadows, water-edge flicker, implausible foam and unstable material transitions.
- Incomplete evidence from a real GPU despite successful numerical or shader checks.

These are reported symptoms, not diagnosed root causes. A current reproduction or code trace must support each diagnosis.

Hardware, target operating systems, disk budget and a final native engine have not been selected in this guide. Native desktop is the leading deployment candidate. Unreal with C++ is the first candidate for time to visual quality; a custom Rust/wgpu or C++ renderer remains a candidate if engine ownership or planetary constraints justify its extra work.

Preserve the current application as a reference until the replacement has passed its relevant acceptance cases. Create new work on an isolated branch or checkout. Reuse assets and concepts only after validating their quality, provenance and technical suitability.

## What ultimate quality means in this project

Replace the word “ultimate” in individual tasks with an observable outcome. The artistic ambition is AAA-inspired image quality and coherent planetary exploration. A task is useful when it specifies which scene improves, at which scale, on which device and under which measurement.

The quality contract covers seven dimensions:

| Dimension | Required outcome | Evidence |
| --- | --- | --- |
| Surface realism | Credible shape, scale, substrate, roughness, weathering and grounded objects | Ground-level images in multiple lighting conditions |
| Landscape structure | Recognisable geological formations, drainage and coherent transitions | Aerial and grazing-angle routes |
| Temporal stability | Stable silhouettes, materials, shadows, vegetation and water in motion | Repeatable movement recordings |
| Planetary continuity | Consistent landforms and lighting from surface to orbit and across topology boundaries | Ground-to-orbit and boundary-crossing routes |
| Interaction | Stable vehicle/camera contacts and predictable movement | Contact diagnostics and driving routes |
| Performance | Agreed frame-time distribution and bounded memory while moving | Local CPU/GPU traces and residency counters |
| Reproducibility | The same world and authored changes can be reloaded and investigated | Versioned seeds, inputs, scene manifests and build identifiers |

The initial product is a single-user planetary explorer and authoring workflow. Large multiplayer simulation, cities, crowds, a full economic simulation and physically complete climate/fluid simulation are separate expansions. Record them as deferred if they become desired; they must not silently enlarge the reference-world milestone.

## Model use and session discipline

These are workflow recommendations, not guarantees of correctness:

| Task | Suggested setting | Required inputs |
| --- | --- | --- |
| Baseline audit and bounded implementation | GPT-6.1 Sol Max | Repository, build/run access, current specification and defects |
| Core architecture and expensive technical decisions | Astra Max | Audit, hardware contract, references and candidate experiments |
| Detailed subsystem specification | Sol Max or Astra Max | Accepted architecture and interface contracts |
| Separate critical review | Astra Max | Complete requirements, specifications and evidence; review instructions |
| Optional parallel specialist review | Ultra where available | Explicitly divided review questions and one reconciliation owner |

OpenAI describes Max as giving a model additional reasoning time and Ultra as using subagents for separable work. Sol 6.1 is positioned for complex repeated work at lower cost than Astra. These descriptions do not establish a planetary-engine benchmark. Availability and settings should be checked in the client. [S01]

A separate review should receive the full requirements and evidence, then search for contradictions and omitted failure cases. It should not merely rewrite the same architecture in different words.

Keep every session anchored to the repository state. Start by reading the planning index and status ledger; end by updating the next actionable task, changed files, checks run and unresolved evidence. Never use a conversation summary as the sole specification.

## Evidence and completion rules

Track implementation and validation independently:

| Field | Allowed values |
| --- | --- |
| Implementation | not started, in progress, implemented |
| Functional validation | not run, pass, fail, blocked |
| Visual validation | not run, pass, fail, blocked, not applicable |
| Performance validation | not run, pass, fail, blocked, not applicable |
| Acceptance | open, accepted, rejected |

Acceptance requires the checks relevant to that work package. “Not applicable” needs a reason. A numerical library can be accepted without an image; a terrain, lighting, vegetation or water change needs relevant rendered evidence.

For rendered features, a successful build, shader compile or headless test is not visual evidence. A screenshot supports appearance in that frame; movement recordings support temporal behaviour; profiler results support performance on their recorded configuration. Do not substitute any one of these for the others.

When the agent cannot run the application on the target GPU, record exactly what is blocked and provide the local run instructions. Continue independent work that does not require the missing result. Do not advance dependent quality gates or claim the scene looks correct.

Keep these records:

- Every requirement has an ID and a linked acceptance case.
- Every architecture decision has alternatives, rationale, source evidence, experiment, owner and revisit trigger.
- Every defect has a reproduction, scene ID, severity, cause status and a linked fix.
- Every accepted visual milestone names the evidence reviewed and the reviewer.
- Every performance result includes device, driver, build mode, resolution, settings, route, timing method and capture conditions.

## Repository documentation to create during execution

Use the existing repository documentation convention. The following layout is proposed and can be adapted to actual project structure during the audit.

| File or directory | Purpose |
| --- | --- |
| docs/rebuild/INDEX.md | Reading order, current gate and next prompt |
| docs/rebuild/00-current-state.md | Baseline audit with code references and reproduction status |
| docs/rebuild/01-product-and-hardware.md | Scope, target machines, planet scale and performance contract |
| docs/rebuild/02-visual-targets.md | Licensed/reference images, scene intentions and comparison conditions |
| docs/rebuild/03-platform-decision.md | Engine/API decision and experimental results |
| docs/rebuild/04-system-architecture.md | Runtime, renderer, content pipeline and editor responsibilities |
| docs/rebuild/05-world-and-data-contracts.md | Units, coordinates, time, data schemas, revisions and determinism |
| docs/rebuild/06-rendering-and-streaming.md | Frame passes, LOD, resources, residency and cancellation |
| docs/rebuild/07-terrain-and-materials.md | Geological pipeline, physical detail scales and PBR recipes |
| docs/rebuild/08-lighting-water-atmosphere.md | Light transport approximations and cross-system integration |
| docs/rebuild/09-vegetation-and-physics.md | Population, representation, wind, collisions and vehicle integration |
| docs/rebuild/10-validation.md | Local inspection workflow, test routes and threshold definitions |
| docs/rebuild/11-milestones.md | Dependency order and bounded work packages |
| docs/rebuild/12-risks-and-deferred-work.md | Unproven assumptions, experiments and expansion scope |
| docs/rebuild/STATUS.md | Current state, results, blockers and next action |
| docs/rebuild/decisions/ | Individual architecture decision records |
| docs/rebuild/reviews/ | Findings and resolutions |
| docs/rebuild/evidence/ | Small text manifests and measurements referencing local captures |

Keep large image/video captures outside ordinary source history unless a deliberate asset-storage policy is selected. Evidence records must identify accessible captures or user-supplied attachments; a dead local path is insufficient for a remote reviewer.

## Planning sequence

### P0 Current implementation audit

**Purpose:** decide which problems are architectural, which are local defects, which are missing content, and which remain undiagnosed because the visual result was never observed.

Read the current repository, all applicable AGENTS.md files, README, roadmap, source tree, build scripts and tests. Confirm the latest commit instead of assuming the inspected baseline above is still current. Identify generated files versus authored source: this project currently contains application modules under dist, so do not classify that directory as disposable output without checking.

Trace the actual paths for terrain generation, terrain rendering, surface sampling, collision/contact, material mixing, material editor previews, ocean/shoreline composition and worker/cache invalidation. Inventory every user-facing setting that can change a world or affect quality.

As an early practical check, establish that the current application can be run and manually inspected on the user's local GPU. Record one identifiable scene and a short movement observation using the existing manual workflow. If that access is unavailable, create the precise local handoff immediately. Carry this limitation into P1 and P2; do not discover it only after a new renderer has been built.

For each reported symptom, establish:

1. A reproducible seed, location, camera setup, settings and action sequence.
2. Whether the symptom is currently observable on an available GPU.
3. The relevant code paths and tests.
4. A hypothesis and a discriminating experiment.
5. Whether existing tests cover the behaviour or only repeat the implementation.
6. A retain, repair, replace or unknown recommendation with evidence.

Inventory assets with geometry quality, map channels, real-world scale, colour conventions, licence, source and conversion history. Identify whether the material editor and planetary renderer evaluate the same recipe semantics.

**Deliverables:** current-state report, defect reproduction table, architecture map, asset inventory, test/evidence inventory and salvage matrix.

**Exit:** every core subsystem has a disposition or a named experiment. Rewrite cost and repair cost are compared by work packages and uncertainty, not invented calendar estimates. This stage does not require repairing the old engine.

### P1 Product, hardware and visual contract

**Purpose:** define the result that the new architecture must serve.

Record the actual GPU, VRAM, CPU, RAM, OS, driver, display resolution, storage type/free space and intended distribution targets. Separate a development machine from a minimum supported machine. Record any need for offline operation, browser delivery, controller support or cross-platform packaging.

Choose:

- Planet size range and maximum star-system extent.
- Ground movement, rover speed, low-altitude flight and orbital/transfer travel modes.
- The first reference planet and its authored reference region.
- Initial biome inventory and expected vegetation density.
- Required interaction and physical simulation fidelity.
- Asset download/cook/install budget and content authoring workflow.
- User-adjustable quality modes and accessibility/control requirements.

The following values are **candidate planning targets**, to be ratified or changed after measuring the actual machine:

| Item | Candidate contract |
| --- | --- |
| Primary interactive preset | 2560 × 1440 output at a 60 Hz frame target |
| Baseline image mode | Fixed internal resolution, fixed exposure for comparisons, frame generation off |
| Warm-route timing target | End-to-end frame-time p95 at or below 16.7 ms, p99 at or below 25 ms |
| Measurement protocol | Defined warm-up, 120-second route, three measured runs with raw timings retained |
| Hitch accounting | Report every frame above 50 ms and classify its cause; agree permitted counts explicitly |
| Memory | Peak resident usage below an agreed fraction of the available device budget; 80% is a starting proposal |
| Cold start and cold travel | Separate tests with explicit time-to-interaction and streaming-stall targets |
| Quality comparison | Fixed seed, simulation time, weather, route, settings, build and capture method |

The end-to-end, CPU and GPU timings are separate measurements. Do not add overlapping CPU and GPU pass times as if they were sequential. Record profiler and video-capture overhead separately. Dynamic resolution and upscaling can later be evaluated as distinct named presets with their internal resolution recorded.

Select references for a close material, exposed rock formation, vegetated slope, coastline, elevated landscape, atmosphere limb and orbital view. Record what is being matched: scale, composition, surface response, density, stability or illumination. A reference image does not specify its renderer or establish an achievable frame rate.

**Exit:** no major budget is silently assumed. Unknown values have an owner and a measurement task. Platform selection can be researched with provisional values, but its final gate requires the material constraints.

### P2 Research and platform decision

**Purpose:** choose a viable development path before a large rewrite.

Compare at least these candidates against the same reference scene and planetary requirements:

| Candidate | Main opportunity | Questions to prove |
| --- | --- | --- |
| Unreal Engine with C++ extensions | Existing renderer, authoring, profiling and asset pipeline | Runtime spherical terrain, geometry update path, gravity, collision, large-coordinate precision, cooked builds and engine-version constraints |
| Rust with wgpu | Custom native runtime with a possible browser path | Cost of building the renderer/toolchain, native feature coverage, material/asset support, profiling and future portability boundaries |
| Custom C++ renderer using a selected native API or abstraction | Direct control over the required graphics features | Engineering workload, resource lifetime, synchronization, asset tools, cross-platform cost and maintainability |
| Evolve the current browser implementation | Reuse and easy distribution | Measured current bottlenecks, WebGPU migration effort, missing render systems and acceptable quality/performance envelope |

Native-first is a hypothesis aligned with the current ambition. Select one shipping renderer first. A browser editor or lower-fidelity viewer is optional later work unless P1 makes browser execution mandatory.

Use current primary documentation and inspect the exact engine version. For each proposed dependency, record supported platform, version, maturity, cost/licensing implications that affect this project, and a fallback. Experimental features cannot be the sole route to a required acceptance case.

For Unreal, explicitly investigate:

- Which geometry is authored/cooked and which must be generated or changed at runtime.
- Whether the proposed terrain path actually works with the chosen Nanite, material, shadow and collision features in a packaged application.
- How spherical regions map to streaming, coordinates and physics. LWC, World Partition and PCG address useful pieces; their presence alone does not prove a seamless planetary implementation. [S02–S05]
- Whether arbitrary procedural seeds require an offline cook. A baked showcase and runtime world generation are different product capabilities.
- Which vegetation route is production-ready in the selected version. The currently retrieved Nanite Foliage documentation labels the feature Experimental. Keep a conventional supported representation available if necessary. [S06]

For wgpu, separate the shared browser feature set from native-only features. Portability is a property to design and test; a native build alone does not demonstrate browser parity. wgpu supports native and browser backends, but does not supply a complete planetary renderer. [S07]

Run the smallest experiments that can reject a candidate:

1. A curved terrain patch plus one topology boundary, placed at representative large coordinates.
2. Runtime generation/loading and unloading of that patch in a packaged build.
3. A moving contact body and camera across the patch seam.
4. A representative vegetation/material workload with shadows.
5. Measurement and manually initiated capture on the target GPU.

Each experiment needs a bounded scope, pass/fail condition and stopping point. Start with the leading candidate; only build competing experiments where an unresolved decision warrants them.

**Exit:** one documented engine/API/version choice, supported by experiments for the high-risk assumptions. If native tools or GPU access are unavailable, retain a provisional decision and the exact missing experiment.

### P3 Detailed architecture and subsystem specifications

**Purpose:** turn the chosen approach into implementable contracts.

Produce the documentation set above. Every subsystem specification must include:

- Requirement IDs and acceptance cases.
- Inputs, outputs, units, schema versions and ownership.
- Data structures and expected cardinalities.
- Algorithms and authoritative references, including the approximation being used.
- Coordinate spaces, numerical precision and time model.
- CPU/GPU responsibilities, thread boundaries and synchronization.
- Resource budgets, scaling behaviour and exhaustion policy.
- Persistence, deterministic IDs, cache keys and invalidation.
- Debug views, measurements, failure modes and recovery.
- At least one minimal experiment and its expected result.
- Dependencies, deliverables, fallback and a bounded implementation work package.

Use pseudocode and formulas where they resolve ambiguity. Define interfaces with real names and types once the engine is selected. Specify frame-pass ordering and resource ownership. Avoid a list of technology names without the data flow connecting them.

The architecture must trace one complete path from planet settings through generated/cooked terrain, resident render data, final image and vehicle contact; a second path must trace a user material edit through invalidation, recomposition and the next visible frame.

Specify system-wide invariants up front, then give the nearest work packages the most implementation detail. Revisit later algorithm and budget choices with measurements from earlier milestones. Document depth should make a decision executable; it should not freeze an untested assumption for the entire project.

**Exit:** engineers can implement a single work package without inventing cross-system rules. Unproven choices remain visible as experiments instead of being presented as settled facts.

### P4 Critical review and executable backlog

**Purpose:** find contradictions before they become implementation.

Review the specification separately for:

1. Graphics correctness and temporal behaviour.
2. Planetary precision, terrain topology and collision.
3. Streaming, scheduling, memory and cancellation.
4. Asset quality, material authoring and visual evidence.
5. Product scope, execution order and practical engine support.

A single careful reviewer can cover these sequentially. Optional Ultra review can assign these to separate reviewers and then reconcile the findings; disagreements must be resolved explicitly.

Classify findings by blocking, high, medium and low impact. Every finding names the conflicting requirement or section, its concrete consequence and an experiment or correction. Resolve circular dependencies, unsupported engine assumptions, impossible budgets and untestable quality claims.

Split milestones into work packages small enough to review and revert independently. Each package needs one main outcome, its test cases, affected contracts and a completion record. Distinguish the overall milestone from the smaller unit a coding session will execute.

**Exit:** no unresolved blocking architecture finding, a risk register with owners, and an executable first work package. The status ledger must still show all unimplemented milestones as open.

## Technical contracts the architecture must resolve

### Coordinates, units and time

Define a hierarchy of star-system, body-centred, body-fixed, regional and camera-relative spaces. Persist positions in a representation with sufficient precision for the intended system size; use local representations for rendering and physics where appropriate. GPU support for high precision must be checked instead of assuming all shaders use hardware doubles.

Specify handedness, axis conventions, quaternion order, units, radial altitude versus terrain clearance, and transformations for position, direction, normal and velocity. Materials, particles, wind, shadow caches and previous-frame matrices must remain stable when origins or reference frames change.

Declare whether physics runs in an inertial or rotating frame. Transform velocities consistently; include inertial effects when the chosen simulation requires them, or state the approximation. Keep celestial ephemeris time, fixed physics time and render interpolation explicit.

Test coordinate round trips, polar locations, topology edges, a distant system position, rebasing while stationary and rebasing during motion. A stable position with an incorrect previous-frame transform can still produce visible motion-vector artifacts.

### World definition and scientific plausibility

Version a compact world definition with stable IDs and units. Candidate fields include star mass/luminosity/spectrum, body mass/radius, rotation, axial tilt, orbital elements and epoch, atmosphere, temperature controls, volatile inventory, geology, water/ice settings and biome rules.

Validate internal relationships, for example surface gravity against mass and radius, orbit/body intersections, and compatible atmosphere/water assumptions. Distinguish physically derived values from art-direction overrides. Habitable-zone placement alone must not imply surface liquid water or vegetation.

Define how deterministic generation depends on world seed, generator version and content versions. CPU/GPU floating-point computations do not automatically reproduce bit-for-bit across vendors. Require stable IDs and agreed tolerances, and persist important authored results where exact reconstruction matters.

Separate static/cooked world data, deterministic derived caches, persistent edits and transient simulation. A cache can be discarded; authored terrain or material edits must survive it.

### Terrain topology and representation

Choose the actual spherical representation after comparing it against the maximum scale, visible relief, required caves/overhangs, streaming and engine support. Candidate approaches include cube-sphere patch hierarchies or projected grids; research demonstrates several ground-to-space strategies, not one universal solution. [S08]

Specify face transitions, neighbour lookup, sample identity on shared boundaries, bounds including displacement, pole/seam treatment and culling. Geometric detail should be chosen by projected error with hysteresis, while accounting for near-plane cases and rapid motion.

Define how child patches become ready before replacing parents. Parent removal requires complete valid coverage. Define morphing and shared-edge rules for geometry, normals, materials, shadows and collision so that a patch transition does not move the apparent ground independently of contact.

A height surface cannot represent every cave, overhang or vertical rock formation. State where explicit meshes or another local representation supplies that structure, how it blends visually, and how collision includes it.

### Geological generation

Separate global landform structure, regional processes, mesoscopic relief and microscopic shading. Define which are generated offline, on loading, on workers or on the GPU. Runtime generation must fit a declared budget.

Generate regional data with sufficient boundary context. Independent erosion of adjacent tiles can create inconsistent drainage and edge heights. Specify shared boundary conditions, overlap/halo handling, hydrological dependencies and persisted results.

Use coherent fields such as substrate, resistance, drainage, sediment, slope, exposure, moisture and temperature to drive both geometry and material placement. Record where geology is art-directed, heuristic or simulated. A believable landscape does not require simulating all geological history.

### Materials and assets

Define one material recipe and evaluation contract shared by preview, terrain and object shading. A web editor may author recipes for a native renderer, but parity requires a defined translator and comparison cases.

Record physical texture scale, colour encoding, channel meaning, normal convention, roughness interpretation, height units, opacity and blend order. Albedo, surface roughness and geometry must be calibrated under reference lighting before artistic grading.

Specify macro/regional colour, material family transitions, stochastic repetition control, detail normals, displacement and decal composition at their intended scales. Filter unresolved normal/displacement detail into an appropriate appearance representation. Validate mipmaps, anisotropy, grazing views and moving specular highlights.

Height-based blending, moss, lichen, snow and wetness need explicit masks and ordering. Moisture cannot make an airless dry world visibly wet without a deliberate world rule. Snow coverage must depend on the chosen environmental model and preserve correct material response.

Distinguish shader-only relief from collision-relevant geometry. Define maximum visible displacement without collision support. Author material and mesh exemplars before generating large inventories.

### Streaming and resource lifetime

Specify independent lifecycles for source bytes, decoded CPU data, generated geometry, cooked collision and GPU resources. A typical progression includes requested, in flight, prepared, upload pending, resident, retiring and absent; failure/cancellation paths must be explicit.

Use stable resource keys containing world identity, generator version, source revision and relevant quality settings. Reject stale asynchronous results after a seed change, edit, recenter or world switch. Retire GPU resources only after their users and relevant GPU work complete.

Prioritise visible coverage, predicted travel, collision needs and expensive preparation. Keep coarse parents resident until children are usable. Bound queue lengths, worker work, uploads per frame, CPU cache and GPU memory. Include backpressure and graceful quality reduction when budgets are exhausted.

Test rapid reversals, teleports, cold cache, slow storage, interrupted jobs, repeated world switches and memory pressure. Track resident bytes, requests, cancellations, page faults, upload time and stale-result rejections.

### Rendering, lighting and temporal history

Choose and document the rendering path. Define depth convention, prepass strategy where relevant, material passes, shadows, atmosphere, water/transparency, post-processing, exposure and output colour handling.

Establish correct previous-frame data for the camera, origin, terrain morphs, vegetation and water motion. Temporal antialiasing and reconstruction need motion vectors, history rejection and invalidation rules. Test disocclusion, new streamed detail, seed changes and camera teleports. Do not use temporal smoothing to hide permanently incorrect geometry or ghosting.

Share sun direction, light intensity, atmosphere parameters and environment lighting across terrain, water and vegetation. Define approximations for indirect light, occlusion and reflections. Shadow resolution and cache invalidation must account for moving leaves, terrain updates and origin changes.

Profile in the packaged/runtime build as well as in the editor. Editor-only results are a separate configuration.

### Atmosphere and clouds

Choose the scattering model, altitude range, density profiles and parameter units. State where the approximation is valid and how unusual atmospheres will be art-directed. Bruneton's reference implementation is a useful starting point for dimensional consistency and ground-to-space tests. [S09]

Define the interaction between surface lighting, aerial perspective, sky, water reflection, cloud lighting and celestial shadows. Avoid applying atmospheric attenuation twice to a surface or placing transparent water in the wrong composition order.

Clouds need bounded sampling cost, spatial coverage at different altitudes, consistent shadows and temporal reconstruction. Start with one controlled atmosphere; expose broad parameter variation only after its physical and visual behaviour is understood.

### Oceans and coastlines

Separate deep-water wave representation from shallow/coastal behaviour. If using spectral waves, specify spectrum, wind parameters, dispersion, gravity, scale bands, sampling, unresolved wave energy and shoreline treatment. Define the mapping over a sphere and its distortion/seam policy.

Foam requires a production proxy, transport, lifetime and physical visual scale. Make the proxy explicit. Depth-averaged shallow-water equations do not themselves reconstruct overturning wave surfaces; any breaking sheets or spray are additional approximations with their own visual acceptance.

Terrain bathymetry, mean sea level, displaced water, shoreline wetness, refraction, reflections, depth and collision/buoyancy must agree under the chosen approximation. Include frozen and dry worlds in every relevant world-setting change test.

Start with stable water and credible surface response. Add breakers, spray, wakes and interacting fluid regions only after cost and quality are demonstrated for the simpler layer.

### Vegetation and ecological placement

Derive placement from biome suitability, terrain, substrate, moisture and exclusions, with spatial clustering and variation. Assign stable per-instance IDs; changing a visible LOD or loading order must not regenerate unrelated trees.

Specify near, middle and distant representations for trunks, crowns, undergrowth and ground cover. Match silhouette, colour, coverage, normals and shadow contribution across transitions. Account for wind displacement in bounds and in temporal history.

Separate render detail, wind simulation, collision and interaction distances. Budget alpha overdraw, shadow invalidation and material variants; a high triangle count alone is not a vegetation-quality measure.

Use a small set of excellent, correctly scaled assets to prove the pipeline before expanding species counts. Record seasonal or ecological variation as later work unless it is part of the first reference scene.

### Physics, contacts and traversal

Define an authoritative surface query independent of camera-driven visual LOD. State the tolerance between physical and rendered surfaces and how new collision chunks replace old ones safely. Near-field collision readiness must influence travel safety and streaming priority.

Specify fixed-step integration, substep/catch-up limits, interpolation, surface normal use, wheel/suspension geometry, sweep/contact tests, collision proxies and camera clearance. Preserve transforms and velocities across origin/frame changes.

Test static contact, slopes, rocks, patch boundaries, fast movement, loading transitions, pause/resume and changes of gravity direction. A visually grounded rock needs a reliable foundation model; a rover needs contact consistent with the rendered ground at the agreed tolerance.

### Authoring, save data and deployment

Schema-version all planet presets, material recipes, biome rules and authored edits. Include validation, migration, import/export, deterministic rebuilds and recovery from invalid inputs.

Use the production renderer for material inspection where possible. Where a separate preview is needed, maintain a shared semantic contract and parity fixtures.

Choose asset source formats, cooked formats, compression, cache ownership and rebuild dependencies. Capture licence/provenance during import. Package the application so it works outside the developer's machine with explicit missing-asset diagnostics.

Do not build two equally ambitious renderers at once. Add browser viewing after the native reference passes, unless browser delivery is a hard requirement that changes P2.

## Implementation milestones

These milestones define the intended order. P3 and P4 must refine each into small work packages with exact interfaces and commands for the selected engine. Basic lighting, camera movement and diagnostics exist from M0; later milestones improve their fidelity.

| Milestone | Main result | Requires |
| --- | --- | --- |
| M0 | Reproducible native build and local inspection foundation | P0–P4 |
| M1 | Coordinate, time and surface-query foundation | M0 |
| M2 | Stable spherical terrain LOD and bounded streaming | M1 |
| M3 | Coherent geological reference region and grounded rocks | M2 |
| M4 | Production material pipeline and preview parity | M3 |
| M5 | Coherent lighting, atmosphere, shadows and temporal rendering | M4 |
| M6 | Stable ocean and credible coastal response | M5 |
| M7 | Vegetation and biome composition | M5; M6 for coastal vegetation cases |
| M8 | Rover, camera and surface interaction | M3; integration checks against M5–M7 |
| M9 | Accepted integrated reference world | M6–M8 |
| M10 | Planet families and star-system travel | M9 |
| M11 | Complete authoring and persistence workflow | M10 |
| M12 | Optimisation, packaging and release acceptance | M11 |

Minimal persistence, settings and asset import exist earlier wherever required to reproduce tests. M11 completes the end-user authoring experience. Basic contact tests start in M1; the rover integration is M8. Subsystems can be developed independently where their contracts and dependencies allow it, but the quality gates retain their order.

### M0 Build and inspect

Create a reproducible build in the chosen engine, dependency/version lock, a packaged development executable and clear local launch commands. Include a tiny scene with a calibrated material sphere, a sloped surface, a simple object and one light.

Add build and scene identity, deterministic setup, selectable debug views, pause/single-step where applicable, a saved camera/route, CPU/GPU timing access and manual measurement export. Use existing engine profiling tools before inventing a profiler.

Provide a short local inspection procedure using the user's normal screen capture/recording workflow. Do not add screenshot CI or restore the removed automatic capture interface.

**Acceptance:** the same build launches on the actual target machine; a real frame and a short movement recording can be inspected; a timing record identifies the GPU and build. If these cannot be obtained, graphics validation is blocked. A cloud software renderer does not satisfy this gate.

### M1 Coordinates, time and surface queries

Implement the world/body/region/camera coordinate contract, serializable transforms, simulation clocks and fixed-step/interpolated motion. Use a simple spherical surface with a small curved patch and an independent query for height, normal and material/terrain identity.

Create fixtures at the equator, poles, face boundaries and representative system distances. Exercise origin changes while stationary and during motion. Add a contact probe or simple body before introducing a full vehicle.

**Acceptance:** coordinate round-trip errors meet the P1/P3 tolerance; camera-relative rendering stays stable; a rebase does not produce visible scene motion or corrupt temporal history; contact queries agree with known analytic surfaces. Record the render/collision mismatch tolerance before advancing.

### M2 Terrain LOD and streaming

Implement the chosen spherical patch/grid hierarchy with crack handling, stable shared edges, bounded projected error, neighbour constraints and hysteresis. Add parent/child readiness rules and safe transitions. Test with simple analytic terrain before complex geology.

Implement resource requests, cancellation, revision checks, worker budgets, memory bounds and GPU lifetime management. Keep render and collision resource readiness separately visible. Add forced slow loading and reduced-memory diagnostic modes.

**Acceptance:** traverse boundaries and change altitude/speed without missing coverage, visible cracks or uncontrolled oscillation. Reverse direction and switch worlds while requests are in flight. No stale result enters the active world; memory/queue sizes stay bounded; a persistent coarse fallback maintains coverage.

### M3 Geological region and grounded rocks

Build one reference region containing a ridge, valley, exposed outcrop, sediment area, shoreline bed and traversable slope. Use an explicit shared geological data model and boundary strategy. Keep the region's location and scale consistent with its parent planet.

Introduce a small number of high-quality rock/outcrop assets with deliberate composition, stable placement, correct physical scale and foundation/contact rules. Preserve procedural instance identity across reloads and LOD changes.

**Acceptance:** forms remain recognisable from the ground, elevated view and orbit. Region boundaries do not introduce shape or normal discontinuities. Rocks stay grounded while terrain refines, and collision queries match the declared surface. Diagnose dark holes using depth/normal/material views before treating them as artistic shading.

### M4 Materials and asset preparation

Create a calibrated exemplars set covering the reference region's exposed rock, soil/sediment, sand or gravel, wet substrate and any required organic surface. Establish the shared recipe evaluator, physical scales and filtered distance transitions.

Implement the selected streaming/cooking path, import metadata, versioned recipes and material diagnostics. Add layered coverage, height blending and authored overlays only with channel-consistent semantics.

**Acceptance:** compare identical recipes on preview primitives, terrain and outcrops under controlled light. Inspect 0.5–2 m, 20 m, 200 m and kilometre-scale views. Moving grazing/specular views must retain stable surface appearance. Fine detail must resolve at its intended scale; distant surfaces must avoid magnified scan patterns and abrupt material changes.

### M5 Lighting, atmosphere and temporal rendering

Integrate the selected lighting and shadow system with the planet's sun and atmosphere. Establish exposure/tonemapping, indirect light approximation, contact occlusion and atmospheric perspective. Add clouds only after the simpler atmosphere is coherent.

Implement motion/history rules for rebasing, terrain refinement, streaming and moving objects. Inspect direct-only, indirect-only, normals, depth, motion vectors and shadow diagnostics.

**Acceptance:** reproduce noon, low sun, twilight and night configurations. Move near a shadow edge and through a terrain LOD transition; inspect for shimmer and trails. Ground, sky and orbital views must agree on sun direction and atmospheric boundaries. Meet the declared pass budgets or record the budget change before adding later expensive effects.

### M6 Ocean and coast

First establish correct sea-level geometry, depth, light absorption, reflection/refraction approximation and terrain intersection. Then introduce the selected wave bands and filtering. Add coastal response, wetness and persistent foam in independently reviewable packages.

Test both a calm coast and wind-driven open water. Include steep terrain/water intersections, grazing views, ice and a dry planet. Keep the first shoreline geographically bounded if the coastal solver is local.

**Acceptance:** fixed and moving camera routes show stable shorelines and plausible foam scale/lifetime. Terrain streaming does not detach the visible waterline or invalidate bathymetry silently. Wave and coastal updates meet their budgets. Breaking sheets/spray are accepted separately; their presence cannot substitute for a credible simpler water surface.

### M7 Vegetation and biome composition

Start with one tree family, shrubs and one ground-cover family. Add stable ecological placement, root/foundation rules, deterministic variation and exclusions around cliffs, water and paths.

Implement the selected near/middle/far representations, instance culling, wind and shadow/interaction distances. Create a dense forest edge and a slope with sparse transition vegetation.

**Acceptance:** walking, driving and aerial routes retain coherent density and silhouettes. Changes in LOD, wind or streamed tiles do not make unrelated plants teleport. Check root grounding, leaf lighting, repeated patterns, transparency cost and moving shadow cost. The dense case must meet the hardware contract before species count expands.

### M8 Rover, camera and surface interaction

Integrate the vehicle model, wheel geometry, suspension/contact model and physical movement with the canonical surface and collision streamer. Implement follow-camera collision and damping with gravity-relative orientation.

Exercise slopes, rocks, bumps, patch boundaries, high speed, pause/resume, low frame rates and origin changes. Test the camera separately so it cannot conceal bad wheel contact.

**Acceptance:** visual contact and numerical penetration/clearance meet defined tolerances on the route; terrain refinement cannot launch or sink the rover. Camera movement remains controlled during collisions and recentering. Loading collision safely ahead of travel has a documented failure response.

### M9 Integrated reference world

Combine the accepted region, rocks, materials, lighting, water, vegetation and traversal. Freeze a versioned reference configuration and run the full visual and performance matrix.

Review composition, scale, palette, asset repetition, contact, shadows, water and motion at the intended viewing distances. Fix cross-system defects before expanding world count. Maintain a separately identified cinematic preset if it exceeds the interactive budget.

**Acceptance:** the reference meets the approved visual targets in stills and in motion on the agreed machine; repeat runs reproduce the world; warm/cold performance and memory evidence meet the contract. This is the first “quality proven” gate for the combined result.

### M10 Planet families and star-system travel

Generalise the proven contracts to temperate, arid, glacial, volcanic and airless landable worlds. Add gas/ice giants as appropriate non-solid-body representations rather than pretending they share a normal terrain surface.

Introduce star/body definitions, orbital/rotational time, planet switching, travel and save/load across reference frames. Reuse material and terrain families through rules, with distinctive asset/landform identity for each profile.

**Acceptance:** every family has its own representative views and forbidden-state checks. Dry vacuum terrain does not inherit wet coast effects; unsuitable worlds do not acquire terrestrial vegetation accidentally. Changing worlds clears transient histories correctly while retaining persistent edits. Large-distance travel and approach preserve precision and memory bounds.

### M11 Authoring and persistence

Complete the planet/biome/material editor, recipe/placement workflows, import/export, version migrations, preset browser and authored overlay tools. Use the production evaluation path for visual previews or prove parity with it.

Support undo/redo where edits require it, validation before applying malformed data and targeted invalidation after valid edits. Distinguish source assets from generated caches and define reproducible cook steps.

**Acceptance:** a user can create a planet variant, modify a material layer or vegetation rule, save, close, reload and reproduce the result. Edits update all affected render/contact data at the documented boundary. An invalid import cannot corrupt the current project.

### M12 Optimisation, packaging and release

Profile the slowest accepted routes and optimise demonstrated bottlenecks. Preserve the accepted appearance while measuring each change. Add quality scalability with explicit per-feature changes and compare every preset independently.

Validate packaged builds on the agreed machine matrix, startup/cold travel, long sessions, device-loss/restart behaviour where supported, missing assets, repeated world switches and clean installation.

**Acceptance:** reproducible release build, asset/provenance manifest, usable controls and run instructions, declared hardware support, bounded memory after repeated tours and no unresolved release-blocking defect. Report limitations in concrete terms.

## Local visual inspection and measurement protocol

The protocol is manually initiated on a real GPU. Saved scene configurations and routes make it repeatable without restoring a hosted screenshot workflow.

### Required inspection scenes

| ID | Scene or route | Primary failures exposed |
| --- | --- | --- |
| V01 | Material specimen under controlled light | Incorrect scale, channel conventions, roughness or normals |
| V02 | Slow ground walk across soil and rock | Detail noise, contact mismatch, material repetition |
| V03 | Rover over a slope and patch boundary | Wheel sinking, collision replacement, camera instability |
| V04 | Rock/outcrop approach and retreat | Floating foundations, popping, silhouette changes |
| V05 | Altitude ladder over one location | Inconsistent scale, LOD gaps, material transitions |
| V06 | Ground-to-orbit and back | Precision, coverage, atmospheric/lighting discontinuity |
| V07 | Topology seam and polar crossing | Edge samples, normals, mapping and coordinate faults |
| V08 | Dense forest edge with wind | Overdraw, density changes, ghosting, shadow invalidation |
| V09 | Coast at low sun and grazing angle | Water intersections, foam scale, shimmer and transparency |
| V10 | Slow moving camera along shadow boundaries | Shadow shimmer, bias and temporal instability |
| V11 | Rapid reversal and cold-cache flight | Streaming starvation, stale work, memory spikes |
| V12 | Repeated world changes and return | History contamination, lost edits, leaks and identity errors |
| V13 | Preview material compared with world material | Divergent recipe evaluation or filtering |
| V14 | Long mixed traversal and constrained memory | Growth, thrashing, resource lifetime and recovery |

Use absolute altitude and body-relative altitude appropriately. The same 75 km viewpoint means something different for different planet radii. Define each route in physical units and record its relation to terrain and body scale.

### Capture conditions

For every review, record build/commit, dirty-state flag, engine version, asset/generator versions, GPU/driver/OS, resolution and internal render scale, quality preset, seed, planet ID, location, camera/FOV, simulation time, weather, exposure and route ID.

Take:

1. A normal rendered image at the intended output resolution.
2. The relevant diagnostic views at the same setup.
3. A short movement recording for transition or shimmer defects.
4. Timing/memory exports when the claim involves performance.

For suspected timing faults, obtain a run without video capture as well. Preserve raw measurements. Document how warm-up, loading frames and outliers are handled instead of selectively excluding slow frames.

### Review procedure

- Check the intended image at full size and at normal presentation size.
- Compare against the target and the last accepted build under the same conditions.
- Use diagnostics to distinguish geometry, normals, lighting, material or streaming faults.
- Assess a temporal fault from motion. A still image alone cannot establish its absence.
- Record observations, hypotheses and measured facts separately.
- File one defect per independently reproducible issue, with affected scene and severity.
- After a fix, replay the failing case and a nearby regression case.
- Promote a new baseline only after explicit review of the evidence. Do not accept a worse result simply because it is newer.

Pixel-identical comparisons across different GPUs are not a universal correctness criterion. Numerical tolerances and visual metrics must be chosen for the effect and configuration. An image similarity score can flag change; it cannot prove plausible geology, good composition or correct rover contact.

### Candidate acceptance metrics

P1 and P3 must turn these into actual agreed values and procedures:

| Property | Metric to define |
| --- | --- |
| Terrain geometry | Maximum projected error and measured boundary discontinuity |
| Rebase stability | Maximum stationary-camera image displacement, excluding intentionally moving effects |
| Collision agreement | Maximum physical/rendered surface discrepancy and wheel-contact error |
| Streaming | Maximum time without required coverage, queue size, upload work and peak resident memory |
| Temporal appearance | Reproducible route and severity threshold for visible popping, shimmer and ghosting |
| Performance | End-to-end frame distribution, CPU/GPU costs, hitches and memory on a named configuration |
| Determinism | Stable IDs and content hashes where exact; explicit tolerances where floating-point output varies |
| Content quality | Approved exemplars and a reviewed scene checklist for scale, repetition and composition |

For example, a stationary rebase test can propose less than half a pixel of unintended displacement at the agreed reference camera. This is a proposed criterion, not a claim about the current renderer. Derive numerical tolerances from physical and projected scale instead of adopting arbitrary universal constants.

## Required planning templates

### Architecture decision record

~~~text
ID and title:
Requirement IDs:
Decision status:
Decision and exact supported engine/API versions:
Alternatives considered:
Evidence and primary sources:
Experiment, configuration and result:
Consequences for assets, runtime, editor and deployment:
Performance/memory assumptions:
Known limitations and fallback:
Owner and revisit trigger:
~~~

### Work package

~~~text
ID and milestone:
One observable outcome:
Dependencies and affected contracts:
Inputs and outputs:
Implementation scope and expected file/module boundaries:
Algorithm or data-flow change:
Budgets and exhaustion/cancellation policy:
Functional checks:
Visual scenes and acceptance criteria:
Performance checks:
Reproduction/run commands:
Required evidence:
Rollback boundary:
Implementation / functional / visual / performance / acceptance status:
Next action:
~~~

### Visual defect

~~~text
ID, severity and affected requirement:
Build/commit and configuration:
Scene/route, seed, location and time:
Reproduction steps:
Expected observation:
Actual observation:
Images/recordings and diagnostics:
Measured facts:
Root-cause hypothesis and confidence:
Experiment that distinguishes this cause from alternatives:
Fix:
Failing-case replay and regression case:
Remaining limitations:
~~~

### Evidence manifest

~~~json
{
  "schemaVersion": 1,
  "caseId": "V06",
  "buildCommit": "record the actual commit",
  "workingTreeDirty": false,
  "engineVersion": "record the actual version",
  "generatorVersion": "record the actual version",
  "assetManifestHash": "record the actual hash",
  "device": {
    "gpu": "record actual GPU",
    "driver": "record actual driver",
    "os": "record actual OS",
    "cpu": "record actual CPU",
    "ramGiB": null,
    "vramGiB": null
  },
  "sceneConfig": "path to versioned scene definition",
  "route": "path to versioned camera route",
  "renderSettings": "path to exact settings",
  "measurements": "path to raw local measurement export",
  "captures": [],
  "captureMethod": "manual local workflow",
  "observation": "",
  "visualStatus": "not run",
  "performanceStatus": "not run",
  "reviewer": "",
  "limitations": []
}
~~~

This is a template. Fill actual values during execution; null or empty fields are not evidence of a completed test. Keep private machine/user information out of any published manifest.

## Copy-ready prompts

Run these in order. Attach this guide to the first session. Once the documentation exists in the repository, later sessions should read the repository copies and the current status ledger.

The prompts create an executable specification progressively. They do not ask a model to invent every engine detail before it has inspected the code, selected the platform and tested the critical assumptions.

### Prompt 1 Establish the baseline

Suggested model: GPT-6.1 Sol Max. Astra Max is also appropriate.

~~~text
Use the attached Aether Planetary Rebuild Plan and Prompts as the execution guide.

The source repository is https://github.com/createdoutofthinair/aether.
Our goal is a high-quality planetary explorer with convincing terrain,
materials, water, atmosphere, vegetation, rover travel and seamless
ground-to-space transitions. Native desktop is the leading candidate;
the final engine choice is still open.

Execute P0 only: audit the current implementation and prepare the planning
workspace. Read applicable AGENTS.md instructions, the current README,
docs/terrain-rendering-research.md, source modules and test/build scripts.
Verify the current branch and commit. Preserve existing work and use an
isolated planning branch or checkout.

Trace terrain generation, LOD, coordinates, surface/contact queries,
materials and editor previews, water, lighting, streaming and invalidation.
For each subsystem, recommend retain, repair, replace or investigate,
with concrete code references. Inventory reusable assets and their provenance.

Turn the known issues—floating rocks, sinking wheels, popping, repetitive
or noisy materials, jagged shadows, water flicker and implausible foam—
into reproducible cases. Separate observed facts from hypotheses. Run
available relevant checks, and state exactly which GPU/visual checks
cannot be performed in this environment.

Create docs/rebuild/INDEX.md, 00-current-state.md and STATUS.md, including
a salvage matrix, defect/evidence inventory, uncertainty list and the next
action. Compare repair and rebuild by concrete work and uncertainty.

Visual inspection will be local and manually initiated. Keep the removed
GitHub screenshot pipeline and automatic capture UI removed. Vegetation
is part of the expanded target for this rebuild.

Do not start the production rewrite during this audit. Finish with the
findings, document locations and whether P1 is ready to begin.
~~~

### Prompt 2 Define the target and local validation contract

Suggested model: Sol Max or Astra Max.

~~~text
Read the Aether rebuild guide, docs/rebuild/INDEX.md, 00-current-state.md
and STATUS.md. Execute P1.

Define the product scope, intended planetary scale, traversal modes,
reference region, initial biome/vegetation scope, asset workflow,
deployment targets and concrete visual targets.

Establish the actual target GPU, CPU, VRAM, RAM, OS/driver, resolution and
storage constraints from available information or approved local tools.
Do not mistake a cloud container's hardware for the user's computer.
Ask concisely for only the consequential information that remains missing.
Keep unresolved values visibly provisional while completing independent work.

Turn the guide's candidate budgets into a proposed measurable contract.
Specify frame-time percentiles, cold/warm runs, hitches, memory, internal
resolution, exposure, capture overhead and repeatability.

Define reference scenes V01–V14 as needed, with seeds, camera/route data,
lighting/time, diagnostic views, pass criteria and required evidence.
Choose reference imagery with clear attribution and explain what each
reference establishes; do not infer its performance from its appearance.

Create 01-product-and-hardware.md, 02-visual-targets.md and the initial
10-validation.md. Update the index and status. Identify what is settled,
what requires an actual measurement, and what P2 can proceed with.
~~~

### Prompt 3 Select the platform through evidence

Suggested model: Astra Max.

~~~text
Read the Aether rebuild guide and all completed planning documents.
Execute P2: research and decide the engine/API path.

Evaluate Unreal Engine with C++, a custom Rust/wgpu runtime, a custom C++
native renderer, and evolution of the current browser renderer against
the same product, planetary, visual and hardware requirements.

Prioritise time to verified image quality and maintainability. Treat
native-first as the leading hypothesis, not an already-proven result.
Use current primary sources and pin exact engine/dependency versions.
Identify preview/experimental features and the fallback for each required
capability that depends on one.

For Unreal, explicitly prove the proposed runtime spherical terrain path,
large-coordinate rendering, local gravity/physics, collision streaming,
material/shadow integration and packaged-build behaviour. Distinguish
runtime generation from offline cooked content. Do not assume Nanite,
World Partition, PCG or LWC automatically solves a procedural planet.

For custom paths, cost the renderer, streaming, shaders, material tools,
asset pipeline, profiling and packaging we must actually build. Separate
wgpu's shared web capabilities from native-only paths.

Design and, where the environment supports it, execute bounded disposable
experiments for the highest-risk assumptions. Record code, configuration,
measurements, actual images inspected and limitations. If local GPU or
native tooling is missing, provide exact next experiment instructions and
keep the affected decision provisional.

Produce 03-platform-decision.md with a reasoned comparison, one recommended
path, rejected alternatives, experiment outcomes, fallback and revisit
criteria. Update decisions and STATUS.md. Do not begin a broad rewrite.
~~~

### Prompt 4 Produce the full engineering specification

Suggested model: Astra Max. This is the main deep-planning prompt.

~~~text
Read the Aether rebuild guide and the current repository planning documents.
Execute P3 using the accepted platform decision. If that decision is still
provisional, state which parts can be specified and which depend on its
remaining experiments.

Produce an implementation-grade specification for the complete planetary
system. Cover coordinates/precision/time, world definitions and plausibility,
terrain topology/LOD, geology and hydrology, materials and asset preparation,
streaming and GPU lifetime, rendering and temporal history, lighting/shadows,
atmosphere/clouds, oceans/coasts, vegetation, physics/rover/camera,
authoring/persistence, profiling, local visual validation and packaging.

For every subsystem define concrete inputs/outputs, units, versioned schemas,
ownership, interfaces, algorithms, CPU/GPU/thread responsibilities, budgets,
scaling, dependencies, cache identities/invalidation, failure/recovery,
debug views, functional checks, visual cases and performance criteria.
Include pseudocode and formulas where they settle important ambiguity.
Support unusual or version-sensitive claims with primary sources.

Trace a complete frame and one terrain/material edit through the system.
Resolve the relationships between visual terrain and physical contact;
origin changes and previous-frame motion; world settings and all caches;
material preview and production shading; water/atmosphere/transparency;
vegetation movement, bounds and shadows; and streaming versus travel safety.

Use the guide's M0–M12 sequence, refine dependencies, and split milestones
into small bounded work packages. Each needs requirement IDs, outputs,
tests, visual evidence, budgets, rollback scope and an explicit exit gate.
Create a requirement-to-test traceability table.

Keep observed results, researched choices, proposed assumptions and unrun
experiments distinct. Do not claim visual or performance acceptance from
code compilation. Require manually initiated local GPU inspection and keep
the removed GitHub screenshot workflow and capture UI removed.

Write the detailed repository documentation, decision records, risk register
and milestone backlog. Reconcile all documents and update INDEX.md and
STATUS.md. End with the exact first reviewable work package.
~~~

### Prompt 5 Critically review the plan

Suggested model: Astra Max in a separate review session.

~~~text
Review the Aether rebuild specification as a graphics/engine reviewer who
must find implementation-breaking assumptions before coding begins.
Read the product contract, current-state audit, platform decision, all
subsystem contracts, validation plan, milestones and risk register.

Check completeness and consistency across coordinates, units, precision,
time, topology, LOD, render/collision agreement, GPU resource lifetime,
streaming/cancellation, material semantics, motion vectors/history,
atmosphere/water ordering, vegetation/shadow costs, engine-version support,
runtime generation versus cooking, memory/performance budgets and evidence.

Trace the hardest scenarios: rapid ground-to-orbit travel; a rebase while
driving across a streaming boundary; switching worlds with jobs in flight;
editing a material while caches are resident; low-sun windy forest rendering;
and a cold-cache coastline approach.

For every finding, cite the conflicting requirement or document section,
describe a concrete failure, assign severity and propose a correction or
experiment. Look for circular dependencies, hidden global allocations,
untested experimental features, missing asset work and unverifiable claims.

Write docs/rebuild/reviews/architecture-review.md and a short verdict:
ready, ready with nonblocking findings, or not ready. Do not rewrite the
entire plan or implement features in this review. Do not mark any runtime
quality gate passed without actual evidence.
~~~

### Prompt 6 Reconcile the specification and freeze the first scope

Suggested model: Astra Max or Sol Max, depending on findings.

~~~text
Read the Aether rebuild specification and architecture review.
Resolve each finding individually. Update the affected contracts,
decision records, risk register, milestone dependencies and traceability.

For an unresolved empirical question, create a bounded experiment with a
clear result needed to close it; do not silently replace uncertainty with
a confident assertion. Keep the architecture provisional where necessary.

Produce a findings-resolution table with references to each change or
experiment. Confirm whether any blocking issue remains and identify the
first executable M0 work package.

Update INDEX.md and STATUS.md so another coding session can continue
without relying on this conversation. This task reconciles the design;
it does not implement the production renderer.
~~~

### Prompt 7 Implement the local inspection foundation

Suggested model: GPT-6.1 Sol Max.

~~~text
Read the accepted Aether rebuild documents and STATUS.md. Execute the
first bounded M0 work package, then complete M0 where its dependencies
and environment permit.

Set up the selected native project with pinned dependencies, reproducible
build/run instructions and a tiny calibrated scene. Add deterministic
scene configuration, build identity, saved views/routes, relevant debug
views, timing access and manual measurement export using the engine's
existing facilities where possible.

Make the scene runnable on the actual target GPU. Provide a concise
manually initiated local inspection procedure with exact commands and
expected observations. Keep the removed GitHub screenshot pipeline and
automatic capture UI removed.

Run meaningful functional/build checks available here. Inspect actual
rendered evidence if this environment supports it. If native execution,
GPU access or returned local captures are unavailable, record exactly
which part is blocked. Do not substitute a mockup, generated image or
software-renderer result for target-GPU evidence.

Update the implementation, functional, visual and performance fields
separately. M0 is accepted only when its required real-GPU evidence has
been reviewed. Complete independent work, but do not silently advance
dependent visual milestones. Leave the next executable action in STATUS.md.
~~~

### Prompt 8 Execute one work package

Suggested model: GPT-6.1 Sol Max.

~~~text
Continue the Aether rebuild from the repository's docs/rebuild/INDEX.md
and STATUS.md. Read the accepted architecture, relevant subsystem contracts,
latest review findings and evidence ledger.

Select the next ready bounded work package in the milestone backlog.
State its ID, main outcome, dependencies and acceptance criteria.
Implement that package without expanding into unrelated features.

Preserve user changes. Respect units, coordinate spaces, resource ownership,
versioned data and the shared surface/material contracts. Use the selected
engine's supported features and pin any new dependency.

Run the meaningful functional checks and the relevant visual/performance
cases. For rendering changes, inspect actual frames and motion when required.
If a local target-GPU run is needed, provide exact reproduction commands
and expected evidence and mark that validation blocked until results arrive.
Do not claim visual correctness based on a successful build.

Fix failures within the package. Re-run the failed and relevant regression
cases after changes. If an architecture assumption fails, document the
evidence and propose the smallest necessary design revision instead of
adding unbounded workarounds.

Update the package, defects, evidence, INDEX.md and STATUS.md. Report the
result, tests, observed visual/performance outcome, remaining limitations
and exact next action. Stop at this reviewable package boundary.
~~~

### Prompt 9 Review local visual evidence

Suggested model: Astra or Sol at High/Max; choose depth for the complexity.

~~~text
Review the supplied Aether screenshots, movement recording and measurement
exports against their scene manifest and the accepted visual contract.
Read the relevant subsystem specification and previous accepted evidence.

Assess scale, geometry/silhouettes, materials, lighting/shadows, water,
vegetation, object grounding, camera/vehicle contact and temporal stability
where the supplied evidence supports each judgment.

Separate direct observations from suspected causes. Do not infer frame rate,
memory use, GPU identity or the absence of temporal artifacts from a still
image. If the recording cannot be inspected directly, state that limit and
identify the additional frames or observations needed.

Create precise defects with affected scene, reproduction, evidence, severity
and a discriminating diagnostic experiment. Compare timing only when device,
build, settings, route and measurement method are compatible.

Update visual/performance status only for cases supported by the evidence.
Recommend accept or reject for the milestone, with concrete reasons and the
smallest next corrective work package. Do not implement speculative fixes
during this evidence review.
~~~

### Prompt 10 Continue in a fresh session

Suggested model: the model appropriate to the next task in STATUS.md.

~~~text
Continue the Aether planetary rebuild.

Read docs/rebuild/INDEX.md and STATUS.md first, then the accepted product
contract, platform decision, architecture and the documents relevant to the
next work package. Inspect the current repository commit and working tree.
Use repository evidence to reconcile any difference from earlier summaries.

Identify the current gate, completed work, unresolved defects, blocked local
GPU evidence and next ready task. Preserve the manual local visual-review
workflow and the removal of automated GitHub screenshot capture.

If local evidence has been supplied, review it before selecting dependent
work. Otherwise execute one ready work package using the guide's Prompt 8
discipline, or complete the pending planning/review task named in STATUS.md.
Do not mark a blocked acceptance gate passed to keep the roadmap moving.

End by updating the same status and evidence records so the following
session has a reliable starting point.
~~~

### Prompt 11 Diagnose a specific visual defect

Suggested model: Sol Max; use Astra Max when the cause spans subsystems.

~~~text
Investigate defect [DEFECT_ID] in the Aether rebuild.
Read its reproduction, evidence, affected contracts and relevant code.

Reproduce it under the recorded configuration if execution is available.
Separate symptoms from causes and rank plausible explanations.
Choose the smallest experiment that distinguishes the leading explanations.
Use geometry, normals, depth, material, motion/history, shadow or residency
diagnostics as appropriate.

Keep unrelated settings fixed. Record before/after evidence using the same
scene and route. Implement the smallest justified correction, run the
failing case and relevant regressions, and assess its performance impact.

If reproduction or evidence is unavailable, provide an exact local
diagnostic procedure and retain the defect as unresolved. Avoid speculative
visual tuning that changes several systems at once.

Update the defect, relevant specification if necessary, evidence ledger
and STATUS.md with the diagnosed cause, result and next action.
~~~

### Prompt 12 Optional parallel architecture review

Suggested mode: Ultra, if available. This prompt explicitly requests delegation.

~~~text
Perform a parallel critical review of the Aether rebuild specification.
Use subagents with the same full product contract and accepted platform
decision. Assign independent ownership of these review areas:

1. Rendering, materials, lighting, water and temporal correctness.
2. Coordinates, planetary terrain, topology, physics and traversal.
3. Streaming, scheduling, memory, resource lifetime and performance.
4. Asset pipeline, authoring, visual validation and execution sequencing.

Each reviewer must return concrete findings with document references,
severity, a failure scenario and a correction or experiment. They should
not implement features or overwrite the shared specification.

As the coordinating reviewer, reconcile duplicate and conflicting findings,
inspect cross-subsystem assumptions and produce one consolidated review
and a ready/not-ready verdict. Preserve disagreements until evidence
resolves them. Update the review index and status without claiming any
unrun experiment has passed.
~~~

## How to respond to results during execution

Use the status ledger to choose the next action:

| Result | Next action |
| --- | --- |
| P0 audit complete | Prompt 2 |
| Product/hardware contract sufficiently defined | Prompt 3 |
| Platform decision accepted | Prompt 4 |
| Detailed specification complete | Prompt 5, optionally Prompt 12 |
| Review has unresolved findings | Prompt 6 |
| Design ready and first work package defined | Prompt 7 |
| Implementation package ready for visual review | Run locally, then Prompt 9 |
| Evidence identifies a defect | Prompt 11 |
| Package accepted and next dependency is ready | Prompt 8 |
| New session or model | Prompt 10 |
| Fundamental assumption disproved | Reopen the affected decision and dependent gates |

“Continue” should mean the next ready bounded task, not automatic progression past unresolved graphics evidence. Hardware access is an explicit dependency; extra reasoning cannot replace a missing measurement.

## Risk register to initialise

| Risk | Early experiment or mitigation | Gate affected |
| --- | --- | --- |
| A fresh engine repeats existing visual defects | Carry reproductions and their evidence into the new test matrix | P0, M9 |
| Engine features do not support runtime spherical terrain | Packaged-build curved-terrain experiment with actual selected features | P2 |
| Precision or rotating-frame faults | Rebase/frame tests at representative scale with contact and temporal diagnostics | M1 |
| Cracks, missing parents or collision swaps during LOD | Analytic terrain and forced slow streaming | M2 |
| Runtime erosion/generation exceeds budget | Benchmark bounded regional work and decide offline versus runtime allocation | P3, M3 |
| Low-quality assets limit realism | Approve a small material/mesh exemplar set before scaling content | M3, M4 |
| Material preview differs from the world | Shared recipe semantics and V13 comparisons | M4 |
| Temporal reconstruction hides errors or creates trails | Motion/history diagnostics and disocclusion routes | M5 |
| Shoreline complexity consumes the frame budget | Accept basic water first; budget every additional coastal effect | M6 |
| Forests fail due to overdraw/shadows despite low draw calls | Representative dense forest profile with moving wind and light | M7 |
| Visual and physical terrain disagree | Independent canonical query and explicit discrepancy tolerance | M1, M8 |
| Data/settings changes leave stale resources | Revision/epoch tests with rapid switching and active jobs | M2, M10 |
| Documentation reports progress without evidence | Separate validation fields and linked capture/measurement records | All |
| Two renderers double maintenance prematurely | Prove the native reference before adding an optional browser viewer | P2, M9 |
| Scope expands before one world is convincing | Reference-world acceptance before planet-family expansion | M9 |
| No working GPU feedback is available to the agent | Local run/capture procedure and explicit blocked evidence state | M0 onward |

## Sources and how to use them

The design requirements in this guide are proposed engineering contracts. The following sources support specific background facts or provide starting points for the research stages. Their existence does not validate an Aether implementation. Recheck documentation against the exact version chosen in P2.

- **S01 — OpenAI model guidance.** [Models](https://learn.chatgpt.com/docs/models). Supports the Sol/Astra positioning and Max/Ultra distinction. Accessed 11 October 2026.
- **S02 — Epic Large World Coordinates.** [LWC overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/large-world-coordinates-in-unreal-engine-5). Describes higher-precision engine data and large-world support; the retrieved overview includes a Beta label. Inspect maturity for the selected engine version.
- **S03 — Epic large-coordinate rendering.** [Rendering overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/large-world-coordinates-rendering-in-unreal-engine-5). Explains DoubleFloat and translated-world considerations; useful for shader/material precision decisions.
- **S04 — Epic World Partition.** [World Partition](https://dev.epicgames.com/documentation/unreal-engine/world-partition-in-unreal-engine). Documents grid streaming, HLOD and cooking. It is a source for those systems, not proof of a spherical planet solution.
- **S05 — Epic PCG generation.** [PCG generation modes](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-pcg-generation-modes-in-unreal-engine). Documents runtime generation sources, scheduling, radii and pooling.
- **S06 — Epic foliage.** [Nanite Foliage](https://dev.epicgames.com/documentation/unreal-engine/nanite-foliage). Documents a foliage pipeline and currently labels it Experimental. Treat demonstration figures as configuration-specific examples, not Aether budgets.
- **S07 — wgpu.** [Official project](https://wgpu.rs/). Describes native Vulkan/Metal/DirectX and browser WebGPU support.
- **S08 — Planet rendering research.** [Real-time Rendering of Procedural Planets at Arbitrary Altitudes](https://www.cg.tuwien.ac.at/research/publications/2019/kerbl_2019_planet_poster/). Investigates continuous terrain, spherical waves, atmosphere and clouds across viewpoints. Its reported performance belongs to its own implementation and hardware.
- **S09 — Atmospheric scattering reference.** [Eric Bruneton reference implementation](https://ebruneton.github.io/precomputed_atmospheric_scattering/). A primary implementation and explanation for precomputed atmosphere rendering and validation.
- **S10 — WebGPU design.** [GPU for the Web explainer](https://gpuweb.github.io/gpuweb/explainer/). Explains browser architecture, resource access and the portable API's scope.
- **S11 — Epic shadows.** [Virtual Shadow Maps](https://dev.epicgames.com/documentation/unreal-engine/virtual-shadow-maps-in-unreal-engine). Describes shadow pages, caching and dynamic-content costs.
- **S12 — CIG environment production.** [Environment Art AMA](https://robertsspaceindustries.com/en/comm-link/transmission/17735-Environment-Art-AMA-Recap). Historical production context for geology, vegetation and material asset libraries; it is not a current feature inventory.
- **R01 — Aether current roadmap.** [Pinned roadmap](https://github.com/createdoutofthinair/aether/blob/0f3bf3d704ff301437e880eff2e6e5aa6c0c732c/docs/terrain-rendering-research.md).
- **R02 — Aether current README.** [Pinned README](https://github.com/createdoutofthinair/aether/blob/0f3bf3d704ff301437e880eff2e6e5aa6c0c732c/README.md).
- **R03 — Aether workflow decision.** [Removal of automated screenshot validation](https://github.com/createdoutofthinair/aether/commit/0f3bf3d704ff301437e880eff2e6e5aa6c0c732c).

## Immediate next action

Start with **Prompt 1** against the current Aether repository. The audit should produce the reliable baseline for the rebuild decision. Then establish the hardware and visual contract before choosing and expanding the native architecture.

The first accepted implementation milestone is M0: a real, inspectable and measurable result on the target GPU. The first combined visual-quality milestone is M9: one convincing reference world. Each later planet and feature inherits that same evidence discipline.
