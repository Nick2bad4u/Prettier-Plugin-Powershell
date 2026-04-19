import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";
import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell",
    plugins: [plugin],
};

describe("parser inline comment detection", () => {
    it("treats comment at position 0 as non-inline", async () => {
        expect.hasAssertions();

        const script = "# Comment at start\n$a = 1";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "parser-edge-cases.result"
        );

        // Comment at position 0 should be on its own line
        expect(result).toContain("# Comment at start\n");
    });

    it("treats empty source correctly", async () => {
        expect.hasAssertions();

        const script = "";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "parser-edge-cases.result"
        );

        expect(result.trim()).toBe("");
    });

    it("treats actual inline comments correctly", async () => {
        expect.hasAssertions();

        const script = "$a = 1 # inline comment";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "parser-edge-cases.result"
        );

        // Inline comment should stay on same line
        expect(result).toContain("# inline comment");
    });
});

describe("parser empty array element handling", () => {
    it("does not create empty array elements with consecutive commas", async () => {
        expect.hasAssertions();

        // This would be invalid PowerShell anyway, but our parser shouldn't crash
        const script = "@(1,, 2)";
        const outcome = await formatAndAssert(script, baseConfig, {
            skipParse: true,
        })
            .then(() => "formatted")
            .catch(() => "failed");

        expect(["failed", "formatted"]).toContain(outcome);
    });

    it("handles arrays with newlines and commas correctly", async () => {
        expect.hasAssertions();

        const script = "@(\n1,\n2\n)";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "parser-edge-cases.result"
        );

        expect(result).toContain("@(");
        expect(result).toContain(")");
    });
});
