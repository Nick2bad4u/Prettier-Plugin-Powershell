import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("number literal handling", () => {
    it("preserves numeric suffixes and multipliers", async () => {
        expect.hasAssertions();

        const fixturePath = new URL(
            "fixtures/numeric-literals.ps1",
            import.meta.url
        );
        const input = readFileSync(fixturePath, "utf8");

        const result = await formatAndAssertRoundTrip(input, baseConfig);

        expect(result).toBe(
            `$values = @(
    123u
    0xFFu
    1.5e3f
    42KB
    5mb
    99l
    0b1010u
)
`
        );
        expect(result).not.toContain("123 u");
    });
});
