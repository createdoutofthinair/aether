# Concord: procedural city and building studio

Route: `index.html#/city` (DEV → City Buildings Lab). WebGPU only.

## Architecture extension (schema 2)

The current generator uses **24 modular families × two compositions**, six
planetary architecture profiles and compatible envelope/roof overrides.
The dedicated [Architecture Lab](ARCHITECTURE-LAB.md) adds editable compound
assemblies, construction kits and a saved-recipe handoff to this city.
See [Procedural architecture](PROCEDURAL-ARCHITECTURE.md) for research, controls,
module ownership, schema changes, validation and remaining work. The original
implementation notes below describe the schema-1 baseline where explicitly
stated; its 12-prototype GPU result does not validate the new 32-prototype library.

## Design research and first interpretation

Jacque Fresco / The Venus Project is the starting point for concentric civic,
research and residential belts, radial sectors, integrated gardens and a central
public dome. Its proposal uses repeated radial sectors; Concord instead varies
architectural families, heights, footprint scales, occupancy and seeded finishes
within those sectors. Circular circulation connects radial lines; an outer
orbital guideway connects each city to a hexagonal network of other hubs.
This is an original game environment interpretation, not a feasibility claim or
an exact reconstruction of a Venus Project model.

Primary references, consulted 23 October 2026:

- [The Venus Project: Circular Cities](https://www.thevenusproject.com/resource-based-economy/environment/circular-city/) — civic center, circular belts, radial sectors, varied residential architecture and gardens.
- [Epic: City Sample](https://dev.epicgames.com/documentation/unreal-engine/city-sample-project-unreal-engine-demonstration) — shape grammar, placement metadata, instanced modular construction, and transport/lot dependency order. Nanite/Lumen are **not** implemented by this browser lab.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) — shared geometry/material instancing and explicit instance uploads.
- [WebGPU specification](https://www.w3.org/TR/webgpu/#dictdef-gputexelcopybufferlayout) — 256-byte texture-copy row alignment. The pinned Three r186 backend returns padded readback rows; `render/readback.js` compacts them before atlas coverage validation and image presentation.

## One semantic recipe, several representations

| Stage | Output / ownership |
| --- | --- |
| City seed + hub/ring/occupancy settings | Renderer-independent city blueprint, stable lot IDs, district roles, transport graph, parks and building transforms |
| Protected transport corridors | Ring and radial land reservations before lot placement; intercity lines join the outer orbital route |
| Architectural grammar | Sixteen families × two compositions; planetary modules, building dimensions, floor height, service history, primary masses and detail parameters |
| Worker manufacturing | Three geometry LODs from the same primary massing; bevels, floor reveals, window piers, entrances, repairs, rooftop/service equipment |
| Shared finish bake | Eight architectural finish zones; sRGB albedo, linear normal and packed AO/roughness/metallic data |
| Shared atlas pack | Independently filtered cell mips, guarded UVs, UV1, vertex tint. Same implementation as ship finishes |
| Worker transfer | One library payload with typed transferable geometry buffers and three bound texture maps shared by all prototypes |
| Main-thread admission | Four canonical material objects for the entire architectural library; source geometry reused by instance buckets |
| Directional capture | 25 hemi-octahedral views from each medium mesh; albedo + normal/emission atlases; all directions must contain coverage |
| Runtime visibility | 256 m spatial cells, conservative per-building bounds, screen-size policy, packed hardware instancing and local shadow proxies |
| Export | Semantic city JSON with recipe, prototypes, plots and transport metadata; runtime LOD/culling fields removed |

Families include stepped spires, planted terraces, courtyard campuses, civic domes,
connected habitats, service buildings, crescents, rings, petals, shells, helixes,
triads, discs, arcologies, vaults and canopy habitats. Profiles vary dimensions,
material zones and selected structural details. More seeds change the library
dimensions and service details as well as the urban population.

## Shared fidelity contract

Ships and architecture share `render/surface-atlas.js`, the hull surface baker,
geometry transfer/batching utilities and the instance/impostor infrastructure.
The visual contract is:

1. **Silhouette first.** Primary masses and their elevations survive every mesh
   LOD. Details below a representation's projected size can disappear; entire
   architectural tiers cannot. Window bands survive as cheap planar quads in
   medium/low meshes rather than changing the glazed facade fraction.
2. **Functional zones.** Ceramic, alloy framing, service metal, stone, roofing,
   repair finishes, accents and identity zones have different roughness and
   metallic behavior. No uniform chrome coating over the entire asset.
3. **Manufactured edges.** Near meshes use real bevels, floor edges, recessed
   glazing, mullions, canopies, entrances and service equipment.
4. **Scale and history.** 4.2 m floor spacing, doors, small lights, bolts and
   asymmetric repair/service placement establish use and human scale. Wear is
   restrained and gravity-aligned; broad finish variation precedes microdetail.
5. **Quiet surfaces.** Detail is concentrated at joints, access and functional
   equipment, preserving larger readable facade areas.
6. **Bounded sharing.** Materials and texture atlases belong to the library,
   never individual placements. No scene object per floor/window/building in
   the population. No per-window lights or generation during animation.
7. **Readiness before replacement.** A prototype cannot enter impostor LOD
   until all 25 capture directions pass coverage validation. Failed or pending
   atlases retain complete low meshes, including in impostor inspection mode.

The architectural atlas uses its own recipes, not spacecraft hull textures
stretched over buildings. Room emission is captured separately in normal-atlas
alpha so distant room lighting follows the selected lighting preset.

## Runtime budgets and transitions

- Defaults: seven connected hubs, six belts, 85% occupancy; `FRESCO-01` gives
  780 buildings. Maximum preset: 61 hubs, nine belts and 100% occupancy gives
  18,117 buildings. This is an actual generated layout count, not an FPS claim.
- There are 48 reusable prototypes; each has three mesh LODs and one validated
  directional impostor. Schema-1 triangle budgets are superseded;
  `test-city.mjs` reports the current per-prototype costs.
- Automatic thresholds: 260 / 90 / 22 projected pixels, with hysteresis.
  Near and medium promotions are limited to 16 and 96 visible buildings. Mesh
  fallback remains available whenever an impostor is unready.
- Narrow transition bands use complementary screen-pixel coverage driven by
  projected size. No timed vertex morph or timed silhouette deformation.
- A maximum of 32 local low-mesh shadow casters occupy a separately snapped
  360 m shadow volume. Their state is independent of visible impostor switches.
- One interleaved per-instance binding retains the forest pipeline's portable
  WebGPU buffer layout. The PBR architectural draw uses five bindings in the
  offline WGSL/layout regression, below WebGPU's guaranteed eight.
- At most 512 animated transit pods; movement follows the exported route graph.
  City visibility is updated at roughly 8 Hz, pods at most 30 Hz, camera/render
  independently. FPS reporting uses elapsed wall time, not clamped motion time.
- Reversed depth retains precision from street level to distant hubs, avoiding
  co-planar road/landscape fighting over a 65 km camera range.
- City-only changes select a dedicated `city` CI suite. Changes to shared atlas,
  surface, transfer and impostor utilities select their dependent suites.

## Studio use

City mode provides skyline, masterplan and street cameras, a civic orbit,
transport/garden layers, day/golden/blue/night lighting, local shadows, mesh-only
comparison, impostor-only inspection, and representation colors. Building mode
isolates the selected full-detail family/profile at native meter scale.

Change seed/service age and Generate to rebuild the library. Hub/ring/occupancy
changes reuse the current library and already captured atlases. Capture yields
between prototypes; controls stay available. Measurements and city recipes can
be downloaded as JSON. Measurement exports identify their viewport, camera,
lighting and detail mode. They are manual samples, not benchmark certification.

## Validation

`npm run build`, `npm run check`, `npm test`.

The city suite verifies deterministic regeneration, graph connectivity, reserved
roads, non-overlapping building footprint bounds, maximum population, family
LOD budgets and silhouette bounds, valid finite/indexed mesh data, worker URL
closure/transfer, canonical materials/maps, WGSL layout limits, padded readbacks,
safe impostor fallback policy, exports, SPA entry and selective CI assignment.

Optional **local** GPU check (no GitHub screenshots or automatic captures):

```sh
CITY_GPU_PLAYWRIGHT=/path/to/playwright/index.mjs \
CITY_GPU_CHROMIUM=/path/to/chromium \
node scripts/check-city-gpu.mjs
```

This renders actual WebGPU offscreen targets, validates all 300 directional
captures, verifies nonblack architectural PBR, renders mesh and impostor
populations, switches back to the original meshes, and rejects device validation
errors. Software-WebGPU output is useful for correctness, not hardware speed.

## Present limits and extension boundaries

The layout and instance capacities are resident. Spatial culling is implemented;
out-of-core district streaming, HZB occlusion, whole-district HLOD, floating-origin
planetary coordinates and persistent atlas caching are not. Above 18k buildings,
add district residency/HLOD before expanding the menu limit. Mesh-only mode is a
diagnostic and can be substantially heavier than automatic rendering.

The city capture stores emission rather than reconstruction depth. It reuses
the forest's three-view directional interpolation, with raster depth and no
parallax reprojection for buildings. It is intended for small projected sizes;
large facades stay as meshes. Full interiors, pedestrians, road vehicles,
physics/collisions and connection to planet terrain are outside this lab.

Green belts, small water gardens and planted architectural terraces are present.
Forest-grade vegetation can consume the park reservations and stable IDs later;
it is not silently substituted with thousands of new independent tree objects.
Infrastructure geometry is shared per ring/route class, but is not yet streamed
or replaced by district-scale HLOD. Transport routing is a geometric demo, not
a capacity or civil-engineering simulation.

## Next implementation: independent component studios

The full component catalogue, Plantlife extensions beside the existing trees,
lab ownership, shared asset contract, interface fixtures, performance strategy
and delivery gates are specified in
[ENVIRONMENT-STUDIOS-MASTERPLAN.md](ENVIRONMENT-STUDIOS-MASTERPLAN.md).
This is a forward implementation blueprint; it does not mark the new labs as built.


## City lighting, street layouts and attachable construction blocks

The 23 October lighting revision replaces the small, 32-building local shadow study with camera-fitted cascade shadow maps and separate low-detail silhouette casters. Balanced quality uses three 1536-pixel cascades and up to 1,024 building casters; high uses three 2048-pixel cascades and up to 2,048. Nearby detailed meshes also cast their facade and roof shadows. Roads, sidewalks, gardens, transit structures and building meshes receive shadows. Coverage is finite; this is not planetary or unbounded shadowing.

Six presets coordinate direct light, sun direction, sky/ground fill, reflection intensity, exposure, atmosphere, relit impostors and occupied windows: golden hour, architectural daylight, overcast, grazing sun, blue hour and moonlit night. Exposure, haze, shadow quality and contact occlusion remain editable. A single-sample scene depth target feeds half-resolution GTAO, followed by a depth/normal-aware denoiser; tone mapping and sRGB conversion happen before FXAA. A guarded compatibility build adapts r186's forward-depth background/nearest-sample assumptions to the city's reversed Z buffer. It does not replace the renderer or change other studios. Mesh-only mode skips impostor baking; switching back to automatic can fill the missing atlas library.

The city supports four semantic layouts. Circular Concord preserves the Fresco network. Metropolis uses a connected street grid; Old City warps shared junctions and varies block widths; Corridor builds an elongated settlement along a transit spine. Roads and sidewalks reserve space before parcels are occupied. Inter-hub links meet gateways on each district's street graph. Parks occupy reserved parcels; transit only follows the routes marked for it. The default interactive view starts with one grid district; the multi-hub and circular options remain available.

The original procedural construction kit is informed by the [Photobash SCIFI CITY reference](https://www.photobash.org/scifi-city), particularly its extendable floor/core/end-piece vocabulary. No commercial model or texture is bundled. Seven editable block recipes cover service cores, occupied floor stacks, habitat wings, transfer decks, wedge ends, cross junctions and L corners. Architecture Lab can attach any block above a selected mass or against its four local side faces, including rotated hosts. Block heights follow the planet's floor height. The same normalized modules, finishes and connections are exported and saved to City Lab. The 12-mass limit keeps authoring and compilation bounded.

Four additional family grammars demonstrate these parts: stacked floor modules, attached wing complexes, buttressed service towers and docked habitat campuses. Existing family indices and saved recipe identities are preserved; the reusable prototype library increases to 48.

Manual visual review: `scripts/check-city-scene.mjs` runs the production WebGPU City Lab with mesh-only startup, checks six presets and four layouts, records a street view and verifies exported shadow/occlusion measurements. It accepts `CITY_GPU_PLAYWRIGHT`, `CITY_GPU_CHROMIUM`, `CITY_GPU_BROWSER_ARGS` and `CITY_SCENE_OUTPUT`; optional viewport/preset/layout environment variables permit focused reviews. It is not wired into screenshot CI. Geometry/layout/attachment checks remain in normal CI.
