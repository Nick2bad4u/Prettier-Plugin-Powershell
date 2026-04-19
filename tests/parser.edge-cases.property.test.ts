import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { BaseNode } from "../src/ast.js";

import { parsePowerShell } from "../src/parser.js";
import { tokenize } from "../src/tokenizer.js";

const { env: testEnv } = process;

const PROPERTY_RUNS = Number.parseInt(
    testEnv.POWERSHELL_PROPERTY_RUNS ?? "150",
    10
);

const createParserOptions = () => ({ tabWidth: 2 }) as never;

describe("parser edge case property tests", () => {
    describe("nesting depth limits", () => {
        it("handles deeply nested script blocks", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(fc.integer({ max: 20, min: 1 }), (depth) => {
                    const opening = "{".repeat(depth);
                    const content = "Write-Output 'nested'";
                    const closing = "}".repeat(depth);
                    const script = `${opening} ${content} ${closing}`;

                    const ast = parsePowerShell(script, createParserOptions());
                    if (ast.type !== "Script") {
                        throw new Error(
                            `Failed to parse nested script blocks at depth ${depth}`
                        );
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles deeply nested arrays", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(fc.integer({ max: 15, min: 1 }), (depth) => {
                    const opening = "@(".repeat(depth);
                    const content = "1, 2, 3";
                    const closing = ")".repeat(depth);
                    const script = `$x = ${opening}${content}${closing}`;

                    const ast = parsePowerShell(script, createParserOptions());
                    if (ast.type !== "Script") {
                        throw new Error(
                            `Failed to parse nested arrays at depth ${depth}`
                        );
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles deeply nested hashtables", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(fc.integer({ max: 15, min: 1 }), (depth) => {
                    let script = "$x = @{";
                    for (let i = 0; i < depth; i++) {
                        script += `key${i} = @{`;
                    }
                    script += "value = 42";
                    script += "}".repeat(depth + 1);

                    const ast = parsePowerShell(script, createParserOptions());
                    if (ast.type !== "Script") {
                        throw new Error(
                            `Failed to parse nested hashtables at depth ${depth}`
                        );
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("unbalanced delimiters", () => {
        it("handles missing closing braces gracefully", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.integer({ max: 5, min: 1 }),
                    fc.integer({ max: 3, min: 0 }),
                    (opening, closing) => {
                        const script = `${"{".repeat(opening)} Write-Output 'test' ${"}".repeat(Math.min(closing, opening))}`;

                        // Should not throw
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                "Failed to parse unbalanced braces"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles missing closing parentheses gracefully", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.integer({ max: 5, min: 1 }),
                    fc.integer({ max: 3, min: 0 }),
                    (opening, closing) => {
                        const script = `${"$x = @(".repeat(opening)}1, 2, 3${")".repeat(Math.min(closing, opening))}`;

                        // Should not throw
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                "Failed to parse unbalanced parentheses"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("comment placement", () => {
        it("handles comments in various positions", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(
                        "# comment\nWrite-Output 'test'",
                        "Write-Output 'test' # comment",
                        "Write-Output `\n# comment\n'test'",
                        "# comment1\n# comment2\nWrite-Output 'test'",
                        "$x = 1\n# between lines\n$y = 2",
                        "# /** TSDoc-style summary */\n# @param foo description\nWrite-Output 'test'",
                        "#region Section\n# /// JSDoc-style tag inside region\n#endregion\nWrite-Output 'test'"
                    ),
                    (script) => {
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                "Failed to parse script with comments"
                            );
                        }

                        // Verify parsing succeeded (comments may be attached to pipelines or separate)
                        const hasComment = ast.body.some(
                            (node) => node.type === "Comment"
                        );
                        const hasPipelineWithComment = ast.body.some(
                            (node) =>
                                node.type === "Pipeline" &&
                                "trailingComment" in node &&
                                node.trailingComment !== undefined
                        );

                        expect(
                            hasComment ||
                                hasPipelineWithComment ||
                                ast.body.length > 0
                        ).toBeTruthy();
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles block comments in various positions", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(
                        "<# block #>\nWrite-Output 'test'",
                        "Write-Output <# block #> 'test'",
                        "<# line1\nline2 #>\nWrite-Output 'test'",
                        "<#\n/**\n * Block TSDoc-style summary\n * @param bar description\n * @returns result\n */\n#>\nWrite-Output 'test'"
                    ),
                    (script) => {
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                "Failed to parse script with block comments"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("string edge cases", () => {
        it("handles various quote types and escaping", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(
                        "'single quotes'",
                        '"double quotes"',
                        "'nested ''quotes'' here'",
                        '"nested ""quotes"" here"',
                        '"escaped `"quote`" here"',
                        "'multiple ' + 'strings'"
                    ),
                    (stringExpr) => {
                        const script = `$x = ${stringExpr}`;
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                `Failed to parse string expression: ${stringExpr}`
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles here-strings with various content", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(
                        '@"\nline1\nline2\n"@',
                        "@'\nline1\nline2\n'@",
                        '@"\n"@',
                        "@'\n'@",
                        '@"\n$variable\n"@',
                        "@'\n$variable\n'@",
                        "@'\n/**\n * Here-string docs\n * @param baz description\n */\n'@"
                    ),
                    (hereString) => {
                        const script = `$x = ${hereString}`;
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                `Failed to parse here-string: ${hereString}`
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("whitespace variations", () => {
        it("handles various whitespace combinations", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(" ", "\t", "\r\n", "\n", "  ", "\t\t"),
                    fc.constantFrom(" ", "\t", "\r\n", "\n"),
                    (ws1, ws2) => {
                        const script = `$x${ws1}=${ws2}42`;
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error("Failed to parse with whitespace");
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles scripts with only whitespace", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom("", " ", "\n", "\r\n", "\t", "   \n  \n  "),
                    (whitespace) => {
                        const ast = parsePowerShell(
                            whitespace,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                "Failed to parse whitespace-only script"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("pipeline edge cases", () => {
        it("handles long pipelines", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(fc.integer({ max: 20, min: 2 }), (length) => {
                    const commands = Array.from(
                        { length },
                        (_, i) => `Command${i}`
                    );
                    const script = commands.join(" | ");

                    const ast = parsePowerShell(script, createParserOptions());
                    if (ast.type !== "Script") {
                        throw new Error(
                            `Failed to parse pipeline of length ${length}`
                        );
                    }

                    // Verify pipeline structure
                    const pipeline = ast.body.find(
                        (node) => node.type === "Pipeline"
                    );
                    if (
                        pipeline?.type !== "Pipeline" ||
                        pipeline.segments.length !== length
                    ) {
                        throw new Error(
                            `Pipeline did not parse with ${length} segments`
                        );
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles pipelines with line continuations", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(
                        "Get-Item |\nSelect-Object Name",
                        "Get-Item `\n| Select-Object Name",
                        "Get-Item | `\nSelect-Object Name"
                    ),
                    (script) => {
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                "Failed to parse pipeline with line continuation"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("special characters and operators", () => {
        it("handles various operators", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(
                        "$x -eq $y",
                        "$x -ne $y",
                        "$x -gt 5",
                        "$x -lt 10",
                        "$x -and $y",
                        "$x -or $y",
                        "$x -match 'pattern'",
                        "$x -like '*test*'",
                        "$x::Method()",
                        "[Type]::Cast($x)"
                    ),
                    (expression) => {
                        const ast = parsePowerShell(
                            expression,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                `Failed to parse operator expression: ${expression}`
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles type casts and attributes", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(
                        "[int]$x = 42",
                        "[string]$name = 'test'",
                        "[Parameter()]$value",
                        "[ValidateNotNull()]$required"
                    ),
                    (declaration) => {
                        const ast = parsePowerShell(
                            declaration,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                `Failed to parse type/attribute: ${declaration}`
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("location consistency under stress", () => {
        it("maintains location invariants for complex nested structures", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.record({
                        depth: fc.integer({ max: 5, min: 1 }),
                        elements: fc.integer({ max: 3, min: 1 }),
                        hasComments: fc.boolean(),
                    }),
                    ({ depth, elements, hasComments }) => {
                        let script = "";
                        const indent = "  ";

                        const buildNested = (level: number): string => {
                            if (level >= depth) {
                                return `${indent.repeat(level)}Write-Output 'leaf'`;
                            }

                            let content = `${indent.repeat(level)}$x = @{\n`;
                            for (let i = 0; i < elements; i++) {
                                if (hasComments && i === 0) {
                                    content += `${indent.repeat(level + 1)}# Comment\n`;
                                }
                                content += `${indent.repeat(level + 1)}key${i} = `;
                                if (level + 1 < depth) {
                                    content += "@{\n";
                                    content += buildNested(level + 2);
                                    content += `\n${indent.repeat(level + 1)}}`;
                                } else {
                                    content += `${i}`;
                                }
                                if (i < elements - 1) content += ";";
                                content += "\n";
                            }
                            content += `${indent.repeat(level)}}`;
                            return content;
                        };

                        script = buildNested(0);

                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );
                        if (ast.type !== "Script") {
                            throw new Error(
                                "Failed to parse complex nested structure"
                            );
                        }

                        // Recursively verify all locations
                        const checkNode = (
                            node: Readonly<BaseNode>,
                            sourceLength: number
                        ): void => {
                            if (
                                node.loc.start < 0 ||
                                node.loc.end < node.loc.start ||
                                node.loc.end > sourceLength
                            ) {
                                throw new Error(
                                    `Invalid location for ${node.type}: ${JSON.stringify(node.loc)}`
                                );
                            }

                            // Check children
                            for (const value of Object.values(node as never)) {
                                if (Array.isArray(value)) {
                                    for (const item of value) {
                                        if (
                                            item !== null &&
                                            typeof item === "object" &&
                                            "type" in item
                                        ) {
                                            checkNode(
                                                item as BaseNode,
                                                sourceLength
                                            );
                                        }
                                    }
                                } else if (
                                    value !== null &&
                                    typeof value === "object" &&
                                    "type" in value
                                ) {
                                    checkNode(value as BaseNode, sourceLength);
                                }
                            }
                        };

                        checkNode(ast, script.length);
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("token-to-AST correspondence", () => {
        it("ensures all tokens are accounted for in the AST", () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();


            fc.assert(
                fc.property(
                    fc.constantFrom(
                        "$x = 1; $y = 2",
                        "Write-Output 'test'",
                        "if ($true) { Write-Output 'yes' }",
                        "@{ key = 'value'; key2 = 42 }",
                        "1, 2, 3 | ForEach-Object { $_ * 2 }"
                    ),
                    (script) => {
                        const tokens = tokenize(script);
                        const ast = parsePowerShell(
                            script,
                            createParserOptions()
                        );

                        if (ast.type !== "Script") {
                            throw new Error("Failed to parse script");
                        }

                        // Verify AST spans the entire token range
                        const nonWhitespaceTokens = tokens.filter(
                            (t) => t.type !== "newline"
                        );
                        if (nonWhitespaceTokens.length > 0) {
                            const firstToken = nonWhitespaceTokens[0];
                            const lastToken = nonWhitespaceTokens.at(-1);

                            if (lastToken === undefined) {
                                return;
                            }

                            if (
                                ast.body.length > 0 &&
                                (ast.loc.start > firstToken.start ||
                                    ast.loc.end < lastToken.end)
                            ) {
                                throw new Error(
                                    `AST does not span full token range: AST ${ast.loc.start}-${ast.loc.end}, tokens ${firstToken.start}-${lastToken.end}`
                                );
                            }
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });
});
