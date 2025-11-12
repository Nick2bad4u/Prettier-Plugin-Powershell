
import { describe, expect, it } from "vitest";
import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

const joinLines = (...values: string[]): string => values.join("\n");

describe("Call operator formatting", () => {
    it("formats call operator against script blocks", async () => {
        const input = joinLines(
            "",
            "$scriptBlock = {",
            "    param($name)",
            '    "Hello $name"',
            "}",
            '& $scriptBlock -name "World"',
            ""
        );
        const result = await formatAndAssert(input, baseConfig, "call-operator.result");
        expect(result).toContain("param($name)");
        expect(result).toContain('"Hello $name"');
        expect(result).toContain('& $scriptBlock -name "World"');
    });

    it("handles call operator with command expressions", async () => {
        const input = '& (Get-Command Write-Host) "hi"';
        const result = await formatAndAssert(input, baseConfig, "call-operator.result");
        expect(result).toBe('& (Get-Command Write-Host) "hi"\n');
    });

    it("supports splatted arguments", async () => {
        const input = joinLines(
            "",
            "$invoke = Get-Command Invoke-RestMethod",
            '$params = @{ Uri = "https://example.com" }',
            '& $invoke @params',
            ""
        );
        const result = await formatAndAssert(input, baseConfig, "call-operator.result");
        expect(result).toBe(
            '$invoke = Get-Command Invoke-RestMethod\n' +
                '$params = @{ Uri = "https://example.com" }\n' +
                '& $invoke @params\n'
        );
    });

    it("supports property invocation via call operator", async () => {
        const input = joinLines(
            "",
            '$object = [PSCustomObject]@{ Script = { "ok" } }',
            '& $object.Script.Invoke()',
            ""
        );
        const result = await formatAndAssert(input, baseConfig, "call-operator.result");
        expect(result).toContain('[PSCustomObject]');
        expect(result).toMatch(/& \$object\.Script\.Invoke\(\)/);
    });
});
