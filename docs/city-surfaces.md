# Procedural architectural surfaces

The city and Architecture Lab use a city-specific finish baker, rather than the
spacecraft baker. Surface Workshop (`city-surfaces.html`, linked from Architecture
Lab) places an actual production-worker building module beside street materials.
It runs WebGPU and supports neutral/grazing light, finish palettes, environment,
seed, weathering, coating roughness and panel variation. Geometry bench remains
an independent WebGL diagnostic; the engine has no WebGL fallback.

## Mapping and sampling

* Building UV0 stores metres. Loft walls use contour arc length/elevation; caps
  use planar metres. Facade overlays retain contour/elevation origins. Box and
  beam parts use their physical dimensions. Glazing retains its room UVs.
* Building UV1 has four components: finish zone, deposition exposure, coating
  roughness offset and seeded finish variation. This reuses the existing stream;
  the actual instanced building shader needs six vertex buffers, below the
  guaranteed WebGPU limit of eight. Roughness offsets preserve custom recipe
  choices when all city prototypes share one canonical material.
* Eight 512 px finish cells pack into one 2048 × 1024 atlas. Each cell has a
  periodic guard around a 384 px usable region, repeating over two metres
  (192 base texels/metre). Increasing tower height no longer stretches a tile.
* All three PBR maps use the same fragment coordinates. Explicit gradients are
  taken before wrapping coordinates, preventing mip blur at each repeat seam.
  Independent cell mip chains preserve material boundaries and transfer unresolved
  normal variance into roughness. Base colour is sRGB; data maps are linear.
* The worker payload carries a versioned `citySurface` material descriptor. Maps,
  metadata and UV streams reach both WebGPU and the WebGL diagnostic material.
  Distant impostor albedo captures reuse the metric surface node before
  per-instance debug colouring; they do not fall back to the old map UVs.
  Existing spacecraft payloads and their surface mapping are unchanged.

## Finish hierarchy

Quiet coated panels have shallow chamfered service-panel seams, corner fasteners,
small edge chips and mostly roughness-driven grain. Physical height fields create
normals; the same seam and wear masks affect albedo, AO, roughness and metalness.
Intact paint is dielectric. Exposed structural alloy uses its own finish. Mineral
bases and service metal have separate recipes. Deep recesses and silhouette edges
continue to use geometry; normal maps are not a substitute for plate thickness.

Module seeds produce restrained finish shifts. Per-panel finish variation and
coating roughness are editable and saved with the recipe. Weathering combines
baked seam deposits, a bounded runoff field, geometry-tagged ledge exposure and
base splash. Planet profiles select deposit colours. These are procedural art
rules, not a fluid or corrosion simulation.

## Streets

The network shares a separate small PBR atlas for aggregate and half-metre paving.
World XZ projection keeps texture scale independent of segment length, rotation
and instance scale. Straight roads carry a per-instance width/length stream for
edge deposits and wheel-track roughness. Circular roads use the common surface
finish without straight-road track masks. Lane markings are dashed geometry. Seeded repair patches interrupt old asphalt;
instanced gutter inlets have physical grille bars.
Street weathering follows the City's service-age control. Asphalt, pavement and
building finishes have different roughness/normal behaviour.

## Verification

`npm run check` and `npm test` include the city surface contract tests:
determinism, periodic colour/data/normal guards, unit normals, dielectric paint,
12 m versus 120 m metric UVs, worker metadata round trips, three-map sharing and
building/road/paving WGSL generation. Existing city tests cover all 24 families,
48 prototypes, three LODs, clipping, buffer limits and all four street layouts.

Optional manual visual review (not screenshot CI):

* `scripts/check-city-surfaces.mjs`: module, street close-up, grazing light, wear.
* `scripts/check-city-webgl.mjs`: 24-family contact sheet and diagnostics.
* `scripts/check-city-scene.mjs`: production instancing, shadows and GTAO.

Supply the existing Playwright and Chromium paths using the documented environment
variables in those scripts. Software-GPU inspection validates rendering, not
hardware frame times. Street-level comparisons remain necessary; distant city
screenshots cannot establish material fidelity. Fine decals, climate-specific
physical deposits, junction-specific wear and additional modeled trim/plate
assemblies remain separate improvements.

Implementation reference: [Three.js TSL](https://threejs.org/docs/pages/TSL.html).

## Native sculpted building finish review

The native grammar bench (`city-grammar.html`) now emits component-local metric
UV charts before bending the facade. Chart axes no longer depend on a triangle's
world-space normal. A curved panel can cross the old projection threshold without
rotating its texture; crown segments also account for their actual metre length.
The chart scale is measured at each panel's centre, so strong curvature still has
bounded local distortion rather than a global, perfectly isometric unwrap.

This bench opts into 1024² tiles (768² useful texels per guarded 2 m repeat),
with smooth periodic contamination fields varying coating roughness and shallow
height. The shared production-city defaults stay at 512². Albedo remains quiet;
normal, roughness, dielectric/metal zoning and occlusion carry the finish.
ORM alpha stores `.5 + heightMetres * 40`. The native shader uses two explicit-
gradient height lookups for bounded parallax offset mapping, capped at grazing
angles. This is shallow relief shading, not displacement or ray-marched POM.
Openings, reveals, armor cassettes and frame depth remain actual mesh geometry.

Lighting uses a less dominant ambient fill, 4096² filtered sun shadows, and
half-resolution denoised GTAO for local contact. Inspection renders at 1.5–2.5
physical pixels per CSS pixel; Balanced follows device resolution up to 1.5.
Both use FXAA after the tone-map/output transform, with a single-sample scene
pass so depth-dependent AO has a compatible depth texture. The renderer's canvas
antialias flag is not counted as scene MSAA in this post-processing path.
See the [Three.js RenderPipeline documentation](https://threejs.org/docs/pages/RenderPipeline.html)
for the output-transform boundary and [TSL accessors](https://threejs.org/docs/pages/TSL.html)
for tangent-space parallax direction. Exposure, relief, contact occlusion and
resolution are independently inspectable. GPU timing on software Vulkan is not
a hardware performance benchmark.

Regression checks exercise continuous metric UVs across duplicated curved-panel
vertices, packed physical height bounds, deterministic refined finishes and WGSL
compilation with relief enabled. `scripts/check-city-grammar.mjs` remains an
optional local WebGPU visual inspection, including facade, street, relief-off,
Balanced, planetary, clay and gallery views; it is not screenshot CI.

## Building Material Designer

`city-materials.html` uses the native building renderer and a specialized recipe,
`aether.building-material/1`. Eight independently editable finish zones select
ceramic, mineral concrete, brushed aluminum, coated steel, basalt or composite.
The shared default is lightly inhabited/weathered. New, industrial, coastal and
arid histories initialize different weathering/exposure combinations; users can
then tune every zone independently. The designer offers a real 2 m beveled panel,
full building, facade and street views. Material changes preserve the camera.

All inputs are procedural; physical shading is retained. No photos, scanned
materials, downloaded PBR packs or Blender are needed. The implemented layers are:

| Layer | Formula / placement | Coupled outputs |
| --- | --- | --- |
| Manufacturing | Periodic quintic gradient noise, four-octave fBm, low-frequency coordinate warp, seeded panel variation | Base color, roughness, shallow height |
| Microstructure | Anisotropic noise for aluminum; thresholded pores for mineral surfaces | Height-derived normals, roughness, cavity AO |
| Joints / chips | Metric joint distance and bevel fields, broken by meso-scale noise and service age | Coating loss, exposed substrate, relief, color |
| Oxidation | Exposed-metal mask × age × oxide field | Roughness, substrate color, reduced metalness |
| Runoff / deposits | Sparse jittered joint sources, tapered Gaussian trails and finite downstream decay | Grime, deposit masks, color, roughness, small height |
| Building exposure | World-space noise stretched along gravity; normal orientation and ground-height bands | Long streaks, horizontal dust, lower-wall film, patchy wetness |

Coated steel is dielectric until its coating is removed. Bare aluminum is metallic;
its oxide is pale, whereas exposed steel can receive an orange/brown oxide.
Ceramic, concrete, basalt, dirt and deposits remain dielectric. Wet patches darken
base color and reduce roughness together. Layer colors are blended in linear
light and encoded to sRGB only for the base-color texture. Height stays in metres,
with relief bounded to ±11 mm; normal maps come from central differences of that
same height field. This is an appearance model: geometric edge curvature,
mesh-aware flow/transport, deep erosion and subsurface volume changes are not
simulated. The large openings and recesses remain geometry.

Gradient noise uses the C2 quintic fade `6t⁵ − 15t⁴ + 10t³`. Frequencies fade
smoothly toward their mean as they approach the source texel footprint; fBm detail
is not blindly sampled above source resolution. The atlas retains periodic guard
bands, independent cell mip chains, normal-variance roughness filtering and
pre-wrap shader derivatives. A second world-space noise layer prevents all
weathering from repeating every two metres. Its masks follow gravity and the
surface normal rather than facade UV orientation.

Baking runs in a cancellable module worker with progress and transferable buffers.
The main thread creates the shared atlas after synthesis; it does not evaluate
multi-octave procedural fields every animation frame. Runtime world exposure adds
two low-frequency MaterialX noise evaluations per shaded fragment. Resolution is
512² or 1024² per zone, packing into a 2048×1024 or 4096×2048 atlas, respectively.
All building finish zones still share three GPU maps. Higher resolution increases
bake time, upload cost and memory use; no hardware frame-rate claim is made.

The inspector displays lit finish, base color, normal, roughness, metalness,
contrast-enhanced height or cavity AO. Debug channels still pass through display
transforms; the exported PNGs contain the unlit data. The ZIP material pack contains
separate base-color, normal, AO, roughness, metalness and height maps, packed surface
and layer masks, the complete recipe and encoding notes. Packed alpha is data,
not opacity. Saving a recipe applies it to the Native Building Lab on reload;
legacy city/production material defaults remain separate until integrated there.

### Research used and implementation boundaries

* [Ken Perlin, Improving Noise / reference implementation (2002)](https://cs.nyu.edu/~perlin/noise/): smooth gradient noise and quintic interpolation. Our periodic seeded 2D implementation uses hashed gradients rather than the reference permutation table.
* [PBRT, Noise](https://pbr-book.org/3ed-2018/Texture/Noise): multiscale noise, coordinate perturbation and filtering frequencies to the sampling footprint. Our baker uses a resolution-based cutoff, followed by atlas mip filtering.
* [Dorsey, Pedersen and Hanrahan, Flow and Changes in Appearance (1996)](https://graphics.stanford.edu/papers/flow/): directional weathering and deposition motivated the appearance masks. We do not implement the paper's particle flow or coupled differential equations.
* [Dorsey and Hanrahan, Modeling and Rendering of Metallic Patinas (1996)](https://graphics.stanford.edu/papers/patina/): coat/erode/deposit layers motivated our correlated substrate and oxide masks. Reflectance uses the renderer's existing microfacet model, not that paper's complete layered reflectance solver.
* [Burley, Physically-Based Shading at Disney (2012)](https://www.disneyanimation.com/publications/physically-based-shading-at-disney/): artist-facing material parameters and consistent physical shading informed the controls. The renderer uses Three.js's existing BRDF; this is not a new implementation of Disney's full model.

`test-city-building-materials.mjs` checks repeat continuity, physical height bounds,
normal lengths, deterministic recipes, coupled wetness, coating loss, six finish
profiles, input validation, ZIP CRC32 and weather/inspection WGSL. The optional
local `check-city-materials.mjs` checks real WebGPU views, editing, channels,
512/1024 baking, JSON/ZIP downloads and saved finish reuse. It is not screenshot CI.
