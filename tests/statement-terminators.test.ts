import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

const joinLines = (...values: readonly string[]): string => values.join("\n");

describe("statement terminator handling", () => {
    it("formats semicolon-separated script blocks and commands", async () => {
        expect.hasAssertions();

        const input = joinLines(
            "$scriptBlock = {",
            '    Write-Output "Hello"',
            '}; Write-Output "After"',
            ""
        );
        const result = await formatAndAssert(input, baseConfig, {
            id: "statement-terminators.test.ts.result",
            skipParse: true,
        });

        const expected = joinLines(
            "$scriptBlock = {",
            '    Write-Output "Hello"',
            "}",
            'Write-Output "After"',
            ""
        );

        expect(result).toBe(expected);
    });

    it("preserves inline comments following semicolons", async () => {
        expect.hasAssertions();

        const input = joinLines(
            "$scriptBlock = {",
            '    Write-Output "Hello"',
            "}; # trailing comment",
            'Write-Output "After"',
            ""
        );
        const result = await formatAndAssert(
            input,
            baseConfig,
            "statement-terminators"
        );

        expect(result).toContain("# trailing comment");

        const expected = joinLines(
            "$scriptBlock = {",
            '    Write-Output "Hello"',
            "} # trailing comment",
            'Write-Output "After"',
            ""
        );

        expect(result).toBe(expected);
    });

    it("normalizes inline semicolon-separated commands", async () => {
        expect.hasAssertions();

        const input =
            'Write-Output "one"; Write-Output "two"; Write-Output "three"';
        const result = await formatAndAssert(input, baseConfig, {
            id: "statement-terminators.test.ts.result",
            skipParse: true,
        });

        const expected = joinLines(
            'Write-Output "one"',
            'Write-Output "two"',
            'Write-Output "three"',
            ""
        );

        expect(result).toBe(expected);
    });
});
