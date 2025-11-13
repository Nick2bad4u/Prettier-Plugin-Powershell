import { describe, expect, it, vi } from "vitest";

import * as formatUtils from "./format-and-assert.js";

const { formatAndAssert, formatAndAssertRoundTrip } = formatUtils;

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("formatAndAssert helper", () => {
    it("formats and asserts parse for valid input", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssert(input, baseConfig, {
            id: "utils.formatOk",
        });
        expect(result).toContain("Write-Host");
    });

    it("formats with skipParse for valid input", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssert(input, baseConfig, {
            id: "utils.skipParse",
            skipParse: true,
        });
        expect(result).toContain("Write-Host");
    });

    it("supports string shorthand options with id", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssert(
            input,
            baseConfig,
            "utils.stringShorthand"
        );
        expect(result).toContain("Write-Host");
    });

    it("respects skipParse flag in string shorthand", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssert(
            input,
            baseConfig,
            "utils.stringSkip|skipParse"
        );
        expect(result).toContain("Write-Host");
    });

    it("roundtrip asserts idempotence", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssertRoundTrip(input, baseConfig, {
            id: "utils.roundtrip",
        });
        expect(result).toContain("Write-Host");
    });

    it("roundtrip supports string shorthand ids", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssertRoundTrip(
            input,
            baseConfig,
            "utils.roundtripString"
        );
        expect(result).toContain("Write-Host");
    });

    it("can skip idempotence assertion when expectIdempotent is false", async () => {
        const input = 'Write-Host "hi"';
        const result = await formatAndAssertRoundTrip(input, baseConfig, {
            id: "utils.roundtripNonIdempotent",
            expectIdempotent: false,
        });
        expect(result).toContain("Write-Host");
    });

    it("throws when a roundtrip is not idempotent", async () => {
        vi.resetModules();

        vi.doMock("prettier", () => ({
            default: {
                format: vi
                    .fn()
                    .mockResolvedValueOnce("First run output")
                    .mockResolvedValueOnce("Second run output"),
            },
        }));

        const module = await import("./format-and-assert.js");

        await expect(
            module.formatAndAssertRoundTrip("ignored", baseConfig, {
                id: "utils.roundtripFailure",
                skipParse: true,
            })
        ).rejects.toThrow(/Not idempotent/);

        vi.doUnmock("prettier");
        vi.resetModules();
    });
});
