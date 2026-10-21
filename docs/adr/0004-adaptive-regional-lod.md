# ADR 0004: independently selected regional detail with shared edge profiles

22 October 2026. This extends the regional proof; it does not complete planetary streaming.

## Selection and residency

Each of sixteen fixed regional patches now selects its own 8/16/32/64-cell resolution. An initial set of cell-centre samples measures deviation from the coarse triangles. The selector projects that error using camera distance to the patch bounds, viewport height and field of view, with quadratic error reduction assumed for finer levels. Refinement/merge thresholds are 2.5/1.5 pixels. This is an estimate, not a guarantee that unsampled narrow features meet a pixel-error bound.

Neighbor targets are propagated until they differ by at most a factor of two. Each patch changes one level at a time. Transition admission checks displayed neighbors and their merge destination so a later merge cannot create a 4:1 interface. Generation is prioritized by projected coarse error; the existing 512-sample/update cap and 32-payload residency limit remain. Current geometry covers the region while requests are prepared. Obsolete pending requests are removed.

## Edges and transitions

Interior vertices retain the previous coarse-triangle geomorph. Both meshes on a shared border use a canonical edge profile. Its effective detail is limited by the less detailed patch, including transition progress. Coarse edge breakpoints align with both meshes; intermediate fine vertices follow the coarse segments. Shared normal profiles are also interpolated consistently. Corners remain shared domain samples.

Frame composition uses renderer-owned display buffers and runs when geometry or transition state changes. Source samples remain unchanged. Renderer geometry is disposed when its corresponding cached payload is evicted. This implementation prioritizes correctness and bounded storage; actual CPU morph/upload costs still need device profiling.

## Inspection and evidence

Shift-drag moves the preview focus across the region; ordinary drag orbits it. The focus follows the sampled local surface. Camera controls and manual diagnostics continue to report the actual backend, level range, requested levels, queue and allocation estimates.

Tests exercise an analytic nonlinear surface and the actual shared terrain sampler. They check mixed displayed resolutions, the 2:1 rule, both directions of transitions, T-junction position/normal agreement within 0.0002 in their respective units, convergence, generation/residency limits and cancellation. Diagnostics include estimated per-patch pixel error and a count of patches whose predicted error still exceeds the refinement threshold at the 64-cell cap. A numeric match does not close visual/GPU acceptance. No screenshot automation is added.

## Remaining Phase-4 scope

The region is still a fixed 4×4 grid. There is no cube-sphere quadtree, global travel, floating-origin relocation, visibility/occlusion scheduler, worker tile generation, eroded field integration or rover/contact port in this preview. Main explorer rendering remains unchanged. Those systems must preserve the same neighbor and stale-generation rules when ported.
