# Selective CI and Pages publishing

`pages.yml` coordinates checks for pushes and PRs; manual dispatch selects a full
regression. `regression.yml` runs every day at 02:20 UTC or manually, including a
separate high/critical dependency audit. Dependency changes also trigger the audit alone. This workflow never publishes.

The reusable `ci.yml` workflow selects affected groups using the entire push
range or PR base/head diff (including deletions and both sides of renames).
Docs-only changes skip builds and deployment. Missing history, shared shell,
dependencies, CI/build scripts and unknown files conservatively select all checks.
Nature and site changes skip unrelated engine/shader/rover checks. Engine changes
include shader compilation; rover validation runs on rover changes or full checks.

`npm test` remains the authoritative test list. `scripts/ci/run-tests.mjs` assigns
every command to exactly one group, emits individual timings, fails on unsupported
command syntax and defaults newly added unclassified tests to the engine suite.
The planner itself is verified on every run. New nature/site test names should be
added to `testGroup` when they do not match an existing family.

The build job installs with npm download caching and
`npm ci --prefer-offline --no-audit --no-fund`, builds once, checks syntax, and shares
only generated foundation files with parallel test suites. Suites install the
same locked dependencies from npm cache; they do not rebuild. Shader and rover
jobs have no npm install. The build job packages Pages; deployment waits for a
stable `test` aggregate gate and publishes that exact artifact, without checkout,
installation or rebuild. Vulnerability auditing remains visible in its separate
scheduled/manual job, independent of registry availability during publishing.

Superseded PR runs are cancelled. Main-branch runs and actual Pages deployments are
serialized, so an active deployment is not cancelled midway. GitHub retains the
newest pending main-branch run. Do not cancel a deployment manually during publication. The complete
site still deploys together; this is selective validation, not partial hosting.

If branch protection explicitly requires the old top-level `test` check, check the
new reusable-workflow check name (`checks / test`) and update the repository rule
to require that aggregate gate. No repository protection settings are changed by
these workflow files.
