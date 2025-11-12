import { describe, expect, it } from "vitest";

import { formatAndAssert } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("Delimited sequence handling", () => {
    it("keeps array elements stable across commas and newlines", async () => {
        const input = "@(1, 2, 3,\n4, 5)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "delimited-sequences.result"
        );
        expect(result).toBe("@( 1, 2, 3, 4, 5 )\n");
    });

    it("formats param blocks consistently", async () => {
        const input = `function Test {
    param (
        [int] $A,
        [string] $B
    )
    Write-Output $A
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "delimited-sequences.result"
        );
        expect(result).toBe(`function Test {
  param(
    [int] $A,
    [string] $B
  )

  Write-Output $A
}
`);
    });

    it("preserves hashtable comments and delimiters", async () => {
        const input = `@{
    Name = "Value"
    # trailing
    Count = 2; Other = 3
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "delimited-sequences.result"
        );
        expect(result).toBe(`@{
  Name = "Value"
  # trailing
  Count = 2
  Other = 3;
}
`);
    });
});
