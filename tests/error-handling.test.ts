
import { describe, expect, it } from "vitest";
import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Error Handling and Resilience", () => {
    it("handles incomplete script blocks gracefully", async () => {
        const input = `function Test { Write-Output "test"`;
        // Should not throw, but format what it can
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
        expect(result).toContain("function Test");
    });

    it("handles unmatched parentheses", async () => {
        const input = `$result = (Get-Process`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
    });

    it("handles incomplete hashtables", async () => {
        const input = `$data = @{ Name = "test"`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
    });

    it("handles incomplete arrays", async () => {
        const input = `$array = @(1, 2, 3`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
    });

    it("handles incomplete strings", async () => {
        const input = `$text = "incomplete`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
    });

    it("handles incomplete here-strings", async () => {
        const input = `$heredoc = @"\nLine 1\nLine 2`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
    });

    it("handles malformed if statements", async () => {
        const input = `if ($x -eq 5 { Write-Output "missing paren"`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
    });

    it("handles empty input", async () => {
        const input = ``;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        // Empty input should return just a newline or empty string
        expect(result).toBeDefined();
    });

    it("handles only whitespace", async () => {
        const input = `   \n\n   \t   \n`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        // Whitespace-only should be trimmed
        expect(result).toBeDefined();
    });

    it("handles only comments", async () => {
        const input = `# This is a comment\n# Another comment`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toContain("#");
    });

    it("handles mixed valid and invalid syntax", async () => {
        const input = `$x = 1\nif ($x -eq { \n$y = 2`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
        expect(result).toContain("$x = 1");
    });

    it("handles very long lines", async () => {
        const longString = "a".repeat(500);
        const input = `$text = "${longString}"`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
        expect(result).toContain(longString);
    });

    it("handles deeply nested structures", async () => {
        const input = `@{ a = @{ b = @{ c = @{ d = @{ e = "deep" } } } } }`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
        expect(result).toContain("deep");
    });

    it("handles special characters in strings", async () => {
        const input = `$text = "Special chars: \`n\`t\`r\\n\\t"`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
    });

    it("handles Unicode in various contexts", async () => {
        const input = `$変数 = "日本語"; # コメント`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
        expect(result).toContain("変数");
        expect(result).toContain("日本語");
    });

    it("handles mixed operators without spaces", async () => {
        const input = `$result=$x-eq5-and$y-ne10-or$z-gt100`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
    });

    it("handles complex pipeline chains", async () => {
        const input = `Get-Process | Where-Object { $_.CPU -gt 10 } | Select-Object Name, CPU | Sort-Object CPU -Descending | Format-Table -AutoSize`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
        expect(result).toContain("Get-Process");
        expect(result).toContain("Format-Table");
    });

    it("handles script with all token types", async () => {
        const input = `
# Comment
function Test-Everything {
    [CmdletBinding()]
    param([string]$Name)

    $global:data = @{
        Number = 0xFF
        Text = "string"
        Array = @(1, 2, 3)
        HereDoc = @"
Multi
Line
"@
    }

    if ($Name -match "test" -and $? -eq $true) {
        Get-Process | Where-Object { $_ -gt 100 } 2>&1 > output.log
    }
}
`;
        const result = await formatAndAssert(input, baseConfig, "error-handling.result");
        expect(result).toBeTruthy();
        expect(result).toContain("function Test-Everything");
    });
});
