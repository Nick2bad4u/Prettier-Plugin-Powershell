# prettier-plugin-powershell

A Prettier 3 plugin that formats PowerShell source files (`.ps1`, `.psm1`, `.psd1`) with predictable, idiomatic output. It supports configurable indentation, trailing delimiters, hashtable sorting, blank-line control between functions, and automatic spacing after `param (...)` blocks while preserving here-strings and comments.

## Installation

```bash
npm install --save-dev prettier prettier-plugin-powershell
```

> **Note**: This plugin targets Prettier v3+. Make sure your project is using a compatible version.

## Usage

Add the plugin to your Prettier configuration (e.g. `.prettierrc.json`).

```json
{
  "plugins": ["prettier-plugin-powershell"],
  "parser": "powershell"
}
```

You can then format PowerShell files via the CLI:

```bash
npx prettier --write "**/*.ps1"
```

When using Prettier programmatically:

```ts
import prettier from 'prettier';
import plugin from 'prettier-plugin-powershell';

const formatted = await prettier.format(code, {
  filepath: 'script.ps1',
  parser: 'powershell',
  plugins: [plugin]
});
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `powershellIndentStyle` | `"spaces" \| "tabs"` | `"spaces"` | Controls whether indentation is rendered with spaces or tabs. |
| `powershellIndentSize` | `number` | `2` | The indentation size applied to nested blocks. Overrides Prettier's `tabWidth` for PowerShell files. |
| `powershellTrailingComma` | `"none" \| "multiline" \| "all"` | `"multiline"` | Choose when to emit trailing delimiters for arrays (`@(...)`) and hashtables (`@{...}`). |
| `powershellSortHashtableKeys` | `boolean` | `false` | Sort hashtable keys alphabetically when formatting. |
| `powershellBlankLinesBetweenFunctions` | `number` | `1` | Minimum number of blank lines preserved between function declarations. |
| `powershellBlankLineAfterParam` | `boolean` | `true` | Insert an empty line after `param (...)` blocks inside script blocks. |
| `powershellBraceStyle` | `'1tbs' \| 'allman'` | `'1tbs'` | Control whether opening braces stay on the header line (`1tbs`) or move to the following line (`allman`). |
| `powershellLineWidth` | `number` | `120` | Override the maximum line width used when formatting PowerShell documents. |
| `powershellPreferSingleQuote` | `boolean` | `false` | Prefer single-quoted strings when interpolation is not required. |
| `powershellKeywordCase` | `'preserve' \| 'lower' \| 'upper' \| 'pascal'` | `'preserve'` | Normalise the casing of PowerShell keywords. |
| `powershellRewriteAliases` | `boolean` | `false` | Rewrite common cmdlet aliases (e.g. `ls`, `%`, `?`) to their canonical names. |
| `powershellRewriteWriteHost` | `boolean` | `false` | Rewrite `Write-Host` invocations to `Write-Output`. |

These options can be specified alongside other Prettier settings:

```json
{
  "plugins": ["prettier-plugin-powershell"],
  "tabWidth": 2,
  "powershellIndentStyle": "spaces",
  "powershellTrailingComma": "all"
}
```

## Scripts

- `npm run build` – bundle the plugin to `dist/` using `tsup`.
- `npm run test` – execute the Vitest suite.
- `npm run lint` – run ESLint across the source.
- `npm run typecheck` – ensure the TypeScript project type-checks.

## Development

1. Install dependencies: `npm install`
2. Build once: `npm run build`
3. Run tests: `npm run test`
4. Format files: `npm run format`

During development you can run `npm run build:watch` to keep the bundler running.

## Example

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

## License

MIT
