import prettier from "prettier";
import { describe, expect, it } from "vitest";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Advanced Formatting Features", () => {
    describe("Switch Statement Formatting", () => {
        it("formats simple switch statements", async () => {
            const input = `switch ($value) { 1 { "one" } 2 { "two" } default { "other" } }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("switch");
            expect(result).toContain("default");
        });

        it("formats switch with complex conditions", async () => {
            const input = `switch -Regex ($text) { "^test" { "starts with test" } "end$" { "ends with end" } default { "no match" } }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("-Regex");
        });

        it("formats switch with file parameter", async () => {
            const input = `switch -File "data.txt" { "pattern1" { "found" } }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("-File");
        });
    });

    describe("Assignment Operator Alignment", () => {
        it("formats multiple assignments", async () => {
            const input = `$short = 1\n$veryLongVariableName = 2\n$x = 3`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("$short = 1");
            expect(result).toContain("$veryLongVariableName = 2");
        });

        it("formats hashtable assignments", async () => {
            const input = `$hash = @{ Key = "value"; LongKey = "longvalue"; K = "v" }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
        });
    });

    describe("PowerShell Classes with Inheritance", () => {
        it("formats class with base class", async () => {
            const input = `class Dog : Animal { [string]$Breed; Dog([string]$name, [string]$breed) : base($name) { $this.Breed = $breed } }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("class Dog");
            expect(result).toContain("Animal");
        });

        it("formats class with interface implementation", async () => {
            const input = `class MyClass : IDisposable { [void] Dispose() { } }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("IDisposable");
        });

        it("formats class with static members", async () => {
            const input = `class Config { static [string]$AppName = "MyApp"; static [void] Reset() { } }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("static");
        });
    });

    describe(".NET Type Literals", () => {
        it("formats simple .NET types", async () => {
            const input = `[System.IO.Path]::Combine("path1", "path2")`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("[System.IO.Path]");
        });

        it("formats generic .NET types", async () => {
            const input = `[System.Collections.Generic.List[string]]::new()`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("List[string]");
        });

        it("formats complex .NET type references", async () => {
            const input = `$list = [System.Collections.Generic.Dictionary[string, System.Collections.Generic.List[int]]]::new()`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("Dictionary");
        });
    });

    describe("Long Parameter Lists", () => {
        it("formats function with many parameters", async () => {
            const input = `function Test { param([string]$Param1, [string]$Param2, [string]$Param3, [string]$Param4, [string]$Param5) }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("$Param1");
            expect(result).toContain("$Param5");
        });

        it("formats cmdlet call with many parameters", async () => {
            const input = `Get-Something -Name "test" -Path "path" -Filter "*.ps1" -Recurse -Force -ErrorAction Stop -Verbose -Debug`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("-Name");
            expect(result).toContain("-Debug");
        });
    });

    describe("Comment-Based Help", () => {
        it("formats synopsis comment", async () => {
            const input = `function Test {\n<#\n.SYNOPSIS\nTest function\n#>\n}`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain(".SYNOPSIS");
        });

        it("formats full help block", async () => {
            const input = `<#\n.SYNOPSIS\nShort description\n.DESCRIPTION\nLong description\n.PARAMETER Name\nParameter description\n.EXAMPLE\nExample usage\n#>\nfunction Test { param($Name) }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain(".SYNOPSIS");
            expect(result).toContain(".EXAMPLE");
        });
    });

    describe("Regex Pattern Formatting", () => {
        it("formats simple regex patterns", async () => {
            const input = `if ($text -match "^\\d{3}-\\d{2}-\\d{4}$") { }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("-match");
        });

        it("formats complex regex with groups", async () => {
            const input = `$pattern = "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})"`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("year");
        });
    });

    describe("Embedded Content", () => {
        it("handles here-strings with JSON", async () => {
            const input = `$json = @"\n{"name": "test", "value": 123}\n"@`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("@\"");
        });

        it("handles here-strings with XML", async () => {
            const input = `$xml = @"\n<root>\n  <item>value</item>\n</root>\n"@`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("root");
        });

        it("handles here-strings with SQL", async () => {
            const input = `$sql = @"\nSELECT * FROM Users WHERE Active = 1\n"@`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("SELECT");
        });
    });

    describe("Dynamic Parameters", () => {
        it("formats function with DynamicParam block", async () => {
            const input = `function Test { DynamicParam { $dict = [System.Management.Automation.RuntimeDefinedParameterDictionary]::new(); return $dict } process { } }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("DynamicParam");
        });
    });

    describe("Advanced Pipeline Scenarios", () => {
        it("formats pipeline with begin/process/end", async () => {
            const input = `Get-ChildItem | ForEach-Object { begin { $count = 0 } process { $count++ } end { Write-Output $count } }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("begin");
            expect(result).toContain("process");
            expect(result).toContain("end");
        });

        it("formats complex pipeline with multiple stages", async () => {
            const input = `Get-Process | Where-Object CPU | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table Name, CPU, WorkingSet`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("Get-Process");
            expect(result).toContain("Format-Table");
        });
    });

    describe("Advanced Operators", () => {
        it("formats ternary operator", async () => {
            const input = `$result = $value ? "true" : "false"`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("?");
            expect(result).toContain(":");
        });

        it("formats null-coalescing operator", async () => {
            const input = `$value = $input ?? "default"`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("??");
        });

        it("formats range operator", async () => {
            const input = `1..10 | ForEach-Object { $_ * 2 }`;
            const result = await prettier.format(input, baseConfig);
            expect(result).toBeTruthy();
            expect(result).toContain("..");
        });
    });
});
