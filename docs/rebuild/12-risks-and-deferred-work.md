# Risks, owners and deferred scope

| ID | Risk / implication | Evidence or experiment | Owner / next action |
| --- | --- | --- | --- |
| K01 | Target machine unknown; quality/performance budgets and engine support cannot be accepted | P1 hardware table; local baseline still/movement/report | User/local operator supplies actual machine; planning session reconciles |
| K02 | Unreal runtime mesh path does not automatically provide required Nanite/Lumen stack | Current primary Geometry Scripting documentation; E-P2-UE-01 | Native experiment session proves exact geometry/lighting/cook path |
| K03 | Cooked terrain could break arbitrary runtime-seed/edit requirements | Packaged seed and height edit action, storage/cook trace | Product + engine decision owner |
| K04 | Fixed 60 km constants and absolute Float32 material coordinates do not establish large-body precision | P0 trace; body-scale/rebase tests | P3 coordinate owner then M1 |
| K05 | Stable collision must coexist with visible LOD; current contact moves with selected triangles | E-P0-CONTACT; V03/M2 collision/readiness experiment | Physics/terrain architecture owner |
| K06 | Eviction retains CPU payload; multiple lifetimes lack explicit global budgets | E-P0-CACHE; V14 allocation/node/worker/session-map trace | Streaming owner; define hard budgets and retirement |
| K07 | Reported temporal defects are not reproduced here | D01–D08 candidate cases and local handoff | Local operator provides evidence; defect session discriminates causes |
| K08 | Existing measurement window/reset cannot establish full-route performance | E-P0-METRICS and 600-sample limit | M0 measurement package; baseline numbers stay limited |
| K09 | Preview and production recipes differ | P0 shader/schema trace; V13 | Material/authoring owner chooses shared evaluator/cook semantics |
| K10 | Dense vegetation may be limited by assets, overdraw, wind bounds or shadows | V08 representative forest; no current geometry/content | Art + rendering owner; use non-experimental required fallback |
| K11 | Coastal closure/transparent passes may fail at grazing angles or recentering | V09 plus solver/FFT boundary experiment | Water owner; declare approximations and verify depth/history |
| K12 | Source maps/procedural detail alone cannot supply geological composition or art quality | Viewed source albedos; V02/V04/V05/reference register | Art/terrain owner accepts one reference region before expansion |
| K13 | Current dependency setup is not fully locked; tool/engine behavior can drift | No tracked lockfile; selected engine absent | M0 pins versions/build/cook inputs |
| K14 | Rover redistribution provenance and imported physical/material scale are unresolved | GLB metadata, README and target importer | Asset owner confirms source and completes material/scale specimen |
| K15 | Review is not independent yet; one session can miss contradictions | Self-review recorded separately | Separate Astra Max P4 review after concrete architecture |

Owners are roles for future bounded packages, not fictitious assigned people or completed specialist reviews.

Deferred expansions: multiplayer, large cities/crowds, economy, fully simulated climate/planet formation, volumetric global fluid simulation, native/browser feature parity, mobile targets, complete cave networks, and other planet families before the reference-world gate. Local overhang geometry may still be needed for the first formation; a global single-valued height field cannot represent it.

Browser delivery is a consequential product choice, not silently cancelled. If made mandatory, revisit the platform/feature contract before choosing a native-only path.

Resolve an uncertainty with an observed experiment or a clear product tradeoff. Do not resolve it by choosing a stronger model setting or marking a generated document accepted.
