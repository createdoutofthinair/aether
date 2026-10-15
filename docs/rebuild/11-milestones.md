# Milestones and bounded work packages

The sequence implements the execution guide. The audit utilities are the first implemented package; the production rebuild is not started.

## Planning packages

| Package | Outcome / evidence | State | Suggested model |
| --- | --- | --- | --- |
| WP-P0-01 | Code/data-flow audit, salvage matrix, candidate repros, asset/test/evidence inventory | Implemented; available functional checks pass; local GPU follow-up blocked | Sol 6.1 Max |
| WP-P0-02 | Read-only inventory, CPU discriminating fixtures and HTTP smoke; raw evidence retained | Implemented and verified for this tooling scope | Sol 6.1 Max |
| WP-P1-01 | Product/scale/quality proposal and V01–V14/local handoff | Draft implemented; actual hardware and budgets open | Sol 6.1 Max or Astra Max |
| WP-P1-02 | Fill target configuration and inspect one still/movement/measurement on that machine | Blocked by absent target access/evidence | Local operator; Sol Max for reconciliation |
| WP-P2-01 | Primary-source candidate comparison, runtime geometry/lighting constraints, experiment design | Implemented as research; platform decision open | Astra Max |
| WP-P2-02 | E-P2-UE-01 packaged runtime spherical patch/material/contact proof | Not implemented; local toolchain/GPU needed | Astra Max design; Sol 6.1 Max implementation |
| WP-P2-03 | Compare alternate stack if needed; record accepted platform, exact versions and fallback | Not started; depends on WP-P2-02 | Astra Max |
| WP-P3-01 | Concrete engine-specific architecture and `04`–`09` system contracts | Not started; accepted platform required | Astra Max |
| WP-P4-01 | Separate critical review and reconciliation; no unresolved blocking findings | Not started; current self-review is only audit consistency | Astra Max in a separate session |

Required contract inputs for WP-P3-01: units/frames/time; body and region schemas; canonical surface/collision queries; topology/LOD and overhang representation; world/job/asset/material revision keys; queue/residency/upload/retirement budgets; shared recipe evaluation; temporal motion/history; water/atmosphere/transparent ordering; vegetation IDs/wind/bounds/shadows; versioned authoring/cooking/persistence; raw timing/evidence and packaging. Trace a complete frame and an edit through all consumers.

## Production milestones

Each later milestone will be split into bounded packages after the engine decision. None is implemented or accepted by this audit.

| Milestone | Main outcome | Dependencies / requirement IDs | Exit evidence |
| --- | --- | --- | --- |
| M0 | Locked build, packaged tiny scene and manual local inspection/profiling foundation | P1–P4; R10/R11/R12 | Same build on target; actual still/movement/identity/timing record |
| M1 | Body/region/camera frames, clocks and stable canonical queries | M0; R01/R02/R09 | Analytic fixtures, stationary/moving rebase and contact probe |
| M2 | Spherical LOD, stable collision residency and bounded streaming/lifetime | M1; R03/R09/R10 | V05/V06/V07/V11; stale work and constrained-memory coverage |
| M3 | One geological region and grounded formation content | M2; R04 | V02/V04/V05; clear physical scale and foundations |
| M4 | Material pipeline, authored layers and shared preview/production semantics | M3; R05 | V01/V02/V13; importer/channel/filtering parity |
| M5 | Coherent lighting, atmosphere, shadows and temporal history | M2/M4; R02/R06 | V06/V10; scale, motion and reset/rebase evidence |
| M6 | Open water/coasts with declared wave/foam approximations | M3/M5; R07 | V09; depth, transparency, motion and measured cost |
| M7 | Vegetation content, ecological placement and stable representations/wind | M3/M4/M5; R08 | V08/V11/V14; low-sun forest and bounds/shadow/memory costs |
| M8 | Rover/camera interactions and physical travel quality | M1/M2, basic probe earlier; R09 | V03/V04/V11; actual vehicle contact and streaming/rebase drive |
| M9 | One integrated accepted reference world | M3–M8; R01–R11/R13 | Applicable V01–V14 under one reconciled build/preset |
| M10 | Planet families and continuous star-system travel as scoped | M9; R01/R02/R03/R13 | Different radii/inventories; transfer history, coverage and performance |
| M11 | Complete authoring, persistence and content delivery workflow | Early schemas/save support already required; R01/R05/R12 | V12/V13; reload/migration/cook/import/export and packaged behavior |
| M12 | Optimization, quality presets, packaging and release evidence | Accepted features; R10/R12 | Named minimum/development machines, full-run timing/memory and cold tests |

Basic lighting, contact probes and persistence are implemented when earlier milestones need them; the later milestones deepen quality. M8 does not delay all physics until after vegetation. M11 does not delay saving world identity until the end.

## First production package after gates

WP-M0-01 scope: pin the accepted engine/toolchain; package the tiny calibration scene; record build/scene/asset identity; add manually selected debug views and route; obtain profiler access and manual measurement export. Include a local procedure, actual target run and evidence manifest. Exclude unrelated planetary content expansion from this package.

Functional checks: clean build, packaged launch, deterministic reset, valid channel/units configuration, measurement start/stop/isolation and complete-run export. Visual checks: real normal/debug frame and short saved movement. Performance check: identifiable timing method/device and raw valid samples; the reference-world frame budget is evaluated later on the representative scene.

Rollback scope: one isolated experiment/foundation project and its documents; current browser reference stays runnable. Acceptance remains open if native tooling/GPU or actual evidence is unavailable.

## Continuation prompt

```text
Read docs/rebuild/INDEX.md, STATUS.md, 00-current-state.md,
01-product-and-hardware.md, 03-platform-decision.md and 10-validation.md.

Continue the earliest executable package. Reconcile actual target-machine
information and local evidence for WP-P1-02. Keep unknown values explicit.
If those results permit it, implement E-P2-UE-01 in an isolated native
experiment and prove the runtime terrain/lighting/collision path in a
packaged build. Do not assume DynamicMesh supports Nanite or Lumen.

Keep the current app as the reference and the removed screenshot CI/capture
UI removed. Do not accept visual/performance gates from CPU fixtures.
Update the status ledger, evidence, decision and exact next package.
```
