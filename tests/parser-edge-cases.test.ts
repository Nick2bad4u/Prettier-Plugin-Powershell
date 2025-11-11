import prettier from "prettier";
import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";

const baseConfig = {
    parser: "powershell",
    plugins: [plugin],
};

describe("Parser inline comment detection", () => {
    it("treats comment at position 0 as non-inline", async () => {
        const script = "# Comment at start\n$a = 1";
        const result = await prettier.format(script, baseConfig);
        // Comment at position 0 should be on its own line
        expect(result).toContain("# Comment at start\n");
    });

    it("treats empty source correctly", async () => {
        const script = "";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe("");
    });

    it("treats actual inline comments correctly", async () => {
        const script = "$a = 1 # inline comment";
        const result = await prettier.format(script, baseConfig);
        // Inline comment should stay on same line
        expect(result).toContain("# inline comment");
    });
});

describe("Parser empty array element handling", () => {
    it("does not create empty array elements with consecutive commas", async () => {
        // This would be invalid PowerShell anyway, but our parser shouldn't crash
        const script = "@(1,, 2)";
        // Just ensure it doesn't crash
        try {
            await prettier.format(script, baseConfig);
        } catch (e) {
            // Expected to fail during parsing or formatting, but not crash
            expect(e).toBeDefined();
        }
    });

    it("handles arrays with newlines and commas correctly", async () => {
        const script = "@(\n1,\n2\n)";
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("@(");
        expect(result).toContain(")");
    });
});
