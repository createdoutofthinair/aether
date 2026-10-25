# Aether rebuild execution workspace

This workspace executes the [rebuild guide](EXECUTION-GUIDE.md) against the current Aether source. Read [STATUS.md](STATUS.md) first when resuming.

Baseline: `0f3bf3d704ff301437e880eff2e6e5aa6c0c732c`, 11 October 2026. Runtime source remains under `dist/`. Work is isolated on `rebuild/p0-audit`.

## Current gate

P0's source audit, salvage decision and available functional checks are complete. Local renderer observation is **blocked** because the target computer is unavailable here. P1 has a proposed contract; hardware and budget ratification remain open. P2 has research and experiment instructions; the platform decision is provisional. The production rewrite and M0–M12 have not started.

| Read in this order | Purpose |
| --- | --- |
| [00-current-state.md](00-current-state.md) | Code audit, measured fixtures, salvage matrix, reported defects and asset provenance |
| [01-product-and-hardware.md](01-product-and-hardware.md) | Requirements and visibly provisional hardware/performance targets |
| [02-visual-targets.md](02-visual-targets.md) | V01–V14 definitions, references and evidence limits |
| [03-platform-decision.md](03-platform-decision.md) | Leading candidate, alternatives and required packaged experiments |
| [10-validation.md](10-validation.md) | Exact local run and manual review procedure |
| [11-milestones.md](11-milestones.md) | Work packages, model recommendations and exit gates |
| [12-risks-and-deferred-work.md](12-risks-and-deferred-work.md) | Uncertainty owners, experiments and scope boundaries |
| [reviews/01-audit-review.md](reviews/01-audit-review.md) | This session's consistency review; independent architecture review still pending |

The engine-specific `04`–`09` specifications will be written after the platform experiment resolves their required interfaces. The full technical checklist is retained in the execution guide; missing implementation decisions are not represented as accepted specifications.

## Executable audit tools

Run from the repository root:

```sh
node scripts/rebuild-baseline.mjs
node scripts/rebuild-p0-experiments.mjs
npm install --ignore-scripts --no-package-lock --no-audit --no-fund
node scripts/rebuild-http-smoke.mjs
```

The first tool inventories source/asset identity and controls. The second runs three CPU fixtures. The third installs the existing pinned development dependency without altering tracked files. The last checks eight HTTP endpoints and shuts down its own server. None captures images, launches a browser, or measures a real GPU.

Keep the removed GitHub screenshot pipeline and automatic capture UI removed. Run visual inspection locally and manually. Preserve the existing application until a replacement passes the relevant evidence gates.

## Next execution

Collect the target machine fields and run the short baseline inspection in `10-validation.md`. Complete P1 with those results. Then execute the packaged spherical terrain experiment in `03-platform-decision.md`; select the engine before producing its concrete P3 architecture.

Suggested settings: Sol 6.1 Max for baseline implementation and bounded fixes; Astra Max for P2/P3 and the separate critical review. These are suggested client selections; this workspace does not change the model setting.
