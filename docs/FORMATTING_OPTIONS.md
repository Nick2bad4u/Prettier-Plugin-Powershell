# PowerShell Formatter Options Guide

This guide provides examples for each formatting option available in the prettier-plugin-powershell.

## Table of Contents

- [Indent Style](#indent-style)
- [Indent Size](#indent-size)
- [Trailing Commas](#trailing-commas)
- [Sort Hashtable Keys](#sort-hashtable-keys)
- [Blank Lines Between Functions](#blank-lines-between-functions)
- [Blank Line After Param](#blank-line-after-param)
- [Brace Style](#brace-style)
- [Line Width](#line-width)
- [Prefer Single Quote](#prefer-single-quote)
- [Keyword Case](#keyword-case)

---

## Indent Style

Controls whether to use spaces or tabs for indentation.

**Option:** `powershellIndentStyle`
**Type:** `"spaces" | "tabs"`
**Default:** `"spaces"`

### Example with Spaces (default)

```powershell
function Test-Function {
  param([string]$Name)

  if ($Name) {
    Write-Output "Hello, $Name"
  }
}
```

### Example with Tabs

```powershell
function Test-Function {
→param([string]$Name)
→
→if ($Name) {
→→Write-Output "Hello, $Name"
→}
}
```

---

## Indent Size

Number of indentation characters for each level.

**Option:** `powershellIndentSize`
**Type:** `number`
**Default:** `2`
**Range:** `1-8`

### Example with 2 spaces (default)

```powershell
function Test {
  if ($true) {
    Write-Output "nested"
  }
}
```

### Example with 4 spaces

```powershell
function Test {
    if ($true) {
        Write-Output "nested"
    }
}
```

---

## Trailing Commas

Control trailing commas for array and hashtable literals.

**Option:** `powershellTrailingComma`
**Type:** `"none" | "multiline" | "all"`
**Default:** `"multiline"`

### Example with "none"

```powershell
$array = @(
  1,
  2,
  3
)

$hash = @{
  Name = "John"
  Age = 30
}
```

### Example with "multiline" (default)

```powershell
$array = @(
  1,
  2,
  3,
)

$hash = @{
  Name = "John";
  Age = 30;
}
```

### Example with "all"

```powershell
$array = @(1, 2, 3,)
$hash = @{ Name = "John"; Age = 30; }
```

---

## Sort Hashtable Keys

Alphabetically sort hashtable keys.

**Option:** `powershellSortHashtableKeys`
**Type:** `boolean`
**Default:** `false`

### Example with false (default)

```powershell
$config = @{
  Server = "localhost"
  Port = 8080
  Database = "mydb"
  Username = "admin"
}
```

### Example with true

```powershell
$config = @{
  Database = "mydb"
  Port = 8080
  Server = "localhost"
  Username = "admin"
}
```

---

## Blank Lines Between Functions

Number of blank lines to insert between function declarations.

**Option:** `powershellBlankLinesBetweenFunctions`
**Type:** `number`
**Default:** `1`

### Example with 1 (default)

```powershell
function Get-User {
  param([string]$Name)
}

function Set-User {
  param([string]$Name)
}
```

### Example with 2

```powershell
function Get-User {
  param([string]$Name)
}


function Set-User {
  param([string]$Name)
}
```

---

## Blank Line After Param

Add a blank line after param blocks.

**Option:** `powershellBlankLineAfterParam`
**Type:** `boolean`
**Default:** `false`

### Example with false (default)

```powershell
function Test-Function {
  param([string]$Name)
  Write-Output "Hello, $Name"
}
```

### Example with true

```powershell
function Test-Function {
  param([string]$Name)

  Write-Output "Hello, $Name"
}
```

---

## Brace Style

Control the placement of opening braces.

**Option:** `powershellBraceStyle`
**Type:** `"1tbs" | "allman"`
**Default:** `"1tbs"`

### Example with "1tbs" (default)

```powershell
function Test-Function {
  if ($condition) {
    Write-Output "true"
  } else {
    Write-Output "false"
  }
}
```

### Example with "allman"

```powershell
function Test-Function
{
  if ($condition)
  {
    Write-Output "true"
  }
  else
  {
    Write-Output "false"
  }
}
```

---

## Line Width

Maximum line length before wrapping.

**Option:** `powershellLineWidth`
**Type:** `number`
**Default:** `80`

### Example with 80 (default)

```powershell
# Long line gets wrapped
Get-Process | Where-Object { $_.CPU -gt 10 } |
  Select-Object Name, CPU |
  Sort-Object CPU -Descending
```

### Example with 120

```powershell
# Longer lines allowed before wrapping
Get-Process | Where-Object { $_.CPU -gt 10 } | Select-Object Name, CPU | Sort-Object CPU -Descending
```

---

## Prefer Single Quote

Prefer single quotes over double quotes when possible.

**Option:** `powershellPreferSingleQuote`
**Type:** `boolean`
**Default:** `false`

### Example with false (default)

```powershell
$message = "Hello, World!"
$name = "John"
```

### Example with true

```powershell
$message = 'Hello, World!'
$name = 'John'
```

**Note:** Double quotes will still be used when variable interpolation is needed:

```powershell
# Always uses double quotes for interpolation
$greeting = "Hello, $name"
```

---

## Keyword Case

Control the casing of PowerShell keywords.

**Option:** `powershellKeywordCase`
**Type:** `"preserve" | "lower" | "upper" | "pascal"`
**Default:** `"lower"`

### Example with "lower" (default)

```powershell
function Test-Function {
  if ($condition) {
    Write-Output "test"
  }
}
```

### Example with "preserve"

```powershell
Function Test-Function {
  IF ($condition) {
    Write-Output "test"
  }
}
```

### Example with "upper"

```powershell
FUNCTION Test-Function {
  IF ($condition) {
    WRITE-OUTPUT "test"
  }
}
```

### Example with "pascal"

```powershell
Function Test-Function {
  If ($condition) {
    Write-Output "test"
  }
}
```

---

## Configuration File Example

Here's a complete `.prettierrc` configuration file with all PowerShell options:

```json
{
  "plugins": ["prettier-plugin-powershell"],
  "powershellIndentStyle": "spaces",
  "powershellIndentSize": 2,
  "powershellTrailingComma": "multiline",
  "powershellSortHashtableKeys": false,
  "powershellBlankLinesBetweenFunctions": 1,
  "powershellBlankLineAfterParam": false,
  "powershellBraceStyle": "1tbs",
  "powershellLineWidth": 80,
  "powershellPreferSingleQuote": false,
  "powershellKeywordCase": "lower"
}
```

---

## Command Line Usage

You can also specify options via command line:

```bash
# Format with 4-space indentation
prettier --parser powershell --powershell-indent-size 4 script.ps1

# Format with sorted hashtable keys
prettier --parser powershell --powershell-sort-hashtable-keys true script.ps1

# Format with Allman brace style
prettier --parser powershell --powershell-brace-style allman script.ps1
```

---

## Tips and Best Practices

1. **Consistency**: Choose options that match your team's coding standards and stick with them.

2. **Line Width**: A width of 80-120 characters is recommended for readability.

3. **Indentation**: 2 or 4 spaces are most common. Avoid mixing tabs and spaces.

4. **Brace Style**: "1tbs" (One True Brace Style) is more common in PowerShell, but "allman" can improve readability for deeply nested code.

5. **Trailing Commas**: "multiline" helps reduce git diffs when adding/removing items.

6. **Version Control**: Commit your `.prettierrc` file to ensure consistent formatting across your team.
