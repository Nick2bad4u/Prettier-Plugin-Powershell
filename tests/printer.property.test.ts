import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { parsePowerShell } from "../src/parser.js";
import plugin from "../src/plugin.js";
import {
    formatAndAssert,
    formatAndAssertRoundTrip,
} from "./utils/format-and-assert.js";
import { assertPowerShellParses } from "./utils/powershell.js";
import { withProgress } from "./utils/progress.js";

const { env: testEnv } = process;

const PROPERTY_RUNS = Number.parseInt(
    testEnv.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

const lowerAlphabet = Array.from({ length: 26 }, (_, index) =>
    String.fromCodePoint(97 + index)
);
const digits = Array.from({ length: 10 }, (_, index) =>
    String.fromCodePoint(48 + index)
);
const identifierChars = [
    ...lowerAlphabet,
    ...digits,
    "_",
];
const printableChars = [
    ...lowerAlphabet,
    ...digits,
    " ",
];

// Import arbitraries from parser tests
const simpleIdentifierArb = fc
    .tuple(
        fc.constantFrom(...lowerAlphabet),
        fc.array(fc.constantFrom(...identifierChars), {
            maxLength: 8,
        })
    )
    .map(([first, rest]) => `${first}${rest.join("")}`);

const variableArb = simpleIdentifierArb.map((id) => `$${id}`);

const numberArb = fc.integer({ max: 9999, min: 0 }).map(String);

const stringArb = fc
    .array(fc.constantFrom(...printableChars), {
        maxLength: 20,
    })
    .map((chars) => `'${chars.join("")}'`);

const commentArb = fc
    .array(fc.constantFrom(...printableChars), {
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
    .map(([cmd, arg]) => (arg === undefined ? cmd : `${cmd} ${arg}`));

const simpleStatementArb = fc.oneof(
    assignmentArb,
    simpleCommandArb,
    commentArb
);

const simpleScriptArb = fc
    .array(simpleStatementArb, { maxLength: 10, minLength: 1 })
    .map((statements) => statements.join("\n"));

describe("printer property-based tests", () => {
    it("printer never throws on valid AST", async () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                filepath: "test.ps1",
                                parser: "powershell",
                                plugins: [plugin],
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
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                filepath: "test.ps1",
                                parser: "powershell",
                                plugins: [plugin],
                            },
                            "printer.property.formatted"
                        );
                        await assertPowerShellParses(
                            formatted,
                            "printer.property.formattedOutput"
                        );

                        const ast = parsePowerShell(formatted, {} as never);

                        if (ast?.type !== "Script") {
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
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                filepath: "test.ps1",
                                parser: "powershell",
                                plugins: [plugin],
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
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                filepath: "test.ps1",
                                parser: "powershell",
                                plugins: [plugin],
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
        expect.hasAssertions();
        expect(true).toBeTruthy();

        await withProgress(
            "printer.indentSize",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.integer({ max: 8, min: 1 }),
                        async (indentSize) => {
                            tracker.advance();
                            const script =
                                'if ($true) {\nWrite-Output "test"\n}';
                            const formatted = await formatAndAssert(
                                script,
                                {
                                    filepath: "test.ps1",
                                    parser: "powershell",
                                    plugins: [plugin],
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

                            if (indentedLine !== undefined) {
                                const leadingSpaces =
                                    /^ */v.exec(indentedLine)?.[0].length ?? 0;
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
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                    filepath: "test.ps1",
                                    parser: "powershell",
                                    plugins: [plugin],
                                    powershellBraceStyle: braceStyle,
                                },
                                "printer.property.formatted"
                            );
                            await assertPowerShellParses(
                                formatted,
                                "printer.property.braceStyle"
                            );

                            const lines = formatted.split(/\r?\n/v);
                            const functionLineIndex = lines.findIndex((line) =>
                                line.includes("function Test-Func")
                            );
                            const nextNonEmptyLine = lines
                                .slice(functionLineIndex + 1)
                                .find((line) => line.trim().length > 0);
                            const isExpected1tbs = formatted.includes(
                                "function Test-Func {"
                            );
                            const isExpectedAllman =
                                functionLineIndex !== -1 &&
                                nextNonEmptyLine?.trim() === "{";
                            const styleExpectationMet =
                                (braceStyle === "1tbs" && isExpected1tbs) ||
                                (braceStyle === "allman" && isExpectedAllman);

                            expect(
                                styleExpectationMet,
                                `Unexpected brace style output for ${braceStyle}.\nFormatted:\n${formatted}`
                            ).toBeTruthy();
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("respects keywordCase option", async () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                    filepath: "test.ps1",
                                    parser: "powershell",
                                    plugins: [plugin],
                                    powershellKeywordCase: keywordCase,
                                },
                                "printer.property.formatted"
                            );
                            await assertPowerShellParses(
                                formatted,
                                "printer.property.keywordCase"
                            );
                            const regexByCase: Readonly<
                                Record<
                                    "lower" | "pascal" | "preserve" | "upper",
                                    RegExp | undefined
                                >
                            > = {
                                lower: /\bif\b/v,
                                pascal: /\bIf\b/v,
                                preserve: undefined,
                                upper: /\bIF\b/v,
                            };
                            const expectedRegex = regexByCase[keywordCase];
                            const caseExpectationMet =
                                expectedRegex === undefined ||
                                expectedRegex.test(formatted);

                            expect(
                                caseExpectationMet,
                                `Expected ${keywordCase} keyword formatting.\nFormatted:\n${formatted}`
                            ).toBeTruthy();
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("does not change static method identifier case when keywordCase is set", async () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                    filepath: "test.ps1",
                                    parser: "powershell",
                                    plugins: [plugin],
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
        expect.hasAssertions();
        expect(true).toBeTruthy();

        await withProgress("printer.empty", PROPERTY_RUNS, async (tracker) => {
            await fc.assert(
                fc.asyncProperty(fc.constant(""), async (script) => {
                    tracker.advance();
                    const formatted = await formatAndAssert(
                        script,
                        {
                            filepath: "test.ps1",
                            parser: "powershell",
                            plugins: [plugin],
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
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                filepath: "test.ps1",
                                parser: "powershell",
                                plugins: [plugin],
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
        expect.hasAssertions();
        expect(true).toBeTruthy();

        await withProgress(
            "printer.commentOnly",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        fc
                            .array(commentArb, { maxLength: 5, minLength: 1 })
                            .map((comments) => comments.join("\n")),
                        async (script) => {
                            tracker.advance();
                            const formatted = await formatAndAssert(
                                script,
                                {
                                    filepath: "test.ps1",
                                    parser: "powershell",
                                    plugins: [plugin],
                                },
                                "printer.property.formatted"
                            );
                            await assertPowerShellParses(
                                formatted,
                                "printer.property.commentOnly"
                            );

                            const originalCommentCount =
                                script.split("#").length - 1;
                            const formattedCommentCount =
                                formatted.split("#").length - 1;

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
        expect.hasAssertions();
        expect(true).toBeTruthy();

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
                                filepath: "test.ps1",
                                parser: "powershell",
                                plugins: [plugin],
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
