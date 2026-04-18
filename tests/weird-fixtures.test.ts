import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
    formatAndAssert,
    formatAndAssertRoundTrip,
} from "./utils/format-and-assert.js";
import { assertPowerShellParses } from "./utils/powershell.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

interface FixtureCheck {
    assertFormatted?: (output: string) => void;
    assertInput?: (input: string) => void;
    expectIdempotent?: boolean;
    file: string;
    name: string;
    skipParse?: boolean;
}

describe("additional regression fixtures", () => {
    const fixtures: FixtureCheck[] = [
        {
            assertFormatted: (output) => {
                expect(output).toContain("return");
            },
            assertInput: (input) => {
                expect(input).toContain(String.fromCodePoint(8288));
                expect(input).toContain(String.fromCodePoint(8203));
            },
            file: "./fixtures/invisible-whitespace.ps1",
            name: "invisible whitespace around keywords and operators",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("& (Get-Command Write-Output)");
                expect(input).toContain("$splat.ScriptBlock");
            },
            file: "./fixtures/call-operator-nested.ps1",
            name: "call operator pipelines and nested subexpressions",
        },
        {
            assertInput: (input) => {
                expect(input).toContain(String.fromCodePoint(8288));
                expect(input).toContain(String.fromCodePoint(160));
            },
            expectIdempotent: false,
            file: "./fixtures/exotic-metadata.psd1",
            name: "exotic metadata psd1 with zero-width characters",
        },
        {
            assertInput: (input) => {
                expect(input).toContain('@"');
                expect(input).toContain("'@");
            },
            file: "./fixtures/here-string-weird.ps1",
            name: "here-string indentation edge cases",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("&&");
                expect(input).toContain("2>&1");
            },
            file: "./fixtures/pipeline-chains.ps1",
            name: "pipeline chains with redirects and call operator",
        },
        {
            assertInput: (input) => {
                expect(input).toMatch(/Δ/v);
                expect(input).toMatch(/値/v);
            },
            file: "./fixtures/unicode-identifiers.ps1",
            name: "unicode identifiers",
            skipParse: true,
        },
        {
            assertInput: (input) => {
                expect(input).toContain("#!/usr/bin/env pwsh");
                expect(input).toContain("#Requires");
            },
            file: "./fixtures/bom-shebang-mixed.ps1",
            name: "BOM and shebang combinations",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("Level3");
            },
            file: "./fixtures/deeply-nested-structures.ps1",
            name: "deeply nested structures",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("1..10");
                expect(input).toContain("++");
            },
            file: "./fixtures/operator-edge-cases.ps1",
            name: "operator edge cases",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("ValidateScript");
                expect(input).toContain("ParameterSetName");
            },
            file: "./fixtures/complex-parameters.ps1",
            name: "complex parameter attributes",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("<#");
                expect(input).toContain("#>");
            },
            file: "./fixtures/mixed-comment-styles.ps1",
            name: "mixed comment styles",
        },
        {
            assertInput: (input) => {
                expect(input).toContain(
                    "English: This function prints greetings in many languages."
                );
                expect(input).toContain("日本語");
                expect(input).toContain("Русский");
                expect(input).toContain("العربية");
                expect(input).toContain("हिन्दी");
            },
            file: "./fixtures/multilingual-comments.ps1",
            name: "multilingual comments and strings",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("$($");
                expect(input).toContain('@"');
            },
            file: "./fixtures/string-interpolation-complex.ps1",
            name: "string interpolation edge cases",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("catch [System.");
                expect(input).toContain("finally");
            },
            file: "./fixtures/nested-error-handling.ps1",
            name: "nested error handling",
        },
        {
            assertInput: (input) => {
                expect(input).toContain("class");
                expect(input).toContain("static");
            },
            file: "./fixtures/class-definitions.ps1",
            name: "class definitions with inheritance",
        },
        {
            assertInput: (input) => {
                // RLM and zero-width space are present in the comments
                expect(input).toMatch(/English.*Arabic/v);
                expect(input).toMatch(/zero.*width/v);
                // Non-breaking spaces (NBSP) around the arrow
                expect(input).toMatch(/Prefix\s*\S*->\S*\s*\$Text/v);
            },
            file: "./fixtures/rtl-and-zero-width.ps1",
            name: "rtl markers and zero-width characters",
        },
    ];

    for (const fixture of fixtures) {
        it(`formats ${fixture.name}`, async () => {
            const fileUrl = new URL(fixture.file, import.meta.url);
            const filePath = fileURLToPath(fileUrl);
            const input = readFileSync(filePath, "utf8");

            fixture.assertInput?.(input);

            let firstPass: string;
            const idBase = `weird-fixtures.${fixture.name}`;
            if (fixture.expectIdempotent === false) {
                firstPass = await formatAndAssert(
                    input,
                    {
                        ...baseConfig,
                        filepath: filePath,
                    },
                    fixture.skipParse
                        ? `${idBase}.first|skipParse`
                        : `${idBase}.first`
                );

                const secondPass = await formatAndAssert(
                    firstPass,
                    {
                        ...baseConfig,
                        filepath: filePath,
                    },
                    fixture.skipParse
                        ? "weird-fixtures.secondPass|skipParse"
                        : "weird-fixtures.secondPass"
                );
                if (!fixture.skipParse) {
                    await assertPowerShellParses(
                        secondPass,
                        `weird-fixtures.secondPass.${fixture.name}`
                    );
                }
                const normalizedSecond = secondPass.replaceAll(/;{2,}/gv, ";");

                expect(normalizedSecond).toBe(firstPass);
            } else {
                firstPass = await formatAndAssertRoundTrip(
                    input,
                    {
                        ...baseConfig,
                        filepath: filePath,
                    },
                    fixture.skipParse ? `${idBase}|skipParse` : idBase
                );
            }
            fixture.assertFormatted?.(firstPass);

            if (!fixture.skipParse) {
                await assertPowerShellParses(firstPass, idBase);
            }
        });
    }
});
