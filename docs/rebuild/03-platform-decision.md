# P2: provisional platform decision and experiments

Status: **research completed for this first comparison; final choice blocked by hardware and a packaged runtime-terrain experiment**. No native renderer was built or GPU benchmarked in this session.

## Current recommendation

Test **Unreal with C++** first for time to a verified reference-world image and maintainability. This is an engineering judgment from the desired scope and the renderer/tooling work involved, not a benchmark result. Keep custom Rust/wgpu and C++ paths as alternatives if Unreal's runtime planetary constraints impose unacceptable compromises.

The retrieved Epic documentation identifies itself as Unreal 5.8 documentation. That identifies the research snapshot, not an installed build or accepted patch version. Select and record the exact available engine patch, compiler, plugins and source revision on the target machine before experiment results become a decision.

## Important incompatibility to resolve

Epic's [Geometry Scripting guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/geometry-scripting-users-guide-in-unreal-engine) describes runtime edits to `UDynamicMeshComponent`, but states that Nanite and Lumen are unsupported on that component. It also lists missing mesh distance fields, automatic LOD and instancing. Geometry Scripting is marked Beta in the retrieved page.

Consequently, an architecture promising runtime spherical DynamicMesh terrain plus Nanite/Lumen quality cannot be accepted from feature names alone. Test a viable cooked/runtime hybrid or another proven geometry/lighting path in a packaged application, and explicitly account for arbitrary seeds and edits. Converting a mesh in an editor does not prove conversion support in a shipping runtime.

Epic's [Nanite overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine) discusses import/build processing, constrained deformation and runtime material displacement. This does not establish arbitrary runtime topology creation. Its documented morph-target limit also means Aether's existing CPU morph approach cannot simply be assumed compatible.

[Large-coordinate rendering documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/large-world-coordinates-rendering-in-unreal-engine-5) describes DoubleFloat and translated coordinates. The actual selected engine/shader/particle/physics paths still need a body-region-frame experiment. [Nanite Foliage](https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-foliage) is marked Experimental; choose a proven fallback for required vegetation quality.

## Comparison

| Candidate | Work that could be reused | Work and uncertainty that remain |
| --- | --- | --- |
| Unreal + C++ | Established renderer, editor, asset import/cook and profiler workflows; current assets/data/fixtures can inform adapters | Runtime spherical terrain with acceptable lighting/shadows, arbitrary seeds, body frames/gravity, collision streams and package behavior |
| Rust + wgpu | Portable graphics layer; native and optional browser scope; current numerical/data concepts | Full renderer, material/asset tools, temporal/lighting systems, physics integration, streaming and packaging; language port and feature boundaries |
| Custom C++ + selected API/abstraction | Direct ownership; C++ numerical/core experiments possible here | Full graphics/editor/content/lifetime stack plus platform support; feature/API decision still needed |
| Current browser evolution | Existing app, authored sources, shaders, content and static distribution | Scale/contact/temporal/lighting/material integration and all vegetation work; representative GPU bottleneck unknown |

[wgpu's official project](https://wgpu.rs/) documents a native graphics/compute library and browser backends. Shared portability is an opportunity; actual native extensions and required shader/runtime behavior need explicit version and target checks. No Rust toolchain was available in this audit.

The current browser app uses WebGL2. A WebGPU migration is a separate shader/render-pipeline change; existing Three.js `onBeforeCompile` customizations are not already a native or WebGPU implementation. Recheck the exact selected Three.js renderer documentation if that candidate becomes primary.

## E-P2-UE-01: packaged spherical terrain and lighting proof

Owner: next native coding session on the actual target machine. Suggested model: Astra Max for design/review, Sol 6.1 Max for one bounded implementation. Status: **not implemented; execution blocked here by absent Unreal/target GPU**.

1. Pin engine patch, compiler, graphics API, required plugins and build configuration. Record device/driver and version files.
2. Create an isolated experiment project, a material specimen, analytic curved terrain patches, one rock and one controllable contact probe. Run the 60 km regression body and a terrestrial-radius body. Use metre source data with an explicit engine-unit adapter.
3. Implement the candidate **runtime** geometry update path without editor-only APIs. Change an analytic height parameter and generate a new seed while the packaged executable runs. Record which lighting, shadow, collision, instancing and LOD features actually operate on that geometry.
4. If required quality depends on cooked geometry, make the cooked path and seed/edit workflow explicit. Measure/import/cook storage and regeneration steps. Compare that product behavior with R01/R12; do not pass a runtime requirement with an offline-only showcase.
5. Maintain a stable collision patch while visual LOD changes. Drive/move the probe over an edge, reverse direction with work pending, then replace/rebase the local region. Capture contact and render disagreement.
6. Traverse surface → low orbit → surface on both body scales; inspect normals, material coordinates, shadows and atmosphere. Test one local vegetation patch with a production-compatible fallback path.
7. Package the project. Repeat the same actions outside the editor. Manually record a still, movement and profiler/measurement record with build and exact settings.
8. Compare the result with the predeclared quality targets and P1 budget. Record failures and corrective cost. Accept, reject, or retain the candidate provisionally with specific remaining work.

This experiment is small by content and scope, not by pretending the hard geometry/lighting integration is already solved. If it becomes a renderer rewrite, stop expansion and assess the alternative.

## E-P2-CUSTOM-01: native custom-path comparison

Status: **design prepared; not run**. If Unreal's required terrain path fails, implement the same analytic patch/material/contact scene in one selected custom stack. Start with a packaged native window, debug views, correct depth/units, timing and resource retirement. Compare actual image/function/performance evidence and the systems still needing construction. Do not add oceans/forests to conceal unresolved foundation work.

The available C++ compiler can establish CPU arithmetic/build fixtures but cannot prove native graphics capability without a GPU/window surface. Installing a compiler here would not resolve the target-device gate.

## Decision rule and revisit trigger

Accept one shipping path after its packaged geometry, lighting, coordinate, collision, generation and profiling requirements are demonstrated on a named target. Prefer the path with the smallest credible remaining work to the accepted reference world. Document unsupported features and fallbacks, with their measured effect.

Revisit if required runtime seeds/edits cannot work, precision/physics causes unavoidable visible errors, reference quality exceeds device budgets, critical APIs are editor-only/experimental without fallback, or the required custom renderer work eliminates the expected integration advantage.

Exact engine/API/dependency versions and product budgets stay unresolved until the target run. Final P3 engine interfaces and production M0 do not begin from a provisional platform assumption.
