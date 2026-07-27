import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";
import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: [plugin],
};

describe("formatting edge cases", () => {
    it.each([
        {
            expected: "[System.IO.Path]::PathSeparator",
            name: "formats static member access (::) without spaces",
            script: "[System.IO.Path] :: PathSeparator",
        },
        {
            expected: "Get-Module -Name:$ModuleName",
            name: "formats named parameter colons without spaces",
            script: "Get-Module -Name : $ModuleName",
        },
        {
            expected: "Add-Profile @profileArguments",
            name: "formats splatting (@) without spaces",
            script: "Add-Profile @ profileArguments",
        },
        {
            expected: "$h = ($Hue % 1) * 6",
            name: "formats operators before parentheses with space",
            script: "$h =($Hue % 1) * 6",
        },
        {
            expected: "Write-Host ($message)",
            name: "formats cmdlets before parentheses with space",
            script: "Write-Host($message)",
        },
        {
            expected: "$obj.ContainsKey($key)",
            name: "formats method calls without space before parenthesis",
            script: "$obj.ContainsKey ($key)",
        },
        {
            expected: "[Math]::Round($value)",
            name: "formats static method calls without space",
            script: "[Math]:: Round ($value)",
        },
        {
            expected: "$mode.Value = 0x0004",
            name: "formats hexadecimal numbers correctly",
            script: "$mode.Value = 0x0004",
        },
        {
            expected: "$binary = 0b1010",
            name: "formats binary literals correctly",
            script: "$binary = 0b1010",
        },
    ])("$name", async ({ expected, script }) => {
        expect.hasAssertions();

        const result = await formatAndAssert(
            script,
            baseConfig,
            "formatting-edge-cases.result"
        );

        expect(result.trim()).toBe(expected);
    });

    it.each([
        {
            expected: "-not (Test-Path $path)",
            name: "formats logical operators with space before parenthesis",
            script: "if (-not(Test-Path $path)) { }",
        },
        {
            expected: "-and ($b)",
            name: "formats -and operator with space before parenthesis",
            script: "if ($a -and($b)) { }",
        },
        {
            expected: "-or ($b)",
            name: "formats -or operator with space before parenthesis",
            script: "if ($a -or($b)) { }",
        },
    ])("$name", async ({ expected, script }) => {
        expect.hasAssertions();

        const result = await formatAndAssert(
            script,
            baseConfig,
            "formatting-edge-cases.result"
        );

        expect(result).toContain(expected);
    });

    it("handles complex combinations correctly", async () => {
        expect.hasAssertions();

        const script = `
$separator = [System.IO.Path] :: PathSeparator
$paths = $env:PSModulePath -split [System.Text.RegularExpressions.Regex] :: Escape($separator)
$result = Get-Module -Name : $ModuleName
Add-Profile @ arguments
if (-not(Test-Path $path)) { }
`;
        const result = await formatAndAssert(
            script,
            baseConfig,
            "formatting-edge-cases.result"
        );

        expect(result).toContain("[System.IO.Path]::PathSeparator");
        expect(result).toContain(
            "[System.Text.RegularExpressions.Regex]::Escape"
        );
        expect(result).toContain("-Name:$ModuleName");
        expect(result).toContain("@arguments");
        expect(result).toContain("-not (Test-Path $path)");
        expect(result).not.toContain("[System.IO.Path] :: PathSeparator");
    });

    it("formats various hex number formats", async () => {
        expect.hasAssertions();

        const script = `
$a = 0x00
$b = 0xFF
$c = 0xDEADBEEF
$d = 0X1234
`;
        const result = await formatAndAssert(
            script,
            baseConfig,
            "formatting-edge-cases.result"
        );

        expect(result).toContain("0x00");
        expect(result).toContain("0xFF");
        expect(result).toContain("0xDEADBEEF");
        expect(result).toContain("0X1234");
    });

    it("formats multiplier suffixes correctly", async () => {
        expect.hasAssertions();

        const script = `
$kb = 10KB
$mb = 5MB
$gb = 2GB
$tb = 1TB
$pb = 1PB
`;
        const result = await formatAndAssert(
            script,
            baseConfig,
            "formatting-edge-cases.result"
        );

        expect(result).toContain("10KB");
        expect(result).toContain("5MB");
        expect(result).toContain("2GB");
        expect(result).toContain("1TB");
        expect(result).toContain("1PB");
    });

    it("formats scientific notation correctly", async () => {
        expect.hasAssertions();

        const script = `
$a = 1e10
$b = 1e-5
$c = 1.5e10
$d = 2.5E-3
`;
        const result = await formatAndAssert(
            script,
            baseConfig,
            "formatting-edge-cases.result"
        );

        expect(result).toContain("1e10");
        expect(result).toContain("1e-5");
        expect(result).toContain("1.5e10");
        expect(result).toContain("2.5E-3");
    });

    it("formats type suffixes correctly", async () => {
        expect.hasAssertions();

        const script = `
$long = 100L
$longLower = 200l
$decimal = 1.5d
$decimalUpper = 2.5D
$float = 1.5f
$floatUpper = 2.5F
`;
        const result = await formatAndAssert(
            script,
            baseConfig,
            "formatting-edge-cases.result"
        );

        expect(result).toContain("100L");
        expect(result).toContain("200l");
        expect(result).toContain("1.5d");
        expect(result).toContain("2.5D");
        expect(result).toContain("1.5f");
        expect(result).toContain("2.5F");
    });

    it("formats combined number features correctly", async () => {
        expect.hasAssertions();

        const script = `
$hexLong = 0x10L
$hexWithSuffix = 0xFFMB
$scientificFloat = 1.5e10f
`;
        const result = await formatAndAssert(
            script,
            baseConfig,
            "formatting-edge-cases.result"
        );

        expect(result).toContain("0x10L");
        expect(result).toContain("0xFFMB");
        expect(result).toContain("1.5e10f");
    });
});
