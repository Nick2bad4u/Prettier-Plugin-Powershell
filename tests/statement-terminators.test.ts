import prettier from "prettier";
import { describe, expect, it } from "vitest";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

const joinLines = (...values: string[]): string => values.join("\n");

describe("Statement terminator handling", () => {
    it("formats semicolon-separated script blocks and commands", async () => {
        const input = joinLines(
            "$scriptBlock = {",
            '    Write-Output "Hello"',
            '}; Write-Output "After"',
            ""
        );
        const result = await prettier.format(input, baseConfig);

        const expected = joinLines(
            "$scriptBlock = {",
            '  Write-Output "Hello"',
            "}",
            'Write-Output "After"',
            ""
        );
        expect(result).toBe(expected);
    });

    it("preserves inline comments following semicolons", async () => {
        const input = joinLines(
            "$scriptBlock = {",
            '    Write-Output "Hello"',
            '}; # trailing comment',
            'Write-Output "After"',
            ""
        );
        const result = await prettier.format(input, baseConfig);

        expect(result).toContain("# trailing comment");
        const expected = joinLines(
            "$scriptBlock = {",
            '  Write-Output "Hello"',
            '} # trailing comment',
            'Write-Output "After"',
            ""
        );
        expect(result).toBe(expected);
    });

    it("normalizes inline semicolon-separated commands", async () => {
        const input =
            'Write-Output "one"; Write-Output "two"; Write-Output "three"';
        const result = await prettier.format(input, baseConfig);

        const expected = joinLines(
            'Write-Output "one"',
            'Write-Output "two"',
            'Write-Output "three"',
            ""
        );
        expect(result).toBe(expected);
    });
});
