import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { FunctionDeclarationNode, ParenthesisNode } from "../src/ast.js";

import { parsePowerShell } from "../src/parser.js";
import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

const issueFixtureUrl = new URL(
    "fixtures/stacked-parameter-attributes.ps1",
    import.meta.url
);

const findFunctionParameters = (source: string): Readonly<ParenthesisNode> => {
    const script = parsePowerShell(source, {} as never);
    const declaration = script.body.find(
        (node): node is FunctionDeclarationNode =>
            node.type === "FunctionDeclaration"
    );
    const parameters = declaration?.header.parts.find(
        (part): part is ParenthesisNode => part.type === "Parenthesis"
    );

    if (!parameters) {
        throw new Error("Expected a direct function parameter list");
    }

    return parameters;
};

describe("parameter attributes", () => {
    it("preserves separators in direct function parameter lists", () => {
        expect.hasAssertions();

        const input = `function Test-Parameters(
    [Parameter(Mandatory)]
    [ValidateSet("A", "B")]
    [string]$Name,
    [object]$Value
) {}`;

        const parameters = findFunctionParameters(input);

        expect(parameters.hasComma).toBe(true);
        expect(parameters.hasNewline).toBe(true);
        expect(parameters.separators).toStrictEqual([
            "newline",
            "newline",
            "comma",
        ]);
    });

    it("formats the issue fixture without inventing attribute commas", async () => {
        expect.hasAssertions();

        const fixturePath = fileURLToPath(issueFixtureUrl);
        const input = readFileSync(fixturePath, "utf8");
        const result = await formatAndAssertRoundTrip(
            input,
            {
                ...baseConfig,
                filepath: fixturePath,
            },
            "parameter-attributes.issue-40"
        );

        expect(result).not.toContain("[Parameter(Mandatory)],");
        expect(result).not.toContain(
            '[ValidateSet("Set-Temp", "Remove-Temp")],'
        );
        expect(result).toContain("[string] $CommandName,");
        expect(result).toContain("# Number of times to invoke the callback.");
        expect(result).toContain("[string]\n        $Name,");
    });

    it("retains commas in ordinary multiline parentheses", async () => {
        expect.hasAssertions();

        const input = `$values = (
    1,
    2,
    3
)`;
        const result = await formatAndAssertRoundTrip(
            input,
            baseConfig,
            "parameter-attributes.multiline-parenthesis"
        );

        expect(result).toContain("1,");
        expect(result).toContain("2,");
        expect(result).not.toContain("3,");
    });
});
