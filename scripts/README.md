Migration helper scripts
========================

This folder contains ad-hoc migration helper scripts that were used to migrate tests to the new `formatAndAssert` and `formatAndAssertRoundTrip` helpers.

These scripts are not part of the runtime or test suite and can be safely removed or archived. They include:
- add-asserts.js — Helps with adding parse asserts to files
- add-format-assert-imports.js — Adds imports where needed
- clean-duplicated-asserts.js — Cleans duplicate asserts after a conversion
- cleanup-unused-assert-imports.js — Remove unused imports
- convert-prettier-format-to-helpers.js — Convert assigned prettier.format calls to helper
- convert-unassigned-prettier-format.js — Convert unassigned prettier.format calls to helper
- use-format-and-assert.js — Convert patterns to use formatAndAssert
- use-format-and-assert-roundtrip.js — Convert idempotence conversions to formatAndAssertRoundTrip
- dedupe-format-and-assert-imports.js — Dedupe import statements

If you want to preserve these scripts for future large-scale refactors, move them to a `scripts/migration/` folder or an internal archive; else they can be deleted.
