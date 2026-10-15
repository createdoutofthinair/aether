# ADR 0003: coordinated regional patch LOD before planetary streaming

15 October 2026. This is a Phase-4 geometry increment, not completion of the planetary LOD port.

## Scope

Replace the single fixed-resolution preview mesh with sixteen adjacent patches covering a 3.6 km square in the same local tangent frame. Each patch supports 8, 16, 32 and 64 cells per edge. Camera distance selects a region-wide level with hysteresis. This is deliberately synchronized regional LOD; it is not adaptive quadtree selection, frustum/occlusion culling or a geometric-error/SSE implementation.

The existing CPU continuous terrain domain supplies positions and analytic normals. Geological/reference workers and the main explorer's eroded tiles are not yet connected. The local origin stays fixed; travel across the sphere, longitude/pole boundaries and floating-origin shifts remain open.

## Residency and transitions

The current level remains drawn while the next level is sampled. Generation is limited to 512 vertices per update. Only current/requested levels are retained, at most 32 patch payloads. Cancelling a request drops stale work; the visible level retains complete coverage.

Once every requested patch is ready, all patches transition together over 0.45 seconds. The fine mesh interpolates from/to the coarse triangles, including all three position components and interpolated normalized normals. Refinement and coarsening therefore retain matching shared boundaries throughout the transition. Geometry buffers are copied into renderer-owned meshes, updated during transitions, and disposed when their source level is evicted. Morph scratch buffers are reused and counted in CPU estimates.

A regional approach establishes transition correctness without introducing asynchronous mixed-level neighbors at the same time. The next planetary implementation must preserve these invariants while adding per-tile error, balancing and scheduling. It must not claim those features were delivered here.

## Evidence

Tests cover repeated refine/coarsen cycles, exact shared position/normal border values (treating signed zero as the same coordinate), parent interpolation, hysteresis, cancelled work, complete visible coverage, the per-update generation cap and a 32-payload residency bound. The numerical fixture uses a nonlinear analytic surface. Existing domain, bootstrap and regression tests remain required.

GPU geometry allocation estimates and current/target/pending LOD state are exposed in manual measurement export. The status display updates during loading and transitions. No new visual/GPU acceptance or speedup is asserted: actual browser inspection and target-device profiling remain pending. Main-thread sampling and morphing are bounded by operation count, not a measured millisecond budget.

## Next gates

Manually inspect both WebGPU and forced fallback at near, mid and far camera settings, including moving back and forth across level thresholds. Then port actual planetary tile payloads, error-driven selection, mixed-neighbor edge rules, worker generation, origin shifts and terrain contact alignment. Detailed materials and water remain separate ports.
