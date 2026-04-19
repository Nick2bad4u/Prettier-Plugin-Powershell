import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";
import { formatAndAssert } from "./utils/format-and-assert.js";
import { withProgress } from "./utils/progress.js";

const { env: testEnv } = process;

const PROPERTY_RUNS = Number.parseInt(
    testEnv.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

const lowerAlphabet = Array.from({ length: 26 }, (_, index) =>
    String.fromCodePoint(97 + index)
);
const upperAlphabet = Array.from({ length: 26 }, (_, index) =>
    String.fromCodePoint(65 + index)
);
const digits = Array.from({ length: 10 }, (_, index) =>
    String.fromCodePoint(48 + index)
);
const alphanumeric = [
    ...lowerAlphabet,
    ...upperAlphabet,
    ...digits,
];

const runFormat = async (
    script: string,
    overrides: Record<string, unknown> = {}
): Promise<string> =>
    formatAndAssert(
        script,
        {
            filepath: "options-test.ps1",
            parser: "powershell",
            plugins: [plugin],
            ...overrides,
        },
        "printerOptions.runFormat"
    );

describe("printer option-specific property tests", () => {
    describe("blank line controls", () => {
        const functionNameArb = fc
            .tuple(
                fc.constantFrom(...lowerAlphabet),
                fc.array(fc.constantFrom(...lowerAlphabet, ...digits), {
                    maxLength: 6,
                })
            )
            .map(([first, rest]) => `${first}${rest.join("")}`);

        const twoFunctionScriptArb = fc
            .tuple(functionNameArb, functionNameArb)
            .map(
                ([first, second]) => `function ${first} {
    Write-Output "${first}"
}
function ${second} {
    Write-Output "${second}"
}`
            );

        it("respects blankLinesBetweenFunctions", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.blankLines",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            twoFunctionScriptArb,
                            fc.integer({ max: 3, min: 0 }),
                            async (script, spacing) => {
                                tracker.advance();
                                const formatted = await runFormat(script, {
                                    powershellBlankLinesBetweenFunctions:
                                        spacing,
                                });

                                const normalized = formatted.replaceAll(
                                    "\r\n",
                                    "\n"
                                );
                                const closingBraceIndex =
                                    normalized.indexOf("}\n");
                                const functionIndex = normalized.indexOf(
                                    "function ",
                                    closingBraceIndex + 2
                                );
                                if (
                                    closingBraceIndex === -1 ||
                                    functionIndex === -1
                                ) {
                                    throw new Error(
                                        `Unable to locate function boundary in formatted output.\n${formatted}`
                                    );
                                }
                                const gapSegment = normalized.slice(
                                    closingBraceIndex + 2,
                                    functionIndex
                                );
                                const blankCount =
                                    gapSegment.length === 0
                                        ? 0
                                        : gapSegment.split("\n").length - 1;
                                const expected = spacing;
                                if (blankCount !== expected) {
                                    throw new Error(
                                        `Expected ${expected} blank lines between functions but found ${blankCount}.\nFormatted script:\n${formatted}`
                                    );
                                }
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("respects blankLineAfterParam", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.blankLineAfterParam",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(fc.boolean(), async (flag) => {
                            tracker.advance();
                            const script = `function Test {
    param($x)
    Write-Output $x
}`;
                            const formatted = await runFormat(script, {
                                powershellBlankLineAfterParam: flag,
                            });

                            const lines = formatted.split(/\r?\n/v);
                            const paramIndex = lines.findIndex((line) =>
                                /param\s*\(/iv.test(line)
                            );
                            if (paramIndex === -1) {
                                throw new Error(
                                    `Formatted script missing param():\n${formatted}`
                                );
                            }
                            const afterParam = lines[paramIndex + 1] ?? "";
                            const hasBlank = afterParam.trim().length === 0;
                            if (flag && !hasBlank) {
                                throw new Error(
                                    `Expected blank line after param block when option true.\n${formatted}`
                                );
                            }
                            if (!flag && hasBlank) {
                                throw new Error(
                                    `Unexpected blank line after param block when option false.\n${formatted}`
                                );
                            }
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });
    });

    describe("string literal normalization", () => {
        const safeCharArb = fc.constantFrom(
            ...alphanumeric,
            " ",
            "-",
            "_",
            ".",
            ",",
            ":",
            "/",
            "?"
        );

        const safeContentArb = fc
            .array(safeCharArb, { maxLength: 25, minLength: 1 })
            .map((chars) => chars.join(""));

        it("uses single quotes when preferSingleQuote is enabled", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.preferSingleQuote",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(safeContentArb, async (content) => {
                            tracker.advance();
                            const script = `$value = "${content}"`;
                            const formatted = await runFormat(script, {
                                powershellPreferSingleQuote: true,
                            });

                            expect(
                                /\$value\s*=\s*'[^']*'/v.test(formatted),
                                `Expected single-quoted literal when preferSingleQuote is true.\n${formatted}`
                            ).toBeTruthy();
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("retains double quotes for dynamic content", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.dynamicQuotes",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.integer({ max: 2, min: 1 }),
                            async (repeatCount) => {
                                tracker.advance();
                                const dollarRun = "$".repeat(repeatCount);
                                const script = `$value = "${dollarRun}test"`;
                                const formatted = await runFormat(script, {
                                    powershellPreferSingleQuote: true,
                                });

                                expect(
                                    /\$value\s*=\s*"/v.test(formatted),
                                    `Expected double quotes to be preserved when content contains $.\n${formatted}`
                                ).toBeTruthy();
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });
    });

    describe("alias rewriting", () => {
        const aliasMap: Record<string, string> = {
            cat: "Get-Content",
            dir: "Get-ChildItem",
            echo: "Write-Output",
            gc: "Get-Content",
            gci: "Get-ChildItem",
            gcm: "Get-Command",
            gi: "Get-Item",
            gm: "Get-Member",
            gps: "Get-Process",
            gsv: "Get-Service",
            gwmi: "Get-WmiObject",
            la: "Get-ChildItem",
            ld: "Get-ChildItem",
            ls: "Get-ChildItem",
            ps: "Get-Process",
        };
        const aliasArb = fc.constantFrom(...Object.keys(aliasMap));

        it("rewrites aliases when enabled", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.aliasRewrite.on",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(aliasArb, async (alias) => {
                            tracker.advance();
                            const canonical = aliasMap[alias];
                            const script = `${alias} $value`;
                            const formatted = await runFormat(script, {
                                powershellRewriteAliases: true,
                            });
                            if (!formatted.includes(canonical)) {
                                throw new Error(
                                    `Expected alias '${alias}' to rewrite to '${canonical}'.\n${formatted}`
                                );
                            }
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("leaves aliases untouched when disabled", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.aliasRewrite.off",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(aliasArb, async (alias) => {
                            tracker.advance();
                            const canonical = aliasMap[alias];
                            const script = `${alias} $value`;
                            const formatted = await runFormat(script, {
                                powershellRewriteAliases: false,
                            });
                            if (formatted.includes(canonical)) {
                                throw new Error(
                                    `Alias '${alias}' should not rewrite when option disabled.\n${formatted}`
                                );
                            }
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });
    });

    describe("write-Host rewrite", () => {
        const hostCommandArb = fc
            .constantFrom("Write-Host", "write-host", "WRITE-HOST")
            .map((cmd) => `${cmd} "hi"`);

        it("rewrites Write-Host when enabled", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.writeHost.on",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(hostCommandArb, async (script) => {
                            tracker.advance();
                            const formatted = await runFormat(script, {
                                powershellRewriteWriteHost: true,
                            });

                            expect(
                                /write-output/iv.test(formatted),
                                `Expected Write-Host rewrite when enabled.\n${formatted}`
                            ).toBeTruthy();
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("keeps Write-Host when disabled", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.writeHost.off",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(hostCommandArb, async (script) => {
                            tracker.advance();
                            const formatted = await runFormat(script, {
                                powershellRewriteWriteHost: false,
                            });
                            if (/write-output/iv.test(formatted)) {
                                throw new Error(
                                    `Did not expect Write-Host rewrite when disabled.\n${formatted}`
                                );
                            }
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });
    });

    describe("indent style", () => {
        const commandArb = fc.constantFrom(
            'Write-Output "alpha"',
            'Write-Output "beta"',
            'Write-Output "gamma"'
        );

        it("emits tabs when indentStyle is tabs", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.indentTabs",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.array(commandArb, {
                                maxLength: 3,
                                minLength: 1,
                            }),
                            async (commands) => {
                                tracker.advance();
                                const body = commands
                                    .map((cmd) => `    ${cmd}`)
                                    .join("\n");
                                const script = `if ($true) {\n${body}\n}`;
                                const formatted = await runFormat(script, {
                                    powershellIndentStyle: "tabs",
                                });

                                const lines = formatted.split(/\r?\n/v);
                                const indentedLines = lines.filter((line) =>
                                    /^\t+/v.test(line)
                                );
                                if (indentedLines.length === 0) {
                                    throw new Error(
                                        `Expected at least one indented line with tabs.\n${formatted}`
                                    );
                                }
                                for (const line of indentedLines) {
                                    const leading =
                                        /^[\t ]+/v.exec(line)?.[0] ?? "";
                                    if (leading.includes(" ")) {
                                        throw new Error(
                                            `Found spaces in leading indentation despite tab style.\n${formatted}`
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

    describe("trailing comma handling", () => {
        const elementArb = fc.array(
            fc.constantFrom(
                "alpha",
                "beta",
                "gamma",
                "delta",
                "epsilon",
                "zeta"
            ),
            { maxLength: 6, minLength: 3 }
        );

        it("obeys trailingComma option variants for hashtables", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.trailingComma",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(elementArb, async (elements) => {
                            tracker.advance();
                            const entries = elements
                                .map((value, i) => `key${i} = "${value}"`)
                                .join("; ");
                            const script = `$items = @{${entries}}`;

                            const none = await runFormat(script, {
                                powershellLineWidth: 200,
                                powershellTrailingComma: "none",
                            });
                            const noneTrimmed = none.trimEnd();
                            if (
                                noneTrimmed.includes(";\n}") ||
                                noneTrimmed.endsWith(";}")
                            ) {
                                throw new Error(
                                    `Trailing semicolon found despite option "none".\n${none}`
                                );
                            }

                            const all = await runFormat(script, {
                                powershellLineWidth: 200,
                                powershellTrailingComma: "all",
                            });
                            const allTrimmed = all.trimEnd();
                            const hasTrailingSemicolonBeforeBrace =
                                /;\s*\}$/v.test(allTrimmed);
                            if (
                                !allTrimmed.includes(";\n}") &&
                                !allTrimmed.endsWith(";}") &&
                                !hasTrailingSemicolonBeforeBrace
                            ) {
                                throw new Error(
                                    `Expected trailing semicolon before closing brace for option "all".\n${all}`
                                );
                            }

                            const multiline = await runFormat(script, {
                                powershellLineWidth: 30,
                                powershellTrailingComma: "multiline",
                            });
                            const lines = multiline.trimEnd().split(/\r?\n/v);
                            const closing = lines.at(-1)?.trim() ?? "";
                            const penultimate = lines.at(-2)?.trim() ?? "";
                            if (
                                closing === "}" &&
                                !penultimate.endsWith(";") &&
                                lines.length > 2
                            ) {
                                throw new Error(
                                    `Expected trailing semicolon on last element for multiline output.\n${multiline}`
                                );
                            }
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("never adds trailing commas to arrays (PowerShell doesn't support them)", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.noArrayTrailingCommas",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(elementArb, async (elements) => {
                            tracker.advance();
                            const literal = elements
                                .map((value) => `"${value}"`)
                                .join(", ");
                            const script = `$items = @(${literal})`;

                            // Test with all options - arrays should NEVER get trailing commas
                            for (const option of [
                                "none",
                                "multiline",
                                "all",
                            ] as const) {
                                const result = await runFormat(script, {
                                    powershellLineWidth: 30,
                                    powershellTrailingComma: option,
                                });
                                if (/,\s*\)/v.test(result)) {
                                    throw new Error(
                                        `Trailing comma found in array with option "${option}" (PowerShell doesn't support this).\n${result}`
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

    describe("line width wrapping", () => {
        it("wraps narrow width arrays while keeping wide arrays inline", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.lineWidth",
                1,
                async (tracker) => {
                    tracker.advance();
                    const script =
                        '$values = @("alpha", "beta", "gamma", "delta", "epsilon", "zeta")';
                    const wide = await runFormat(script, {
                        powershellLineWidth: 120,
                    });
                    const narrow = await runFormat(script, {
                        powershellLineWidth: 40,
                    });

                    const multilineMarker = '\n    "';

                    if (wide.includes(multilineMarker)) {
                        throw new Error(
                            `Expected wide formatting to remain inline.\n${wide}`
                        );
                    }
                    if (!narrow.includes(multilineMarker)) {
                        throw new Error(
                            `Expected narrow formatting to introduce line breaks.\n${narrow}`
                        );
                    }
                }
            );
        });
    });

    describe("hashtable sorting", () => {
        const keyPool = [
            "Alpha",
            "Bravo",
            "Charlie",
            "Delta",
            "Echo",
            "Foxtrot",
            "Gamma",
        ];

        const keySetArb: fc.Arbitrary<string[]> = fc
            .array(fc.constantFrom(...keyPool), { maxLength: 5, minLength: 2 })
            .map((keys: readonly string[]): string[] => [
                ...new Set<string>(keys),
            ])
            .filter((keys: readonly string[]) => keys.length >= 2);

        const extractKeys = (formatted: string): string[] => {
            const startIndex = formatted.indexOf("@{");
            const endIndex = formatted.lastIndexOf("}");
            if (
                startIndex === -1 ||
                endIndex === -1 ||
                endIndex <= startIndex
            ) {
                return [];
            }

            const body = formatted.slice(startIndex + 2, endIndex);
            return body
                .split(";")
                .map((segment) => segment.trim())
                .filter((segment) => segment.includes("="))
                .map((segment) => segment.slice(0, segment.indexOf("=")).trim())
                .filter((key) => key.length > 0);
        };

        it("preserves original key order when sorting disabled", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.sortHashtable.off",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            keySetArb,
                            async (keys: readonly string[]) => {
                                tracker.advance();
                                const entries = keys
                                    .map(
                                        (key: string, index: number) =>
                                            `${key} = ${index}`
                                    )
                                    .join("; ");
                                const script = `$map = @{ ${entries} }`;
                                const formatted = await runFormat(script, {
                                    powershellSortHashtableKeys: false,
                                });
                                const formattedKeys = extractKeys(formatted);
                                if (formattedKeys.length !== keys.length) {
                                    throw new Error(
                                        `Mismatch in key counts. expected=${keys.length} actual=${formattedKeys.length}`
                                    );
                                }
                                for (
                                    let index = 0;
                                    index < keys.length;
                                    index += 1
                                ) {
                                    if (formattedKeys[index] !== keys[index]) {
                                        throw new Error(
                                            `Key order changed when sorting disabled. expected=${keys.join(", ")} actual=${formattedKeys.join(", ")}`
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

        it("sorts keys alphabetically when enabled", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "printerOptions.sortHashtable.on",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            keySetArb,
                            async (keys: readonly string[]) => {
                                tracker.advance();
                                const entries = keys
                                    .map(
                                        (key: string, index: number) =>
                                            `${key} = ${index}`
                                    )
                                    .join("; ");
                                const script = `$map = @{ ${entries} }`;
                                const formatted = await runFormat(script, {
                                    powershellSortHashtableKeys: true,
                                });
                                const formattedKeys: string[] = extractKeys(
                                    formatted
                                ).map((key: string) => key.toLowerCase());
                                const expected: string[] = keys.map(
                                    (key: string) => key.toLowerCase()
                                );
                                expected.sort((a: string, b: string) =>
                                    a.localeCompare(b)
                                );
                                if (formattedKeys.length !== expected.length) {
                                    throw new Error(
                                        `Mismatch in key counts for sorted case. expected=${expected.length} actual=${formattedKeys.length}`
                                    );
                                }
                                for (
                                    let index = 0;
                                    index < expected.length;
                                    index += 1
                                ) {
                                    if (
                                        formattedKeys[index] !== expected[index]
                                    ) {
                                        throw new Error(
                                            `Expected alphabetical order but received ${formattedKeys.join(", ")} != ${expected.join(", ")}`
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
});
