import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    type BaseNode,
    type BlankLineNode,
    cloneNode,
    type CommentNode,
    createLocation,
    isNodeType,
    type SourceLocation,
} from "../src/ast.js";

const { env: testEnv } = process;

const PROPERTY_RUNS = Number.parseInt(
    testEnv.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

// Arbitraries for AST node creation
const validSourceLocationArb: fc.Arbitrary<SourceLocation> = fc
    .tuple(
        fc.integer({ max: 10_000, min: 0 }),
        fc.integer({ max: 10_000, min: 0 })
    )
    .map(([a, b]) => ({
        end: Math.max(a, b),
        start: Math.min(a, b),
    }));

const commentNodeArb: fc.Arbitrary<CommentNode> = fc.record({
    inline: fc.boolean(),
    loc: validSourceLocationArb,
    style: fc.constantFrom("line" as const, "block" as const),
    type: fc.constant("Comment" as const),
    value: fc.string({ maxLength: 50 }),
});

const blankLineNodeArb: fc.Arbitrary<BlankLineNode> = fc.record({
    count: fc.integer({ max: 10, min: 1 }),
    loc: validSourceLocationArb,
    type: fc.constant("BlankLine" as const),
});

const baseNodeArb: fc.Arbitrary<BaseNode> = fc.oneof(
    commentNodeArb,
    blankLineNodeArb
);

describe("aST utility property-based tests", () => {
    describe(createLocation, () => {
        it("always produces valid SourceLocation", () => {
            expect.hasAssertions();

            fc.assert(
                fc.property(
                    fc.integer({ max: 10_000, min: -1000 }),
                    fc.option(fc.integer({ max: 10_000, min: -1000 }), {
                        nil: undefined,
                    }),
                    (start, end) => {
                        const loc =
                            end === undefined
                                ? createLocation(start)
                                : createLocation(start, end);

                        // Start should be non-negative
                        if (loc.start < 0) {
                            throw new Error(`Invalid start: ${loc.start}`);
                        }

                        // End should be >= start
                        if (loc.end < loc.start) {
                            throw new Error(
                                `End ${loc.end} is before start ${loc.start}`
                            );
                        }

                        // Values should be integers
                        if (
                            !Number.isInteger(loc.start) ||
                            !Number.isInteger(loc.end)
                        ) {
                            throw new TypeError(
                                "Start and end must be integers"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles single argument correctly", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(fc.integer({ max: 10_000, min: 0 }), (position) => {
                    const loc = createLocation(position);

                    if (loc.start !== position || loc.end !== position) {
                        throw new Error(
                            `Expected {start: ${position}, end: ${position}}, got {start: ${loc.start}, end: ${loc.end}}`
                        );
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("normalizes negative start to 0", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(
                    fc.integer({ max: -1, min: -1000 }),
                    (negativeStart) => {
                        const loc = createLocation(negativeStart);

                        if (loc.start !== 0) {
                            throw new Error(
                                `Negative start not normalized to 0: ${loc.start}`
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("ensures end >= start", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(
                    fc.integer({ max: 10_000, min: 0 }),
                    fc.integer({ max: 10_000, min: 0 }),
                    (a, b) => {
                        const loc = createLocation(a, b);

                        if (loc.end < loc.start) {
                            throw new Error(
                                `End ${loc.end} is before start ${loc.start}`
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("floors non-integer values", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(
                    fc.double({ max: 10_000, min: 0, noNaN: true }),
                    (value) => {
                        const loc = createLocation(value);

                        if (!Number.isInteger(loc.start)) {
                            throw new TypeError(
                                `Start should be integer, got ${loc.start}`
                            );
                        }
                        if (!Number.isInteger(loc.end)) {
                            throw new TypeError(
                                `End should be integer, got ${loc.end}`
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles NaN and Infinity gracefully", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(
                    fc.constantFrom(Number.NaN, Infinity, -Infinity),
                    fc.option(
                        fc.constantFrom(Number.NaN, Infinity, -Infinity),
                        {
                            nil: undefined,
                        }
                    ),
                    (start, end) => {
                        const loc =
                            end === undefined
                                ? createLocation(start)
                                : createLocation(start, end);

                        // Should produce valid location even with invalid input
                        if (
                            !Number.isFinite(loc.start) ||
                            !Number.isFinite(loc.end)
                        ) {
                            throw new TypeError(
                                "createLocation should handle NaN/Infinity"
                            );
                        }
                        if (loc.start < 0) {
                            throw new Error("Start should be non-negative");
                        }
                        if (loc.end < loc.start) {
                            throw new Error("End should be >= start");
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe(isNodeType, () => {
        it("correctly identifies node types", () => {
            expect.hasAssertions();

            fc.assert(
                fc.property(baseNodeArb, (node) => {
                    if (node.type === "Comment") {
                        if (!isNodeType(node, "Comment")) {
                            throw new Error("Failed to identify Comment node");
                        }
                        if (isNodeType(node, "BlankLine")) {
                            throw new Error(
                                "Incorrectly identified Comment as BlankLine"
                            );
                        }
                    } else if (node.type === "BlankLine") {
                        if (!isNodeType(node, "BlankLine")) {
                            throw new Error(
                                "Failed to identify BlankLine node"
                            );
                        }
                        if (isNodeType(node, "Comment")) {
                            throw new Error(
                                "Incorrectly identified BlankLine as Comment"
                            );
                        }
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("returns false for null and undefined", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(
                    fc.constantFrom("Comment", "BlankLine", "Pipeline"),
                    (type) => {
                        if (isNodeType(null, type as never)) {
                            throw new Error(
                                "isNodeType should return false for null"
                            );
                        }
                        if (isNodeType(undefined, type as never)) {
                            throw new Error(
                                "isNodeType should return false for undefined"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles objects without type property", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(
                    fc.record({
                        loc: validSourceLocationArb,
                        value: fc.string(),
                    }),
                    (obj) => {
                        if (isNodeType(obj as never, "Comment")) {
                            throw new Error(
                                "isNodeType should return false for object without type"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe(cloneNode, () => {
        it("creates a shallow copy of the node", () => {
            expect.hasAssertions();

            fc.assert(
                fc.property(baseNodeArb, (node) => {
                    const cloned = cloneNode(node);

                    // Should not be the same reference
                    if (cloned === node) {
                        throw new Error("cloneNode should create a new object");
                    }

                    // Location should not be the same reference
                    if (cloned.loc === node.loc) {
                        throw new Error(
                            "cloneNode should clone the location object"
                        );
                    }

                    // But values should be equal
                    if (cloned.type !== node.type) {
                        throw new Error("Type should be cloned");
                    }
                    if (
                        cloned.loc.start !== node.loc.start ||
                        cloned.loc.end !== node.loc.end
                    ) {
                        throw new Error("Location values should be cloned");
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("preserves all node properties", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(commentNodeArb, (node) => {
                    const cloned = cloneNode(node);

                    if (cloned.value !== node.value) {
                        throw new Error("Comment value not preserved");
                    }
                    if (cloned.inline !== node.inline) {
                        throw new Error("Comment inline not preserved");
                    }
                    if (cloned.style !== node.style) {
                        throw new Error("Comment style not preserved");
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("mutating clone does not affect original", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(commentNodeArb, (node) => {
                    const cloned = cloneNode(node);

                    // Mutate the clone
                    cloned.loc.start = 999_999;
                    cloned.loc.end = 999_999;

                    // Original should be unchanged
                    if (
                        node.loc.start === 999_999 ||
                        node.loc.end === 999_999
                    ) {
                        throw new Error("Mutating clone affected original");
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("works with BlankLine nodes", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(blankLineNodeArb, (node) => {
                    const cloned = cloneNode(node);

                    if (cloned === node) {
                        throw new Error("cloneNode should create a new object");
                    }
                    if (cloned.count !== node.count) {
                        throw new Error("Count not preserved");
                    }
                    if (cloned.type !== "BlankLine") {
                        throw new Error("Type not preserved");
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    describe("location invariants", () => {
        it("valid locations maintain their properties through operations", () => {
            expect.hasAssertions();

            fc.assert(
                fc.property(validSourceLocationArb, (loc) => {
                    // Creating a new location from valid values should preserve validity
                    const newLoc = createLocation(loc.start, loc.end);

                    if (newLoc.start !== loc.start || newLoc.end !== loc.end) {
                        throw new Error(
                            "createLocation did not preserve valid values"
                        );
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("locations are always valid regardless of input order", () => {
            expect.hasAssertions();
            expect.hasAssertions();

            fc.assert(
                fc.property(
                    fc.integer({ max: 10_000, min: 0 }),
                    fc.integer({ max: 10_000, min: 0 }),
                    (a, b) => {
                        const loc1 = createLocation(a, b);
                        const loc2 = createLocation(b, a);

                        // Both should be valid
                        if (loc1.end < loc1.start) {
                            throw new Error("Location 1 invalid");
                        }
                        if (loc2.end < loc2.start) {
                            throw new Error("Location 2 invalid");
                        }

                        // CreateLocation(a, b) should have start=a and end = max(a, b)
                        // createLocation(b, a) should have start=b and end = max(a, b)
                        if (loc1.start !== a) {
                            throw new Error(
                                `loc1.start should be ${a}, got ${loc1.start}`
                            );
                        }
                        if (loc2.start !== b) {
                            throw new Error(
                                `loc2.start should be ${b}, got ${loc2.start}`
                            );
                        }
                        if (loc1.end !== Math.max(a, b)) {
                            throw new Error(
                                `loc1.end should be ${Math.max(a, b)}, got ${loc1.end}`
                            );
                        }
                        if (loc2.end !== Math.max(a, b)) {
                            throw new Error(
                                `loc2.end should be ${Math.max(a, b)}, got ${loc2.end}`
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });
});
