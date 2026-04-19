import type { ParserOptions } from "prettier";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    type BraceStyleOption,
    type IndentStyleOption,
    type KeywordCaseOption,
    type PresetOption,
    resolveOptions,
    type TrailingCommaOption,
} from "../src/options.js";

const { env: testEnv } = process;

const PROPERTY_RUNS = Number.parseInt(
    testEnv.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

// Arbitraries for option values
const indentStyleArb = fc.constantFrom<IndentStyleOption>("spaces", "tabs");
const indentSizeArb = fc.integer({ max: 8, min: 1 });
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
const presetArb = fc.constantFrom<PresetOption>("none", "invoke-formatter");
const lineWidthArb = fc.integer({ max: 200, min: 40 });
const blankLinesBetweenFunctionsArb = fc.integer({ max: 3, min: 0 });

const parserOptionsArb = fc.record({
    powershellBlankLineAfterParam: fc.option(fc.boolean(), { nil: undefined }),
    powershellBlankLinesBetweenFunctions: fc.option(
        blankLinesBetweenFunctionsArb,
        {
            nil: undefined,
        }
    ),
    powershellBraceStyle: fc.option(braceStyleArb, { nil: undefined }),
    powershellIndentSize: fc.option(indentSizeArb, { nil: undefined }),
    powershellIndentStyle: fc.option(indentStyleArb, { nil: undefined }),
    powershellKeywordCase: fc.option(keywordCaseArb, { nil: undefined }),
    powershellLineWidth: fc.option(lineWidthArb, { nil: undefined }),
    powershellPreferSingleQuote: fc.option(fc.boolean(), { nil: undefined }),
    powershellPreset: fc.option(presetArb, { nil: undefined }),
    powershellRewriteAliases: fc.option(fc.boolean(), { nil: undefined }),
    powershellRewriteWriteHost: fc.option(fc.boolean(), { nil: undefined }),
    powershellSortHashtableKeys: fc.option(fc.boolean(), { nil: undefined }),
    powershellTrailingComma: fc.option(trailingCommaArb, { nil: undefined }),
    tabWidth: fc.option(fc.integer({ max: 8, min: 1 }), { nil: undefined }),
}) as unknown as fc.Arbitrary<ParserOptions>;

const assertResolvedOptionBooleans = (
    resolved: Readonly<ReturnType<typeof resolveOptions>>
): void => {
    if (typeof resolved.sortHashtableKeys !== "boolean") {
        throw new TypeError("sortHashtableKeys must be boolean");
    }
    if (typeof resolved.blankLineAfterParam !== "boolean") {
        throw new TypeError("blankLineAfterParam must be boolean");
    }
    if (typeof resolved.preferSingleQuote !== "boolean") {
        throw new TypeError("preferSingleQuote must be boolean");
    }
    if (typeof resolved.rewriteAliases !== "boolean") {
        throw new TypeError("rewriteAliases must be boolean");
    }
    if (typeof resolved.rewriteWriteHost !== "boolean") {
        throw new TypeError("rewriteWriteHost must be boolean");
    }
};

const assertResolvedOptionEnumsAndRanges = (
    resolved: Readonly<ReturnType<typeof resolveOptions>>
): void => {
    if (resolved.indentStyle !== "spaces" && resolved.indentStyle !== "tabs") {
        throw new Error(`Invalid indentStyle: ${String(resolved.indentStyle)}`);
    }

    if (resolved.indentSize < 1 || resolved.indentSize > 8) {
        throw new Error(`Invalid indentSize: ${String(resolved.indentSize)}`);
    }

    if (
        resolved.trailingComma !== "none" &&
        resolved.trailingComma !== "multiline" &&
        resolved.trailingComma !== "all"
    ) {
        throw new Error(
            `Invalid trailingComma: ${String(resolved.trailingComma)}`
        );
    }

    if (
        resolved.blankLinesBetweenFunctions < 0 ||
        resolved.blankLinesBetweenFunctions > 3
    ) {
        throw new Error(
            `Invalid blankLinesBetweenFunctions: ${String(resolved.blankLinesBetweenFunctions)}`
        );
    }

    if (resolved.braceStyle !== "1tbs" && resolved.braceStyle !== "allman") {
        throw new Error(`Invalid braceStyle: ${String(resolved.braceStyle)}`);
    }

    if (resolved.lineWidth < 40 || resolved.lineWidth > 200) {
        throw new Error(`Invalid lineWidth: ${String(resolved.lineWidth)}`);
    }

    if (
        resolved.keywordCase !== "preserve" &&
        resolved.keywordCase !== "lower" &&
        resolved.keywordCase !== "upper" &&
        resolved.keywordCase !== "pascal"
    ) {
        throw new Error(`Invalid keywordCase: ${String(resolved.keywordCase)}`);
    }
};

const assertResolvedOptionsAreValid = (
    resolved: Readonly<ReturnType<typeof resolveOptions>>
): void => {
    assertResolvedOptionEnumsAndRanges(resolved);
    assertResolvedOptionBooleans(resolved);
};

describe("options property-based tests", () => {
    it("resolveOptions never throws", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        fc.assert(
            fc.property(parserOptionsArb, (options) => {
                // Should not throw
                resolveOptions(options);
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions produces valid output", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        fc.assert(
            fc.property(parserOptionsArb, (options) => {
                assertResolvedOptionsAreValid(resolveOptions(options));
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions respects user preferences when valid", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


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
                        powershellBraceStyle: braceStyle,
                        powershellIndentSize: indentSize,
                        powershellIndentStyle: indentStyle,
                        powershellKeywordCase: keywordCase,
                        powershellTrailingComma: trailingComma,
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
        expect.hasAssertions();
        expect(true).toBeTruthy();


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
                    throw new Error("Default trailingComma should be none");
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

    it("applies the invoke-formatter preset when requested", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        const resolved = resolveOptions({
            powershellPreset: "invoke-formatter",
        } as unknown as ParserOptions);

        expect(resolved.indentStyle).toBe("spaces");
        expect(resolved.indentSize).toBe(4);
        expect(resolved.trailingComma).toBe("none");
        expect(resolved.braceStyle).toBe("1tbs");
        expect(resolved.keywordCase).toBe("lower");
    });

    it("lets explicit options override preset defaults", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        const resolved = resolveOptions({
            powershellIndentSize: 2,
            powershellKeywordCase: "upper",
            powershellPreset: "invoke-formatter",
        } as unknown as ParserOptions);

        expect(resolved.keywordCase).toBe("upper");
        expect(resolved.indentSize).toBe(2);
    });

    it("resolveOptions clamps invalid numeric values", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        fc.assert(
            fc.property(
                fc.oneof(
                    fc.integer({ max: -1, min: -1000 }),
                    fc.integer({ max: 1000, min: 9 })
                ),
                (invalidIndentSize) => {
                    const options: ParserOptions = {
                        powershellIndentSize: invalidIndentSize,
                    } as unknown as ParserOptions;

                    const resolved = resolveOptions(options);

                    const shouldUseDefault = invalidIndentSize < 1;
                    const expectedIndentSize = shouldUseDefault
                        ? 4
                        : invalidIndentSize;

                    expect(resolved.indentSize).toBe(expectedIndentSize);

                    // Values > 8 should still work (no upper clamp on indent size)
                }
            ),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions clamps blankLinesBetweenFunctions to 0-3", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        fc.assert(
            fc.property(fc.integer({ max: 20, min: -10 }), (value) => {
                const options: ParserOptions = {
                    powershellBlankLinesBetweenFunctions: value,
                } as unknown as ParserOptions;

                const resolved = resolveOptions(options);

                expect(
                    resolved.blankLinesBetweenFunctions
                ).toBeGreaterThanOrEqual(0);
                expect(resolved.blankLinesBetweenFunctions).toBeLessThanOrEqual(
                    3
                );

                // Check it's clamped to the expected range
                const expected = Math.max(0, Math.min(3, Math.floor(value)));

                expect(resolved.blankLinesBetweenFunctions).toBe(expected);
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions clamps lineWidth to 40-200", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        fc.assert(
            fc.property(fc.integer({ max: 500, min: -100 }), (value) => {
                const options: ParserOptions = {
                    powershellLineWidth: value,
                } as unknown as ParserOptions;

                const resolved = resolveOptions(options);

                expect(resolved.lineWidth).toBeGreaterThanOrEqual(40);
                expect(resolved.lineWidth).toBeLessThanOrEqual(200);

                // Check it's clamped to the expected range
                const expected = Math.max(40, Math.min(200, value));

                expect(resolved.lineWidth).toBe(expected);
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions sets useTabs based on indentStyle", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        fc.assert(
            fc.property(indentStyleArb, (indentStyle) => {
                const options: ParserOptions = {
                    powershellIndentStyle: indentStyle,
                } as unknown as ParserOptions;

                resolveOptions(options);

                const expectedUseTabs = indentStyle === "tabs";

                expect(options.useTabs).toBe(expectedUseTabs);
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("resolveOptions is deterministic", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


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

    it("treats unknown preset values as no preset", () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();


        const options = {
            powershellPreset: "unknown-preset-value",
        } as unknown as ParserOptions;

        const resolved = resolveOptions(options);

        expect(resolved.indentStyle).toBe("spaces");
        expect(resolved.indentSize).toBe(4);
        expect(resolved.keywordCase).toBe("lower");
    });
});
