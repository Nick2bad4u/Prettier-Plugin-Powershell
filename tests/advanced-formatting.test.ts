import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("advanced Formatting Features", () => {
    describe("switch Statement Formatting", () => {
        it("formats simple switch statements", async () => {
            expect.hasAssertions();

            const input = `switch ($value) { 1 { "one" } 2 { "two" } default { "other" } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("switch");
            expect(result).toContain("default");
        });

        it("formats switch with complex conditions", async () => {
            expect.hasAssertions();

            const input = `switch -Regex ($text) { "^test" { "starts with test" } "end$" { "ends with end" } default { "no match" } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("-Regex");
        });

        it("formats switch with file parameter", async () => {
            expect.hasAssertions();

            const input = `switch -File "data.txt" { "pattern1" { "found" } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("-File");
        });
    });

    describe("assignment Operator Alignment", () => {
        it("formats multiple assignments", async () => {
            expect.hasAssertions();

            const input = `$short = 1\n$veryLongVariableName = 2\n$x = 3`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("$short = 1");
            expect(result).toContain("$veryLongVariableName = 2");
        });

        it("formats hashtable assignments", async () => {
            expect.hasAssertions();

            const input = `$hash = @{ Key = "value"; LongKey = "longvalue"; K = "v" }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
        });
    });

    describe("classes with inheritance", () => {
        it("formats class with base class", async () => {
            expect.hasAssertions();

            const input = `class Animal { [string]$Name; Animal([string]$name) { $this.Name = $name } }
class Dog : Animal { [string]$Breed; Dog([string]$name, [string]$breed) : base($name) { $this.Breed = $breed } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("class Dog");
            expect(result).toContain("Animal");
        });

        it("formats class with interface implementation", async () => {
            expect.hasAssertions();

            const input = `class MyClass : IDisposable { [void] Dispose() { } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("IDisposable");
        });

        it("formats class with static members", async () => {
            expect.hasAssertions();

            const input = `class Config { static [string]$AppName = "MyApp"; static [void] Reset() { } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("static");
        });
    });

    describe(".NET Type Literals", () => {
        it("formats simple .NET types", async () => {
            expect.hasAssertions();

            const input = `[System.IO.Path]::Combine("path1", "path2")`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("[System.IO.Path]");
        });

        it("formats generic .NET types", async () => {
            expect.hasAssertions();

            const input = `[System.Collections.Generic.List[string]]::new()`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("List[string]");
        });

        it("formats complex .NET type references", async () => {
            expect.hasAssertions();

            const input = `$list = [System.Collections.Generic.Dictionary[string, System.Collections.Generic.List[int]]]::new()`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("Dictionary");
        });
    });

    describe("long Parameter Lists", () => {
        it("formats function with many parameters", async () => {
            expect.hasAssertions();

            const input = `function Test { param([string]$Param1, [string]$Param2, [string]$Param3, [string]$Param4, [string]$Param5) }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("$Param1");
            expect(result).toContain("$Param5");
        });

        it("formats cmdlet call with many parameters", async () => {
            expect.hasAssertions();

            const input = `Get-Something -Name "test" -Path "path" -Filter "*.ps1" -Recurse -Force -ErrorAction Stop -Verbose -Debug`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("-Name");
            expect(result).toContain("-Debug");
        });
    });

    describe("comment-Based Help", () => {
        it("formats synopsis comment", async () => {
            expect.hasAssertions();

            const input = `function Test {\n<#\n.SYNOPSIS\nTest function\n#>\n}`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain(".SYNOPSIS");
        });

        it("formats full help block", async () => {
            expect.hasAssertions();

            const input = `<#\n.SYNOPSIS\nShort description\n.DESCRIPTION\nLong description\n.PARAMETER Name\nParameter description\n.EXAMPLE\nExample usage\n#>\nfunction Test { param($Name) }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain(".SYNOPSIS");
            expect(result).toContain(".EXAMPLE");
        });
    });

    describe("regex Pattern Formatting", () => {
        it("formats simple regex patterns", async () => {
            expect.hasAssertions();

            const input = String.raw`if ($text -match "^\d{3}-\d{2}-\d{4}$") { }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("-match");
        });

        it("formats complex regex with groups", async () => {
            expect.hasAssertions();

            const input = String.raw`$pattern = "(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("year");
        });
    });

    describe("embedded Content", () => {
        it("handles here-strings with JSON", async () => {
            expect.hasAssertions();

            const input = `$json = @"\n{"name": "test", "value": 123}\n"@`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain('@"');
        });

        it("handles here-strings with XML", async () => {
            expect.hasAssertions();

            const input = `$xml = @"\n<root>\n  <item>value</item>\n</root>\n"@`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("root");
        });

        it("handles here-strings with SQL", async () => {
            expect.hasAssertions();

            const input = `$sql = @"\nSELECT * FROM Users WHERE Active = 1\n"@`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("SELECT");
        });
    });

    describe("dynamic Parameters", () => {
        it("formats function with DynamicParam block", async () => {
            expect.hasAssertions();

            const input = `function Test { DynamicParam { $dict = [System.Management.Automation.RuntimeDefinedParameterDictionary]::new(); return $dict } process { } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result.toLowerCase()).toContain("dynamicparam");
        });
    });

    describe("advanced Pipeline Scenarios", () => {
        it("formats pipeline with begin/process/end", async () => {
            expect.hasAssertions();

            const input = `Get-ChildItem | ForEach-Object { begin { $count = 0 } process { $count++ } end { Write-Output $count } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("begin");
            expect(result).toContain("process");
            expect(result).toContain("end");
        });

        it("formats complex pipeline with multiple stages", async () => {
            expect.hasAssertions();

            const input = `Get-Process | Where-Object CPU | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table Name, CPU, WorkingSet`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("Get-Process");
            expect(result).toContain("Format-Table");
        });
    });

    describe("advanced Operators", () => {
        it("formats ternary operator", async () => {
            expect.hasAssertions();

            const input = `$result = $value ? "true" : "false"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("?");
            expect(result).toContain(":");
        });

        it("formats null-coalescing operator", async () => {
            expect.hasAssertions();

            const input = `$value = $input ?? "default"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("??");
        });

        it("formats range operator", async () => {
            expect.hasAssertions();

            const input = `1..10 | ForEach-Object { $_ * 2 }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "advanced-formatting.result"
            );

            expect(result).toBeTruthy();
            expect(result).toContain("..");
        });
    });
});
