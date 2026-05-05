---
name: "Benchmarks-Folder-Guidelines"
description: "Guidance for performance benchmarks under benchmark/ and benchmarks/."
applyTo: "benchmark/**, benchmarks/**"
---

# Benchmarks (`benchmark/` and `benchmarks/`) Guidelines

Treat benchmark code as performance instrumentation, not product logic.

## Folder roles

- `benchmark/`
  - Usually holds focused rule-benchmark configuration and handcrafted stress cases.
  - Good for isolated, single-rule investigations.
- `benchmarks/`
  - Usually holds broader corpus runners, stats aggregation, fixture sets, and benchmark documentation.
  - Good for regression tracking across presets, multiple rules, or whole-config workloads.

If a copied repository uses different names, preserve the same separation of concerns: focused micro/isolated benchmarks vs broader suite runners.

## Benchmark philosophy

Benchmarks should be:

- meaningful
- reproducible
- representative of real lint workloads
- stable enough for regression comparison

Avoid toy benchmarks unless you are isolating one hot path on purpose.

## What to measure

Prefer benchmark scenarios that reveal real maintenance risk:

- typed vs untyped linting cost
- invalid corpus vs valid corpus cost
- fix-disabled vs fix-enabled cost
- single-rule hot-path regressions
- preset/config-level regressions
- parse time, rule time, fix time, and message counts when available

## Benchmark inputs

- Prefer curated fixture corpora over synthetic one-line snippets.
- Reuse real test fixtures when they represent actual user code patterns.
- Keep stress cases small enough to understand but large enough to expose scaling behavior.
- Do not use machine-specific absolute paths or environment assumptions.

## Benchmark configuration

- Keep iteration and warmup counts high enough for useful comparisons.
- Do not quietly lower benchmark rigor just to make CI or local runs faster.
- If the repo supports a lighter local smoke mode, make that explicit rather than weakening the default benchmark.
- Name scenarios clearly so reports are self-explanatory.

## Rule benchmarks

- Prefer benchmarking source rule modules directly when the runner supports it.
- Document whether the benchmark targets source files, built output, or exported plugin entrypoints.
- If a rule has expensive fixes or typed analysis, benchmark both detection and fix paths when relevant.

## Outputs and generated data

- Write benchmark reports to the repository's designated generated-output location.
- Do not hand-edit generated benchmark JSON or HTML outputs.
- If a benchmark runner emits comparison artifacts, keep the format stable so diffs are useful over time.

## Interpreting regressions

- A benchmark should help answer *what got slower* and *why*.
- Prefer scenario sets that make it easy to attribute regressions to:
  - one rule
  - one preset
  - typed analysis
  - autofix generation
  - import manipulation

Benchmark code is successful when it makes performance regressions obvious, attributable, and repeatable.
