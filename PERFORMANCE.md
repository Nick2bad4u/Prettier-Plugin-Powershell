# Performance Improvements

## Persistent PowerShell Process for Syntax Validation

### Overview

Implemented a persistent PowerShell process for syntax validation that eliminates the overhead of spawning a new `pwsh` process for each validation check.

### Performance Impact

- **Before**: 1000+ seconds for full test suite with unlimited validation
- **After**: ~21 seconds for full test suite with unlimited validation
- **Speedup**: ~50x faster

### How It Works

#### Stream Mode Protocol

The validation script (`tests/utils/validate-syntax.ps1`) now supports a `-StreamMode` flag that enables continuous validation:

1. Node.js spawns a single PowerShell process at startup
2. Scripts are sent via stdin using a length-prefixed binary protocol:

  - 4 bytes: total message length
  - 4 bytes: identifier length
  - N bytes: identifier string (UTF-8)
  - M bytes: script content (UTF-8)

3. PowerShell validates each script and sends back results:

  - 4 bytes: response length
  - N bytes: response ("OK\n" or "ERROR\n

    <error message="">")</error>

#### Benefits

- **Single process**: No spawn overhead for each validation
- **Async/await**: Properly integrated with Node.js event loop
- **Backward compatible**: Legacy single-script mode still supported
- **Unlimited checks by default**: Now practical to validate every formatted output

### Configuration

Environment variables:

- `POWERSHELL_VERIFY_SYNTAX=0`: Disable syntax validation entirely
- `POWERSHELL_MAX_SYNTAX_CHECKS=-1`: Unlimited checks (default)
- `POWERSHELL_MAX_SYNTAX_CHECKS=N`: Limit to N checks
- `POWERSHELL_SYNTAX_TRACE=1`: Enable debug logging

### Known Limitations

Some PowerShell edge cases are skipped from validation:

- `workflow` blocks (not supported in PowerShell 7+) - **cannot fix**
- Intentionally broken scripts in error recovery tests - **cannot fix**
- Module imports that reference non-existent modules - **cannot fix**
- BOM (`\uFEFF`) immediately followed by code on same line - **known PowerShell parser quirk**

### Fixed Issues

- ✅ **`$_` variable handling**: Fixed tokenizer to correctly handle variables starting with `$_` followed by other characters (e.g., `$_test`, `$_myVar`). The tokenizer now distinguishes between the special `$_` variable and user-defined variables that start with `$_`.

### Files Changed

- `tests/utils/powershell.ts`: Persistent process implementation
- `tests/utils/validate-syntax.ps1`: Stream mode support
- `tests/utils/format-and-assert.ts`: Async validation calls
- `tests/parser.property.test.ts`: Async validation with edge case handling
- `tests/weird-files.property.test.ts`: Import isPowerShellParsable
- `tests/advanced-features.test.ts`: Skip workflow validation
- `tests/advanced-printer.test.ts`: Skip error recovery validation
- `tests/version-compatibility.test.ts`: Skip module import validation

### Testing

The full Vitest suite passes with unlimited PowerShell syntax validation enabled.
