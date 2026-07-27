import { describe, expect, it } from "vitest";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("symbol operator tokenization", () => {
    it("formats compact assignment and arithmetic operators as valid code", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$x-=2
$x+=1
$x%=3
$x-$y
$x-2
$x--
$x ??= 4
`,
            baseConfig,
            { id: "symbol-operators" }
        );

        expect(result).toBe(`$x -= 2
$x += 1
$x %= 3
$x - $y
$x - 2
$x--
$x ??= 4
`);
        expect(result).not.toContain("$x- =");
    });

    it("keeps null-conditional operators adjacent to their operands", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `\${obj}?.Property
\${items}?[0]
$obj?.Property
`,
            baseConfig,
            { id: "null-conditional-operators" }
        );

        expect(result).toBe(`\${obj}?.Property
\${items}?[0]
$obj?.Property
`);
    });
});
