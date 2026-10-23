# Aether environment studios: parts first, city assembly second

Version 1 · 23 October 2026 · Implementation blueprint

This document specifies the next implementation. Except where explicitly marked
**existing**, its studios, generators, controls and acceptance gates are planned.
It does not claim that creating this plan has implemented the listed systems.

### Implemented architecture extension · 23 October 2026

The [modular architecture extension](PROCEDURAL-ARCHITECTURE.md) now provides
16 families, two compositions, six planetary design profiles, named volume and
facade/roof/access productions, a catalogue view and schema-2 recipe exports in
the existing City Buildings Lab. This is a partial implementation of architectural
massing and component rules, not completion of the shared studio foundation,
independent component studies or E2 acceptance. The earlier “three building
families” reference block is a first integration selection, not a generator limit.

## 1. Product direction

Keep Concord's circular civic/research/residential layout and connected hubs.
Develop its components as independently inspectable, reusable procedural assets.
City Lab becomes the consumer and scale test of those assets. A change to a
bench, station, building facade or planting recipe must be assessable before it
appears in a city containing thousands of other objects.

The visual aim is a sophisticated, inhabited, maintained science-fiction city:
convincing construction, material response, human scale, landscape, access and
transport. Large calm surfaces remain part of the Fresco-inspired language.
Weathering follows exposure, shelter and maintenance; it does not cover every
surface in scratches or turn all districts into industrial ruins.

Detail has four scales, each with its own purpose:

| Scale | Examples | Authoring responsibility |
| --- | --- | --- |
| District and silhouette | Dome, towers, terraces, ring routes, planted corridors | City composition and architectural massing |
| Construction | Facade bays, structural frames, setbacks, platform supports, joints | Component generators and attachment rules |
| Human use | Doors, benches, signs, windows, service hatches, drains, worn paths | Functional equipment and public-space recipes |
| Surface | Grain, roughness breakup, seals, runoff, dust, small scratches | Shared material and detail layers |

Every component must work in neutral clay, normal daylight, raking light and
night conditions. A dramatic light preset cannot be its only convincing view.

## 2. Existing systems to preserve and reuse

| Existing implementation | Reuse / migration decision |
| --- | --- |
| `dist/nature-studio.html`, `dist/nature/main.js` | Preserve Wood, Trunk, Branch, Leaf and Full Tree studies; extend this Nature Studio into the Plantlife Lab |
| `dist/nature/tree-model.js`, `branch-mesh.js`, `growth-math.js` | Retain the current tree growth/skin generators; shrubs may reuse appropriate mechanisms through an adapter |
| `dist/nature/leaf-model.js`, `leaf-bake.js`, wood/leaf/tree workers | Reuse tissue, leaf and bark authoring; introduce different botanical geometry only where the plant requires it |
| `dist/forest/*` | Retain population ecology, instancing, wind, directional capture, readiness validation and LOD diagnostics |
| `dist/ships/*`, `dist/hull/*` | Reuse manufacturing finishes, service history, atlas baking and material zoning; keep spacecraft design ownership in Spaceship Studio |
| `dist/render/surface-atlas.js`, `readback.js` | Shared guarded PBR atlas packing and row-compacted GPU readback |
| `src/render/ship-assets.js`, `resident-pool.js` | Extract asset-neutral batching, transfer, residency and lifecycle mechanisms while retaining compatibility adapters |
| `dist/viewer/object-viewer.js` | Seed for a shared studio viewport; extend ownership, exterior lighting and cancellation before adopting it across all labs |
| `dist/city/blueprint.js` | Preserve deterministic lots, protected corridors, district roles and the hub graph |
| `dist/city/model.js` | Preserve current families as reference recipes while splitting generation into architectural components |
| `dist/city/infrastructure.js` | Reference layout/placement; replace embedded road/rail/pod geometry with registered component recipes |
| Shared SPA shell and DEV menu | Preserve branding, WebGPU gate and browsing-context cleanup; organize lab navigation within this shell |

Existing botanical tree families are birch, oak and willow. Pine currently exists
as a bark material study, not a complete pine tree generator. Do not label it a
ready city tree. The existing trees need city placement/clearance integration,
not another parallel tree implementation.

Some older material/terrain tools retain legacy renderer paths. All new studio
work is WebGPU. Audit the Material Editor adapter before extending its runtime;
reuse its material concepts without routing new studios through WebGL.

## 3. Studio ownership and navigation

These are logical workspaces, not one top-level menu entry for every bolt.
Each workspace has a component catalogue with related studies and fixtures.
Proposed routes below are targets, not currently published links.

| Workspace | Route / status | Independent studies | Owned output |
| --- | --- | --- | --- |
| Architecture Lab | `/architecture`, planned; current building inspection remains available in `/city` during migration | Massing, structure, facade bays, glazing/interiors, entrances, balconies, roofs, service attachments | Building parts, facade rules and complete building recipes |
| Streets Lab | `/streets`, planned | Surface strip, straight/curve, junction, sidewalk, crossing, ramp, drainage, plaza paving, bridge deck | Road/pedestrian cross-sections, junction geometry, markings and surface recipes |
| Transit Infrastructure Lab | `/transit`, planned | Guideway, support, switch, station, platform, canopy, interchange, lift/stair connection | Transit structures, route sockets and station boarding interfaces |
| Mobility Lab | `/mobility`, planned | Pod, shuttle, train carriage, service/logistics vehicle; body, running gear, interior and animation substudies | Vehicle definitions, articulation and boarding envelopes |
| Public Space Lab | `/public-space`, planned | Furniture, signs, lighting fixtures, railings, public equipment, service cabinets, maintenance access | Reusable street/public/technical components and small furnishing assemblies |
| Plantlife Lab | Existing `/nature`, extended | Existing tree studies plus shrubs, grasses, ferns, flowers, ground cover, climbers and planted modules | Botanical recipes and tested specimen/patch assets |
| Landscape Lab | `/landscape`, planned | Soil section, planted bed, tree pit, grade transition, retaining edge, garden water and composition patches | Landscape assemblies referencing Plantlife and Surface assets |
| Surface authoring | Existing Materials workflow, planned WebGPU authoring adapter | Material swatch, metric wall/floor sample, trim sheet, seal/joint, marking/decal, wear masks | Shared material/finish definitions, independent of a particular object |
| Lighting Lab | `/lighting`, planned | Exterior sky/reflections, fixture response, day/night, contact/shadow tests, wet/dry comparison | Shared lighting/weather presets and calibration scenes |
| Forest Lab | Existing `/forest` | Ecology, population, LOD, capture coverage and wind stress | Vegetation population validation, not new specimen definitions |
| City Lab | Existing `/city` | Recipe assignment, layout, district composition, traffic/planting integration, streaming and performance | Assembled districts and city networks consuming versioned assets |
| Spaceship Studio | Existing `/ships` | Existing spacecraft ownership retained | Spacecraft and their shared manufacturing mechanisms |

City Lab can open a selected component in its owning lab and return to the same
lot, camera and city selection. Editing a vehicle must not silently rebuild
buildings; changing grass must not trigger tree growth or a fleet rebuild.

### 3.1 Common studio interface

All new studios use the same interaction model:

- Catalogue: family → component → preset → saved recipe/version.
- Scope: part, small compatibility fixture, complete asset, population test.
- Inspector groups: shape, construction, material, use/history, animation,
  attachments, representations and diagnostics. Hide irrelevant groups.
- Immediate uniform changes for lighting/color/animation inspection; debounced
  worker regeneration for topology. Show which changes require a rebuild.
- Stable seed, new variant, reset parameter group, undo/redo and pin comparison.
- Front/side/top/three-quarter and grazing views; meter grid, human-scale ruler,
  section/clipping view where it reveals interior or attachment problems.
- Beauty, clay, silhouette, wireframe, normals, roughness, metallic, AO,
  emission, coverage, socket and collision views where supported by the asset.
- Forced LOD, automatic LOD, mesh-only comparison, impostor atlas and readiness.
- Live triangle/draw/material/texture/instance counts; generation/upload timings
  separate from render frame time. Clearly label software-GPU measurements.
- Save draft, validate, register version, export recipe, import recipe,
  compare versions, revert selection and open dependent fixtures.

Use one viewport renderer, camera controller and job scheduler per workspace.
Offscreen inspection/capture is scheduled through that renderer. Avoid a hidden
second renderer for every small preview. Catalogue thumbnails are cached images.
Unloading a workspace cancels workers/jobs and releases its residency leases.

## 4. Shared asset contract

The recipe is authoritative. Geometry, materials, collision, layout envelopes,
LOD products and capture atlases derive from it. The City Lab cannot contain a
separate hard-coded version of a building or vehicle that only resembles the
authoring specimen.

### 4.1 Required records

| Record | Required information |
| --- | --- |
| Asset definition | Stable ID, category, owner lab, schema and generator versions, seed, parameter values, dependencies, physical units and coordinate frame |
| Construction model | Semantic parts, surfaces, materials, sockets, occupied/clearance volumes and optional articulation graph |
| Material definition | Role, base finish, physical properties, texture scale, color space, detail layers and exposure/wear inputs |
| Render pack | LOD geometry/index/attribute buffers, canonical material IDs, texture/mip records, local bounds, animation displacement bound, optional captures |
| Collision/contact pack | Simplified solid volumes and walkable surfaces derived from construction; separate from decorative geometry and shadow proxies |
| Mobility definition | Route compatibility, length, width, height, turning/swept envelopes, running gear, door locations, boarding zones, speed/acceleration parameters |
| Botanical definition | Species/family, habit, size, age/season, root/soil envelope, canopy clearance, leaf/tissue/wood dependencies, wind response and density rules |
| Placement record | Stable instance ID, recipe/version reference, local transform, anchor/frame, district/cell and selected allowed overrides |
| Validation record | Automated checks, local visual review notes, supported representations, known limits, measurements and acceptance state |

Schema examples are illustrative contract shapes, not APIs already implemented:

```json
{
  "schema": "aether.asset/1",
  "id": "architecture.facade.ceramic-bay",
  "owner": "architecture",
  "generator": {"id": "facade-bay", "version": 1},
  "seed": "CONCORD-BAY-024",
  "units": "metres",
  "frame": {"up": "+Y", "front": "+Z", "origin": "ground-centre"},
  "parameters": {"width": 3.6, "height": 4.2, "recess": 0.24},
  "dependencies": [{"id": "surface.ceramic.ivory", "version": 1}],
  "capabilities": ["static", "instancing", "mesh-lod"],
  "state": "draft"
}
```

### 4.2 Coordinates and physical fit

Use meters, +Y up and +Z front for new surface vehicles, buildings and public
components. Buildings originate at their ground contact center; vehicle wheel or
guide contact is the declared zero plane. Botanical assets originate at root/soil
contact. Use explicit socket frames rather than object bounding-box guesses.
Existing spacecraft use their existing axial convention; an explicit adapter
handles any connection to Mobility Lab without flipping existing credits assets.

Keep semantic world/cell coordinates as JavaScript numbers. Upload cell-local
float32 render transforms; add a renderer origin offset at the adapter boundary.
The initial city is resident; large-world origin shifting is a planned later
capability. Do not claim planetary precision from using a reversed depth buffer.

Cross-component dimensions must be testable: facade bay/floor planes, sidewalk
and threshold elevations, vehicle/platform gap, door/platform alignment, guide
profile, bridge bearing, planter soil depth and tree rooting space. Dimensions
are adjustable game-world design parameters, not civil-engineering certification.

### 4.3 Determinism, overrides and versions

- Use keyed random streams for structure, material, placement, wear, occupancy
  and animation phase. Adding one bolt cannot reshuffle every window or plant.
- Canonicalize the recipe and dependency versions before computing its cache
  key. Include generator, representation and material-layout versions.
- Separate asset seed from placement seed. A wider footprint or taller tower
  must be an allowed recipe variant, not an arbitrary transform that distorts
  doors, floor heights, panel scale and windows.
- Keep stable semantic face/bay/part IDs. Manual overrides attach to those IDs;
  report orphaned overrides after a structural edit instead of dropping them.
- Cities pin accepted recipe versions. An edited component becomes a candidate;
  dependent previews rebuild, and promotion updates selected references only.
- Track dependencies and reference counts. Rebuild the changed asset and its
  derived products, not all studios and all cities.

### 4.4 Attachments and exclusion volumes

Socket roles include facade-bay, roof-service, entry, terrace-planter, street
edge, station-boarding, guideway-end, support-bearing, vehicle-door,
wheel/guide-contact, luminaire-mount, soil-patch and root-contact. Each declares
orientation, fit range and clearance requirements.

Examples: a canopy requires an entrance socket; a rooftop cooler requires a
service plinth and access area; a shrub requires soil volume; a station platform
requires a route-aligned boarding envelope. Shared placement checks exclude
traffic lanes, vehicle sweeps, egress routes, guideway clearance, window openings,
service access and insufficient rooting depth. Decorative details cannot occupy
these envelopes.

## 5. Architecture Lab: from volumes to construction

Retain the six Concord families: spire, terrace, courtyard, dome, habitat and
utility. Give each an explicit structure/facade/roof/entrance rule set, then allow
controlled combinations. Avoid adding arbitrary greebles to a rectangular shell.

| Study | Parts to author | Primary controls | Required fixture |
| --- | --- | --- | --- |
| Massing | Podium, tower tiers, wings, atrium void, courtyard, dome, bridge | Width/depth, height, setbacks, void ratio, floor grid, symmetry and constrained asymmetry | Clay/silhouette row of all six families |
| Structural system | Columns, beams, braces, exoskeleton ribs, dome members, expansion joint | Bay span, member depth, spacing, attachment offsets and architectural role | Corner and long-span junction |
| Facade bay | Cladding cassette, frame, reveal, sill, lintel, seal, joint, sunshade | Bay/floor dimensions, recess, solid/glazed ratio, mullion spacing, shade depth | 3×3 bay wall plus outside/inside corner |
| Glazing | Clear/tinted/fritted pane, frame, gasket, reflection and room variation | Dielectric response, roughness, tint, pane scale, room depth, blind state | Exterior reflections and camera movement past a window |
| Interior appearance | Office, residence, civic/research/service room profiles | Room seed, partition arrangement, depth, blinds, occupied state, light grouping | Day/night facade with repeatability and motion checks |
| Entrance | Door/vestibule, canopy, threshold, steps, ramp, rail, sign, lighting | Entry width/height, public/service role, grade difference, canopy projection | Building-to-sidewalk interface |
| Terrace/balcony | Slab, waterproof upstand, rail, drain, planter support, shade frame | Setback, load-bearing support, edge type, drainage and planting sockets | Stack of planted terraces and corner edges |
| Roof | Parapet, coping, membrane, drains, service walkway, access hatch, solar/shade array | Roof pitch, drainage pattern, exclusion strips and maintenance access | Roof section, wet surface and service placement |
| Service equipment | Vent, cooler, conduit, pipe, panel, hatch, antenna and support | Capacity/size, maintenance side, attachment frame, clearance and age | Reachable equipment cluster attached to its host |
| Identity | Building name/number, district color, service labels, wayfinding | Sign family, content, physical size, contrast and mount | Day/night readable entry at human scale |

Architecture rules subdivide a building into zones, floors and bays. Surface
labels identify which zones can accept glazing, entry, service or landscape
modules. Different district roles select different rules and material palettes;
the same random material palette must not cover every building function.

Preserve real floor/door/bay dimensions when changing building proportions. Fit
integer bay counts with explicit end conditions; resolve corners and partial bays
without stretching their details. Give low buildings a readable roof composition
and public frontage rather than treating every type as a shortened skyscraper.

Window interiors start as a bounded shader effect with deterministic room
variants. Near entry/lobby fixtures can contain real shallow geometry. Avoid full
rooms behind every window. Keep occupancy grouped plausibly by use and time;
remove the current repeated every-seventh-floor light rule.

At distance, retain glazed/solid area, facade rhythm, roof silhouette and emission
distribution. Fine seals, bolts and deep trim geometry can collapse to normal/
roughness/coverage data. A facade cannot become mostly white simply because its
window geometry was removed.

## 6. Streets Lab: surfaces and connected cross-sections

| Study | Component catalogue | Controls / fit requirements |
| --- | --- | --- |
| Ground surface | Cast concrete panels, stone paving, asphalt/service surfacing, permeable units, tactile/marked zones | Meter texture scale, panel size, joint width, roughness, aggregate, moisture and repair frequency |
| Street cross-section | Deck/base, carriage/service strips, curb, sidewalk, planting strip, drainage and utility reserve | Widths, curb height, grade, crossfall, station/interface profile and edge termination |
| Geometry | Straight, circular arc, general curve, slope transition, intersection, ring/radial merge, cul-de-sac/service pocket | Radius, tangent/normal continuity, tessellation error in pixels, grade and intersection footprint |
| Pedestrian interface | Pavement corner, crossing, curb cut, ramp, steps, island and bollard line | Flush joins, step/ramp dimensions, corridor clearance and sidewalk connectivity |
| Markings | Lane/service direction, crossing, platform edge, stop zone, parking/service bay, route identifier | Physical width, spacing along arc length, wear mask and visibility range |
| Drainage | Gutter, channel, grate, gully, curb inlet and inspection cover | Slope direction, catchment placement, joint registration and removable access envelope |
| Ground transitions | Building apron, plaza edge, lawn/soil boundary, retaining edge and level change | Contact elevation, border width, slope transition and host surface normals |
| Bridge/deck | Deck, fascia, bearing, pier, expansion joint, parapet and maintenance edge | Span, support spacing, route sweep clearance and end sockets |

Derive geometry from a route centerline, an arc-length parameter and a
cross-section profile. Markings, curbs, rails and drainage consume that same
parameterization. Do not independently approximate each layer with an unrelated
circle or box. Junctions explicitly own their overlap region and lane/footpath
connectivity; overlapping road strips are not finished intersections.

Required fixtures: straight-to-curve, two different radii, slope-to-flat, raised
crossing, four-way junction, ring/radial interchange and street/building threshold.
Test top, grazing and low sun views for cracks, flipped faces, texture stretching,
floating markings and z-fighting. Fine detail must respect actual pixel coverage.

Large plaza and road surfaces require broad, medium and fine variation. Panel
layout, repair history and drainage carry the broad pattern; reusable material
maps provide the smaller scales. Keep paving aligned to its construction logic.

## 7. Transit Infrastructure Lab: complete transport structures

Separate pedestrian streets, service roads and elevated guideways. Their geometry
may share profile/sweep tools, but their traffic rules and clearance envelopes
remain distinct. The current eight radials, circular lines and hub connections
provide a layout input, not final station or switch geometry.

| Study | Parts | Controls / required connections |
| --- | --- | --- |
| Guideway | Running/contact surface, guide rail, power/service channel, fascia, drainage and maintenance edge | Gauge/profile, width, curvature, elevation, maintenance clearance and expansion joints |
| Support | Pier, capital, foundation/plinth, bearing, bracing, access hatch | Height, span/load visual class, footprint, ground fit and crossing clearances |
| Switch/merge | Branch profile, physical guide split, movement envelope, signaling package | Compatible profiles, branch angle, minimum curve, route transitions and occupied-route state |
| Station platform | Deck, edge treatment, boarding threshold, barriers/gates, docking stop | Vehicle length, door positions, platform elevation/gap, accessible route and passenger clearance |
| Station shell | Canopy, columns, roof drainage, enclosure, louver, glazing and lighting | Span, weather exposure, modular expansion, support and maintenance access |
| Vertical circulation | Stair, landing, ramp, elevator enclosure and shaft connections | Floor levels, headroom, landing space and continuous public path |
| Interchange | Ring/radial transfer, street/station connection, hub gateway | Route levels, walking path, signage hierarchy, transfers and vehicle sweeps |
| Service systems | Cabinets, rescue/service access, power enclosure, vents and sensor mounts | Protected access areas and fixture sockets |

The first station is an inspectable asset with a vehicle docking fixture. Doors,
platform gates, stopping position and boarding zones use shared socket data. A
station must be complete from below and from street level, including supports,
stairs/lift and maintenance access.

## 8. Mobility Lab: vehicles as full assets

Replace capsule placeholders with procedural, role-specific vehicles. Maintain
the current simple moving-pod demonstration until the replacements pass their
own tests. A better mesh alone does not implement traffic control or boarding.

| Vehicle family | Purpose | Distinct construction / motion |
| --- | --- | --- |
| Local passenger pod | Short circular/radial trips | Cabin, door, guide or wheel assembly, compact service package, docking indicators |
| Public shuttle | Higher-capacity local travel | Repeated cabin bays, larger boarding zones, multiple doors, running gear and roof services |
| Interhub train/carriage | Fast links between hubs | Car modules, couplers, bogies/guides, end interfaces, larger turn/swept envelope |
| Service/maintenance | Infrastructure and public-space support | Tool bays, access equipment, work lights, utility mounts and service livery |
| Logistics | Goods and supplies | Cargo module, loading sockets, secure door, handling equipment and clearance |
| Accessible transport variant | Distinct boarding needs within an appropriate family | Door/space arrangement, threshold and boarding compatibility; not a cosmetic scale change |

Each family has Body, Running Gear, Doors, Cabin, Equipment, Materials, Animation,
Docking and Population substudies. Component details include shaped structural
panels, joints, gaskets, handles, hinges, glass seals, lights/lenses, underbody
services, small registries and localized maintenance patches.

Controls: overall length/width/height, cabin bay count, roofline, nose/tail profile,
door location/width, wheelbase or guide profile, suspension visual travel,
articulation, equipment density, material zones, wear and livery. Constrain
controls by compatibility; a door cannot intersect running gear or a seat bank.

Animate wheels from traveled distance and doors from an explicit state. Guide
vehicles follow the track frame. Articulated carriages sample route positions
at their own longitudinal offsets; they do not rotate the whole train as one box.
Use arc-length motion with bounded acceleration/braking and real station stop
intervals. Remove instantaneous endpoint reversal from production routes.

Vehicle residency and dynamics are separate: near vehicles can have articulated
parts; distant vehicles use simpler meshes and reduced update frequency. A moving
vehicle should normally remain a low mesh at distance; static building/tree
impostors are not automatically appropriate for articulated moving transport.

Aerial transport, when introduced, references Spaceship Studio definitions or a
declared adapter. Mobility Lab owns traffic/docking behavior, not a second copy
of the spacecraft hull generator.

## 9. Public Space Lab: furniture, fixtures and utility parts

| Group | Catalogue | Refinement controls / fixture |
| --- | --- | --- |
| Seating | Bench, seat module, table, leaning rail, sheltered seating | Human-scale dimensions, support, edge profile, finish, ground fixing; arrange a seating group |
| Lighting fixtures | Pole light, bollard light, canopy strip, recessed step light, facade/entry fixture | Mount, lens/diffuser, beam role, emission, housing/maintenance; isolated day/night response |
| Wayfinding | District sign, building number, transit map, platform sign, directional panel | Legible type/layout, size, contrast, mounting and distance-dependent simplification |
| Boundaries | Railing, guard, bollard, low wall, gate, access barrier | Segment length, corners/end caps, anchoring, collision and opening envelopes |
| Public equipment | Bin/recycling, drinking point, information kiosk, docking stand | Access, controls, equipment scale, service side and clustered placement |
| Canopies/shelters | Small shade structure, entrance cover, queue shelter | Member/span/roof logic, drainage and attachment to the ground or host |
| Technical equipment | Cabinet, transformer/service enclosure, heat exchanger, conduit rack, pipe connection, utility hatch | Host socket, believable routing, labels, fastening and maintenance clearance |
| Surface accessories | Grate, inspection cover, joint insert, edging, fixing plate, access marker | Flushness, roughness, metal/dielectric separation and repeated-pitch control |

Mounting and ground contact are part of the asset: base plates, anchors, plinths,
seal lines and contact darkening. Repeated objects use a constrained family of
variants rather than arbitrary rotations that block their functional side.
Most small details merge or instance by material. A bench or cabinet does not
acquire its own entire texture set or dynamic light.

Crowds are a separate later system. Use a meter ruler and a human-scale reference
for dimension checks immediately. Photoreal people, clothing and crowd AI are not
hidden prerequisites for making the environmental components convincing.

## 10. Plantlife Lab: extend beside the trees

Retain existing Wood, Trunk, Branch, Leaf and Full Tree studies and the current
Forest Lab population workflow. New botanical studies belong alongside them,
with controls suited to their growth architecture.

| New study | Generator structure | Controls | Population / distance strategy |
| --- | --- | --- | --- |
| Shrub | Multiple woody stems, species-appropriate branching and leaf clusters | Habit, height/spread, stem count, pruning, canopy gaps, leaf size, maturity | Shared stem/leaf prototypes; clustered low meshes; validated distant captures when useful |
| Hedge | Shrub population plus explicit clipping/pruning volume | Width/height, profile, corner/end treatment, gaps, clipping irregularity | Repeated shrub segments and cluster HLOD; avoid a textured solid green box |
| Grass | Tuft/clump with blade centerlines and tapered blade geometry | Blade height/width, arch, tuft count, dry fraction, patch density, mowing | Near blades, middle clumps/cards with measured coverage, distant ground contribution |
| Ornamental grass/reed | Clump with taller curved blades and optional seed heads | Height, droop, stem stiffness, seed-head amount and wet habitat | Instanced clumps, preserved head silhouette, bounded overdraw |
| Fern | Central growth arrangement, curved fronds, ordered pinnae and pinnules | Frond count/length, arch, leaflet spacing, age/unfurling and clump spread | Near compound geometry, middle frond representations, distant patch aggregate |
| Flowering plant | Stems, leaves, botanical flower/inflorescence modules | Stem habit, bloom stage, flower count/size, petal/ray arrangement and season | Shared flower/leaf parts; color/coverage-preserving low representations |
| Ground cover | Rosette, creeping or mat-forming plant modules | Leaf density/scale, mat thickness, patch edge, gaps and local moisture | Clustered coverage with exposed soil; distance conversion to aggregate ground appearance |
| Climber/vine | Host-constrained path with stems, attachment points, leaves and optional blooms | Host surface, tendril/adhesion role, path spacing, droop, reach and age | Near host-aligned geometry; merged surface clusters; no unsupported floating vine paths |
| Succulent/rosette | Ordered leaf arrangement with thick curved leaf geometry | Leaf count, arrangement, taper, thickness, age and rosette scale | Geometry silhouette near; low mesh far; only include where the planting palette calls for it |
| Planted module | Soil and root space with references to accepted botanical recipes | Plant mix, spacing, density, soil depth, irrigation and maintenance pattern | Composition patch built from the same assets inspected in their species studies |

Each study supports specimen and patch views, neutral/backlit/raking light,
season/age controls where meaningful, wind on/off, shape/clay and texture views,
forced representations, density stress and recipe export.

Reuse the current bark/leaf/tissue tools through adapters when appropriate. A
shrub is not simply a scaled tree, a fern is not an arbitrary fan of tree leaves,
and grass is not thousands of independent scene objects. Expose the biological
organization and use a bounded number of prototypes plus per-instance variation.

Use one world wind description with species/organ stiffness and phase. Root
anchors stay fixed. Main bending and leaf/blade flutter have different amplitudes
and frequencies. Update displaced normals where needed, and include maximum
displacement in culling/shadow bounds. Far grass should not incur near-blade
shading or transparent layers across the entire screen.

### 10.1 Integrating the existing trees

Create a shared tree recipe adapter consumed by both Nature/Forest and City.
Verify that the same recipe gives the same trunk/crown/leaf specimen in both.
Provide open-grown, avenue/pruned and courtyard placement settings through
explicit recipes or constrained variants, retaining the existing tree generator.

Placement respects root volume, canopy clearance, light/exposure, building
openings, vehicle envelopes and maintenance paths. City planting selects from
accepted tree recipes; it never introduces a simplified replacement tree solely
inside `city/infrastructure.js`. Keep the existing forest impostor coverage and
population regressions as part of this adapter's acceptance checks.

## 11. Landscape Lab: soil, water and planting assemblies

Landscape Lab owns the ground and planting context; Plantlife owns the specimens.

- Soil/bed section: soil depth, edging, mulch/litter, gravel, drainage and plant
  anchor planes. Show a section so root space and planter depth can be inspected.
- Tree pit: root reserve, grate/soil opening, curb/seat edge, irrigation and
  neighboring sidewalk. Place an actual existing tree via its recipe adapter.
- Planter: wall, coping, waterproof liner/drainage representation, soil fill,
  overflow and maintenance access. Assign a botanical mix, not a green cylinder.
- Grade transition: slope, terrace, retaining edge and steps/ramps. Derive
  plant/prop anchors from the actual host surface and surface normal.
- Garden water: basin edge, depth profile, bed material, water surface, outflow
  and nearby paving. Water remains dielectric; use roughness and reflections
  appropriate to the selected quality profile. Do not fake its response with a
  metallic surface simply to get a bright highlight.
- Park patch: paths, beds, trees, shrubs, ground cover, seating and water as
  referenced assemblies. Preserve pedestrian connectivity and view corridors.
- Roof garden: substrate depth, load/structure visual class, parapet/guard,
  overflow, wind/exposure class, service route and accepted planting mix.

Placement uses patches, edges, gradients and ecological/maintenance groupings.
Avoid equally spaced isolated plants everywhere and avoid unconstrained noise.
Ground under planted areas combines exposed soil and plant coverage rather than
an uninterrupted green disk. Bind assets to the surface once per build/update;
do not raycast every plant every animation frame.

## 12. Shared surfaces, glazing, detail layers and lighting

### 12.1 Material families

Author ceramic cladding, cast stone/concrete, paving, coated metal, bare metal,
rubber/seals, glazing, roofing, road/service surfaces, soil/mulch and water.
Foliage/wood retain their botanical shading path. Share definitions and packing
mechanisms without forcing all material families into the same shader.

Dielectric cladding, glass, rubber, stone and water do not become metallic to
increase gloss. Separate base color, roughness, metallic, normal, AO, emission
and applicable transmission/thickness. Maintain explicit sRGB/linear data rules.
AO describes local occlusion and cannot replace directional contact shadows.

Use meter-based tiling and local surface coordinates. Large wall/road panels
receive repeatable base textures plus construction-scale variation. A single
small atlas tile stretched over a 100 m facade is not sufficient near-field
detail. Preserve guarded finish atlases for semantic zones; add tiling detail,
trim sheets and marking layers with explicit UV conventions and stable budgets.

Trim sheets supply reusable edge, rail, seal, joint, sill and service-strip
details. Coherent surface layers handle exposure, sheltered dirt, runoff, repairs,
moisture and scuffing. Every mask declares whether it lives in world, asset,
surface or UV space so it does not slide during camera/origin movement.

### 12.2 Window and identity layers

Glazing uses exterior reflections and consistent Fresnel behavior. Interior
depth, room/blind variants and occupancy are seeded independently of geometry.
Define a cheap distant facade appearance that retains average luminance, glazed
area and emission. Motion artifacts and shader cost must be measured before
enabling more expensive interior shading across all visible buildings.

Signs are readable near their intended use distance and simplify farther away.
Pack labels/markings into shared atlases; do not rasterize a new texture for every
instance each frame. Keep registry/wayfinding data separate from its visual bake.

### 12.3 Lighting Lab

Provide two calibrated contexts: neutral inspection and exterior environment.
Use an exterior sky/reflection environment for city and vehicle outdoor tests;
retain studio environments where appropriate for material/part inspection.

Expose sun position/intensity/color, sky contribution, exposure, environment
rotation/intensity, fog, fixture emission and shadow quality. Weather presets
drive a common wetness/exposure state across eligible surfaces. Emissive windows
are not automatically simulated light sources; label any local bounce
approximation and budget real lights close to the camera.

Test a facade corner, a glass/metal/stone sample, a planted bed, a station canopy
and a parked vehicle under the same preset. Contact shading must ground objects
without painting black outlines around every seam. Keep shadows stable across
mesh/impostor transitions and use independently budgeted near shadow casters.

## 13. Representation, residency and performance contracts

### 13.1 Asset preparation pipeline

1. Resolve a recipe and immutable dependency versions; compute a content key.
2. Construct semantic parts, sockets, envelopes and material assignments.
3. Generate meshes/material bakes/contact proxies in workers; serialize typed
   buffers. Worker dependency graphs use explicit pinned module URLs.
4. Hydrate shared resources, batch/instance compatible geometry, then compile
   and warm the actual required pipelines under a bounded job scheduler.
5. Generate optional captures/derived products from the accepted source asset.
   Capture owns renderer state until restoration; no concurrent viewport render
   can accidentally draw into its offscreen target.
6. Validate bounds, channels, directional coverage and resource budgets. Admit
   representations individually; retain an available mesh while captures build.
7. Register a versioned asset pack, then allow fixture and City/Forest consumers
   to acquire residency references.
8. Dispose only when no consumer/job holds a lease. Device loss or navigation
   cancels pending work without stale callbacks reattaching old assets.

### 13.2 Representation by asset type

| Asset | Near | Middle | Far / city overview |
| --- | --- | --- | --- |
| Building | Construction modules, physical reveals/trim, bounded interior effect | Merged meshes, planar glazing, retained facade/material rhythm | Validated building capture, then district HLOD where appropriate |
| Existing tree / shrub | Branch/leaf geometry and GPU motion | Reduced wood/foliage or clustered canopy | Validated directional capture or vegetation-cluster HLOD |
| Grass / ground cover | Blade/leaf clumps | Reduced clumps/coverage representations | Aggregate ground color/normal/coverage contribution with no empty ring |
| Road / walkway | Cross-section, joints/markings and local accessories | Reduced sweep tessellation and baked detail | Continuous low geometry or district proxy; avoid billboard road segments |
| Station / guideway | Separate functional parts and fine structure | Merged structure with preserved clearance/silhouette | Structure/district HLOD with coherent night lighting |
| Moving vehicle | Body/doors/gear articulation | Reduced mesh and animation detail | Cheap mesh plus lower simulation frequency; static captures only for explicitly suitable cases |
| Small prop | Physical part and mounts | Low mesh / merged group | Aggregate fixture/streetscape proxy or justified subpixel cull |
| Landscape | Soil/edge/plant/water assembly | Reduced ground and botanical population | Patch/district aggregate retaining visible coverage |

Transitions use projected size, hysteresis and representation-specific rules.
Avoid timed silhouette deformation. Test spatial coverage transitions without
assuming temporal antialiasing will hide visible noise. Preserve population,
silhouette, surface coverage, glazed ratio, dominant color and night emission.

### 13.3 Atlas and buffer rules

- Keep per-instance parameters interleaved and test actual WebGPU buffer layouts
  against the portable eight-slot limit. Do not add a buffer for every scalar.
- Preserve isolated mip filtering and texel guards for atlas cells. Tiling detail
  maps have separate filtering/UV rules; document the distinction.
- Capture metadata declares projection, basis, coordinate origin, tile layout,
  bounds, color/alpha convention, normal encoding and auxiliary channel meaning.
- Current forests store normal/depth; current city captures use normal/emission.
  A consumer must not infer one encoding from the other's texture format.
- Test all capture directions, poles, copied tile orientation, nonuniform scale,
  yaw and color space. Compact 256-byte GPU readback row padding before analysis.
- Never remove a visible representation until its replacement is complete and
  validated. A failed asset/capture has a diagnostic fallback and error state.

### 13.4 Proposed starting budgets

These are initial authoring ceilings to tune through measurement, not certified
performance or a requirement to spend every triangle.

| Asset class | Near geometry starting range | Population strategy |
| --- | --- | --- |
| Facade bay | 100–1,500 triangles | Instance recurring parts while authoring; merge by material for city rendering |
| Complete building | 8k–60k triangles, dependent on role | Explicit near count; lower meshes/captures for the population |
| Passenger/service vehicle | 15k–80k triangles including visible gear | Bounded near fleet; shared mesh/material families and reduced distant articulation |
| Small public component | 100–5k triangles | Material/geometry instancing or static cluster merge |
| Shrub/flower/fern specimen | 500–12k triangles, depending on form | Bounded prototype library and patch representations |
| Grass/ground-cover clump | 16–512 triangles | Spatial patch culling, density/coverage scaling and fill-rate checks |
| Station/bridge | Budget by visible span/parts, not whole-city multiplier | Modular residency; low structure and district proxies |

Desktop 60 FPS and reduced-quality 30 FPS are target profiles to measure on named
hardware, at stated viewport/resolution and camera routes. Track CPU culling,
generation, upload, shader compilation, GPU pass time, overdraw, draw count and
texture/geometry/instance memory independently. No bake, topology generation or
new texture upload belongs in ordinary vehicle movement or city animation.

Start with configurable upload/time budgets per frame and explicit memory caps;
measure before setting platform defaults. Use a bounded residency cache and
priority queue. Large cities need cell streaming and district HLOD before the
current resident 18,117-building preset is expanded substantially.

## 14. City assembly and dependency propagation

City recipes reference accepted building, street, station, vehicle, public-space,
landscape and lighting definitions. City generation provides composition rules,
stable placement IDs, route graphs, zoning and reserve volumes. It does not
construct its own alternative benches, grass or transit vehicle meshes.

Assembly order:

1. Regional/city terrain and hub reservations.
2. Transit/service/pedestrian networks and junction footprints.
3. Ground sections, drainage, retaining edges and station foundations.
4. Lots, building envelopes, entry/servicing interfaces and skyline rules.
5. Platforms, stations, supports, vertical circulation and interchange paths.
6. Buildings, facade/roof/entry modules and attached service equipment.
7. Soil/tree/root reserves and landscape assemblies.
8. Public furniture, signs, fixture mounts and utility routes.
9. Botanical population from the existing tree and new plant libraries.
10. Vehicles, valid routes/stops, docking and bounded activity.
11. Lighting/weather state and derived proxy/capture/residency products.

Resolve intersections and access before placing decoration. The city should
retain connected pedestrian and service paths after furniture and planting.

Allow district profiles for civic/research, residential/cultural and service/
logistics. Vary heights, frontage, materials, canopy/planting composition, station
frequency and maintenance history within a coherent district language. Keep the
circular masterplan recognizable; terrain and district constraints can later
introduce meaningful irregularity instead of identical satellite disks.

### 14.1 Editing without damaging an assembled city

An edited component first appears in its own lab and named compatibility fixture.
If it passes, register a candidate version. City Lab previews replacing one
selected reference or district, shows changed dependencies and checks clearance.
Promote the update explicitly within that composition. Retain the previous
version for comparison/rollback; do not overwrite every city recipe automatically.

Persist authoring drafts and settings using a versioned local browser store,
with JSON import/export for portability. Content-addressed derived caches can be
discarded/rebuilt. Pin authored recipes separately from disposable GPU resources.

## 15. Source layout and migration boundaries

The following paths are proposals. Existing files listed in section 2 remain
the authoritative current implementation until their adapters are complete.

| Proposed source area | Responsibility |
| --- | --- |
| `src/environment/contracts/` | Recipe schemas, units/frames, sockets, envelopes, validation and versioning |
| `src/environment/catalog/` | Registry, dependency graph, accepted versions and preset metadata |
| `src/environment/materials/` | Shared finish definitions, mask composition, UV conventions and atlas metadata |
| `src/environment/generators/architecture/` | Massing, structure, facade, entrance, roof and assembly |
| `src/environment/generators/streets/` | Profiles, sweeps, junctions, edges, markings and drainage |
| `src/environment/generators/transit/` | Guideways, supports, stations and interchanges |
| `src/environment/generators/mobility/` | Vehicle parts, articulation and vehicle descriptors |
| `src/environment/generators/public-space/` | Public/technical fixtures and small assemblies |
| `src/environment/generators/plantlife/` | New shrub/grass/fern/flower/ground-cover/climber generators plus existing-tree adapter |
| `src/environment/generators/landscape/` | Soil, planters, grade/water edges and composition patches |
| `src/environment/assembly/` | Asset references, placement constraints, district dependencies and composition |
| `src/render/assets/` | Asset-neutral hydration, resource leases, representation readiness, upload scheduling and captures |
| `src/studios/` | Shared host/controls, per-lab study descriptors and compatibility fixtures |
| `scripts/build-foundation.mjs` and later build modules | Explicit pinned deployment/worker graphs; generate deployed copies from owned source |
| `docs/` | Contracts, acceptance fixtures, research decisions, execution log and measured limits |

Move a system once with a compatibility export; avoid maintaining independent
`src` and hand-edited deployed implementations. Migrate the generic mechanisms
from ship/forest names into shared ownership only after old/new fixture parity.
The `forest*` instance fields can remain behind a compatibility adapter during
migration; every consumer cannot reinterpret the same field independently.

## 16. Delivery sequence and acceptance gates

Complete parts in independent labs before promoting their assemblies to City.
Small interface fixtures are permitted throughout; they exist to test fit rather
than to hide unfinished components inside an impressive whole-city view.

| Stage | Deliverable | Exit gate |
| --- | --- | --- |
| E0 · Baseline | Fixed source recipes, current six-family/forest/ship reference fixtures, existing capability inventory | Reproducible baseline; tree output and existing city count/coverage retained |
| E1 · Shared foundation | Asset contract, registry, shared studio host, versioned recipe store, worker/job ownership, lighting contexts | Same asset recipe restores in a standalone lab and compatibility fixture; safe navigation/cancellation |
| E2 · Surface and facade | Metric material samples, trim/detail layers, facade bay/corner, glazing and room variation, entrance/roof parts | Convincing neutral/raking/day/night inspection; stable facade appearance across LODs |
| E3 · Streets | Road/walkway profile, curve, junction, grade transition, pavement, drainage and markings | Continuous geometry, UV scale, edge contact and connected pedestrian/service paths |
| E4 · Public components | Seating, signs, railings, fixtures, technical cabinets and service attachments | Ground/host contact, readable identity, access clearance and repeated population budgets |
| E5 · Transit structures | Guide profile, support, station/platform/canopy, stair/lift and interchange | Structure complete from all angles; route/boarding interfaces valid |
| E6 · Vehicles | Passenger pod first, then shuttle/train/service/logistics variants | Running gear, doors, materials, motion, stopping and docking pass independently |
| E7 · Plantlife extensions | Existing-tree adapter; shrubs/hedges, grass/ground cover, then fern/flower/climber/rosette studies as palettes require | Species/organ form, patch coverage, wind, representations and existing-tree parity |
| E8 · Landscape | Soil/tree pit, planter, grade/retaining edge, water garden and roof/park patch | Actual accepted vegetation attached to correct soil/host surfaces with clear paths |
| E9 · Compatibility block | A station/plaza with accepted buildings, streets, vehicles, fixtures and planting | All interfaces fit; no substitute meshes; daylight/night and street/aerial review |
| E10 · City propagation | District assignment, asset/version selection, small/large networks, selected reference updates | Correct population and appearance with existing deterministic layout and overrides |
| E11 · Large-world scale | Streaming/residency, district HLOD, scheduled capture/cache, origin adaptation | Measured routes stay within chosen budgets; no representation holes or growing resource counts |

Stages E4–E8 depend on the shared contracts and relevant material/geometry
interfaces; they do not all depend on every preceding catalogue being finished.
Do not assemble the city with unaccepted substitutes while the proper asset lab
is still unfinished. Track each study independently in the [companion roadmap](environment-studio-roadmap.json).

### 16.1 First complete asset set

The first integration block uses: a facade/entrance/roof kit for three existing
building families; one finished road/sidewalk/junction profile; one station and
guideway/support family; one passenger pod; seating/sign/light/railing/service
fixtures; the existing trees; a shrub/hedge, grass and ground-cover palette; and
one planter/tree-pit/water-edge landscape kit. Other catalogue studies remain
explicit follow-ups, independently refineable through the same contracts.

This is a reference environment for evaluating the finished parts together.
The entire catalogue above remains the intended system, not a claim that this
first set exhausts every later species, vehicle or district style.

## 17. Validation, CI and manual visual review

| Gate | What must be proven |
| --- | --- |
| Recipe | Determinism, schema version/migration, stable IDs, dependency resolution, import/export and allowed ranges |
| Geometry | Finite valid attributes/indices, normals/winding, seams, expected open/closed surfaces, meter scale and deformation bounds |
| Interface | Socket frame/fit, clearance volumes, road/junction continuity, threshold/grade connection, track/vehicle/platform/door compatibility |
| Material | Correct color/data spaces, dielectric/metal roles, physical texture scale, filtering, atlas guards, layer coordinates and bounded shader variants |
| Botanical | Existing-tree parity, species/organ organization, root anchoring, canopy gaps, growth/patch distribution, host attachment and wind bounds |
| Mobility | Arc-length speed, acceleration/braking, route continuity, stopping, door states, articulation and valid swept envelopes |
| Representation | Silhouette/coverage, glazed fraction, dominant finish/emission, nonuniform scale/yaw, all atlas directions, readiness fallback and no population loss |
| Lifecycle | Stale worker rejection, cancel/resize/device-loss/navigation races, reference counts, cache invalidation and no long-session resource growth |
| GPU | Actual WGSL/device validation, portable binding count, correct packed uploads/readbacks and repeatable mesh/capture render comparisons |
| Visual | Near part, small compatibility fixture and population views under neutral, exterior, grazing and night presets |
| Performance | Named hardware/resolution, repeatable camera/route, CPU/GPU timings, draw/memory/overdraw budgets and no ordinary movement build/upload spikes |

Use focused tests for actual new contracts and geometry/representation failures.
Keep the current city, nature, site and engine CI groups; expand selection by
declared dependencies as modules become real. Documentation-only changes do not
require render suites. Shared material/asset changes run all dependent groups.

Keep visual/GPU review local and manually invoked. Do not reinstate the removed
GitHub screenshot pipeline. Preserve optional pixel-based GPU regression tools
and manual measurement export. A software GPU can prove execution/coverage;
actual target hardware is required for speed and final visual assessment.

Acceptance states: draft → lab-validated → registered candidate → fixture-validated
→ accepted in a composition. The state registry records what was actually checked.
These states cannot be inferred from a successful syntax check or a completed UI.

## 18. Research basis and decision notes

The engineering and catalogue decisions above are Aether-specific proposals.
Primary references provide established mechanisms; they do not imply that Aether
already implements the cited engines or their full visual feature sets.

- [The Venus Project: Circular Cities](https://www.thevenusproject.com/resource-based-economy/environment/circular-city/): circular belts, radial organization and integrated gardens anchor the visual direction.
- [Müller et al., Procedural Modeling of Buildings, ETH Zurich](https://emeritus.icu.ee.ethz.ch/research/demos/procedural-modeling.html): shape-grammar research motivates explicit building zones and component subdivision.
- [Esri: Learn procedural modeling with CGA](https://learn.arcgis.com/en/paths/learn-the-basics-of-procedural-modeling/): mass/facade decomposition is a useful authoring reference for inspectable floor/bay rules.
- [Epic: City Sample](https://dev.epicgames.com/documentation/unreal-engine/city-sample-project-unreal-engine-demonstration): modular assets and metadata support city composition. Aether retains its own Three.js/WebGPU implementation.
- [Epic: Temporal Super Resolution](https://dev.epicgames.com/documentation/unreal-engine/temporal-super-resolution-in-unreal-engine): its discussion of simulated window interiors and distant facade detail is relevant to motion/representation validation; this plan does not add TSR to Aether.
- [Sousa, Vegetation Procedural Animation and Shading in Crysis, GPU Gems 3](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis): separate main/detail vegetation motion, organ stiffness and tissue lighting inform the new botanical studies. The proposed WebGPU implementation must be measured independently.
- [Zioma, GPU-Generated Procedural Wind Animations for Trees](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-6-gpu-generated-procedural-wind-animations-trees): an additional reference for instanced vertex-driven wind.
- [Epic: World Partition HLOD](https://dev.epicgames.com/documentation/unreal-engine/world-partition---hierarchical-level-of-detail-in-unreal-engine): grouped distant representations inform a later district-HLOD tier; Aether does not gain Unreal's streaming system by analogy.

The existing nature-growth research and current city implementation details
remain in [NATURE-GROWTH-V3.md](NATURE-GROWTH-V3.md),
[forest-rendering.md](forest-rendering.md),
[CITY-BUILDINGS-LAB.md](CITY-BUILDINGS-LAB.md) and
[rendering-assets.md](rendering-assets.md).
