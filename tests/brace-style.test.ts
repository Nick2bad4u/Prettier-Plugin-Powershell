import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";
import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";
import { assertPowerShellParses } from "./utils/powershell.js";

const baseConfig = {
    parser: "powershell" as const,
    plugins: [plugin],
};

const stroustrupConfig = {
    ...baseConfig,
    powershellBraceStyle: "stroustrup",
};

const assignmentPrefixes = [
    "[string] $value =",
    "$obj.Value =",
    "($obj).Value =",
    "$items[0] =",
    "$value +=",
    "$a = $b =",
];

describe("stroustrup fixtures and default style", () => {
    it.each([
        "control-flow",
        "nested",
        "allman",
    ])(
        "formats the %s fixture with valid, stable continuation clauses",
        async (name) => {
            expect.hasAssertions();

            const [input, expected] = await Promise.all([
                readFile(
                    new URL(
                        `fixtures/stroustrup-${name}.input.ps1`,
                        import.meta.url
                    ),
                    "utf8"
                ),
                readFile(
                    new URL(
                        `fixtures/stroustrup-${name}.expected.ps1`,
                        import.meta.url
                    ),
                    "utf8"
                ),
            ]);
            await assertPowerShellParses(
                input,
                `brace-style.fixture-input.${name}`
            );
            const result = await formatAndAssertRoundTrip(
                input,
                stroustrupConfig,
                `brace-style.fixture.${name}`
            );

            expect(result).toBe(expected.replaceAll("\r\n", "\n"));
        }
    );

    it("keeps the default 1tbs behavior unchanged", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "if($true){}else{}",
            baseConfig,
            "brace-style.default"
        );

        expect(result).toBe("if ($true) {} else {}\n");
        expect(result).not.toContain("\nelse");
    });
});

describe("stroustrup assignment expressions", () => {
    it.each(assignmentPrefixes)(
        "formats continuation clauses after assignment prefix %s",
        async (prefix) => {
            expect.hasAssertions();

            const input = `${prefix} if($true){}else{}`;
            await assertPowerShellParses(
                input,
                `brace-style.assignment-input.${prefix}`
            );
            const result = await formatAndAssertRoundTrip(
                input,
                stroustrupConfig,
                `brace-style.assignment.${prefix}`
            );

            expect(result).toBe(`${prefix} if ($true) {}\nelse {}\n`);
        }
    );

    it.each(assignmentPrefixes)(
        "preserves ordinary command values after assignment prefix %s",
        async (prefix) => {
            expect.hasAssertions();

            const input = `${prefix} Write-Output {} else catch finally while until`;
            await assertPowerShellParses(
                input,
                `brace-style.command-value-input.${prefix}`
            );
            const result = await formatAndAssertRoundTrip(
                input,
                stroustrupConfig,
                `brace-style.command-value.${prefix}`
            );

            expect(result).toBe(`${input}\n`);
            expect(result).not.toContain("\nelse");
        }
    );

    it("preserves ordinary expressions with member, index, and type prefixes", async () => {
        expect.hasAssertions();

        const input =
            "[string] $value\n$obj.Value\n($obj).Value\n$items[0]\n$value + $other";
        await assertPowerShellParses(input, "brace-style.expression-input");
        const result = await formatAndAssertRoundTrip(
            input,
            stroustrupConfig,
            "brace-style.expressions"
        );

        expect(result).toBe(`${input}\n`);
        expect(result).not.toContain("\nelse");
    });
});

describe("stroustrup clauses and command arguments", () => {
    it("places even empty continuation blocks on new lines", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "if($true){}elseif($false){}else{}\ntry{}catch{}finally{}\ndo{}while($false)\ndo{}until($true)",
            stroustrupConfig,
            "brace-style.empty"
        );

        expect(result).toBe(
            "if ($true) {}\nelseif ($false) {}\nelse {}\ntry {}\ncatch {}\nfinally {}\ndo {}\nwhile ($false)\ndo {}\nuntil ($true)\n"
        );
    });

    it("recognizes mixed-case clauses while preserving requested casing", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "IF($true){}ElseIf($false){}ELSE{}\nTry{}CaTcH{}Finally{}\nDo{}UnTiL($true)",
            { ...stroustrupConfig, powershellKeywordCase: "preserve" },
            "brace-style.casing"
        );

        expect(result).toBe(
            "IF ($true) {}\nElseIf ($false) {}\nELSE {}\nTry {}\nCaTcH {}\nFinally {}\nDo {}\nUnTiL ($true)\n"
        );
    });

    it("preserves comments between a block and its continuation", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "if($true){} # explain the alternative\nelse{}\ntry{} <# recover #> catch{}\ndo{} # stop here\nuntil($true)",
            stroustrupConfig,
            "brace-style.comments"
        );

        expect(result).toBe(
            "if ($true) {} # explain the alternative\nelse {}\ntry {}\n<# recover #>\ncatch {}\ndo {} # stop here\nuntil ($true)\n"
        );
    });

    it("preserves ignored control-flow statements", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "# prettier-ignore\nif($true){'yes'}else{'no'}\nif($false){}else{}",
            stroustrupConfig,
            "brace-style.ignore"
        );

        expect(result).toBe(
            "# prettier-ignore\nif($true){'yes'}else{'no'}\nif ($false) {}\nelse {}\n"
        );
    });

    it("does not split keyword-looking command arguments after script blocks", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "Write-Output {} else elseif catch finally while until\nWrite-Output 'do' {} while ($false)\nWrite-Output $x = if ($true) {} else {}",
            stroustrupConfig,
            "brace-style.command-arguments"
        );

        expect(result).toBe(
            "Write-Output {} else elseif catch finally while until\nWrite-Output 'do' {} while ($false)\nWrite-Output $x = if ($true) {} else {}\n"
        );
        expect(result).not.toContain("\nelse");
    });
});

describe("stroustrup option compatibility", () => {
    it("lets the explicit style override the Invoke-Formatter preset", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "if($true){}else{}",
            { ...stroustrupConfig, powershellPreset: "invoke-formatter" },
            "brace-style.preset"
        );

        expect(result).toBe("if ($true) {}\nelse {}\n");
    });

    it("infers the parser from a PowerShell file path", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "if($true){}else{}",
            {
                filepath: "example.ps1",
                plugins: [plugin],
                powershellBraceStyle: "stroustrup",
            },
            "brace-style.filepath"
        );

        expect(result).toBe("if ($true) {}\nelse {}\n");
    });

    it("keeps Allman function opening braces on a new line", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            "function Test-Braces{if($true){}else{}}",
            { ...baseConfig, powershellBraceStyle: "allman" },
            "brace-style.allman"
        );

        expect(result).toBe(
            "function Test-Braces\n{\n    if ($true) {} else {}\n}\n"
        );
        expect(result).not.toContain("function Test-Braces {");
    });

    it.each(["1tbs", "allman"])(
        "preserves existing control-flow opening-brace placement for %s",
        async (style) => {
            expect.hasAssertions();

            const input = "if ($true)\n{\n    'yes'\n}\nelse\n{\n    'no'\n}\n";
            await assertPowerShellParses(
                input,
                `brace-style.allman-input.${style}`
            );
            const result = await formatAndAssertRoundTrip(
                input,
                { ...baseConfig, powershellBraceStyle: style },
                `brace-style.allman-preserved.${style}`
            );

            expect(result).toBe(input);
        }
    );
});

describe("stroustrup statement boundaries", () => {
    it.each([
        {
            input: "Write-Output if ($true)\n{}\n",
            name: "a command followed by a standalone script block",
        },
        {
            input: "# prettier-ignore\nif ($true)\n{\n    'yes'\n}\nelse\n{\n    'no'\n}\n",
            name: "an ignored statement with Allman braces",
        },
        {
            input: "do {}\nwhile ($false)\n{}\n",
            name: "a completed do loop followed by a standalone script block",
        },
    ])("preserves $name", async ({ input, name }) => {
        expect.hasAssertions();

        await assertPowerShellParses(
            input,
            `brace-style.preserved-input.${name}`
        );
        const result = await formatAndAssertRoundTrip(
            input,
            stroustrupConfig,
            `brace-style.preserved.${name}`
        );

        expect(result).toBe(input);
    });

    it.each([
        "catch {} finally {}",
        "elseif ($false) {} else {}",
        "else {} catch {}",
        "finally {} while ($false)",
        "Write-Output 'before'\ncatch {} finally {}",
        "if ($true) {}\nWrite-Output 'between'\nelseif ($false) {} else {}",
        "if ($true) {}\nWrite-Output 'between'\nelse {} catch {}",
        "try {} finally {}\ncatch {} finally {}",
        "if ($true) {}\nelse {}\nelseif ($false) {} else {}",
    ])(
        "preserves standalone continuation-looking commands: %s",
        async (input) => {
            expect.hasAssertions();

            await assertPowerShellParses(
                input,
                "brace-style.standalone-command-input"
            );
            const result = await formatAndAssertRoundTrip(
                input,
                stroustrupConfig,
                "brace-style.standalone-command"
            );
            const expected = input.replace(
                "try {} finally {}",
                "try {}\nfinally {}"
            );

            expect(result).toBe(`${expected}\n`);
        }
    );

    it("ends continuation recognition at a semicolon statement boundary", async () => {
        expect.hasAssertions();

        const input =
            "try {} finally {}; catch {} finally {}\nif ($true) {}; elseif ($false) {} else {}";
        await assertPowerShellParses(input, "brace-style.semicolon-input");
        const result = await formatAndAssertRoundTrip(
            input,
            stroustrupConfig,
            "brace-style.semicolon"
        );

        expect(result).toBe(
            "try {}\nfinally {}\ncatch {} finally {}\nif ($true) {};\nelseif ($false) {} else {}\n"
        );
        expect(result).not.toContain("\nelseif ($false) {}\nelse {}");
    });
});

describe("stroustrup continuation headers", () => {
    it("formats real continuation chains across intervening comments", async () => {
        expect.hasAssertions();

        const input =
            "if ($true) {}\n# alternate\nelseif ($false) {} else {}\ntry {}\n# recover\ncatch {} finally {}";
        await assertPowerShellParses(
            input,
            "brace-style.continued-comments-input"
        );
        const result = await formatAndAssertRoundTrip(
            input,
            stroustrupConfig,
            "brace-style.continued-comments"
        );

        expect(result).toBe(
            "if ($true) {}\n# alternate\nelseif ($false) {}\nelse {}\ntry {}\n# recover\ncatch {}\nfinally {}\n"
        );
    });

    it("normalizes mixed opening-brace placement throughout a chain", async () => {
        expect.hasAssertions();

        const input = "if($true)\n{} elseif($false)\n{} else\n{}";
        await assertPowerShellParses(input, "brace-style.mixed-input");
        const result = await formatAndAssertRoundTrip(
            input,
            stroustrupConfig,
            "brace-style.mixed"
        );

        expect(result).toBe("if ($true) {}\nelseif ($false) {}\nelse {}\n");
        expect(result).not.toContain("if ($true)\n");
    });

    it("joins switch flags and typed trap headers to their blocks", async () => {
        expect.hasAssertions();

        const input =
            "switch -Regex ($value)\n{ default {} }\nswitch -Regex -File 'input.txt'\n{ default {} }\ntrap [System.Exception]\n{ 'handled' }";
        await assertPowerShellParses(input, "brace-style.switch-trap-input");
        const result = await formatAndAssertRoundTrip(
            input,
            stroustrupConfig,
            "brace-style.switch-trap"
        );

        expect(result).toBe(
            "switch -Regex ($value) {\n    default {}\n}\nswitch -Regex -File 'input.txt' {\n    default {}\n}\ntrap [System.Exception] {\n    'handled'\n}\n"
        );
    });
});

const subexpressionCases = [
    {
        expected: "$(\n    try {}\n    catch {}\n    finally {}\n)\n",
        input: "$(try {}\ncatch {} finally {})",
    },
    {
        expected: "@(\n    try {}\n    catch {}\n    finally {}\n)\n",
        input: "@(try {}\ncatch {} finally {})",
    },
    {
        expected:
            "$(\n    if ($true) {}\n    elseif ($false) {}\n    else {}\n)\n",
        input: "$(if($true){}\nelseif($false){}else{})",
    },
    {
        expected: "@(\n    if ($true) {}\n    else {}\n)\n",
        input: "@(if($true)\n{}\nelse\n{})",
    },
    {
        expected: "$(\n    try {}\n    catch {}\n    finally {}\n)\n",
        input: "$(try\n{}\ncatch\n{}\nfinally\n{})",
    },
    {
        expected:
            "$result = $(\n    if ($true) {}\n    elseif ($false) {}\n    else {}\n)\n",
        input: "$result = $(if($true){}\nelseif($false){}else{})",
    },
    {
        expected:
            "$result = @(\n    $(\n        try {}\n        catch {}\n        finally {}\n    )\n)\n",
        input: "$result = @($(try {}\ncatch {} finally {}))",
    },
];

describe("stroustrup subexpressions", () => {
    it.each(subexpressionCases)(
        "formats control-flow subexpression $input",
        async ({ expected, input }) => {
            expect.hasAssertions();

            await assertPowerShellParses(
                input,
                "brace-style.subexpression-input"
            );
            const result = await formatAndAssertRoundTrip(
                input,
                stroustrupConfig,
                "brace-style.subexpression"
            );

            expect(result).toBe(expected);
        }
    );

    it.each([
        {
            expected:
                "@(\n    if ($true) {};\n    elseif ($false) {} else {}\n)\n",
            input: "@(if ($true) {}; elseif ($false) {} else {})",
        },
        {
            expected:
                "$(\n    if ($true) {};\n    elseif ($false) {} else {}\n)\n",
            input: "$(if ($true) {}; elseif ($false) {} else {})",
        },
        {
            expected: "@( Write-Output {}, catch {} finally {} )\n",
            input: "@(Write-Output {}, catch {} finally {})",
        },
    ])(
        "preserves command boundaries in subexpression $input",
        async ({ expected, input }) => {
            expect.hasAssertions();

            await assertPowerShellParses(
                input,
                "brace-style.subexpression-command-input"
            );
            const result = await formatAndAssertRoundTrip(
                input,
                stroustrupConfig,
                "brace-style.subexpression-command"
            );

            expect(result).toBe(expected);
        }
    );
});
