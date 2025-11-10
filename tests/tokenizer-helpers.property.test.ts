import * as fc from "fast-check";
import { describe, it } from "vitest";

import { createLocation } from "../src/ast.js";
import type { HereStringNode } from "../src/ast.js";
import { normalizeHereString } from "../src/tokenizer.js";

const PROPERTY_RUNS = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

describe("Tokenizer helper function property tests", () => {
    describe("normalizeHereString", () => {
        it("handles here-strings with various line counts", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 10 }),
                    fc.constantFrom("\n", "\r\n"),
                    (lineCount, lineEnding) => {
                        const lines = Array.from(
                            { length: lineCount },
                            (_, i) => `line${i}`
                        );
                        const value = lines.join(lineEnding);

                        const node: HereStringNode = {
                            type: "HereString",
                            value,
                            quote: "double",
                            loc: createLocation(0, value.length),
                        };

                        const result = normalizeHereString(node);

                        // Should not throw
                        if (typeof result !== "string") {
                            throw new Error("Result should be a string");
                        }

                        // If 2 or fewer lines, should return original
                        if (lineCount <= 2) {
                            if (result !== value) {
                                throw new Error(
                                    `Should preserve <= 2 lines: got ${result}, expected ${value}`
                                );
                            }
                        } else {
                            // If more than 2 lines, should strip first and last
                            const expected = lines.slice(1, -1).join("\n");
                            if (result !== expected) {
                                throw new Error(
                                    `Should strip first/last lines: got ${result}, expected ${expected}`
                                );
                            }
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles here-strings with empty lines", () => {
            fc.assert(
                fc.property(
                    fc.array(fc.constantFrom("", "line", "  spaces  "), {
                        minLength: 0,
                        maxLength: 5,
                    }),
                    (lines) => {
                        const value = lines.join("\n");

                        const node: HereStringNode = {
                            type: "HereString",
                            value,
                            quote: "single",
                            loc: createLocation(0, value.length),
                        };

                        const result = normalizeHereString(node);

                        if (typeof result !== "string") {
                            throw new Error("Result should be a string");
                        }

                        // Should preserve content
                        if (lines.length <= 2) {
                            if (result !== value) {
                                throw new Error(
                                    "Should preserve short content"
                                );
                            }
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles here-strings with mixed line endings", () => {
            fc.assert(
                fc.property(
                    fc.array(fc.string({ maxLength: 10 }), {
                        minLength: 3,
                        maxLength: 5,
                    }),
                    (lines) => {
                        // Mix \n and \r\n
                        const parts: string[] = [];
                        for (let i = 0; i < lines.length; i++) {
                            parts.push(lines[i]);
                            if (i < lines.length - 1) {
                                parts.push(i % 2 === 0 ? "\r\n" : "\n");
                            }
                        }
                        const value = parts.join("");

                        const node: HereStringNode = {
                            type: "HereString",
                            value,
                            quote: "double",
                            loc: createLocation(0, value.length),
                        };

                        const result = normalizeHereString(node);

                        // Should not throw
                        if (typeof result !== "string") {
                            throw new Error("Result should be a string");
                        }

                        // Result should always use \n
                        if (result.includes("\r")) {
                            throw new Error(
                                "Normalized result should not contain \\r"
                            );
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("handles edge cases gracefully", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(
                        "",
                        "\n",
                        "\r\n",
                        "single line",
                        "line1\nline2",
                        "line1\r\nline2",
                        "\n\n",
                        "\r\n\r\n",
                        "first\nmiddle\nlast",
                        "first\r\nmiddle\r\nlast"
                    ),
                    (value) => {
                        const node: HereStringNode = {
                            type: "HereString",
                            value,
                            quote: "double",
                            loc: createLocation(0, value.length),
                        };

                        // Should not throw
                        const result = normalizeHereString(node);

                        if (typeof result !== "string") {
                            throw new Error("Result should be a string");
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("preserves quote type in node", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom("double", "single"),
                    fc.string({ maxLength: 20 }),
                    (quote, value) => {
                        const node: HereStringNode = {
                            type: "HereString",
                            value,
                            quote,
                            loc: createLocation(0, value.length),
                        };

                        // Function should not modify the node
                        const originalQuote = node.quote;
                        normalizeHereString(node);

                        if (node.quote !== originalQuote) {
                            throw new Error("Function should not modify node");
                        }
                    }
                ),
                { numRuns: PROPERTY_RUNS }
            );
        });

        it("returns consistent results for identical inputs", () => {
            fc.assert(
                fc.property(fc.string({ maxLength: 50 }), (value) => {
                    const node: HereStringNode = {
                        type: "HereString",
                        value,
                        quote: "double",
                        loc: createLocation(0, value.length),
                    };

                    const result1 = normalizeHereString(node);
                    const result2 = normalizeHereString(node);

                    if (result1 !== result2) {
                        throw new Error("Function should be deterministic");
                    }
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });
});
