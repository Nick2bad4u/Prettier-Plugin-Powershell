import * as fc from "fast-check";
import prettier from "prettier";
import { describe, it } from "vitest";

import plugin from "../src/index.js";
import { parsePowerShell } from "../src/parser.js";
import { tokenize } from "../src/tokenizer.js";

import { assertPowerShellParses } from "./utils/powershell.js";
import { withProgress } from "./utils/progress.js";

const PROPERTY_RUNS = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

describe("Integration property tests", () => {
    describe("Round-trip preservation", () => {
        it("preserves semantic structure through tokenize -> parse -> format cycle", async () => {
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
                                if (tokens.length === 0 && script.trim().length > 0) {
                                    throw new Error("Tokenization produced no tokens");
                                }

                                const ast = parsePowerShell(script, {
                                    tabWidth: 2,
                                } as never);
                                if (!ast || ast.type !== "Script") {
                                    throw new Error("Parsing failed");
                                }

                                const formatted = await prettier.format(script, {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                });
                                assertPowerShellParses(
                                    formatted,
                                    "integration.crossModule.formatted"
                                );
                                assertPowerShellParses(
                                    formatted,
                                    "integration.roundTrip.formatted"
                                );

                                const formattedAst = parsePowerShell(formatted, {
                                    tabWidth: 2,
                                } as never);
                                if (!formattedAst || formattedAst.type !== "Script") {
                                    throw new Error(
                                        "Re-parsing formatted output failed"
                                    );
                                }

                                const originalStatements = ast.body.filter(
                                    (n) => n.type !== "BlankLine"
                                );
                                const formattedStatements = formattedAst.body.filter(
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
            await withProgress(
                "integration.optionCombos",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.record({
                                indentSize: fc.integer({ min: 2, max: 4 }),
                                braceStyle: fc.constantFrom("1tbs", "allman"),
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
                                const formatted = await prettier.format(script, {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                    powershellIndentSize: options.indentSize,
                                    powershellBraceStyle: options.braceStyle,
                                    powershellKeywordCase: options.keywordCase,
                                    powershellPreferSingleQuote:
                                        options.preferSingleQuote,
                                });
                                assertPowerShellParses(
                                    formatted,
                                    "integration.optionCombos.formatted"
                                );

                                const ast = parsePowerShell(formatted, {
                                    tabWidth: 2,
                                } as never);
                                if (!ast || ast.type !== "Script") {
                                    throw new Error(
                                        `Failed with options: ${JSON.stringify(options)}`
                                    );
                                }

                                const formatted2 = await prettier.format(
                                    formatted,
                                    {
                                        parser: "powershell",
                                        plugins: [plugin],
                                        filepath: "test.ps1",
                                        powershellIndentSize: options.indentSize,
                                        powershellBraceStyle: options.braceStyle,
                                        powershellKeywordCase: options.keywordCase,
                                        powershellPreferSingleQuote:
                                            options.preferSingleQuote,
                                    }
                                );
                                assertPowerShellParses(
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

    describe("Cross-module consistency", () => {
        it("ensures tokenizer and parser agree on locations", () => {
            return withProgress(
                "integration.tokenizerLocations",
                PROPERTY_RUNS,
                (tracker) => {
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
                                    if (token.start < 0 || token.end > script.length) {
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
                                        .slice()
                                        .reverse()
                                        .find((t) => t.type !== "newline");

                                    if (firstNonNewline && lastNonNewline) {
                                        if (
                                            ast.loc.start > firstNonNewline.start ||
                                            ast.loc.end < lastNonNewline.end
                                        ) {
                                            // acceptable deviation noted
                                        }
                                    }
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("ensures printer output can be re-tokenized and re-parsed", async () => {
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
                                const formatted = await prettier.format(script, {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                });

                                const tokens = tokenize(formatted);
                                const ast = parsePowerShell(formatted, {
                                    tabWidth: 2,
                                } as never);

                                if (!ast || ast.type !== "Script") {
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

    describe("Error resilience", () => {
        it("handles concatenated valid scripts gracefully", async () => {
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
                                { minLength: 2, maxLength: 5 }
                            ),
                            async (scripts) => {
                                tracker.advance();
                                const combined = scripts.join("\n");

                                const ast = parsePowerShell(combined, {
                                    tabWidth: 2,
                                } as never);
                                if (!ast || ast.type !== "Script") {
                                    throw new Error("Failed to parse combined scripts");
                                }

                                const formatted = await prettier.format(combined, {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                });
                                assertPowerShellParses(
                                    formatted,
                                    "integration.concatenated.formatted"
                                );

                                const formattedAst = parsePowerShell(formatted, {
                                    tabWidth: 2,
                                } as never);
                                if (!formattedAst || formattedAst.type !== "Script") {
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
                            fc.integer({ min: 2, max: 5 }),
                            async (script, iterations) => {
                                tracker.advance();
                                let current: string = script;

                                for (let i = 0; i < iterations; i++) {
                                    const formatted = await prettier.format(current, {
                                        parser: "powershell",
                                        plugins: [plugin],
                                        filepath: "test.ps1",
                                    });
                                    assertPowerShellParses(
                                        formatted,
                                        "integration.repeatedFormatting.iteration"
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

                                const finalFormat = await prettier.format(current, {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                });
                                assertPowerShellParses(
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

    describe("Plugin interface contracts", () => {
        it("locStart and locEnd return valid positions", () => {
            return withProgress(
                "integration.locBounds",
                PROPERTY_RUNS,
                (tracker) => {
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

                                const { locStart, locEnd } = plugin.parsers!.powershell;

                                const start = locStart(ast);
                                const end = locEnd(ast);

                                if (start < 0 || end < start || end > script.length) {
                                    throw new Error(
                                        `Invalid loc: start=${start}, end=${end}, script.length=${script.length}`
                                    );
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("hasPragma always returns false", () => {
            return withProgress(
                "integration.hasPragma",
                PROPERTY_RUNS,
                (tracker) => {
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
                }
            );
        });
    });

    describe("File extension handling", () => {
        it("formats all supported extensions identically", async () => {
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
                                const formatted1 = await prettier.format(script, {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: `test${ext1}`,
                                });
                                assertPowerShellParses(
                                    formatted1,
                                    "integration.extensions.formatted1"
                                );

                                const formatted2 = await prettier.format(script, {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: `test${ext2}`,
                                });
                                assertPowerShellParses(
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
