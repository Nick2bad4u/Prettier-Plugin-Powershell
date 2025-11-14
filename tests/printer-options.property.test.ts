import * as fc from "fast-check";
import { describe, it } from "vitest";

import plugin from "../src/index.js";

import { formatAndAssert } from "./utils/format-and-assert.js";
import { withProgress } from "./utils/progress.js";

const PROPERTY_RUNS = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

const runFormat = async (
    script: string,
    overrides: Record<string, unknown> = {}
): Promise<string> => {
    const formatted = await formatAndAssert(
        script,
        {
            parser: "powershell",
            plugins: [plugin],
            filepath: "options-test.ps1",
            ...overrides,
        },
        "printerOptions.runFormat"
    );
    return formatted;
};

describe("Printer option-specific property tests", () => {
    describe("blank line controls", () => {
        const functionNameArb = fc
            .tuple(
                fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz"),
                fc.array(
                    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"),
                    { maxLength: 6 }
                )
            )
            .map(([first, rest]) => `${first}${rest.join("")}`);

        const twoFunctionScriptArb = fc
            .tuple(functionNameArb, functionNameArb)
            .map(([first, second]) => {
                return `function ${first} {
    Write-Output "${first}"
}
function ${second} {
    Write-Output "${second}"
}`;
            });

        it("respects blankLinesBetweenFunctions", async () => {
            await withProgress(
                "printerOptions.blankLines",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            twoFunctionScriptArb,
                            fc.integer({ min: 0, max: 3 }),
                            async (script, spacing) => {
                                tracker.advance();
                                const formatted = await runFormat(script, {
                                    powershellBlankLinesBetweenFunctions:
                                        spacing,
                                });

                                const normalized = formatted.replace(
                                    /\r\n/g,
                                    "\n"
                                );
                                const match = normalized.match(
                                    /}\n((?:\n)*)function\s+\w+/
                                );
                                if (!match) {
                                    throw new Error(
                                        `Unable to locate function boundary in formatted output.\n${formatted}`
                                    );
                                }
                                const gapSegment = match[1] ?? "";
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

                            const lines = formatted.split(/\r?\n/);
                            const paramIndex = lines.findIndex((line) =>
                                /param\s*\(/i.test(line)
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
            ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,:/?"
        );

        const safeContentArb = fc
            .array(safeCharArb, { minLength: 1, maxLength: 25 })
            .map((chars) => chars.join(""));

        it("uses single quotes when preferSingleQuote is enabled", async () => {
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

                            if (!/\$value\s*=\s*'[^']*'/.test(formatted)) {
                                throw new Error(
                                    `Expected single-quoted literal when preferSingleQuote is true.\n${formatted}`
                                );
                            }
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("retains double quotes for dynamic content", async () => {
            await withProgress(
                "printerOptions.dynamicQuotes",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.integer({ min: 1, max: 2 }),
                            async (repeatCount) => {
                                tracker.advance();
                                const dollarRun = "$".repeat(repeatCount);
                                const script = `$value = "${dollarRun}test"`;
                                const formatted = await runFormat(script, {
                                    powershellPreferSingleQuote: true,
                                });

                                if (!/\$value\s*=\s*"/.test(formatted)) {
                                    throw new Error(
                                        `Expected double quotes to be preserved when content contains $.
${formatted}`
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

    describe("alias rewriting", () => {
        const aliasMap: Record<string, string> = {
            gi: "Get-Item",
            gci: "Get-ChildItem",
            ls: "Get-ChildItem",
            dir: "Get-ChildItem",
            ld: "Get-ChildItem",
            la: "Get-ChildItem",
            gcm: "Get-Command",
            gm: "Get-Member",
            gps: "Get-Process",
            ps: "Get-Process",
            gwmi: "Get-WmiObject",
            gsv: "Get-Service",
            cat: "Get-Content",
            gc: "Get-Content",
            echo: "Write-Output",
        };
        const aliasArb = fc.constantFrom(...Object.keys(aliasMap));

        it("rewrites aliases when enabled", async () => {
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

    describe("Write-Host rewrite", () => {
        const hostCommandArb = fc
            .constantFrom("Write-Host", "write-host", "WRITE-HOST")
            .map((cmd) => `${cmd} "hi"`);

        it("rewrites Write-Host when enabled", async () => {
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
                            if (!/Write-Output/i.test(formatted)) {
                                throw new Error(
                                    `Expected Write-Host rewrite when enabled.\n${formatted}`
                                );
                            }
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("keeps Write-Host when disabled", async () => {
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
                            if (/Write-Output/i.test(formatted)) {
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
            await withProgress(
                "printerOptions.indentTabs",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.array(commandArb, {
                                minLength: 1,
                                maxLength: 3,
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

                                const lines = formatted.split(/\r?\n/);
                                const indentedLines = lines.filter((line) =>
                                    /^\t+/.test(line)
                                );
                                if (indentedLines.length === 0) {
                                    throw new Error(
                                        `Expected at least one indented line with tabs.\n${formatted}`
                                    );
                                }
                                for (const line of indentedLines) {
                                    const leading =
                                        line.match(/^[\t ]+/)?.[0] ?? "";
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
            { minLength: 3, maxLength: 6 }
        );

        it("obeys trailingComma option variants for hashtables", async () => {
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
                                powershellTrailingComma: "none",
                                powershellLineWidth: 200,
                            });
                            if (/;[\s\r\n]*\}/.test(none)) {
                                throw new Error(
                                    `Trailing semicolon found despite option "none".\n${none}`
                                );
                            }

                            const all = await runFormat(script, {
                                powershellTrailingComma: "all",
                                powershellLineWidth: 200,
                            });
                            if (!/;[\s\r\n]*\}/.test(all)) {
                                throw new Error(
                                    `Expected trailing semicolon before closing brace for option "all".\n${all}`
                                );
                            }

                            const multiline = await runFormat(script, {
                                powershellTrailingComma: "multiline",
                                powershellLineWidth: 30,
                            });
                            const lines = multiline.trimEnd().split(/\r?\n/);
                            const closing =
                                lines[lines.length - 1]?.trim() ?? "";
                            const penultimate =
                                lines[lines.length - 2]?.trim() ?? "";
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
                                    powershellTrailingComma: option,
                                    powershellLineWidth: 30,
                                });
                                if (/,[\s\r\n]*\)/.test(result)) {
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

                    const multilineMarker = '\n    \"';

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
            .array(fc.constantFrom(...keyPool), { minLength: 2, maxLength: 5 })
            .map((keys) => Array.from(new Set(keys)))
            .filter((keys) => keys.length >= 2);

        const extractKeys = (formatted: string): string[] => {
            const keys: string[] = [];
            const bodyMatch = formatted.match(/@\{([\s\S]*?)\}/);
            if (!bodyMatch) {
                return keys;
            }
            const matcher = /([A-Za-z][A-Za-z0-9_-]*)\s*=/g;
            let match: RegExpExecArray | null;
            while ((match = matcher.exec(bodyMatch[1])) !== null) {
                keys.push(match[1]);
            }
            return keys;
        };

        it("preserves original key order when sorting disabled", async () => {
            await withProgress(
                "printerOptions.sortHashtable.off",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(keySetArb, async (keys) => {
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
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );
        });

        it("sorts keys alphabetically when enabled", async () => {
            await withProgress(
                "printerOptions.sortHashtable.on",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(keySetArb, async (keys) => {
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
                            const formattedKeys = extractKeys(formatted).map(
                                (key) => key.toLowerCase()
                            );
                            const expected = [...keys]
                                .map((key: string) => key.toLowerCase())
                                .sort((a, b) => a.localeCompare(b));
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
                                if (formattedKeys[index] !== expected[index]) {
                                    throw new Error(
                                        `Expected alphabetical order but received ${formattedKeys.join(", ")} != ${expected.join(", ")}`
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
});
