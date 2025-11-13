import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";
const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("PowerShell Version Compatibility", () => {
    describe("PowerShell 5.1 Features", () => {
        it("formats classes (PS 5.0+)", async () => {
            const input = `class Person { [string]$Name; [int]$Age }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat.classes"
            );
            expect(result).toContain("class Person");
        });

        it("formats enums (PS 5.0+)", async () => {
            const input = `enum Color { Red; Green; Blue }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat|skipParse"
            );
            expect(result).toContain("enum Color");
        });

        it("formats using namespace (PS 5.0+)", async () => {
            const input = `using namespace System.IO`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("using namespace");
        });

        it("formats using module (PS 5.0+)", async () => {
            const input = `using module MyModule`;
            const result = await formatAndAssert(input, baseConfig, {
                id: "version-compat",
                skipParse: true,
            });
            expect(result).toContain("using module");
        });
    });

    describe("PowerShell 6.0+ Features", () => {
        it("formats ternary operator (PS 7.0+)", async () => {
            const input = `$result = $test ? "yes" : "no"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("?");
            expect(result).toContain(":");
        });

        it("formats null-coalescing operator (PS 7.0+)", async () => {
            const input = `$value = $input ?? "default"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("??");
        });

        it("formats null-conditional assignment (PS 7.0+)", async () => {
            const input = `$var ??= "value"`;
            const result = await formatAndAssert(input, baseConfig, {
                id: "version-compatibility.test.ts.result",
                skipParse: true,
            });
            // May add spaces around operator
            expect(result).toMatch(/\?\?=|\?\?\s+=/);
        });

        it("formats pipeline chain operators (PS 7.0+)", async () => {
            const input = `Get-Process && Get-Service || Write-Error "fail"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("&&");
            expect(result).toContain("||");
        });
    });

    describe("PowerShell 7.1+ Features", () => {
        it("formats enhanced error view", async () => {
            const input = `$ErrorView = "ConciseView"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("ConciseView");
        });

        it("formats clean block", async () => {
            const input = `function Test { clean { Write-Output "cleanup" } process { } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("clean");
        });
    });

    describe("PowerShell 7.2+ Features", () => {
        it("formats PSNativeCommandArgumentPassing", async () => {
            const input = `$PSNativeCommandArgumentPassing = "Windows"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("PSNativeCommandArgumentPassing");
        });
    });

    describe("PowerShell 7.3+ Features", () => {
        it("formats improved -replace operator", async () => {
            const input = `$text -replace "old", "new"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("-replace");
        });

        it("formats $PSStyle automatic variable", async () => {
            const input = `$PSStyle.Foreground.Red`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("$PSStyle");
        });
    });

    describe("PowerShell 7.4+ Features", () => {
        it("formats improved tab completion", async () => {
            const input = `Get-Command -Name Get-*Process`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toBeTruthy();
        });

        it("formats SecureString improvements", async () => {
            const input = `$secure = ConvertTo-SecureString "password" -AsPlainText -Force`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("ConvertTo-SecureString");
        });
    });

    describe("Cross-Version Compatibility", () => {
        it("handles backward-compatible syntax", async () => {
            const input = `
                # Works in all versions
                function Get-Data {
                    param([string]$Path)
                    if (Test-Path $Path) {
                        Get-Content $Path
                    }
                }
            `;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("function Get-Data");
        });

        it("formats common cmdlets (all versions)", async () => {
            const input = `
                Get-Process
                Get-Service
                Get-ChildItem
                Set-Location
                Write-Output
            `;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("Get-Process");
            expect(result).toContain("Get-Service");
        });

        it("handles version-specific features gracefully", async () => {
            const input = `
                # PS 7.0+ ternary
                $result = $test ? "new" : "old"

                # PS 5.1 compatible
                $result = if ($test) { "new" } else { "old" }
            `;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toBeTruthy();
        });
    });

    describe("Deprecated Features", () => {
        it("still formats deprecated cmdlets", async () => {
            const input = `Write-Host "This is deprecated but still works"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("Write-Host");
        });

        it("formats legacy array syntax", async () => {
            const input = `$array = 1, 2, 3, 4, 5`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("$array");
        });
    });

    describe("Platform-Specific Features", () => {
        it("formats Windows-specific cmdlets", async () => {
            const input = `Get-WmiObject -Class Win32_Process`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("Get-WmiObject");
        });

        it("formats cross-platform cmdlets", async () => {
            const input = `Get-Process -Name pwsh`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("Get-Process");
        });

        it("handles path separators in strings", async () => {
            const input = `
                $windowsPath = "C:\\Windows\\System32"
                $unixPath = "/usr/local/bin"
            `;
            const result = await formatAndAssert(input, baseConfig, {
                id: "version-compatibility.test.ts.result",
                skipParse: true,
            });
            // String content is preserved as-is
            expect(result).toContain("C:");
            expect(result).toContain("/usr/local/bin");
        });
    });

    describe("Experimental Features", () => {
        it("formats PSAnsiRendering settings", async () => {
            const input = `$PSStyle.OutputRendering = "Ansi"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toContain("OutputRendering");
        });

        it("handles experimental syntax gracefully", async () => {
            const input = `
                # Even if syntax is experimental, format what we can
                $data = Get-Something | Process-Data
            `;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );
            expect(result).toBeTruthy();
        });
    });
});
