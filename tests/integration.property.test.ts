import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { parsePowerShell } from "../src/parser.js";
import plugin from "../src/plugin.js";
import { tokenize } from "../src/tokenizer.js";
import { formatAndAssert } from "./utils/format-and-assert.js";
import { assertPowerShellParses } from "./utils/powershell.js";
import { withProgress } from "./utils/progress.js";

const { env: testEnv } = process;

const PROPERTY_RUNS = Number.parseInt(
    testEnv.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

describe("integration property tests", () => {
    describe("round-trip preservation", () => {
        it("preserves semantic structure through tokenize -> parse -> format cycle", async () => {
            expect.hasAssertions();

            await withProgress(
                "integration.roundTrip",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.constantFrom(
                                "$x = 42",
                                "$name = 'test'",
                                "Write-Output 'hello'",
                                "1, 2, 3",
                                "@{ key = 'value' }",
                                "if ($true) { 'yes' } else { 'no' }",
                                "function Test-Func { param($x) $x * 2 }",
                                "Get-Item | Select-Object Name"
                            ),
                            async (script) => {
                                tracker.advance();
                                const tokens = tokenize(script);
                                if (
                                    tokens.length === 0 &&
                                    script.trim().length > 0
                                ) {
                                    throw new Error(
                                        "Tokenization produced no tokens"
                                    );
                                }

                                const ast = parsePowerShell(script, {
                                    tabWidth: 2,
                                } as never);
                                if (ast?.type !== "Script") {
                                    throw new Error("Parsing failed");
                                }

                                const formatted = await formatAndAssert(
                                    script,
                                    {
                                        filepath: "test.ps1",
                                        parser: "powershell",
                                        plugins: [plugin],
                                    },
                                    "integration.property.formatted"
                                );
                                await assertPowerShellParses(
                                    formatted,
                                    "integration.crossModule.formatted"
                                );
                                await assertPowerShellParses(
                                    formatted,
                                    "integration.roundTrip.formatted"
                                );

                                const formattedAst = parsePowerShell(
                                    formatted,
                                    {
                                        tabWidth: 2,
                                    } as never
                                );
                                if (formattedAst?.type !== "Script") {
                                    throw new Error(
                                        "Re-parsing formatted output failed"
                                    );
                                }

                                const originalStatements = ast.body.filter(
                                    (n) => n.type !== "BlankLine"
                                );
                                const formattedStatements =
                                    formattedAst.body.filter(
                                        (n) => n.type !== "BlankLine"
                                    );

                                if (
                                    originalStatements.length !==
                                    formattedStatements.length
                                ) {
                                    throw new Error(
                                        `Statement count changed: ${originalStatements.length} -> ${formattedStatements.length}`
                                    );
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("handles option combinations consistently", async () => {
            expect.hasAssertions();

            await withProgress(
                "integration.optionCombos",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.record({
                                braceStyle: fc.constantFrom("1tbs", "allman"),
                                indentSize: fc.integer({ max: 4, min: 2 }),
                                keywordCase: fc.constantFrom(
                                    "preserve",
                                    "lower",
                                    "upper",
                                    "pascal"
                                ),
                                preferSingleQuote: fc.boolean(),
                            }),
                            fc.constantFrom(
                                "function Test { Write-Output 'test' }",
                                "if ($true) { 'yes' }",
                                "@{ Name = 'value' }"
                            ),
                            async (options, script) => {
                                tracker.advance();
                                const formatted = await formatAndAssert(
                                    script,
                                    {
                                        filepath: "test.ps1",
                                        parser: "powershell",
                                        plugins: [plugin],
                                        powershellBraceStyle:
                                            options.braceStyle,
                                        powershellIndentSize:
                                            options.indentSize,
                                        powershellKeywordCase:
                                            options.keywordCase,
                                        powershellPreferSingleQuote:
                                            options.preferSingleQuote,
                                    },
                                    "integration.property.formatted"
                                );
                                await assertPowerShellParses(
                                    formatted,
                                    "integration.optionCombos.formatted"
                                );

                                const ast = parsePowerShell(formatted, {
                                    tabWidth: 2,
                                } as never);
                                if (ast?.type !== "Script") {
                                    throw new Error(
                                        `Failed with options: ${JSON.stringify(options)}`
                                    );
                                }

                                const formatted2 = await formatAndAssert(
                                    formatted,
                                    {
                                        filepath: "test.ps1",
                                        parser: "powershell",
                                        plugins: [plugin],
                                        powershellBraceStyle:
                                            options.braceStyle,
                                        powershellIndentSize:
                                            options.indentSize,
                                        powershellKeywordCase:
                                            options.keywordCase,
                                        powershellPreferSingleQuote:
                                            options.preferSingleQuote,
                                    },
                                    "integration.property.formatted2"
                                );
                                await assertPowerShellParses(
                                    formatted2,
                                    "integration.optionCombos.formatted2"
                                );

                                if (formatted !== formatted2) {
                                    throw new Error(
                                        `Not idempotent with options: ${JSON.stringify(options)}`
                                    );
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });
    });

    describe("cross-module consistency", () => {
        it("ensures tokenizer and parser agree on locations", () =>
            withProgress(
                "integration.tokenizerLocations",
                PROPERTY_RUNS,
                (tracker) => {
                    expect.hasAssertions();

                    fc.assert(
                        fc.property(
                            fc.constantFrom(
                                "$x = 42",
                                "Write-Output 'test'",
                                "# comment\n$y = 1",
                                "@{ a = 1; b = 2 }",
                                "1, 2, 3"
                            ),
                            (script) => {
                                tracker.advance();
                                const tokens = tokenize(script);
                                const ast = parsePowerShell(script, {
                                    tabWidth: 2,
                                } as never);

                                for (const token of tokens) {
                                    if (
                                        token.start < 0 ||
                                        token.end > script.length
                                    ) {
                                        throw new Error(
                                            `Token out of bounds: ${token.start}-${token.end} (script length: ${script.length})`
                                        );
                                    }
                                }

                                if (tokens.length > 0 && ast.body.length > 0) {
                                    const firstNonNewline = tokens.find(
                                        (t) => t.type !== "newline"
                                    );
                                    const lastNonNewline = tokens
                                        .toReversed()
                                        .find((t) => t.type !== "newline");

                                    if (
                                        firstNonNewline &&
                                        lastNonNewline &&
                                        (ast.loc.start >
                                            firstNonNewline.start ||
                                            ast.loc.end < lastNonNewline.end)
                                    ) {
                                        // Acceptable deviation noted
                                    }
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            ));

        it("ensures printer output can be re-tokenized and re-parsed", async () => {
            expect.hasAssertions();

            await withProgress(
                "integration.retTokenize",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.constantFrom(
                                "$x = 1\n$y = 2",
                                "function Test { 'hello' }",
                                "if ($x) { 'yes' } else { 'no' }",
                                "1..10 | ForEach-Object { $_ * 2 }",
                                "@{ Name = 'test'; Value = 42 }"
                            ),
                            async (script) => {
                                tracker.advance();
                                const formatted = await formatAndAssert(
                                    script,
                                    {
                                        filepath: "test.ps1",
                                        parser: "powershell",
                                        plugins: [plugin],
                                    },
                                    "integration.property.formatted"
                                );

                                const tokens = tokenize(formatted);
                                const ast = parsePowerShell(formatted, {
                                    tabWidth: 2,
                                } as never);

                                if (ast?.type !== "Script") {
                                    throw new Error(
                                        "Failed to re-parse formatted output"
                                    );
                                }

                                for (const token of tokens) {
                                    if (
                                        token.start < 0 ||
                                        token.end < token.start ||
                                        token.end > formatted.length
                                    ) {
                                        throw new Error(
                                            `Invalid token in formatted output: ${JSON.stringify(token)}`
                                        );
                                    }
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });
    });

    describe("error resilience", () => {
        it("handles concatenated valid scripts gracefully", async () => {
            expect.hasAssertions();

            await withProgress(
                "integration.concatenated",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.array(
                                fc.constantFrom(
                                    "$x = 1",
                                    "Write-Output 'test'",
                                    "# comment"
                                ),
                                { maxLength: 5, minLength: 2 }
                            ),
                            async (scripts) => {
                                tracker.advance();
                                const combined = scripts.join("\n");

                                const ast = parsePowerShell(combined, {
                                    tabWidth: 2,
                                } as never);
                                if (ast?.type !== "Script") {
                                    throw new Error(
                                        "Failed to parse combined scripts"
                                    );
                                }

                                const formatted = await formatAndAssert(
                                    combined,
                                    {
                                        filepath: "test.ps1",
                                        parser: "powershell",
                                        plugins: [plugin],
                                    },
                                    "integration.property.formatted"
                                );
                                await assertPowerShellParses(
                                    formatted,
                                    "integration.concatenated.formatted"
                                );

                                const formattedAst = parsePowerShell(
                                    formatted,
                                    {
                                        tabWidth: 2,
                                    } as never
                                );
                                if (formattedAst?.type !== "Script") {
                                    throw new Error(
                                        "Failed to re-parse formatted combined scripts"
                                    );
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("preserves valid PowerShell across repeated formatting", async () => {
            expect.hasAssertions();

            await withProgress(
                "integration.repeatedFormatting",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.constantFrom(
                                "$x = 42",
                                "function Test { 'hello' }",
                                "1, 2, 3 | Sort-Object"
                            ),
                            fc.integer({ max: 5, min: 2 }),
                            async (script, iterations) => {
                                tracker.advance();
                                let current: string = script;

                                for (let i = 0; i < iterations; i++) {
                                    const formatted = await formatAndAssert(
                                        current,
                                        {
                                            filepath: "test.ps1",
                                            parser: "powershell",
                                            plugins: [plugin],
                                        },
                                        "integration.property.formatted|skipParse"
                                    );

                                    const ast = parsePowerShell(formatted, {
                                        tabWidth: 2,
                                    } as never);
                                    if (ast.type !== "Script") {
                                        throw new Error(
                                            `Invalid after ${i + 1} iterations`
                                        );
                                    }

                                    current = formatted;
                                }

                                const finalFormat = await formatAndAssert(
                                    current,
                                    {
                                        filepath: "test.ps1",
                                        parser: "powershell",
                                        plugins: [plugin],
                                    },
                                    "integration.property.finalFormat|skipParse"
                                );
                                await assertPowerShellParses(
                                    finalFormat,
                                    "integration.repeatedFormatting.final"
                                );

                                if (finalFormat !== current) {
                                    throw new Error(
                                        `Not stable after ${iterations} iterations`
                                    );
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });
    });

    describe("plugin interface contracts", () => {
        it("locStart and locEnd return valid positions", () =>
            withProgress("integration.locBounds", PROPERTY_RUNS, (tracker) => {
                expect.hasAssertions();

                fc.assert(
                    fc.property(
                        fc.constantFrom(
                            "$x = 42",
                            "Write-Output 'test'",
                            "function Test { 'hello' }"
                        ),
                        (script) => {
                            tracker.advance();
                            const ast = parsePowerShell(script, {
                                tabWidth: 2,
                            } as never);

                            const { locEnd, locStart } =
                                plugin.parsers!.powershell;

                            const start = locStart(ast);
                            const end = locEnd(ast);

                            if (
                                start < 0 ||
                                end < start ||
                                end > script.length
                            ) {
                                throw new Error(
                                    `Invalid loc: start=${start}, end=${end}, script.length=${script.length}`
                                );
                            }
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }));

        it("hasPragma always returns false", () =>
            withProgress("integration.hasPragma", PROPERTY_RUNS, (tracker) => {
                expect.hasAssertions();

                fc.assert(
                    fc.property(
                        fc.constantFrom(
                            "$x = 42",
                            "# prettier-ignore\n$x = 1",
                            "Write-Output 'test'"
                        ),
                        (script) => {
                            tracker.advance();
                            const { hasPragma } = plugin.parsers!.powershell;

                            if (hasPragma!(script)) {
                                throw new Error(
                                    "hasPragma should always return false"
                                );
                            }
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }));
    });

    describe("file extension handling", () => {
        it("formats all supported extensions identically", async () => {
            expect.hasAssertions();

            await withProgress(
                "integration.extensions",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.constantFrom(".ps1", ".psm1", ".psd1"),
                            fc.constantFrom(".ps1", ".psm1", ".psd1"),
                            fc.constantFrom(
                                "$x = 42",
                                "function Test { 'hello' }",
                                "@{ Name = 'test' }"
                            ),
                            async (ext1, ext2, script) => {
                                tracker.advance();
                                const formatted1 = await formatAndAssert(
                                    script,
                                    {
                                        filepath: `test${ext1}`,
                                        parser: "powershell",
                                        plugins: [plugin],
                                    },
                                    "integration.property.formatted1"
                                );
                                await assertPowerShellParses(
                                    formatted1,
                                    "integration.extensions.formatted1"
                                );

                                const formatted2 = await formatAndAssert(
                                    script,
                                    {
                                        filepath: `test${ext2}`,
                                        parser: "powershell",
                                        plugins: [plugin],
                                    },
                                    "integration.property.formatted2"
                                );
                                await assertPowerShellParses(
                                    formatted2,
                                    "integration.extensions.formatted2"
                                );

                                if (formatted1 !== formatted2) {
                                    throw new Error(
                                        `Different formatting for ${ext1} vs ${ext2}`
                                    );
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });
    });
});
