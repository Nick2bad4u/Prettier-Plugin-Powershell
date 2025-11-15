# Known Limitations

This document outlines current limitations and known issues with prettier-plugin-powershell.

> CLI snippets assume Prettier can resolve the plugin (either via your `.prettierrc` or by passing `--plugin=prettier-plugin-powershell`).

## Table of Contents

- [Language Features](#language-features)
- [Formatting Limitations](#formatting-limitations)
- [Performance Considerations](#performance-considerations)
- [Platform-Specific Issues](#platform-specific-issues)
- [Workarounds](#workarounds)

--------------------------------------------------------------------------------

## Language Features

### 1\. Very Complex DSC Configurations

**Status**: ✅ **IMPROVED** - Enhanced in v2.0.4

**Improvement**: DSC configurations now handle deep nesting correctly:

- ✅ Multi-node configurations
- ✅ Nested resources (5+ levels)
- ✅ Complex resource dependencies
- ✅ Script blocks within resources
- ✅ Deep nesting (10+ levels) without stack overflow
- ✅ Fast formatting even for complex configs

**Example**:

```powershell
# Now formats correctly:
Configuration WebServer {
    Node "Server01" {
        WindowsFeature IIS {
            Ensure = "Present"
            Name = "Web-Server"
        }
        WindowsFeature ASP {
            Ensure = "Present"
            Name = "Web-Asp-Net45"
            DependsOn = "[WindowsFeature]IIS"
        }
    }
}
```

**Remaining Consideration**: For extremely large configurations (>1000 lines), consider modularizing into separate configuration files.

**Impact**: Very low - most DSC configurations now format optimally

--------------------------------------------------------------------------------

### 2\. Dynamic Keywords

**Limitation**: Dynamically created keywords using `New-Alias` or similar are not recognized at parse time.

**Example**:

```powershell
# This alias won't be recognized during formatting
New-Alias -Name 'CustomKeyword' -Value 'Get-Process'
CustomKeyword  # Treated as identifier, not keyword
```

**Workaround**: None needed - still formats correctly, just not syntax-highlighted as keyword.

**Impact**: Low - doesn't affect correctness

--------------------------------------------------------------------------------

### 3\. Here-Strings with Unusual Escape Sequences

**Limitation**: Some rare escape sequences in here-strings might be preserved as-is rather than normalized.

**Example**:

```powershell
$text = @"
Line with \u0041 unicode escape
"@
```

**Workaround**: Use standard PowerShell escape sequences (`` `n``, `` `t``, etc.)

**Impact**: Low - preserved content is still valid

--------------------------------------------------------------------------------

### 4\. Script Blocks in Very Long One-Liners

**Status**: ✅ **FIXED** - Improved in v2.0.4

**Improvement**: Pipelines with 4+ segments now automatically break to multiple lines for better readability.

**Example**:

```powershell
# Input:
Get-Process | Where-Object { $_.Name -like "*chrome*" } | ForEach-Object { ... } | Select-Object Name

# Output (automatically formatted):
Get-Process |
  Where-Object { $_.Name -like "*chrome*" } |
  ForEach-Object { ... } |
  Select-Object Name
```

**Remaining Consideration**: Extremely complex nested expressions (>500 chars in a single script block) may still benefit from manual refactoring.

**Impact**: Low - most cases now handled automatically

--------------------------------------------------------------------------------

## Formatting Limitations

### 1\. No Semantic Analysis

**Limitation**: The formatter works purely on syntax, not semantics.

**Example**:

```powershell
# Both format the same, even though second is a typo
Get-Process
Get-Proccess  # Typo, but still formats
```

**Workaround**: Use PSScriptAnalyzer or PowerShell's syntax checking for semantic validation.

**Impact**: Low - formatting and linting are separate concerns

--------------------------------------------------------------------------------

### 2\. Comment Positioning Edge Cases

**Status**: ✅ **FIXED** - Parser & printer enhanced in v2.0.4

**Now Supported** ✅:

- Inline comments inside hashtable entries (`Key = "value" # comment`)
- Leading comments before hashtable entries
- Trailing comments after hashtable entries
- Comments inside nested hashtables and arrays
- Comments within `.psd1` manifests and PSScriptAnalyzer rules files

**Example**:

```powershell
# Input:
@{
    # Leading comment
    Key = "value" # Inline comment
    Nested = @{
        Item = 1 # Inline nested comment
    }
}

# Output (comments preserved):
@{
    # Leading comment
    Key =
        "value" # Inline comment
    Nested =
        @{
            Item = 1 # Inline nested comment
        }
}
```

**Validation**:

- 20+ comment positioning tests (including nested hashtables & arrays)
- `.psd1` fixtures formatted without losing comment markers
- Manual verification on PowerShell manifest and PSScriptAnalyzer configs

**Impact**: **Resolved** – it is now safe to format `.psd1` files and configuration hashtables with inline comments.

**Tip**: Inline comments use `lineSuffix` handling so they remain attached even when entries wrap across lines.

--------------------------------------------------------------------------------

### 3\. No Custom Formatting Rules (Yet)

**Limitation**: You cannot add custom formatting rules without modifying the plugin.

**Example**: No way to enforce "always use Write-Output instead of echo" during formatting.

**Workaround**: Use linters like PSScriptAnalyzer for custom rules.

**Status**: Not yet implemented.

**TODO (owner: @Nick2bad4u)**: Design and document an extension mechanism for custom formatting rules in a future major version.

--------------------------------------------------------------------------------

### 4\. Hashtable Key Ordering

**Limitation**: Hashtable keys are only sorted if `powershellSortHashtableKeys: true`. Keys maintain insertion order otherwise.

**Example**:

```powershell
# With sorting disabled, order preserved:
@{ Z = 1; A = 2; M = 3 }

# After formatting:
@{ Z = 1; A = 2; M = 3 }
```

**Workaround**: Enable sorting option if you want alphabetical order.

**Impact**: None - this is by design

--------------------------------------------------------------------------------

## Performance Considerations

### 1\. Large Files and Throughput

**Status**: ✅ **GOOD** – Performance validated regularly via `npm run benchmark`.

Recent benchmarks on v2.0.9 (run via `npm run benchmark` on typical developer hardware) show:

- ~3 ms for ~7.4 KB scripts (10 synthetic functions)
- ~10 ms for ~37 KB scripts (50 synthetic functions)
- ~22 ms for ~149 KB scripts (200 synthetic functions)
- Overall throughput of roughly **6.9 MB/sec** for the largest benchmark case

For up-to-date and more detailed numbers, see [`docs/PERFORMANCE.md`](./PERFORMANCE.md).

**Recommendations**:

- ✅ Suitable for format-on-save for typical PowerShell files (well under 500 KB)
- ✅ Use Prettier's `--cache` flag for repeated formatting
- ✅ For very large files (≈1 MB or more), consider pre-commit hooks instead of format-on-save

**Impact**: Very low – performance is more than adequate for day-to-day usage.

--------------------------------------------------------------------------------

### 2\. Memory Usage on Extremely Large Files

**Status**: ✅ **IMPROVED** – No known memory regressions in recent releases.

For typical PowerShell files (<500 KB), memory usage remains well within default Node.js limits.

**For very large files** (>1 MB):

- Consider setting `NODE_OPTIONS="--max-old-space-size=4096"` if you run into memory pressure
- Prefer formatting files individually instead of batching hundreds of large files in a single process

**TODO (owner: @Nick2bad4u)**: Re-run large-file memory profiling on the latest major version and capture updated numbers in `docs/PERFORMANCE.md`.

--------------------------------------------------------------------------------

### 3\. No Incremental Formatting

**Limitation**: Always formats entire file, even if only one line changed.

**Workaround**: Use editor's "format selection" feature for quick edits.

**Status**: Not supported yet.

**TODO (owner: @Nick2bad4u)**: Evaluate incremental formatting support and document feasibility.

--------------------------------------------------------------------------------

## Platform-Specific Issues

### 1\. Line Ending Normalization

**Limitation**: Line endings are normalized to the system default or Prettier's `endOfLine` setting.

**Example**:

```
Windows: CRLF (\r\n)
Linux/Mac: LF (\n)
```

**Workaround**: Set in `.prettierrc`:

```json
{
  "endOfLine": "lf"
}
```

**Impact**: Low - usually desired behavior

--------------------------------------------------------------------------------

### 2\. Path Separators in Strings

**Limitation**: String content is not modified, so path separators are preserved as-is.

**Example**:

```powershell
# Both preserved exactly:
$path1 = "C:\Windows\System32"
$path2 = "C:/Windows/System32"
```

**Workaround**: Use `Join-Path` for cross-platform paths.

**Impact**: None - correct behavior

--------------------------------------------------------------------------------

## Edge Cases

### 1\. Ambiguous Syntax

**Limitation**: Some PowerShell syntax is ambiguous without semantic analysis.

**Example**:

```powershell
# Is this a variable or comparison?
$x-eq  # Variable named "x-eq" or "$x -eq"?
```

**Current Behavior**: Treated as variable `$x-eq` per PowerShell precedence rules.

**Workaround**: Use spaces for clarity: `$x -eq`

**Impact**: Low - matches PowerShell's own behavior

--------------------------------------------------------------------------------

### 2\. Mixing Tabs and Spaces

**Limitation**: If input file mixes tabs and spaces, output will use consistent style based on config.

**Example**:

```powershell
# Input (mixed):
function Test {
→   $x = 1    # Tab
    $y = 2    # Spaces
}

# Output (consistent):
function Test {
  $x = 1
  $y = 2
}
```

**Workaround**: None needed - this is desired behavior.

**Impact**: None - improves consistency

--------------------------------------------------------------------------------

### 3\. Very Deeply Nested Structures

**Limitation**: Structures nested >100 levels may cause stack overflow.

**Example**:

```powershell
# Don't do this:
@{
    A = @{
        B = @{
            # ... 100+ levels ...
        }
    }
}
```

**Workaround**: Refactor to reduce nesting depth.

**Impact**: Very low - rarely encountered

--------------------------------------------------------------------------------

## Not Supported

The following features are **not supported** and not planned:

### 1\. PowerShell 1.0 / 2.0 Syntax

**Reason**: These versions are deprecated and unsupported by Microsoft.

**Minimum Version**: PowerShell 3.0+

--------------------------------------------------------------------------------

### 2\. Reformatting String Content

**Limitation**: Strings, here-strings, and comments are preserved as-is.

**Example**:

```powershell
# JSON in here-string is NOT reformatted:
$json = @"
{"name":"test","value":123}
"@
```

**Workaround**: Use dedicated JSON/XML formatters if needed.

**Status**: Not currently supported.

**TODO (owner: @Nick2bad4u)**: Investigate an opt-in string-content formatter (e.g., JSON/XML) and document trade-offs.

--------------------------------------------------------------------------------

### 3\. Auto-fixing Linting Issues

**Limitation**: This is a formatter, not a linter. It doesn't fix semantic issues.

**Example**:

```powershell
# Won't change Write-Host to Write-Output
Write-Host "message"
```

**Workaround**: Use PSScriptAnalyzer for linting and auto-fixes.

**Note**: Warnings are provided via error detection system

--------------------------------------------------------------------------------

## Comparison with PowerShell's Own Formatter

Feature             | PowerShell Formatter | prettier-plugin-powershell
------------------- | -------------------- | --------------------------
Requires PowerShell | Yes                  | No
Speed               | Moderate             | Fast
Cross-platform      | PowerShell only      | Anywhere Node.js runs
Customization       | Limited              | 10+ options
Consistency         | Good                 | Excellent
Large files         | Slower               | Faster

--------------------------------------------------------------------------------

## Future Improvements

Planned for future versions:

- [ ] Incremental formatting -- TODO (owner: @Nick2bad4u)
- [ ] Plugin architecture for custom rules -- TODO (owner: @Nick2bad4u)
- [ ] Optional string content formatting (JSON/XML) -- TODO (owner: @Nick2bad4u)
- [ ] Semantic analysis integration -- TODO (owner: @Nick2bad4u)
- [ ] PowerShell AST integration -- TODO (owner: @Nick2bad4u)
- [ ] LSP support -- TODO (owner: @Nick2bad4u)
- [ ] Performance improvements for huge files -- TODO (owner: @Nick2bad4u)

--------------------------------------------------------------------------------

## Reporting Limitations

If you encounter a limitation not listed here:

1. Check if it's expected behavior per PowerShell syntax
2. Search [existing issues](https://github.com/Nick2bad4u/prettier-plugin-powershell/issues)
3. Create new issue with:

  - PowerShell version
  - Input code
  - Expected output
  - Actual output
  - Why it's problematic

--------------------------------------------------------------------------------

## Workaround Patterns

### For Large Files

```bash
# Split large file
Split-Path -Parent $file | Split-File -SizeInMB 100

# Format individually
Get-ChildItem *.ps1 | ForEach-Object {
    prettier --write $_.FullName
}
```

### For Complex Structures

```powershell
# Instead of deeply nested:
$config = @{
    Level1 = @{
        Level2 = @{
            Level3 = @{
                # ...
            }
        }
    }
}

# Use builder pattern:
function New-Config {
    $config = @{}
    $config.Level1 = New-Level1Config
    return $config
}
```

### For Performance

```bash
# Use caching
prettier --cache --write "**/*.ps1"

# Parallel processing
find . -name "*.ps1" | parallel -j 4 prettier --write {}

# Incremental in CI
git diff --name-only | grep '\.ps1$' | xargs prettier --check
```

--------------------------------------------------------------------------------

## Version Compatibility

PowerShell Version | Support Status
------------------ | --------------------------------
1.0 - 2.0          | ❌ Not supported
3.0 - 4.0          | ⚠️ Basic support
5.0 - 5.1          | ✅ Full support
6.0 - 7.0          | ✅ Full support
7.1+               | ✅ Full support + latest features

--------------------------------------------------------------------------------

## Getting Help

For questions about limitations:

1. Review this document
2. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
3. Search [GitHub Issues](https://github.com/Nick2bad4u/prettier-plugin-powershell/issues)
4. Ask in Discussions for "Is this possible?" questions
5. File issue for bugs or unexpected behavior
