import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Comment Positioning Improvements", () => {
    describe("Inline Comments", () => {
        it("preserves inline comments after statements", async () => {
            const input = `$x = 1 # This is a comment`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("#");
            expect(result).toContain("This is a comment");
        });

        it("preserves inline comments in pipelines", async () => {
            const input = `Get-Process | # Get all processes\nWhere-Object CPU # Filter by CPU`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# Get all processes");
            expect(result).toContain("# Filter by CPU");
        });

        it("handles multiple inline comments", async () => {
            const input = `$a = 1 # Comment 1\n$b = 2 # Comment 2\n$c = 3 # Comment 3`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# Comment 1");
            expect(result).toContain("# Comment 2");
            expect(result).toContain("# Comment 3");
        });
    });

    describe("Block Comments", () => {
        it("preserves block comments in functions", async () => {
            const input = `function Test {\n<# This is a block comment #>\nparam($x)\n}`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("<#");
            expect(result).toContain("This is a block comment");
            expect(result).toContain("#>");
        });

        it("handles multi-line block comments", async () => {
            const input = `<#\nLine 1\nLine 2\nLine 3\n#>\n$x = 1`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("Line 1");
            expect(result).toContain("Line 2");
            expect(result).toContain("Line 3");
        });

        it("preserves comment-based help", async () => {
            const input = `<#\n.SYNOPSIS\nTest function\n.DESCRIPTION\nLong description\n#>\nfunction Test { }`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain(".SYNOPSIS");
            expect(result).toContain(".DESCRIPTION");
        });
    });

    describe("Comment Positioning in Complex Structures", () => {
        it("handles comments in hashtables", async () => {
            const input = `@{ Key1 = "value1"; Key2 = "value2" } # Hashtable comment`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            // Inline comments after hashtables work
            expect(result).toContain("# Hashtable comment");
        });

        it("preserves comments within hashtable entries", async () => {
            const input = `@{
                # Leading comment for Key1
                Key1 = "value1" # Inline comment for Key1
                # Leading comment for Key2
                Key2 = "value2"
                Key3 = "value3" # Trailing inline comment
                # Trailing comment after Key3
            }`;

            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# Leading comment for Key1");
            expect(result).toContain("# Inline comment for Key1");
            expect(result).toContain("# Leading comment for Key2");
            expect(result).toContain("# Trailing comment after Key3");
        });

        it("handles comments in arrays", async () => {
            const input = `@(1, 2, 3) # Array comment`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            // Inline comments after arrays work
            expect(result).toContain("# Array comment");
        });

        it("handles comments in script blocks", async () => {
            const input = `{\n# Start of block\n$x = 1\n# Middle comment\n$y = 2\n# End comment\n}`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# Start of block");
            expect(result).toContain("# Middle comment");
            expect(result).toContain("# End comment");
        });
    });

    describe("Edge Cases", () => {
        it("handles empty inline comments", async () => {
            const input = `$x = 1 #`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("#");
        });

        it("handles comments with special characters", async () => {
            const input = `$x = 1 # Comment with $special @chars & symbols!`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("$special");
            expect(result).toContain("@chars");
        });

        it("handles nested block comments (not standard but should not break)", async () => {
            const input = `<# Outer <# Inner #> #>\n$x = 1`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            // Should handle gracefully
            expect(result).toBeTruthy();
        });

        it("preserves comment formatting in long pipelines", async () => {
            const input = `Get-Process | # Step 1\nWhere-Object CPU | # Step 2\nSelect-Object Name # Final step`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# Step 1");
            expect(result).toContain("# Step 2");
            expect(result).toContain("# Final step");
        });
    });

    describe("Comment Preservation During Formatting", () => {
        it("maintains comment position after function params", async () => {
            const input = `function Test {\nparam([string]$Name)\n} # Function comment`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# Function comment");
        });

        it("maintains comment position in if statements", async () => {
            const input = `if ($true) { # Condition is always true\nWrite-Output "yes"\n}`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# Condition is always true");
        });

        it("handles comments between pipeline segments", async () => {
            const input = `Get-Process |\n# Filter step\nWhere-Object Name |\n# Sort step\nSort-Object CPU`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# Filter step");
            expect(result).toContain("# Sort step");
        });
    });

    describe("Documentation Comments", () => {
        it("preserves region markers", async () => {
            const input = `#region Main\n$x = 1\n#endregion`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("#region");
            expect(result).toContain("#endregion");
        });

        it("preserves TODO comments", async () => {
            const input = `# TODO: Fix this later\n$x = 1`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# TODO:");
        });

        it("preserves FIXME and NOTE comments", async () => {
            const input = `# FIXME: Bug here\n# NOTE: Important\n$x = 1`;
            const result = await formatAndAssert(
                input,
                baseConfig,
                "comment-positioning.result"
            );
            expect(result).toContain("# FIXME:");
            expect(result).toContain("# NOTE:");
        });
    });
});
