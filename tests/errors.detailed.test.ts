import { describe, expect, it } from "vitest";

import {
    getLineAndColumn,
    PowerShellParseError,
    PowerShellWarning,
    type WarningType,
} from "../src/errors.js";

describe("Error and warning classes", () => {
    describe("PowerShellParseError", () => {
        it("creates error with all parameters", () => {
            const error = new PowerShellParseError(
                "Test error",
                "Get-Item $test",
                10,
                1,
                11
            );

            expect(error.name).toBe("PowerShellParseError");
            expect(error.message).toBe("Test error");
            expect(error.source).toBe("Get-Item $test");
            expect(error.position).toBe(10);
            expect(error.line).toBe(1);
            expect(error.column).toBe(11);
        });

        it("formats error message with toString", () => {
            const error = new PowerShellParseError(
                "Unexpected token",
                "Get-Item $test",
                10,
                1,
                11
            );

            const str = error.toString();
            expect(str).toContain("PowerShellParseError");
            expect(str).toContain("Unexpected token");
            expect(str).toContain("at line 1, column 11");
            expect(str).toContain("Get-Item $test");
            expect(str).toContain("^"); // Pointer
        });

        it("handles multiline source in toString", () => {
            const source = "Get-Item $test\nWrite-Host 'hello'\n$x = 5";
            const error = new PowerShellParseError(
                "Syntax error",
                source,
                27,
                2,
                12
            );

            const str = error.toString();
            expect(str).toContain("Write-Host 'hello'");
            expect(str).toContain("at line 2, column 12");
        });

        it("gets context with default context lines", () => {
            const source = ["line1", "line2", "line3", "line4", "line5", "line6"].join(
                "\n"
            );
            const error = new PowerShellParseError("Error", source, 15, 3, 5);

            const context = error.getContext();
            expect(context).toContain("line1");
            expect(context).toContain("line2");
            expect(context).toContain("line3");
            expect(context).toContain("line4");
            expect(context).toContain("line5");
            expect(context).toContain(">"); // Error line marker
        });

        it("gets context with custom context lines", () => {
            const source = ["line1", "line2", "line3", "line4", "line5"].join("\n");
            const error = new PowerShellParseError("Error", source, 15, 3, 5);

            const context = error.getContext(1);
            expect(context).toContain("line2");
            expect(context).toContain("line3");
            expect(context).toContain("line4");
            expect(context).not.toContain("line1");
            expect(context).not.toContain("line5");
        });

        it("handles error at first line", () => {
            const source = "line1\nline2\nline3";
            const error = new PowerShellParseError("Error", source, 3, 1, 4);

            const context = error.getContext(2);
            expect(context).toContain("line1");
            expect(context).toContain(">");
        });

        it("handles error at last line", () => {
            const source = "line1\nline2\nline3";
            const error = new PowerShellParseError("Error", source, 15, 3, 3);

            const context = error.getContext(2);
            expect(context).toContain("line3");
            expect(context).toContain(">");
        });

        it("handles out-of-range line numbers in toString", () => {
            const error = new PowerShellParseError(
                "Out of range",
                "single line",
                20,
                5,
                2
            );

            const str = error.toString();
            expect(str).toContain("line 5, column 2");
            expect(str).toContain("^");
        });

        it("includes stack trace when available", () => {
            const error = new PowerShellParseError("Error", "test", 1, 1, 1);
            const hasCaptureStackTrace =
                typeof Error.captureStackTrace === "function";
            if (hasCaptureStackTrace) {
                expect(error.stack).toBeDefined();
            }
        });

            it("constructs correctly when Error.captureStackTrace is unavailable", () => {
                const descriptor = Object.getOwnPropertyDescriptor(
                    Error,
                    "captureStackTrace"
                );

                Object.defineProperty(Error, "captureStackTrace", {
                    value: undefined,
                    configurable: true,
                    writable: true,
                });

                try {
                    const error = new PowerShellParseError(
                        "Error",
                        "test",
                        1,
                        1,
                        1
                    );

                    expect(error.name).toBe("PowerShellParseError");
                } finally {
                    if (descriptor) {
                        Object.defineProperty(Error, "captureStackTrace", descriptor);
                    } else {
                        Reflect.deleteProperty(Error, "captureStackTrace");
                    }
                }
            });
    });

    describe("PowerShellWarning", () => {
        it("creates warning with basic information", () => {
            const warning = new PowerShellWarning(
                "This syntax is deprecated",
                "deprecated-syntax",
                10,
                1,
                11
            );

            expect(warning.message).toBe("This syntax is deprecated");
            expect(warning.type).toBe("deprecated-syntax");
            expect(warning.position).toBe(10);
            expect(warning.line).toBe(1);
            expect(warning.column).toBe(11);
            expect(warning.suggestion).toBeUndefined();
        });

        it("creates warning with suggestion", () => {
            const warning = new PowerShellWarning(
                "Use approved verb",
                "best-practice",
                5,
                1,
                6,
                "Use Get-Item instead"
            );

            expect(warning.message).toBe("Use approved verb");
            expect(warning.suggestion).toBe("Use Get-Item instead");
        });

        it("formats warning without suggestion", () => {
            const warning = new PowerShellWarning(
                "Performance issue",
                "performance",
                10,
                2,
                5
            );

            const str = warning.toString();
            expect(str).toContain("Warning [performance]");
            expect(str).toContain("Performance issue");
            expect(str).toContain("at line 2, column 5");
            expect(str).not.toContain("Suggestion:");
        });

        it("formats warning with suggestion", () => {
            const warning = new PowerShellWarning(
                "Anti-pattern detected",
                "anti-pattern",
                10,
                3,
                2,
                "Consider using foreach instead"
            );

            const str = warning.toString();
            expect(str).toContain("Warning [anti-pattern]");
            expect(str).toContain("Anti-pattern detected");
            expect(str).toContain("Suggestion: Consider using foreach instead");
            expect(str).toContain("at line 3, column 2");
        });

        it("supports all warning types", () => {
            const types: WarningType[] = [
                "deprecated-syntax",
                "anti-pattern",
                "performance",
                "style",
                "best-practice",
            ];

            types.forEach((type) => {
                const warning = new PowerShellWarning("Test warning", type, 1, 1, 1);
                expect(warning.type).toBe(type);
                expect(warning.toString()).toContain(`[${type}]`);
            });
        });
    });

    describe("getLineAndColumn", () => {
        it("calculates position 0", () => {
            const result = getLineAndColumn("test", 0);
            expect(result).toEqual({ line: 1, column: 1 });
        });

        it("calculates position in single line", () => {
            const result = getLineAndColumn("Hello World", 6);
            expect(result).toEqual({ line: 1, column: 7 });
        });

        it("calculates position in multiline text", () => {
            const source = "line1\nline2\nline3";
            const result = getLineAndColumn(source, 6);
            expect(result).toEqual({ line: 2, column: 1 });
        });

        it("calculates position mid-line", () => {
            const source = "line1\nline2\nline3";
            const result = getLineAndColumn(source, 9);
            expect(result).toEqual({ line: 2, column: 4 });
        });

        it("handles position at end of file", () => {
            const source = "line1\nline2";
            const result = getLineAndColumn(source, source.length);
            expect(result).toEqual({ line: 2, column: 6 });
        });

        it("handles empty string", () => {
            const result = getLineAndColumn("", 0);
            expect(result).toEqual({ line: 1, column: 1 });
        });
    });
});
