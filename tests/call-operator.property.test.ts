import * as fc from "fast-check";
import type { Options } from "prettier";
import { describe, it } from "vitest";

import plugin from "../src/index.js";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";
import { withProgress } from "./utils/progress.js";

const PROPERTY_RUNS = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_RUNS ?? "100",
    10
);

const baseOptions: Options = {
    parser: "powershell",
    plugins: [plugin],
    filepath: "call-operator.ps1",
};

const identifierStartArb = fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
);
const identifierCharArb = fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
);

const identifierArb = fc
    .tuple(identifierStartArb, fc.array(identifierCharArb, { maxLength: 8 }))
    .map(([first, rest]) => `${first}${rest.join("")}`);

const variableArb = identifierArb.map((name) => `$${name}`);

const safeStringCharArb = fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_"
);

const safeStringArb = fc
    .array(safeStringCharArb, { minLength: 0, maxLength: 20 })
    .map((chars) => chars.join("").replace(/"/g, ""));

const commandNameArb = fc.constantFrom(
    "Write-Output",
    "Write-Host",
    "Get-Item",
    "Get-ChildItem"
);

describe("Call operator property-based tests", () => {
    it("preserves script-block call operator at line start", async () => {
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

                            const lines = formatted.split(/\r?\n/);
                            const invokeLine = lines.find(
                                (line) =>
                                    line.includes(scriptBlockVar) &&
                                    line.includes("&")
                            );

                            if (!invokeLine) {
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

                            const escapedCmd = cmdName.replace(
                                /[\\^$*+?.()|[\]{}]/g,
                                "\\$&"
                            );
                            const pattern = new RegExp(
                                `^\\s*&\\s*\\(Get-Command\\s+${escapedCmd}\\)`,
                                "m"
                            );

                            if (!pattern.test(formatted)) {
                                throw new Error(
                                    `Expected call operator against command expression to be preserved.
Original: ${script}
Formatted:
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

    it("preserves splatted argument invocation", async () => {
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
                        async (
                            invokeName,
                            paramsName,
                            cmdName,
                            argValue
                        ) => {
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

                            const escapedInvoke = invokeVar.replace(
                                /[\\^$*+?.()|[\]{}]/g,
                                "\\$&"
                            );
                            const escapedParams = paramsName.replace(
                                /[\\^$*+?.()|[\]{}]/g,
                                "\\$&"
                            );
                            const pattern = new RegExp(
                                `^\\s*&\\s*${escapedInvoke}\\s+@${escapedParams}(?:\\s|$)`,
                                "m"
                            );

                            if (!pattern.test(formatted)) {
                                throw new Error(
                                    `Expected splatted call '& ${invokeVar} @${paramsName}' to be preserved.
Formatted:
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

    it("preserves property invocation via call operator", async () => {
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
                        async (
                            objName,
                            propertyName,
                            methodName,
                            argValue
                        ) => {
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

                            const escapedObj = objVar.replace(
                                /[\\^$*+?.()|[\]{}]/g,
                                "\\$&"
                            );
                            const escapedProp = propertyName.replace(
                                /[\\^$*+?.()|[\]{}]/g,
                                "\\$&"
                            );
                            const escapedMethod = methodName.replace(
                                /[\\^$*+?.()|[\]{}]/g,
                                "\\$&"
                            );
                            const pattern = new RegExp(
                                `^\\s*&\\s*${escapedObj}\\.${escapedProp}\\.${escapedMethod}\\(`,
                                "m"
                            );

                            if (!pattern.test(formatted)) {
                                throw new Error(
                                    `Expected property invocation '& ${objVar}.${propertyName}.${methodName}()' to be preserved.
Formatted:
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
});
