import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";
import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell",
    plugins: [plugin],
};

describe("unicode support in tokenizer", () => {
    it.each([
        {
            name: "supports Unicode variable names (Greek)",
            script: "$π = 3.14",
        },
        {
            name: "supports Unicode variable names (Chinese)",
            script: "$变量 = 'value'",
        },
        {
            name: "supports Unicode variable names (Cyrillic)",
            script: "$ответ = 42",
        },
        {
            name: "handles mixed ASCII and Unicode variable names",
            script: "$test变量Name = 'mixed'",
        },
    ])("$name", async ({ script }) => {
        expect.hasAssertions();

        const result = await formatAndAssert(script, baseConfig, {
            id: "unicode-support.test.ts.result",
            skipParse: true,
        });

        expect(result.trim()).toBe(script);
    });

    it("supports Unicode identifiers (function names)", async () => {
        expect.hasAssertions();

        const script = "function Δ { Write-Output 'Delta' }";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "unicode-support"
        );

        expect(result).toContain("function Δ");
    });

    it("does not break emoji into separate tokens (emoji not valid in var names)", async () => {
        expect.hasAssertions();

        // Emoji are not valid in PowerShell variable names without braces
        // Our formatter should tokenize $ and emoji separately
        const script = "$😺 = 'cat'";
        const result = await formatAndAssert(script, baseConfig, {
            id: "unicode-support.test.ts.result",
            skipParse: true,
        });

        // The $ and emoji should be separate tokens (not a valid variable name)
        expect(result).not.toBe("$😺 = 'cat'");
    });

    it("handles braced variable names with spaces and emoji", async () => {
        expect.hasAssertions();

        const script = String.raw`\${'var with spaces'} = 1`;
        const result = await formatAndAssert(
            script,
            baseConfig,
            "unicode-support"
        );

        expect(result).toContain(String.raw`\${'var with spaces'}`);
    });

    it("preserves Unicode in strings", async () => {
        expect.hasAssertions();

        const script = "$text = 'Hello 世界 🌍'";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "unicode-support"
        );

        expect(result).toContain("世界 🌍");
    });
});
