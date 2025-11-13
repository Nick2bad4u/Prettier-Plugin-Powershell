import * as fc from "fast-check";
import type { Options, ParserOptions } from "prettier";
import { describe, it } from "vitest";

import type { BaseNode, SourceLocation } from "../src/ast.js";
import plugin from "../src/index.js";
import { parsePowerShell } from "../src/parser.js";
import { tokenize, type Token } from "../src/tokenizer.js";

import { structuredScriptArbitrary } from "./property/arbitraries.js";
import { formatAndAssert } from "./utils/format-and-assert.js";
import { isPowerShellParsable } from "./utils/powershell.js";
import { withProgress } from "./utils/progress.js";

const PROPERTY_RUNS = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_RUNS ?? "150",
    10
);

const prettierConfig: Options = {
    parser: "powershell",
    plugins: [plugin],
    filepath: "property.ps1",
};

const createParserOptions = (
    overrides: Record<string, unknown> = {}
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

const assertTokenOrder = (tokens: Token[], sourceLength: number): void => {
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
    node: BaseNode,
    sourceLength: number,
    parentLoc: SourceLocation | null = null
): void => {
    const { loc } = node;
    if (loc.start < 0 || loc.end < loc.start || loc.end > sourceLength) {
        throw new Error(
            `invalid location bounds for ${node.type}: ${JSON.stringify(loc)}`
        );
    }

    if (parentLoc) {
        if (loc.start < parentLoc.start || loc.end > parentLoc.end) {
            throw new Error(
                `child location outside parent range for ${node.type}: child=${JSON.stringify(loc)} parent=${JSON.stringify(parentLoc)}`
            );
        }
    }

    for (const value of Object.values(
        node as unknown as Record<string, unknown>
    )) {
        if (!value) {
            continue;
        }
        if (Array.isArray(value)) {
            for (const element of value) {
                if (isNode(element)) {
                    assertLocationIntegrity(element, sourceLength, loc);
                }
            }
            continue;
        }
        if (isNode(value)) {
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

describe("PowerShell parser property-based tests", () => {
    it("parses generated scripts without throwing and maintains location invariants", () => {
        return withProgress("parser.location", PROPERTY_RUNS, (tracker) => {
            fc.assert(
                fc.property(structuredScriptArbitrary, (script) => {
                    tracker.advance();
                    assertParserOutput(script);
                }),
                { numRuns: PROPERTY_RUNS }
            );
        });
    });

    it("formatting generated scripts remains idempotent and parseable", async () => {
        const numRuns = Math.max(25, Math.floor(PROPERTY_RUNS / 2));
        await withProgress("parser.idempotence", numRuns, async (tracker) => {
            await fc.assert(
                fc.asyncProperty(structuredScriptArbitrary, async (script) => {
                    tracker.advance();
                    const isValidPowerShell = await isPowerShellParsable(
                        script,
                        "parser.property.original"
                    );
                    fc.pre(isValidPowerShell);
                    const options = createParserOptions();
                    const hasTryCatch =
                        /\btry\b/i.test(script) && /\bcatch\b/i.test(script);
                    const formatted = await formatAndAssert(
                        script,
                        prettierConfig,
                        {
                            id: "parser.property.formatted",
                            skipParse: hasTryCatch || !isValidPowerShell,
                        }
                    );
                    const formattedTwice = await formatAndAssert(
                        formatted,
                        prettierConfig,
                        {
                            id: "parser.property.formattedTwice",
                            skipParse: hasTryCatch || !isValidPowerShell,
                        }
                    );
                    // formatAndAssert already asserted parse when applicable
                    if (formatted !== formattedTwice) {
                        throw new Error(
                            `Formatter is not idempotent under generated input.\n` +
                                `Original:\n${script}\n\nFormatted:\n${formatted}\n\nFormatted twice:\n${formattedTwice}`
                        );
                    }

                    assertParserOutput(formatted);
                    parsePowerShell(script, options);
                    parsePowerShell(formattedTwice, options);
                }),
                { numRuns }
            );
        });
    });
});
