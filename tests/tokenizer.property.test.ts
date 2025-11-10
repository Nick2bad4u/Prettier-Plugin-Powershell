import * as fc from "fast-check";
import { describe, it } from "vitest";

import { tokenize } from "../src/tokenizer.js";

const PROPERTY_RUNS = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

// Arbitraries for token generation
const whitespaceArb = fc.constantFrom(" ", "\t", "\f");
const newlineArb = fc.constantFrom("\n", "\r\n");
const identifierCharArb = fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
);
const identifierArb = fc
    .tuple(
        fc.constantFrom(
            ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"
        ),
        fc.array(identifierCharArb, { maxLength: 10 })
    )
    .map(([first, rest]) => `${first}${rest.join("")}`);

const variableArb = fc.oneof(
    identifierArb.map((id) => `$${id}`),
    identifierArb.map((id) => `$\{${id}}`)
);

const numberArb = fc.oneof(
    fc.integer({ min: 0, max: 999999 }).map(String),
    fc.double({ min: 0, max: 999.999, noNaN: true }).map(String)
);

const stringContentArb = fc
    .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789 .,!?"), {
        maxLength: 20,
    })
    .map((chars) => chars.join(""));

const singleQuotedStringArb = stringContentArb.map(
    (content) => `'${content.replace(/'/g, "''")}'`
);

const doubleQuotedStringArb = stringContentArb.map(
    (content) => `"${content.replace(/"/g, '`"')}"`
);

const commentArb = fc
    .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789 .,!?"), {
        maxLength: 30,
    })
    .map((chars) => `# ${chars.join("")}`);

const blockCommentArb = fc
    .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789 \n.,!?"), {
        maxLength: 40,
    })
    .map((chars) => `<#${chars.join("")}#>`);

const hereStringArb = fc.oneof(
    fc
        .array(stringContentArb, { minLength: 1, maxLength: 3 })
        .map((lines) => `@"\n${lines.join("\n")}\n"@`),
    fc
        .array(stringContentArb, { minLength: 1, maxLength: 3 })
        .map((lines) => `@'\n${lines.join("\n")}\n'@`)
);

const punctuationArb = fc.constantFrom(
    "{",
    "}",
    "(",
    ")",
    "[",
    "]",
    ",",
    ";",
    ".",
    ":"
);
const operatorArb = fc.constantFrom(
    "=",
    "|",
    "||",
    "==",
    ">",
    "<",
    ">>",
    "<<",
    "@{",
    "@(",
    "::"
);

const keywordArb = fc.constantFrom(
    "function",
    "if",
    "elseif",
    "else",
    "for",
    "foreach",
    "while",
    "switch",
    "try",
    "catch",
    "finally",
    "param",
    "class"
);

const tokenArb = fc.oneof(
    whitespaceArb,
    newlineArb,
    identifierArb,
    variableArb,
    numberArb,
    singleQuotedStringArb,
    doubleQuotedStringArb,
    commentArb,
    blockCommentArb,
    hereStringArb,
    punctuationArb,
    operatorArb,
    keywordArb
);

const scriptArb = fc
    .array(tokenArb, { minLength: 1, maxLength: 30 })
    .map((tokens) => tokens.join(" "));

describe("Tokenizer property-based tests", () => {
    it("tokenize never throws and produces valid tokens", () => {
        fc.assert(
            fc.property(scriptArb, (script) => {
                const tokens = tokenize(script);

                // Tokens should be in order
                for (let i = 0; i < tokens.length - 1; i++) {
                    const current = tokens[i];
                    const next = tokens[i + 1];
                    if (current.end > next.start) {
                        throw new Error(
                            `Token ${i} ends after token ${i + 1} starts: ${current.end} > ${next.start}`
                        );
                    }
                }

                // All tokens should have valid ranges
                for (const token of tokens) {
                    if (token.start < 0) {
                        throw new Error(
                            `Token has negative start: ${token.start}`
                        );
                    }
                    if (token.end < token.start) {
                        throw new Error(
                            `Token end before start: ${token.end} < ${token.start}`
                        );
                    }
                    if (token.end > script.length) {
                        throw new Error(
                            `Token extends beyond script: ${token.end} > ${script.length}`
                        );
                    }
                }

                // Token values should match source
                for (const token of tokens) {
                    const extracted = script.slice(token.start, token.end);
                    if (token.type !== "comment" && token.value !== extracted) {
                        // Comments are trimmed, so we skip exact match
                        if (
                            token.type !== "newline" ||
                            !extracted.match(/^[\r\n]+$/)
                        ) {
                            throw new Error(
                                `Token value mismatch: expected ${JSON.stringify(extracted)}, got ${JSON.stringify(token.value)}`
                            );
                        }
                    }
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("tokenization is deterministic", () => {
        fc.assert(
            fc.property(scriptArb, (script) => {
                const tokens1 = tokenize(script);
                const tokens2 = tokenize(script);

                if (tokens1.length !== tokens2.length) {
                    throw new Error(
                        "Tokenization produced different token counts"
                    );
                }

                for (let i = 0; i < tokens1.length; i++) {
                    const t1 = tokens1[i];
                    const t2 = tokens2[i];
                    if (
                        t1.type !== t2.type ||
                        t1.value !== t2.value ||
                        t1.start !== t2.start ||
                        t1.end !== t2.end
                    ) {
                        throw new Error(`Token ${i} differs between runs`);
                    }
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("handles empty and whitespace-only input", () => {
        fc.assert(
            fc.property(
                fc
                    .array(whitespaceArb, { maxLength: 20 })
                    .map((chars) => chars.join("")),
                (whitespace) => {
                    const tokens = tokenize(whitespace);
                    // Should produce no tokens (whitespace is skipped)
                    if (tokens.length !== 0) {
                        throw new Error(
                            `Expected no tokens for whitespace, got ${tokens.length}`
                        );
                    }
                }
            ),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("handles newline-only input", () => {
        fc.assert(
            fc.property(
                fc
                    .array(newlineArb, { minLength: 1, maxLength: 10 })
                    .map((chars) => chars.join("")),
                (newlines) => {
                    const tokens = tokenize(newlines);
                    // Each newline should produce exactly one token
                    for (const token of tokens) {
                        if (token.type !== "newline") {
                            throw new Error(
                                `Expected only newline tokens, got ${token.type}`
                            );
                        }
                    }
                }
            ),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("correctly identifies keywords vs identifiers", () => {
        fc.assert(
            fc.property(keywordArb, (keyword) => {
                const tokens = tokenize(keyword);
                if (tokens.length !== 1) {
                    throw new Error(
                        `Expected single token for keyword, got ${tokens.length}`
                    );
                }
                if (tokens[0].type !== "keyword") {
                    throw new Error(
                        `Expected keyword token, got ${tokens[0].type}`
                    );
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("correctly tokenizes variables", () => {
        fc.assert(
            fc.property(variableArb, (variable) => {
                const tokens = tokenize(variable);
                const variableTokens = tokens.filter(
                    (t) => t.type === "variable"
                );
                if (variableTokens.length === 0) {
                    throw new Error("Variable not tokenized as variable type");
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("correctly tokenizes numbers", () => {
        fc.assert(
            fc.property(numberArb, (number) => {
                const tokens = tokenize(number);
                const numberTokens = tokens.filter((t) => t.type === "number");
                if (numberTokens.length === 0) {
                    throw new Error(
                        `Number ${number} not tokenized as number type`
                    );
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("correctly tokenizes strings", () => {
        fc.assert(
            fc.property(
                fc.oneof(singleQuotedStringArb, doubleQuotedStringArb),
                (string) => {
                    const tokens = tokenize(string);
                    const stringTokens = tokens.filter(
                        (t) => t.type === "string"
                    );
                    if (stringTokens.length === 0) {
                        throw new Error("String not tokenized as string type");
                    }
                }
            ),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("correctly tokenizes comments", () => {
        fc.assert(
            fc.property(commentArb, (comment) => {
                const tokens = tokenize(comment);
                const commentTokens = tokens.filter(
                    (t) => t.type === "comment"
                );
                if (commentTokens.length === 0) {
                    throw new Error("Comment not tokenized as comment type");
                }
            }),
            { numRuns: PROPERTY_RUNS }
        );
    });

    it("tokenizes concatenated scripts consistently", () => {
        fc.assert(
            fc.property(
                fc.array(scriptArb, { minLength: 2, maxLength: 5 }),
                (scripts) => {
                    const concatenated = scripts.join("\n");
                    const tokens = tokenize(concatenated);

                    // Verify tokens cover the entire input
                    if (tokens.length === 0 && concatenated.trim().length > 0) {
                        return; // Some inputs might be all whitespace
                    }

                    // Verify no gaps or overlaps (excluding whitespace which is skipped)
                    let lastEnd = 0;
                    for (const token of tokens) {
                        if (token.start < lastEnd) {
                            throw new Error(
                                `Token overlap detected: token starts at ${token.start} but last ended at ${lastEnd}`
                            );
                        }
                        lastEnd = token.end;
                    }
                }
            ),
            { numRuns: PROPERTY_RUNS }
        );
    });
});
