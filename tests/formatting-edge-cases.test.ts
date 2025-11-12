
import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";

import { formatAndAssert } from "./utils/format-and-assert.js";


const baseConfig = {
    parser: "powershell" as const,
    plugins: [plugin],
};

describe("Formatting edge cases", () => {
    it("formats static member access (::) without spaces", async () => {
        const script = "[System.IO.Path] :: PathSeparator";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("[System.IO.Path]::PathSeparator");
    });

    it("formats named parameter colons without spaces", async () => {
        const script = "Get-Module -Name : $ModuleName";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("Get-Module -Name:$ModuleName");
    });

    it("formats splatting (@) without spaces", async () => {
        const script = "Add-Profile @ profileArguments";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("Add-Profile @profileArguments");
    });

    it("formats logical operators with space before parenthesis", async () => {
        const script = "if (-not(Test-Path $path)) { }";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result).toContain("-not (Test-Path $path)");
    });

    it("formats -and operator with space before parenthesis", async () => {
        const script = "if ($a -and($b)) { }";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result).toContain("-and ($b)");
    });

    it("formats -or operator with space before parenthesis", async () => {
        const script = "if ($a -or($b)) { }";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
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
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
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
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("$h = ($Hue % 1) * 6");
    });

    it("formats cmdlets before parentheses with space", async () => {
        const script = "Write-Host($message)";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("Write-Host ($message)");
    });

    it("formats method calls without space before parenthesis", async () => {
        const script = "$obj.ContainsKey ($key)";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("$obj.ContainsKey($key)");
    });

    it("formats static method calls without space", async () => {
        const script = "[Math]:: Round ($value)";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("[Math]::Round($value)");
    });

    it("formats hexadecimal numbers correctly", async () => {
        const script = "$mode.Value = 0x0004";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("$mode.Value = 0x0004");
    });

    it("formats various hex number formats", async () => {
        const script = `
$a = 0x00
$b = 0xFF
$c = 0xDEADBEEF
$d = 0X1234
`;
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result).toContain("0x00");
        expect(result).toContain("0xFF");
        expect(result).toContain("0xDEADBEEF");
        expect(result).toContain("0X1234");
    });

    it("formats binary literals correctly", async () => {
        const script = "$binary = 0b1010";
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result.trim()).toBe("$binary = 0b1010");
    });

    it("formats multiplier suffixes correctly", async () => {
        const script = `
$kb = 10KB
$mb = 5MB
$gb = 2GB
$tb = 1TB
$pb = 1PB
`;
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result).toContain("10KB");
        expect(result).toContain("5MB");
        expect(result).toContain("2GB");
        expect(result).toContain("1TB");
        expect(result).toContain("1PB");
    });

    it("formats scientific notation correctly", async () => {
        const script = `
$a = 1e10
$b = 1e-5
$c = 1.5e10
$d = 2.5E-3
`;
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result).toContain("1e10");
        expect(result).toContain("1e-5");
        expect(result).toContain("1.5e10");
        expect(result).toContain("2.5E-3");
    });

    it("formats type suffixes correctly", async () => {
        const script = `
$long = 100L
$longLower = 200l
$decimal = 1.5d
$decimalUpper = 2.5D
$float = 1.5f
$floatUpper = 2.5F
`;
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result).toContain("100L");
        expect(result).toContain("200l");
        expect(result).toContain("1.5d");
        expect(result).toContain("2.5D");
        expect(result).toContain("1.5f");
        expect(result).toContain("2.5F");
    });

    it("formats combined number features correctly", async () => {
        const script = `
$hexLong = 0x10L
$hexWithSuffix = 0xFFMB
$scientificFloat = 1.5e10f
`;
        const result = await formatAndAssert(script, baseConfig, "formatting-edge-cases.result");
        expect(result).toContain("0x10L");
        expect(result).toContain("0xFFMB");
        expect(result).toContain("1.5e10f");
    });
});
