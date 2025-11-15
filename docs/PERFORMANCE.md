# Performance Tuning Guide

This guide helps you optimize the performance of prettier-plugin-powershell for your use case.

> Unless stated otherwise, CLI commands assume Prettier can resolve the plugin via your configuration or `--plugin=prettier-plugin-powershell`.

## Benchmarking

### Current Performance Baseline

Based on `npm run benchmark` (captured November 15, 2025 on Node.js 20.11):

- **Small files (≈7.4 KB)**: ~3.3 ms
- **Medium files (≈37.1 KB)**: ~10.4 ms
- **Large files (≈74.3 KB)**: ~10.8 ms
- **Extra large files (≈148.9 KB)**: ~21 ms
- **Throughput**: ~7.1 MB/sec across the largest batch (200 synthetic functions)

### Running Benchmarks

All CLI snippets assume Prettier can resolve the plugin via your configuration or via `--plugin=prettier-plugin-powershell` (shown below).

```bash
# Run the built-in benchmark
npm run benchmark

# Benchmark a single file
time prettier --plugin=prettier-plugin-powershell --parser powershell large-script.ps1

# Profile with Node.js
node --prof $(which prettier) --parser powershell --plugin=prettier-plugin-powershell script.ps1
node --prof-process isolate-*.log > profile.txt
```

## Optimization Strategies

### 1\. File Organization

**Split Large Files**

Instead of one 1000-line file:

```powershell
# ❌ monolith.ps1 (1000 lines)
```

Use multiple focused modules:

```powershell
# ✅ functions/user.psm1 (200 lines)
# ✅ functions/database.psm1 (150 lines)
# ✅ functions/api.psm1 (180 lines)
```

**Benefits:**

- Faster individual file formatting
- Better caching
- Parallel processing possible

### 2\. Editor Integration

**VS Code Settings**

Optimize formatting in VS Code:

```json
{
  // Format on save for fast feedback
  "editor.formatOnSave": true,

  // Only format modified lines (when supported)
  "editor.formatOnSaveMode": "modifications",

  // Delay formatting to avoid lag while typing
  "editor.formatOnType": false,

  // Use cache for faster repeated formatting
  "prettier.useEditorConfig": false,

  // Limit timeout for large files
  "editor.formatOnSaveTimeout": 3000
}
```

**Exclude Unnecessary Files**

`.prettierignore`:

```
# Don't format generated files
*.generated.ps1
out/
dist/

# Don't format vendor code
vendor/
third-party/

# Don't format minified code
*.min.ps1
```

### 3\. CI/CD Optimization

**Format Only Changed Files**

```bash
# In pre-commit hook
git diff --cached --name-only --diff-filter=ACMR |
  grep '\.ps1$' |
  xargs prettier --write

# In CI
git diff --name-only origin/main |
  grep '\.ps1$' |
  xargs prettier --check
```

**Use Caching**

```bash
# Prettier's built-in cache
prettier --cache --cache-location=.cache/.prettier-cache "**/*.ps1"
```

**Parallel Processing**

```bash
# Format multiple files in parallel with xargs (4 workers)
find . -name "*.ps1" -print0 | xargs -0 -P 4 -n 1 prettier --write

# Or use GNU parallel if available
find . -name "*.ps1" | parallel prettier --write {}
```

### 4\. Node.js Optimization

**Memory Configuration**

```bash
# Increase heap size for large codebases
export NODE_OPTIONS="--max-old-space-size=4096"

# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=4096 --gc-interval=100"
```

**Use Latest Node.js**

```bash
# Check version
node --version

# Upgrade to latest LTS (significant performance improvements)
nvm install --lts
nvm use --lts
```

--------------------------------------------------------------------------------

## Configuration Optimization

### Minimize Complex Options

Some options are more computationally expensive:

**Fast Options:**

```json
{
  "powershellIndentSize": 4,
  "powershellIndentStyle": "spaces",
  "powershellBraceStyle": "1tbs"
}
```

**Slower Options:**

```json
{
  // Sorting requires extra processing
  "powershellSortHashtableKeys": true
}
```

### Optimal Settings for Speed

```json
{
  "powershellIndentSize": 4,
  "powershellTrailingComma": "none",
  "powershellSortHashtableKeys": false,
  "powershellBlankLinesBetweenFunctions": 1,
  "powershellBlankLineAfterParam": true,
  "powershellBraceStyle": "1tbs",
  "powershellLineWidth": 120,
  "powershellPreferSingleQuote": false,
  "powershellKeywordCase": "lower"
}
```

--------------------------------------------------------------------------------

## Profiling and Monitoring

### Profile Formatting Time

```javascript
// profile.mjs
import { readFileSync } from 'node:fs';
import prettier from 'prettier';
import plugin from 'prettier-plugin-powershell';

const source = readFileSync('script.ps1', 'utf8');

console.time('format');
await prettier.format(source, {
  parser: 'powershell',
  plugins: [plugin],
  filepath: 'script.ps1'
});
console.timeEnd('format');
```

> Save as `profile.mjs` (or any ESM file) and run with `node profile.mjs` on Node.js 18+ (top-level `await` is supported).

### Monitor Memory Usage

```bash
# Monitor memory during formatting (POSIX)
/usr/bin/time -v prettier --plugin=prettier-plugin-powershell --write "**/*.ps1"

# Windows PowerShell
Measure-Command { npx prettier --plugin prettier-plugin-powershell --write "**/*.ps1" }
```

### Identify Slow Files

```bash
# Find files that take >1 second to format
for file in **/*.ps1; do
  time=$(time prettier --plugin=prettier-plugin-powershell --write "$file" 2>&1 | grep real)
  echo "$time $file"
done | sort -rn | head -10
```

--------------------------------------------------------------------------------

## Caching Strategies

### Prettier Cache

```bash
# Enable cache (stores in node_modules/.cache/prettier)
prettier --cache --write "**/*.ps1"

# Custom cache location
prettier --cache --cache-location=.cache/prettier "**/*.ps1"

# Cache strategies
prettier --cache --cache-strategy content "**/*.ps1"  # Hash file content
prettier --cache --cache-strategy metadata "**/*.ps1" # Use file metadata
```

### Git Hooks with Cache

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ps1,psm1,psd1}": [
      "prettier --cache --write"
    ]
  }
}
```

--------------------------------------------------------------------------------

## Large Codebase Strategies

### Incremental Adoption

**Phase 1: New Files Only**

```bash
# Format only new files created this month
git ls-files --others --exclude-standard '*.ps1' |
  xargs prettier --write
```

**Phase 2: Modified Files**

```bash
# Format files modified recently
git diff --name-only HEAD~10 |
  grep '\.ps1$' |
  xargs prettier --write
```

**Phase 3: Full Codebase**

```bash
# Format everything (do once, then maintain)
prettier --write "**/*.{ps1,psm1,psd1}"
```

### Directory-by-Directory

```bash
# Format one directory at a time
for dir in src/{module1,module2,module3}; do
  prettier --write "$dir/**/*.ps1"
  git commit -am "Format: $dir"
done
```

--------------------------------------------------------------------------------

## Performance Monitoring

### Track Formatting Time Over Time

```bash
#!/bin/bash
# perf-track.sh

echo "Date,Files,Time" > perf-log.csv

for i in {1..10}; do
  files=$(find . -name "*.ps1" | wc -l)
  time=$( (time prettier --check "**/*.ps1" 2>&1) | grep real | awk '{print $2}')
  echo "$(date +%Y-%m-%d),$files,$time" >> perf-log.csv
done
```

### Set Performance Budgets

```yaml
# .github/workflows/performance.yml
name: Performance Check
on: [pull_request]

jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v4.1.6
      - uses: actions/setup-node@2028fbc5c25fe9cf00d9f06a71cc4710d4507903 # v4.0.4
        with:
          node-version: '20'
      - run: npm ci
      - name: Benchmark
        run: |
          npm run benchmark > benchmark.txt
          # Fail if throughput drops below threshold
          throughput=$(grep -i "throughput" benchmark.txt | awk '{print $2}')
          if (( $(echo "$throughput < 6000" | bc -l) )); then
            echo "Performance regression detected!"
            exit 1
          fi
```

--------------------------------------------------------------------------------

## Troubleshooting Performance Issues

### Slow Formatting

1. **Check file size**: Files >500KB may be slow

  ```bash
  find . -name "*.ps1" -size +500k
  ```

2. **Profile the specific file**:

  ```bash
  node --prof $(which prettier) --plugin=prettier-plugin-powershell --write slow-file.ps1
  node --prof-process isolate-*.log
  ```

3. **Check for pathological cases**:

  - Extremely deep nesting (>50 levels)
  - Very long lines (>1000 characters)
  - Thousands of hashtable entries

### High Memory Usage

1. **Process files in batches**:

  ```bash
  ls *.ps1 | xargs -n 10 prettier --write
  ```

2. **Increase Node.js heap**:

  ```bash
  NODE_OPTIONS="--max-old-space-size=8192" prettier --write "**/*.ps1"
  ```

3. **Monitor with heapdump**:

  ```javascript
  const heapdump = await import('heapdump');
  const api = heapdump.default ?? heapdump;
  // Take snapshot before/after formatting
  await api.writeSnapshot('./before.heapsnapshot');
  ```

--------------------------------------------------------------------------------

## Best Practices Summary

✅ **Do:**

- Use caching (`--cache`)
- Format only changed files in CI
- Process files in parallel when possible
- Keep individual files under 100KB
- Profile before optimizing
- Use latest Node.js LTS

❌ **Don't:**

- Format all files on every commit
- Keep formatting 1000+ line files regularly
- Use slow options unless needed
- Format generated/vendor code
- Ignore performance budgets

--------------------------------------------------------------------------------

## Performance Checklist

- [ ] Benchmarked current performance
- [ ] Added `.prettierignore` for unnecessary files
- [ ] Enabled caching in CI
- [ ] Configured parallel processing
- [ ] Split large files into modules
- [ ] Set up incremental formatting
- [ ] Monitoring performance over time
- [ ] Using latest Node.js LTS
- [ ] Optimized editor integration
- [ ] Set performance budgets in CI

--------------------------------------------------------------------------------

## Expected Performance by File Size

File Size  | Format Time | Notes
---------- | ----------- | ------------------
< 10 KB    | < 5ms       | Instant
10-50 KB   | 5-15ms      | Very fast
50-100 KB  | 15-30ms     | Fast
100-200 KB | 30-60ms     | Acceptable
200-500 KB | 60-150ms    | Consider splitting
> 500 KB   | > 150ms     | Should split

If your performance is significantly worse than these benchmarks, check for:

- Old Node.js version
- Insufficient memory
- Slow disk I/O
- Pathological code patterns

--------------------------------------------------------------------------------

## Support

For performance issues not covered here:

1. Run `npm run benchmark` and share results
2. Profile with `node --prof`
3. Create an issue with profiling data
4. Include file size and system specs
