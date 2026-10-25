# Unified material designer

Open `#/materials` in Aether. Design, Statistics and Publish & export share one graph and preview. React 19 and React Flow are pinned and bundled locally; no CDN or third-party service is required by the editor.

## Authoring

The hierarchical browser combines building finishes, spacecraft coatings, procedural growth, existing terrain scans, asphalt/paving, composite starters, published catalog zones and device-saved graphs. Search filters the hierarchy. Click a source to start a graph; its `+` inserts it into the current graph. Save under slash-separated folder names to organize materials. Saved graphs and imported pack bytes live in IndexedDB.

The typed graph supports source surfaces, procedural masks, finish adjustments, weathering, blends and a single PBR output. Connections carry surface or mask values; validation rejects cycles, incompatible ports and multiple connections to an input. Only the reachable output subgraph is evaluated. Moving nodes and changing the material name do not invalidate pixel identity. Undo/redo includes wiring and parameter edits.

The preview supports a panel, sphere, block and assembled facade; beauty and map channels; daylight and grazing light. Height is physical relief in the shared PBR shader, not replacement geometry. Bitmap imports accept color, tangent normal, roughness, metalness, AO and height. Existing building JSON, hull JSON with embedded maps, terrain mix JSON, graph JSON and `.amp` imports are supported. A legacy upward-facing terrain mask becomes a canonical UV-height band because a texture bake has no mesh orientation.

## Visual workflow

The default building graph opens as eight visible tiles: substrate, panel structure, coating, chips/oxidation, joint dirt, rain streaks, deposits/wetness and PBR output. Compact building library sources retain an **Expand 6 material stages** action. Expansion preserves all final recipe fields and maps exactly. Each building stage changes a part of the shared recipe and recomputes the coupled building model; it is not a disconnected screenshot or a generic paint overlay. Stage controls can be edited, bypassed and reordered. A stage requires a building generator upstream.

Every connected workflow tile shows a cropped intermediate image with its own color/normal/roughness/height/AO/metalness selector. Damage, dirt, runoff, deposits and blends also expose their actual placement masks. Noise nodes show grayscale mask images. Unconnected inputs show an explicit connection prompt. Click a tile to inspect its intermediate result on the WebGPU object, or use its arrow to inspect the selected map. **Pin final output** keeps the production result visible while editing another node. **Compare** shows the selected stage beside the final output. Inspection never replaces the graph or its export payload.

Authoring images use a separate worker and bounded content-addressed caches: a 64² draft after 120 ms, a 128² refinement after 850 ms without edits. Obsolete graph jobs are canceled between nodes and stale responses are ignored. Moving nodes does not regenerate images. Library thumbnails are generated lazily as entries enter the visible browser area. These CPU authoring previews do not read back production GPU buffers.

The **Layers** browser tab exposes reachable surfaces and effects with thumbnails, selection, bypass and adjacent-effect reorder controls; blend amount stays in the inspector. Favorites and recently used filters are saved on device. The output inspector and export page display all six map channels, physical scale, production resolution and measured map memory.

Statistics also lists low-resolution CPU preview evaluation/reuse for each workflow stage, explicitly separate from the production CPU/GPU/download measurements. These authoring timings are not per-node GPU timings and are not used as delivery-policy recommendations.

## Producers and delivery

Building sources use the existing dedicated GPU kernels. Procedural growth, masks, finish, weather and blending have GPU kernels and CPU reference implementations. Hull coatings, photographed terrain, urban surfaces and imported bitmaps are produced or decoded in a worker before GPU composition: these executions are explicitly marked **hybrid**. The graph is a supported node vocabulary, not an arbitrary shader programming language.

Color blends in linear light; roughness blends as squared roughness; normals are normalized; surface alpha carries encoded physical height. GPU results copy directly into preview textures. Readback is deferred until export. The CPU worker produces the same runtime map contract.

Statistics stores the last 400 real measurements on the device. Groups include graph signature, resolution, adapter, backend and cold/warm/cache state. Median, nearest-rank P90, sample count, source work, upload/frame time, map memory and actual downloaded bytes are visible. Published catalog payloads contain eight zones; single-material generation contains one: the UI reports zone count rather than pretending these have equal payload scope. Measurements are local observations, not universal hardware benchmarks.

Auto downloads an available native-resolution published pack on a cold session. It considers matching warm GPU measurements against the chosen time budget once the kernel is warm. Other editable graphs generate on the GPU or hybrid path. CPU is available explicitly for comparison. Network estimates are never invented for unpublished graphs. Clearing statistics does not delete saved materials.

## Exports and integration

- Graph JSON preserves editable sources, settings and connections. Embedded images travel with the graph; imported local pack references require their corresponding `.amp` assets on the receiving device.
- `.amp` stores color, tangent normal and ORM plus height, filtered mipmaps, guards and graph metadata using `aether.material-pack/1`. The selected catalog zone is extracted to a standalone material.
- PNG ZIP includes individual channels, packed surface, graph JSON and the runtime pack. PNGs crop the guarded border and use conventional bottom-left UV orientation, OpenGL +Y normals, sRGB color and linear data maps. A byte-preserving encoder avoids alpha premultiplication corrupting height. Height metres = `(byte / 255 - .5) / 40`.
- A compatible building graph can apply its recipe to the Native Building Lab. A source hull can apply its recipe to Shipyard. Arbitrary composite packs are exported assets; saving a graph does not silently publish it to a live scene.

The old building finish, surface workshop and production URLs redirect to this workspace. `?legacy=1` keeps the original diagnostic tools accessible. `#/materials?tab=statistics` opens delivery measurements directly. Existing catalog generation and CI packaging remain the production pack pipeline; see [MATERIAL-PRODUCTION.md](MATERIAL-PRODUCTION.md).

## Validation

`node scripts/test-city-material-studio.mjs` covers graph validation, deterministic pixel identity, source producers, blend math, normals, PNG byte preservation and statistics grouping. `npm run build` creates the pinned React bundle and license notices; `npm run check` checks runtime JavaScript. `scripts/check-material-studio.mjs` is an optional local Playwright/WebGPU visual bench, not a screenshot CI job. Software Vulkan results verify behavior and pixel parity, not consumer GPU performance.

## Shared surface environment

Building rendering now uses a separate spatial layer over the exported PBR maps. Select **Assembled facade** and use **Non-repeating detail / shared weather** for comparison, or open `#/surface-environment` for the larger bench. The native building and city/street shaders use the same environment functions. Exported map pixels remain independent of the test scene.

For architectural materials with known panel spacing, correlated stochastic sampling varies color, normal and ORM/height together inside panels. Source rectangles exclude joints, smooth mirror derivatives handle normal reflection while architectural sampling preserves the vertical direction of rain trails, and height-biased weights avoid a broad muddy crossfade. The original joint region stays aligned. As a result, reusable panel interiors can vary while preserving construction logic. Unstructured asphalt uses whole-tile sampling; paving preserves its grid.

A shared 256² prebuilt neutral signal supplies triplanar stochastic fine detail. Broad 3D fields modulate color, roughness, wetness and deposition continuously in world coordinates. A surface-gradient perturbation adds the scalar detail height over the existing normal. Pixel footprint smoothly reduces detail; the extra nine packed detail samples are skipped when that layer becomes invisible. Interior stochastic sampling adds nine PBR texture lookups where enabled (it still samples lower mips at distance). These are shader costs, not material-generation timings. The shared detail signal consumes about 0.33 MiB including GPU mipmaps, independent of building count.

The Native Building Lab derives a bounded set of runoff sources, repairs, shelter bounds and foundation contacts from its construction grammar. Those masks are evaluated in building coordinates and rotated into world coordinates for the ground. Generic instanced city prototypes receive stochastic material sampling, semantic ledge wear, climate-consistent broad weather and detail; they do not yet receive a unique geometry-aware drainage solution per city instance. The assembled bench has explicit construction anchors matching its ledge, drain, repair and wall footprints.

Shelter boxes and gravity-decaying runoff are appearance approximations, not ray-traced exposure or fluid transport. Parallax retains the structural height field; the added fine detail changes shading rather than silhouette. Source resolution, geometry, lighting and art direction still govern the final realism.

The detail signal is generated at build time by `scripts/build-city-detail.mjs`, packaged with CI artifacts, decoded once and shared at runtime. It does not require per-building CPU synthesis, GPU readback, extra city vertex streams or per-building detail textures.

Technical references: [Practical Real-Time Hex-Tiling](https://jcgt.org/published/0011/03/05/), [Unity stochastic texturing](https://unity.com/blog/engine-platform/procedural-stochastic-texturing-in-unity), and [Epic world-aligned mapping / HeightLerp](https://dev.epicgames.com/documentation/unreal-engine/texturing-material-functions-in-unreal-engine). This is Aether's implementation of the applicable ideas, not a bundled Unity or Unreal renderer.

### Metropolis runtime

Metropolis enables **Native curved buildings / lobed shells** by default. Eight compatible families use the Native Building Lab's curved grammar, including petal and helix shells. Saved Architecture Lab recipes retain priority. Full construction appears nearby; intermediate meshes use the same envelope with lightweight glazing; closed far meshes retain lobes, courtyards and twist. Parcel sizing uses sampled native silhouettes rather than the previous generator's footprint.

Building finishes now use WebGPU compute at 1024² per zone, including filtered mipmaps, followed by direct GPU buffer-to-texture copies. The geometry worker sends only 8² constant bootstrap maps, without procedural pixel synthesis. Streets use a dedicated GPU compute kernel for asphalt/paving, GPU normals and filtered mipmaps. Geometry topology is still built in a worker. Directional impostors use GPU raster captures; GPU coverage reduction reads back only 25 counters (100 bytes), rather than the full atlas.

Impostor captures yield to city frames between views and skip unused prototypes. Only visible buildings approaching the distant LOD request captures; nearby city views do not wait for an entire prototype atlas library. Captures use 128² tiles and depth-based ray reprojection without experimental fragment depth. Meshes remain active until roughly ten pixels high. Stationary cameras no longer trigger repeated visibility sorting and instance uploads; changed buckets upload only their populated ranges. Measurement exports include layout/geometry/texture timing, time to the first city, accumulated impostor preparation time and slow-frame counts. These measurements are specific to the device, viewport and selected city.


### Metropolis edge and shadow quality

The postprocessing scene target uses four MSAA samples. SMAA filters edges in linear color before output conversion, including when AO is disabled. GTAO's 2×2 depth selection uses explicit depth loads rather than an invalid `textureGather` on a WebGPU multisampled depth texture.

City impostors use multisampled captures, per-view GPU mipmaps (stopping at one texel per view), derivative-selected mip levels with frame-safe sampling insets, and smoothly blended alpha-to-coverage. Frame mipmaps never average neighbouring views together. Forest defaults retain their existing conservative coverage policy.

Near detailed buildings cast their own shadows and are excluded from coarse proxy casting. Offscreen/distant casters retain proxies. CSM already snaps to shadow texels; fixed ranges now avoid camera-driven range repartitioning. City splits emphasize near detail, inspection uses uniform splits, and a fixed nine-tap tent comparison filter replaces the screen-rotated stochastic PCF pattern. Balanced shadows use three 2048² maps; High uses four. These are raster techniques, not hardware ray tracing. Actual image quality and frame times still require validation on a supported adapter.
