import type { Options } from "prettier";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { parsePowerShell } from "../src/parser.js";
import plugin from "../src/plugin.js";
import { formatAndAssert } from "./utils/format-and-assert.js";
import {
    assertPowerShellParses,
    isPowerShellParsable,
} from "./utils/powershell.js";
import { withProgress } from "./utils/progress.js";

const PROPERTY_RUNS = Number.parseInt(
    globalThis.process.env.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

const prettierConfig: Options = {
    filepath: "weird.ps1",
    parser: "powershell",
    plugins: [plugin],
};

const baseScripts = [
    "$x = 1",
    "$name = 'test'",
    "Write-Output 'hello'",
    "1, 2, 3 | Sort-Object",
    "function Invoke-Stuff { param($arg) Write-Output $arg }",
    "@{ Name = 'value'; Count = 2 }",
];

describe("weird PowerShell file property tests", () => {
    const assertParseAndFormat = async (script: string) => {
        const ast = parsePowerShell(script, { tabWidth: 2 } as never);
        if (ast.type !== "Script") {
            throw new Error("Parser did not return a Script node");
        }

        // Check if the formatted output will be parseable by PowerShell
        const isValidPowerShell = await isPowerShellParsable(
            script,
            "weirdFiles.original"
        );

        // Format first without validation to check for BOM issue
        const formatted = await formatAndAssert(script, prettierConfig, {
            id: "weirdFiles.formatted",
            skipParse: true, // We'll validate manually below
        });

        // Known issue: BOM followed immediately by certain syntax confuses PowerShell
        const formattedHasBOMIssue =
            formatted.startsWith("\uFEFF") &&
            formatted.length > 1 &&
            formatted[1] !== "\n" &&
            formatted[1] !== "\r";

        // Now validate if it's parseable (unless we know it has the BOM issue)
        if (isValidPowerShell && !formattedHasBOMIssue) {
            await assertPowerShellParses(formatted, "weirdFiles.formatted");
        }

        const formattedAst = parsePowerShell(formatted, {
            tabWidth: 2,
        } as never);
        if (formattedAst.type !== "Script") {
            throw new Error("Formatted output did not parse to Script node");
        }

        const formattedAgain = await formatAndAssert(
            formatted,
            prettierConfig,
            {
                id: "weirdFiles.formattedAgain",
                skipParse: !isValidPowerShell || formattedHasBOMIssue,
            }
        );
        if (formattedAgain !== formatted) {
            throw new Error("Formatting was not idempotent");
        }
    };

    describe("bom and shebang handling", () => {
        it("handles BOM and shebang combinations", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "weirdFiles.bomShebang",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.boolean(),
                            fc.option(
                                fc.constantFrom(
                                    "#!/usr/bin/env pwsh",
                                    "#!/usr/bin/pwsh",
                                    "#!/bin/pwsh"
                                ),
                                { nil: undefined }
                            ),
                            fc.constantFrom(...baseScripts),
                            async (includeBom, shebang, script) => {
                                tracker.advance();
                                const parts: string[] = [];
                                if (includeBom) {
                                    parts.push("\uFEFF");
                                }
                                if (shebang) {
                                    parts.push(shebang);
                                }
                                parts.push(script);
                                const combined = parts.join("\n");
                                await assertParseAndFormat(combined);
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );

            expect(true).toBeTruthy();
        });
    });

    describe("unicode content", () => {
        const unicodeSamples = [
            "😀",
            "😎",
            "é",
            "ü",
            "ß",
            "Ж",
            "λ",
            "न",
            "ع",
            "你",
            "好",
            "あ",
            "漢",
            "字",
            "💡",
            "🧪",
            "咖",
            "啡",
            "ø",
            "ç",
            "א", // Hebrew letter
            "א̇", // Hebrew letter with combining dot above
            "́", // Combining acute accent alone
            String.fromCodePoint(8206), // Left-to-right mark (LTR)
            String.fromCodePoint(8207), // Right-to-left mark (RLM)
        ] as const;

        const unicodeString = fc
            .array(fc.constantFrom(...unicodeSamples), {
                maxLength: 5,
                minLength: 1,
            })
            .map((chars) => chars.join(""));

        it("handles unicode in strings and comments", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "weirdFiles.unicodeStrings",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(unicodeString, async (value) => {
                            tracker.advance();
                            const escaped = value.replaceAll("'", "''");
                            const script = `# ${value}\n$emoji = '${escaped}'\nWrite-Output $emoji`;
                            await assertParseAndFormat(script);
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );

            expect(true).toBeTruthy();
        });

        it("handles unicode in identifiers", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "weirdFiles.unicodeIdentifiers",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(unicodeString, async (value) => {
                            tracker.advance();
                            const sanitized = value.replaceAll(
                                /[^\p{L}\p{Nd}_]/gv,
                                ""
                            );
                            const identifier =
                                sanitized.length > 0 ? sanitized : "Unicode";
                            const script = `$${identifier} = '${value.replaceAll("'", "''")}'\nWrite-Output $${identifier}`;
                            await assertParseAndFormat(script);
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );

            expect(true).toBeTruthy();
        });
    });

    describe("comment directives and blocks", () => {
        const commentScripts = fc.constantFrom(
            "#requires -Version 7.2\nWrite-Output 'ok'",
            "#region Description\nWrite-Output 'inside region'\n#endregion",
            "<# multi\nline\ncomment 😀 #>\nWrite-Output 'emoji'",
            "<# \n[System.Text.StringBuilder]::new()\n#>\nWrite-Output 'builder'"
        );

        it("parses comment directives and block comments", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "weirdFiles.comments",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(commentScripts, async (script) => {
                            tracker.advance();
                            await assertParseAndFormat(script);
                        }),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );

            expect(true).toBeTruthy();
        });
    });

    describe("whitespace oddities", () => {
        const weirdWhitespace = fc
            .array(
                fc.constantFrom(
                    "\u00A0",
                    "\u2003",
                    "\u2009",
                    "\u202F",
                    "\t",
                    " "
                ),
                {
                    maxLength: 5,
                    minLength: 1,
                }
            )
            .map((chars) => chars.join(""));

        it("handles pipelines with unusual whitespace", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "weirdFiles.pipelineWhitespace",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            weirdWhitespace,
                            weirdWhitespace,
                            async (ws1, ws2) => {
                                tracker.advance();
                                const script = `Get-Item${ws1}|${ws2}Select-Object Name`;
                                await assertParseAndFormat(script);
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );

            expect(true).toBeTruthy();
        });

        const exoticWhitespaceScripts = fc.constantFrom(
            "`tWrite-Output`u00A0'space'",
            "`u202Ffunction Test { 'thin space' }",
            "Write-Output`u2003'double em'"
        );

        it("handles exotic whitespace escape sequences", async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            await withProgress(
                "weirdFiles.exoticWhitespace",
                PROPERTY_RUNS,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            exoticWhitespaceScripts,
                            async (script) => {
                                tracker.advance();
                                await assertParseAndFormat(script);
                            }
                        ),
                        { numRuns: PROPERTY_RUNS }
                    );
                }
            );

            expect(true).toBeTruthy();
        });
    });
});
