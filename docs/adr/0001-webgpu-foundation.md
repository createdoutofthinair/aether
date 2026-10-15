# ADR 0001: preserve the WebGL renderer while extracting the planetary domain

Date: 15 October 2026. Baseline: `98ab6421283d52e72191d130644df09f56b1d836`.

## Decision

Keep the pinned Three.js r186 vendored WebGL modules and matching loaders/decoder files for this increment. Pin their bytes with `scripts/vendor-manifest.json`, retain the MIT license, lock Vite dependencies and verify integrity at build time. Do not upgrade Three.js or add WebGPU modules before the compatibility spike in Phase 3. A future release selection must include a coherent WebGPU/TSL/addon set; this WebGL foundation is not that selection.

Extract world state, numeric terrain/coordinate queries and wheel support/clearance into `src/domain`. Numeric terrain receives cached-field readers as injected dependencies; it owns neither GPU resources nor workers. `dist/terrain.js` remains the legacy Three.js geometry/LOD adapter and converts domain vectors to Three.js vectors. `dist/world.js` re-exports one canonical domain state, including for versioned legacy imports. `dist/grounding.js` delegates clearance mathematics to the plain-data contact module.

`npm run build` verifies vendor hashes and copies authoritative domain sources to `dist/domain`. Generated copies are currently tracked to preserve the static legacy deployment. CI rebuilds them before checking/testing and again on the deployment checkout. This is an incremental source foundation, not a Vite bundle conversion: browser imports, relative workers, compressed assets and the existing UI remain in the static layout. The source-copy approach avoids changing asset URLs and decoder behavior during numerical extraction.

## Contracts

Coordinates are double-precision JavaScript numbers. Radius/elevation/contact clearance are metres; the existing planet radius is 60,000 m. Domain vectors provide numeric arithmetic only. Renderer vectors and matrices are created by the adapter. Continuous terrain queries share the same equations as before extraction. Rendered LOD triangle sampling remains in the geometry adapter and is supplied to wheel-clearance calculations as a reader. Moving triangle intersection and full rover state into pure simulation is still a later task; no claim of full physics extraction is made.

Material workers and cached terrain fields retain existing payloads and epoch rules in this increment. Full immutable tile/material schemas and the renderer backend contract are not implemented yet.

## Evidence and limits

A fixture captured from the original tracked modules with the actual versioned application world-state imports contains 45 height/normal cases across five planet settings and six cube faces plus landing-region positions. The renderer-free domain matches heights to 1e-9 m and normals to 1e-10 components for these cases. Existing terrain/contact, erosion, material, coastal and worker regressions are retained. A deployed-module traversal checks relative imports and worker URLs under `/aether/`. No screenshot tooling is included.

Reference-device frame times, GPU allocation peaks and manual visual comparison remain pending. Extraction introduces vector adaptation on the legacy call boundary; CPU allocation/performance effects require measurement on the target device. Do not infer performance parity from numerical equivalence.

## Ownership and rollout

This safe foundation can land on main with WebGL unchanged. GPU-specific implementation will use a migration branch/opt-in backend until accepted. Every renderer-owned allocation needs lifecycle accounting before the default switch. Revert this foundation commit to restore the previous static modules if a regression appears; preserve unrelated user assets.
