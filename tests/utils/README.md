# format-and-assert helper

This folder contains test helpers used across the test suite for formatting PowerShell code with Prettier and asserting the output parses back to a valid AST.

## formatAndAssert

Usage: import { formatAndAssert } from "./format-and-assert.js";

Example:

```
const formatted = await formatAndAssert(script, baseConfig, { id: 'test.id' });
```

Options:

- id (string): an id used to label the assertion logs.
- skipParse (boolean): if true, skip the parser assertion step (useful for intentionally non-parseable inputs).

## formatAndAssertRoundTrip

Usage: import { formatAndAssertRoundTrip } from "./format-and-assert.js";

Example:

```
const formatted = await formatAndAssertRoundTrip(script, baseConfig, { id: 'test.id' });
```

This helper formats the script twice and verifies the formatted output is idempotent (formatting the formatted output yields the same text). It asserts parser success for each formatted pass unless skipParse is set.

## Notes

- Tests should not call `prettier.format(...)` directly; use the `formatAndAssert` or `formatAndAssertRoundTrip` helpers instead. This is enforced with an ESLint rule and a dedicated test (`tests/utils/no-prettier-format.test.ts`).
- Tests that expect the formatter to handle invalid input (e.g., `NO_PARSE_ASSERT` fixtures) can use `skipParse: true` on the helpers to skip parse assertions, or use the helper to wrap `prettier.format` logic. If you need to call `prettier.format` directly for a special case, consider adding a small helper inside `tests/utils` and add a reason/comment explaining why the helper is needed.
- Using these helpers centralizes logging and parse assertions and reduces duplication.
