import { describe, expect, it } from "vitest";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
};

describe("hashtable control-flow continuations", () => {
    it.each([
        "catch",
        "elseif ($false)",
        "finally hi",
        "else",
    ])(
        "keeps ordinary command value %s separate from the following entry",
        async (command) => {
            expect.hasAssertions();

            const result = await formatAndAssertRoundTrip(
                `@{ x = ${command}\ny = 2 }`,
                baseConfig
            );

            expect(result).toBe(`@{
    x = ${command}
    y = 2
}
`);
            expect(result).not.toContain(`${command} y = 2`);
        }
    );

    it("formats Allman if and else bodies as one hashtable value", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Value = if ($true)
{ 1 }
elseif ($false)
{ 2 }
else
{ 3 }
Next = 4
}`,
            { ...baseConfig, powershellBraceStyle: "stroustrup" }
        );

        expect(result).toBe(`$settings = @{
    Value = if ($true) {
        1
    }
    elseif ($false) {
        2
    }
    else {
        3
    }
    Next = 4
}
`);
    });

    it("keeps Allman try, typed catch, and finally bodies together", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Value = try
{ 1 }
catch [System.Exception]
{ 2 }
finally
{ 3 }
Next = 4
}`,
            { ...baseConfig, powershellBraceStyle: "stroustrup" }
        );

        expect(result).toBe(`$settings = @{
    Value =
        try {
            1
        }
        catch [System.Exception] {
            2
        }
        finally {
            3
        }
    Next = 4
}
`);
    });

    it("keeps labeled do loops attached across formatting passes", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{ Value = :again do { 1 } until ($true) }`,
            { ...baseConfig, powershellBraceStyle: "stroustrup" }
        );

        expect(result).toBe(`$settings = @{
    Value =
        :again do {
            1
        }
        until ($true)
}
`);
    });

    it.each([
        "=",
        "+=",
        "-=",
        "*=",
        "/=",
        "%=",
        "??=",
    ])(
        "keeps if continuations after chained %s assignment prefixes",
        async (assignment) => {
            expect.hasAssertions();

            const result = await formatAndAssertRoundTrip(
                `$settings = @{
Value = $a = $b ${assignment} if ($true) { 1 }
else { 2 }
}`,
                { ...baseConfig, powershellBraceStyle: "stroustrup" }
            );

            expect(result).toBe(`$settings = @{
    Value =
        $a = $b ${assignment} if ($true) {
            1
        }
        else {
            2
        }
}
`);
        }
    );

    it("keeps typed and repeated catch clauses in the preceding value", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Value = try { 1 }
catch [System.IO.IOException], [System.ArgumentException] { 2 }
catch { 3 }
finally { 4 }
Next = 5
}`,
            baseConfig
        );

        expect(result).toBe(`$settings = @{
    Value =
        try {
            1
        } catch [System.IO.IOException], [System.ArgumentException] {
            2
        } catch {
            3
        } finally {
            4
        }
    Next = 5
}
`);
        expect(result).not.toMatch(/\b(?:catch|finally)\s*=/v);
    });

    it.each([
        { condition: "$false", keyword: "while" },
        { condition: "$true", keyword: "until" },
    ])(
        "keeps do/$keyword conditions in their value",
        async ({ condition, keyword }) => {
            expect.hasAssertions();

            const result = await formatAndAssertRoundTrip(
                `$settings = @{
Value = do { 1 }
${keyword} (${condition})
Next = 2
}`,
                baseConfig
            );

            expect(result).toBe(`$settings = @{
    Value =
        do {
            1
        } ${keyword} (${condition})
    Next = 2
}
`);
        }
    );

    it("preserves nested values and comments when using Stroustrup", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Value = try { @{ Nested = 1 } }
catch { 2 } finally { 3 }
# next entry
Next = do { 4 }
until ($true)
}`,
            { ...baseConfig, powershellBraceStyle: "stroustrup" }
        );

        expect(result).toBe(`$settings = @{
    Value =
        try {
            @{ Nested = 1 }
        }
        catch {
            2
        }
        finally {
            3
        }
    # next entry
    Next =
        do {
            4
        }
        until ($true)
}
`);
    });

    it.each([
        "else",
        "elseif",
        "catch",
        "finally",
        "while",
        "until",
    ])(
        "keeps the script-block key %s separate from adjacent values",
        async (key) => {
            expect.hasAssertions();

            const result = await formatAndAssertRoundTrip(
                `$settings = @{ Value = 1; ${key} = { 2 }; Next = 3 }`,
                baseConfig
            );

            expect(result).toBe(`$settings = @{
    Value = 1
    ${key} =
        {
            2
        }
    Next = 3
}
`);
        }
    );

    it("keeps a final continuation's trailing comment attached", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Value = try { 1 }
catch { 2 } # value
}`,
            baseConfig
        );

        expect(result).toBe(`$settings = @{
    Value =
        try {
            1
        } catch {
            2
        } # value
}
`);
    });

    it("keeps repeated elseif and else clauses in the same value", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `$settings = @{
Value = if ($false) { 1 }
elseif ($false) { 2 }
elseif ($true) { 3 }
else { 4 }
Next = 5
}`,
            { ...baseConfig, powershellBraceStyle: "stroustrup" }
        );

        expect(result).toBe(`$settings = @{
    Value = if ($false) {
        1
    }
    elseif ($false) {
        2
    }
    elseif ($true) {
        3
    }
    else {
        4
    }
    Next = 5
}
`);
    });
});
