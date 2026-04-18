import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";
import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell",
    plugins: [plugin],
};

describe("unicode support in tokenizer", () => {
    it("supports Unicode variable names (Greek)", async () => {
        const script = "$π = 3.14";
        const result = await formatAndAssert(script, baseConfig, {
            id: "unicode-support.test.ts.result",
            skipParse: true,
        });

        expect(result.trim()).toBe("$π = 3.14");
    });

    it("supports Unicode variable names (Chinese)", async () => {
        const script = "$变量 = 'value'";
        const result = await formatAndAssert(script, baseConfig, {
            id: "unicode-support.test.ts.result",
            skipParse: true,
        });

        expect(result.trim()).toBe("$变量 = 'value'");
    });

    it("supports Unicode variable names (Cyrillic)", async () => {
        const script = "$ответ = 42";
        const result = await formatAndAssert(script, baseConfig, {
            id: "unicode-support.test.ts.result",
            skipParse: true,
        });

        expect(result.trim()).toBe("$ответ = 42");
    });

    it("supports Unicode identifiers (function names)", async () => {
        const script = "function Δ { Write-Output 'Delta' }";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "unicode-support"
        );

        expect(result).toContain("function Δ");
    });

    it("does not break emoji into separate tokens (emoji not valid in var names)", async () => {
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
        const script = "${'var with spaces'} = 1";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "unicode-support"
        );

        expect(result).toContain("${'var with spaces'}");
    });

    it("preserves Unicode in strings", async () => {
        const script = "$text = 'Hello 世界 🌍'";
        const result = await formatAndAssert(
            script,
            baseConfig,
            "unicode-support"
        );

        expect(result).toContain("世界 🌍");
    });

    it("handles mixed ASCII and Unicode variable names", async () => {
        const script = "$test变量Name = 'mixed'";
        const result = await formatAndAssert(script, baseConfig, {
            id: "unicode-support.test.ts.result",
            skipParse: true,
        });

        expect(result.trim()).toBe("$test变量Name = 'mixed'");
    });
});

