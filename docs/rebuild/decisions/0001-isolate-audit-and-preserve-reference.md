# ADR 0001: isolated audit and preserved reference

Status: accepted for the audit scope. Date: 11 October 2026.

The user requested execution of the planetary rebuild guide. Its first stage audits existing work before a production rewrite. Existing runtime source lives under `dist/`, and the latest commit deliberately removes automated screenshots/capture UI.

Decision: keep runtime and deployment files unchanged during P0. Add documentation and read-only audit utilities on `rebuild/p0-audit`. Preserve the current app as a runnable comparison. Use manually initiated local visual evidence, with explicit blocked states where target access is unavailable.

Alternatives: delete/rewrite the current engine immediately, or add screenshot automation to the old workflow. Both would remove useful evidence or conflict with the established inspection preference before the platform problem is demonstrated.

Consequences: the first result is a verified code/tooling audit, not an accepted new renderer. Existing numerical fixtures/assets can inform the native experiment. Final engine and hardware targets remain open.

Revisit only if reference preservation becomes infeasible for a documented reason. Production migration starts in an isolated replacement after its platform and inspection gates.
