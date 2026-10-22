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
- Screen-size LODs use hysteresis and a 0.35-second stochastic coverage transition.
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
- Only the highest mesh LOD casts dynamic shadows. A local shadow camera follows
  the observer. Far impostors do not cast full canopy shadows.

## Actual directional impostors

Prototypes now use the same height, density, leaf scale, crown, competition and
open-growth defaults as Nature Studio. Population transforms provide size/age
variation. The atlas sampler flips V inside each tile to convert plane UVs to
WebGPU capture coordinates, keeping elevation rows unchanged. Inspect selected
tree isolates a full-detail forest instance for specimen comparison.

Startup captures each generated tree from 24 upper-hemisphere directions (eight
azimuths × three elevations) to 128-pixel tiles. Albedo and normal/depth atlases
remain on the GPU. The normal/depth capture uses a custom fragment output so
opaque-material alpha forcing cannot overwrite the stored depth channel.

Runtime interpolates adjacent azimuth captures, rotates decoded normals with the
instance yaw for directional relighting and writes an approximate reconstructed
surface depth. Elevation rows use nearest selection; interpolation between those
rows, octahedral sampling and parallax-correct UV reprojection are future quality
improvements. These are multiview hemispherical impostors, not a claim of a
complete octahedral/parallax implementation. Billboard transforms and atlas-frame
selection currently update with the culling pass; that cadence is inspectable
in camera movement and can be increased if profiling allows.

Masked stochastic coverage avoids ordinary blended transparency sorting. Atlas
UVs inset samples inside tiles, and mip filtering reduces distant detail. GPU
validation must still assess silhouette blending, tile borders, overhead views,
LOD changes, alpha grain and normal/depth reconstruction. Captures are generated
again when opening the lab; persistent atlas caching is not yet implemented.

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
