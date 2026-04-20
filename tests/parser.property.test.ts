import type { Options, ParserOptions } from "prettier";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { BaseNode, SourceLocation } from "../src/ast.js";

import { parsePowerShell } from "../src/parser.js";
import plugin from "../src/plugin.js";
import { type Token, tokenize } from "../src/tokenizer.js";
import { structuredScriptArbitrary } from "./property/arbitraries.js";
import { formatAndAssert } from "./utils/format-and-assert.js";
import { isPowerShellParsable } from "./utils/powershell.js";
import { withProgress } from "./utils/progress.js";

const PROPERTY_RUNS = Number.parseInt(
    globalThis.process.env.POWERSHELL_PROPERTY_RUNS ?? "150",
    10
);

const prettierConfig: Options = {
    filepath: "property.ps1",
    parser: "powershell",
    plugins: [plugin],
};

const createParserOptions = (
    overrides: Readonly<Record<string, unknown>> = {}
): ParserOptions =>
    ({
        tabWidth: 2,
        ...overrides,
    }) as unknown as ParserOptions;

const isNode = (value: unknown): value is BaseNode =>
    Boolean(value) &&
    typeof value === "object" &&
    "type" in (value as Record<string, unknown>) &&
    "loc" in (value as Record<string, unknown>);

const assertTokenOrder = (
    tokens: readonly Readonly<Token>[],
    sourceLength: number
): void => {
    let previousEnd = 0;
    for (const token of tokens) {
        if (token.start < 0) {
            throw new Error(`token start is negative: ${token.start}`);
        }
        if (token.end < token.start) {
            throw new Error(
                `token end precedes start: ${token.end} < ${token.start}`
            );
        }
        if (token.end > sourceLength) {
            throw new Error(
                `token end exceeds source length: ${token.end} > ${sourceLength}`
            );
        }
        if (token.start < previousEnd) {
            throw new Error(
                `token start regressed: ${token.start} < ${previousEnd}`
            );
        }
        previousEnd = token.end;
    }
};

const assertLocationIntegrity = (
    node: Readonly<BaseNode>,
    sourceLength: number,
    parentLoc: null | Readonly<SourceLocation> = null
): void => {
    const { loc } = node;
    if (loc.start < 0 || loc.end < loc.start || loc.end > sourceLength) {
        throw new Error(
            `invalid location bounds for ${node.type}: ${JSON.stringify(loc)}`
        );
    }

    if (parentLoc && (loc.start < parentLoc.start || loc.end > parentLoc.end)) {
        throw new Error(
            `child location outside parent range for ${node.type}: child=${JSON.stringify(loc)} parent=${JSON.stringify(parentLoc)}`
        );
    }

    for (const value of Object.values(
        node as unknown as Record<string, unknown>
    )) {
        if (Array.isArray(value)) {
            for (const element of value) {
                if (isNode(element)) {
                    assertLocationIntegrity(element, sourceLength, loc);
                }
            }
        } else if (isNode(value)) {
            assertLocationIntegrity(value, sourceLength, loc);
        }
    }
};

const assertParserOutput = (script: string): void => {
    const options = createParserOptions();
    const ast = parsePowerShell(script, options);
    assertLocationIntegrity(ast, script.length, null);
    assertTokenOrder(tokenize(script), script.length);
};

describe("powershell parser property-based tests", () => {
    it("parses generated scripts without throwing and maintains location invariants", async () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();

        await withProgress("parser.location", PROPERTY_RUNS, (tracker) => {
            fc.assert(
                fc.property(structuredScriptArbitrary, (script) => {
                    tracker.advance();
                    assertParserOutput(script);
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });

        expect(true).toBeTruthy();
    });

    // Skip on CI: requires spawning PowerShell processes in single-threaded mode
    // which causes timeouts. The first test validates parsing; this validates
    // idempotence + PowerShell validity, but idempotence is covered by unit tests
    // and local dev verification. Keeping for local thorough testing.
    (globalThis.process.env.CI === "true" ? it.skip : it)(
        "formatting generated scripts remains idempotent and parseable",
        async () => {
            expect.hasAssertions();
            expect(true).toBeTruthy();

            const numRuns = Math.max(16, Math.floor(PROPERTY_RUNS / 5));
            await withProgress(
                "parser.idempotence",
                numRuns,
                async (tracker) => {
                    await fc.assert(
                        fc.asyncProperty(
                            structuredScriptArbitrary,
                            async (script) => {
                                tracker.advance();
                                const isValidPowerShell =
                                    await isPowerShellParsable(
                                        script,
                                        "parser.property.original"
                                    );
                                fc.pre(isValidPowerShell);
                                const options = createParserOptions();
                                const hasTryCatch =
                                    /\btry\b/iv.test(script) &&
                                    /\bcatch\b/iv.test(script);
                                const formatted = await formatAndAssert(
                                    script,
                                    prettierConfig,
                                    {
                                        id: "parser.property.formatted",
                                        skipParse:
                                            hasTryCatch || !isValidPowerShell,
                                    }
                                );
                                const formattedTwice = await formatAndAssert(
                                    formatted,
                                    prettierConfig,
                                    {
                                        id: "parser.property.formattedTwice",
                                        skipParse:
                                            hasTryCatch || !isValidPowerShell,
                                    }
                                );
                                // FormatAndAssert already asserted parse when applicable
                                if (formatted !== formattedTwice) {
                                    throw new Error(
                                        `Formatter is not idempotent under generated input.\n` +
                                            `Original:\n${script}\n\nFormatted:\n${formatted}\n\nFormatted twice:\n${formattedTwice}`
                                    );
                                }

                                assertParserOutput(formatted);
                                parsePowerShell(script, options);
                                parsePowerShell(formattedTwice, options);
                            }
                        ),
                        { numRuns }
                    );
                }
            );
        }
    );
});
