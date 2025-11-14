import { describe, expect, it } from "vitest";

import {
    cloneNode,
    createLocation,
    isArrayLiteralNode,
    isCommentNode,
    isFunctionDeclarationNode,
    isHashtableNode,
    isHereStringNode,
    isNodeType,
    isPipelineNode,
    isScriptBlockNode,
    isScriptNode,
    type ArrayLiteralNode,
    type BaseNode,
    type CommentNode,
    type ExpressionNode,
    type FunctionDeclarationNode,
    type HashtableNode,
    type HereStringNode,
    type PipelineNode,
    type ScriptBlockNode,
    type ScriptNode,
    type TokenRole,
} from "../src/ast.js";

function createTextExpression(
    value: string,
    role: TokenRole = "word"
): ExpressionNode {
    return {
        type: "Expression",
        parts: [
            {
                type: "Text",
                value,
                role,
                loc: createLocation(0, value.length),
            },
        ],
        loc: createLocation(0, value.length),
    } satisfies ExpressionNode;
}

describe("AST utility functions", () => {
    describe("createLocation", () => {
        it("creates a location object with start and end", () => {
            const loc = createLocation(5, 15);
            expect(loc).toEqual({ start: 5, end: 15 });
        });

        it("handles zero positions", () => {
            const loc = createLocation(0, 0);
            expect(loc).toEqual({ start: 0, end: 0 });
        });

        it("handles large positions", () => {
            const loc = createLocation(1000, 2000);
            expect(loc).toEqual({ start: 1000, end: 2000 });
        });
    });

    describe("isNodeType", () => {
        it("returns true when node type matches", () => {
            const node: ScriptNode = {
                type: "Script",
                body: [],
                loc: createLocation(0, 10),
            };
            expect(isNodeType(node, "Script")).toBe(true);
        });

        it("returns false when node type does not match", () => {
            const node: ScriptNode = {
                type: "Script",
                body: [],
                loc: createLocation(0, 10),
            };
            expect(isNodeType(node, "Pipeline")).toBe(false);
        });

        it("works with different node types", () => {
            const comment: CommentNode = {
                type: "Comment",
                value: "# test",
                loc: createLocation(0, 6),
                inline: false,
                style: "line",
            };
            expect(isNodeType(comment, "Comment")).toBe(true);
            expect(isNodeType(comment, "Script")).toBe(false);
        });
    });

    describe("cloneNode", () => {
        it("clones a simple node", () => {
            const node: CommentNode = {
                type: "Comment",
                value: "# test comment",
                loc: createLocation(0, 14),
                inline: false,
                style: "line",
            };
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned).not.toBe(node);
            expect(cloned.loc).not.toBe(node.loc);
        });

        it("clones a node with body array", () => {
            const node: ScriptNode = {
                type: "Script",
                body: [
                    {
                        type: "Comment",
                        value: "# comment",
                        loc: createLocation(0, 9),
                        inline: false,
                        style: "line",
                    },
                ],
                loc: createLocation(0, 10),
            };
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned).not.toBe(node);
            expect(cloned.body).not.toBe(node.body);
            expect(cloned.body).toEqual(node.body);
        });

        it("clones a node with parts array", () => {
            const node = {
                type: "StringLiteral",
                parts: ["hello", "world"],
                loc: createLocation(0, 11),
            } as BaseNode;
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned).not.toBe(node);
            // @ts-expect-error - accessing parts
            expect(cloned.parts).not.toBe(node.parts);
            // @ts-expect-error - accessing parts
            expect(cloned.parts).toEqual(node.parts);
        });

        it("clones a node with segments array", () => {
            const node = {
                type: "ExpandableString",
                segments: [{ type: "StringSegment", value: "test" }],
                loc: createLocation(0, 4),
            } as BaseNode;
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            // @ts-expect-error - accessing segments
            expect(cloned.segments).not.toBe(node.segments);
        });

        it("clones a node with elements array", () => {
            const node: ArrayLiteralNode = {
                type: "ArrayLiteral",
                elements: [createTextExpression("1", "number")],
                kind: "implicit",
                loc: createLocation(0, 3),
            };
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned.elements).not.toBe(node.elements);
        });

        it("clones a node with entries array", () => {
            const node: HashtableNode = {
                type: "Hashtable",
                entries: [
                    {
                        type: "HashtableEntry",
                        key: "key",
                        rawKey: createTextExpression("key"),
                        value: createTextExpression("value", "string"),
                        loc: createLocation(0, 12),
                    },
                ],
                loc: createLocation(0, 14),
            };
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned.entries).not.toBe(node.entries);
        });

        it("clones a node with parameters array", () => {
            const node = {
                type: "FunctionDeclaration",
                parameters: [
                    {
                        type: "Parameter",
                        name: "$test",
                        loc: createLocation(0, 5),
                    },
                ],
                loc: createLocation(0, 20),
            } as BaseNode;
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            // @ts-expect-error - accessing parameters
            expect(cloned.parameters).not.toBe(node.parameters);
        });
    });

    describe("Type guard functions", () => {
        describe("isScriptNode", () => {
            it("returns true for Script nodes", () => {
                const node: ScriptNode = {
                    type: "Script",
                    body: [],
                    loc: createLocation(0, 0),
                };
                expect(isScriptNode(node)).toBe(true);
            });

            it("returns false for non-Script nodes", () => {
                const node: CommentNode = {
                    type: "Comment",
                    value: "# test",
                    loc: createLocation(0, 6),
                    inline: false,
                    style: "line",
                };
                expect(isScriptNode(node)).toBe(false);
            });
        });

        describe("isPipelineNode", () => {
            it("returns true for Pipeline nodes", () => {
                const node: PipelineNode = {
                    type: "Pipeline",
                    segments: [],
                    loc: createLocation(0, 10),
                };
                expect(isPipelineNode(node)).toBe(true);
            });

            it("returns false for non-Pipeline nodes", () => {
                const node: ScriptNode = {
                    type: "Script",
                    body: [],
                    loc: createLocation(0, 0),
                };
                expect(isPipelineNode(node)).toBe(false);
            });
        });

        describe("isFunctionDeclarationNode", () => {
            it("returns true for FunctionDeclaration nodes", () => {
                const node: FunctionDeclarationNode = {
                    type: "FunctionDeclaration",
                    header: createTextExpression("function Test-Function"),
                    body: {
                        type: "ScriptBlock",
                        body: [],
                        loc: createLocation(0, 2),
                    },
                    loc: createLocation(0, 20),
                };
                expect(isFunctionDeclarationNode(node)).toBe(true);
            });

            it("returns false for non-FunctionDeclaration nodes", () => {
                const node: ScriptNode = {
                    type: "Script",
                    body: [],
                    loc: createLocation(0, 0),
                };
                expect(isFunctionDeclarationNode(node)).toBe(false);
            });
        });

        describe("isScriptBlockNode", () => {
            it("returns true for ScriptBlock nodes", () => {
                const node: ScriptBlockNode = {
                    type: "ScriptBlock",
                    body: [],
                    loc: createLocation(0, 2),
                };
                expect(isScriptBlockNode(node)).toBe(true);
            });

            it("returns false for non-ScriptBlock nodes", () => {
                const node: ScriptNode = {
                    type: "Script",
                    body: [],
                    loc: createLocation(0, 0),
                };
                expect(isScriptBlockNode(node)).toBe(false);
            });
        });

        describe("isHashtableNode", () => {
            it("returns true for Hashtable nodes", () => {
                const node: HashtableNode = {
                    type: "Hashtable",
                    entries: [],
                    loc: createLocation(0, 2),
                };
                expect(isHashtableNode(node)).toBe(true);
            });

            it("returns false for non-Hashtable nodes", () => {
                const node: ScriptNode = {
                    type: "Script",
                    body: [],
                    loc: createLocation(0, 0),
                };
                expect(isHashtableNode(node)).toBe(false);
            });
        });

        describe("isArrayLiteralNode", () => {
            it("returns true for ArrayLiteral nodes", () => {
                const node: ArrayLiteralNode = {
                    type: "ArrayLiteral",
                    elements: [],
                    loc: createLocation(0, 2),
                    kind: "implicit",
                };
                expect(isArrayLiteralNode(node)).toBe(true);
            });

            it("returns false for non-ArrayLiteral nodes", () => {
                const node: ScriptNode = {
                    type: "Script",
                    body: [],
                    loc: createLocation(0, 0),
                };
                expect(isArrayLiteralNode(node)).toBe(false);
            });
        });

        describe("isCommentNode", () => {
            it("returns true for Comment nodes", () => {
                const node: CommentNode = {
                    type: "Comment",
                    value: "# test",
                    loc: createLocation(0, 6),
                    inline: false,
                    style: "line",
                };
                expect(isCommentNode(node)).toBe(true);
            });

            it("returns false for non-Comment nodes", () => {
                const node: ScriptNode = {
                    type: "Script",
                    body: [],
                    loc: createLocation(0, 0),
                };
                expect(isCommentNode(node)).toBe(false);
            });
        });

        describe("isHereStringNode", () => {
            it("returns true for HereString nodes", () => {
                const node: HereStringNode = {
                    type: "HereString",
                    value: "@'\ntest\n'@",
                    quote: "single",
                    loc: createLocation(0, 10),
                };
                expect(isHereStringNode(node)).toBe(true);
            });

            it("returns false for non-HereString nodes", () => {
                const node: ScriptNode = {
                    type: "Script",
                    body: [],
                    loc: createLocation(0, 0),
                };
                expect(isHereStringNode(node)).toBe(false);
            });
        });
    });
});
