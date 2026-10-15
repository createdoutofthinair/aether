# WebGPU execution log

## Foundation increment — 15 October 2026

| Phase | Delivered | Evidence | Still pending |
| --- | --- | --- | --- |
| 0: audit/baseline | Source/dependency inventory, ADR, numeric baseline fixture, local asset-integrity issue identified | Three.js r186 and WebGLRenderer confirmed; 45 captured surface cases | User manual reference views, actual target-device frame times/memory, complete per-pass measurements |
| 1: build foundation | Lockfile, vendor byte manifest, source-copy build, CI build integration, Pages URL graph check | `npm run build`, syntax checks, numerical regressions and deployed-module traversal | Real-browser asset loading/user visual review; selection of coherent WebGPU/TSL release in Phase 3 |
| 2: domain extraction | Canonical world state, renderer-free continuous terrain equations/coordinates, injected cached-field readers, plain-data tyre/clearance math; legacy adapters | Baseline heights/normals and retained numerical regressions | Full renderer/backend contract, immutable tile/material schemas, rover simulation and rendered-triangle contact extraction |

At the foundation milestone, WebGL was the only renderer. The later opt-in bootstrap below adds a separate preview; the main explorer still uses WebGL. Visual/GPU acceptance has not passed. Screenshot automation remains removed.

## Next bounded work

1. Review the current scene manually and record reference device/settings with existing diagnostics.
2. Finish Phase 2 payload/backend ownership contracts and extract the remaining renderer-independent simulation responsibilities.
3. Add the opt-in WebGPU capability/bootstrap spike on the migration branch with a coherent pinned module set; do not port the monolithic GLSL shader stack by substitution.

See [ADR 0001](adr/0001-webgpu-foundation.md) and the [complete migration plan](webgpu-migration-plan.md).

## Opt-in renderer bootstrap — 15 October 2026

- Added renderer input contracts: immutable control snapshots, plain-data tile identity/buffers, finite/index validation and epoch/origin guards.
- Added BackendSession ownership/lifecycle management with stale-initialization cleanup and failure states.
- Pinned Three.js `0.186.0` as the preview's coherent WebGPU/TSL build; dependencies are rebuilt into the static site from the lockfile.
- Added Workspace → Renderer preview with a shared-domain proof terrain patch, node PBR material, explicit fallback selection, resize/suspension/restart handling and manual diagnostics.
- Numerical/unit evidence: lifecycle, material creation, geometry orientation, schema rejection, 45 baseline surface cases, existing regressions and `/aether/` module paths.
- Real-browser WebGPU/fallback execution and visual/device acceptance remain pending: no browser executable or representative GPU is available here. The attempted local DOM smoke check could not start; it is not recorded as a pass.

Phase 3 implementation is available for user inspection, but its runtime acceptance gate remains open. Phase 2 still needs full rover simulation and rendered-triangle query extraction. Phase 4 terrain streaming/LOD and Phase 5 detailed materials have not been implemented in this preview.

Manual inspection URLs after deployment: `webgpu-preview.html` (GPU preferred) and `webgpu-preview.html?backend=webgl` (explicit new-renderer WebGL fallback). Ordinary `index.html` remains the legacy explorer.

See [ADR 0002](adr/0002-webgpu-bootstrap.md).

## Regional LOD increment — 15 October 2026

- Replaced the fixed preview mesh with sixteen shared-domain patches over a 3.6 km region and four camera-distance detail levels.
- Added hysteresis, bounded incremental generation, old-level coverage during loading, 32-payload maximum residency and renderer geometry cleanup.
- Added coordinated refinement/coarsening through interpolated coarse triangles, using identical shared position/normal boundaries.
- Added live loading/LOD status and CPU/GPU geometry estimates in the manual diagnostics.
- Tests cover nonlinear shared borders throughout transitions, cancellation, generation/residency caps and convergence in both directions.

Phase 4 is still partial: no planetary quadtree/SSE, mixed-level neighbors, streamed eroded tiles, global travel/origin shifts or contact integration have been added to the preview. Browser visuals and representative GPU performance remain pending. See [ADR 0003](adr/0003-regional-lod.md).
