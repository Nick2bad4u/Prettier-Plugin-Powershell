import { describe, expect, it } from "vitest";

import {
    type ArrayLiteralNode,
    type BaseNode,
    cloneNode,
    type CommentNode,
    createLocation,
    type ExpressionNode,
    type FunctionDeclarationNode,
    type HashtableNode,
    type HereStringNode,
    isArrayLiteralNode,
    isCommentNode,
    isFunctionDeclarationNode,
    isHashtableNode,
    isHereStringNode,
    isNodeType,
    isPipelineNode,
    isScriptBlockNode,
    isScriptNode,
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
        loc: createLocation(0, value.length),
        parts: [
            {
                loc: createLocation(0, value.length),
                role,
                type: "Text",
                value,
            },
        ],
        type: "Expression",
    } satisfies ExpressionNode;
}

describe("AST utility functions", () => {
    describe(createLocation, () => {
        it("creates a location object with start and end", () => {
            const loc = createLocation(5, 15);

            expect(loc).toEqual({ end: 15, start: 5 });
        });

        it("handles zero positions", () => {
            const loc = createLocation(0, 0);

            expect(loc).toEqual({ end: 0, start: 0 });
        });

        it("handles large positions", () => {
            const loc = createLocation(1000, 2000);

            expect(loc).toEqual({ end: 2000, start: 1000 });
        });
    });

    describe(isNodeType, () => {
        it("returns true when node type matches", () => {
            const node: ScriptNode = {
                body: [],
                loc: createLocation(0, 10),
                type: "Script",
            };

            expect(isNodeType(node, "Script")).toBeTruthy();
        });

        it("returns false when node type does not match", () => {
            const node: ScriptNode = {
                body: [],
                loc: createLocation(0, 10),
                type: "Script",
            };

            expect(isNodeType(node, "Pipeline")).toBeFalsy();
        });

        it("works with different node types", () => {
            const comment: CommentNode = {
                inline: false,
                loc: createLocation(0, 6),
                style: "line",
                type: "Comment",
                value: "# test",
            };

            expect(isNodeType(comment, "Comment")).toBeTruthy();
            expect(isNodeType(comment, "Script")).toBeFalsy();
        });
    });

    describe(cloneNode, () => {
        it("clones a simple node", () => {
            const node: CommentNode = {
                inline: false,
                loc: createLocation(0, 14),
                style: "line",
                type: "Comment",
                value: "# test comment",
            };
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned).not.toBe(node);
            expect(cloned.loc).not.toBe(node.loc);
        });

        it("clones a node with body array", () => {
            const node: ScriptNode = {
                body: [
                    {
                        inline: false,
                        loc: createLocation(0, 9),
                        style: "line",
                        type: "Comment",
                        value: "# comment",
                    },
                ],
                loc: createLocation(0, 10),
                type: "Script",
            };
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned).not.toBe(node);
            expect(cloned.body).not.toBe(node.body);
            expect(cloned.body).toEqual(node.body);
        });

        it("clones a node with parts array", () => {
            const node = {
                loc: createLocation(0, 11),
                parts: ["hello", "world"],
                type: "StringLiteral",
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
                loc: createLocation(0, 4),
                segments: [{ type: "StringSegment", value: "test" }],
                type: "ExpandableString",
            } as BaseNode;
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            // @ts-expect-error - accessing segments
            expect(cloned.segments).not.toBe(node.segments);
        });

        it("clones a node with elements array", () => {
            const node: ArrayLiteralNode = {
                elements: [createTextExpression("1", "number")],
                kind: "implicit",
                loc: createLocation(0, 3),
                type: "ArrayLiteral",
            };
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned.elements).not.toBe(node.elements);
        });

        it("clones a node with entries array", () => {
            const node: HashtableNode = {
                entries: [
                    {
                        key: "key",
                        loc: createLocation(0, 12),
                        rawKey: createTextExpression("key"),
                        type: "HashtableEntry",
                        value: createTextExpression("value", "string"),
                    },
                ],
                loc: createLocation(0, 14),
                type: "Hashtable",
            };
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            expect(cloned.entries).not.toBe(node.entries);
        });

        it("clones a node with parameters array", () => {
            const node = {
                loc: createLocation(0, 20),
                parameters: [
                    {
                        loc: createLocation(0, 5),
                        name: "$test",
                        type: "Parameter",
                    },
                ],
                type: "FunctionDeclaration",
            } as BaseNode;
            const cloned = cloneNode(node);

            expect(cloned).toEqual(node);
            // @ts-expect-error - accessing parameters
            expect(cloned.parameters).not.toBe(node.parameters);
        });
    });

    describe("type guard functions", () => {
        describe(isScriptNode, () => {
            it("returns true for Script nodes", () => {
                const node: ScriptNode = {
                    body: [],
                    loc: createLocation(0, 0),
                    type: "Script",
                };

                expect(isScriptNode(node)).toBeTruthy();
            });

            it("returns false for non-Script nodes", () => {
                const node: CommentNode = {
                    inline: false,
                    loc: createLocation(0, 6),
                    style: "line",
                    type: "Comment",
                    value: "# test",
                };

                expect(isScriptNode(node)).toBeFalsy();
            });
        });

        describe(isPipelineNode, () => {
            it("returns true for Pipeline nodes", () => {
                const node: PipelineNode = {
                    loc: createLocation(0, 10),
                    segments: [],
                    type: "Pipeline",
                };

                expect(isPipelineNode(node)).toBeTruthy();
            });

            it("returns false for non-Pipeline nodes", () => {
                const node: ScriptNode = {
                    body: [],
                    loc: createLocation(0, 0),
                    type: "Script",
                };

                expect(isPipelineNode(node)).toBeFalsy();
            });
        });

        describe(isFunctionDeclarationNode, () => {
            it("returns true for FunctionDeclaration nodes", () => {
                const node: FunctionDeclarationNode = {
                    body: {
                        body: [],
                        loc: createLocation(0, 2),
                        type: "ScriptBlock",
                    },
                    header: createTextExpression("function Test-Function"),
                    loc: createLocation(0, 20),
                    type: "FunctionDeclaration",
                };

                expect(isFunctionDeclarationNode(node)).toBeTruthy();
            });

            it("returns false for non-FunctionDeclaration nodes", () => {
                const node: ScriptNode = {
                    body: [],
                    loc: createLocation(0, 0),
                    type: "Script",
                };

                expect(isFunctionDeclarationNode(node)).toBeFalsy();
            });
        });

        describe(isScriptBlockNode, () => {
            it("returns true for ScriptBlock nodes", () => {
                const node: ScriptBlockNode = {
                    body: [],
                    loc: createLocation(0, 2),
                    type: "ScriptBlock",
                };

                expect(isScriptBlockNode(node)).toBeTruthy();
            });

            it("returns false for non-ScriptBlock nodes", () => {
                const node: ScriptNode = {
                    body: [],
                    loc: createLocation(0, 0),
                    type: "Script",
                };

                expect(isScriptBlockNode(node)).toBeFalsy();
            });
        });

        describe(isHashtableNode, () => {
            it("returns true for Hashtable nodes", () => {
                const node: HashtableNode = {
                    entries: [],
                    loc: createLocation(0, 2),
                    type: "Hashtable",
                };

                expect(isHashtableNode(node)).toBeTruthy();
            });

            it("returns false for non-Hashtable nodes", () => {
                const node: ScriptNode = {
                    body: [],
                    loc: createLocation(0, 0),
                    type: "Script",
                };

                expect(isHashtableNode(node)).toBeFalsy();
            });
        });

        describe(isArrayLiteralNode, () => {
            it("returns true for ArrayLiteral nodes", () => {
                const node: ArrayLiteralNode = {
                    elements: [],
                    kind: "implicit",
                    loc: createLocation(0, 2),
                    type: "ArrayLiteral",
                };

                expect(isArrayLiteralNode(node)).toBeTruthy();
            });

            it("returns false for non-ArrayLiteral nodes", () => {
                const node: ScriptNode = {
                    body: [],
                    loc: createLocation(0, 0),
                    type: "Script",
                };

                expect(isArrayLiteralNode(node)).toBeFalsy();
            });
        });

        describe(isCommentNode, () => {
            it("returns true for Comment nodes", () => {
                const node: CommentNode = {
                    inline: false,
                    loc: createLocation(0, 6),
                    style: "line",
                    type: "Comment",
                    value: "# test",
                };

                expect(isCommentNode(node)).toBeTruthy();
            });

            it("returns false for non-Comment nodes", () => {
                const node: ScriptNode = {
                    body: [],
                    loc: createLocation(0, 0),
                    type: "Script",
                };

                expect(isCommentNode(node)).toBeFalsy();
            });
        });

        describe(isHereStringNode, () => {
            it("returns true for HereString nodes", () => {
                const node: HereStringNode = {
                    loc: createLocation(0, 10),
                    quote: "single",
                    type: "HereString",
                    value: "@'\ntest\n'@",
                };

                expect(isHereStringNode(node)).toBeTruthy();
            });

            it("returns false for non-HereString nodes", () => {
                const node: ScriptNode = {
                    body: [],
                    loc: createLocation(0, 0),
                    type: "Script",
                };

                expect(isHereStringNode(node)).toBeFalsy();
            });
        });
    });
});
