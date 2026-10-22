# Spacecraft surface system

Open **Material editor → Spacecraft**. Ground and vegetation retain the existing
terrain compositor; vegetation also links to the procedural leaf/tree studio.

## Construction and shading

The versioned seed recipe generates unequal plate dimensions, chamfered service
hatches, fasteners, vents, reinforcing strips, restrained markings, primer,
coating chips, machining grain, thermal variation and environment-specific wear.
All relevant PBR channels share masks. Paint, primer and ceramic are dielectric;
exposed substrate is metallic. Presets are artistic approximations, not calibrated
engineering material measurements.

Five starting materials: painted alloy armor, machined titanium, ceramic thermal
protection, multilayer insulation and heat-cycled engine alloy. The latter two
use folded relief and localized heat variation respectively. Thermal coloring is
an artistic approximation, not a thin-film optical simulation.

Textures use base color (sRGB), tangent-space OpenGL normal, linear ORM+height
(R=AO, G=roughness, B=metallic, A=height), and masks (paint, wear, construction,
heat). Height creates normal relief; it does not displace the mesh or alter its
silhouette. Significant armor thickness and openings remain geometry. Shipyard and resident credit assets both retain geometric box/cylinder bevels,
layered docking trim, recessed access assemblies and open exhausts. Credit assets
use fewer radial segments while retaining the same construction language. The
shared functional atlas keeps generated ships within seven draw calls; the
validated capsule and hauler examples use four.

## Hybrid authoring

Import color, +Y normal, roughness, metallic, AO, height and a blend mask. The
shared bitmap blend amount applies consistently to imported channels. Detail
normals use reoriented normal mapping; imported height contributes normal relief.
Images are resized to at most 1024 pixels on the longest axis. Imported maps
must match each other's layout. The compositor does not synthesize correct
physical maps from an arbitrary photograph.

Save/load uses IndexedDB. JSON export embeds imported bitmap images, so import
reconstructs the surface without external texture URLs. Export channel PNG
writes the currently inspected channel. Apply to ship stores an opt-in override;
select **Custom material from Surface Lab** in Shipyard. Build ship/new seed
restores the seed's built-in finish. Credits never consume a browser-local override.

## Runtime and filtering

Interactive bakes run in a module worker (256/512/1024). A newer request cancels
an unfinished bake. No procedural graph runs per frame. Maps are reused while
orbiting; inactive material-category previews pause rendering. Shipyard/credits
bake compact seeded defaults once per object creation.

Explicit periodic normal/roughness mip chains transfer unresolved normal
variance into roughness (a Toksvig-style approximation). Color mips are averaged
in linear light. Cylinder and planar mappings use metric dimensions, with a
configurable tile span; masks and details share coordinates. This reduces
specular shimmer but cannot replace full temporal antialiasing. UV seams and
silhouette quality still require GPU inspection at close, middle and credits
distances. Baked construction detail should stay shallow; high-frequency
features naturally disappear into filtered mip levels.

The preview includes plate, cylinder, module and ship shapes; PBR/channel/mask
views; studio, space and grazing light; exposure, turntable and distance controls.

## Validation

`node scripts/test-hull-materials.mjs` verifies seed/JSON reconstruction across
40 preset/seed combinations, dielectric coating behavior, wear, bitmap masking,
height-to-normal influence, normal length, mip variance, physical UV scale,
texture disposal and deployed dependencies. Existing ship socket and credit
batching regressions remain authoritative. Actual WebGPU visual validation is
required to assess the final appearance; numerical tests do not establish it.

## Research basis

- Adobe PBR guide: https://www.adobe.com/us/learn/substance-3d-designer/web/the-pbr-guide-part-2
- Adobe spacecraft material breakdown: https://magazine.substance3d.com/substance-source-javier-perez-takes-you-space/
- Adobe anchor points: https://experienceleague.adobe.com/en/docs/substance-3d-painter/using/effects/anchor-point
- Filament shading/normal blending: https://google.github.io/filament/Filament.md.html
- Unreal normal-aware roughness: https://dev.epicgames.com/documentation/en-us/unreal-engine/composite-texture?application_version=4.27
- Specular antialiasing research: https://www.jcgt.org/published/0010/02/02/
- NASA thermal systems: https://science.nasa.gov/learn/basics-of-space-flight/chapter11-4/

## Maintained spacecraft pass

Blueprint v4 preserves the existing seeded structural families and sockets and
adds a separate service-history seed: registry, wear age, repair station, access
side and role accent. Port/starboard propulsion and structural mounts retain
symmetry; crew hatches, handholds, equipment, stencils and replacement finishes
provide controlled local asymmetry. Explorers carry external sensor pods,
freighters gain retaining straps, and scouts carry smaller equipment covers.
MLI tanks have shallow geometric folds as well as normal-map relief.

Eight finish cells share one opaque PBR material: armor, exposed alloy, engine
metal, ceramic, insulation, replacement paint, role accent and identification.
Coatings remain dielectric. Broad roughness changes and restrained paint tint
variation accompany fine detail. Engine heat follows the axial nozzle direction;
docking trim exposes alloy at actual interfaces. Thermal coloring and aging are
art-directed approximations; there is no corrosion/thermal simulation.

The atlas is 4 by 2 cells. Credits use 128-pixel cells and the Shipyard uses 256;
the maximum dimensions are 1024 by 512. Each cell gets its own color-space-aware
normal/roughness mip chain. A one-eighth UV guard and an eight-pixel minimum
cell mip prevent adjacent finishes from bleeding into one another. The seeded
atlas maps within a module's topology; standalone/custom Surface Lab materials
retain metric repeating UVs. UV1 carries the same atlas coordinates for AO.
Per-module tint is vertex data, survives worker transfer, and adds no material
or draw. Glass and the two emission colors remain separate shared materials.

The Shipyard now defaults to an oblique stellar key with restrained fill and the
same analytic nebula reflection path as credits, without a studio room probe.
Inspection mode adds neutral fill for surface evaluation; wear and exposure are
explicit preview controls. Other ObjectViewer consumers retain their existing
studio environment. Nebula radiance continues to be uniform-driven, not a
per-frame cubemap capture or radiosity solve. Nested studio meshes share one
converted node material per original material; the transfer retains texture
ownership and avoids repeated material copies.

`test-ship-finishes.mjs` checks deterministic zones, rectangular texture sizes,
UV guards/mips, aging, crew cues, flyby bevels, geometry/draw bounds, worker
serialization and shared-material ownership. The credit tests also ray-test
mirrored front faces after batching. Local software-WebGPU offscreen renders of
capsule and hauler fixtures produced no validation errors; these are visual
look-development checks, not a hardware frame-time benchmark. The existing
resident pool still prepares and warms all models before playback.
