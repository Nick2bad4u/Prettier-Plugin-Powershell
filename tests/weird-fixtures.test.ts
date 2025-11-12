import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import prettier from "prettier";
import { describe, expect, it } from "vitest";

import { assertPowerShellParses } from "./utils/powershell.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

type FixtureCheck = {
    name: string;
    file: string;
    assertInput?: (input: string) => void;
    assertFormatted?: (output: string) => void;
    expectIdempotent?: boolean;
};

describe("Additional regression fixtures", () => {
    const fixtures: FixtureCheck[] = [
        {
            name: "invisible whitespace around keywords and operators",
            file: "./fixtures/invisible-whitespace.ps1",
            assertInput: (input) => {
                expect(input).toMatch(/\u2060/);
                expect(input).toMatch(/\u200B/);
            },
            assertFormatted: (output) => {
                expect(output).toContain("return");
            },
        },
        {
            name: "call operator pipelines and nested subexpressions",
            file: "./fixtures/call-operator-nested.ps1",
            assertInput: (input) => {
                expect(input).toContain("& (Get-Command Write-Output)");
                expect(input).toContain("@splat.ScriptBlock");
            },
        },
        {
            name: "exotic metadata psd1 with zero-width characters",
            file: "./fixtures/exotic-metadata.psd1",
            assertInput: (input) => {
                expect(input).toMatch(/\u2060/);
                expect(input).toMatch(/\u00A0/);
            },
            expectIdempotent: false,
        },
        {
            name: "here-string indentation edge cases",
            file: "./fixtures/here-string-weird.ps1",
            assertInput: (input) => {
                expect(input).toContain('@"');
                expect(input).toContain("'@");
            },
        },
        {
            name: "pipeline chains with redirects and call operator",
            file: "./fixtures/pipeline-chains.ps1",
            assertInput: (input) => {
                expect(input).toContain("&&");
                expect(input).toContain("2>&1");
            },
        },
        {
            name: "unicode identifiers",
            file: "./fixtures/unicode-identifiers.ps1",
            assertInput: (input) => {
                expect(input).toMatch(/Δ/);
                expect(input).toMatch(/値/);
            },
        },
        {
            name: "BOM and shebang combinations",
            file: "./fixtures/bom-shebang-mixed.ps1",
            assertInput: (input) => {
                expect(input).toContain("#!/usr/bin/env pwsh");
                expect(input).toContain("#Requires");
            },
        },
        {
            name: "deeply nested structures",
            file: "./fixtures/deeply-nested-structures.ps1",
            assertInput: (input) => {
                expect(input).toContain("Level3");
            },
        },
        {
            name: "operator edge cases",
            file: "./fixtures/operator-edge-cases.ps1",
            assertInput: (input) => {
                expect(input).toContain("1..10");
                expect(input).toContain("++");
            },
        },
        {
            name: "complex parameter attributes",
            file: "./fixtures/complex-parameters.ps1",
            assertInput: (input) => {
                expect(input).toContain("ValidateScript");
                expect(input).toContain("ParameterSetName");
            },
        },
        {
            name: "mixed comment styles",
            file: "./fixtures/mixed-comment-styles.ps1",
            assertInput: (input) => {
                expect(input).toContain("<#");
                expect(input).toContain("#>");
            },
        },
        {
            name: "string interpolation edge cases",
            file: "./fixtures/string-interpolation-complex.ps1",
            assertInput: (input) => {
                expect(input).toContain("$($");
                expect(input).toContain("@\"");
            },
        },
        {
            name: "nested error handling",
            file: "./fixtures/nested-error-handling.ps1",
            assertInput: (input) => {
                expect(input).toContain("catch [System.");
                expect(input).toContain("finally");
            },
        },
        {
            name: "class definitions with inheritance",
            file: "./fixtures/class-definitions.ps1",
            assertInput: (input) => {
                expect(input).toContain("class");
                expect(input).toContain("static");
            },
        },
    ];

    for (const fixture of fixtures) {
        it(`formats ${fixture.name}`, async () => {
            const fileUrl = new URL(fixture.file, import.meta.url);
            const filePath = fileURLToPath(fileUrl);
            const input = readFileSync(filePath, "utf8");

            fixture.assertInput?.(input);

            const firstPass = await prettier.format(input, {
                ...baseConfig,
                filepath: filePath,
            });

            const secondPass = await prettier.format(firstPass, {
                ...baseConfig,
                filepath: filePath,
            });

            if (fixture.expectIdempotent === false) {
                const normalizedSecond = secondPass.replace(/;{2,}/g, ";");
                expect(normalizedSecond).toBe(firstPass);
            } else {
                expect(secondPass).toBe(firstPass);
            }
            fixture.assertFormatted?.(firstPass);

            assertPowerShellParses(
                firstPass,
                `weird-fixtures.${fixture.name}`
            );
        });
    }
});
