
import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Deep Nesting and Complex Structure Handling", () => {
    describe("DSC Configuration Support", () => {
        it("handles basic DSC configuration", async () => {
            const input = `Configuration MyConfig { Node localhost { File MyFile { DestinationPath = "C:\\test.txt"; Contents = "test" } } }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("Configuration MyConfig");
            expect(result).toContain("Node localhost");
        });

        it("handles nested DSC resources", async () => {
            const input = `Configuration WebServer {
                Node "Server01" {
                    WindowsFeature IIS {
                        Ensure = "Present"
                        Name = "Web-Server"
                    }
                    WindowsFeature ASP {
                        Ensure = "Present"
                        Name = "Web-Asp-Net45"
                        DependsOn = "[WindowsFeature]IIS"
                    }
                }
            }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toContain("Configuration WebServer");
            expect(result).toContain("WindowsFeature IIS");
            expect(result).toContain("WindowsFeature ASP");
        });

        it("handles deeply nested DSC (5+ levels)", async () => {
            const input = `Configuration Complex {
                Node Server {
                    Registry RegKey {
                        Key = "HKLM:\\Software\\Test"
                        ValueName = "Setting"
                        Script ScriptBlock {
                            GetScript = { @{ Result = "value" } }
                            TestScript = { $true }
                            SetScript = { }
                        }
                    }
                }
            }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("Configuration Complex");
        });

        it("handles multiple nodes in DSC", async () => {
            const input = `Configuration MultiNode {
                Node "Server01", "Server02", "Server03" {
                    File TestFile {
                        DestinationPath = "C:\\test.txt"
                        Contents = "test"
                    }
                }
            }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toContain("MultiNode");
            expect(result).toContain("Server01");
        });
    });

    describe("Deep Hashtable Nesting", () => {
        it("handles 5-level nested hashtables", async () => {
            const input = `$config = @{
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
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("deep");
        });

        it("handles mixed deep nesting", async () => {
            const input = `$data = @{
                Users = @(
                    @{ Name = "Alice"; Settings = @{ Theme = "dark"; Font = @{ Size = 12 } } },
                    @{ Name = "Bob"; Settings = @{ Theme = "light"; Font = @{ Size = 14 } } }
                )
            }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("Alice");
            expect(result).toContain("Bob");
        });

        it("handles 10-level deep nesting", async () => {
            const input = `$deep = @{ L1 = @{ L2 = @{ L3 = @{ L4 = @{ L5 = @{ L6 = @{ L7 = @{ L8 = @{ L9 = @{ L10 = "bottom" } } } } } } } } } }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("bottom");
        });
    });

    describe("Deep Array Nesting", () => {
        it("handles nested arrays", async () => {
            const input = `$matrix = @(@(1, 2, 3), @(4, 5, 6), @(7, 8, 9))`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("1");
            expect(result).toContain("9");
        });

        it("handles deeply nested arrays", async () => {
            const input = `$nested = @(@(@(@(@(1)))))`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("1");
        });
    });

    describe("Deep Function Nesting", () => {
        it("handles nested script blocks", async () => {
            const input = `$script = { $inner1 = { $inner2 = { $inner3 = { Write-Output "deep" } } } }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("deep");
        });

        it("handles nested if statements", async () => {
            const input = `if ($a) { if ($b) { if ($c) { if ($d) { if ($e) { Write-Output "nested" } } } } }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("nested");
        });

        it("handles nested foreach loops", async () => {
            const input = `foreach ($i in 1..3) { foreach ($j in 1..3) { foreach ($k in 1..3) { Write-Output "$i,$j,$k" } } }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("foreach");
        });
    });

    describe("Complex Mixed Nesting", () => {
        it("handles function with nested structures", async () => {
            const input = `function Get-Config {
                param($Path)
                $config = @{
                    Settings = @{
                        Database = @{
                            Servers = @(
                                @{ Name = "SQL01"; Port = 1433 },
                                @{ Name = "SQL02"; Port = 1433 }
                            )
                        }
                    }
                }
                return $config
            }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toContain("Get-Config");
            expect(result).toContain("SQL01");
        });

        it("handles switch with nested cases", async () => {
            const input = `switch ($value) {
                1 { if ($sub) { Write-Output "1-sub" } else { Write-Output "1" } }
                2 { switch ($sub) { "a" { "2-a" } "b" { "2-b" } } }
                default { foreach ($item in $items) { Write-Output $item } }
            }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("switch");
        });
    });

    describe("Performance with Deep Nesting", () => {
        it("handles deep nesting without stack overflow", async () => {
            // Create 20 levels of nesting
            let deep = "1";
            for (let i = 0; i < 20; i++) {
                deep = `@(${deep})`;
            }
            const input = `$deep = ${deep}`;

            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
        });

        it("formats deeply nested structure in reasonable time", async () => {
            const input = `$complex = @{
                A = @{ B = @{ C = @{ D = @{ E = @{ F = @{ G = @{ H = "end" } } } } } } }
            }`;

            const start = Date.now();
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            const duration = Date.now() - start;

            expect(result).toBeTruthy();
            expect(duration).toBeLessThan(200); // Should be fast
        });
    });

    describe("Edge Cases in Deep Structures", () => {
        it("handles empty nested structures", async () => {
            const input = `$empty = @{ A = @{ B = @{ C = @{} } } }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
        });

        it("handles mixed empty and filled structures", async () => {
            const input = `$mixed = @{ A = @{}; B = @{ C = "value" }; D = @{} }`;
            const result = await formatAndAssert(input, baseConfig, "deep-nesting.result");
            expect(result).toBeTruthy();
            expect(result).toContain("value");
        });
    });
});
