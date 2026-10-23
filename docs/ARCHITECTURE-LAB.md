# Architecture Lab: compound buildings, construction kits and editable assemblies

23 October 2026 · schema 3 · DEV → Architecture Lab (`#/architecture`)

This replaces the architectural direction of the first city prototype. Circular
city planning remains; buildings are developed as individual constructed assets.
The new target comes from the supplied reference: unequal connected towers,
strong vertical service elements, exposed structural bays, larger cladding
sections, recessed visual layers, differentiated roofs and a grounded podium.

## Research: what is being learned from game production

Primary references consulted on 23 October 2026:

| Source | Relevant evidence | Aether interpretation |
| --- | --- | --- |
| [Epic: City Sample](https://dev.epicgames.com/documentation/unreal-engine/city-sample-project-unreal-engine-demonstration) | Building volumes are styled with rule sets; lower and upper sections can use different styles. Modular assets are extensively instanced. Roads, lots and population follow dependency order. | Separate mass composition, facade rules, construction layers and runtime batching. Keep the high-level city planner independent of individual building editing. |
| [CIG: microTech](https://robertsspaceindustries.com/en/comm-link/transmission/17375-Travelers-Guide-To-The-Galaxy-MicroTech) | New Babbage's elegant high-tech architecture is deliberately distinguished from Area 18 and Lorville's denser utilitarian presentation; domes protect inhabitants from the climate. | Construction kit and planetary context are separate axes. A city needs a coherent identity that affects its components and proportions. |
| [CD Projekt Red: Ultimate Edition booklet](https://cdn-s-cyberpunk.cdprojektred.com/CP2077-UE-Booklet-EN-1.pdf) | The publisher's indexed “Layers of Night City” section describes districts reflecting their different histories and communities. Full PDF retrieval exceeded the research tool's size limit. | District/building purpose should be visible through massing, material hierarchy and functional equipment. This is art-direction inference, not a claim about CDPR's procedural implementation. |
| [Kudos Productions: Horizon Forbidden West architecture assemblies](https://www.artstation.com/artwork/mzgnAy) | The production artist's indexed description identifies component assemblies, sculpting, game meshes, textures and LODs. The full gallery was behind a sign-in surface. | Reusable parts must carry finished construction and surface quality before they are repeated. No gallery assets are copied. |
| [SideFX: Building Generator](https://www.sidefx.com/tutorials/building-generator/) | Named wall, corner and ledge modules, dimensions, floor overrides, placed overrides and finishing details are explicitly demonstrated. | Metre-based facade modules and per-mass overrides; preserve a serialized assembly rather than editing only an opaque generated mesh. |

These references establish production principles. Aether does not implement
Nanite, Lumen, the Decima renderer, Star Citizen's city tools or a comparable AAA
production asset library. Browser visual acceptance remains a separate gate.

## Art direction and implemented geometry

The earlier uniform pale skin, repeated window bands and stacked floor ledges
were too dominant. The revised generator uses three construction scales:

1. **Building composition:** unequal shafts, occupied podiums, secondary wings,
   offset blocks, bridges, openings and distinct crowns.
2. **Construction hierarchy:** service spines, larger conformal cladding panels,
   mechanical floors, braced bays, roof plant, entrance assemblies and parapets.
3. **Surface response:** eight shared PBR zones, restrained finish variation,
   metallic/opaque window response and view-dependent procedural room shading.

There are 20 family productions, two compositions per family, five construction
kits and six planetary contexts. New productions include a seeded citadel
cluster, sail blade, gateway arcology and offset megablock. Seed changes alter
whole masses, heights, arrangement and some connections; cladding variation is
correlated over multi-floor areas rather than independent random panels.

The five construction kits are Stratum, Foundry, Aurelia, Canopy and Obsidian.
They select finish palettes, facade patterns, structural intensity, roof service
density and default roof treatment. Corporate/industrial kits default to technical
roofs; planted roofs remain an explicit kit/context choice.

Facade options include curtain wall, ribbon, punched openings, vertical rhythm
and balcony/terrace rhythm. Primary concave and curved envelopes retain their
canonical contour across LODs. Glass and cladding patches clip against actual
envelope triangles so broad planar panes do not disappear inside curved walls.
Non-shell facade bay counts remain consistent vertically for coherent large
cladding patches. Mechanical floors replace the dominant every-storey ledge.

`window-nodes.js` supplies a small view-dependent reveal/interior approximation
using the existing UV stream and derivative tangent frame. It is not a modeled
room, a cubemap interior, ray-traced glass or an enterable building interior.

## The editor

| Area | Implemented controls |
| --- | --- |
| Blueprint library | Search, role filters, 20 selectable families and generated massing schematics |
| Assembly tree | Select generated masses, unlock editable masses, add, duplicate and delete |
| Viewport | Orbit/pan/zoom, click selection, selected-mass bounds, move/rotate/scale gizmos, fit/front/plan/perspective |
| Design inspector | Construction kit, planet, name, seed, composition, massing variation, asymmetry, dimensions, taper, twist and terraces |
| Mass inspector | Named part, footprint profile, purpose, exact dimensions/position/yaw, taper, inhabited-facade switch and per-mass facade/finish/roof overrides |
| Construction inspection | Envelope, facade/cladding, structure, roof/plant/crown, access, foundation and selected-mass isolation |
| Surface inspector | Bay scale, cladding, structural expression, plant density, identity lighting, glazing, shades, roofs, age and material swatches |
| Scene inspector | Five lighting contexts, exposure, three mesh levels, 10 m grid, shadows and turntable |
| Variant shelf | Eight seeded composition schematics at a time; select a recipe or refresh the set |
| Files/history | JSON import/export, local draft, undo/redo and a bounded local City asset library |

Library and variant images are generated **massing schematics**, not prerendered
beauty thumbnails. The main WebGPU viewport is the material/geometry inspection
surface. The editor does not promise node-graph CSG, a full DCC application,
arbitrary imported mesh editing or individual editing of every facade bay.

The responsive layout keeps the blueprint browser and assembly tree separately
scrollable. Global massing controls are disabled after unlocking explicit masses;
the Mass inspector then owns dimensions and transforms. Restore procedural
massing returns to the family production, and Undo can recover the edited state.

## Editable document and connection preservation

The document is `aether.architecture-document/3`; its recipe is
`aether.architecture/3`. A normalized recipe holds design context and optionally
up to 12 explicit masses. Each mass has a stable ID, purpose, footprint,
dimensions, transform, facade/finish/roof overrides and normalized loft sections.

Unlocking masses preserves the generated loft sections, including shell and
twist shapes. Bridges and supports are converted into anchors referencing mass
IDs. Anchor offsets are normalized to each mass. Moving, rotating or resizing a
mass therefore repositions the connection endpoint. Deleting a mass removes
connections referring to it. This is geometric attachment, not load simulation.

Editing is bounded and validated. Undo/redo retain up to 60 states. Draft files,
imported documents, generated variations and published recipes all pass through
the same normalizer. A standalone specimen worker is replaced when a new edit
supersedes it; older results cannot overwrite the latest requested specimen.

## City handoff

Use in City saves a normalized recipe to the current browser's local asset
library. A slot is identified by family, A/B composition and planetary context.
Saving that slot again replaces it. Up to 20 slots are retained. This is local
browser storage; export/import moves a document to a different browser/device.
It is not a server-backed shared asset registry or an automatic GitHub commit.

City Lab has a construction-kit selector and an option to consume those recipes.
Both the layout worker and building-library worker receive the same saved
documents. Actual edited mass bounds determine plot scale/clearance. City JSON
exports include the saved recipes, avoiding dependence on another browser's
storage. Per-recipe finish color is carried through vertex tint relative to the
shared library atlas, keeping texture and material sharing bounded.

The city still has 40 prototype slots, three mesh LODs and 25-view directional
captures. Population rendering batches materials and instances placements;
specimen rendering batches per mass and construction layer to support selection
and isolation. More specimen draws are intentional and do not become per-window
scene objects across the city.

## Validation and remaining gates

Automated checks cover:

- Deterministic city layout, overlap/transport reservations and the 18,117-building preset.
- 20 families × six planetary profiles × three LODs, finite geometry/normals,
  cap winding, courtyard holes, stable window population and silhouette bounds.
- Lossless editable conversion for all 20 family assemblies, including loft
  samples, bridges and supports; state/history, clone/delete and JSON round trips.
- Saved-recipe parity between editor and City, bounds and slot replacement.
- Five distinct palette bakes, including a regression that verifies hex colors
  reach the actual surface baker rather than silently falling back to a preset.
- Real specimen-worker transfers, part-selection metadata, shared textures,
  room-node WGSL generation, control IDs, SPA routing and CI selection.

GPU pixel validation, screen-space aliasing, final material response, actual
interactive gizmo behavior and frame time still require a compatible WebGPU
browser. This session's cloud browser has no compatible adapter; the local
Playwright Chromium download was unavailable. CPU depth-buffered mesh review
checks composition and fit but does not establish rendered AAA fidelity.

Remaining work includes production-quality trim sheets and decals, more deeply
authored facade corner/door kits, authored signage, richer interior simulation,
component-specific graphical editors, terrain attachment and accessibility
fixtures, district HLOD and streamed asset residency. The broader Environment
Studios masterplan remains partially implemented.
