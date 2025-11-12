
import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Advanced Printer Features", () => {
    describe("Multi-line Condition Alignment", () => {
        it("handles multi-line if conditions", async () => {
            const input = `if ($value -gt 10 -and $name -like "*test*" -or $status -eq "active") { Write-Output "matched" }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
            expect(result).toContain("-gt");
            expect(result).toContain("-like");
            expect(result).toContain("-eq");
        });

        it("handles complex nested conditions", async () => {
            const input = `if (($x -gt 5 -and $y -lt 10) -or ($z -eq 0 -and $w -ne 100)) { $true }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
            expect(result).toContain("-gt");
            expect(result).toContain("-eq");
        });

        it("handles where-object with conditions", async () => {
            const input = `Get-Process | Where-Object { $_.CPU -gt 10 -and $_.WorkingSet -gt 1MB -or $_.Name -like "*chrome*" }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
            expect(result).toContain("-gt");
            expect(result).toContain("-like");
        });
    });

    describe("Error Recovery", () => {
        it("recovers from unclosed braces", async () => {
            const input = `function Test { Write-Output "test"`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
            expect(result).toContain("function Test");
        });

        it("recovers from unclosed parentheses", async () => {
            const input = `$result = (Get-Process | Select-Object Name`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
        });

        it("recovers from unclosed strings", async () => {
            const input = `$text = "incomplete string`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
        });

        it("handles mixed valid and invalid syntax", async () => {
            const input = `$valid = 1\nif ($broken { \n$alsoValid = 2`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
            expect(result).toContain("$valid = 1");
            expect(result).toContain("$alsoValid = 2");
        });

        it("recovers from malformed hashtables", async () => {
            const input = `$hash = @{ Key1 = "Value1"; Key2 =`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
        });
    });

    describe("Command Parameter Handling", () => {
        it("formats short parameters correctly", async () => {
            const input = `Get-Process -Name "powershell" -Id 1234`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toContain("-Name");
            expect(result).toContain("-Id");
        });

        it("formats long GNU-style parameters", async () => {
            const input = `docker run --name mycontainer --detach --publish 8080:80 nginx`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toContain("--name");
            expect(result).toContain("--detach");
            expect(result).toContain("--publish");
        });

        it("preserves mixed parameter styles", async () => {
            const input = `node script.js --verbose -p 3000 --config "config.json"`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toContain("--verbose");
            expect(result).toContain("-p");
            expect(result).toContain("--config");
        });

        it("handles parameters with values", async () => {
            const input = `Get-ChildItem -Path C:\\Windows -Filter *.log -Recurse -ErrorAction SilentlyContinue`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toContain("-Path");
            expect(result).toContain("-Filter");
            expect(result).toContain("-Recurse");
            expect(result).toContain("-ErrorAction");
        });
    });

    describe("Incremental Parsing Simulation", () => {
        it("handles very long scripts efficiently", async () => {
            // Generate a large script
            const functions = [];
            for (let i = 0; i < 50; i++) {
                functions.push(`function Test${i} { param($x) $x + ${i} }`);
            }
            const input = functions.join("\n");

            const start = Date.now();
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            const duration = Date.now() - start;

            expect(result).toBeTruthy();
            expect(duration).toBeLessThan(1000); // Should complete in under 1 second
        });

        it("handles deeply nested structures", async () => {
            const input = `$data = @{
                Level1 = @{
                    Level2 = @{
                        Level3 = @{
                            Level4 = @{
                                Level5 = "deep"
                            }
                        }
                    }
                }
            }`;
            const result = await formatAndAssert(input, baseConfig, "advanced-printer.result");
            expect(result).toBeTruthy();
            expect(result).toContain("deep");
        });
    });
});
