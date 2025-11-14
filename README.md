# Prettier Plugin PowerShell

[![CI](https://github.com/Nick2bad4u/prettier-plugin-powershell/actions/workflows/ci.yml/badge.svg)](https://github.com/Nick2bad4u/prettier-plugin-powershell/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Nick2bad4u/prettier-plugin-powershell/branch/main/graph/badge.svg)](https://codecov.io/gh/Nick2bad4u/prettier-plugin-powershell)
[![npm version](https://img.shields.io/npm/v/prettier-plugin-powershell.svg)](https://www.npmjs.com/package/prettier-plugin-powershell)
[![npm downloads](https://img.shields.io/npm/dm/prettier-plugin-powershell.svg)](https://www.npmjs.com/package/prettier-plugin-powershell)
[![License: UnLicense](https://img.shields.io/badge/License-UnLicense-blue.svg)](LICENSE)
[![Node.js >= 18.12](https://img.shields.io/badge/node-%3E%3D18.12-43853d.svg)](https://nodejs.org/)

A Prettier 3 plugin that formats PowerShell source files (`.ps1`, `.psm1`, `.psd1`) with predictable, idiomatic output. The formatter is extensively tested (100 % coverage) and ready for CI/CD pipelines, editor integrations, and automated release flows.

<p align="center">
  <img src="assets/Prettier-Powershell-Mascot.jpeg" alt="Prettier PowerShell mascot" width="50%" />
</p>

## Table of contents

- [Highlights](#highlights)
- [Quick start](#quick-start)
  - [Install](#install)
  - [Prettier configuration](#prettier-configuration)
  - [Command line](#command-line)
  - [Programmatic usage](#programmatic-usage)
- [Configuration reference](#configuration-reference)
- [Example formatting](#example-formatting)
- [Automation & coverage](#automation--coverage)
- [Project scripts](#project-scripts)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

## Highlights

- 🌟 **Idiomatic PowerShell** – balances spacing, casing, and pipeline layout while preserving comments and here-strings.
- 🔧 **Fine-grained controls** – tune indentation style/width, trailing delimiters, brace style, alias rewriting, and keyword casing.
- ⚡ **Prettier-first** – drop-in plugin for Prettier v3+, compatible with the CLI, editors, and format-on-save workflows.
- 📈 **Production ready** – enforced by CI (lint, typecheck, tests) with Codecov-powered reporting and 100 % coverage.
- 🛠️ **TypeScript source** – strongly typed AST helpers and printer utilities for easy extension.

## Quick start

### Install

```bash
npm install --save-dev prettier prettier-plugin-powershell
```

> Requires Node.js 18.12 or newer and Prettier v3 or newer.

### Prettier configuration

Add the plugin to your Prettier config (e.g. `.prettierrc.json`):

```json
{
  "plugins": ["prettier-plugin-powershell"],
  "parser": "powershell"
}
```

You can co-locate plugin options with standard Prettier settings:

```json
{
  "plugins": ["prettier-plugin-powershell"],
  "tabWidth": 2,
  "powershellTrailingComma": "all",
  "powershellRewriteAliases": true
}
```

### Command line

Format scripts recursively:

```bash
npx prettier "**/*.ps1" --write
```

### Programmatic usage

```ts
import prettier from 'prettier';
import plugin from 'prettier-plugin-powershell';

const formatted = await prettier.format(source, {
  filepath: 'script.ps1',
  parser: 'powershell',
  plugins: [plugin]
});
```

## Configuration reference

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `powershellIndentStyle` | `"spaces" \| "tabs"` | `"spaces"` | Render indentation with spaces or tabs. |
| `powershellIndentSize` | `number` | `4` | Overrides Prettier’s `tabWidth` specifically for PowerShell files. |
| `powershellTrailingComma` | `"none" \| "multiline" \| "all"` | `"none"` | When to emit trailing delimiters for arrays (`@(...)`) and hashtables (`@{...}`). |
| `powershellSortHashtableKeys` | `boolean` | `false` | Sort hashtable keys alphabetically before printing. |
| `powershellBlankLinesBetweenFunctions` | `number` | `1` | Minimum blank lines preserved between function declarations (clamped between 0 and 3). |
| `powershellBlankLineAfterParam` | `boolean` | `true` | Insert a blank line after `param (...)` blocks within functions/script blocks. |
| `powershellBraceStyle` | `'1tbs' \| 'allman'` | `'1tbs'` | Choose inline braces or newline-aligned Allman style. |
| `powershellLineWidth` | `number` | `120` | Maximum print width for wrapping pipelines, hashtables, and arrays. |
| `powershellPreferSingleQuote` | `boolean` | `false` | Prefer single-quoted strings when interpolation is not required. |
| `powershellKeywordCase` | `'preserve' \| 'lower' \| 'upper' \| 'pascal'` | `'lower'` | Normalise PowerShell keyword casing (defaults to lowercase to match `Invoke-Formatter`). |
| `powershellRewriteAliases` | `boolean` | `false` | Expand cmdlet aliases such as `ls`, `%`, `?`, `gci`. |
| `powershellRewriteWriteHost` | `boolean` | `false` | Rewrite `Write-Host` invocations to `Write-Output`. |

## Example formatting

Input:

```powershell
function Get-Widget{
param(
[string]$Name,
[int] $Count
)
$items=Get-Item |Where-Object { $_.Name -eq $Name}| Select-Object Name,Length
$hash=@{ b=2; a =1 }
}
```

Output with default settings:

```powershell
function Get-Widget {
    param(
        [string] $Name,
        [int] $Count
    )

    $items = Get-Item
        | Where-Object {
            $_.Name -eq $Name
        }
        | Select-Object Name, Length
    $hash = @{ b = 2; a = 1 }
}
```

## Automation & coverage

- **CI** – GitHub Actions (see [`ci.yml`](.github/workflows/ci.yml)) installs dependencies, lint checks, type-checks, and runs the Vitest suite with coverage on every push and pull request.
- **Codecov** – Coverage artefacts (`coverage/lcov.info`) are uploaded via the [Codecov action](https://github.com/codecov/codecov-action). The badge above reflects the latest metrics on `main`.
- **npm publishing** – Every push to `main` triggers [`publish.yml`](.github/workflows/publish.yml), which bumps the version (patch by default, `feat` → minor, `BREAKING` → major), runs the quality bar, commits the build artifacts, tags the release, publishes to npm, and opens a GitHub release. The legacy manual workflow now just points back to this automated pipeline; you can still run it manually from the Actions tab when needed.

## Property-based testing

- **Fast-check harness** – Property-based tests across multiple modules use [`fast-check`](https://github.com/dubzzz/fast-check) to validate behavior with randomly generated inputs:
  - `tests/parser.property.test.ts` – Exercises the parser and formatter with randomly generated PowerShell snippets, validating location metadata, token ordering, formatting stability, and re-parseability.
  - `tests/parser.edge-cases.property.test.ts` – Stress-tests the parser with edge cases: deep nesting, unbalanced delimiters, comment placement, string variations, whitespace handling, pipelines, operators, and location consistency.
  - `tests/tokenizer.property.test.ts` – Validates tokenizer correctness: token ordering, location ranges, determinism, and proper handling of keywords, variables, strings, comments, and edge cases.
  - `tests/tokenizer-helpers.property.test.ts` – Tests the `normalizeHereString` helper function with various line counts, empty lines, mixed line endings, and edge cases.
  - `tests/options.property.test.ts` – Ensures option resolution never throws, produces valid output, respects user preferences, applies sensible defaults, and correctly clamps numeric values.
  - `tests/ast.property.test.ts` – Tests AST utility functions (`createLocation`, `isNodeType`, `cloneNode`) for correctness with edge cases like negative values, NaN, Infinity, and type safety.
  - `tests/printer.property.test.ts` – Validates printer output: formatting never throws, produces valid PowerShell, remains idempotent, preserves semantics, respects configuration options, and handles edge cases like empty scripts and comments.
  - `tests/integration.property.test.ts` – Tests full round-trip preservation (tokenize → parse → format → re-parse), option combinations, cross-module consistency, error resilience, plugin interface contracts, and file extension handling.
  - `tests/weird-files.property.test.ts` – Exercises BOM + shebang combinations, Unicode-heavy content, comment directives, and exotic whitespace to ensure the parser and printer remain stable on atypical files.
  - `tests/printer-options.property.test.ts` – Verifies option-sensitive printing behavior (blank line heuristics, string quote normalization, alias rewriting, and Write-Host rewriting) across randomized inputs.
  - `tests/github-samples.property.test.ts` – *Opt-in*: pulls real-world PowerShell scripts from the GitHub API, then formats and re-parses them to guard against regressions on long/complex inputs. Disabled unless `POWERSHELL_ENABLE_GITHUB_SAMPLES=1`.
- **Custom arbitraries** – Reusable builders in [`tests/property/arbitraries.ts`](tests/property/arbitraries.ts) generate assignments, pipelines, functions, try/catch blocks, and other constructs to shake out edge cases.
- **Idempotence telemetry** – Known non-idempotent counterexamples are captured (but skipped) during property runs. They are surfaced at the end of the suite to aid future fixes without breaking CI immediately.
- **Tuning** – Adjust the number of runs with the `POWERSHELL_PROPERTY_RUNS` environment variable (default `100` for most tests, `150` for parser tests). For a deeper local sweep: `POWERSHELL_PROPERTY_RUNS=500 npm test`.
- **PowerShell syntax sampling** – By default, **every** formatted script is re-validated with PowerShell’s built-in parser so regressions surface immediately. Use `POWERSHELL_MAX_SYNTAX_CHECKS` to cap the number of checks (set to a positive integer) or `0` to skip entirely, and toggle the feature wholesale with `POWERSHELL_VERIFY_SYNTAX` (`0` to disable).
  - Use `POWERSHELL_SYNTAX_TRACE=1` to emit per-invocation logs when diagnosing hangs or parser failures.
- **Property progress & timeboxing** – Flip on run-by-run logging with `POWERSHELL_PROPERTY_PROGRESS=1` (default interval `50`, tweak via `POWERSHELL_PROPERTY_PROGRESS_INTERVAL`). Extend or shrink Vitest's overall timeout with `POWERSHELL_TEST_TIMEOUT_MS` when running extended fuzz sweeps.
- **Deep fuzzing** – `npm run test:fuzz` now shells through PowerShell so the `POWERSHELL_PROPERTY_RUNS=2000` environment toggle works cross-platform.

To fuzz against GitHub-hosted PowerShell, export `POWERSHELL_ENABLE_GITHUB_SAMPLES=1` (optionally `GITHUB_TOKEN` to raise rate limits) and run `npm test`. You can further tune `POWERSHELL_GITHUB_SAMPLE_COUNT`, `POWERSHELL_GITHUB_QUERY`, `POWERSHELL_GITHUB_MIN_LENGTH`, and `POWERSHELL_GITHUB_MAX_LENGTH` to control source selection. Enable `POWERSHELL_CACHE_GITHUB_SAMPLES=1` to save downloaded samples to `tests/fixtures/github-cache/` for reuse across runs, avoiding redundant API calls.

## Project scripts

| Script | Description |
| --- | --- |
| `npm run build` | Bundle the plugin to `dist/` via `tsup`. |
| `npm run build:watch` | Rebuild continuously while developing. |
| `npm run clean` | Remove the `dist/` directory. |
| `npm run lint` / `npm run lint:fix` | Run ESLint (optionally with auto-fix). |
| `npm run format` | Apply Prettier to TypeScript source and tests. |
| `npm run test` / `npm run test:watch` | Execute the Vitest suite. |
| `npm run test:coverage` | Generate v8 coverage reports (consumed by Codecov). |
| `npm run typecheck` | Ensure the TypeScript project compiles without emitting files. |

## Contributing

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Use `npm run build:watch` during active development.
4. Before opening a pull request, run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:coverage`
5. Contributions remain under the UnLicense license.

Bug reports and feature requests are welcome via [GitHub issues](https://github.com/Nick2bad4u/prettier-plugin-powershell/issues).

## Credits

- Mascot artwork courtesy of the ColorScripts team (light and dark variants included in [`assets/`](assets)).
- Built with [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/), and [Vitest](https://vitest.dev/).

## License

Distributed under the [UnLicense License](LICENSE).
