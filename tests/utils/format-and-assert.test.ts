import { describe, expect, it } from "vitest";

import { formatAndAssert, formatAndAssertRoundTrip } from "./format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("formatAndAssert helper", () => {
    it("formats and asserts parse for valid input", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssert(input, baseConfig, { id: "utils.formatOk" });
        expect(result).toContain("Write-Host");
    });

    it("formats with skipParse for valid input", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssert(input, baseConfig, { id: "utils.skipParse", skipParse: true });
        expect(result).toContain("Write-Host");
    });

    it("roundtrip asserts idempotence", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssertRoundTrip(input, baseConfig, { id: "utils.roundtrip" });
        expect(result).toContain("Write-Host");
    });
});
