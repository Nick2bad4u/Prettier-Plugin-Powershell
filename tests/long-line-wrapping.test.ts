import prettier from "prettier";
import { describe, expect, it } from "vitest";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Long Line Wrapping Improvements", () => {
    describe("Long Pipeline Chains", () => {
        it("breaks long pipelines with 4+ segments", async () => {
            const input = `Get-Process | Where-Object { $_.CPU -gt 10 } | Select-Object Name, CPU | Sort-Object CPU -Descending | Format-Table`;
            const result = await prettier.format(input, baseConfig);

            // Should have line breaks
            const lineCount = result.trim().split("\n").length;
            expect(lineCount).toBeGreaterThan(1);
            expect(result).toContain("|");
        });

        it("keeps short pipelines on one line", async () => {
            const input = `Get-Process | Select-Object Name`;
            const result = await prettier.format(input, baseConfig);

            // Short pipeline can stay on one line
            expect(result.trim().split("\n").length).toBeLessThanOrEqual(2);
        });

        it("handles very long pipeline chains gracefully", async () => {
            const input = `Get-ChildItem | Where-Object { $_.Length -gt 1MB } | Select-Object Name, Length, LastWriteTime | Sort-Object Length -Descending | Select-Object -First 10 | ForEach-Object { Write-Output $_.Name } | Out-String | Write-Host`;
            const result = await prettier.format(input, baseConfig);

            // Should format without errors
            expect(result).toBeTruthy();
            expect(result).toContain("|");

            // Should break into multiple lines
            const lineCount = result.trim().split("\n").length;
            expect(lineCount).toBeGreaterThan(3);
        });

        it("handles pipelines with script blocks", async () => {
            const input = `Get-Process | Where-Object { $_.WorkingSet -gt 100MB -and $_.Name -like "*chrome*" -or $_.Name -like "*firefox*" } | ForEach-Object { Write-Output "Process: $($_.Name), Memory: $($_.WorkingSet / 1MB) MB" }`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("Get-Process");
        });
    });

    describe("Long Script Block One-Liners", () => {
        it("formats long Where-Object blocks", async () => {
            const input = `Get-Process | Where-Object { $_.Name -like "*chrome*" -and $_.CPU -gt 100 -and $_.WorkingSet -gt 100MB -or $_.HandleCount -gt 1000 }`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("Where-Object");
        });

        it("formats long ForEach-Object blocks", async () => {
            const input = `1..100 | ForEach-Object { $value = $_ * 2; $squared = $value * $value; Write-Output "Value: $value, Squared: $squared" }`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("ForEach-Object");
        });

        it("handles nested script blocks in pipelines", async () => {
            const input = `Get-ChildItem | Where-Object { $_.Name -match "test" } | ForEach-Object { Get-Content $_.FullName | Where-Object { $_ -match "error" } }`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("Get-ChildItem");
        });
    });

    describe("Long Parameter Lists", () => {
        it("handles cmdlets with many parameters", async () => {
            const input = `Get-ChildItem -Path "C:\\Windows" -Filter "*.log" -Recurse -ErrorAction SilentlyContinue -Force -File -Attributes Hidden, System -Exclude "temp*", "cache*"`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("Get-ChildItem");
        });

        it("formats function declarations with many parameters", async () => {
            const input = `function Test-Function { param([string]$Param1, [string]$Param2, [int]$Param3, [bool]$Param4, [datetime]$Param5, [hashtable]$Param6, [array]$Param7, [scriptblock]$Param8) }`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("Test-Function");
        });
    });

    describe("Long Expressions", () => {
        it("handles long conditional expressions", async () => {
            const input = `if ($value -gt 10 -and $name -like "*test*" -and $status -eq "active" -and $count -lt 100 -or $forceOverride -eq $true) { Write-Output "matched" }`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("if");
        });

        it("handles long string concatenations", async () => {
            const input = `$message = "This is a very long message that contains " + $variable1 + " and also includes " + $variable2 + " plus some more text " + $variable3`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("$message");
        });

        it("handles long hashtable definitions", async () => {
            const input = `$config = @{ ServerName = "localhost"; Port = 8080; Database = "mydb"; Username = "admin"; Password = "secret"; ConnectionTimeout = 30; CommandTimeout = 300; EnableRetry = $true }`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("$config");
        });
    });

    describe("Edge Cases", () => {
        it("handles extremely long single-line scripts (>500 chars)", async () => {
            const longScript = `Get-Process | Where-Object { $_.CPU -gt 10 } | ForEach-Object { $name = $_.Name; $cpu = $_.CPU; $mem = $_.WorkingSet; Write-Output "Process: $name, CPU: $cpu, Memory: $mem" } | Out-String | Tee-Object -FilePath "output.log" | Write-Host -ForegroundColor Green | Out-Null`;

            const result = await prettier.format(longScript, baseConfig);

            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(100);
        });

        it("preserves comment positions during wrapping", async () => {
            const input = `Get-Process | Where-Object CPU | Select-Object Name # Get top processes`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("#");
        });

        it("handles mixed operators in long expressions", async () => {
            const input = `$result = $value1 + $value2 * $value3 - $value4 / $value5 -band $value6 -bor $value7 -shl 2`;
            const result = await prettier.format(input, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("$result");
        });
    });

    describe("Performance on Long Lines", () => {
        it("formats 1000-character line in reasonable time", async () => {
            const longLine =
                "Get-Process" +
                " | Where-Object { $_.Name -like '*test*' }".repeat(20);

            const start = Date.now();
            const result = await prettier.format(longLine, baseConfig);
            const duration = Date.now() - start;

            expect(result).toBeTruthy();
            expect(duration).toBeLessThan(500); // Should take less than 500ms
        });

        it("handles deeply nested expressions", async () => {
            const nested = `$result = (((($a + $b) * $c) / $d) - $e)`;
            const result = await prettier.format(nested, baseConfig);

            expect(result).toBeTruthy();
            expect(result).toContain("$result");
        });
    });
});
