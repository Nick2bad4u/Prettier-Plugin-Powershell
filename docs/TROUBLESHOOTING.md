# Troubleshooting Guide

This guide helps you resolve common issues when using prettier-plugin-powershell.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Formatting Issues](#formatting-issues)
- [Performance Issues](#performance-issues)
- [Integration Issues](#integration-issues)
- [Known Limitations](#known-limitations)
- [Getting Help](#getting-help)

---

## Installation Issues

### Plugin Not Found

**Problem:** Prettier doesn't recognize the PowerShell plugin.

**Solution:**
1. Ensure the plugin is installed:
   ```bash
   npm install --save-dev prettier-plugin-powershell
   ```

2. Verify the plugin is listed in your `package.json`:
   ```json
   {
     "devDependencies": {
       "prettier-plugin-powershell": "^2.0.0"
     }
   }
   ```

3. If using Prettier v3+, explicitly list the plugin in your config:
   ```json
   {
     "plugins": ["prettier-plugin-powershell"]
   }
   ```

### Version Conflicts

**Problem:** Prettier version incompatibility errors.

**Solution:**
- This plugin requires Prettier 3.0.0 or higher
- Check your Prettier version: `npx prettier --version`
- Update if needed: `npm install --save-dev prettier@latest`

---

## Formatting Issues

### File Not Being Formatted

**Problem:** PowerShell files are ignored by Prettier.

**Solution:**
1. Ensure the file has a `.ps1`, `.psm1`, or `.psd1` extension
2. Check that the file is not excluded in `.prettierignore`
3. Explicitly specify the parser:
   ```bash
   prettier --parser powershell script.ps1
   ```

### Incorrect Formatting

**Problem:** Code is formatted incorrectly or breaks after formatting.

**Solution:**
1. **Check for syntax errors**: The formatter works best with valid PowerShell
2. **Report edge cases**: If the formatter breaks valid code, please report it
3. **Use `--%` stop-parsing token** for native commands:
   ```powershell
   cmd.exe --% /c dir /s
   ```

### Comments Being Lost

**Problem:** Comments disappear after formatting.

**Solution:**
- **Block comments should be properly closed**:
  ```powershell
  <# This is correct #>

  # Not this: <# Missing closing
  ```
- Inline comments are preserved on the same line
- File an issue if you find comments being removed incorrectly

### Hashtables Not Aligning

**Problem:** Hashtable keys aren't aligned as expected.

**Solution:**
- Enable key sorting if needed:
  ```json
  {
    "powershellSortHashtableKeys": true
  }
  ```
- Alignment depends on the `powershellTrailingComma` option
- Very long keys may prevent alignment

---

## Performance Issues

### Slow Formatting on Large Files

**Problem:** Formatting takes too long on files over 100KB.

**Solution:**
1. **Profile the performance**:
   ```bash
   npm run benchmark
   ```

2. **Split large files** into modules if possible

3. **Use caching** in your editor/CI:
   ```bash
   prettier --cache script.ps1
   ```

4. **Expected performance**: ~6.8 MB/sec on typical hardware

### High Memory Usage

**Problem:** Node.js process uses excessive memory.

**Solution:**
1. Increase Node.js memory limit:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. Format files individually instead of all at once

3. Check for memory leaks with `--trace-gc`

---

## Integration Issues

### VS Code Integration

**Problem:** Formatter doesn't work in VS Code.

**Solution:**
1. Install the Prettier extension: `esbenp.prettier-vscode`

2. Set PowerShell as a supported language:
   ```json
   {
     "[powershell]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode",
       "editor.formatOnSave": true
     }
   }
   ```

3. Reload VS Code after installing the plugin

### Git Hooks

**Problem:** Pre-commit hook fails with the formatter.

**Solution:**
1. Use `lint-staged` for efficient formatting:
   ```json
   {
     "lint-staged": {
       "*.{ps1,psm1,psd1}": [
         "prettier --write"
       ]
     }
   }
   ```

2. Ensure the plugin is in `devDependencies`, not `dependencies`

3. Run `npm install` in your CI environment

### CI/CD Integration

**Problem:** Formatter fails in CI pipeline.

**Solution:**
1. **Check for platform differences**: Ensure line endings are consistent
2. **Use `--check` for validation**:
   ```bash
   prettier --check "**/*.ps1"
   ```
3. **Cache node_modules** to speed up CI

---

## Known Limitations

### Limited Features

Some PowerShell features have limited support:

1. **Complex DSC configurations**: Very complex DSC blocks may not format optimally
2. **Workflows**: Advanced workflow features are parsed but may have basic formatting
3. **Dynamic keywords**: Dynamically created keywords aren't recognized

### Edge Cases

Known edge cases that may format unexpectedly:

1. **Variables with operators in names**: `$x-eq` is ambiguous (variable or comparison?)
2. **Here-strings with unusual content**: Some escape sequences may be preserved as-is
3. **Very deeply nested structures**: May exceed stack limits (>100 levels)

### Not Implemented

Features not yet implemented:

1. **Semantic formatting**: No understanding of cmdlet semantics
2. **Cross-file analysis**: Each file is formatted independently
3. **Auto-fix for common issues**: No automatic code improvements (yet)

---

## Debugging

### Enable Verbose Logging

Get detailed information about what the formatter is doing:

```bash
# Set debug environment variable
DEBUG=prettier-plugin-powershell prettier script.ps1
```

### Inspect AST

See how the parser interprets your code:

```javascript
const prettier = require('prettier');
const { parsePowerShell } = require('prettier-plugin-powershell');

const ast = parsePowerShell('$x = 1', {});
console.log(JSON.stringify(ast, null, 2));
```

### Check Token Output

See how the tokenizer breaks down your code:

```javascript
const { tokenize } = require('prettier-plugin-powershell');
const tokens = tokenize('$x = 1');
console.log(tokens);
```

---

## Common Error Messages

### "Unexpected token"

**Cause:** Parser encountered syntax it doesn't understand.

**Fix:** Check your PowerShell syntax is valid. Run `powershell -File script.ps1` to verify.

### "Cannot read property 'type' of undefined"

**Cause:** Parser failed to create a valid AST node.

**Fix:** This is likely a bug. Please report with a minimal reproduction case.

### "Maximum call stack size exceeded"

**Cause:** Code has extremely deep nesting.

**Fix:** Refactor to reduce nesting depth. Consider extracting functions.

---

## Getting Help

### Before Filing an Issue

1. **Update to the latest version**:
   ```bash
   npm update prettier-plugin-powershell
   ```

2. **Create a minimal reproduction**:
   - Reduce your code to the smallest example that shows the problem
   - Test with default options first

3. **Check existing issues**: Your problem may already be reported

### Filing a Bug Report

Include these details in your issue:

- **Plugin version**: `npm list prettier-plugin-powershell`
- **Prettier version**: `npx prettier --version`
- **Node version**: `node --version`
- **Operating system**: Windows/Linux/macOS
- **Input code**: Minimal example that reproduces the issue
- **Expected output**: What you expected to see
- **Actual output**: What actually happened
- **Configuration**: Your `.prettierrc` if using custom options

### Example Bug Report Template

```markdown
## Bug Description
Brief description of the issue

## Input Code
\`\`\`powershell
# Minimal reproduction case
$x = 1
\`\`\`

## Expected Output
\`\`\`powershell
$x = 1
\`\`\`

## Actual Output
\`\`\`powershell
$x=1
\`\`\`

## Environment
- Plugin version: 2.0.3
- Prettier version: 3.0.0
- Node version: 20.0.0
- OS: Windows 11
- Configuration: Default
```

---

## Performance Tips

1. **Use `.prettierignore`**: Exclude generated files, vendor code, etc.
2. **Format incrementally**: Format changed files only in CI
3. **Cache formatting results**: Use `--cache` flag
4. **Parallelize formatting**: Use tools like `prettier --parallel`
5. **Profile first**: Run benchmark before optimizing

---

## Additional Resources

- [GitHub Issues](https://github.com/Nick2bad4u/prettier-plugin-powershell/issues)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [PowerShell Documentation](https://docs.microsoft.com/powershell/)
