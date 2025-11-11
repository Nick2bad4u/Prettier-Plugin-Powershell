# Migration Guide

This guide helps you migrate from other PowerShell formatters to prettier-plugin-powershell.

## Table of Contents

- [From PSScriptAnalyzer](#from-psscriptanalyzer)
- [From PowerShell Extension Formatter](#from-powershell-extension-formatter)
- [From Manual Formatting](#from-manual-formatting)
- [Configuration Mapping](#configuration-mapping)
- [Common Issues](#common-issues)

---

## From PSScriptAnalyzer

PSScriptAnalyzer is primarily a linter, but it has some formatting capabilities through `Invoke-Formatter`.

### Key Differences

| Feature | PSScriptAnalyzer | prettier-plugin-powershell |
|---------|------------------|---------------------------|
| Purpose | Linting + Basic Formatting | Advanced Formatting |
| Speed | Slower (requires PowerShell) | Fast (pure JavaScript) |
| Integration | VS Code, CLI | Prettier ecosystem |
| Customization | Limited formatting options | 10+ formatting options |
| Cross-platform | Requires PowerShell | Works anywhere Node.js runs |

### Configuration Migration

**PSScriptAnalyzer** (`PSScriptAnalyzerSettings.psd1`):
```powershell
@{
    Rules = @{
        PSPlaceOpenBrace = @{
            Enable = $true
            OnSameLine = $true
        }
        PSUseConsistentIndentation = @{
            Enable = $true
            IndentationSize = 4
        }
    }
}
```

**Prettier** (`.prettierrc`):
```json
{
  "plugins": ["prettier-plugin-powershell"],
  "powershellBraceStyle": "1tbs",
  "powershellIndentSize": 4
}
```

### Migration Steps

1. **Remove PSScriptAnalyzer formatting**:
   ```json
   // In VS Code settings.json, remove or disable:
   "[powershell]": {
     "editor.formatOnSave": false  // Temporarily disable
   }
   ```

2. **Install Prettier plugin**:
   ```bash
   npm install --save-dev prettier prettier-plugin-powershell
   ```

3. **Configure Prettier**:
   ```json
   {
     "plugins": ["prettier-plugin-powershell"],
     "powershellIndentSize": 4,
     "powershellBraceStyle": "1tbs"
   }
   ```

4. **Update VS Code settings**:
   ```json
   "[powershell]": {
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.formatOnSave": true
   }
   ```

5. **Format your codebase**:
   ```bash
   prettier --write "**/*.{ps1,psm1,psd1}"
   ```

---

## From PowerShell Extension Formatter

The VS Code PowerShell extension has built-in formatting.

### Key Differences

| Feature | PowerShell Extension | prettier-plugin-powershell |
|---------|---------------------|---------------------------|
| Dependency | Requires PowerShell | Standalone |
| Speed | Moderate | Fast |
| Customization | VS Code settings only | Prettier config files |
| Git hooks | Manual setup | Easy with husky/lint-staged |

### Settings Migration

**PowerShell Extension** (VS Code `settings.json`):
```json
{
  "powershell.codeFormatting.openBraceOnSameLine": true,
  "powershell.codeFormatting.whitespaceAroundOperator": true,
  "powershell.codeFormatting.indentationSize": 4,
  "powershell.codeFormatting.alignPropertyValuePairs": true
}
```

**Prettier** (`.prettierrc`):
```json
{
  "plugins": ["prettier-plugin-powershell"],
  "powershellBraceStyle": "1tbs",
  "powershellIndentSize": 4,
  "powershellSortHashtableKeys": false
}
```

### Migration Steps

1. **Document current settings**:
   - Export your PowerShell extension formatting settings

2. **Install Prettier**:
   ```bash
   npm install --save-dev prettier prettier-plugin-powershell
   ```

3. **Create Prettier config** matching your preferences

4. **Test on a single file**:
   ```bash
   prettier --write test-file.ps1
   ```

5. **Verify output** matches your expectations

6. **Disable PowerShell extension formatting**:
   ```json
   {
     "powershell.codeFormatting.preset": "Custom",
     "[powershell]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     }
   }
   ```

---

## From Manual Formatting

If you've been formatting PowerShell code manually, Prettier will enforce consistency automatically.

### Benefits

- **Consistency**: No more debates about style
- **Speed**: Format entire codebase in seconds
- **Automation**: Format on save, in git hooks
- **Integration**: Works with your existing tools

### Getting Started

1. **Install**:
   ```bash
   npm install --save-dev prettier prettier-plugin-powershell
   ```

2. **Choose your style** (create `.prettierrc`):
   ```json
   {
     "plugins": ["prettier-plugin-powershell"],
     "powershellIndentSize": 2,
     "powershellBraceStyle": "1tbs",
     "powershellTrailingComma": "multiline"
   }
   ```

3. **Format existing code**:
   ```bash
   prettier --write "src/**/*.ps1"
   ```

4. **Set up automation**:
   - Editor integration (format on save)
   - Git hooks (format before commit)
   - CI checks (enforce formatting)

---

## Configuration Mapping

### Brace Styles

**Other Formatters**:
- K&R / "Same Line" / "OpenBraceOnSameLine"

**Prettier**:
```json
{ "powershellBraceStyle": "1tbs" }
```

---

**Other Formatters**:
- Allman / "New Line" / "OpenBraceOnNewLine"

**Prettier**:
```json
{ "powershellBraceStyle": "allman" }
```

### Indentation

**Other Formatters**:
- "IndentationSize: 4" / "TabSize: 4"

**Prettier**:
```json
{
  "powershellIndentSize": 4,
  "powershellIndentStyle": "spaces"
}
```

---

**Other Formatters**:
- "UseTab: true" / "InsertSpaces: false"

**Prettier**:
```json
{
  "powershellIndentStyle": "tabs"
}
```

### Line Width

**Other Formatters**:
- "MaximumLineLength: 120"

**Prettier**:
```json
{ "powershellLineWidth": 120 }
```

---

## Common Issues

### Issue: Different output than expected

**Cause**: Different default settings

**Solution**: Review and adjust your `.prettierrc`:
```json
{
  "plugins": ["prettier-plugin-powershell"],
  "powershellIndentSize": 4,
  "powershellBraceStyle": "allman",
  "powershellBlankLineAfterParam": true
}
```

### Issue: Formatting breaks on save

**Cause**: VS Code using wrong formatter

**Solution**: Set Prettier as default for PowerShell:
```json
{
  "[powershell]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Issue: Some files not formatted

**Cause**: Files might be in `.prettierignore`

**Solution**: Check your `.prettierignore`:
```
# Don't ignore .ps1 files
!*.ps1
!**/*.ps1
```

### Issue: Formatting too slow

**Cause**: Not using cache

**Solution**: Enable Prettier cache:
```bash
prettier --cache --write "**/*.ps1"
```

Or in VS Code:
```json
{
  "prettier.useEditorConfig": false
}
```

---

## Gradual Migration Strategy

For large codebases, migrate gradually:

### Phase 1: New Files Only

```bash
# Only format files created this month
git diff --name-only --diff-filter=A origin/main |
  grep '\.ps1$' |
  xargs prettier --write
```

### Phase 2: Modified Files

```bash
# Format files modified recently
git diff --name-only HEAD~5 |
  grep '\.ps1$' |
  xargs prettier --write
```

### Phase 3: Directory by Directory

```bash
# Format one module at a time
prettier --write "src/module1/**/*.ps1"
git commit -m "Format module1"

prettier --write "src/module2/**/*.ps1"
git commit -m "Format module2"
```

### Phase 4: Full Codebase

```bash
# Format everything
prettier --write "**/*.{ps1,psm1,psd1}"
git commit -m "Format entire codebase with Prettier"
```

---

## Pre-commit Hook Setup

Automatically format files before commit:

### Using Husky + lint-staged

1. **Install**:
   ```bash
   npm install --save-dev husky lint-staged
   npx husky install
   ```

2. **Configure** (`package.json`):
   ```json
   {
     "lint-staged": {
       "*.{ps1,psm1,psd1}": [
         "prettier --write"
       ]
     }
   }
   ```

3. **Add hook**:
   ```bash
   npx husky add .husky/pre-commit "npx lint-staged"
   ```

---

## CI Integration

### GitHub Actions

```yaml
name: Format Check
on: [pull_request]

jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx prettier --check "**/*.{ps1,psm1,psd1}"
```

### Azure Pipelines

```yaml
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
  - script: npm ci
  - script: npx prettier --check "**/*.{ps1,psm1,psd1}"
    displayName: 'Check formatting'
```

---

## Verification Checklist

After migration, verify:

- [ ] All PowerShell files format without errors
- [ ] Output matches your style preferences
- [ ] Editor integration works (format on save)
- [ ] Git hooks run correctly
- [ ] CI pipeline passes
- [ ] Team members can format successfully
- [ ] Documentation updated

---

## Getting Help

If you encounter issues during migration:

1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review [Formatting Options](FORMATTING_OPTIONS.md)
3. Search existing [GitHub Issues](https://github.com/Nick2bad4u/prettier-plugin-powershell/issues)
4. Create a new issue with:
   - Current formatter configuration
   - Prettier configuration
   - Example input/output
   - Expected vs actual behavior

---

## Rollback Plan

If you need to rollback:

1. **Remove Prettier**:
   ```bash
   npm uninstall prettier prettier-plugin-powershell
   ```

2. **Re-enable previous formatter** in VS Code settings

3. **Reformat** with previous tool if needed

4. **Document issues** to help improve the migration guide
