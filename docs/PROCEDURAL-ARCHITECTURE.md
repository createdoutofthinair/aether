# Procedural architecture: modular forms and planetary identity

**Schema-2 baseline.** The current implementation and visual direction are
documented in [Architecture Lab](ARCHITECTURE-LAB.md), including schema 3,
20 families, construction kits and the dedicated editable assembly interface.

Implemented extension · 23 October 2026 · architecture schema 2

This extends the existing City Buildings Lab, not the entire Environment Studios
masterplan. It introduces a renderer-independent building grammar and a wider
architectural vocabulary. It is not a structural, thermal or pressure simulator.

## Research and design decisions

Primary sources consulted on 23 October 2026:

- [Esri: basic shape grammar](https://doc.arcgis.com/en/cityengine/latest/tutorials/tutorial-6-basic-shape-grammar.htm).
  A mass is decomposed into facades, complete floors and repeated facade tiles;
  ground floors and roofs have distinct rules. We use a similar hierarchy, with
  curved contours and voids rather than only rectangular facade subdivision.
- [SideFX: Building from Patterns](https://www.sidefx.com/docs/houdini/nodes/sop/labs--building_from_patterns-1.1.html).
  Named floor descriptions and repeating/one-off modules make a building's
  construction pattern editable. We separate the envelope production from bay,
  floor-edge, roof and access modules and batch the resulting geometry.
- [SideFX: Building Generator Utility](https://www.sidefx.com/docs/houdini/nodes/sop/labs--building_generator_utility-2.0.html).
  Explicit module dimensions, corner ownership, weighted variants and overrides
  are useful precedents. Aether uses metre-based bays, district-role selection,
  planetary family weights and compatible envelope/roof overrides.
- [The Venus Project: Circular Cities](https://www.thevenusproject.com/resource-based-economy/environment/circular-city/).
  Beyond circular urban belts, the proposal describes flexible modular dwellings,
  free-form residential architecture, thin shells, integrated energy systems and
  buildings whose appearance reflects their purpose. This motivates curved
  dwellings, courts, shells and shared elevated decks in the garden language.

These are independently implemented design principles. Aether does not execute
CGA files, Houdini assets or third-party building meshes. Planetary responses
below are authored science-fiction design heuristics, not findings from those
sources or engineering recommendations.

## Generation stages and ownership

1. `architectureOptions` validates controls and planetary style.
2. `architecturalRecipe` records family, seed, dimensions, floor spacing,
   envelope parameters, facade rules, roof choice and finish palette.
3. `compileArchitecture` expands that recipe into named primary volumes,
   support members, connecting bridges and a street-entry socket.
4. `modularBuildingModel` constructs envelopes, metric facade bays, reveals,
   floor bands, shading brows, structural ribs, roof modules, access and services.
5. The existing worker batches each LOD by its four shared materials and sends
   transferable geometry. One eight-zone PBR atlas is shared across the library.
6. City placement uses district roles and planetary family weights. It consumes
   prototypes instead of constructing an object hierarchy for every building.
7. The existing 25-view impostor admission and spatial-cell renderer operate on
   the same library, retaining mesh fallbacks until capture validation succeeds.

Semantic grammar: `dist/city/architecture.js`. Geometry compiler:
`dist/city/architecture-model.js`. City integration remains in the existing
blueprint/worker/main modules. These are currently owned deployment sources;
the later shared asset registry and separate Architecture route are still planned.

## Architectural vocabulary

There are 16 families, two seeded compositions per family and continuous shape
controls. A library has 32 prototypes, rather than 32 unrelated imported meshes.

| Family | Construction rule |
| --- | --- |
| Setback spire | Three progressively smaller rounded tower volumes |
| Garden terraces | Editable tier count, rounded floor plates, planted roofs |
| Courtyard campus | Rounded rectangular courtyard envelope with an actual inner void |
| Civic dome | Sampled elliptical shell with generated meridian ribs |
| Linked habitat | Two offset rounded towers and a connecting bridge |
| Service foundry | Broad service volume with a sloped shoulder |
| Crescent residence | Open arc footprint with inner facade and closed end walls |
| Open atrium ring | Elliptical annulus with inner and outer window bays |
| Petal institute | Lobed footprint with taper and optional rotation |
| Lens pavilion | Low flattened shell |
| Twisted observatory | Rotating loft sections, consistent floor/bay subdivision |
| Triad skybridge | Three inhabited columns, bridges and a shared ring crown |
| Suspended disc | Supported disc crown around a narrow occupied core |
| Stepped arcology | Nested lobed terraces with an editable tier count |
| Ribbed vault | Rounded rectangular shell with roof ribs |
| Canopy habitat | High canopy deck, occupied stem and diagonal support members |

Compatible envelope modules can be replaced with elliptical, soft rectangular or
lobed profiles. Courtyard voids, crescent openings and shell productions retain
their topology. Roofs can independently select garden, solar, sealed services,
protective shielding or open crown. It is intentionally a bounded architectural
grammar, not a general CSG editor or an unrestricted random primitive stack.

## Planetary architecture profiles

| Profile | Geometric and construction changes |
| --- | --- |
| Concord / temperate garden | Open courts, generous glazing, planted decks, ceramic skin |
| Solace / desert | Lower proportions, deeper shading brows, reduced glazing, solar roofs |
| Nivalis / ice | Compact proportions, smaller glazing, thicker reveal modules, sealed roof services |
| Pelagia / ocean | Raised deck, eight actual foundation supports, access lift and rounded forms |
| Umbra / airless | Lower masses, smaller viewports, protective roof caps, additional structural ribs |
| Aureole / low gravity | Taller proportions, longer floor spacing, slender ribs and open crowns |

Each changes finishes and weighted family selection as well as the modules.
City road topology remains the existing circular-hub network. These profiles do
not generate ocean water, ice terrain, gravity physics, pressure-sealed interiors
or shield thickness calculated from radiation exposure. Those require the
planet/environment and later integration systems.

## Lab workflow

Use DEV → City Buildings Lab. Choose a planetary architecture profile and seed,
then Generate. The Building tab isolates one prototype. Catalogue compares all
16 families in the chosen composition. Shape/module controls expose variation,
height, footprint aspect, curvature, taper, twist, terrace count, facade bay width, glazing and shading.
Controls apply together with Generate, which preserves the active inspection
mode. Applied profile identity is displayed separately from pending selections.

Export building recipe records the selected prototype, including normalized
grammar options. Export city recipe uses `aether.city/2`, stores the same
architecture settings and keeps all prototype recipes. Schema 1 prototype
indices are not interchangeable with schema 2: the old second profile began at
index 6; schema 2 begins at index 16. There was no schema 1 import UI to migrate.

Reflections now come from a generated exterior sky/ground environment rather
than an indoor room. The day/night observation preset also updates this map.

## Validation and limits

- Existing City tests cover deterministic placement, protected roads, overlap,
  18,117-building layout, decreasing LOD cost, worker transfers, four shared
  materials/three maps and the five-binding WGSL/instancing contract.
- New Architecture tests cover all 16 families across six profiles and three
  LODs: finite geometry, outward caps, hole winding, supported ocean decks,
  entry sockets, stable facade-bay population and silhouette bounds.
- Concave primary envelopes keep a canonical 48-sample contour across LODs so
  coarsened wall chords cannot cover facade bays. Subordinate bands/ribs simplify.
- Window patches clip against actual envelope triangles; broad quads cannot cut
  through curved shells or twisted walls and disappear behind their skin.
- Facade occupancy is keyed by volume/floor/bay and survives mesh changes.
- The 32-prototype GPU check now expects 800 directional captures. It could
  not be executed in this session: Chromium was absent and its download failed.
  Offline WGSL generation is not a substitute for actual GPU pixel validation.
- A temporary depth-buffered CPU rendering is used only to review generated
  mesh silhouettes and fit; it does not establish browser PBR or impostor quality.
- More families increase resident library geometry, draw/material buckets and
  capture latency. No new FPS claim is made. District HLOD and streamed library
  residency remain E11 work. The renderer still yields between prototype bakes.
- Facade room depth, complete accessibility/streets connections, metric trim
  sheets, independent component-study pages and their acceptance fixtures remain
  E1/E2/E3 work. Existing trees and botanical generators are unchanged.

The next architectural refinement is component inspection with accepted facade,
entrance and roof variants, then physically scaled trim materials and window
interior simulation. Wider city propagation should follow those visual gates.
