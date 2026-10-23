# Native procedural architecture: research and first construction prototype

## Decision

Aether generates geometry itself. Blender, Houdini, Unity and downloaded mesh kits are not runtime or authoring dependencies for this work. The new bench is `dist/city-grammar.html`, linked from Architecture Lab. It is a separate construction prototype, not a replacement for the current city generator or evidence that the requested final visual quality has been reached.

The target is a large vocabulary of coherent architecture across planets. A different seed must be able to change structure, negative space and construction details, rather than merely tinting or stretching a familiar extrusion.

## Research that changes the design

| Primary source | Finding relevant to Aether | Engineering decision |
| --- | --- | --- |
| Wonka, Wimmer, Sillion, Ribarsky, **Instant Architecture**, SIGGRAPH / TOG 2003. [University publication and paper](https://www.cg.tuwien.ac.at/research/publications/2003/Wonka-2003-Ins/), DOI 10.1145/882262.882324. | A spatial split grammar and a separate control grammar distribute design attributes and select compatible rules. | Separate composition, facade layout and geometric module construction. A shared facade rhythm controls many bays; individual windows do not independently choose random designs. |
| Müller, Wonka, Haegler, Ulmer, Van Gool, **Procedural Modeling of Buildings**, SIGGRAPH / TOG 2006. [ETH publication](https://www.research-collection.ethz.ch/items/6c6b0884-3dce-408c-af17-48a1e699b588), DOI 10.1145/1141911.1141931. | CGA develops mass models into facades and details; context-sensitive occlusion and alignment checks address intersections and inappropriate placements. | Decide which boundaries are exposed before emitting wall modules. Choose street entrances from ground-level exterior bays. Preserve shared floor datums. Aether's integer-column union is a restricted implementation choice, not a full CGA implementation. |
| Bao, Schwarz, Wonka, **Procedural Facade Variations from a Single Layout**, TOG 2013. [Author publication and paper](https://michael-schwarz.com/research/publ/2013/facade/), DOI 10.1145/2421636.2421644. | Variations can preserve hierarchical layout constraints and important alignments. Their method uses heuristic search and quadratic programming. | Preserve floor lines and repeated groups while varying their module recipes. Future editable constraints should include paired bays, grouped spans, symmetry and reserved service zones. The prototype does not implement their optimization solver or image-analysis tools. |
| David Santiago, Insomniac, **Procedurally Crafting Manhattan for Marvel's Spider-Man**, GDC 2019. [Published presentation](https://media.gdcvault.com/gdc2019/presentations/santiago_david_procedurally_crafting_manhattan.pdf). | The slides describe a city with over 8,300 buildings and over 3,250 edifice prefabs, instanced architecture, hierarchical modularization, procedural validation and a polish workflow. | Procedural assembly needs a detailed construction vocabulary. For Aether, author that vocabulary as geometry-generating code and reusable rule data. Expose seeds, semantic component identities and inspection tools. The slides do not establish that all the game's architectural assets were generated from scratch. |
| Jaap van Muijden, Guerrilla, **GPU-Based Procedural Placement in Horizon Zero Dawn**, GDC 2017. [Studio publication](https://www.guerrilla-games.com/read/gpu-based-procedural-placement-in-horizon-zero-dawn). | Artist-defined placement rules support dynamic environment assembly around the player. | Keep building synthesis separate from district placement and streaming. This is evidence for an environment-placement architecture, not a source for building-facade geometry. |

These are complementary techniques, not a ranking of the “best” generator. The useful combination is controllable architectural rules, constructed modules, context checks and a production-friendly representation. AAA production quality also requires visual authoring and iteration; a paper citation alone does not establish that quality.

## Implemented now

`city/grammar.js` is a pure deterministic compiler. It produces a serializable intermediate representation (IR) before any renderer is involved.

* Twelve composition rules: enclosed court, horseshoe, elbow, cross, parallel wings, comb, terraces, terraced pyramid, twin towers, triad, raised-corner perimeter and blade/core. Wing widths, shoulders, terrace runs, height cuts and rotation vary within compatible rules.
* Integer columns share a floor grid. Union boundaries are determined by comparing neighbouring column heights. An adjoining wing removes the shared facade completely, and a terrace appears where a lower column meets a higher one. Open courts remain empty.
* Six facade grammars: structural frame, ribbon, paired bays, solar fins, loggias and technical bands. Base, body, crown and mechanical zones share a stable building-wide rhythm.
* Six planetary construction profiles change floor height, window proportion, reveal depth, wall return depth, shading, roof treatment and material kit. The ocean profile has a taller solid foundation; it is not a stilt or flood-engineering simulation.
* Independent massing and facade seed streams. Changing a facade seed preserves the height field and rotation. Material maps and roof-equipment choices do not determine massing.
* A single street entrance is selected on an exposed ground-level wall. No entrance is placed high on an arbitrary wing.

`city/grammar-model.js` constructs the modules directly into shared buffers:

* Actual open wall rings, octagonal aperture chamfers, recessed returns, gasket rings and inset glazing. There is no closed opaque building shell behind the windows.
* Mullions, projecting sills, manufactured trims, cladding cassettes/inlays, structural pilasters, floor datums, solar brows/brackets, loggia guards, louvers, entry canopy and identity strip.
* Exposed roof decks, parapets, copings, planting cassettes, technical housings, slats and service risers. Shared roof edges do not receive parapets.
* Existing metre-scaled procedural PBR materials, with no downloaded texture set. Glazing uses the existing bounded shader room approximation; there are no modeled interior rooms.
* Two draw streams per building, for solid construction and glazing. Detail reduction preserves the same apertures and semantic bay choices. This is not yet the complete production near/mid/far/impostor pipeline.

`city/grammar-review.js` provides neutral/raking/overcast lighting, clay and wireframe inspection, a close-up camera, twelve-composition comparison, independent seed controls and JSON recipe export. The recipe is for the native prototype; it is not interchangeable with the older Architecture Lab schema.

## Where the variety comes from

| Scale | Decisions | Constraints that keep it coherent |
| --- | --- | --- |
| Planet | Pressure/climate construction profile, facade depth, thermal shading, material vocabulary | Compatible window ratios, reveals and roof treatment |
| Building | Footprint topology, wing dimensions, tower/podium hierarchy, tier elevations | Ground-connected columns and a common floor grid |
| Facade | Grouping period, phase, mechanical-floor spacing, grammar | Repeated aligned modules and a separate base/body/crown hierarchy |
| Module | Aperture shape/proportion, frame, fin, louver, loggia and service recipe | Each module fits its bay and responds to its zone |
| Surface | Finish, local deposits, bounded manufacturing variation | Metre scale and existing semantic material zones |

The prototype exposes the first four scales at building level. District-level style inheritance and deliberate landmark exceptions remain future work. Multiplying menu counts would overstate useful diversity; measure actual generated outputs instead.

The automated fixed-size survey tests 1,000 seeds and counts unique integer height arrays, excluding orientation, color, facade and equipment differences. The test prints the measured count. It requires at least 200 distinct topologies and validates connected footprints, a grounded entry, unique facade ownership and the exact exposed-boundary count for every seed. This is a diversity diagnostic, not a claim that every result has a unique architectural character.

## Validation

Run `npm run build`, `npm run check` and `node scripts/test-city-grammar.mjs`. The grammar test is also part of `npm test` and the city CI group.

The geometry cases cover all 12 compositions in all six climates, cycling through the six facade grammars. Checks include finite vertices, nondegenerate triangles, unit normals, winding, bounded default-size complexity, aperture identity across detail levels, and rays passing through window apertures to the glazing before encountering opaque geometry. These are not a general proof that all ornamental parts are intersection-free: copings, canopy attachments and structural trim deliberately meet or intersect at joins.

`scripts/check-city-grammar.mjs` is an optional local WebGPU inspection harness, not screenshot CI. It captures a building, an aperture close-up, arid construction and the composition comparison; it also records console/device errors. Software GPU results do not establish hardware performance.

## Next engineering stages

1. **Approve a construction vocabulary by visual inspection.** Refine one civic, one industrial and one residential example at street distance. Evaluate large-scale silhouette, medium-scale structural rhythm and close-up fabrication separately. The current proof remains visibly repetitive and needs stronger art direction before replacing city assets.
2. **Make facade constraints editable.** Add span groups, protected entrances, mechanical shafts, material zones and corner policies to rule data. Reserve real space for windows and service equipment; keep attachment compatibility explicit. Export/import the native schema before exposing it as a production authoring format.
3. **Generalize the facade compiler.** Use polygon-edge scopes for chamfered wings and tangent scopes for arcs; add corner transitions and facade modules adapted to curvature. Keep existing circular/twisted families. The height-field representation cannot express arbitrary curved envelopes, bridges or cantilever voids.
4. **Expand structural composition.** Introduce a support/attachment graph for bridges, portals, transfer decks, branching towers and bounded cantilevers. Validate support paths, allowable spans and occupied-space conflicts. Do not represent these as unvalidated floating decoration.
5. **Add inhabited detail.** Procedural entrances with vestibules, service access, signage, drains, parapet joints, rooftop access, actual interior slices and street interfaces. Condition grime on those geometric features. More triangles alone are not a quality target.
6. **Integrate with the city pipeline.** Compile approved IR modules in workers; preserve zone attributes, shared materials, shadow geometry, LOD identities and impostor capture. Use module instancing where it materially reduces memory. Establish measured frame/memory budgets on a hardware GPU.
7. **Add district and planet orchestration.** City layout reserves parcels, roads, transit and civic space; district rules inherit a construction vocabulary; landmark exceptions alter massing deliberately. Seed streams separate planet, district, parcel, building, facade, module and surface decisions. Test skyline diversity and local coherence on actual city blocks.

All these stages can stay procedural and native to Aether. They require a richer authored rule library and careful visual validation, rather than a dependency on a DCC application.
