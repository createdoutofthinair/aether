# P1: proposed product and hardware contract

Status: **draft; target machine and numerical budgets unresolved**. This document states proposed choices explicitly so independent planning can continue. It does not accept hardware or visual/performance gates.

## Settled intent

Build a single-user planetary explorer and authoring workflow with convincing geological terrain, physical material scale, water/coasts, atmosphere, vegetation, rover travel and continuous surface-to-space transitions. Native desktop is the leading candidate. Preserve deterministic seeded world generation and authored overrides as product capabilities. Keep local visual review manually initiated.

The first accepted combined visual result is one coherent reference region, later expanded to a complete reference world. Planet families and star-system travel follow that acceptance. Existing browser distribution remains a reference during the experiment.

## Requirement ledger

| ID | Required outcome | Acceptance cases / dependency |
| --- | --- | --- |
| R01 | Deterministic world identity and versioned generated/authored inputs survive reload | Functional persistence and V12; P3 schema |
| R02 | Body scale and coordinates support local centimetre detail and planetary/orbital travel | Analytical precision fixtures and V06/V07; P2/P3 |
| R03 | Terrain coverage, seams and transitions remain coherent in movement | V05/V06/V07/V11; M2 |
| R04 | Rock shapes and geological relief have credible scale and foundations | V02/V04/V05; M3 |
| R05 | PBR channels, authored layers and preview/world evaluation share declared semantics | V01/V02/V13; M4 |
| R06 | Light, sky, atmosphere and shadows agree across surface/orbit scale and movement | V06/V09/V10; M5 |
| R07 | Water/coasts remain depth-consistent, temporally stable and plausible at declared scale | V09; M6 |
| R08 | Vegetation population, representation, wind, ground contact and shadows remain stable | V08/V11/V14; M7 |
| R09 | Collision and vehicle contact remain stable while visual detail/streams change | V03/V04/V11; M1/M2/M8 |
| R10 | Frame time, hitches and memory meet the named machine/preset contract | V11/V14 and raw measurements; M0/M12 |
| R11 | Every rendered change has identifiable local still/movement evidence as relevant | All visual cases; M0 |
| R12 | Seeds, edits and assets work in a packaged build under the chosen generation/cook model | Packaged P2 experiment, V12; M0/M11 |
| R13 | One accepted reference world precedes expansion to additional planet families | V01–V14 as applicable; M9/M10 |

## Proposed scope and scale

The reference region starts with dry rocky ground, an exposed formation, mixed sediment, a temperate vegetated slope and one shoreline. Vegetation starts with one tree family, shrubs and ground cover, with at least a sparse slope and dense forest edge. Species, asset source, density and crown/leaf representation need the art reference and memory contract; no instance count is silently accepted.

Proposal: keep the current 60,000 m body as a regression fixture, then require precision/continuity experiments at lunar and terrestrial scale (1,737,400 m and 6,371,000 m radius). Use a 15,000,000 m radius stress fixture before fixing an upper product limit. These are test dimensions, not generated-body acceptance. Bodies retain their own radius/mass/gravity instead of catalog properties being unrelated to one shared geometric radius.

Traversal proposal: pedestrian inspection, rover motion, low-altitude flight, continuous ground/orbit travel; system transfers later use an explicit product travel mode. Astronomical units are catalog units only; runtime transforms use a declared physical length unit. Maximum system extent, travel acceleration and allowable streaming delay remain open. Test coordinate arithmetic over a proposed 50 AU extent before ratifying that limit.

New seeds must be usable under a stated generation model. If a chosen geometry path requires offline cooking, document that product tradeoff and its authoring/distribution workflow. A pre-baked planet alone does not satisfy runtime seed generation.

Desktop keyboard/mouse is the initial control proposal. Controller support, offline installer behavior, supported OS list and a browser viewer remain consequential open choices. Multiplayer, cities/economy, crowds and physically complete climate/volumetric fluids are deferred.

## Target machine fields

| Field | Current value | Owner / required action |
| --- | --- | --- |
| Development OS/version | Unknown | User: actual desktop OS |
| GPU model / dedicated VRAM | Unknown | User: hardware specification; distinguish dedicated from shared memory |
| Driver and graphics API capability | Unknown | Local operator: actual driver and engine compatibility check |
| CPU / RAM | Unknown | User: model, core configuration and installed memory |
| Output resolution / refresh | Unknown | User: intended play/inspection mode |
| Storage / available capacity | Unknown | User: SSD/type and free space for engine, source, assets and cooked builds |
| Minimum supported machine | Unknown | Product choice after development-machine measurement |
| Cross-platform/browser requirement | Unknown | Product choice; native-first currently preferred |
| Asset/install/cook budget | Unknown | Product choice informed by reference-world content |

The Ubuntu/Node/C++ inventory in P0 belongs to an agent container. It is not any field in this table. Browser GPU identity alone does not determine dedicated VRAM, RAM or driver version.

## Proposed measurement contract

These targets come from the execution guide and remain proposals:

| Property | Candidate value / method |
| --- | --- |
| Main preset | 2,560×1,440 output, 60 Hz target; exact internal resolution recorded |
| Baseline image mode | Fixed exposure and internal resolution; frame generation off; named antialiasing setting |
| Warm route | 30 s proposed warm-up, then 120 s measured route, repeated three times |
| Frame distribution | End-to-end p95 ≤16.7 ms and p99 ≤25 ms |
| Hitches | Preserve and classify every frame >50 ms; allowed count remains to agree |
| Memory | Peak resident use below the agreed device budget fraction; 80% is a proposal |
| Cold runs | New process/cold route separate from warm; declare shader/data/disk cache state |
| Evidence | Raw timings with clock/method, build, settings, route and device; capture overhead recorded |

CPU frame-body time, GPU elapsed time and presented/frame interval are separate quantities. Record their measurement definitions; do not add overlapping work to invent end-to-end latency. Report median, p95, p99, max, sample count, hitch count and the selected percentile convention over the **complete** run. Capture-on and capture-off measurements must be distinguishable.

The current rolling 600-frame report cannot satisfy this full-run contract. Its GPU reset logic also needs correction before comparable runs use it. It remains useful for rough baseline investigation, with those limitations recorded.

Geometry/collision tolerances, maximum resource queues, per-pass budgets and cold time-to-interaction need actual measurements and the engine architecture. Do not treat the current 2 mm patch-ray tolerance as an accepted terrestrial-scale physics tolerance.

P1 exits after the consequential fields and thresholds are decided or assigned a measured bound. Research and provisional specification can continue; final platform/quality acceptance cannot.
