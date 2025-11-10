import prettier from "prettier";
import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: [plugin],
};

describe("Formatting edge cases", () => {
    it("formats static member access (::) without spaces", async () => {
        const script = "[System.IO.Path] :: PathSeparator";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("[System.IO.Path]::PathSeparator");
    });

    it("formats named parameter colons without spaces", async () => {
        const script = "Get-Module -Name : $ModuleName";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("Get-Module -Name:$ModuleName");
    });

    it("formats splatting (@) without spaces", async () => {
        const script = "Add-Profile @ profileArguments";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("Add-Profile @profileArguments");
    });

    it("formats logical operators with space before parenthesis", async () => {
        const script = "if (-not(Test-Path $path)) { }";
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("-not (Test-Path $path)");
    });

    it("formats -and operator with space before parenthesis", async () => {
        const script = "if ($a -and($b)) { }";
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("-and ($b)");
    });

    it("formats -or operator with space before parenthesis", async () => {
        const script = "if ($a -or($b)) { }";
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("-or ($b)");
    });

    it("handles complex combinations correctly", async () => {
        const script = `
$separator = [System.IO.Path] :: PathSeparator
$paths = $env:PSModulePath -split [System.Text.RegularExpressions.Regex] :: Escape($separator)
$result = Get-Module -Name : $ModuleName
Add-Profile @ arguments
if (-not(Test-Path $path)) { }
`;
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("[System.IO.Path]::PathSeparator");
        expect(result).toContain(
            "[System.Text.RegularExpressions.Regex]::Escape"
        );
        expect(result).toContain("-Name:$ModuleName");
        expect(result).toContain("@arguments");
        expect(result).toContain("-not (Test-Path $path)");
    });

    it("formats operators before parentheses with space", async () => {
        const script = "$h =($Hue % 1) * 6";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("$h = ($Hue % 1) * 6");
    });

    it("formats cmdlets before parentheses with space", async () => {
        const script = "Write-Host($message)";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("Write-Host ($message)");
    });

    it("formats method calls without space before parenthesis", async () => {
        const script = "$obj.ContainsKey ($key)";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("$obj.ContainsKey($key)");
    });

    it("formats static method calls without space", async () => {
        const script = "[Math]:: Round ($value)";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("[Math]::Round($value)");
    });

    it("formats hexadecimal numbers correctly", async () => {
        const script = "$mode.Value = 0x0004";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("$mode.Value = 0x0004");
    });

    it("formats various hex number formats", async () => {
        const script = `
$a = 0x00
$b = 0xFF
$c = 0xDEADBEEF
$d = 0X1234
`;
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("0x00");
        expect(result).toContain("0xFF");
        expect(result).toContain("0xDEADBEEF");
        expect(result).toContain("0X1234");
    });
});
