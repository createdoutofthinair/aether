# Unified material designer

Open `#/materials` in Aether. Design, Statistics and Publish & export share one graph and preview. React 19 and React Flow are pinned and bundled locally; no CDN or third-party service is required by the editor.

## Authoring

The hierarchical browser combines building finishes, spacecraft coatings, procedural growth, existing terrain scans, asphalt/paving, composite starters, published catalog zones and device-saved graphs. Search filters the hierarchy. Click a source to start a graph; its `+` inserts it into the current graph. Save under slash-separated folder names to organize materials. Saved graphs and imported pack bytes live in IndexedDB.

The typed graph supports source surfaces, procedural masks, finish adjustments, weathering, blends and a single PBR output. Connections carry surface or mask values; validation rejects cycles, incompatible ports and multiple connections to an input. Only the reachable output subgraph is evaluated. Moving nodes and changing the material name do not invalidate pixel identity. Undo/redo includes wiring and parameter edits.

The preview supports a panel, sphere and block; beauty and map channels; daylight and grazing light. Height is physical relief in the shared PBR shader, not replacement geometry. Bitmap imports accept color, tangent normal, roughness, metalness, AO and height. Existing building JSON, hull JSON with embedded maps, terrain mix JSON, graph JSON and `.amp` imports are supported. A legacy upward-facing terrain mask becomes a canonical UV-height band because a texture bake has no mesh orientation.

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
