import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("array-subexpression separators", () => {
    it("preserves newline-separated commands as statements", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$values = @(
Write-Output 1
Write-Output 2
)`,
            baseConfig
        );

        expect(result).toBe(`$values = @(
    Write-Output 1
    Write-Output 2
)
`);
        expect(result).not.toContain("1,");
    });

    it("preserves mixed comma and newline boundaries", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$values = @(
1,
2
3,
4
Write-Output 5
)`,
            baseConfig
        );

        expect(result).toBe(`$values = @(
    1,
    2
    3,
    4
    Write-Output 5
)
`);
    });

    it("preserves standalone comments and nested separators", async () => {
        expect.hasAssertions();

        const fixturePath = new URL(
            "fixtures/array-subexpression-separators.ps1",
            import.meta.url
        );
        const input = readFileSync(fixturePath, "utf8");
        const result = await formatAndAssertRoundTrip(input, baseConfig);

        expect(result).toContain(`# leading
    1
    # between
    2
    # trailing`);
        expect(result).toContain(`$nested = @(
    @(
        1
        2
    )
    ( 3, 4 )
)`);
    });

    it.each([
        {
            expected: `@(
    # only
)
`,
            source: `@(
# only
)`,
        },
        {
            expected: `@(
    1 # inline
)
`,
            source: `@(
1 # inline
)`,
        },
    ])(
        "keeps the closing delimiter after a line comment",
        async ({ expected, source }) => {
            expect.hasAssertions();

            const result = await formatAndAssertRoundTrip(source, baseConfig);

            expect(result).toBe(expected);
        }
    );

    it("preserves newline continuations in param default values", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `param([int] $value = 1 +
2)`,
            baseConfig
        );

        expect(result).toBe(`param(
    [int] $value = 1 +
    2
)
`);
        expect(result).not.toContain("+,");
    });
});
