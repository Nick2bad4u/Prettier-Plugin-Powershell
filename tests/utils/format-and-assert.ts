import prettier from "prettier";

import { assertPowerShellParses } from "./powershell.js";

export interface FormatAndAssertOptions {
    expectIdempotent?: boolean;
    id?: string;
    skipParse?: boolean;
}

interface ResolvedFormatAndAssertOptions {
    expectIdempotent: boolean;
    id: string | undefined;
    skipParse: boolean;
}

const resolveFormatAndAssertOptions = (
    opts: Readonly<FormatAndAssertOptions> | string
): ResolvedFormatAndAssertOptions => {
    if (typeof opts === "string") {
        const [maybeId, ...flags] = opts.split("|");

        return {
            expectIdempotent: true,
            id: maybeId,
            skipParse: flags.includes("skipParse"),
        };
    }

    return {
        expectIdempotent: opts.expectIdempotent !== false,
        id: opts.id,
        skipParse: Boolean(opts.skipParse),
    };
};

export async function formatAndAssert(
    script: string,
    options: Readonly<prettier.Options>,
    opts: Readonly<FormatAndAssertOptions> | string = {}
): Promise<string> {
    const formatted = await prettier.format(script, options);

    const resolvedOptions = resolveFormatAndAssertOptions(opts);

    if (!resolvedOptions.skipParse) {
        await assertPowerShellParses(
            formatted,
            resolvedOptions.id ?? "formatAndAssert"
        );
    }

    return formatted;
}

export default formatAndAssert;

export async function formatAndAssertRoundTrip(
    script: string,
    options: Readonly<prettier.Options>,
    opts: Readonly<FormatAndAssertOptions> | string = {}
): Promise<string> {
    const resolvedOptions = resolveFormatAndAssertOptions(opts);
    const firstPassOptions: FormatAndAssertOptions = {
        id: resolvedOptions.id,
        skipParse: resolvedOptions.skipParse,
    };
    const formatted1 = await formatAndAssert(script, options, firstPassOptions);
    const secondPassOptions: FormatAndAssertOptions = {
        id:
            resolvedOptions.id === undefined
                ? undefined
                : `${resolvedOptions.id}.second`,
        skipParse: resolvedOptions.skipParse,
    };
    const formatted2 = await formatAndAssert(
        formatted1,
        options,
        secondPassOptions
    );

    if (resolvedOptions.expectIdempotent && formatted1 !== formatted2) {
        throw new Error(
            `Not idempotent: first and second pass differ for ${resolvedOptions.id}:\nFirst:\n${formatted1}\nSecond:\n${formatted2}`
        );
    }

    return formatted1;
}
