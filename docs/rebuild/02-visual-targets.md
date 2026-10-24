# P1: visual target and scene register

Status: **candidate cases prepared; renderer evidence not captured**. Source textures were inspected in P0. Every appearance claim below is an intended result, not a result observed in Aether.

## Reference register

| ID | Reference and attribution | What it is used to establish |
| --- | --- | --- |
| A01 | Bundled [Dry Boulder](https://polyhaven.com/a/rock_boulder_dry), README attribution to Dimitrios Savva / Rico Cilliers; declared CC0 | Rock substrate structure, source channels and 1.8 m declared tile scale; source albedo viewed |
| A02 | Bundled [Sandy Gravel](https://polyhaven.com/a/sandy_gravel), Charlotte Baglioni; current source page and [asset license](https://polyhaven.com/license) verified 11 October 2026 | Gravel/sediment grain; source width 2.1 m versus Aether's declared 2 m tile scale; source albedo viewed |
| A03 | Bundled [Cracked Dry Mud 03](https://polyhaven.com/a/mud_cracked_dry_03), Dario Barresi / Dimitrios Savva; declared CC0 | Cracked sediment pattern and 1.5 m declared tile scale; source albedo viewed |
| A04 | [Rock Face 01](https://polyhaven.com/a/rock_face_01), Dario Barresi; bundled attribution declares CC0 | Scanned formation dimensions and silhouette; imported geometry still requires rendered review |
| A05 | [Epic Nanite Foliage documentation and linked technical demo](https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-foliage) | Candidate reference for volumetric vegetation/distance representation; frame/density/wind target not selected or reviewed here |
| A06 | [CIG Environment Art AMA](https://robertsspaceindustries.com/en/comm-link/transmission/17735-Environment-Art-AMA-Recap) | Production context for the user's Star Citizen ambition; no images/assets copied or performance inferred |

Add one specifically attributed reference frame each for landform composition, vegetation, low-sun coast, atmosphere limb and orbit during local review. Record framing, scale and which observable characteristic is being matched. References A05/A06 are source links, not completed appearance comparisons or asset permissions.

## Shared baseline conditions

Reload the default Nacre world: system seed 6 / G star; world seed 6, relief 1, temperature 18°C, sea level −180 m, pressure 1, activity .45; water/ice/basin enabled, organic-ground false. Use High quality and exposure 1.1. Terrain/outcrop views set sun elevation to 25°; coast sets 28°. FOV is 55°. Record actual drawing-buffer size; High allows up to 2× device pixel ratio, so window size alone does not establish internal resolution.

The versioned [case definitions](scenes/baseline-cases.json) contain entry commands and intended observations. Current manual movement sequences are approximate routes: keyboard duration and camera drag are not exact recorded poses. A replacement M0 must supply deterministic saved routes and complete scene/time identity.

## V01–V14

| ID | Candidate entry and action | Pass criterion and evidence | Current support |
| --- | --- | --- | --- |
| V01 | `material-editor.html`; select each source material, plane/sphere, fixed camera and lighting | Physical scale and channel response credible; specimen image + channel/debug views | Preview exists; calibration/planet recipe parity open |
| V02 | `?view=terrain&altitude=2`; slow forward/reverse across soil and rock | Stable ground scale/detail, no conspicuous repeated pattern or unsupported contact | Existing entry; local still/movement pending |
| V03 | Default orbit → Land & explore; gentle drive, turn, cross a refinement area | Actual wheel/contact and chase camera stay within declared limits during refinement | Kinematic rover exists; clearances/GPU drive pending |
| V04 | `?view=outcrops&altitude=2`; inspect at 2/20/200 m and approach/retreat | Embedded foundations, coherent silhouettes and no unacceptable arrival/fade pop | Existing entry; movement pending |
| V05 | Same terrain target at 2/20/200/2,000/75,000 m | Coherent landforms/material scale and continuous coverage; no unexplained dark/faceted transition | Five existing views; ladder evidence pending |
| V06 | Default world; descend and ascend while observing ground/horizon/limb | Continuous coverage, consistent terrain/light/atmosphere and no visible origin instability | Guided route exists; terrestrial-scale replacement pending |
| V07 | Atlas coordinates at cube-face boundaries/poles, then inspect crossing | Geometry, normals/material mapping and controls meet declared discontinuity limits | Numeric seams pass; reproducible GPU route still to establish |
| V08 | Reference forest edge; pan and walk with wind at low sun | Density, crowns, leaves, bounds and moving shadows remain coherent | Vegetation absent; new implementation required |
| V09 | `?view=coast`; slowly approach grazing water/shoreline under 28° and low sun | Stable intersection/refraction/depth, plausible foam transport/scale and crest/spray ordering | Existing entry; real GPU evidence pending |
| V10 | Terrain at 2/20 m; low sun and slow sideways camera motion | Shadow bias/filtering and transitions remain stable in movement | Local shadows exist; numeric snap checks pass only |
| V11 | Terrain/coast flight; reverse rapidly, repeat cold and warm | Coverage/fallback and queue/memory remain bounded; stale work cannot enter scene | Current route not exact; native stress harness required |
| V12 | Nacre → another solid body → Nacre, with authored layer and world changes | Correct identity, histories and authored changes restored; no unexpected resource growth | Session changes supported; reload persistence incomplete |
| V13 | Same versioned material recipe on specimen and ground | Declared evaluation/filtering/channel semantics agree under matched conditions | Shared evaluation absent; feature-gap case |
| V14 | Long mixed traversal; repeat with constrained resource budget | Full-run timing and memory meet target; exhaustion recovers without lost coverage | Current whole-run collector and pressure controls missing |

## Review rules

Use a still at full output resolution for appearance and a short recording for popping, shimmer or transition claims. Save diagnostic views at the same setup. Use capture-off raw measurements for timing claims and record any profiler overhead. A good still cannot accept temporal quality; a compile or CPU fixture cannot accept image quality.

Record observation, hypothesis and measurement separately. Accept a visual change only against an identified previous baseline and target under the same conditions. Cases with unavailable features stay unrun or deferred. Missing machine/capture information stays unknown.

Before the first native M0 acceptance, fill [the evidence manifest](evidence/local-review-template.json) with the actual machine, build, scene, settings, reviewed capture locations and reviewer. Its current empty fields are deliberate and are not acceptance evidence.
