# Shared rendering and resident assets

Aether currently uses Three.js 0.186's WebGPU renderer for the ship studios and
credits ships. It has a growing custom domain/rendering layer, rather than a
complete independent graphics engine. Three.js owns WebGPU buffers, materials,
pipelines and submission; Aether owns procedural assets, asset preparation,
scene lifetimes and playback behavior. Some older terrain tools still use WebGL.

## Credits spawning

Previously each wave built a ship on the main animation thread: blueprint,
procedural PBR baking, hundreds of meshes, merging, GPU upload and first-use
pipeline work. The 24-second wave cadence made those spikes visible in the DOM
credit scroller. Changing fade transparency also invalidated pipelines.

The new pipeline is:

1. A dedicated module worker constructs and batches twelve deterministic designs.
2. Geometry/index and PBR/mipmap typed buffers transfer to the render thread.
3. The shared resident pool hydrates each asset, compiles its shaders, renders it
   with the actual canvas configuration, and waits for GPU completion.
4. Play is enabled once the fleet and opening title are ready. The loading gate
   reports fleet preparation progress. Failed preparation allows credits to play
   without ships; reduced motion skips fleet preparation.
5. Waves acquire resident objects and change only visibility, transforms and
   opacity uniforms. They release objects back to the pool instead of destroying
   them. Restart resets the pool without rebuilding. Leaving the page disposes it.

The fleet repeats after four formations (12 distinct ships). At most six are
active. This is a deliberate bounded memory tradeoff: endless uniquely generated
ships would require continued background construction/upload. The old infinite
formation seed index now selects a deterministic resident fleet design.

`src/render/resident-pool.js` is renderer-independent, while
`src/render/ship-assets.js` implements Three.js batching, typed serialization,
hydration and resource disposal. `src/render/ship-worker.js` is the preparation
entry. Build copies these to `dist/render`; worker-kit copies use explicit pinned
module URLs because browser workers do not inherit document import maps.

## Instancing and future engine work

GPU instancing is useful for repeated geometry/material combinations: a fleet of
identical fighters, bolts, vegetation or asteroid variants. Each unique assembled
ship still needs its own geometry and textures. At this scale, merging each ship
by material (at most seven draws) and retaining its GPU resources addresses the
spawn spike directly. Instance batches become appropriate when multiple copies
of one resident design are visible together. Adding one-instance batches here
would not reduce the draw count.

For larger gameplay scenes, build on this separation: worker-generated data,
resident asset registry, bounded pools/instance batches, scene scheduling and
budgeted background uploads, with Three.js as the replaceable renderer backend.
Avoid introducing a second renderer or custom raw WebGPU shader engine simply to
solve allocation spikes. One renderer per gameplay viewport is the preferred
long-term goal; credits currently retain their separate background/title layers.

## Validation and limits

`test-resident-pool.mjs` simulates ten hours of wave scheduling with no additional
factory or warmup calls, checks ownership/restart/disposal/failure races, executes
the deployed ship worker with real transferable buffers and walks its module
URLs. Credits regressions check the six-ship cap, constant fade pipeline state
and geometry batching. Numerical tests do not establish browser frame times or
GPU memory usage. Actual WebGPU tracing should verify no wave-boundary CPU/GPU
spikes, including on lower-end devices; steady-state rendering cost is separate
from spawn preparation cost. Canvas resize/device loss can still cause new GPU
work outside this asset pool.
