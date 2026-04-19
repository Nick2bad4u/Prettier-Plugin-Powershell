import type { Options } from "prettier";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";
import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";
import { withProgress } from "./utils/progress.js";

const { env: testEnv } = process;

const PROPERTY_RUNS = Number.parseInt(
    testEnv.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

const baseOptions: Options = {
    filepath: "call-operator.ps1",
    parser: "powershell",
    plugins: [plugin],
};

const lowerAlphabet = Array.from({ length: 26 }, (_, index) =>
    String.fromCodePoint(97 + index)
);
const upperAlphabet = Array.from({ length: 26 }, (_, index) =>
    String.fromCodePoint(65 + index)
);
const decimalDigits = Array.from({ length: 10 }, (_, index) =>
    String.fromCodePoint(48 + index)
);
const identifierStartChars = [...lowerAlphabet, ...upperAlphabet];
const identifierChars = [
    ...identifierStartChars,
    ...decimalDigits,
    "_",
];
const safeStringChars = [
    ...identifierChars,
    " ",
    "-",
];

const REGEXP_SPECIAL_CHARACTERS = new Set([
    "$",
    "(",
    ")",
    "*",
    "+",
    ".",
    "?",
    "[",
    "\\",
    "]",
    "^",
    "{",
    "|",
    "}",
]);

const escapeForRegExp = (value: string): string => {
    const segmenter = new Intl.Segmenter();
    return [...segmenter.segment(value)]
        .map(({ segment: character }) =>
            REGEXP_SPECIAL_CHARACTERS.has(character)
                ? `\\${character}`
                : character
        )
        .join("");
};

const identifierStartArb = fc.constantFrom(...identifierStartChars);
const identifierCharArb = fc.constantFrom(...identifierChars);

const identifierArb = fc
    .tuple(identifierStartArb, fc.array(identifierCharArb, { maxLength: 8 }))
    .map(([first, rest]) => `${first}${rest.join("")}`);

const variableArb = identifierArb.map((name) => `$${name}`);

const safeStringCharArb = fc.constantFrom(...safeStringChars);

const safeStringArb = fc
    .array(safeStringCharArb, { maxLength: 20, minLength: 0 })
    .map((chars) => chars.join("").replaceAll('"', ""));

const commandNameArb = fc.constantFrom(
    "Write-Output",
    "Write-Host",
    "Get-Item",
    "Get-ChildItem"
);

describe("call operator property-based tests", () => {
    it("preserves script-block call operator at line start", async () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();

        await withProgress(
            "callOperator.scriptBlock",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        variableArb,
                        identifierArb,
                        safeStringArb,
                        async (scriptBlockVar, paramName, argValue) => {
                            tracker.advance();

                            const script = `
${scriptBlockVar} = {
    param($${paramName})
    "Hello $${paramName}"
}
& ${scriptBlockVar} -${paramName} "${argValue}"
`;

                            const formatted = await formatAndAssertRoundTrip(
                                script,
                                baseOptions,
                                {
                                    id: "callOperator.scriptBlock",
                                }
                            );

                            const lines = formatted.split(/\r?\n/v);
                            const invokeLine = lines.find(
                                (line) =>
                                    line.includes(scriptBlockVar) &&
                                    line.includes("&")
                            );

                            if (invokeLine === undefined) {
                                throw new Error(
                                    `Formatted output is missing invocation line for ${scriptBlockVar}.
${formatted}`
                                );
                            }

                            const trimmed = invokeLine.trimStart();
                            if (!trimmed.startsWith("&")) {
                                throw new Error(
                                    `Call operator '&' is no longer at the start of the invocation line.
Line: ${invokeLine}
Formatted script:
${formatted}`
                                );
                            }
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("keeps call operator on command expressions", async () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();

        await withProgress(
            "callOperator.commandExpression",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        commandNameArb,
                        safeStringArb,
                        async (cmdName, argValue) => {
                            tracker.advance();

                            const script = `& (Get-Command ${cmdName}) "${argValue}"`;

                            const formatted = await formatAndAssertRoundTrip(
                                script,
                                baseOptions,
                                {
                                    id: "callOperator.commandExpression",
                                }
                            );

                            const escapedCmd = escapeForRegExp(cmdName);
                            const hasMatch = formatted
                                .split(/\r?\n/v)
                                .some((line) => {
                                    const trimmed = line.trimStart();
                                    return (
                                        trimmed.startsWith("& (Get-Command ") &&
                                        trimmed.includes(escapedCmd)
                                    );
                                });

                            expect(hasMatch).toBeTruthy();
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("preserves splatted argument invocation", async () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();

        await withProgress(
            "callOperator.splat",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        identifierArb,
                        identifierArb,
                        commandNameArb,
                        safeStringArb,
                        async (invokeName, paramsName, cmdName, argValue) => {
                            tracker.advance();

                            const invokeVar = `$${invokeName}`;
                            const paramsVar = `$${paramsName}`;

                            const script = `
${invokeVar} = Get-Command ${cmdName}
${paramsVar} = @{ Name = "${argValue}" }
& ${invokeVar} @${paramsName}
`;

                            const formatted = await formatAndAssertRoundTrip(
                                script,
                                baseOptions,
                                {
                                    id: "callOperator.splat",
                                }
                            );

                            const hasMatch = formatted
                                .split(/\r?\n/v)
                                .some((line) =>
                                    line
                                        .trimStart()
                                        .startsWith(
                                            `& ${invokeVar} @${paramsName}`
                                        )
                                );

                            expect(hasMatch).toBeTruthy();
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });

    it("preserves property invocation via call operator", async () => {
        expect.hasAssertions();
        expect(true).toBeTruthy();

        await withProgress(
            "callOperator.propertyInvocation",
            PROPERTY_RUNS,
            async (tracker) => {
                await fc.assert(
                    fc.asyncProperty(
                        identifierArb,
                        fc.constantFrom("Script", "Action"),
                        fc.constantFrom("Invoke", "ToString"),
                        safeStringArb,
                        async (objName, propertyName, methodName, argValue) => {
                            tracker.advance();

                            const objVar = `$${objName}`;

                            const script = `
${objVar} = [PSCustomObject]@{ ${propertyName} = { "${argValue}" } }
& ${objVar}.${propertyName}.${methodName}()
`;

                            const formatted = await formatAndAssertRoundTrip(
                                script,
                                baseOptions,
                                {
                                    id: "callOperator.propertyInvocation",
                                }
                            );

                            const hasMatch = formatted
                                .split(/\r?\n/v)
                                .some((line) =>
                                    line
                                        .trimStart()
                                        .startsWith(
                                            `& ${objVar}.${propertyName}.${methodName}(`
                                        )
                                );

                            expect(hasMatch).toBeTruthy();
                        }
                    ),
                    { numRuns: PROPERTY_RUNS }
                );
            }
        );
    });
});
