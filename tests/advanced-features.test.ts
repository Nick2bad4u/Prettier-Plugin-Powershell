
import { describe, expect, it } from "vitest";
import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Advanced PowerShell Features", () => {
    describe("Expandable Strings", () => {
        it("formats expandable strings with subexpressions", async () => {
            const input = `$message = "Today is $(Get-Date -Format yyyy-MM-dd)"`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('$(Get-Date -Format yyyy-MM-dd)');
        });

        it("formats expandable strings with variables", async () => {
            const input = `$text = "User: $env:USERNAME on $env:COMPUTERNAME"`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('$env:USERNAME');
            expect(result).toContain('$env:COMPUTERNAME');
        });

        it("formats expandable strings with complex expressions", async () => {
            const input = `$msg = "Count: $(Get-Process | Measure-Object | Select-Object -ExpandProperty Count)"`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('$(Get-Process');
        });
    });

    describe("Here-Strings", () => {
        it("formats double-quoted here-strings", async () => {
            const input = `$text = @"\nLine 1\nLine 2\n"@`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('@"');
            expect(result).toContain('"@');
        });

        it("formats single-quoted here-strings", async () => {
            const input = `$text = @'\nLine 1\nLine 2\n'@`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain("@'");
            expect(result).toContain("'@");
        });

        it("preserves content in here-strings", async () => {
            const input = `$text = @"\nSpecial chars: \`n\`t\`r\n"@`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toBeTruthy();
        });
    });

    describe("Script Blocks with Param", () => {
        it("formats script blocks with param in pipelines", async () => {
            const input = `Get-Process | ForEach-Object { param($p) Write-Output $p.Name }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('param($p)');
        });

        it("formats script blocks with multiple parameters", async () => {
            const input = `1..10 | ForEach-Object { param($x, $y) $x + $y }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('param');
        });
    });

    describe("Class Definitions", () => {
        it("formats simple class definitions", async () => {
            const input = `class Person { [string]$Name; [int]$Age }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('class Person');
            expect(result).toContain('[string]');
            expect(result).toContain('$Name');
        });

        it("formats class with constructor", async () => {
            const input = `class Person { [string]$Name; Person([string]$n) { $this.Name = $n } }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('Person');
            expect(result).toContain('$this.Name');
        });

        it("formats class with methods", async () => {
            const input = `class Calculator { [int]Add([int]$a, [int]$b) { return $a + $b } }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('Add');
            expect(result).toContain('return');
        });
    });

    describe("Enum Definitions", () => {
        it("formats simple enum", async () => {
            const input = `enum Status { Running; Stopped; Paused }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('enum Status');
            expect(result).toContain('Running');
            expect(result).toContain('Stopped');
        });

        it("formats enum with explicit values", async () => {
            const input = `enum Level { Low = 1; Medium = 5; High = 10 }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('Low');
            expect(result).toContain('Medium');
            expect(result).toContain('High');
        });
    });

    describe("Attributes", () => {
        it("formats function with CmdletBinding attribute", async () => {
            const input = `function Test { [CmdletBinding()] param([string]$Name) }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('[CmdletBinding()]');
        });

        it("formats parameters with attributes", async () => {
            const input = `function Test { param([Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$Name) }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('[Parameter(Mandatory=$true)]');
            expect(result).toContain('[ValidateNotNullOrEmpty()]');
        });

        it("formats multiple attributes on parameters", async () => {
            const input = `function Test { param([Parameter()][ValidateSet('A','B','C')][string]$Choice) }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('[ValidateSet');
        });
    });

    describe("DSC and Workflow", () => {
        it("formats configuration blocks", async () => {
            const input = `configuration WebServer { Node localhost { WindowsFeature IIS { Name = "Web-Server" } } }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('configuration');
        });

        it("formats workflow blocks", async () => {
            const input = `workflow Test-Workflow { Write-Output "In workflow" }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('workflow');
        });

        it("formats parallel blocks in workflows", async () => {
            const input = `workflow Test { parallel { Get-Process; Get-Service } }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('parallel');
        });

        it("formats sequence blocks", async () => {
            const input = `workflow Test { sequence { $a = 1; $b = 2 } }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('sequence');
        });

        it("formats inlinescript blocks", async () => {
            const input = `workflow Test { inlinescript { Get-Date } }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('inlinescript');
        });
    });

    describe("Command Parameters", () => {
        it("formats short parameters", async () => {
            const input = `Get-Process -Name powershell -Id 1234`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('-Name');
            expect(result).toContain('-Id');
        });

        it("formats long parameters", async () => {
            const input = `dotnet --version --list-sdks`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('--version');
            expect(result).toContain('--list-sdks');
        });

        it("preserves parameter values", async () => {
            const input = `Get-ChildItem -Path "C:\\Windows" -Filter "*.log" -Recurse`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('-Path');
            expect(result).toContain('-Filter');
            expect(result).toContain('-Recurse');
        });
    });

    describe("Advanced Formatting", () => {
        it("formats long pipeline chains", async () => {
            const input = `Get-Process | Where-Object { $_.CPU -gt 10 } | Select-Object Name, CPU | Sort-Object CPU -Descending | Format-Table -AutoSize`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('Get-Process');
            expect(result).toContain('Format-Table');
        });

        it("formats nested hashtables", async () => {
            const input = `$data = @{ Server = @{ Name = "srv1"; Port = 8080 }; Client = @{ Name = "client1" } }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('Server');
            expect(result).toContain('Client');
        });

        it("formats splatting correctly", async () => {
            const input = `$params = @{ Name = "test" }; Get-Process @params`;
            const result = await formatAndAssert(input, baseConfig, "advanced-features.result");
            expect(result).toContain('@params');
        });
    });
});
