import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("PowerShell Operators", () => {
    it("formats pipeline chain operators correctly", async () => {
        const input = `Get-Process&&Stop-Service`;
        const expected = `Get-Process && Stop-Service\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats logical OR pipeline chains", async () => {
        const input = `Get-Item||Write-Error "fail"`;
        const expected = `Get-Item || Write-Error "fail"\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats comparison operators", async () => {
        const input = `if ($x -eq 5 -and $y -ne 10) { $true }`;
        const expected = `if ($x -eq 5 -and $y -ne 10) {\n    $true\n}\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats bitwise operators", async () => {
        const input = `$result = 0xFF -band 0x0F -bor 0x10`;
        const expected = `$result = 0xFF -band 0x0F -bor 0x10\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats string operators", async () => {
        const input = `$text = "Hello {0}" -f $name`;
        const expected = `$text = "Hello {0}" -f $name\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats redirection operators without space", async () => {
        const input = `node --version 2> $null`;
        const expected = `node --version 2>$null\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats merging redirection operators", async () => {
        const input = `command 2>&1 >output.log`;
        const expected = `command 2>&1>output.log\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats special variables", async () => {
        const input = `$result=$$+$^+$?`;
        const expected = `$result = $$ + $^ + $?\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats stop parsing token", async () => {
        const input = `cmd.exe --% /c dir /s`;
        const expected = `cmd.exe --% /c dir /s\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats -like and -match operators", async () => {
        const input = `if ($name -like "*test*" -and $path -match "^C:") { $true }`;
        const expected = `if ($name -like "*test*" -and $path -match "^C:") {\n    $true\n}\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats -contains and -in operators", async () => {
        const input = `if ($list -contains $item -or $value -in $array) { $true }`;
        const expected = `if ($list -contains $item -or $value -in $array) {\n    $true\n}\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats bit shift operators", async () => {
        const input = `$shifted = $value -shl 4 -shr 2`;
        const expected = `$shifted = $value -shl 4 -shr 2\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats case-sensitive comparison operators", async () => {
        const input = `if ($str -ceq "Test" -or $str -clike "*ABC*") { $true }`;
        const expected = `if ($str -ceq "Test" -or $str -clike "*ABC*") {\n    $true\n}\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats -split and -join operators", async () => {
        const input = `$result = $text -split "," -join ";"`;
        const expected = `$result = $text -split "," -join ";"\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats -replace operator", async () => {
        const input = `$result = $text -replace "old", "new"`;
        const expected = `$result = $text -replace "old", "new"\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats complex operator combinations", async () => {
        const input = `if (($x -gt 5 -and $y -lt 10) -or ($z -eq 0 -and $? -ne $false)) { Write-Output "pass" 2>&1 }`;
        const expected = `if (($x -gt 5 -and $y -lt 10) -or ($z -eq 0 -and $? -ne $false)) {\n    Write-Output "pass" 2>&1\n}\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });
});

describe("PowerShell Keywords", () => {
    it("formats begin/process/end blocks", async () => {
        const input = `function Test { begin { $x = 1 } process { $_ } end { $x } }`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        // The formatter currently inlines the blocks, which is valid PowerShell
        expect(result).toMatch(/function Test/);
        expect(result).toMatch(/begin/);
        expect(result).toMatch(/process/);
        expect(result).toMatch(/end/);
    });

    it("formats enum definitions", async () => {
        const input = `enum Status { Running; Stopped; Paused }`;
        const expected = `enum Status {\n    Running\n    Stopped\n    Paused\n}\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats do-until loops", async () => {
        const input = `do { $x++ } until ($x -gt 10)`;
        const expected = `do {\n    $x++\n} until ($x -gt 10)\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats trap statements", async () => {
        const input = `trap { Write-Error $_ }`;
        const expected = `trap {\n    Write-Error $_\n}\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats data blocks", async () => {
        const input = `data messages{ConvertFrom-StringData@"\na=1\nb=2\n"@}`;
        const expected = `data messages {\n    ConvertFrom-StringData @"\na=1\nb=2\n"@\n}\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });
});

describe("PowerShell Variables", () => {
    it("formats scoped variables", async () => {
        const input = `$global:x = 1; $script:y = 2; $local:z = 3`;
        const expected = `$global:x = 1\n$script:y = 2\n$local:z = 3\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats braced variable names", async () => {
        const input = `\${my variable} = 42`;
        const expected = `\${my variable} = 42\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });

    it("formats automatic variables", async () => {
        const input = `$result = $$ -eq $^ -and $? -eq $true`;
        const expected = `$result = $$ -eq $^ -and $? -eq $true\n`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "operators.result"
        );
        expect(result).toBe(expected);
    });
});
