import { readFile } from "node:fs/promises";
import { URL } from "node:url";

import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";

import { formatAndAssert } from "./utils/format-and-assert.js";



const baseConfig = {
    parser: "powershell",
    plugins: [plugin],
    filepath: "test.ps1",
};

const normalize = (text: string) => text.replace(/\r\n/g, "\n");

describe("PowerShell Prettier plugin", () => {
    it("formats the sample fixture as expected", async () => {
        const input = await readFile(
            new URL("./fixtures/sample-unformatted.ps1", import.meta.url),
            "utf8"
        );
        const expected = `function Get-Widget {
  param(
    [string] $Name,
    [int] $Count
  )

  $items = Get-Item
    | Where-Object {
      $_.Name -eq $Name
    }
    | Select-Object Name, Length
  $hash = @{ b = 2; a = 1 }
  $lines = @"
line1
 line2
"@
  return $items
}
`;

        const result = await formatAndAssert(input, baseConfig, "plugin.result");
        expect(normalize(result)).toBe(normalize(expected));
    });

    it("is idempotent on formatted output", async () => {
        const formatted = await readFile(
            new URL("./fixtures/sample-formatted.ps1", import.meta.url),
            "utf8"
        );

        const once = await formatAndAssert(formatted, baseConfig, "plugin.once");
        const twice = await formatAndAssert(once, baseConfig, "plugin.twice");
        expect(twice).toBe(once);
    });

    it("respects custom indentation size", async () => {
        const input = `function Test {
param(
[string] $Name
)
if ($true) {
Write-Host "Hello"
}
}`;

        const result = await formatAndAssert(input, {
            ...baseConfig,
            powershellIndentSize: 4,
        }, "plugin.result");
        const lines = normalize(result).trimEnd().split("\n");
        expect(lines[0]).toBe("function Test {");
        expect(lines[1]).toMatch(/^ {4}param\($/);
        expect(lines[2]).toMatch(/^ {8}\[string\] \$Name$/);
        expect(lines[3]).toBe("    )");
        expect(lines[4]).toBe("");
        expect(lines[5]).toBe("    if ($true) {");
        expect(lines[6]).toBe('        Write-Host "Hello"');
        expect(lines[7]).toBe("    }");
        expect(lines[8]).toBe("}");
    });

    it("sorts hashtable keys when enabled", async () => {
        const input = `@{ z = 1; a = 2; m = 3 }`;
        const result = await formatAndAssert(input, {
            ...baseConfig,
            powershellSortHashtableKeys: true,
        }, "plugin.result");
        expect(result.trim()).toBe(`@{ a = 2; m = 3; z = 1 }`);
    });

    it("expands compact param lists and inserts a blank line after param blocks", async () => {
        const input = `function Foo {
param([string] $Name, [int] $Count)
Write-Host $Name
}`;

        const result = await formatAndAssert(input, baseConfig, "plugin.result");
        const expected = `function Foo {
  param(
    [string] $Name,
    [int] $Count
  )

  Write-Host $Name
}`;

        expect(result.trim()).toBe(expected);
    });

    it("honors the blank-line-after-param option when disabled", async () => {
        const input = `function Foo {
param([string] $Name, [int] $Count)
Write-Host $Name
}`;

        const result = await formatAndAssert(input, {
            ...baseConfig,
            powershellBlankLineAfterParam: false,
        }, "plugin.result");
        const expected = `function Foo {
  param(
    [string] $Name,
    [int] $Count
  )
  Write-Host $Name
}`;

        expect(result.trim()).toBe(expected);
    });

    it("keeps statements following here-strings aligned to the enclosing block", async () => {
        const input = `function Foo {
$here = @"
line
"@
return $here
}`;

        const result = await formatAndAssert(input, baseConfig, "plugin.result");
        expect(result).toContain(`\n  return $here\n`);
    });

    it("places opening braces according to the configured brace style", async () => {
        const input = `function Foo {
Write-Host "Hi"
}`;

        const defaultResult = await formatAndAssert(input, baseConfig, "plugin.defaultResult");
        const allmanResult = await formatAndAssert(input, {
            ...baseConfig,
            powershellBraceStyle: "allman",
        }, "plugin.allmanResult");
        expect(defaultResult.trim()).toBe(`function Foo {
  Write-Host "Hi"
}`);

        expect(allmanResult.trim()).toBe(`function Foo
{
  Write-Host "Hi"
}`);
    });

    it("applies trailing delimiter rules for hashtables only (arrays don't support trailing commas)", async () => {
        const arrayInput = `@(
1,
2
)`;
        const hashInput = `@{
a = 1
b = 2
}`;

        const arrayResult = await formatAndAssert(arrayInput, {
            ...baseConfig,
            powershellTrailingComma: "all",
        }, "plugin.arrayResult");
        const hashResult = await formatAndAssert(hashInput, {
            ...baseConfig,
            powershellTrailingComma: "all",
        }, "plugin.hashResult");
        // Arrays should NEVER have trailing commas (PowerShell doesn't support this)
        expect(arrayResult).not.toMatch(new RegExp(",\\s*\\)"));
        // Hashtables CAN have trailing semicolons
        expect(hashResult).toMatch(new RegExp(";\\s*\\}"));
    });

    it("wraps pipelines when exceeding the configured line width", async () => {
        const input = `$items = Get-Process | Where-Object { $_.CPU -gt 0 } | Select-Object -First 5`;

        const result = await formatAndAssert(input, {
            ...baseConfig,
            powershellLineWidth: 60,
        }, "plugin.result");
        expect(result).toContain("|");
        expect(
            result.split("\n").some((line) => line.trimStart().startsWith("|"))
        ).toBe(true);
    });

    it("prefers single quotes for simple strings when enabled", async () => {
        const input = `Write-Host "Hello"`;

        const result = await formatAndAssert(input, {
            ...baseConfig,
            powershellPreferSingleQuote: true,
        }, "plugin.result");
        expect(result.trim()).toBe("Write-Host 'Hello'");
    });

    it("rewrites common aliases when enabled", async () => {
        const input = `ls | % { $_.Name }`;

        const result = await formatAndAssert(input, {
            ...baseConfig,
            powershellRewriteAliases: true,
        }, "plugin.result");
        expect(result).toContain("Get-ChildItem");
        expect(result).toContain("ForEach-Object");
    });

    it("rewrites Write-Host when configured", async () => {
        const input = `Write-Host $Message`;

        const result = await formatAndAssert(input, {
            ...baseConfig,
            powershellRewriteWriteHost: true,
        }, "plugin.result");
        expect(result.trim()).toBe("Write-Output $Message");
    });

    it("removes explicit backtick line continuations", async () => {
        const input =
            `$value = 1
Write-Host ` +
            "`" +
            `
$value`;

        const result = await formatAndAssert(input, baseConfig, "plugin.result");
        expect(result).not.toContain("`");
        expect(
            result
                .split("\n")
                .some((line) => line.trim() === "Write-Host $value")
        ).toBe(true);
    });

    it("normalises keyword casing when requested", async () => {
        const input = `FUNCTION Foo {
IF ($true) {
Write-Output "hi"
}
}`;

        const result = await formatAndAssert(input, {
            ...baseConfig,
            powershellKeywordCase: "lower",
        }, "plugin.result");
        const lines = result.split("\n");
        expect(lines[0]).toBe("function Foo {");
        expect(lines[1].trim()).toBe("if ($true) {");
    });

    it("normalises whitespace and removes trailing semicolons", async () => {
        const input = `Write-Host  $value ;`;

        const result = await formatAndAssert(input, baseConfig, "plugin.result");
        expect(result.trim()).toBe("Write-Host $value");
    });

    it("preserves block comments, attributes, and double-dash arguments", async () => {
        const input = `<#
.SYNOPSIS
  Example script
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [Alias('Name')]
    [string]$Value
)

begin {
    node --version 2>$null
    # begin block
}
`;

        const expected = `<#
.SYNOPSIS
  Example script
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [Alias('Name')]
  [string] $Value
)

begin {
  node --version 2>$null
  # begin block
}
`;

        const result = await formatAndAssert(input, baseConfig, "plugin.result");
        expect(normalize(result)).toBe(normalize(expected));
    });
});
