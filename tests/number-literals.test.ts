import { readFileSync } from "node:fs";
import prettier from "prettier";
import { describe, expect, it } from "vitest";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Number literal handling", () => {
    it("preserves numeric suffixes and multipliers", async () => {
        const fixturePath = new URL("./fixtures/numeric-literals.ps1", import.meta.url);
        const input = readFileSync(fixturePath, "utf8");

        const result = await prettier.format(input, baseConfig);

        expect(result).toBe('$values = @( 123u, 0xFFu, 1.5e3f, 42KB, 5mb, 99l, 0b1010u )\n');
    });
});
