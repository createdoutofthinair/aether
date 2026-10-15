# Local validation and evidence handoff

## What this session verified

Read [P0](00-current-state.md) and its raw evidence. Source parsing, all 30 existing test scripts, the inventory, three audit fixtures and eight HTTP endpoints passed. Shader pairs were exported but not locally compiled/linked; the exact baseline's CI shader step was verified successful through run/job metadata. No rendered Aether frame, movement recording, representative GPU timing or native packaged run was inspected.

The executable tools added in P0 do not operate the browser, capture screenshots or restore the removed capture UI/workflow.

## First local baseline run

Use the review branch in a separate checkout. From its root:

```sh
npm install --ignore-scripts --no-package-lock --no-audit --no-fund
npm run check
npm test
node scripts/rebuild-baseline.mjs > aether-local-baseline.json
node scripts/rebuild-http-smoke.mjs
npm run dev -- --host 127.0.0.1 --port 5173
```

The install command is the current audit-compatible setup because the repo has no lockfile. M0 must introduce an accepted reproducible dependency setup; do not call this a locked native build. The inventory records the execution environment separately and leaves target GPU/VRAM/driver unknown.

Open `http://127.0.0.1:5173/?view=terrain&altitude=20` in a browser with working hardware-accelerated WebGL2. Keep the default Nacre world, select High quality, exposure 1.1, and wait for loading to finish and nearby detail to settle. Record the actual wait duration and any errors. The query selects a known location/orientation and 25° sun.

Take one still with the normal local screen-capture workflow. Manually record approximately 20–30 seconds: slow forward movement, reverse, then a sideways movement. Use the same timings and controls in the repeat run. Record their durations. This is an approximate baseline route; it does not satisfy future exact camera-path acceptance.

Repeat at `?view=terrain&altitude=2`, `200`, `2000`, `75000`; each is above the same height-field target. Use `?view=outcrops&altitude=20` for the formation case and `?view=coast` for the coast. The coast finder selects a deterministic candidate for the current prepared height field and sets 28° sun. It does not force water onto a dry world. Record if no coast is available.

Use the existing Surface view selector for normals, drainage, soil/exposure, pixel footprint, snow and residency/overlay views as relevant. Restore the normal view before normal-image comparison.

For rover evidence, reload the default orbital entry `/`, choose **Land & explore**, wait for touchdown, then drive gently forward/reverse and turn while manually recording wheel/ground contact. The actual route is to be recorded from the run; this audit does not claim to have found a failing live boundary.

## Existing manual measurements

In browser developer tools after the explorer has loaded:

```js
planetExplorer.getState()
planetExplorer.performance()
planetExplorer.resetPerformance()
```

The existing **Export render measurements** button saves the same report as JSON. Record its browser/GPU identity, exact drawing-buffer size, quality, world/environment, camera and residency fields. Copy the JSON or use the button manually. Keep captures accessible to the reviewer (attached files or an agreed accessible location); a private dead path is insufficient.

Limitations of this baseline tool:

- The buffers retain the latest 600 frame/CPU/GPU samples, approximately 10 seconds at 60 Hz, not the complete 120-second route.
- E-P0-METRICS proves a pre-reset pending GPU query can enter a post-reset report. Until repaired, do not present resets as isolated timing sessions.
- RAF interval, app frame-body CPU duration and optional GPU elapsed-query results are different quantities. The report does not measure presentation latency or total device memory.
- Disjoint GPU results are discarded. Missing GPU-query support must be reported as unavailable, never as zero duration.
- The report lacks complete route orientation/simulation-time/build identity. Add identity from the checkout and case manifest. Exact replay and full-run timing are M0 work.
- Capture changes timing. Record capture-off timing separately, and mark baseline statistics as limited rather than accepting R10 from them.

## Hardware information required for the next gate

Supply the actual OS/version, GPU model and dedicated VRAM, driver, CPU, RAM, intended resolution/refresh and SSD/free-space budget. Distinguish the development machine from the minimum supported machine. The agent container is not the target computer.

Fill [local-review-template.json](evidence/local-review-template.json), add the actual measurement export and still/movement evidence, and record observations separately from causes. Unknown fields remain null. No evidence exists merely because a template was filled with a hoped-for result.

## Evidence states

Track implementation (`not started`, `in progress`, `implemented`), functional/visual/performance validation (`not run`, `pass`, `fail`, `blocked`; `not applicable` with a reason), and acceptance (`open`, `accepted`, `rejected`) separately. Rendering-related acceptance requires relevant real-frame evidence. Temporal acceptance requires motion evidence. Performance acceptance requires the named target and measured complete run.

The P0 tools are accepted for their read-only inventory/fixture/service scope. Their pass status does not accept the rendered planetary system. Synthetic values in the metric fixture cannot become hardware measurements.

## Native M0 validation requirements

After P2 and P3, M0 must deliver a locked build and packaged development application, a calibrated material/sloped-surface/light/contact scene, deterministic identity/settings/time and a manually initiated saved route. Use the selected engine's profiler. Export raw complete-run samples, GPU-query validity, resource counters and capture conditions.

Verify stationary rebase, moving rebase, actual terrain/collision discrepancy, history reset, cold/warm launch and repeated scene reload. Define the percentile method, sample inclusion and hitch policy before reading results. No automated screenshot UI or screenshot CI is part of this workflow.

Local shader check, when the compiler is available:

```sh
node scripts/export-shaders.mjs /tmp/aether-shaders
node scripts/check-shaders.mjs /tmp/aether-shaders
```

The existing CI workflow specifies this check. The command establishes program linking/sampler limits; visual quality remains a separate gate.
