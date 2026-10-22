# Forest Lab

Open DEV → Forest Lab (`#/forest`). The existing Nature Studio remains the single
specimen/material authoring view. Forest Lab is a population renderer using the
same growth, branch skin, leaf and bark generators.

## Architecture

- Nine resident growth architectures: three growth-seed variants for each of
  birch, oak and willow. Individual trees vary yaw, overall size, crown width,
  tint and wind phase. This is a reusable prototype bank, not unique geometry
  for every tree. Species-inspired models are not botanical reconstructions.
- Worker-generated deterministic distribution uses minimum spacing, habitat
  fields, clustered acceptance, species preferences, age cohorts, openings and a
  winding trail. Willow is restricted to wet habitat. The requested count is a
  target: tightly packed settings can return fewer trees.
- Worker-built connected branch skins and merged foliage are shared across
  tree instances. Each variant/LOD has bark and foliage instance batches. Leaves
  are merged once per prototype; there is no leaf Object3D per tree in the forest.
- Screen-size LODs use hysteresis and a 0.55-second complementary screen-pixel coverage transition with a target dwell
  period and no mid-transition reversal.
  Three mesh levels progress to a two-triangle directional impostor. The normal
  mode caps mesh trees at 24 near, 96 middle and 192 low-detail records, with
  temporarily overlapping LOD representations during transitions. Mesh-only
  inspection deliberately bypasses these caps to compare the cost.
- CPU cell-frustum culling (32-metre cells), distance rejection and instance-list
  compaction run at 10 Hz. The GPU renders the compacted batches every frame.
  This is hardware instancing, not GPU compute/indirect culling. There are at
  most 63 populated tree batches plus ground and shadow passes. This count does
  not imply a measured frame-rate guarantee.
- Wind is vertex-shader driven with a shared tree bend function and instance
  phase. It does not run growth or CPU branch simulation every frame.
- Dedicated low-detail instanced shadow proxies occupy a shadow-only layer,
  independent of visual LOD and fade. Up to 128 nearby trees cast shadows. The
  local shadow camera snaps its projection to a light-space texel grid. Visual
  meshes do not duplicate these shadow casters; far canopy shadows remain limited.

## Actual directional impostors

Prototypes now use the same height, density, leaf scale, crown, competition and
open-growth defaults as Nature Studio. Population transforms provide size/age
variation. The atlas sampler flips V inside each tile to convert plane UVs to
WebGPU capture coordinates, keeping elevation rows unchanged. Inspect selected
tree isolates a full-detail forest instance for specimen comparison.

Startup captures each generated tree at a 5×5 hemi-octahedral lattice (25 views)
to 128-pixel tiles, including stable capture bases at the zenith. Albedo and
half-float normal/depth atlases stay on the GPU, reducing depth quantization
compared with the previous 8-bit capture. The custom normal/depth fragment output
preserves the depth channel independently of opaque alpha handling.

Runtime view selection is on the GPU: the local camera direction maps into the
octahedral lattice and selects three neighboring captures with barycentric
weights. Each sample projects the current camera ray into its capture plane,
reads depth, and reprojects the ray once before fetching albedo and normals.
Surface depth is reconstructed from the weighted ray intersections. This is a
single-step depth parallax approximation, not iterative volumetric ray tracing.
A checkbox toggles depth parallax for comparison.

The shader also constructs camera-facing vertices directly from the current
camera basis every frame. The CPU still updates population/culling buffers at
10 Hz; it no longer controls impostor orientation or atlas view selection.

Visual transitions share complementary screen-pixel masks. Outgoing and incoming
representations cover opposite parts of the same threshold field rather than
using independent alpha hashes, which had created holes and overlap. Impostor
silhouettes use MSAA alpha-to-coverage instead of permanent stochastic grain.

Atlas UVs flip V inside each tile (WebGPU capture origin), with an inset and mip
filtering. GPU validation is still required for parallax disocclusion, silhouette
quality, thin foliage, atlas borders, transitions, shadows and frame times.
Captures regenerate when opening the lab; persistent atlas caching is absent.

## Controls and budgets

The page offers 800–10,000 requested trees, seed/extent, wind, near shadows,
LOD colors, automatic/mesh-only/impostor-only modes, a survey camera, keyboard
trail camera and an orbital tour. Atlas inspection reads the selected albedo
atlas back only on demand. Distribution regeneration reuses prototype meshes,
materials and atlases; instance buffers are resized outside the animation tick.

Projected-size selection, spatial instance batching and impostors are a suitable
next layer above Three.js WebGPU. For substantially larger worlds, move cell
visibility and instance compaction into compute/indirect draws and stream
resident prototype/biome cells through the asset lifecycle developed for ships.
Replacing Three.js alone would not address vegetation overdraw or draw budgets.

## Validation

`test-forest-transitions.mjs` checks octahedral round trips and weights, pole
bases, parallax ray/plane intersections, complementary coverage, LOD dwell and
transition locking, shadow snapping and shadow-layer separation.

`test-forest.mjs` checks 2,500 deterministic placements, minimum spacing,
terrain/trail placement, species habitat, all nine variants, LOD hysteresis,
impostor direction indexing, actual worker transfer for three species, finite
branch/foliage meshes, instanced attributes, wind/fade/depth nodes and SPA/module
paths. Numerical tests cannot assess actual WebGPU image quality or frame times.

## Primary research

- Epic hardware-instanced foliage: https://dev.epicgames.com/documentation/unreal-engine/foliage-mode-in-unreal-engine
- NVIDIA procedural GPU wind: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-6-gpu-generated-procedural-wind-animations-trees
- NVIDIA SpeedTree LOD coverage: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-4-next-generation-speedtree-rendering
- Epic hemisphere/full-sphere impostors: https://dev.epicgames.com/documentation/en-us/unreal-engine/impostor-baker-plugin-in-unreal-engine
- Ryan Brucks octahedral impostors: https://shaderbits.com/blog/octahedral-impostors

### Distant silhouette correction

The atlas currently uses linear base-level sampling: ordinary whole-atlas mipmaps
average away small leaves and mix adjacent capture tiles. Coverage-preserving,
per-tile mipmaps remain a future improvement; base-level sampling can alias on
very distant foliage. Sampling now clamps to texel centres without shrinking the
capture image. Three-view radiance still blends, while silhouette coverage uses
the strongest weighted contribution divided by the strongest view weight. This
preserves coverage when neighbouring captures disagree without a hard view switch.
Parallax samples that leave the capture or land in empty texels fall back to the
unwarped capture (including its plane depth), rather than deleting the fragment.
The alpha cutoff is 0.01; MSAA coverage handles the remaining leaf edges.

The default is now a conventional camera-facing impostor with direct billboard
UVs and billboard depth. Experimental parallax must be explicitly enabled; it
controls both ray reprojection and reconstructed depth. Previously disabling it
still projected onto each capture plane and wrote that plane's depth, so it did
not provide a reliable baseline. Every final colour atlas is read back once at
preparation time and all 25 capture tiles must contain nonzero coverage before
use. The counter reports validated atlases; this adds no frame-loop readbacks.

### Sprite transform and depth regression

The default now uses `SpriteNodeMaterial.positionNode` and `scaleNode` with the
instance centre and scale attributes. Three.js owns the billboard clip position,
view position (including fog), and raster depth. The previous custom `vertexNode`
override left standard material position accessors on a different transform and
still emitted a custom fragment-depth output when the parallax uniform was zero.
Experimental parallax now changes the material's depth node and recompiles on a
user toggle; switching it off removes `frag_depth` entirely. The forest test
builds the actual WGSL for both settings and checks this contract. This checks
shader generation, not rendered GPU pixels; screenshot parity still needs a
WebGPU device.
