import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("hashtable comment association", () => {
    it("keeps inline comments beside their entries", async () => {
        expect.hasAssertions();

        const fixturePath = new URL(
            "fixtures/hashtable-inline-comments.ps1",
            import.meta.url
        );
        const input = readFileSync(fixturePath, "utf8");
        const result = await formatAndAssertRoundTrip(input, baseConfig);

        expect(result).toBe(`$settings = @{
    Alpha = 1 # alpha
    Beta = 2 # beta
    Gamma =
        @{
            Nested = 3 # nested
        }
}
`);
        expect(result).not.toContain("} # alpha");
        expect(result).not.toContain("# alpha # beta");
    });

    it("preserves comment ownership when sorting keys", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Zulu = 1 # zulu
Alpha = 2 # alpha
}`,
            {
                ...baseConfig,
                powershellSortHashtableKeys: true,
            }
        );

        expect(result).toBe(`$settings = @{
    Alpha = 2 # alpha
    Zulu = 1 # zulu
}
`);
    });

    it("keeps a comment after a semicolon with the preceding key", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Zulu = 1; # zulu
Alpha = 2
}`,
            {
                ...baseConfig,
                powershellSortHashtableKeys: true,
            }
        );

        expect(result).toBe(`$settings = @{
    Alpha = 2
    Zulu = 1 # zulu
}
`);
    });

    it("keeps a next-line comment with the following key", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Zulu = 1;
# alpha
Alpha = 2
}`,
            {
                ...baseConfig,
                powershellSortHashtableKeys: true,
            }
        );

        expect(result).toBe(`$settings = @{
    # alpha
    Alpha = 2
    Zulu = 1
}
`);
    });

    it("keeps block comments attached to their entries", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{ Alpha = 1 <# alpha #>; Beta = 2 }`,
            baseConfig
        );

        expect(result).toBe(`$settings = @{
    Alpha = 1 <# alpha #>
    Beta = 2
}
`);
    });
});
