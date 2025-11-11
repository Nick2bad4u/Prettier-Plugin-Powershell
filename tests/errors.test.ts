import { describe, expect, it } from "vitest";

import {
    createParseError,
    detectIssues,
    getLineAndColumn,
    PowerShellParseError,
} from "../src/errors.js";

describe("Error Handling System", () => {
    describe("Line and Column Calculation", () => {
        it("calculates line and column for first character", () => {
            const source = "Hello World";
            const { line, column } = getLineAndColumn(source, 0);
            expect(line).toBe(1);
            expect(column).toBe(1);
        });

        it("calculates line and column for middle of first line", () => {
            const source = "Hello World";
            const { line, column } = getLineAndColumn(source, 6);
            expect(line).toBe(1);
            expect(column).toBe(7);
        });

        it("calculates line and column for second line", () => {
            const source = "Line 1\nLine 2";
            const { line, column } = getLineAndColumn(source, 7);
            expect(line).toBe(2);
            expect(column).toBe(1);
        });

        it("calculates line and column for third line", () => {
            const source = "Line 1\nLine 2\nLine 3";
            const { line, column } = getLineAndColumn(source, 14);
            expect(line).toBe(3);
            expect(column).toBe(1);
        });
    });

    describe("PowerShellParseError", () => {
        it("creates error with source location", () => {
            const source = "function Test {\n  Write-Output";
            const error = createParseError(
                "Unexpected end of input",
                source,
                30
            );

            expect(error).toBeInstanceOf(PowerShellParseError);
            expect(error.message).toBe("Unexpected end of input");
            expect(error.line).toBe(2);
            expect(error.column).toBe(15);
        });

        it("formats error message with context", () => {
            const source = "function Test {\n  $x = 1\n  $y =\n}";
            const error = createParseError("Missing value", source, 28);

            const message = error.toString();
            expect(message).toContain("Missing value");
            expect(message).toContain("line 3");
        });

        it("gets context around error", () => {
            const source =
                "line 1\nline 2\nline 3 ERROR\nline 4\nline 5";
            const error = createParseError("Test error", source, 21);

            const context = error.getContext(1);
            expect(context).toContain("line 2");
            expect(context).toContain("line 3 ERROR");
            expect(context).toContain("line 4");
            expect(context).toContain(">");
        });
    });

    describe("Anti-Pattern Detection", () => {
        it("detects Write-Host usage", () => {
            const source = `Write-Host "Hello"`;
            const warnings = detectIssues(source);

            expect(warnings.length).toBeGreaterThan(0);
            const writeHostWarning = warnings.find((w) =>
                w.message.includes("Write-Host")
            );
            expect(writeHostWarning).toBeDefined();
            expect(writeHostWarning?.type).toBe("anti-pattern");
        });

        it("detects Invoke-Expression usage", () => {
            const source = `Invoke-Expression $command`;
            const warnings = detectIssues(source);

            const ieWarning = warnings.find((w) =>
                w.message.includes("Invoke-Expression")
            );
            expect(ieWarning).toBeDefined();
            expect(ieWarning?.type).toBe("anti-pattern");
            expect(ieWarning?.suggestion).toBeTruthy();
        });

        it("detects performance anti-patterns", () => {
            const source = `Get-Process | Where-Object { $_.Name -eq "powershell" } | Select-Object -First 1`;
            const warnings = detectIssues(source);

            const perfWarning = warnings.find((w) => w.type === "performance");
            expect(perfWarning).toBeDefined();
        });

        it("detects foreach performance issue", () => {
            const source = `foreach ($item in Get-ChildItem) { }`;
            const warnings = detectIssues(source);

            const foreachWarning = warnings.find((w) =>
                w.message.includes("ForEach-Object")
            );
            expect(foreachWarning).toBeDefined();
        });

        it("provides helpful suggestions", () => {
            const source = `Write-Host "message"`;
            const warnings = detectIssues(source);

            const warning = warnings[0];
            expect(warning.suggestion).toBeTruthy();
            expect(warning.suggestion).toContain("Write-Output");
        });
    });

    describe("Warning Formatting", () => {
        it("formats warning message", () => {
            const source = `Write-Host "test"`;
            const warnings = detectIssues(source);

            const message = warnings[0].toString();
            expect(message).toContain("Warning");
            expect(message).toContain("anti-pattern");
            expect(message).toContain("Suggestion:");
        });

        it("includes line and column in warning", () => {
            const source = `$x = 1\nWrite-Host "test"`;
            const warnings = detectIssues(source);

            const warning = warnings[0];
            expect(warning.line).toBe(2);
            expect(warning.column).toBeGreaterThan(0);
        });
    });

    describe("Multiple Issues Detection", () => {
        it("detects multiple issues in same file", () => {
            const source = `
                Write-Host "test1"
                Invoke-Expression $cmd
                Write-Host "test2"
            `;
            const warnings = detectIssues(source);

            expect(warnings.length).toBeGreaterThanOrEqual(3);
        });

        it("reports correct positions for multiple issues", () => {
            const source = `Write-Host "1"\nWrite-Host "2"`;
            const warnings = detectIssues(source);

            expect(warnings[0].line).toBe(1);
            expect(warnings[1].line).toBe(2);
        });
    });
});
