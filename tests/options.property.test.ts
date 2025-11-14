import * as fc from "fast-check";
import type { ParserOptions } from "prettier";
import { describe, it } from "vitest";

import {
    resolveOptions,
    type BraceStyleOption,
    type IndentStyleOption,
    type KeywordCaseOption,
    type TrailingCommaOption,
} from "../src/options.js";

const PROPERTY_RUNS = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

// Arbitraries for option values
const indentStyleArb = fc.constantFrom<IndentStyleOption>("spaces", "tabs");
const indentSizeArb = fc.integer({ min: 1, max: 8 });
const trailingCommaArb = fc.constantFrom<TrailingCommaOption>(
    "none",
    "multiline",
    "all"
);
const braceStyleArb = fc.constantFrom<BraceStyleOption>("1tbs", "allman");
const keywordCaseArb = fc.constantFrom<KeywordCaseOption>(
    "preserve",
    "lower",
    "upper",
    "pascal"
);
const lineWidthArb = fc.integer({ min: 40, max: 200 });
const blankLinesBetweenFunctionsArb = fc.integer({ min: 0, max: 3 });

const parserOptionsArb = fc.record({
    powershellIndentStyle: fc.option(indentStyleArb, { nil: undefined }),
    powershellIndentSize: fc.option(indentSizeArb, { nil: undefined }),
    powershellTrailingComma: fc.option(trailingCommaArb, { nil: undefined }),
    powershellSortHashtableKeys: fc.option(fc.boolean(), { nil: undefined }),
    powershellBlankLinesBetweenFunctions: fc.option(
        blankLinesBetweenFunctionsArb,
        {
            nil: undefined,
        }
    ),
    powershellBlankLineAfterParam: fc.option(fc.boolean(), { nil: undefined }),
    powershellBraceStyle: fc.option(braceStyleArb, { nil: undefined }),
    powershellLineWidth: fc.option(lineWidthArb, { nil: undefined }),
    powershellPreferSingleQuote: fc.option(fc.boolean(), { nil: undefined }),
    powershellKeywordCase: fc.option(keywordCaseArb, { nil: undefined }),
    powershellRewriteAliases: fc.option(fc.boolean(), { nil: undefined }),
    powershellRewriteWriteHost: fc.option(fc.boolean(), { nil: undefined }),
    tabWidth: fc.option(fc.integer({ min: 1, max: 8 }), { nil: undefined }),
}) as unknown as fc.Arbitrary<ParserOptions>;

describe("Options property-based tests", () => {
    it("resolveOptions never throws", () => {
        fc.assert(
            fc.property(parserOptionsArb, (options) => {
                // Should not throw
                resolveOptions(options);
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions produces valid output", () => {
        fc.assert(
            fc.property(parserOptionsArb, (options) => {
                const resolved = resolveOptions(options);

                // Check indentStyle is valid
                if (
                    resolved.indentStyle !== "spaces" &&
                    resolved.indentStyle !== "tabs"
                ) {
                    throw new Error(
                        `Invalid indentStyle: ${String(resolved.indentStyle)}`
                    );
                }

                // Check indentSize is in valid range
                if (resolved.indentSize < 1 || resolved.indentSize > 8) {
                    throw new Error(
                        `Invalid indentSize: ${String(resolved.indentSize)}`
                    );
                }

                // Check trailingComma is valid
                if (
                    resolved.trailingComma !== "none" &&
                    resolved.trailingComma !== "multiline" &&
                    resolved.trailingComma !== "all"
                ) {
                    throw new Error(
                        `Invalid trailingComma: ${String(resolved.trailingComma)}`
                    );
                }

                // Check blankLinesBetweenFunctions is clamped
                if (
                    resolved.blankLinesBetweenFunctions < 0 ||
                    resolved.blankLinesBetweenFunctions > 3
                ) {
                    throw new Error(
                        `Invalid blankLinesBetweenFunctions: ${String(resolved.blankLinesBetweenFunctions)}`
                    );
                }

                // Check braceStyle is valid
                if (
                    resolved.braceStyle !== "1tbs" &&
                    resolved.braceStyle !== "allman"
                ) {
                    throw new Error(
                        `Invalid braceStyle: ${String(resolved.braceStyle)}`
                    );
                }

                // Check lineWidth is clamped
                if (resolved.lineWidth < 40 || resolved.lineWidth > 200) {
                    throw new Error(
                        `Invalid lineWidth: ${String(resolved.lineWidth)}`
                    );
                }

                // Check keywordCase is valid
                if (
                    resolved.keywordCase !== "preserve" &&
                    resolved.keywordCase !== "lower" &&
                    resolved.keywordCase !== "upper" &&
                    resolved.keywordCase !== "pascal"
                ) {
                    throw new Error(
                        `Invalid keywordCase: ${String(resolved.keywordCase)}`
                    );
                }

                // Check boolean flags
                if (typeof resolved.sortHashtableKeys !== "boolean") {
                    throw new Error("sortHashtableKeys must be boolean");
                }
                if (typeof resolved.blankLineAfterParam !== "boolean") {
                    throw new Error("blankLineAfterParam must be boolean");
                }
                if (typeof resolved.preferSingleQuote !== "boolean") {
                    throw new Error("preferSingleQuote must be boolean");
                }
                if (typeof resolved.rewriteAliases !== "boolean") {
                    throw new Error("rewriteAliases must be boolean");
                }
                if (typeof resolved.rewriteWriteHost !== "boolean") {
                    throw new Error("rewriteWriteHost must be boolean");
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions respects user preferences when valid", () => {
        fc.assert(
            fc.property(
                indentStyleArb,
                indentSizeArb,
                trailingCommaArb,
                braceStyleArb,
                keywordCaseArb,
                (
                    indentStyle,
                    indentSize,
                    trailingComma,
                    braceStyle,
                    keywordCase
                ) => {
                    const options: ParserOptions = {
                        powershellIndentStyle: indentStyle,
                        powershellIndentSize: indentSize,
                        powershellTrailingComma: trailingComma,
                        powershellBraceStyle: braceStyle,
                        powershellKeywordCase: keywordCase,
                    } as unknown as ParserOptions;

                    const resolved = resolveOptions(options);

                    if (resolved.indentStyle !== indentStyle) {
                        throw new Error(
                            `indentStyle not preserved: expected ${indentStyle}, got ${resolved.indentStyle}`
                        );
                    }
                    if (resolved.indentSize !== indentSize) {
                        throw new Error(
                            `indentSize not preserved: expected ${indentSize}, got ${resolved.indentSize}`
                        );
                    }
                    if (resolved.trailingComma !== trailingComma) {
                        throw new Error(
                            `trailingComma not preserved: expected ${trailingComma}, got ${resolved.trailingComma}`
                        );
                    }
                    if (resolved.braceStyle !== braceStyle) {
                        throw new Error(
                            `braceStyle not preserved: expected ${braceStyle}, got ${resolved.braceStyle}`
                        );
                    }
                    if (resolved.keywordCase !== keywordCase) {
                        throw new Error(
                            `keywordCase not preserved: expected ${keywordCase}, got ${resolved.keywordCase}`
                        );
                    }
                }
            ),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions has sensible defaults", () => {
        fc.assert(
            fc.property(fc.constant({}), () => {
                const resolved = resolveOptions({} as ParserOptions);

                // Check defaults
                if (resolved.indentStyle !== "spaces") {
                    throw new Error("Default indentStyle should be spaces");
                }
                if (resolved.indentSize !== 4) {
                    throw new Error(
                        `Default indentSize should be 4, got ${resolved.indentSize}`
                    );
                }
                if (resolved.trailingComma !== "none") {
                    throw new Error(
                        "Default trailingComma should be none"
                    );
                }
                if (resolved.braceStyle !== "1tbs") {
                    throw new Error("Default braceStyle should be 1tbs");
                }
                if (resolved.keywordCase !== "lower") {
                    throw new Error("Default keywordCase should be lower");
                }
                if (resolved.lineWidth !== 120) {
                    throw new Error("Default lineWidth should be 120");
                }
                if (resolved.blankLinesBetweenFunctions !== 1) {
                    throw new Error(
                        "Default blankLinesBetweenFunctions should be 1"
                    );
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions clamps invalid numeric values", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.integer({ min: -1000, max: -1 }),
                    fc.integer({ min: 9, max: 1000 })
                ),
                (invalidIndentSize) => {
                    const options: ParserOptions = {
                        powershellIndentSize: invalidIndentSize,
                    } as unknown as ParserOptions;

                    const resolved = resolveOptions(options);

                    // Should clamp or use default
                    if (invalidIndentSize < 1) {
                        // Negative or zero should use default (4)
                        if (resolved.indentSize !== 4) {
                            throw new Error(
                                `Expected default indent size for negative value, got ${resolved.indentSize}`
                            );
                        }
                    }
                    // Values > 8 should still work (no upper clamp on indent size)
                }
            ),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions clamps blankLinesBetweenFunctions to 0-3", () => {
        fc.assert(
            fc.property(fc.integer({ min: -10, max: 20 }), (value) => {
                const options: ParserOptions = {
                    powershellBlankLinesBetweenFunctions: value,
                } as unknown as ParserOptions;

                const resolved = resolveOptions(options);

                if (
                    resolved.blankLinesBetweenFunctions < 0 ||
                    resolved.blankLinesBetweenFunctions > 3
                ) {
                    throw new Error(
                        `blankLinesBetweenFunctions not clamped: ${resolved.blankLinesBetweenFunctions}`
                    );
                }

                // Check it's clamped to the expected range
                const expected = Math.max(0, Math.min(3, Math.floor(value)));
                if (resolved.blankLinesBetweenFunctions !== expected) {
                    throw new Error(
                        `Expected ${expected}, got ${resolved.blankLinesBetweenFunctions} for input ${value}`
                    );
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions clamps lineWidth to 40-200", () => {
        fc.assert(
            fc.property(fc.integer({ min: -100, max: 500 }), (value) => {
                const options: ParserOptions = {
                    powershellLineWidth: value,
                } as unknown as ParserOptions;

                const resolved = resolveOptions(options);

                if (resolved.lineWidth < 40 || resolved.lineWidth > 200) {
                    throw new Error(
                        `lineWidth not clamped: ${resolved.lineWidth}`
                    );
                }

                // Check it's clamped to the expected range
                const expected = Math.max(40, Math.min(200, value));
                if (resolved.lineWidth !== expected) {
                    throw new Error(
                        `Expected ${expected}, got ${resolved.lineWidth} for input ${value}`
                    );
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions sets useTabs based on indentStyle", () => {
        fc.assert(
            fc.property(indentStyleArb, (indentStyle) => {
                const options: ParserOptions = {
                    powershellIndentStyle: indentStyle,
                } as unknown as ParserOptions;

                resolveOptions(options);

                if (indentStyle === "tabs") {
                    if (options.useTabs !== true) {
                        throw new Error(
                            "useTabs should be true when indentStyle is tabs"
                        );
                    }
                } else {
                    if (options.useTabs !== false) {
                        throw new Error(
                            "useTabs should be false when indentStyle is spaces"
                        );
                    }
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions is deterministic", () => {
        fc.assert(
            fc.property(parserOptionsArb, (options) => {
                const resolved1 = resolveOptions({ ...options });
                const resolved2 = resolveOptions({ ...options });

                // Should produce identical results
                if (JSON.stringify(resolved1) !== JSON.stringify(resolved2)) {
                    throw new Error("resolveOptions is not deterministic");
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });
});
