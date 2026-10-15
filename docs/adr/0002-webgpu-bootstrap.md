# ADR 0002: isolated r186 WebGPU renderer preview

15 October 2026. The default explorer remains on the vendored WebGL renderer.

## Decision

Pin npm `three` to exactly `0.186.0`, matching the existing renderer revision. Build copies `three.core.js`, `three.webgpu.js`, `three.tsl.js` and the package license into a generated `dist/vendor-gpu` directory, with a generated hash manifest. Those dependency files are not tracked; both CI testing and Pages deployment install from the lockfile and rebuild them. The preview page imports only this coherent GPU package; it does not mix its scene objects with the legacy Three.js build.

Expose the preview as a separate workspace and `webgpu-preview.html`. WebGPU is preferred there; Three.js's WebGL2 backend can be selected explicitly or used automatically. Actual backend reporting uses the public `coordinateSystem` property after initialization, rather than treating `isWebGPURenderer` as evidence of GPU execution. The preview is not a replacement for the explorer.

## Implemented scope

The proof region samples the renderer-free continuous terrain domain into a local tangent frame, renders a basic node PBR material and uses explicit scene/tile epoch and origin checks. It has no eroded worker data, material pages, scan maps, shadows, atmosphere, water, LOD or rover. Its geometry therefore cannot establish parity with the complete explorer. The tessellation is fixed, not a completed terrain streaming port.

Control snapshots are immutable plain numeric records. Tile arrays have explicit producer/renderer ownership rather than misleading deep-freeze claims. BackendSession serializes replacement through generations, disposes stale initialization results and exposes ready/failed/disposed states. Each replacement uses a new canvas so WebGPU and WebGL contexts are not reused incompatibly.

Initialization is awaited before rendering. Device-loss/error handlers preserve the renderer's public default callbacks and ignore events from disposed instances. Visibility changes suspend rendering; resize updates camera and drawing buffer. Recovery recreates the preview, while a link returns to the supported explorer if both backends fail.

The measurement export reports frame interval distributions, actual backend, capability flags and a geometry allocation estimate. GPU timing is explicitly null: timestamp support alone is not a timing result. No screenshot capture or browser automation dependency has been added.

## Evidence / unresolved gate

Node tests cover immutable controls, invalid geometry, winding, origin/epoch mismatch, package revision and node-material construction, replacement cleanup, concurrent cancellation and initialization failure. The deployed module traversal covers preview modules and generated dependency imports under `/aether/`. Existing numerical/shader regressions remain required.

The current environment has no installed browser executable or representative GPU for runtime acceptance. Real-browser WebGPU initialization, actual fallback rendering, shader execution, device loss and visual appearance must be inspected by the user. Successful Node tests do not close that gate or demonstrate a GPU speedup.

GPU-specific work is opt-in. Keep a migration branch pointing at this milestone for the next geometry/material ports; the main explorer continues to use legacy rendering.
