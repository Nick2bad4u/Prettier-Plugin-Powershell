# Formatting Parity with PSScriptAnalyzer

- [x] AvoidLongLines — add printWidth awareness (here-strings, pipelines, nested expressions) and expose configurable wrap width (default 120)
- [x] PlaceOpenBrace & PlaceCloseBrace — support a configurable `powershellBraceStyle` (same-line vs next-line) and apply across functions/script blocks
- [x] UseConsistentIndentation — tighten spacing for nested script blocks and pipeline continuations
- [x] UseConsistentWhitespace — refine spacing around operators, separators, and commas; eliminate double spaces
- [x] AvoidSemicolonsAsLineTerminators — strip trailing `;` tokens at end-of-line during printing
- [x] AvoidUsingDoubleQuotesForConstantString — optional single-quote preference with safety around interpolation/escapes
- [x] MisleadingBacktick — detect explicit backtick line continuations and convert to soft wraps
- [x] UseCorrectCasing — optional keyword casing normaliser (e.g. `lower`, `pascal`)
- [x] AvoidUsingCmdletAliases — map known aliases to canonical cmdlet names when printing
- [x] AvoidUsingWriteHost (and similar) — optional rewrite or diagnostic hook for disallowed cmdlets
