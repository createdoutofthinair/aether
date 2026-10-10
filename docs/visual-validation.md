# Visual and GPU validation

## GitHub screenshots

Open Actions → Visual validation → the run for your commit → Artifacts → `aether-visual-<commit>`. Download the ZIP and open `index.html` for a screenshot gallery and timing table. PNGs are named by profile, route and simulation checkpoint. JSON includes browser/GPU identity, frame/CPU/GPU p50/p95/p99, draw calls summed over all passes, resource counts, and material/cache state. The artifact also includes a Playwright HTML report and errors. Failed runs upload partial evidence. Artifacts expire after 30 days.

CI uses SwiftShader software rendering deliberately at 640 × 360 and a 0.1-second simulation step to bound its cost; local hardware routes use 1/60-second steps. Screenshots share camera checkpoint positions, but fluid evolution can differ between these step sizes. CI timings are not hardware benchmarks. This harness checks render errors and captures evidence; it does not claim photorealism or automatically compare unapproved baselines.

## Run on your GPU

```sh
npm ci
npx playwright install chromium
HEADED=1 npm run validate:visual
```

Check the GPU renderer in the JSON for SwiftShader, llvmpipe or other software rendering before treating timings as hardware evidence. If timer queries are unavailable, GPU measurements are null rather than substitutes. Run at the default 1280 × 720 resolution and DPR 1 for comparisons; record device, power mode and browser version. Browser automation cannot guarantee hardware acceleration.

Alternatively open the site on your normal browser, then World settings → Run visual validation. Keep the tab foregrounded until completion. It downloads one JSON containing measurements and embedded PNG screenshots. This run uses your current viewport and DPR; the report records drawing-buffer dimensions. The run changes the active world and ends on the airless profile; reload to return to the default world.

## Review

- Ground/orbit: seams, flickering edges, patch popping and material transitions on ascent and descent.
- Ground camera movement: texture shimmer, shadow aliasing and embedded/floating rock geometry.
- Coast: sheet/spray scale, intersections, foam continuity and wet-sand transitions. Only temperate profile has a liquid-water coastal route; other profiles explicitly skip it.
- Profile switching: stale masks, wrong material pages and unexpected browser errors.
- Performance: compare p95/p99 as well as p50. A 60 FPS target has 16.7 ms per frame. Reports use a bounded 36,000-sample window and fixed-step simulation; wall-clock intervals remain real measurements. Screenshot encoding can affect adjacent intervals, so use a separate sustained interactive diagnostics run for final performance acceptance.

The route is camera-only, not a rover physics test. Full acceptance additionally needs manual rover/contact checks, authored-layer editing/removal, cold versus warm loads, long movement sessions, and at least one integrated and one discrete GPU. Automated screenshots need visual review before approving image baselines. No image-diff thresholds are currently enforced.
