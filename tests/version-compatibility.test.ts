import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("powershell version compatibility", () => {
    describe("powershell 5.1 features", () => {
        it("formats classes (PS 5.0+)", async () => {
            expect.hasAssertions();

            const input = `class Person { [string]$Name; [int]$Age }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat.classes"
            );

            expect(result).toContain("class Person");
        });

        it("formats enums (PS 5.0+)", async () => {
            expect.hasAssertions();

            const input = `enum Color { Red; Green; Blue }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat|skipParse"
            );

            expect(result).toContain("enum Color");
        });

        it("formats using namespace (PS 5.0+)", async () => {
            expect.hasAssertions();

            const input = `using namespace System.IO`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("using namespace");
        });

        it("formats using module (PS 5.0+)", async () => {
            expect.hasAssertions();

            const input = `using module MyModule`;
            const result = await formatAndAssert(input, baseConfig, {
                id: "version-compat",
                skipParse: true,
            });

            expect(result).toContain("using module");
        });
    });

    describe("powershell 6.0+ features", () => {
        it("formats ternary operator (PS 7.0+)", async () => {
            expect.hasAssertions();

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
            expect.hasAssertions();

            const input = `$value = $input ?? "default"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("??");
        });

        it("formats null-conditional assignment (PS 7.0+)", async () => {
            expect.hasAssertions();

            const input = `$var ??= "value"`;
            const result = await formatAndAssert(input, baseConfig, {
                id: "version-compatibility.test.ts.result",
                skipParse: true,
            });

            // May add spaces around operator
            expect(result).toMatch(/\?\?=|\?\?\s+=/v);
        });

        it("formats pipeline chain operators (PS 7.0+)", async () => {
            expect.hasAssertions();

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

    describe("powershell 7.1+ features", () => {
        it("formats enhanced error view", async () => {
            expect.hasAssertions();

            const input = `$ErrorView = "ConciseView"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("ConciseView");
        });

        it("formats clean block", async () => {
            expect.hasAssertions();

            const input = `function Test { clean { Write-Output "cleanup" } process { } }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("clean");
        });
    });

    describe("powershell 7.2+ features", () => {
        it("formats PSNativeCommandArgumentPassing", async () => {
            expect.hasAssertions();

            const input = `$PSNativeCommandArgumentPassing = "Windows"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("PSNativeCommandArgumentPassing");
        });
    });

    describe("powershell 7.3+ features", () => {
        it("formats improved -replace operator", async () => {
            expect.hasAssertions();

            const input = `$text -replace "old", "new"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("-replace");
        });

        it("formats $PSStyle automatic variable", async () => {
            expect.hasAssertions();

            const input = `$PSStyle.Foreground.Red`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("$PSStyle");
        });
    });

    describe("powershell 7.4+ features", () => {
        it("formats improved tab completion", async () => {
            expect.hasAssertions();

            const input = `Get-Command -Name Get-*Process`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toBeTruthy();
        });

        it("formats SecureString improvements", async () => {
            expect.hasAssertions();

            const input = `$secure = ConvertTo-SecureString "password" -AsPlainText -Force`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("ConvertTo-SecureString");
        });
    });

    describe("cross-version compatibility", () => {
        it("handles backward-compatible syntax", async () => {
            expect.hasAssertions();

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
            expect.hasAssertions();

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
            expect.hasAssertions();

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

    describe("deprecated features", () => {
        it("still formats deprecated cmdlets", async () => {
            expect.hasAssertions();

            const input = `Write-Host "This is deprecated but still works"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("Write-Host");
        });

        it("formats legacy array syntax", async () => {
            expect.hasAssertions();

            const input = `$array = 1, 2, 3, 4, 5`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("$array");
        });
    });

    describe("platform-specific features", () => {
        it("formats Windows-specific cmdlets", async () => {
            expect.hasAssertions();

            const input = `Get-WmiObject -Class Win32_Process`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("Get-WmiObject");
        });

        it("formats cross-platform cmdlets", async () => {
            expect.hasAssertions();

            const input = `Get-Process -Name pwsh`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("Get-Process");
        });

        it("handles path separators in strings", async () => {
            expect.hasAssertions();

            const input = String.raw`
                $windowsPath = "C:\Windows\System32"
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

    describe("experimental features", () => {
        it("formats PSAnsiRendering settings", async () => {
            expect.hasAssertions();

            const input = `$PSStyle.OutputRendering = "Ansi"`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "version-compat"
            );

            expect(result).toContain("OutputRendering");
        });

        it("handles experimental syntax gracefully", async () => {
            expect.hasAssertions();

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
