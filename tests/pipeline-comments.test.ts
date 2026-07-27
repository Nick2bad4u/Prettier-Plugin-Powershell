import { describe, expect, it } from "vitest";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("pipeline separator comments", () => {
    it.each([
        {
            name: "after a pipe",
            source: `1, 2 | # numbers
ForEach-Object { $_ * 2 }
`,
        },
        {
            name: "below a pipe",
            source: `1, 2 |
# numbers
ForEach-Object { $_ * 2 }
`,
        },
        {
            name: "before a line-leading pipe",
            source: `1, 2
# numbers
| ForEach-Object { $_ * 2 }
`,
        },
    ])(
        "keeps the separator when a comment appears $name",
        async ({ source }) => {
            expect.hasAssertions();

            const result = await formatAndAssertRoundTrip(source, baseConfig, {
                id: "pipeline-separator-comment",
            });

            expect(result).toBe(`1, 2
    | # numbers
    ForEach-Object {
        $_ * 2
    }
`);
            expect(result).not.toContain("1, 2 # numbers");
        }
    );

    it("retains every separator and its associated comment", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `Get-Process | # select
Where-Object CPU | <# project #>
Select-Object Name
`,
            baseConfig,
            { id: "multiple-pipeline-comments" }
        );

        expect(result).toBe(`Get-Process
    | # select
    Where-Object CPU
    | <# project #>
    Select-Object Name
`);
        expect(result.match(/\|/gv)).toHaveLength(2);
        expect(result).not.toContain("Get-Process # select");
    });
});
