import * as fc from "fast-check";
import { describe, it } from "vitest";

import plugin from "../src/index.js";
import { parsePowerShell } from "../src/parser.js";

import {
    formatAndAssert,
    formatAndAssertRoundTrip,
} from "./utils/format-and-assert.js";
import { assertPowerShellParses } from "./utils/powershell.js";
import { withProgress } from "./utils/progress.js";

const PROPERTY_RUNS = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

// Import arbitraries from parser tests
const simpleIdentifierArb = fc
    .tuple(
        fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz"),
        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789_"), {
            maxLength: 8,
        })
    )
    .map(([first, rest]) => `${first}${rest.join("")}`);

const variableArb = simpleIdentifierArb.map((id) => `$${id}`);

const numberArb = fc.integer({ min: 0, max: 9999 }).map(String);

const stringArb = fc
    .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789 "), {
        maxLength: 20,
    })
    .map((chars) => `'${chars.join("")}'`);

const commentArb = fc
    .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789 "), {
        maxLength: 20,
    })
    .map((chars) => `# ${chars.join("")}`);

const assignmentArb = fc
    .tuple(variableArb, fc.oneof(numberArb, stringArb, variableArb))
    .map(([variable, value]) => `${variable} = ${value}`);

const simpleCommandArb = fc
    .tuple(
        fc.constantFrom("Write-Output", "Write-Host", "Get-Item"),
        fc.option(fc.oneof(numberArb, stringArb, variableArb), {
            nil: undefined,
        })
    )
    .map(([cmd, arg]) => (arg ? `${cmd} ${arg}` : cmd));

const simpleStatementArb = fc.oneof(
    assignmentArb,
    simpleCommandArb,
    commentArb
);

const simpleScriptArb = fc
    .array(simpleStatementArb, { minLength: 1, maxLength: 10 })
    .map((statements) => statements.join("\n"));

describe("Printer property-based tests", () => {
    it("printer never throws on valid AST", async () => {
        await withProgress(
            "printer.noThrow",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(simpleScriptArb, async (script) => {
                        tracker.advance();
                        await formatAndAssert(
                            script,
                            {
                                parser: "powershell",
                                plugins: [plugin],
                                filepath: "test.ps1",
                            },
                            { id: "printer.noThrow", skipParse: true }
                        );
                    }),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("formatted output is valid PowerShell", async () => {
        await withProgress(
            "printer.validPowerShell",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(simpleScriptArb, async (script) => {
                        tracker.advance();
                        const formatted = await formatAndAssert(
                            script,
                            {
                                parser: "powershell",
                                plugins: [plugin],
                                filepath: "test.ps1",
                            },
                            "printer.property.formatted"
                        );
                        await assertPowerShellParses(
                            formatted,
                            "printer.property.formattedOutput"
                        );

                        const ast = parsePowerShell(formatted, {} as never);

                        if (!ast || ast.type !== "Script") {
                            throw new Error(
                                "Formatted output did not produce valid AST"
                            );
                        }
                    }),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("formatting is idempotent", async () => {
        await withProgress(
            "printer.idempotent",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(simpleScriptArb, async (script) => {
                        tracker.advance();
                        await formatAndAssertRoundTrip(
                            script,
                            {
                                parser: "powershell",
                                plugins: [plugin],
                                filepath: "test.ps1",
                            },
                            "printer.property.idempotent"
                        );
                    }),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("preserves semantic meaning (same number of statements)", async () => {
        await withProgress(
            "printer.semantic",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(simpleScriptArb, async (script) => {
                        tracker.advance();
                        const originalAst = parsePowerShell(
                            script,
                            {} as never
                        );
                        const formatted = await formatAndAssert(
                            script,
                            {
                                parser: "powershell",
                                plugins: [plugin],
                                filepath: "test.ps1",
                            },
                            "printer.property.formatted"
                        );
                        await assertPowerShellParses(
                            formatted,
                            "printer.property.semantic"
                        );
                        const formattedAst = parsePowerShell(
                            formatted,
                            {} as never
                        );

                        const originalStatements = originalAst.body.filter(
                            (node) => node.type !== "BlankLine"
                        );
                        const formattedStatements = formattedAst.body.filter(
                            (node) => node.type !== "BlankLine"
                        );

                        if (
                            originalStatements.length !==
                            formattedStatements.length
                        ) {
                            throw new Error(
                                `Statement count changed: ${originalStatements.length} -> ${formattedStatements.length}`
                            );
                        }
                    }),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("respects indentSize option", async () => {
        await withProgress(
            "printer.indentSize",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.integer({ min: 1, max: 8 }),
                        async (indentSize) => {
                            tracker.advance();
                            const script =
                                'if ($true) {\nWrite-Output "test"\n}';
                            const formatted = await formatAndAssert(
                                script,
                                {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                    powershellIndentSize: indentSize,
                                    tabWidth: indentSize,
                                },
                                "printer.property.formatted"
                            );
                            await assertPowerShellParses(
                                formatted,
                                "printer.property.indentSize"
                            );

                            const lines = formatted.split("\n");
                            const indentedLine = lines.find(
                                (line) =>
                                    line.startsWith(" ") &&
                                    line.trim().length > 0
                            );

                            if (indentedLine) {
                                const leadingSpaces =
                                    indentedLine.match(/^ */)?.[0].length ?? 0;
                                if (leadingSpaces !== indentSize) {
                                    throw new Error(
                                        `Expected ${indentSize} spaces, got ${leadingSpaces}\nFormatted:\n${formatted}`
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

    it("respects braceStyle option", async () => {
        await withProgress(
            "printer.braceStyle",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.constantFrom("1tbs", "allman"),
                        async (braceStyle) => {
                            tracker.advance();
                            const script =
                                'function Test-Func { Write-Output "test" }';
                            const formatted = await formatAndAssert(
                                script,
                                {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                    powershellBraceStyle: braceStyle,
                                },
                                "printer.property.formatted"
                            );
                            await assertPowerShellParses(
                                formatted,
                                "printer.property.braceStyle"
                            );

                            if (braceStyle === "1tbs") {
                                if (!/function\s+\S+\s+\{/.test(formatted)) {
                                    throw new Error(
                                        `Expected 1tbs style (brace on same line)\nFormatted:\n${formatted}`
                                    );
                                }
                            } else if (
                                !/function\s+\S+\s*\n\s*\{/.test(formatted)
                            ) {
                                throw new Error(
                                    `Expected allman style (brace on next line)\nFormatted:\n${formatted}`
                                );
                            }
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("respects keywordCase option", async () => {
        await withProgress(
            "printer.keywordCase",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.constantFrom("preserve", "lower", "upper", "pascal"),
                        async (keywordCase) => {
                            tracker.advance();
                            const script = 'IF ($true) { WRITE-OUTPUT "test" }';
                            const formatted = await formatAndAssert(
                                script,
                                {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                    powershellKeywordCase: keywordCase,
                                },
                                "printer.property.formatted"
                            );
                            await assertPowerShellParses(
                                formatted,
                                "printer.property.keywordCase"
                            );

                            if (keywordCase === "lower") {
                                if (!/\bif\b/.test(formatted)) {
                                    throw new Error(
                                        `Expected lowercase 'if'\nFormatted:\n${formatted}`
                                    );
                                }
                            } else if (keywordCase === "upper") {
                                if (!/\bIF\b/.test(formatted)) {
                                    throw new Error(
                                        `Expected uppercase 'IF'\nFormatted:\n${formatted}`
                                    );
                                }
                            } else if (
                                keywordCase === "pascal" &&
                                !/\bIf\b/.test(formatted)
                            ) {
                                throw new Error(
                                    `Expected PascalCase 'If'\nFormatted:\n${formatted}`
                                );
                            }
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("does not change static method identifier case when keywordCase is set", async () => {
        await withProgress(
            "printer.keywordCase.staticMethod",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.constantFrom("preserve", "lower", "upper", "pascal"),
                        fc.constantFrom("Exit", "Return", "While", "For", "If"),
                        async (keywordCase, methodName) => {
                            tracker.advance();
                            const script = `[Foo.Bar]::${methodName}(42)`;
                            const formatted = await formatAndAssert(
                                script,
                                {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                    powershellKeywordCase: keywordCase,
                                },
                                "printer.property.staticMethodKeywordCase"
                            );
                            await assertPowerShellParses(
                                formatted,
                                "printer.property.staticMethodKeywordCase"
                            );

                            if (!formatted.includes(`::${methodName}(`)) {
                                throw new Error(
                                    `Static method name casing changed for '${methodName}' with keywordCase='${keywordCase}'.\nFormatted:\n${formatted}`
                                );
                            }
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("handles empty scripts", async () => {
        await withProgress("printer.empty", PROPERTY_RUNS, async (tracker) => {
            await fc.assert(
                fc.asyncProperty(fc.constant(""), async (script) => {
                    tracker.advance();
                    const formatted = await formatAndAssert(
                        script,
                        {
                            parser: "powershell",
                            plugins: [plugin],
                            filepath: "test.ps1",
                        },
                        "printer.property.formatted"
                    );
                    await assertPowerShellParses(
                        formatted,
                        "printer.property.emptyScript"
                    );

                    if (formatted.trim().length > 0) {
                        throw new Error(
                            `Empty script formatted to non-empty: ${JSON.stringify(formatted)}`
                        );
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    it("preserves comments", async () => {
        await withProgress(
            "printer.comment",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(commentArb, async (comment) => {
                        tracker.advance();
                        const formatted = await formatAndAssert(
                            comment,
                            {
                                parser: "powershell",
                                plugins: [plugin],
                                filepath: "test.ps1",
                            },
                            "printer.property.formatted"
                        );
                        await assertPowerShellParses(
                            formatted,
                            "printer.property.comment"
                        );

                        if (!formatted.includes("#")) {
                            throw new Error(
                                `Comment lost during formatting: ${comment} -> ${formatted}`
                            );
                        }
                    }),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("handles scripts with only comments", async () => {
        await withProgress(
            "printer.commentOnly",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        fc
                            .array(commentArb, { minLength: 1, maxLength: 5 })
                            .map((comments) => comments.join("\n")),
                        async (script) => {
                            tracker.advance();
                            const formatted = await formatAndAssert(
                                script,
                                {
                                    parser: "powershell",
                                    plugins: [plugin],
                                    filepath: "test.ps1",
                                },
                                "printer.property.formatted"
                            );
                            await assertPowerShellParses(
                                formatted,
                                "printer.property.commentOnly"
                            );

                            const originalCommentCount = (
                                script.match(/#/g) || []
                            ).length;
                            const formattedCommentCount = (
                                formatted.match(/#/g) || []
                            ).length;

                            if (
                                originalCommentCount !== formattedCommentCount
                            ) {
                                throw new Error(
                                    `Comment count changed: ${originalCommentCount} -> ${formattedCommentCount}`
                                );
                            }
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("output has consistent line endings", async () => {
        await withProgress(
            "printer.lineEndings",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(simpleScriptArb, async (script) => {
                        tracker.advance();
                        const formatted = await formatAndAssert(
                            script,
                            {
                                parser: "powershell",
                                plugins: [plugin],
                                filepath: "test.ps1",
                            },
                            "printer.property.formatted"
                        );
                        await assertPowerShellParses(
                            formatted,
                            "printer.property.lineEndings"
                        );

                        const hasLF = formatted.includes("\n");
                        const hasCRLF = formatted.includes("\r\n");

                        if (hasLF && hasCRLF) {
                            const lfOnly = formatted
                                .split("\r\n")
                                .join("")
                                .includes("\n");
                            if (lfOnly) {
                                throw new Error(
                                    "Output has mixed line endings"
                                );
                            }
                        }
                    }),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });
});
