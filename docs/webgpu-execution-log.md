# WebGPU execution log

## Foundation increment — 15 October 2026

| Phase | Delivered | Evidence | Still pending |
| --- | --- | --- | --- |
| 0: audit/baseline | Source/dependency inventory, ADR, numeric baseline fixture, local asset-integrity issue identified | Three.js r186 and WebGLRenderer confirmed; 45 captured surface cases | User manual reference views, actual target-device frame times/memory, complete per-pass measurements |
| 1: build foundation | Lockfile, vendor byte manifest, source-copy build, CI build integration, Pages URL graph check | `npm run build`, syntax checks, numerical regressions and deployed-module traversal | Real-browser asset loading/user visual review; selection of coherent WebGPU/TSL release in Phase 3 |
| 2: domain extraction | Canonical world state, renderer-free continuous terrain equations/coordinates, injected cached-field readers, plain-data tyre/clearance math; legacy adapters | Baseline heights/normals and retained numerical regressions | Full renderer/backend contract, immutable tile/material schemas, rover simulation and rendered-triangle contact extraction |

WebGL remains the only renderer. WebGPU startup, materials and passes have not been added. Visual/GPU acceptance has not passed. Screenshot automation remains removed.

## Next bounded work

1. Review the current scene manually and record reference device/settings with existing diagnostics.
2. Finish Phase 2 payload/backend ownership contracts and extract the remaining renderer-independent simulation responsibilities.
3. Add the opt-in WebGPU capability/bootstrap spike on the migration branch with a coherent pinned module set; do not port the monolithic GLSL shader stack by substitution.

See [ADR 0001](adr/0001-webgpu-foundation.md) and the [complete migration plan](webgpu-migration-plan.md).
