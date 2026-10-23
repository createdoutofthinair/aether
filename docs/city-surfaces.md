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
