import { describe, expect, it } from "vitest";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("prettier-ignore directives", () => {
    it("preserves the next statement from the original source", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `# prettier-ignore
$foo="bar"
$baz="qux"
`,
            baseConfig
        );

        expect(result).toBe(`# prettier-ignore
$foo="bar"
$baz = "qux"
`);
    });

    it("preserves ignored statements inside script blocks", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `function Test {
    # prettier-ignore
    $foo  =  "bar"
    $baz="qux"
}
`,
            baseConfig
        );

        expect(result).toBe(`function Test {
    # prettier-ignore
    $foo  =  "bar"
    $baz = "qux"
}
`);
    });

    it("preserves a complete multiline function node", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `# prettier-ignore
function    Test{
$foo="bar"
}
`,
            baseConfig
        );

        expect(result).toBe(`# prettier-ignore
function    Test{
$foo="bar"
}
`);
    });

    it("preserves inline comments and a trailing statement semicolon", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `# prettier-ignore
$foo  =  "bar" # Keep  spacing
# prettier-ignore
$baz  =  "qux";
$formatted="yes"
`,
            baseConfig
        );

        expect(result).toBe(`# prettier-ignore
$foo  =  "bar" # Keep  spacing
# prettier-ignore
$baz  =  "qux";
$formatted = "yes"
`);
    });

    it("rebases nested multiline nodes without changing relative indentation", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `function Outer {
        # prettier-ignore
        function    Inner{
            $foo  =  "bar"
        }
}
`,
            baseConfig
        );

        expect(result).toBe(`function Outer {
    # prettier-ignore
    function    Inner{
        $foo  =  "bar"
    }
}
`);
    });

    it("does not alter indentation inside ignored multiline strings", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `function Outer {
        # prettier-ignore
        $value  =  "first
  second"
}
`,
            baseConfig
        );

        expect(result).toBe(`function Outer {
    # prettier-ignore
    $value  =  "first
  second"
}
`);
    });

    it("requires the directive to be immediately above the node", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `# prettier-ignore

$foo="bar"
`,
            baseConfig
        );

        expect(result).toBe(`# prettier-ignore

$foo = "bar"
`);
    });

    it("does not treat similarly named comments as directives", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `# prettier-ignore-start
$foo="bar"
`,
            baseConfig
        );

        expect(result).toBe(`# prettier-ignore-start
$foo = "bar"
`);
        expect(result).not.toContain(`$foo="bar"`);
    });

    it("does not treat trailing comments as directives", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `Write-Output "test" # prettier-ignore
$foo="bar"
`,
            baseConfig
        );

        expect(result).toContain(`$foo = "bar"`);
    });
});
