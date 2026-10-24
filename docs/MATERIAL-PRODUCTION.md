# Browser material production pipeline

The production lab is now integrated into the [unified Material Designer](MATERIAL-DESIGNER.md) at `#/materials`; open `#/materials?tab=statistics` for measured delivery comparisons. The original diagnostic page remains available with `?legacy=1`.

`material-production.html` is a separate WebGPU lab. It demonstrates production
asset delivery and optional GPU authoring using the same building materials as
the existing designer. The default client path downloads a pregenerated pack;
it does not start a synthesis worker or compile the procedural compute kernels.

## Recommended division of work

1. Author reusable recipes in Building Material Designer; export their JSON.
2. Select the finite set of published variants needed by a planet/city/theme.
3. Bake maps and filtered mip chains once in a producer/build environment.
4. Publish immutable packs and a small catalog containing recipes, dimensions,
   byte sizes, generator fingerprints and SHA-256 checksums.
5. Runtime clients download on demand, verify/decompress, cache, and upload.
6. Reserve GPU synthesis for authoring, custom content or an unpublished recipe.
   Keep lightweight world-space exposure/variation in the runtime shader.

An unlimited seed space cannot be entirely pregenerated. This prototype publishes
three illustrative eight-zone variants, while recipe import and CPU/GPU authoring
exercise custom content. It does not convert every texture system in Aether.

## Working prototype

| Path | Actual work | Pixel data returns to CPU? |
| --- | --- | --- |
| Load pack / use cache | Fetch/cache, gzip decode, SHA-256, parse views, upload prepared mips | Downloaded data is already CPU-visible |
| CPU worker | Existing deterministic baker, CPU semantic mip filtering, pack encoding | Transferable pack returned by worker |
| GPU compute | Parallel synthesis, float height field, height-derived normals, GPU mip filtering | No, for the GPU-resident preview |
| Read GPU result | Copy GPU buffers to staging, map once, encode the same pack format | Yes; explicit export/parity operation |

The lab has a PBR panel, zone/channel inspection, lighting, byte counts and timing
rows. Cold GPU compilation and warm GPU bakes are separate rows. CPU totals include
worker startup, transfer and the first preview frame. GPU dispatch measurements
await `queue.onSubmittedWorkDone()`: they are synchronized wall-clock durations,
not hardware timestamp-query measurements. Readback/export has its own timing row.
The current adapter is displayed. Software Vulkan tests are validation, not a
promise of performance on a particular user's hardware.

All benchmark bakes process eight zones. Published demo packs use 256² per zone;
128², 512² and 1024² authoring are distinct, explicitly labeled workloads. The
first demo pack is roughly 0.55 MiB gzip and expands to about 8 MiB of maps/mips.
The UI derives exact values from the current artifact rather than a fixed estimate.

## GPU implementation

`dist/material-production/material.wgsl` ports the CPU building-material formulas:
seeded periodic gradient noise, footprint filtering, fBm/warp, sparse finite runoff
trails, coating/substrate masks, oxidation, wetness and packed physical height.
The CPU reference also computes layer masks that the runtime pack discards; the
GPU path computes only the three required runtime maps. This is a practical
end-to-end producer comparison, not an equal-instruction-count microbenchmark.

The CPU prepares only small per-zone parameter/source arrays, not pixel fields.
An 8×8 compute dispatch processes the complete 4×2 atlas in parallel.

`normal.wgsl` reads unquantized float heights. Central differences wrap inside
the originating semantic cell, retaining the periodic guard. `mip.wgsl` filters
base color in linear light, averages/renormalizes tangent normals and transfers
unresolved normal variance into roughness, following the existing CPU convention.
Atlas cell boundaries remain aligned through the last 8² per-zone mip; filtering
never merges unrelated finish zones.

The GPU preview copies computed buffers into Three.js textures entirely on the
GPU. `preview.js` isolates access to the pinned r186 backend texture handle. It
initializes standard textures before copying and uses row-wise copies for tiny
mips whose row byte count is not divisible by WebGPU's 256-byte stride requirement.
This adapter is version-sensitive and should be revalidated when Three.js changes.
The current adapter initializes placeholder texture storage before overwrite; it
is a prototype bridge, not a zero-allocation renderer resource import mechanism.

Float32 GPU evaluation can differ from the CPU reference's double arithmetic.
Visual/numerical validation compares all three maps and their mip pyramids; exact
cross-device byte determinism is not assumed. The CPU producer remains the default
for reproducible CI catalog assets. Each downloaded pack is verified against its
own decoded-byte checksum regardless of producer.

## Build and publishing

`scripts/build-material-catalog.mjs` reads
`dist/material-production/catalog-recipes.json`. Each item can choose `preset` and
`seed`, or supply a full exported `recipe`. The current building producer chooses
the common catalog `size` and bakes all eight finish zones. A recipe cache key includes
the normalized recipe, resolution and CPU generator source fingerprint. The published
URL uses the actual decoded pack content hash, with the full SHA-256 recorded in
the catalog. Repeated local builds verify and reuse the matching artifact. A fresh CI runner regenerates it.

The existing `npm run build` invokes this producer before packaging Pages. Generated
catalog/packs are ignored by git. CI shares these exact generated files with test
jobs and uploads the same tested `dist` artifact to Pages. It does not run a browser,
GPU bake or screenshot job. Browser GPU validation remains an optional local script.

Build output consists of `catalog.json` and content-addressed `packs/*.amp.gz`.
Changing a recipe or generator creates a new URL/key. The catalog is fetched with
HTTP cache bypass; pack Cache Storage is keyed by immutable URL. Clearing the lab's
cache removes only `aether-production-materials-v1`. The lab does not install a
service worker or guarantee an offline application shell.

## Generic pack / loader contract

`aether.material-pack/1` starts with a little-endian magic/version, JSON length and
aligned data offset, followed by a manifest and map bytes. Three RGBA8 pyramids
represent sRGB base color, linear tangent normals and linear AO/roughness/metalness/
height. Height encoding is recorded as `0.5 + metres × 40`. The container accepts
other atlas layouts and tile scales; the first producer and preview use eight zones,
a 4×2 layout and two-metre repeats. Additional producers need their own recipe and
renderer adapters; this is not an automatic migration of ships, terrain or foliage.

Each descriptor records dimensions, color space, offsets and lengths. The parser
checks schema, sizes, mip progression, map agreement and overlapping/out-of-bounds
ranges. It returns byte views rather than baking/repacking pixels. Runtime textures
reuse those prepared mip arrays directly; there is no client atlas filtering step.

Gzip is a baseline transport, not GPU block compression. GPU residency is still
RGBA8. KTX2/Basis or per-platform BC/ASTC encoding, texture arrays, streaming quality
tiers and broader asset registries are sensible next steps after measuring this
prototype. Browser PNG decode is intentionally avoided for packed data channels.

## Validation

`test-city-material-production.mjs` covers deterministic packs, generic layouts,
malformed data, zero-copy views, cache/network/checksum behavior, parameter layout
and all generated catalog assets. Existing building-material tests remain active.

The optional `scripts/check-material-production.mjs` verifies that initial runtime
loading never starts a baker, checks cache reuse, CPU/GPU render paths, all-map/mip
numerical parity, warm pipeline reuse and binary export. A fine-resolution mode
exercises the 1024² GPU path. Tests use an actual local WebGPU browser; screenshots
are inspection artifacts only and are not added to CI.

Primary API references:

* [WebGPU specification: texel copies and command submission](https://www.w3.org/TR/webgpu/)
* [Three.js storage textures / compute](https://threejs.org/docs/pages/StorageTexture.html)
* [Three.js storage texture nodes](https://threejs.org/docs/pages/StorageTextureNode.html)
