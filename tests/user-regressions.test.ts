import { readFile } from "node:fs/promises";
import { URL } from "node:url";

import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell",
    plugins: [plugin],
    filepath: "test.ps1",
};

const countOccurrences = (text: string, needle: string) =>
    text.split(needle).length - 1;

const readFixture = (relativePath: string) =>
    readFile(new URL(relativePath, import.meta.url), "utf8");

describe("ps-color-scripts regressions", () => {
    async function assertFormatting(
        inputFixture: string,
        expectedFixture: string,
        snapshotKey: string
    ) {
        const input = await readFixture(inputFixture);
        const expected = await readFixture(expectedFixture);
        const filepath = expectedFixture.endsWith(".psd1")
            ? "test.psd1"
            : "test.ps1";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                filepath,
            },
            snapshotKey
        );
        expect(result).toBe(expected);
    }

    it("normalizes Invoke-ColorScriptCacheOperation indentation and semicolons", async () => {
        await assertFormatting(
            "./test_files/Test-File-11.unformatted.ps1",
            "./test_files/Test-File-11.ps1",
            "user-regressions.test-file-11"
        );
    });

    it("ensures Test-File-11.ps1 remains idempotent", async () => {
        const expected = await readFixture("./test_files/Test-File-11.ps1");
        const result = await formatAndAssert(
            expected,
            {
                ...baseConfig,
                filepath: "test.ps1",
            },
            "user-regressions.test-file-11.idempotent"
        );
        expect(result).toBe(expected);
    });

    it("reformats the Galaxy Panel sample with 4-space indentation", async () => {
        await assertFormatting(
            "./test_files/Test-File-10.unformatted.ps1",
            "./test_files/Test-File-10.ps1",
            "user-regressions.test-file-10"
        );
    });

    it("never corrupts escaped apostrophes in PSD1 metadata", async () => {
        const expected = await readFixture("./test_files/Test-File-9.psd1");
        const result = await formatAndAssert(
            expected,
            {
                ...baseConfig,
                filepath: "test.psd1",
            },
            "user-regressions.test-file-9.idempotent"
        );
        const langtonNeedle = "'Langton''s ant cellular automaton.'";
        const conwayNeedle = "'Conway''s Game of Life with trailing history.'";
        expect(countOccurrences(result, langtonNeedle)).toBe(
            countOccurrences(expected, langtonNeedle)
        );
        expect(countOccurrences(result, conwayNeedle)).toBe(
            countOccurrences(expected, conwayNeedle)
        );
    });
});
