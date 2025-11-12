import prettier from "prettier";

import { assertPowerShellParses } from "./powershell.js";

export type FormatAndAssertOptions = {
    skipParse?: boolean;
    id?: string;
    expectIdempotent?: boolean;
};

export async function formatAndAssert(
    script: string,
    options: prettier.Options,
    opts: FormatAndAssertOptions | string = {}
): Promise<string> {
    const formatted = await prettier.format(script, options);

    // Normalize function call: allow passing a string id directly as third arg
    let skipParse = false;
    let id: string | undefined;
    if (typeof opts === "string") {
        id = opts;
    } else {
        skipParse = !!opts.skipParse;
        id = opts.id;
    }

    if (!skipParse) {
        assertPowerShellParses(formatted, id ?? "formatAndAssert");
    }

    return formatted;
}

export default formatAndAssert;

export async function formatAndAssertRoundTrip(
    script: string,
    options: prettier.Options,
    opts: FormatAndAssertOptions | string = {}
): Promise<string> {
    // Id can be provided as string or as opts.id
    let skipParse = false;
    let id: string | undefined;
    if (typeof opts === "string") {
        id = opts;
    } else {
        skipParse = !!opts.skipParse;
        id = opts.id;
    }
    const opts1: FormatAndAssertOptions = { skipParse };
    if (typeof id !== "undefined") opts1.id = id;
    const formatted1 = await formatAndAssert(script, options, opts1);
    const opts2: FormatAndAssertOptions = { skipParse };
    if (typeof id !== "undefined") opts2.id = id + ".second";
    const formatted2 = await formatAndAssert(formatted1, options, opts2);
    // If check idempotent is true (default), assert equality
    if (
        (typeof opts !== "string" && opts.expectIdempotent === false) === false
    ) {
        // default to strict equality
        if (formatted1 !== formatted2) {
            throw new Error(
                `Not idempotent: first and second pass differ for ${id}:\nFirst:\n${formatted1}\nSecond:\n${formatted2}`
            );
        }
    }
    return formatted1;
}
