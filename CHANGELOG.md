<!-- markdownlint-disable -->
<!-- eslint-disable markdown/no-missing-label-refs -->
# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-04-20


- <b>Commit Range: ➡️</b> [`36b69d0...9c3feaa`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/36b69d076f27f9a8bca9b217ec22880eecdf8074...9c3feaa1e483cae8dc2df10762971550e12c26af "View full commit range on GitHub")



### ✨ Features

- [`61d8887`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/61d8887779163cd0f514a3d9bb96d2fa9e781e78 "📝 Diff: 18 files, ++251 | --83") — ✨ [feat] Enhance comment handling and formatting in PowerShell scripts

- 🛠️ [fix] Modify `createTextNode` to preserve comment origin by prepending `#` to comment values.

- 🛠️ [fix] Update `printArray` to treat comment-only expressions as trailing comments on the previous element, preserving inline comment intent.

- 📝 [test] Add tests for mixed documentation styles (TSDoc/JSDoc) to ensure comments are preserved correctly.

- 📝 [test] Introduce multilingual comments and strings test to validate handling of various languages in comments.

- 📝 [test] Add tests for right-to-left markers and zero-width characters to ensure proper formatting and output.

- 🎨 [style] Refactor color array definitions in test files to include inline comments for better readability.

- 🧪 [test] Implement regression tests to ensure inline color comments are preserved in ANSI palette scripts.


- [`89cadae`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/89cadaed3ff6b07d6da40b152a357e2957929363 "📝 Diff: 13 files, ++347 | --311") — ✨ [feat] Enhance PowerShell formatting and ignore rules

- 🛠️ [fix] Add .prettierignore to exclude specific test files and utility scripts from formatting

- 🎨 [style] Update .prettierrc.json with new options for jsdoc formatting and line wrapping

- 🎨 [style] Refactor various test files for consistent formatting and improved readability

- 🛠️ [fix] Adjust validate-syntax.ps1 for better error handling and streamlined logic

- 📝 [docs] Revise README.md for format-and-assert helper to clarify usage and options


- [`92c5995`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/92c59955bba0c6e32fa3e0650f616e3ef7241769 "📝 Diff: 14 files, ++352 | --64") — ✨ [feat] Enhance PowerShell formatting options with presets

- Introduced `powershellPreset` option to apply predefined formatting preferences.

- Default preset mirrors PowerShell's `Invoke-Formatter`, including:
  
- 4-space indentation
  
- No trailing commas
  
- 1tbs brace style
  
- Lowercase keywords
  
- Specific blank line heuristics

- Updated `resolveOptions` to apply preset defaults while allowing explicit overrides.

📝 [docs] Update documentation for new formatting options

- Added section on `Presets` in FORMATTING_OPTIONS.md.

- Updated default values and examples for `powershellIndentSize`, `powershellTrailingComma`, `powershellBlankLineAfterParam`, and `powershellLineWidth`.

- Included examples for using the `invoke-formatter` preset.

🧪 [test] Add property-based tests for new preset functionality

- Created tests to ensure `invoke-formatter` preset applies correct defaults.

- Verified that explicit options can override preset defaults.

🛠️ [fix] Correct default values in options and performance documentation

- Adjusted default values for `powershellIndentSize`, `powershellTrailingComma`, `powershellBlankLineAfterParam`, and `powershellLineWidth` in relevant files.


- [`7fa3ba7`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/7fa3ba78798fac8913657046d3a18a0ce8ed035d "📝 Diff: 8 files, ++330 | --99") — Implement persistent PowerShell process for 50x faster syntax validation


- [`93fee1f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/93fee1fa371bc6aebd3741463ede3f39adc5b4c6 "📝 Diff: 2 files, ++175 | --0") — ✨ [feat] Add BeastMode agent and Prettier-PowerShell plugin instructions


- Introduce a new BeastMode agent configuration with detailed capabilities for unit testing, fuzz testing, TSDoc improvements, and task management.

- Create comprehensive instructions for the Prettier-PowerShell plugin, outlining the agent's role, architecture, code quality standards, and best practices for development.

- Emphasize the importance of thorough planning, code quality, and adherence to PowerShell standards in the plugin's implementation.


- [`b7f9123`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/b7f9123dbeb4e076efeb4f67922486bfe88701ef "📝 Diff: 41 files, ++897 | --42") — ✨ [feat] Introduce format-and-assert helpers for PowerShell formatting tests

- 🆕 Add `format-and-assert.js` utility to encapsulate formatting and assertion logic for PowerShell scripts.

- 🔄 Implement `formatAndAssert` to format scripts and assert valid parsing.

- 🔄 Implement `formatAndAssertRoundTrip` to ensure idempotent formatting.

- 📝 Update tests to use `formatAndAssert` and `formatAndAssertRoundTrip` instead of direct `prettier.format` calls.

- 🧪 Add tests for `format-and-assert` helpers to validate their functionality.

- 🧹 Enforce usage of `formatAndAssert` in tests with a dedicated test to prevent direct `prettier.format` calls.

- 📚 Document the usage and options for `format-and-assert` helpers in a new README.

- 🔧 Refactor existing tests to remove direct dependencies on `prettier` and replace with `format-and-assert` helpers.

- 🔄 Update `ANTI_PATTERNS` and `DEPRECATED_SYNTAX` to use TypeScript types for better type safety.

- 🛠️ Fix linting issues by addressing unused parameters in the parser.


- [`a1134a8`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/a1134a835051db2966f0b97ab72ce034456af8fb "📝 Diff: 29 files, ++658 | --666") — ✨ [feat] Introduce formatAndAssert utility for consistent formatting and parsing assertions

- 🛠️ [fix] Refactor tests to utilize formatAndAssert for formatting and parsing checks

- 🔧 [build] Update parser-edge-cases, parser.property, plugin, printer-options, printer, statement-terminators, unicode-support, version-compatibility, weird-files, and weird-fixtures tests to use formatAndAssert

- 🎨 [style] Improve readability and maintainability of test files by consolidating formatting logic

- ⚡ [perf] Enhance performance by reducing redundant formatting calls in tests

- 🧪 [test] Ensure all tests maintain expected behavior with new utility integration


- [`1eaeb20`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/1eaeb20f99e308f87e5411c484a0fb26d91ace6e "📝 Diff: 3 files, ++27 | --0") — ✨ [feat] Enhance PowerShell parsing assertions in tests

- Add `assertPowerShellParses` calls to validate formatting results in statement terminators, unicode support, and version compatibility tests

- Ensure accurate parsing checks for various PowerShell constructs and features


- [`9bbe2ca`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/9bbe2ca181baa592c4218dc952e9cc673d3a7e27 "📝 Diff: 18 files, ++543 | --0") — ✨ [feat] Add various PowerShell fixtures to enhance testing coverage

- 📝 Add fixture for handling multiple BOMs and shebangs in `bom-shebang-mixed.ps1`

- 📝 Introduce nested call operator pipelines in `call-operator-nested.ps1`

- 📝 Implement class definitions with inheritance in `class-definitions.ps1`

- 📝 Create complex parameter attributes with validation in `complex-parameters.ps1`

- 📝 Add deeply nested structures in `deeply-nested-structures.ps1`

- 📝 Introduce exotic metadata with non-breaking spaces in `exotic-metadata.psd1`

- 📝 Handle mixed indentation and here-strings in `here-string-weird.ps1`

- 📝 Stress tokenizer with invisible whitespace in `invisible-whitespace.ps1`

- 📝 Showcase mixed comment styles in `mixed-comment-styles.ps1`

- 📝 Implement nested error handling in `nested-error-handling.ps1`

- 📝 Add edge cases for operators in `operator-edge-cases.ps1`

- 📝 Create pipeline chains with call operators in `pipeline-chains.ps1`

- 📝 Add string interpolation edge cases in `string-interpolation-complex.ps1`

- 📝 Introduce Unicode identifiers in `unicode-identifiers.ps1`

- 📝 Add test suite for various fixtures in `weird-fixtures.test.ts`


- [`76b72fc`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/76b72fc206603d10fb4b4fffae7e3f529574474a "📝 Diff: 8 files, ++459 | --279") — ✨ [feat] Enhance token parsing and splitting logic

- 🛠️ Refactor `splitHashtableEntries` to utilize a more flexible `splitTopLevelTokens` function

- 🔧 Introduce `SplitOptions` and `SplitContext` interfaces for better control over token splitting behavior

- ⚡ Improve handling of comments and delimiters in hashtable entries

- 🎨 Clean up code structure for readability and maintainability

✨ [feat] Update metafiles for CommonJS and ESM outputs

- 🔧 Adjust byte sizes in `metafile-cjs.json` and `metafile-esm.json` to reflect changes in `parser.ts`

- ⚡ Increase output sizes due to enhanced parsing logic

🧪 [test] Add tests for delimited sequence handling

- 🎨 Create `delimited-sequences.test.ts` to ensure consistent formatting of array elements and param blocks

- 📝 Validate preservation of hashtable comments and delimiters during formatting


- [`bfee116`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/bfee1166e0cfd842551560aa6243968a24a1964e "📝 Diff: 11 files, ++243 | --11") — ✨ [feat] Enhance tokenizer and add support for numeric literals

- 🛠️ [fix] Update NUMBER_SUFFIX_PATTERN to include 'u' and 'U' for unsigned numeric literals

- ✨ [feat] Implement tokenization for the call operator '@' and handle identifiers following it

- ✨ [feat] Add support for numeric suffixes and multipliers in the tokenizer

- 🧪 [test] Introduce tests for call operator formatting and numeric literal handling

- 🧪 [test] Add tests for tokenizer edge cases including call operator and splatted commands

- 🧪 [test] Create fixture for numeric literals to validate correct parsing and formatting


- [`e63f5ff`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/e63f5fff14b68ebdd2008d38811e6a996500444b "📝 Diff: 10 files, ++323 | --35") — ✨ [feat] Enhance parser to handle statement terminators and inline comments

- Introduced `classifyStatementTerminator` method to determine statement terminators (newline, semicolon, closing brace, closing paren).

- Updated parser logic to correctly handle semicolons and inline comments following statement terminators.

- Ensured that inline comments are preserved when they follow semicolons in script blocks.

🛠️ [fix] Update tokenizer to recognize additional whitespace characters

- Modified `WHITESPACE_PATTERN` to include zero-width characters and non-breaking spaces.

- Created `isWhitespaceCharacter` function to encapsulate whitespace checking logic.

🧪 [test] Add tests for statement terminators and tokenizer edge cases

- Created `statement-terminators.test.ts` to validate formatting of semicolon-separated commands and preservation of inline comments.

- Added tests in `tokenizer-edge-cases.test.ts` to ensure zero-width and non-breaking space characters are treated as whitespace.


- [`1fcbdd7`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/1fcbdd7b555ab349131a90f8637896b99fff8539 "📝 Diff: 1 file, ++232 | --0") — ✨ [feat] Add PSScriptAnalyzer settings configuration


- Introduced a new configuration file for PSScriptAnalyzer to enforce coding standards.

- Enabled all default rules and specified exclusions for certain rules to accommodate project needs.

- Defined severity levels for errors, warnings, and informational messages.

- Configured various rules including indentation, whitespace consistency, and casing correctness.

- Included settings for cmdlet usage, parameter handling, and help message requirements.

- Ensured compatibility with multiple PowerShell versions and profiles.


- [`c26bec6`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/c26bec6f74a842d128fc699f1d396c45b594cbfc "📝 Diff: 16 files, ++2186 | --86") — ✨ [feat] Update version and enhance performance profiling

- 🔧 [dependency] Update version 2.0.4 in package.json

- ✨ Add enhanced performance profiling script (profile-enhanced.mjs) to measure formatting performance across various script sizes and complexities

- ⚡ Improve pipeline formatting in printer.ts to always break long pipelines for better readability

- 🧪 Add comprehensive tests for comment positioning, deep nesting, long line wrapping, version compatibility, and edge cases

- 📝 Introduce tests for preserving inline and block comments in various scenarios

- 📝 Implement tests for handling deep nesting in DSC configurations, hashtables, arrays, and functions

- 📝 Create tests for long line wrapping improvements in pipelines and script blocks

- 📝 Add tests for PowerShell version compatibility, ensuring support for features across different versions

- 🧪 Ensure performance tests validate formatting speed and memory usage for deeply nested structures


- [`2d7b7b0`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/2d7b7b06bfb1f98f5c1b67a8fe175d17178ebf39 "📝 Diff: 6 files, ++905 | --0") — ✨ [feat] Introduce advanced error handling and profiling features

- 🛠️ [fix] Add PowerShellParseError class for detailed error reporting with source context

- 🛠️ [fix] Implement getLineAndColumn function for accurate line and column calculations

- 🛠️ [fix] Create detectIssues function to identify anti-patterns and deprecated syntax in PowerShell code

- 📝 [docs] Add profiling functionality to measure performance of the parser on various script sizes

- 🧪 [test] Develop comprehensive tests for error handling, including line/column calculations and anti-pattern detection

- 🧪 [test] Create tests for profiling functionality to ensure performance metrics are accurate


- [`87e5362`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/87e53620ec722ad840fc41c68615a000c597f7cf "📝 Diff: 6 files, ++226 | --4") — ✨ [feat] Enhance AST Node Type Guards

- Introduced multiple type guard functions for various AST node types including ScriptNode, PipelineNode, FunctionDeclarationNode, ScriptBlockNode, HashtableNode, ArrayLiteralNode, CommentNode, and HereStringNode.

- Improved type safety and clarity when working with AST nodes.

📝 [test] Add comprehensive error handling tests

- Created a new test suite to ensure robust error handling and resilience in the formatter.

- Included tests for various incomplete constructs such as script blocks, hashtables, arrays, strings, and malformed statements.

- Added tests for edge cases like empty input, whitespace-only input, comments, mixed valid and invalid syntax, long lines, deeply nested structures, special characters, Unicode, and complex pipeline chains.

- Ensured that the formatter gracefully handles errors without throwing exceptions, returning meaningful results instead.


- [`37ad7e4`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/37ad7e4bd50a2e797973ae80f888b2b7099b278b "📝 Diff: 8 files, ++152 | --4") — ✨ [feat] Enhance PowerShell parser and printer functionality

- 📝 [docs] Add detailed JSDoc comments to `parsePowerShell` and `parseScriptWithTerminators` functions for better understanding of their purpose and usage

- 📝 [docs] Document the `powerShellPrinter` implementation, outlining its role in formatting PowerShell AST nodes and the features it supports

- 🔧 [build] Update `metafile-cjs.json` and `metafile-esm.json` to reflect changes in byte sizes and structure after recent modifications

- 🧹 [chore] Introduce a new benchmark script in `package.json` for performance testing


- [`c6b18cb`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/c6b18cb1b82ee1572b5953453b3bc27e83b23157 "📝 Diff: 8 files, ++292 | --6") — ✨ [feat] Enhance PowerShell tokenizer and add new keywords

- 🆕 Added new keywords to the tokenizer, including "enum", "begin", "process", "end", and others to improve PowerShell support.

- 📝 Updated the tokenizer documentation to clarify its functionality and resilience against malformed code.

- 🔄 Refactored the tokenizer function to improve readability and maintainability.

📝 [test] Add comprehensive tests for PowerShell operators and keywords

- 🧪 Created a new test suite for PowerShell operators, ensuring correct formatting for various operator scenarios.

- 🧪 Added tests for PowerShell keywords, including "begin", "process", "end", and "enum", to validate formatting behavior.

- 🧪 Included tests for variable formatting and special cases to ensure robustness of the formatter.


- [`bd5c67f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/bd5c67ff96c4c60b2592e0e9de1d57f856d56219 "📝 Diff: 7 files, ++228 | --4") — ✨ [feat] Enhance PowerShell tokenizer with new operators and stop parsing functionality

- 🆕 Introduced a new set of PowerShell operators, including comparison, logical, bitwise, string, and type operators.

- 🔍 Added case-sensitive and case-insensitive variants for operators to improve token recognition.

- 🚫 Implemented a stop parsing feature for the token `--%`, allowing the tokenizer to consume everything until the end of the line as a single operator token.

- 🔄 Updated the tokenizer logic to recognize the new PowerShell operators and handle them appropriately during tokenization.

- 📈 Adjusted the input size for `src/tokenizer.ts` in the build metadata to reflect the changes in the file.


- [`fee27b1`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/fee27b14f956e2d9cc0a3687b221b7902e3e804f "📝 Diff: 8 files, ++210 | --6") — ✨ [feat] Enhance tokenizer and printer for improved operator handling

- 🛠️ [fix] Update printer to recognize additional redirection operators: ">>", "2>", "2>>", "3>", "3>>", "4>", "4>>", "5>", "5>>", "6>", "6>>", "*>", "*>>", and merging redirections like "2>&1", "3>&1", etc.

- 🛠️ [fix] Modify tokenizer to handle pipeline chain operators "&&" and "||" correctly.

- 🛠️ [fix] Extend tokenizer to support new redirection operators including "2>", "3>", "4>", "5>", "6>", "*>", and their append variants ">>".

- 🛠️ [fix] Implement merging redirection handling for operators like "2>&1", "1>&2", and others, ensuring proper parsing of complex redirection scenarios.

- 📝 [docs] Update metafiles to reflect changes in input sizes for affected source files.


- [`076219d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/076219dfc7d31179a1be03c36716d9d2b9b4941a "📝 Diff: 53 files, ++6361 | --12811") — ✨ [feat] Introduce ColorScripts-Enhanced installation script

- 🆕 Add a new PowerShell script for installing the ColorScripts-Enhanced module

- 📂 Implement functions to determine module installation paths for both user and all users

- 🔒 Include checks for administrator privileges when installing for all users

- 📦 Handle module directory creation, existing module removal, and file copying

- 📜 Provide options to add the module to the user's profile and build caches for scripts

- ✅ Ensure informative output messages during installation process

🧪 [test] Add various test files for edge cases and Unicode support

- 🆕 Create multiple test files demonstrating weird variable names, functions, and strings

- 🧪 Implement tests for tokenizer edge cases, including handling of comments and line endings

- 🌐 Add tests for Unicode support in variable names and function identifiers

- 🔍 Ensure that the tokenizer correctly handles complex regex patterns and special characters


- [`0783925`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/07839259ef91e3380dd37457972b74d300659e41 "📝 Diff: 14 files, ++468 | --152") — ✨ [feat] Enhance PowerShell formatting and tokenizer functionality

- 🛠️ [fix] Improve handling of method calls and cmdlets in `printExpression` to ensure no space before parentheses when appropriate

- 🛠️ [fix] Adjust spacing rules for operators and keywords before parentheses in `gapBetween`

- 🛠️ [fix] Update `getSymbol` to handle special characters with role "unknown"

- 🛠️ [fix] Ensure PowerShell arrays do not support trailing commas in `printArray`

- 📝 [test] Add comprehensive tests for formatting edge cases, including static member access and hexadecimal number formatting

- 📝 [test] Update existing tests to reflect changes in spacing rules and ensure correct formatting of hashtables and arrays

- 📝 [test] Introduce new tests for various hex number formats and logical operators

- 📝 [test] Modify tests to clarify that arrays should never have trailing commas

- 📝 [test] Refactor tests to improve clarity and maintainability



### 🛠️ Bug Fixes

- [`d14257f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/d14257f1677dec5e68128ed5b7d342382a0d4880 "📝 Diff: 4 files, ++45 | --42") — 🛠️ [fix] Tightens permissions and defaults

- 👷 [ci] Restricts workflow tokens to the jobs that actually need them, reducing unnecessary access.

- 🚜 [refactor] Simplifies indent-size selection to prefer an explicit override, then tab width, then a safe default.

- 🎨 [style] Collapses parenthesis line-break handling into shared soft-break logic for cleaner wrapping behavior.

- 🧪 [test] Moves the regression formatting helper out of nested scope to satisfy static analysis.


- [`213f09c`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/213f09cc83d09eae2f048e2c54f20b6fd86543b4 "📝 Diff: 38 files, ++1388 | --6414") — 🛠️ [fix] Fixes parser and printer edge cases

- ✨ Hardens parsing, tokenization, and formatting with safer readonly handling, stronger null checks, and better location and merge logic.
- ✨ Refines spacing, string quoting, comment attachment, and collection splitting so formatted output stays stable on tricky inputs.
- 🏗️ Updates the build pipeline to match the new bundle layout and release flow.
- 🧪 Expands coverage and test helpers to validate the stricter behavior and edge cases.


- [`da33e69`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/da33e6971f44aaaced5f4024b3c6114145ffd1df "📝 Diff: 30 files, ++768 | --197") — 🛠️ [fix] Update PowerShell formatting options and behavior

- 🔧 Change default `powershellKeywordCase` from "preserve" to "lower" for consistent casing

- 📝 Update documentation examples to reflect the new default behavior for `powershellKeywordCase`

- 🔧 Modify default `powershellIndentSize` from 2 to 4 for improved readability

- 🔧 Change default `powershellTrailingComma` from "multiline" to "none" to align with common practices

- 🛠️ Implement logic to handle `else` and `elseif` continuations in hashtable entries

- 🎨 Enhance hashtable printing to better format entries with simple expressions

- 🧪 Add regression tests to ensure proper formatting of new test files and existing functionality

- 🧪 Introduce user regression tests to validate formatting consistency and indentation rules

- 🎨 Refactor existing tests to check for lowercased keywords and consistent indentation

- 🧹 Remove obsolete build configuration file


- [`4171f61`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/4171f61114880459c2d384dd5e0adde2aff29c8c "📝 Diff: 5 files, ++712 | --7") — 🛠️ [fix] Enhance error handling and logging in PowerShell utilities

- 📝 Add tests for out-of-range line numbers in PowerShellParseError

- 📝 Ensure correct behavior when Error.captureStackTrace is unavailable

- 📝 Introduce comprehensive tests for PowerShell syntax utilities

- 📝 Implement progress logging behavior with configurable intervals

- 🧪 Add tests for progress logging functionality

- 🧪 Mock PowerShell process for testing syntax validation

- 🧹 Exclude test files from coverage reports in configuration


- [`259fe7d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/259fe7d6135c70f4c0f40a28098b8b8fc4798d5b "📝 Diff: 2 files, ++3 | --3") — Wrap error in Error object for promise rejection


- [`81b3f0a`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/81b3f0acb6faff21aef4298dd9e1184900a84054 "📝 Diff: 11 files, ++28 | --28") — Resolve ESLint errors in tokenizer and test files


- [`584a97d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/584a97dda735bff36b38b6f802ade895d56533e0 "📝 Diff: 9 files, ++120 | --28") — Handle BOM edge case in weird-files tests


- [`14ca103`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/14ca103115867045a04f914a61fdf1e56ea97ba3 "📝 Diff: 21 files, ++365 | --210") — 🛠️ [fix] Update test cases to improve parsing and handling of PowerShell scripts


- 🔧 Refactor test cases in `advanced-features.test.ts` to use specific configurations for parsing, enhancing the accuracy of expected results.

- 🔧 Modify `advanced-formatting.test.ts` to include a base class in the class formatting test, ensuring proper inheritance handling.

- 🔧 Adjust `advanced-printer.test.ts` to utilize specific test cases for unclosed braces, parentheses, and strings, improving error handling.

- 🔧 Update `coverage.test.ts` to include `|skipParse` in various test cases, allowing for more flexible parsing scenarios.

- 🔧 Change `deep-nesting.test.ts` to use specific configurations for DSC (Desired State Configuration) tests, enhancing the robustness of nested structure handling.

- 🔧 Modify `error-handling.test.ts` to include `|skipParse` in all test cases, ensuring resilience against parsing errors.

- 🔧 Update `invisible-whitespace.ps1` fixture to better test tokenizer heuristics with invisible whitespace.

- 🔧 Adjust `integration.property.test.ts` to include `|skipParse` for property formatting tests, improving integration reliability.

- 🔧 Change `long-line-wrapping.test.ts` to utilize performance-focused test cases, enhancing long line handling.

- 🔧 Update utility functions in `format-and-assert.ts` to support `|skipParse` flag for more flexible assertions.

- 🔧 Modify `powershell.ts` to change the default maximum syntax checks, improving error handling in tests.

- 🔧 Update `version-compatibility.test.ts` to include `|skipParse` for version compatibility tests, enhancing parsing flexibility.

- 🔧 Add `skipParse` option to `weird-fixtures.test.ts` to allow for more nuanced testing of edge cases.


- [`af98900`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/af98900f3805ec10644865dacae7fcf91d8335ee "📝 Diff: 11 files, ++458 | --89") — 🛠️ [fix] Enhance comment handling in hashtables and arrays


- **Fixed**: Improved preservation of comments in hashtable entries, including:
  
- ✅ Leading comments before entries
  
- ✅ Inline comments within entries
  
- ✅ Trailing comments after entries
  
- ✅ Comments in nested hashtables and arrays

- **Updated**: Parser now collects and attaches comments correctly during hashtable entry parsing.

- **Modified**: AST structure to include `leadingComments` and `trailingComments` in `HashtableEntryNode`.

- **Refactored**: Printer to handle leading and trailing comments when formatting hashtable entries.

- **Validation**: Added tests to ensure comments are preserved in various scenarios, including nested structures.

- **Documentation**: Updated KNOWN_LIMITATIONS.md to reflect the resolution of previous comment positioning issues.


- [`e5e4367`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/e5e43676226a9bdeadfbd1016e1e4e1ad95241ac "📝 Diff: 39 files, ++12247 | --4432") — 🛠️ [fix] Implement property-based tests for tokenizer and here-string normalization

- ✨ [feat] Add property tests for `normalizeHereString` to validate behavior with various line counts, empty lines, mixed line endings, and edge cases.

- 🧪 [test] Introduce property tests for `tokenize` function to ensure it handles various token types correctly and maintains deterministic behavior.

- 🧪 [test] Validate tokenization of whitespace-only input, newline-only input, keywords, variables, numbers, strings, and comments.

- 🧪 [test] Ensure proper handling of concatenated scripts and whitespace oddities in tokenization.

🛠️ [fix] Enhance PowerShell syntax validation utilities

- ✨ [feat] Create utility functions for validating PowerShell scripts using the PowerShell parser.

- 🧪 [test] Add progress tracking for property tests to monitor execution and completion status.

📝 [docs] Add tests for handling weird PowerShell files

- ✨ [feat] Implement property tests for handling BOM, shebangs, Unicode content, comment directives, and unusual whitespace in PowerShell scripts.

- 🧪 [test] Validate that formatting is idempotent and that scripts with various oddities parse correctly.

⚡ [perf] Optimize Vitest configuration for better performance

- 🔧 [build] Adjust test timeout settings to allow for longer-running tests based on environment variables.



### 📦 Dependencies

- [`fb731a6`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/fb731a6b236c2310f689e7df0e1bf1451346dc52 "📝 Diff: 1 file, ++24 | --30") — [skip-ci] Update dependabot configuration for multi-ecosystem support


- [`95e5bff`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/95e5bffe43ed91bca5823cb661b5e4b339a3dc98 "📝 Diff: 1 file, ++11 | --11") — *(deps-dev)* [dependency] Update @eslint/eslintrc 3.3.4


- [`e958302`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/e95830225776f86192af6346d789e58e97ed037e "📝 Diff: 1 file, ++3 | --3") — *(deps)* [dependency] Update @isaacs/brace-expansion 5.0.1


- [`48dbeaa`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/48dbeaa987c55ea68a498242bb09829e08722ec6 "📝 Diff: 2 files, ++411 | --460") — Merge PR #23

test(deps): [dependency] Update dependency group
- [`ddff476`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/ddff476e432d57b060059dc33ae4ac4e566254d7 "📝 Diff: 2 files, ++411 | --460") — *(deps)* [dependency] Update dependency group
- [`0761c13`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/0761c1347146ee9fd3e153f0eecd5247fc738127 "📝 Diff: 2 files, ++510 | --1537") — *(deps)* [dependency] Update dependency group
- [`f1ccd45`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/f1ccd45f4802e8d3f72806a17b5fb3c6bb666934 "📝 Diff: 1 file, ++12 | --12") — *(deps)* [dependency] Update glob


- [`ddce5d7`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/ddce5d78b8c62323f633b9f574882e31bacd7f15 "📝 Diff: 1 file, ++3 | --3") — *(deps-dev)* [dependency] Update js-yaml 4.1.1



### 🛡️ Security

- [`056f56b`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/056f56bf5b1a808ddb09eab3f4b800b79007bf19 "📝 Diff: 1 file, ++1 | --0") — 👷 [ci] Add id-token permission to publish workflow

- Enhanced the publish workflow by adding the 'id-token' permission to improve security and access control during the publishing process.


- [`89639f6`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/89639f6460b68727c22a2211284f79ba9aa920d7 "📝 Diff: 13 files, ++40 | --25") — *(deps)* [dependency] Update dependency group
- [`e0ca364`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/e0ca364bb0ccd20111ade8d681cdc69680be7493 "📝 Diff: 25 files, ++118 | --266") — 🧹 [chore] Updates repo tooling config

- 🧹 Removes redundant CI/security workflows and standardizes remaining workflow names for cleaner maintenance.
- 🔧 Aligns lint, formatting, and test configs with current tool behavior, including updated ESLint, Vitest, Prettier, and link-check settings.
- 📝 Refreshes package metadata and scripts, adds a dependency update helper, and tidies site/config ordering without changing runtime logic.


- [`01406dd`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/01406dd86b00bb7ca07b8aabf431844a3fbad834 "📝 Diff: 17 files, ++1145 | --556") — *(deps)* [dependency] Update dependency group
- [`8d70b2f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/8d70b2f85e2ff9437720bcee9f40e9d5862322ee "📝 Diff: 17 files, ++571 | --844") — *(deps)* [dependency] Update dependency group
- [`d70548f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/d70548faf4053dfb585b8173c0d4ba3f7f3913b6 "📝 Diff: 15 files, ++43 | --43") — *(deps)* [dependency] Update dependency group
- [`daee627`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/daee6271b899e59e8a4a3d5853c60f458f2fca2d "📝 Diff: 15 files, ++45 | --45") — *(deps)* [dependency] Update dependency group
- [`c317472`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/c317472c3a40e320357c9f832b2759bc935dc00a "📝 Diff: 15 files, ++42 | --42") — *(deps)* [dependency] Update dependency group
- [`0788400`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/0788400c20b87e7ead2443228ebe72728af03aba "📝 Diff: 2 files, ++71 | --73") — 🔧 [build] Update package and lock files for version bump and dependency upgrades

- [dependency] Update version 2.0.2 in package.json and package-lock.json

- Upgrade @vitest/coverage-v8 from 4.0.7 to 4.0.8

- Upgrade vitest from 4.0.7 to 4.0.8

- Update other dependencies to their latest versions for improved functionality and security



### 🛠️ Other Changes

- [`fdfa15c`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/fdfa15c9dd38f95585ab0c46d2896329c5dc05aa "📝 Diff: 49 files, ++2569 | --1093") — Build release artifacts in CI and tighten test suite`


- [`dc8b511`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/dc8b511e189eed7f472d414683fc3b95be6d11f1 "📝 Diff: 60 files, ++3130 | --2069") — Rename plugin entrypoint and clean up parser/printer internals**


- [`f96111f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/f96111f08a222b76a39a85c1d92d60a5ca4b8236 "📝 Diff: 1 file, ++11 | --11") — Merge PR #31

[dev-dependency](deps-dev): [dependency] Update @eslint/eslintrc 3.3.4


- [`1494ccf`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/1494ccf122124290d4672c3aa31115aa066bac87 "📝 Diff: 15 files, ++43 | --43") — Merge PR #22

[ci](deps): [dependency] Update dependency group
- [`5a2e43e`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/5a2e43e3f56fa09a81c4e5f15b8edf1606079697 "📝 Diff: 15 files, ++45 | --45") — Merge PR #19

[ci](deps): [dependency] Update dependency group
- [`ba98576`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/ba98576fcfd9b4d44c18243e4458901089f670c3 "📝 Diff: 26 files, ++38 | --17") — Normalize helper imports and formatting



### 🚜 Refactor

- [`328696d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/328696d8cbaf4bdd9759fc39baa75ce4f24d9a3b "📝 Diff: 20 files, ++12622 | --4832") — 🚜 [refactor] Reworks AST, parser, and printer

- 🚜 [refactor] Reworks node shapes and location handling across parsing, tokenizing, and printing to make structure traversal and formatting more consistent.
- 🧹 [chore] Adds broader lint/tooling dependencies to support the expanded rule set and file types.
- 🧪 [test] Updates expectations and fixtures to match the revised parsing and formatting behavior.


- [`d65c9df`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/d65c9df16442039880bce201053d20bea4487227 "📝 Diff: 7 files, ++127 | --40") — 🚜 [refactor] Improve parser node handling and merging logic

- 🛠️ Refactor the parser to use a new `appendNode` function for adding nodes to the body, enhancing readability and maintainability.

- 🔄 Introduce `shouldMergeNodes` and `mergeNodes` functions to encapsulate the logic for merging nodes, specifically handling comments and blank lines.

- 📝 Update the handling of inline comments, blank lines, and function declarations to utilize the new `appendNode` method, streamlining the code flow.

- ⚡ Optimize the parser's handling of trailing comments for `Pipeline` nodes, ensuring comments are correctly associated with their preceding nodes.

- 🔍 Adjust the logic for blank lines to allow for merging of consecutive blank lines, improving the structure of the parsed output.



### 📝 Documentation

- [`8a70bb8`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/8a70bb893b81d70a709c34e5b9dc261b695f2767 "📝 Diff: 1 file, ++8 | --4") — Update PERFORMANCE.md to reflect fixed  variable handling


- [`1cd1f01`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/1cd1f0121475e301bbe5aa64bbb400389c866fb1 "📝 Diff: 1 file, ++61 | --0") — Add performance improvements documentation


- [`7ee8ee5`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/7ee8ee5dca9b75f8481d6a20a8d640864ce81307 "📝 Diff: 4 files, ++1446 | --0") — 📝 [docs] Add comprehensive guides for formatting options, performance tuning, and troubleshooting


- 📝 [docs] Create FORMATTING_OPTIONS.md to document available formatting options for PowerShell

- 📝 [docs] Create PERFORMANCE.md to provide performance tuning strategies and benchmarks

- 📝 [docs] Create TROUBLESHOOTING.md to assist users in resolving common issues with the plugin

- 🧪 [test] Add advanced features tests for PowerShell formatting scenarios

- 🧪 [test] Implement tests for expandable strings, here-strings, script blocks, class definitions, enum definitions, attributes, DSC, workflows, command parameters, and advanced formatting



### 🎨 Styling

- [`07b39ca`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/07b39caeeb372e2d8881638cf7752ef84e865f31 "📝 Diff: 4 files, ++158 | --0") — 🎨 [style] Add formatted PowerShell test files for color output

- ✨ Create Test-File-17..ps1 with color definitions and output logic

- ✨ Create Test-File-18..ps1 with enhanced color definitions and output formatting

- 🧹 Update Test-File-17.unformatted.ps1 for consistent color comments

- 🧹 Update Test-File-18.unformatted.ps1 for consistent color comments


- [`4a1276d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/4a1276dbf56aa855ad668f78987b073f4af2d404 "📝 Diff: 21 files, ++395 | --42") — 🎨 [style] Update formatting in PowerShell scripts for consistency

- Adjust spacing around characters and operators for improved readability

- Standardize line breaks in loops and conditionals

🛠️ [fix] Enhance printer logic to preserve static method identifiers

- Modify `printExpression` function to ensure static method identifiers retain their case when `keywordCase` is set

- Implement logic to change the role of specific text parts to prevent misformatting

🧪 [test] Add regression tests for static method formatting

- Introduce tests to ensure static method invocations used for synchronization are preserved

- Validate handling of keyword-like static method names without misformatting

- Ensure stability of batched static calls and their formatting

- Test static calls inside pipelines and chained expressions

📝 [docs] Update metafiles to reflect changes in output sizes

- Adjust `metafile-cjs.json` and `metafile-esm.json` to account for changes in output byte sizes


- [`8e1056b`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/8e1056bc5378f83aed6b4754ee26221906e02d44 "📝 Diff: 21 files, ++847 | --205") — 🎨 [style] Update code formatting and style across multiple files

- 🔧 [build] [dependency] Update version 2.0.5 in package.json

- 🎨 [style] Improve code readability by breaking long lines in ast.ts, errors.ts, options.ts, parser.ts, printer.ts, tokenizer.ts

- 🎨 [style] Adjust formatting in tests to enhance readability and maintain consistency

- 🎨 [style] Refactor multiline statements for better clarity in various test files

- 🎨 [style] Standardize spacing and indentation in validate-syntax.ps1 for improved legibility


- [`394b97e`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/394b97eee773ce51b56d1b9b6f555ad6d34f4b8d "📝 Diff: 35 files, ++2303 | --759") — 🎨 [style] Refactor code formatting for consistency and readability

- Adjusted formatting in multiple test files to improve code style

- Ensured consistent use of line breaks and indentation across various test cases

- Enhanced readability by aligning object properties and parameters in function calls

🧪 [test] Update test cases for improved clarity and structure

- Refactored test cases in `printer-options.property.test.ts` for better readability

- Improved formatting in `printer.property.test.ts` to maintain consistency

- Enhanced clarity in `statement-terminators.test.ts` by restructuring assertions

- Updated `tokenizer-edge-cases.test.ts` to improve readability of token assertions

- Refined `unicode-support.test.ts` for better organization of Unicode tests

- Enhanced `format-and-assert.test.ts` for clearer test structure

- Improved `no-prettier-format.test.ts` for better readability of expectations

- Updated `validate-syntax.ps1` for consistent formatting and error handling

- Enhanced `version-compatibility.test.ts` for clearer version feature tests

- Improved `weird-files.property.test.ts` for better structure and readability

- Refined `weird-fixtures.test.ts` for clearer assertions and formatting checks


- [`98d1a0b`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/98d1a0b97dac7a55b3e55353166cf7b7a136fc95 "📝 Diff: 19 files, ++1244 | --621") — 🎨 [style] Improve code formatting and consistency across multiple files

- 📝 Refactor comment handling in `parser.ts` to ensure inline and block comments are included in segments when inside a structure

- 🛠️ Enhance comment detection in `printer.ts` to treat certain text as inline comments based on context

- ⚡ Optimize test files for better readability and maintainability by restructuring imports and formatting

- 🎨 Apply consistent formatting in `printer-options.property.test.ts` and `printer.property.test.ts` for improved clarity

- 🧹 Clean up whitespace and indentation issues in various test files to adhere to coding standards

- 🚜 Remove unused temporary documentation test file `tmp-doc-test.mjs` to keep the repository clean


- [`eb4aa2d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/eb4aa2dc12ae31ff6a71f76e7f21a85b6f6c9579 "📝 Diff: 2 files, ++13 | --15") — 🎨 [style] Refactor code for improved readability and consistency

- Simplify conditional statements in `printStatementList` and `gapBetween` functions

- Adjust formatting in `normalizeStringLiteral` for better clarity

- Update test case formatting for `normalizeStringLiteral` to enhance readability



### 🧪 Testing

- [`8a82d9b`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/8a82d9ba8a6d6209b3df4de66407c5f8795f13e6 "📝 Diff: 2 files, ++68 | --47") — 🧪 [test] Skips flaky parser property test on CI

- 🧪 Disables the expensive PowerShell idempotence check in CI to avoid process-timeout flakes, while keeping it available for local validation.

- 🧹 Expands secret-scan exclusions to ignore temp files, test files, and node_modules noise.


- [`d80b6bb`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/d80b6bbd1aeb2a7f37b8e19b629e2c653c2040f9 "📝 Diff: 13 files, ++157 | --159") — 🧪 [test] Updates Vitest 4 setup

- 🔧 Updates the test runner to Vitest 4’s top-level worker and coverage options while keeping CI single-worker behavior.

- 🧪 Improves module and process mocks so async error handling is flushed before spies are restored, preventing stderr leakage.

- 🎨 Reflows helper signatures and comments to stay consistent with formatter and lint expectations.


- [`fb63412`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/fb63412a1ef8c0d3ad4ec625c2b2cfae212acebd "📝 Diff: 15 files, ++186 | --162") — 🧪 [test] Modernizes test harness

- 🔧 Uses `globalThis.process.env` and `vi.stubEnv()` so property and progress tests run reliably under the threaded ESM runner.

- 🧪 Preserves literal braced-variable cases with raw strings and tightens assertions around Unicode and formatting edge cases.

- 🧹 Standardizes test/build config and ignores temporary scratch files from local tooling.


- [`69893ed`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/69893ed396125ce187a17460ea9c997d0577958c "📝 Diff: 19 files, ++7179 | --6899") — 🧪 [test] Updates test harness for Node 20.11+

- 🛠️ [fix] Reworks GitHub sample loading to use lower-level HTTP handling, cached fixtures, and local fallbacks for more reliable property runs and clearer API failures.
- 🛠️ [fix] Hardens the PowerShell validation helper with safer process lifecycle handling, chunked stdout parsing, and configurable executable discovery.
- 🧪 [test] Tightens assertions across property tests to catch skipped checks and edge-case regressions earlier.
- 🔧 [build] Raises the minimum supported Node version to $20.11.0$ to match the newer runtime features used by the test suite.


- [`2642b1f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/2642b1f66fdfb6a7fbdc87bfe36974fd74a41e80 "📝 Diff: 3 files, ++426 | --107") — Add comprehensive tests for errors and property test arbitraries


- [`3893a59`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/3893a5906438cc5cc095bec3f730c444df33059c "📝 Diff: 3 files, ++573 | --0") — Add comprehensive tests for AST utilities and progress tracking



### 🧹 Chores

- [`41afffc`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/41afffcbe784ba6fcce9ff11317f739447badd09 "📝 Diff: 4 files, ++147 | --93") — 🧹 [chore] Clean up ESLint configuration and update dependencies

- Remove unused Typefest plugin configuration from ESLint setup

- Add `eslint-import-resolver-node` dependency to package.json and package-lock.json

- Update parser property test to improve CI performance by avoiding timeouts


- [`5a4260a`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/5a4260a6f20a05fd743ce78503ca711c245fde26 "📝 Diff: 3 files, ++0 | --270") — 🧹 [chore] Remove unused ESLint plugin dependencies


- Removed "eslint-plugin-import" from package.json and package-lock.json to reduce bloat.

- Cleaned up the publish.yml workflow by removing the NODE_AUTH_TOKEN environment variable for npm publish.


- [`f57f164`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/f57f1646b7d5c94cc925f6a87e6c11153a35c2f6 "📝 Diff: 3 files, ++4 | --62") — 🧹 [chore] Remove Truffle Hog secret scan workflow and allowlist


- Deleted the Truffle Hog secret scan workflow file to streamline CI processes.

- Removed the associated allowlist configuration to eliminate unnecessary complexity.

- Adjusted Vitest configuration thresholds for coverage metrics from 95% to 80% to allow for more flexibility in test coverage.


- [`ebadde0`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/ebadde022c4e89de17d422c310c3e43cd5470695 "📝 Diff: 24 files, ++490 | --449") — 🧹 [chore] Updates tooling and repo formatting

- 🧰 Normalizes config formatting across automation and quality checks for cleaner maintenance.
- ✨ Expands formatting and lint scripts and adds Prettier plugins to cover more repo file types consistently.
- ⚙️ Suppresses the TypeScript deprecation warning to keep modern toolchain runs quieter.


- [`9b23ed2`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/9b23ed2baa0aa0e8b5acdc7db64d9a8528731c70 "📝 Diff: 12 files, ++0 | --799") — 🧹 [chore] Removes obsolete migration scripts

- 🧹 Removes ad-hoc migration helpers that were only needed during the test helper migration.
- 🧼 Deletes the accompanying documentation and standalone utility scripts to reduce repository clutter.
- ✅ No runtime or test behavior changes.


- [`2f64eeb`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/2f64eeb272fff3dfd4c93a6964e8220371da949f "📝 Diff: 1 file, ++8 | --8") — Fix trailing whitespace in weird-files.property.test.ts


- [`6f6729c`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/6f6729c9aa8f0408be9c916c507327c4dfb3c67f "📝 Diff: 43 files, ++2844 | --4756") — 🧹 [chore] Remove obsolete scripts and update documentation


- 🗑️ Deleted `Update-DocumentationCounts.ps1`, `Update-FilePathReferences.ps1`, `Update-NuGetPackageMetadata.ps1`, `Validate-Changelog.ps1`, and `build.ps1` as they are no longer needed.

- 📜 Removed associated documentation and comments to keep the repository clean and maintainable.

- 🔄 Updated references in the remaining scripts to ensure consistency and accuracy following the removal of the obsolete files.



### 👷 CI/CD

- [`b33ef72`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/b33ef721be3e475b59bf5822ca70bc2ab5aa57f9 "📝 Diff: 1 file, ++4 | --0") — 👷 [ci] Add environment variables for CI configuration

- Set CI to true for continuous integration

- Define DEFAULT_RELEASE_BRANCH as main

- Specify NPM_REGISTRY_URL for npm package publishing


- [`0382e05`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/0382e0580ad9622302618599e91d75c0860afed8 "📝 Diff: 3 files, ++45 | --29") — 👷 [ci] Reduces dependency scan noise

- 🔧 Updates automated dependency checks to ignore local workspace links and a few recurring failing packages, reducing repeated update failures and maintenance noise.
- 🛡️ Extends secret scanning with shared config and a targeted allowlist for known test fixtures, cutting false positives without weakening detection.


- [`ce3d27e`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/ce3d27ef6163ae5f699d35bbb2a06dcd1d1bc1e7 "📝 Diff: 5 files, ++20 | --45") — 👷 [ci] Updates automation and test setup

- ⏱️ Shortens automated dependency-update cooldowns for faster PR flow.

- 🧹 Removes the deprecated manual publish workflow and trims noisy secret-scanning linting.

- 🧪 Lowers property-test volume and aligns advanced feature cases with the newer helper config shape.


- [`52fbf11`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/52fbf11b7e3d41209bbbb7b17aaed261f5f036e6 "📝 Diff: 5 files, ++6 | --6") — 👷 [ci] Forces npm ci in workflows

- 👷 Updates CI and publish installs to use `npm ci --force` so dependency resolution does not block automated runs.
- 📝 Syncs migration and performance docs with the same install command.


- [`cacaeea`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/cacaeea1be7c2949d5a9e9f8abbe93f2143c63ce "📝 Diff: 32 files, ++968 | --1418") — 👷 [ci] Modernizes CI and release automation

- 🚦 Adds run names, concurrency guards, timeouts, and merge-group support to reduce duplicate checks and improve PR flow.
- 📦 Simplifies publish and dependency automation, then refreshes build, lint, doc, and profiling configs for the updated toolchain.


- [`bc0765d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/bc0765d3947d08a728486a3441c149ea9160b560 "📝 Diff: 1 file, ++81 | --0") — 👷 [ci] Add SonarCloud config

- 🧹 Narrows analysis to shipped source and core tests to cut noise from docs, tooling, generated files, and fixtures.
- 🔧 Configures language detection, coverage reporting, and tsconfig discovery for more consistent SonarCloud results.
- 👷 Waits for the quality gate so regressions surface during the analysis run.



### 🔧 Build System

- [`9c3feaa`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/9c3feaa1e483cae8dc2df10762971550e12c26af "📝 Diff: 1 file, ++2 | --0") — 🔧 [build] Add NODE_AUTH_TOKEN to npm publish step

- Include NODE_AUTH_TOKEN environment variable for authentication during npm publish


- [`93bce7d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/93bce7dd0de24d2c983124f3c3158f905876a89a "📝 Diff: 1 file, ++1 | --1") — 🔧 [build] Update npm publish command to include provenance and ignore scripts

- Enhanced the npm publish command to include the `--provenance` flag for better package integrity verification.

- Added the `--ignore-scripts` flag to prevent running scripts during the publish process, ensuring a cleaner deployment.


- [`98f1f24`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/98f1f2438d6a81dee66a0ffaf9175001759a59d6 "📝 Diff: 4 files, ++83 | --53") — 🔧 [build] Updates TypeScript build setup

- 🔧 Refreshes lint-related packages to current patch releases
- 🔧 Moves TypeScript to peer dependencies so consumers supply the matching compiler
- 🔧 Modernizes compiler settings by targeting newer runtimes and dropping the empty base URL


- [`3a4d5f8`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/3a4d5f8091fc9d16f2c14ff1b24596cb89a7c145 "📝 Diff: 18 files, ++4722 | --398") — 🔧 [build] Updates lint config for toolchains

- 🔧 Moves the main lint rules into a strict ESM flat config while keeping a JS pass-through for compatibility.
- 🧩 Adds supporting TypeScript config variants and a placeholder local plugin so the new setup resolves cleanly.
- 🧹 Refreshes formatter/update-checker settings, lint scripts, and related dependency versions.


- [`67c00e5`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/67c00e5817e2b9668cb96acc83216d47cabcd41b "📝 Diff: 2 files, ++4 | --3") — 🔧 [build] Update version to 2.0.11 in package.json and package-lock.json

- [dependency] Update version 2.0.11 for release

- Ensure consistency in versioning across package files


- [`c4d55a0`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/c4d55a035505c7bc1faf030e5a25de16ccb2c2d4 "📝 Diff: 20 files, ++1177 | --552") — 🔧 [build] Upgrade dependencies and versioning

- 🔧 Update package version from 2.0.9 to 2.0.10 in package.json and package-lock.json

- 🔧 Upgrade @vitest/coverage-v8, vitest, and related dependencies from 4.0.8 to 4.0.9

- 🔧 Upgrade chai from 6.2.0 to 6.2.1

✨ [feat] Enhance formatting capabilities

- ✨ Add support for inline comments in printParamParenthesis

- ✨ Implement synthesis of comment markers for prose-like comment expressions in printParamParenthesis

- ✨ Introduce handling of trailing comments in hashtable entries

🧪 [test] Add property-based tests for call operator scenarios

- 🧪 Create tests for script-block call operator, command expressions, splatted arguments, and property invocations

- 🧪 Ensure that call operator is preserved in various contexts

🧪 [test] Expand options property-based tests

- 🧪 Add test to verify unknown preset values do not alter default options

🧪 [test] Add tokenizer edge case tests

- 🧪 Implement tests for merging redirection without explicit stream number

- 🧪 Validate handling of bare $_ as a special pipeline variable

- 🧪 Ensure $_ followed by identifier characters is treated as a regular variable name

📝 [docs] Update README for utils

- 📝 Clarify options for formatAndAssertRoundTrip utility function

👷 [ci] Adjust Vitest configuration

- 👷 Increase maxThreads from 4 to 16 for better performance in CI environments


- [`8068a21`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/8068a219572494150b703fdf5efd4c383dc69e06 "📝 Diff: 2 files, ++3 | --3") — 🔧 [build] Update version to 2.0.9 in package.json and package-lock.json

- [dependency] Update version number from 2.0.8 to 2.0.9 for release


- [`3889c88`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/3889c882bd314c3625816c5816e6589bd30a26fc "📝 Diff: 12 files, ++33 | --35") — 🔧 [build] Update version to 2.0.8 in package.json and package-lock.json

- [dependency] Update version 2.0.8 to reflect new changes and updates.

🎨 [style] Refactor code formatting in options.ts

- Adjust line breaks for better readability in the `pluginOptions` object.

- Align conditional statements for `tabWidth` to improve clarity.

- Format type definition for `PresetDefaults` for consistency.

🛠️ [fix] Optimize code in parser.ts

- Consolidate array push operations in `splitHashtableEntries` for cleaner code.

- Refactor `extractElseContinuation` function signature for improved readability.

🎨 [style] Clean up code formatting in printer.ts

- Simplify array push operations in `printHashtable` for better readability.

🧪 [test] Enhance property tests in arbitraries.test.ts

- Improve readability of test cases by formatting array definitions with proper indentation.

- Ensure valid pipeline expressions are generated with clearer structure.


- [`24ca92f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/24ca92f66ab559885906f007839de51d717cae0e "📝 Diff: 2 files, ++3 | --3") — 🔧 [build] Update version to 2.0.7 in package.json and package-lock.json

- [dependency] Update version 2.0.7 in both package.json and package-lock.json for consistency


- [`64cb8a3`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/64cb8a393d54377eb9ec8ffdce748ab8711b7f0d "📝 Diff: 3 files, ++1308 | --0") — 🔧 [build] Update project dependencies for improved stability

- 🛠️ [fix] Resolve compatibility issues with the latest version of library X

- ⚡ [perf] Optimize build process by removing unnecessary plugins

✨ [feat] Introduce new feature for user notifications

- 🎨 [style] Enhance UI for notification display with updated design elements

- 🧪 [test] Add unit tests for notification functionality to ensure reliability

🚜 [refactor] Clean up codebase by removing deprecated functions

- 🛠️ [fix] Address potential bugs caused by outdated code


- [`134095d`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/134095d4601cb970ddd3940197d9e90f26e3efe7 "📝 Diff: 3 files, ++32 | --4") — 🔧 [build] Update version to 2.0.6 in package.json and package-lock.json


- Updated the version number from 2.0.5 to 2.0.6 in both package.json and package-lock.json to reflect the latest release.


- [`b49cfd3`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/b49cfd36110b1b91529036a674947af01ee3fae4 "📝 Diff: 9 files, ++211 | --56") — 🔧 [build] Update metafiles for CJS and ESM outputs

- Updated byte sizes for `src/tokenizer.ts`, `src/parser.ts`, and `src/printer.ts` in `metafile-cjs.json` and `metafile-esm.json`

- Adjusted input and output sizes reflecting changes in the source files

🛠️ [fix] Enhance parser for multi-line pipelines

- Added `isPipelineContinuationAfterNewline` method to handle multi-line pipelines

- Improved `splitHashtableEntries` to ensure proper handling of newlines after assignments

🛠️ [fix] Refine comment detection in printer

- Enhanced `looksLikeCommentText` to better identify comment text based on syntax markers and content

- Added checks for assignment operators and control flow keywords to improve accuracy

🚜 [refactor] Optimize tokenizer with cached regex patterns

- Introduced cached regex patterns for whitespace, identifiers, and number formats to improve performance

- Replaced inline regex checks with cached patterns for better readability and efficiency


- [`5083059`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/508305950d62b183d8d30bc3fa5316422650e630 "📝 Diff: 2 files, ++4 | --3") — 🔧 [build] [dependency] Update version 2.0.3 and update package-lock.json


- Updated version number in package.json and package-lock.json to 2.0.3

- Added "peer": true to a dependency in package-lock.json


- [`8c41cf6`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/8c41cf674db0dd3b5927a8b9ddfbc020e0634526 "📝 Diff: 2 files, ++60 | --169") — 🔧 [build] Update package.json for improved configuration and dependencies


- ✨ [feat] Add schema reference for package.json to enhance validation.

- 🔄 [refactor] Move `prettier`, `rimraf`, `tsup`, and `typescript` from `devDependencies` to `dependencies` for better accessibility in production.

- 🧹 [chore] Remove `peerDependencies` for `prettier`, simplifying dependency management.

- 🔧 [build] Update `devDependencies` to ensure compatibility with the latest tools and libraries.


- [`eccde9e`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/eccde9e21931c7f3bfd0da8f45e2133e92691859 "📝 Diff: 2 files, ++3 | --3") — 🔧 [build] [dependency] Update version 2.0.1 in package.json and package-lock.json

- Updated version from 2.0.0 to 2.0.1 for consistency across project files


- [`f258f29`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/f258f29a898b2d683533b3c3dde38582b7316704 "📝 Diff: 6 files, ++10 | --4") — 🔧 [build] Update metafiles for CommonJS and ESM outputs


- 🛠️ [fix] Adjust byte sizes in `dist/metafile-cjs.json` for `src/printer.ts` and `dist/index.cjs.map` to reflect accurate output sizes.

- 🛠️ [fix] Update byte sizes in `dist/metafile-esm.json` for `src/printer.ts` and `dist/index.js.map` to ensure consistency with the latest build.

- ⚡ [perf] Optimize the output structure by ensuring all input files are correctly represented in both CommonJS and ESM formats.


- [`04b61a5`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/04b61a569a49c6985413ebb2b59fb2e3473a01d6 "📝 Diff: 2 files, ++12 | --0") — 🔧 [build] Enhance normalization logic for string literals

- Skip normalization for regex-like pattern strings to avoid altering embedded quoting

- Add heuristics to identify regex-like patterns in `normalizeStringLiteral`
🧪 [test] Add test for regex-like pattern strings in normalization

- Ensure regex-like patterns are not rewritten when `powershellPreferSingleQuote` is true


- [`43ed071`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/43ed07135293c4ca1184dd771baf5d5d58d79f22 "📝 Diff: 1 file, ++17 | --2") — 🔧 [build] Enhance npm authentication configuration in publish workflow


- Update npm authentication step to ensure NODE_AUTH_TOKEN is provided

- Set NPM_CONFIG_USERCONFIG to default if not specified

- Create .npmrc file with authentication token and always-auth setting

- Validate npm authentication by running npm whoami with the registry


- [`36b69d0`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/36b69d076f27f9a8bca9b217ec22880eecdf8074 "📝 Diff: 5 files, ++231 | --125") — 🔧 [build] Update workflows for automated npm publishing


- 📝 Update `manual-publish.yml` to mark it as deprecated and inform users that manual publishing has been retired.

- ✨ Introduce `publish.yml` workflow that triggers on pushes to `main` and allows for manual dispatch.
  
- 🛠️ Automatically bumps version based on commit messages (patch by default, `feat` → minor, `BREAKING` → major).
  
- 👷 Runs quality checks including type checking, linting, and tests before publishing.
  
- 📦 Publishes the package to npm and creates a GitHub release with the new version.

- 📝 Revise README to reflect changes in npm publishing process and highlight the new automated workflow.

- 🧹 [dependency] Update version in `package.json` and `package-lock.json` to `2.0.0`.






## [1.0.9] - 2025-11-07


- <b>Commit Range: ➡️</b> [`c4ff3b9...c4ff3b9`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/c4ff3b96cd87f14fdb293ff2665eae1b2ced8507...c4ff3b96cd87f14fdb293ff2665eae1b2ced8507 "View full commit range on GitHub")



### 🧹 Chores

- [`c4ff3b9`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/c4ff3b96cd87f14fdb293ff2665eae1b2ced8507 "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.9






## [1.0.8] - 2025-11-07


- <b>Commit Range: ➡️</b> [`43f0995...2eb8c5f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/43f0995ebac532492d187b6d024a7a6419a8e315...2eb8c5f8d1183b9e09daaa6238026168ce3d2de9 "View full commit range on GitHub")



### ✨ Features

- [`43f0995`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/43f0995ebac532492d187b6d024a7a6419a8e315 "📝 Diff: 12 files, ++316 | --31") — ✨ [feat] Enhance parser and printer functionality for operator handling

- 🛠️ [fix] Introduce FALLBACK_OPERATOR_TOKENS in parser to correctly identify operator roles for increment and decrement tokens.

- 🛠️ [fix] Update createTextNode function to assign operator role to known fallback tokens, ensuring proper handling during parsing.

- ⚡ [perf] Refactor printExpression to normalize operator parts and handle concatenated operators, improving output consistency.

- ⚡ [perf] Enhance gapBetween function to manage spacing for concatenated operators and specific conditions, ensuring cleaner output.

- 🧪 [test] Add tests to validate correct handling of increment operators and indexers in printer.

- 🧪 [test] Extend gapBetween tests to ensure correct behavior with operator pairs and array literals.

🧹 [chore] Remove outdated todo list

- 🗑️ [delete] Delete todo.md as tasks have been addressed and completed.



### 🧹 Chores

- [`2eb8c5f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/2eb8c5f8d1183b9e09daaa6238026168ce3d2de9 "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.8



### 🔧 Build System

- [`54a4edf`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/54a4edf5074cb2680447ca90f19e7cfca224c916 "📝 Diff: 4 files, ++4 | --4") — 🔧 [build] Update metafiles for CommonJS and ESM outputs


- 🛠️ [fix] Adjust byte sizes in `dist/metafile-cjs.json` for `src/parser.ts` and `dist/index.cjs.map`

- 🛠️ [fix] Correct byte sizes in `dist/metafile-esm.json` for `src/parser.ts` and `dist/index.js.map`

- 🔄 [refactor] Ensure consistency in input sizes across both CommonJS and ESM metafiles






## [1.0.7] - 2025-11-06


- <b>Commit Range: ➡️</b> [`10769a1...10769a1`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/10769a17c5c918fc8ef0b90c1703dcedb03ccde2...10769a17c5c918fc8ef0b90c1703dcedb03ccde2 "View full commit range on GitHub")



### 🧹 Chores

- [`10769a1`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/10769a17c5c918fc8ef0b90c1703dcedb03ccde2 "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.7






## [1.0.6] - 2025-11-06


- <b>Commit Range: ➡️</b> [`7408263...ab73f18`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/74082633b4315b4b07abc928867db550959fbbba...ab73f18504e5885231e80f7896a97ce6258ae67f "View full commit range on GitHub")



### 📦 Dependencies

- [`7408263`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/74082633b4315b4b07abc928867db550959fbbba "📝 Diff: 2 files, ++173 | --141") — *(deps)* [dependency] Update devDependencies and regenerate lockfile



### 🧹 Chores

- [`ab73f18`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/ab73f18504e5885231e80f7896a97ce6258ae67f "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.6






## [1.0.5] - 2025-11-06


- <b>Commit Range: ➡️</b> [`77df3da...380e615`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/77df3dab3d694d8bef7bbd12bd43109224c6c127...380e615cc32837e2b20474699aec98b9ce6b1327 "View full commit range on GitHub")



### 🛠️ Bug Fixes

- [`f3e0b3b`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/f3e0b3b8214e44b3f9457f9e637652834947818c "📝 Diff: 9 files, ++19 | --32") — Improve lint scripts; fix parser comment handling & structure-end; guard printer concat



### 📦 Dependencies

- [`728dd69`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/728dd69699fdb5bbf0fd7c700967adb170c1fee3 "📝 Diff: 3 files, ++5 | --5") — *(deps)* [dependency] Update github/codeql-action in the github-actions group


- [`973a3a9`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/973a3a93b450ca7bd1a2c0da4cbfcf6fb2efd782 "📝 Diff: 2 files, ++82 | --89") — *(deps)* [dependency] Update dependency group
- [`b8de5e1`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/b8de5e1376c3d2c594e978f39a7303b5dde5d8cc "📝 Diff: 2 files, ++61 | --91") — *(deps)* [dependency] Update dependency group
- [`6155322`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/61553223aaeccb935ce7aed5deffedcb4d2acac0 "📝 Diff: 1 file, ++59 | --8") — Update dependabot.yml


- [`c954198`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/c954198ce267ae70192b1fead00c45e17833ecf5 "📝 Diff: 1 file, ++2 | --2") — Update dependabot.yml



### 🛡️ Security

- [`cd7ebeb`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/cd7ebeb47bc7fa4e0f019b1835b7364939c1bf37 "📝 Diff: 8 files, ++15 | --15") — *(deps)* [dependency] Update dependency group
- [`77df3da`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/77df3dab3d694d8bef7bbd12bd43109224c6c127 "📝 Diff: 4 files, ++94 | --1") — [StepSecurity] Apply security best practices



### 🛠️ Other Changes

- [`5818042`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/5818042ad95b398c692692754aa161673ce99c18 "📝 Diff: 11 files, ++193 | --87") — Preserve '|' tokens inside nested structures instead of splitting top-level pipeline


- [`8e9d2c0`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/8e9d2c04f1534e4722565bf4022f6533d23b9d4a "📝 Diff: 12 files, ++869 | --207") — Add block-comment & attribute support; improve tokenizer, parser, printer, options and tests

- Tokenizer
 
- Add support for PowerShell block comments (<# ... #>) as 'block-comment' tokens.
 
- Recognize attribute constructs ([...]) as an 'attribute' token, including nested brackets and quoted content.
 
- Recognize redirection-like operators '<' and '>' (and doubles like '<<'/'>>') as operators.
 
- Harden identifier/flag detection (better handling for leading '-' and adjacent characters).

- Parser
 
- Accept and propagate 'block-comment' and 'attribute' tokens.
 
- createCommentNode now includes a style ('line'|'block') and inline detection logic.
 
- Attach comment nodes to nearby ScriptBlock / Pipeline nodes when appropriate (so comments that belong inside blocks are preserved).
 
- Pass source text into expression/script-block parsing to preserve attribute/raw sources.
 
- Add resolveStructureEnd to robustly determine ends for unterminated structures.
 
- Ensure pipeline start location is derived from parsed expression parts instead of raw token to be more accurate.
 
- Added utilities for inline comment detection and attribute handling.

- Printer
 
- Print block comments as raw block content; line comments continue to be printed with '#'.
 
- Trailing comments on pipelines: inline comments are rendered as lineSuffix, non-inline block comments are printed on their own line.
 
- Merge certain comment nodes into the previous printed node when comment location indicates they belong to the prior construct.
 
- Param parenthesis printing: support printing attribute lines above parameters (collect and flush attribute docs) so attributes like [CmdletBinding()] and [Parameter(...)] are preserved and grouped.
 
- Adjust gap/spacing rules around parentheses and symbols; expand NO_SPACE sets to handle '>' and '<' and tweak logic for keyword/param spacing.

- Options
 
- Normalize indent and blank-line options more robustly:
   
- Use Number()/Number.isFinite and Math.floor to derive indent sizes and blank-line counts and fall back safely.
   
- Respect powershellIndentSize, fall back to tabWidth or default.
   
- Normalize powershellBlankLinesBetweenFunctions and powershellBlankLineAfterParam handling.
 
- Keep tabWidth/options.useTabs consistent with resolved indent.

- AST / Types
 
- Add 'style' to CommentNode type ('line' | 'block').

- Tests
 
- Update tests to include comment style change.
 
- Add a test that ensures block comments, attributes, and double-dash arguments are preserved and formatted correctly.
 
- Adjust existing test expectations for the new comment/attribute behavior.

- Build
 
- Regenerate/dist artifacts and metafiles to reflect source changes.

Notes:
- These changes improve fidelity for PowerShell-specific constructs (attributes, block comments, redirections) and make formatting/AST attachment of comments more accurate.
- Non-breaking behavior preserved for most existing flows; whitespace and printing around parameters/attributes improved.



### 🧪 Testing

- [`740bc70`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/740bc70ac8fdb4a2bd4498b45ac037c3435166e4 "📝 Diff: 1 file, ++4 | --4") — Relax vitest coverage thresholds to 95%



### 🧹 Chores

- [`380e615`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/380e615cc32837e2b20474699aec98b9ce6b1327 "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.5


- [`bcbda2c`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/bcbda2c9632d521da429ea05856d78af5f69523c "📝 Diff: 33 files, ++14616 | --0") — 🧹 [chore] add test files






## [1.0.4] - 2025-10-28


- <b>Commit Range: ➡️</b> [`1979da8...47e2308`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/1979da8a15c352adba0b9f1b18eb4ddfcb023e58...47e230881dd668c2bc23156771770362da8145fe "View full commit range on GitHub")



### 🛠️ Other Changes

- [`1979da8`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/1979da8a15c352adba0b9f1b18eb4ddfcb023e58 "📝 Diff: 1 file, ++1 | --1") — Update package.json



### 🧹 Chores

- [`47e2308`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/47e230881dd668c2bc23156771770362da8145fe "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.4






## [1.0.3] - 2025-10-28


- <b>Commit Range: ➡️</b> [`545e09c...0b4dc7c`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/545e09cd84d77f0653c7bc9a3b794786b7ac5a90...0b4dc7ce6989df8f7ca51e8be6bb6b8d5e4d787f "View full commit range on GitHub")



### 🛡️ Security

- [`c3c955f`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/c3c955ff1c1323aa863e00f65b5486f0727be9c5 "📝 Diff: 7 files, ++252 | --1") — 👷 [ci] Add comprehensive linting and security scanning

This commit introduces a robust suite of linting, formatting, and security scanning tools to improve code quality and maintain repository health.

👷 [ci] Adds a new MegaLinter GitHub Actions workflow.

- Triggers on push, pull request, and manual dispatch.

- Integrates various linters and security scanners into the CI pipeline.

- Configures multiple reporters for detailed feedback, including GitHub comments and PR summaries.

- Uploads detailed reports as build artifacts for further analysis.

🧹 [chore] Introduces configuration files for linters and scanners.

- Adds `.mega-linter.yml` to centrally manage linter settings, enabling autofixes and specifying configurations for PowerShell, Markdown, YAML, and various security tools.

- Adds `.markdownlint.json` and `.markdown-link-check.json` to customize Markdown linting and prevent false positives in link checking.

- Adds `.trufflehog.yml` to configure secret scanning and exclude known false positives, such as Codecov slugs.

- Adds `.pre-commit-config.yaml` to enable local pre-commit hooks for Gitleaks, trailing whitespace, and end-of-file fixing.

🛠️ [fix] Updates the TruffleHog workflow to use a dedicated configuration file, improving the accuracy of secret detection.


- [`545e09c`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/545e09cd84d77f0653c7bc9a3b794786b7ac5a90 "📝 Diff: 15 files, ++781 | --0") — 👷 [ci] Add comprehensive GitHub Actions workflows

This commit introduces a suite of GitHub Actions workflows to automate various aspects of the development lifecycle, including security scanning, dependency management, and documentation.

👷 [ci] Enhance Continuous Integration Pipeline

- Adds an `update_changelogs` job to the main `ci.yml` workflow.
  
- Automates the generation of `CHANGELOG.md` files using `git-cliff`.
  
- Creates a pull request with the updated changelogs.
  
- Utilizes GitHub Check Runs to provide detailed status feedback.

🛡️ [ci] Integrate Security Scanning Workflows

- Adds `ActionLint.yml` to lint GitHub Actions workflow files for errors and best practices.

- Adds `dependency-review.yml` to scan for known vulnerabilities in dependencies on pull requests.

- Adds `gitleaks.yml` and `trufflehog.yml` to scan for hardcoded secrets and credentials in the repository.

- Adds `scorecards.yml` to run OpenSSF Scorecard analysis for supply-chain security best practices.

- Adds `security-devops.yml` to integrate Microsoft Security DevOps for static analysis.

🧹 [chore] Automate Repository Maintenance Tasks

- Adds `greetings.yml` to welcome first-time contributors on new issues and pull requests.

- Adds `rebase.yml` to allow automatic rebasing of pull requests via comments.

- Adds `stale.yml` to automatically mark and close inactive issues and pull requests.

- Adds `summary.yml` to use AI for generating summaries of new issues.

📝 [docs] Add GitHub Pages Deployment

- Adds `jekyll-gh-pages.yml` workflow to build and deploy a Jekyll site to GitHub Pages.

- Includes a `_config.yml` file to configure the Jekyll site theme and metadata.

🔧 [build] Configure Development Environment

- Adds a `cliff.toml` file to configure `git-cliff` for custom changelog generation.

- Adds a `.vscode/settings.json` file to configure the Vitest root for the workspace.



### 🛠️ Other Changes

- [`565774a`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/565774adebbae20311d8de60ae3fff0a4f4ec8ba "📝 Diff: 1 file, ++3 | --3") — Update package.json



### 🧹 Chores

- [`0b4dc7c`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/0b4dc7ce6989df8f7ca51e8be6bb6b8d5e4d787f "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.3


- [`39a3d69`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/39a3d69bd15006bc93c3b8fdef64ca6780c3b7ba "📝 Diff: 2 files, ++0 | --13") — 🧹 [chore] Simplify and clean up linter configurations

This commit refactors and simplifies various linter configurations to rely more on default behaviors and reduce maintenance overhead.

🧹 [chore] Simplifies the `.mega-linter.yml` configuration:

- Removes explicit configuration file paths for several linters.

- This change allows the linters to use their default discovery mechanisms to find their respective configuration files (e.g., `.yamllint.yml`, `.gitleaks.toml`).

- Affects the configurations for `PSScriptAnalyzer`, `gitleaks`, `secretlint`, and `yamllint`.

🧹 [chore] Cleans up the `.trufflehog.yml` configuration:

- Removes a no-longer-needed `allow` rule.

- This rule was previously used to ignore a false positive related to a Codecov slug parameter in the CI workflow.



### 👷 CI/CD

- [`e752901`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/e752901c59369a965a9f0b5051399b64a10ea482 "📝 Diff: 1 file, ++0 | --56") — 👷 [ci] Remove GH check-run creation and update steps from changelog workflow

- 👷 [ci] Delete "Create Check Run" step that used gh api to open an in-progress check

- 👷 [ci] Remove "Update Check Run" and "Complete Check Run" steps that patched check-run status

- 👷 [ci] Remove job summary entry referencing check runs and simplify update_changelogs flow






## [1.0.2] - 2025-10-26


- <b>Commit Range: ➡️</b> [`2f26072...d71ea2a`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/2f260728c0f64c17bfa1775162604cfaa14c7195...d71ea2a21ce874bad3d9a6421fb4662f5d12b2b5 "View full commit range on GitHub")



### 🛡️ Security

- [`0903b3c`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/0903b3c4fdbbe1e29707aaefb39ec3d944ca711e "📝 Diff: 8 files, ++190 | --51") — ✨ [feat] Add CI pipeline and overhaul project documentation

This commit introduces a comprehensive set of improvements to establish a robust development and contribution workflow.

👷 [ci]

- Adds a new GitHub Actions workflow for continuous integration.

- The CI pipeline runs on pushes and pull requests to the `main` branch.

- Includes jobs for linting, typechecking, running tests with coverage, and uploading reports to Codecov.

- Implements security hardening for the runner using `step-security/harden-runner`.

📝 [docs]

- Overhauls the `README.md` to be more comprehensive and user-friendly.

- Adds sections for Highlights, Quick Start, Automation, Contributing, and Credits.

- Includes CI, Codecov, and npm badges for project status visibility.

- Adds a project mascot image to the README.

- Reorganizes configuration options and project scripts into clear tables.

- Adds a new `LICENSE.md` file with the UnLicense, releasing the software into the public domain.

🔧 [build]

- Adjusts dependency metadata in `package-lock.json`.



### 🧪 Testing

- [`2f26072`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/2f260728c0f64c17bfa1775162604cfaa14c7195 "📝 Diff: 7 files, ++1567 | --73") — 🧪 [test] Add comprehensive test suite for full coverage

This commit introduces a new test file, `advanced-coverage.test.ts`, to achieve near-100% test coverage across the tokenizer, parser, printer, and options resolution logic.

✨ [feat] Add AST runtime helpers
- Exports `createLocation`, `isNodeType`, and `cloneNode` utility functions from the AST module. These are bundled in a frozen `runtimeExports` object for safe external use.

🚜 [refactor] Improve parser and options robustness
- Strengthens parser logic by removing redundant null checks and using non-null assertions where appropriate, simplifying control flow.
- Refactors option resolution to be more robust, adding explicit validation and normalization for numeric inputs like indent size and blank lines.
- Introduces a `resolveStructureEnd` helper function to consistently calculate the end location of structured nodes (e.g., arrays, parentheses), correctly handling unterminated cases.

🎨 [style] Refine parenthesis printing logic
- Adjusts the printing of parenthesis nodes to better handle multiline scenarios, especially when elements are not separated by commas.

🧪 [test] Expose internal functions for testing
- Exports internal helper functions from the parser and printer modules under `__...TestUtils` objects to facilitate detailed unit testing.
- Adds `/* c8 ignore next */` comments to exclude hard-to-test edge cases from coverage reports, such as specific `false` option configurations.



### 🧹 Chores

- [`d71ea2a`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/d71ea2a21ce874bad3d9a6421fb4662f5d12b2b5 "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.2






## [1.0.1] - 2025-10-26


- <b>Commit Range: ➡️</b> [`f7909d4...ffa8777`](https://github.com/Nick2bad4u/prettier-plugin-powershell/compare/f7909d43f2d924ce48bcffc75960bcfe18baaad8...ffa8777974d685a83e5c837dcf6679fb84894637 "View full commit range on GitHub")



### 🛠️ Other Changes

- [`f7909d4`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/f7909d43f2d924ce48bcffc75960bcfe18baaad8 "📝 Diff: 10098 files, ++1677648 | --0") — First commit



### 🧪 Testing

- [`05a0c4b`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/05a0c4b2ab2d391505fd188a19d2eabcdf48173c "📝 Diff: 1 file, ++1 | --0") — Test


- [`8413532`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/8413532ad02df386e6315db1e820d463086ef773 "📝 Diff: 91 files, ++1574 | --5592") — Test


- [`324844b`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/324844b29b1137ab4a69b0e426f47ea7e27dcf0d "📝 Diff: 10003 files, ++6764 | --1667549") — Test



### 🧹 Chores

- [`ffa8777`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/ffa8777974d685a83e5c837dcf6679fb84894637 "📝 Diff: 1 file, ++1 | --1") — [dependency] Update version 1.0.1



### 🔧 Build System

- [`a8e9fd5`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/a8e9fd5e65fed44f9f34ac58472c6a4b32d2ae05 "📝 Diff: 21 files, ++1179 | --612") — 🔧 [build] Revamp tsup build invocation to produce richer outputs

- Replace lightweight build command in package.json with a comprehensive tsup invocation that enables: --dts src/index.ts, --dts-resolve, --sourcemap, --tsconfig tsconfig.json, --shims, --treeshake safest, --cjsInterop, --metafile and --clean

- Ensure both ESM and CJS bundles are emitted with shims & CJS interop and that source maps and declaration assets are produced for better debugging and downstream consumers

🧹 [chore] Align TypeScript configuration for deterministic build artifacts

- Update tsconfig.base.json to explicitly set declarationDir, outDir, declarationMap, esModuleInterop, module (ESNext), target (ES2020), moduleResolution ('Bundler') and related strict/emit flags

- Enable incremental builds, source maps and tune skipLibCheck/skipDefaultLibCheck to balance build reliability and speed, matching tsup expectations

🧹 [chore] Simplify library entry exports (default-only)

- Remove named re-exports (languages, parsers, printers, pluginOptions as options, defaultOptions) from src/index.ts so the package surface exposes the plugin as the default export only

- Regenerate distribution typings and entry artifacts to reflect the new export shape (CJS uses export = plugin; ESM exposes plugin as default alias)

👷 [ci] Emit tsup metafiles for bundle diagnostics

- Add dist/metafile-esm.json and dist/metafile-cjs.json into dist to capture input→output mapping, per-file bytes and imports for bundle analysis and CI auditing

🛠️ [fix] Regenerate and polish distribution artifacts

- Rebuild dist files to apply the updated build/config, which includes minor parser/printer tweaks and defensive null/coalescing simplifications in the compiled output

- Update dist index maps and declaration artifacts so runtime and types align with the new build flags and export semantics

🎨 [style] Tidy generated output for readability

- Normalize a number of object/array formatting patterns and wrap long option objects in the built files to make the compiled output easier to scan and review


- [`a9bc23e`](https://github.com/Nick2bad4u/prettier-plugin-powershell/commit/a9bc23eb6a5e4497501b828a743aca239c463f3b "📝 Diff: 12 files, ++319 | --240") — 🔧 [build] Toughen TypeScript configuration and apply formatting

This commit introduces a stricter TypeScript configuration and applies widespread code formatting changes to improve code quality, consistency, and maintainability.

🔧 [build] Harden `tsconfig.base.json` for stricter type checking.

- Adds numerous compiler options (`exactOptionalPropertyTypes`, `strictNullChecks`, `useUnknownInCatchVariables`, etc.) to enforce a more robust and safe codebase.

- Enables `verbatimModuleSyntax` and `isolatedModules` for better module compliance.

🎨 [style] Enforce trailing commas across the codebase.

- Adds trailing commas to arrays, object literals, and function parameters in source, test, and configuration files. This improves git diffs and makes it easier to add or reorder items.

🚜 [refactor] Refactor `PipelineNode` creation in the parser.

- The `trailingComment` property is now conditionally added to the `PipelineNode`, making the AST cleaner when no trailing comment exists.

🧹 [chore] Update development and testing configurations.

- Removes the unused `mode` parameter in the Vite configuration.

- Sets the `rootDir` in `tsconfig.json` to resolve module paths correctly.






## ⭐ Contributors
Thanks to all the [contributors](https://github.com/Nick2bad4u/prettier-plugin-powershell/graphs/contributors) for their hard work!
## 📜 License
This project is licensed under the [UnLicense](https://github.com/Nick2bad4u/prettier-plugin-powershell/blob/main/LICENSE)
*This changelog was automatically generated with [git-cliff](https://github.com/orhun/git-cliff).*
