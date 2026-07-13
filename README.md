# Prettier Plugin PowerShell

[![CI](https://github.com/Nick2bad4u/prettier-plugin-powershell/actions/workflows/ci.yml/badge.svg)](https://github.com/Nick2bad4u/prettier-plugin-powershell/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/Nick2bad4u/prettier-plugin-powershell/branch/main/graph/badge.svg)](https://codecov.io/gh/Nick2bad4u/prettier-plugin-powershell) [![npm version](https://img.shields.io/npm/v/prettier-plugin-powershell.svg)](https://www.npmjs.com/package/prettier-plugin-powershell) [![npm downloads](https://img.shields.io/npm/dm/prettier-plugin-powershell.svg)](https://www.npmjs.com/package/prettier-plugin-powershell) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md) [![Node.js >= 18.12](https://img.shields.io/badge/node-%3E%3D18.12-43853d.svg)](https://nodejs.org/)

A Prettier 3 plugin that formats PowerShell source files (`.ps1`, `.psm1`, `.psd1`) with predictable, idiomatic output. The formatter is extensively tested (high coverage with strict CI thresholds) and ready for CI/CD pipelines, editor integrations, and automated release flows.

![Prettier PowerShell mascot](assets/Prettier-Powershell-Mascot.jpeg)

## Table of contents

- [Highlights](#highlights)
- [Quick start](#quick-start)
- [Configuration reference](#configuration-reference)
- [Example formatting](#example-formatting)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)
- [Contributors ✨](#contributors-)

## Highlights

- 🌟 **Idiomatic PowerShell** – balances spacing, casing, and pipeline layout while preserving comments and here-strings.
- 🔧 **Fine-grained controls** – tune indentation style/width, trailing delimiters, brace style, alias rewriting, and keyword casing.
- ⚡ **Prettier-first** – drop-in plugin for Prettier v3+, compatible with the CLI, editors, and format-on-save workflows.
- 📈 **Production ready** – enforced by CI (lint, typecheck, tests) with Codecov-powered reporting and ≥95 % coverage gates.
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

```typescript
import prettier from "prettier";
import plugin from "prettier-plugin-powershell";

const formatted = await prettier.format(source, {
 filepath: "script.ps1",
 parser: "powershell",
 plugins: [plugin],
});
```

## Configuration reference

| Option                                 | Type                                                                                             | Default    | Description                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------- |
| `powershellIndentStyle`                | <code>"spaces"</code><br><code>"tabs"</code>                                                     | `"spaces"` | Render indentation with spaces or tabs.                                                                         |
| `powershellIndentSize`                 | `number`                                                                                         | `4`        | Overrides Prettier's `tabWidth` specifically for PowerShell files (clamped between 1 and 8).                    |
| `powershellTrailingComma`              | <code>"none"</code><br><code>"multiline"</code><br><code>"all"</code>                            | `"none"`   | When to emit trailing semicolons between hashtable entries (PowerShell arrays do not support trailing commas).  |
| `powershellSortHashtableKeys`          | `boolean`                                                                                        | `false`    | Sort hashtable keys alphabetically before printing.                                                             |
| `powershellBlankLinesBetweenFunctions` | `number`                                                                                         | `1`        | Minimum blank lines preserved between function declarations (clamped between 0 and 3).                          |
| `powershellBlankLineAfterParam`        | `boolean`                                                                                        | `true`     | Insert a blank line after `param (...)` blocks within functions/script blocks.                                  |
| `powershellBraceStyle`                 | <code>"1tbs"</code><br><code>"allman"</code>                                                     | `"1tbs"`   | Choose inline braces or newline-aligned Allman style.                                                           |
| `powershellLineWidth`                  | `number`                                                                                         | `120`      | Maximum print width for wrapping pipelines, hashtables, and arrays (clamped between 40 and 200).                |
| `powershellPreferSingleQuote`          | `boolean`                                                                                        | `false`    | Prefer single-quoted strings when interpolation is not required.                                                |
| `powershellKeywordCase`                | <code>"preserve"</code><br><code>"lower"</code><br><code>"upper"</code><br><code>"pascal"</code> | `"lower"`  | Normalise PowerShell keyword casing (defaults to lowercase to match PSScriptAnalyzer/Invoke-Formatter).         |
| `powershellRewriteAliases`             | `boolean`                                                                                        | `false`    | Expand cmdlet aliases such as `ls`, `%`, `?`, `gci`.                                                            |
| `powershellRewriteWriteHost`           | `boolean`                                                                                        | `false`    | Rewrite `Write-Host` invocations to `Write-Output`.                                                             |
| `powershellPreset`                     | <code>"none"</code><br><code>"invoke-formatter"</code>                                           | `"none"`   | Apply a bundle of defaults (e.g. `invoke-formatter` mirrors the settings PowerShell's built-in formatter uses). |

### Invoke-Formatter parity preset

Set `"powershellPreset": "invoke-formatter"` to mirror the behavior of `Invoke-Formatter`/PSScriptAnalyzer's `CodeFormatting` profile. The preset only fills in values that you haven't provided yourself--any explicit option in your Prettier config still wins.

```jsonc
{
 "plugins": ["prettier-plugin-powershell"],
 "powershellPreset": "invoke-formatter",
 // overrides remain opt-in
 "powershellRewriteAliases": true,
}
```

### Per-directory overrides (keyword casing, presets, etc.)

Prettier supports [`overrides`](https://prettier.io/docs/en/options.html#overrides), so you can scope keyword casing/presets to specific folders without extra tooling:

```jsonc
{
 "plugins": ["prettier-plugin-powershell"],
 "powershellPreset": "invoke-formatter",
 "overrides": [
  {
   "files": "legacy/**/*.ps1",
   "options": {
    "powershellKeywordCase": "preserve",
   },
  },
 ],
}
```

Combined with the preset, this makes it easy to keep your primary scripts aligned with PowerShell's formatter while letting legacy or third-party snippets retain their original casing.

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

## Contributing

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Use `npm run build:watch` during active development.
4. Before opening a pull request, run:

- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`

5. Contributions remain under the MIT License.

Bug reports and feature requests are welcome via [GitHub issues](https://github.com/Nick2bad4u/prettier-plugin-powershell/issues).

## Credits

- Built with [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/), and [Vitest](https://vitest.dev/).

## License

Distributed under the [MIT License](LICENSE.md).

## Contributors ✨

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors.](https://img.shields.io/badge/all_contributors-5-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->

<!-- prettier-ignore-start -->

<!-- markdownlint-disable -->

<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="25%"><a href="https://github.com/Nick2bad4u"><img src="https://avatars.githubusercontent.com/u/20943337?v=4?s=80" width="80px;" alt="Nick2bad4u"/><br /><sub><b>Nick2bad4u</b></sub></a><br /><a href="https://github.com/Nick2bad4u/prettier-plugin-powershell/issues?q=author%3ANick2bad4u" title="Bug reports">🐛</a> <a href="https://github.com/Nick2bad4u/prettier-plugin-powershell/commits?author=Nick2bad4u" title="Code">💻</a> <a href="https://github.com/Nick2bad4u/prettier-plugin-powershell/commits?author=Nick2bad4u" title="Documentation">📖</a> <a href="#ideas-Nick2bad4u" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-Nick2bad4u" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-Nick2bad4u" title="Maintenance">🚧</a> <a href="https://github.com/Nick2bad4u/prettier-plugin-powershell/pulls?q=is%3Apr+reviewed-by%3ANick2bad4u" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/Nick2bad4u/prettier-plugin-powershell/commits?author=Nick2bad4u" title="Tests">⚠️</a> <a href="#tool-Nick2bad4u" title="Tools">🔧</a></td>
      <td align="center" valign="top" width="25%"><a href="https://snyk.io/"><img src="https://avatars.githubusercontent.com/u/19733683?v=4?s=80" width="80px;" alt="Snyk bot"/><br /><sub><b>Snyk bot</b></sub></a><br /><a href="#security-snyk-bot" title="Security">🛡️</a> <a href="#infra-snyk-bot" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-snyk-bot" title="Maintenance">🚧</a> <a href="https://github.com/Nick2bad4u/prettier-plugin-powershell/pulls?q=is%3Apr+reviewed-by%3Asnyk-bot" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="25%"><a href="https://www.stepsecurity.io/"><img src="https://avatars.githubusercontent.com/u/89328645?v=4?s=80" width="80px;" alt="StepSecurity Bot"/><br /><sub><b>StepSecurity Bot</b></sub></a><br /><a href="#security-step-security-bot" title="Security">🛡️</a> <a href="#infra-step-security-bot" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-step-security-bot" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="25%"><a href="https://github.com/apps/dependabot"><img src="https://avatars.githubusercontent.com/in/29110?v=4?s=80" width="80px;" alt="dependabot[bot]"/><br /><sub><b>dependabot[bot]</b></sub></a><br /><a href="#infra-dependabot[bot]" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#security-dependabot[bot]" title="Security">🛡️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="25%"><a href="https://github.com/apps/github-actions"><img src="https://avatars.githubusercontent.com/in/15368?v=4?s=80" width="80px;" alt="github-actions[bot]"/><br /><sub><b>github-actions[bot]</b></sub></a><br /><a href="https://github.com/Nick2bad4u/prettier-plugin-powershell/commits?author=github-actions[bot]" title="Code">💻</a> <a href="#infra-github-actions[bot]" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->

<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
