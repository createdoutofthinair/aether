# Nature Studio: growth and surface improvement pass

22 October 2026. Replaces the first fixed-recursion tree study. Entry: DEV → Nature Studio. Changes are applied together to birch, oak and willow, with separate Wood, Trunk, Branch, Leaf and Full Tree inspection modes.

## Growth and silhouette

The generator combines species-conditioned scaffold rules with vacant-space attraction points, occupancy-based bud competition, local avoidance and survival decisions. Birch favors a narrower, leader-dominated crown; oak has broader scaffolds and weaker leader preference; willow has stronger order-dependent downward bending. Open-grown, woodland and windswept settings adjust the growth environment. Branch counts, survival, leaf counts and crown gaps vary with species and seed. This is a bounded hybrid inspired by the research below, not a full implementation of the cited physiological models.

Child origins and directions use the actual parent location and its local tangent/frame. Correlated growth curvature replaces independent five-piece bends. A bottom-up, exponent-2.35 support calculation derives radii, followed by a controlled terminal taper. Root flare is part of the skin, with a restrained asymmetric base. Height is normalized to total skeleton height, rather than trunk length; the physical leaf blades and root flare may extend slightly beyond it. Branch-only mode retains its independent length interpretation.

Bud suppression records potential healing scars. Short-lived shoots carry finer foliage while longer-lived structural wood is less densely leafed. Petioles originate at the twig surface rather than its centerline. Four seeded leaf/venation variants provide variation, and reservoir sampling preserves a distributed population when the 6,000-leaf authoring cap is reached. Single-leaf inspection uses a 1K map set; complete trees use four shared 512² sets.

## Continuous branch skin

A dedicated mesher sweeps smooth centerlines with transported frames and continuous longitudinal UV coordinates. It removes a patch from each parent at a fork, then joins the perimeter to the child sweep with shared collar vertices. Only actual branch tips and the root receive caps. This replaces independently capped cylinder sections.

There are three woody-geometry detail levels. Seam vertices may be duplicated for UVs, but normals are reconciled by geometric position. Tests weld those positions and verify that every edge occurs twice in opposite directions: closed, consistently oriented skins, including fork collars. These tests do not prove the absence of all self-intersections between distant limbs. The occupancy avoidance is heuristic, not a collision solver.

Circumferential texture repeats are integral to close the UV seam; longitudinal coordinates follow accumulated branch distance and blend through collars. Local angular scale is approximate at forks and on narrow branches. Healing scars add localized swelling and darkening. Anatomically exact knot rings and fully reconstructed branch collars remain outside this artistic model.

## Bark and lighting

The bark field now uses persistent warped fracture paths with wider primary fissures, finer cohorts and connecting breaks. Oak, pine and willow have different fracture density/color controls; birch retains pale bark with horizontal lenticel-like markings. End grain has perturbed rings, eccentricity and radial checks. This is a procedural fracture approximation, not a time-integrated bark mechanics solver.

Vertex age blends mature bark toward smoother young-shoot color, roughness and relief. Relief falls quadratically with bark maturity to avoid deep mature bark on thin twigs. Normal strength responds to texture scale. The selected botanical family initializes its corresponding bark preset, while the independent wood study still allows material experiments.

WebGPU lighting adds a PMREM environment, bounded 2048² directional self-shadowing and an optional receiving ground. Shadow bounds track the specimen rather than using a single world-scale map. Neutral clay and silhouette modes isolate formation from texture and lighting. Backlit/neutral/raking presets and map inspection remain available. Shadows can be disabled independently.

## Generation, LOD and lifecycle

Skeleton generation and all three branch skins run in a dedicated module worker. The worker retains a bounded four-entry skeleton cache, keyed by growth options. Leaf and wood map generation use independent workers. Stale generations are rejected by monotonically increasing job IDs. No growth, meshing, fracture generation or matrix rebuilding runs in the render loop.

Rendering uses static branch meshes and instanced foliage variants. Wind is a small GPU vertex deformation. Woody LOD and leaf LOD use projected-size estimates and hysteresis. These are whole-specimen detail decisions; they do not yet provide forest cell culling, canopy impostors or per-instance compute visibility. Transitions remain discrete. Wind displacement still uses an approximate undeformed normal basis; amplitudes are intentionally limited.

UI changes are debounced; inspection changes reuse the generated skeleton/skin payload. Replaced instance buffers, geometries, maps and materials are released, and page teardown terminates workers and disposes the environment/shadow resources. Versioned module URLs prevent mixing old and new worker payload contracts in existing browser caches.

## Validation

Automated coverage includes deterministic generation, different species topologies, physical-height bounds, surface petiole attachment, taper, normalized normals, triangle budgets, all three closed/oriented branch skins, worker payloads, repeatable bark maps, periodic bark fields and leaf variants. The repository build, syntax checks and full test suite are required before publication. CPU-generated skeleton/foliage projections and neutral branch-mesh inspection were used to review structure.

The cloud browser reports no WebGPU adapter. Consequently actual WGSL execution, rendered shadow quality and target-device frame rate cannot be certified in this environment. CPU authoring timings are not GPU performance measurements. A browser with WebGPU hardware acceleration is still needed for final aesthetic approval.

## Research basis

- Pałubicki et al., *Self-organizing tree models for image synthesis*: https://algorithmicbotany.org/papers/selforg.sig2009.html
- Runions et al., *Modeling Trees with a Space Colonization Algorithm*: https://algorithmicbotany.org/papers/colonization.egwnp2007.html
- Prusinkiewicz et al., *The Use of Positional Information in the Modeling of Plants*: https://algorithmicbotany.org/papers/positional.sig2001.html
- Lefebvre and Neyret, *Synthesizing Bark*: https://diglib.eg.org/items/5a93b66f-cd1b-4b36-af79-414174e04bf0
- SpeedTree branch welding and normal treatment: https://docs8.speedtree.com/modeler/doku.php?id=branch_generator
