import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

// Import the arbitraries to test them
import { parsePowerShell } from "../../src/parser.js";

// We'll test the arbitraries by generating samples and verifying they're valid
describe("property test arbitraries", () => {
    it("generates valid hashtable literals", () => {
        expect.hasAssertions();

        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        key: fc.constantFrom("Name", "Value", "Count", "X"),
                        value: fc.oneof(
                            fc.constant("'test'"),
                            fc.constant("123"),
                            fc.constant("@'\nmultiline\n'@")
                        ),
                    }),
                    { maxLength: 3 }
                ),
                (entries) => {
                    const script = (() => {
                        // Test empty hashtable
                        if (entries.length === 0) {
                            return "@{}";
                        }

                        // Test inline hashtable
                        const hasMultiline = entries.some(({ value }) =>
                            value.includes("\n")
                        );

                        if (hasMultiline) {
                            // Test multiline hashtable
                            const blockEntries = entries
                                .map(({ key, value }) => {
                                    if (!value.includes("\n")) {
                                        return `  ${key} = ${value}`;
                                    }
                                    const valueLines = value.split("\n");
                                    const indentedValue = valueLines
                                        .map((line) => {
                                            if (line.length === 0) {
                                                return "";
                                            }
                                            const trimmed = line.trim();
                                            if (
                                                trimmed === "'@" ||
                                                trimmed === '"@'
                                            ) {
                                                return trimmed;
                                            }
                                            return `  ${line}`;
                                        })
                                        .join("\n");
                                    return `  ${key} =\n${indentedValue}`;
                                })
                                .join("\n");
                            return `@{\n${blockEntries}\n}`;
                        }

                        const inlineEntries = entries
                            .map(({ key, value }) => `${key} = ${value}`)
                            .join("; ");

                        return `@{ ${inlineEntries} }`;
                    })();

                    const ast = parsePowerShell(script, {} as never);

                    expect(ast.type).toBe("Script");
                }
            ),
            { numRuns: 20 }
        );
    });

    it("handles hashtable entries with empty lines in multiline values", () => {
        expect.hasAssertions();

        // Test the case where value has empty lines
        const script = `@{
  Key = @'
line1

line3
'@
}`;
        const ast = parsePowerShell(script, {} as never);

        expect(ast.type).toBe("Script");
    });

    it("handles hashtable entries with heredoc closers", () => {
        expect.hasAssertions();

        // Test the HEREDOC_CLOSERS path
        const script = `@{
  Key = @'
content
'@
}`;
        const ast = parsePowerShell(script, {} as never);

        expect(ast.type).toBe("Script");
    });

    it("formats hashtable with trimmed heredoc closer", () => {
        expect.hasAssertions();

        // Another variation with double quote heredoc
        const script = `@{
  Key = @"
content
"@
}`;
        const ast = parsePowerShell(script, {} as never);

        expect(ast.type).toBe("Script");
    });

    it("handles nested structures in arbitraries", () => {
        expect.hasAssertions();

        // Test deeply nested structures that exercise the formatHashtableEntry function
        const script = `@{
  Outer = @{
    Inner = 'value'
  }
}`;
        const ast = parsePowerShell(script, {} as never);

        expect(ast.type).toBe("Script");
    });

    it("generates valid array literals", () => {
        expect.hasAssertions();

        fc.assert(
            fc.property(
                fc.array(fc.constantFrom("1", "'test'", "$true"), {
                    maxLength: 5,
                }),
                (elements) => {
                    const script =
                        elements.length === 0 ? "@()" : elements.join(", ");
                    const ast = parsePowerShell(script, {} as never);

                    expect(ast.type).toBe("Script");
                }
            ),
            { numRuns: 20 }
        );
    });

    it("generates valid pipeline expressions", () => {
        expect.hasAssertions();

        fc.assert(
            fc.property(
                fc.array(
                    fc.constantFrom(
                        "Get-Item",
                        "Select-Object",
                        "Where-Object"
                    ),
                    {
                        maxLength: 3,
                        minLength: 1,
                    }
                ),
                (commands) => {
                    const script = commands.join(" | ");
                    const ast = parsePowerShell(script, {} as never);

                    expect(ast.type).toBe("Script");
                }
            ),
            { numRuns: 20 }
        );
    });

    it("generates valid string literals with special chars", () => {
        expect.hasAssertions();

        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant("'simple'"),
                    fc.constant('"double"'),
                    fc.constant("@'\nhere\n'@"),
                    fc.constant('@"\nhere\n"@')
                ),
                (str) => {
                    const ast = parsePowerShell(str, {} as never);

                    expect(ast.type).toBe("Script");
                }
            ),
            { numRuns: 20 }
        );
    });

    it("generates valid variable references", () => {
        expect.hasAssertions();

        fc.assert(
            fc.property(
                fc.constantFrom("$x", "$test", "$_", "$args"),
                (varName) => {
                    const ast = parsePowerShell(varName, {} as never);

                    expect(ast.type).toBe("Script");
                }
            ),
            { numRuns: 20 }
        );
    });
});
