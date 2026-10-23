# Native procedural architecture: sculpted envelopes and layered construction

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

## Additional research for curved, organic and tapered buildings

| Primary source | Relevant result | Aether interpretation |
| --- | --- | --- |
| Edelsbrunner, Havemann, Sourin, Fellner, **Procedural modeling of architecture with round geometry**, Computers & Graphics 64, 2017. [Publisher](https://www.sciencedirect.com/science/article/pii/S0097849317300134), DOI 10.1016/j.cag.2017.01.004. | Coordinate systems let procedural splitting and component orientation follow round geometry. | Give modules a surface domain instead of a world-aligned box. Position wall apertures, glazing and trim on the same curved envelope. Our parameterization and compiler are custom implementations. |
| Ilčík, Musialski, Auzinger, Wimmer, **Layer-Based Procedural Design of Facades**, Eurographics / CGF 2015. [University paper](https://www.cg.tuwien.ac.at/research/publications/2015/Ilcik_2015_LAY/), DOI 10.1111/cgf.12553. | Independent layout layers are reconciled with alignment and occlusion semantics; the paper uses mixed discrete/continuous optimization. | Resolve access, mechanical belts, service spines, armor and occupied glazing in that priority order. Group bays and storeys into nonuniform regions. We use deterministic cell ownership, not the paper's optimization solver. |
| Jesus, Coelho, Sousa, **Layered shape grammars for procedural modelling of buildings**, 2016. [Institutional paper](https://repositorio.inesctec.pt/handle/123456789/5163), DOI 10.1007/s00371-016-1254-8. | Layering and vector-defined shapes broaden the expressiveness of grid-based split grammars. | Keep shape definitions separate from facade pattern rules. Reuse constructed components across rectilinear and sculpted families. No general vector-grammar interpreter is claimed. |
| Kelly, Wonka, **Interactive architectural modelling with procedural extrusions**, TOG 2011. [Author publication](https://twak.org/project/procex/), DOI 10.1145/1944846.1944854. | Footprint-based procedural extrusions support difficult architectural surfaces and roof details. | Separate the plan contour from its elevation profile: taper, bulge, flare, twist and lean. Our lofted surface model does not implement their sweep-plane or straight-skeleton algorithm. |
| Eigensatz et al., **Paneling Architectural Freeform Surfaces**, SIGGRAPH / TOG 2010. [EPFL publication](https://infoscience.epfl.ch/entities/publication/2b8c2b13-9ee7-4caf-a2d8-83772f10f859), [author paper](https://www0.cs.ucl.ac.uk/staff/N.Mitra/research/paneling/paper_docs/panelization_sigg10_small.pdf). | Panel layout, continuity tolerances and reusable fabrication types are considered jointly. | Use a bounded construction vocabulary, shared surface sampling and matching crown knots. We do not solve mold reuse or fabrication-cost optimization. |
| Andrade, Harada, Shimada, **Framework for automatic generation of facades on free-form surfaces**, Frontiers of Architectural Research 2017. [Publisher](https://www.sciencedirect.com/science/article/pii/S2095263517300237), DOI 10.1016/j.foar.2017.04.003. | Surface patterns can be controlled through feature placement, orientation and size over freeform surfaces. | Fit bays by contour arc length, and orient their returns through local surface normals. We do not implement the tensor-field or bubble-packing algorithm. |
| Gavriil, Schiftner, Pottmann, **Optimizing B-spline surfaces for developability and paneling architectural freeform surfaces**, 2018. [Author manuscript](https://arxiv.org/abs/1808.07560). | Near-developability and preferred panel types can guide architectural surface paneling. | Account for local curvature when choosing recess depth, and avoid treating arbitrary offset shells as automatically valid. Aether does not implement the B-spline optimization or certify manufacturability. |

The published research provides complementary modeling ideas. The sci-fi detailing, semantic field rules and bounded module recipes below are our own design decisions, rather than outputs copied from those papers.

## Implemented now

`city/grammar.js` is a pure deterministic compiler. It produces a serializable intermediate representation (IR) before any renderer is involved.

* Twenty composition rules. The twelve connected-wing rules are: enclosed court, horseshoe, elbow, cross, parallel wings, comb, terraces, terraced pyramid, twin towers, triad, raised-corner perimeter and blade/core. Wing widths, shoulders, terrace runs, height cuts and rotation vary within compatible rules.
* Eight additional sculpted families: tapered orbital tower, ovoid spindle, lobed shell, swept crescent with rounded ends, open organic atrium, leaning sail, flared canopy and twisted trilobe. These use arc-length parameterized contours and elevation profiles, with explicit inner loops for the open atrium. Taper and twist have bounded UI controls.
* Integer columns share a floor grid. Union boundaries are determined by comparing neighbouring column heights. An adjoining wing removes the shared facade completely, and a terrace appears where a lower column meets a higher one. Open courts remain empty.
* Four facade composition layouts — clustered, ribbons, shielded and atrium — combine variable bay spans, double-height openings, narrow slits, tall viewports, panoramic glazing and solid armor. Access, mechanical floors and service spines reserve their regions before glazing is resolved. Each source cell has one panel owner.
* Six facade grammars: structural frame, ribbon, paired bays, solar fins, loggias and technical bands. Base, body, crown and mechanical zones share a stable building-wide rhythm.
* Six planetary construction profiles change floor height, window proportion, reveal depth, wall return depth, shading, roof treatment and material kit. The ocean profile has a taller solid foundation; it is not a stilt or flood-engineering simulation.
* Independent massing and facade seed streams. Changing a facade seed preserves the height field and rotation. Material maps and roof-equipment choices do not determine massing.
* A single street entrance is selected on an exposed ground-level wall; sculpted families select an exterior point on the outer contour. No entrance is placed high on an arbitrary wing.

`city/grammar-model.js` constructs the modules directly into shared buffers:

* Actual open wall rings, octagonal aperture chamfers, recessed returns, gasket rings and inset glazing. There is no closed opaque building shell behind the windows.
* Surface-following geometry uses bounded tessellation and analytical surface-derived shading normals. Uniform subdivisions across fan patches avoid cracks inside curved glazing and cladding. Aperture corner chamfers clamp to their available size, and recess depth is limited by local curvature.
* Chamfered armor cassettes, inset panels, access latches, cooling slots, raised service spines and clamps; annular roof cooling assemblies with radial blades, lips and technical powerpacks.
* Mullions, projecting sills, manufactured trims, cladding cassettes/inlays, structural pilasters, floor datums, solar brows/brackets, loggia guards, louvers, entry canopy and identity strip.
* Exposed roof decks, parapets, copings, planting cassettes, technical housings, slats and service risers. Shared roof edges do not receive parapets.
* Existing metre-scaled procedural PBR materials, with no downloaded texture set. Glazing uses the existing bounded shader room approximation; there are no modeled interior rooms.
* Two draw streams per building, for solid construction and glazing. Detail reduction preserves the same apertures and semantic bay choices. This is not yet the complete production near/mid/far/impostor pipeline.

`city/grammar-review.js` provides neutral/raking/overcast lighting, clay and wireframe inspection, a close-up camera, labeled curved, rectilinear or combined composition collections, independent seed controls and JSON recipe export. The recipe is for the native prototype; it is not interchangeable with the older Architecture Lab schema.

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

The geometry cases cover all 20 compositions in all six climates, cycling through six facade grammars and four facade layouts. Source-cell ownership is checked after grouping, as well as the presence of varied spans, double-height openings and protected opaque/service regions. Checks include finite vertices, nondegenerate triangles, unit normals, winding, bounded default-size complexity, aperture identity across detail levels, and rays passing through window apertures to the glazing before encountering opaque geometry. These are not a general proof that all ornamental parts are intersection-free: copings, canopy attachments and structural trim deliberately meet or intersect at joins.

`scripts/check-city-grammar.mjs` is an optional local WebGPU inspection harness, not screenshot CI. It captures a building, an aperture close-up, arid construction and the composition comparison; it also records console/device errors. Software GPU results do not establish hardware performance.

## Next engineering stages

1. **Approve a construction vocabulary by visual inspection.** Refine one civic, one industrial and one residential example at street distance. Evaluate large-scale silhouette, medium-scale structural rhythm and close-up fabrication separately. The new facade regions remove the uniform one-window-per-floor/bay pattern. More construction vocabularies, compound massing and art direction are still needed before replacing city assets.
2. **Make facade constraints editable.** Add span groups, protected entrances, mechanical shafts, material zones and corner policies to rule data. Reserve real space for windows and service equipment; keep attachment compatibility explicit. Export/import the native schema before exposing it as a production authoring format.
3. **Compose curved masses and explicit junctions.** Surface-following construction is implemented for the eight sculpted families, including smooth crescent end transitions. Next are multi-envelope unions, wing attachments, bounded curved/flat transitions and junction-specific trim. The current sculpted recipes have one continuous envelope, possibly with an inner loop; the rectilinear families remain unions of grounded columns.
4. **Expand structural composition.** Introduce a support/attachment graph for bridges, portals, transfer decks, branching towers and bounded cantilevers. Validate support paths, allowable spans and occupied-space conflicts. Do not represent these as unvalidated floating decoration.
5. **Add inhabited detail.** Procedural entrances with vestibules, service access, signage, drains, parapet joints, rooftop access, actual interior slices and street interfaces. Condition grime on those geometric features. More triangles alone are not a quality target.
6. **Integrate with the city pipeline.** Compile approved IR modules in workers; preserve zone attributes, shared materials, shadow geometry, LOD identities and impostor capture. Use module instancing where it materially reduces memory. Establish measured frame/memory budgets on a hardware GPU.
7. **Add district and planet orchestration.** City layout reserves parcels, roads, transit and civic space; district rules inherit a construction vocabulary; landmark exceptions alter massing deliberately. Seed streams separate planet, district, parcel, building, facade, module and surface decisions. Test skyline diversity and local coherence on actual city blocks.

All these stages can stay procedural and native to Aether. They require a richer authored rule library and careful visual validation, rather than a dependency on a DCC application.
