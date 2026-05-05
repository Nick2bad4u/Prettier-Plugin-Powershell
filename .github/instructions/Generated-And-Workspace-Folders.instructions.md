---
name: "Generated-And-Workspace-Folders-Guidelines"
description: "Quick guidance for caches, temporary folders, generated outputs, editor folders, and installed dependencies."
applyTo: ".cache/**, temp/**, dist/**, coverage/**, .vite/**, .turbo/**, docs/docusaurus/build/**, docs/docusaurus/.docusaurus/**, docs/docusaurus/node_modules/**, node_modules/**, .vscode/**"
---

# Generated, Cache, Dependency, and Workspace Folders

These folders are usually infrastructure, not hand-authored source.

## General rule

- Inspect them when useful.
- Debug them when necessary.
- But fix the upstream source, config, or script that generated them instead of editing the generated output directly.
- Temporary command outputs and debug logs must be written under `temp/` only (or a subfolder under `temp/`).
- Do not create transient log/debug artifacts in the repository root (for example `.typecheck-stdout.log` at root).

## Folder purposes

- `temp/`
  - Safe scratch space for temporary command output, debug dumps, and one-off inspection artifacts.
  - Prefer this folder when a command output is too large or noisy for direct terminal inspection.
- `.cache/`, `.vite/`, `.turbo/`
  - Tool caches.
  - Do not hand-edit.
  - Safe to clear through the repo's clean scripts when needed.
- `dist/`
  - Generated build output and published package artifacts.
  - Never treat as the primary editing target.
- `coverage/`
  - Generated test and benchmark reports.
  - Useful for inspection, not manual authoring.
- `docs/docusaurus/build/`, `docs/docusaurus/.docusaurus/`
  - Generated site build/runtime internals.
  - Do not patch manually to fix docs problems; update source docs, config, or theme code instead.
- `node_modules/`, `docs/docusaurus/node_modules/`
  - Installed dependencies.
  - Never hand-edit vendored dependency files unless the task is explicitly about patching dependencies locally.
- `.vscode/`
  - Workspace/editor configuration.
  - Keep settings minimal, portable, and repo-safe.
  - Do not put personal machine paths, secrets, or noisy user-specific state here.

## Editing rules

- Only modify generated/cache/dependency folders directly when the task explicitly requires it and there is no better source-level fix.
- Prefer existing clean/build/docs scripts over ad-hoc deletion commands.
- If generated content looks wrong, identify the source generator first.

## Good hygiene

- Keep temporary debugging artifacts in `temp/`, not scattered around the repo.
- Never write ad-hoc debug logs to repository root; use `temp/` consistently.
- Remove stale temporary files when they are no longer needed.
- Avoid committing transient cache artifacts unless the repository intentionally tracks them.
