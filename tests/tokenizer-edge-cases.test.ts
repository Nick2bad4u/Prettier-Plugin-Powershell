import { describe, expect, it } from "vitest";

import { tokenize } from "../src/tokenizer.js";

describe("tokenizer edge cases", () => {
    it.each([
        {
            expected: "<#comment#>",
            name: "handles block comment at end of file",
            script: "test <#comment#>",
        },
        {
            expected: "<#unclosed",
            name: "handles unclosed block comment at end of file",
            script: "test <#unclosed",
        },
        {
            expected: "<#test#>",
            name: "handles block comment closing at exact last position",
            script: "<#test#>",
        },
    ])("$name", ({ expected, script }) => {
        expect.hasAssertions();

        const tokens = tokenize(script);
        const blockComment = tokens.find((t) => t.type === "block-comment");

        expect(blockComment).toMatchObject({
            type: "block-comment",
            value: expected,
        });
    });

    it("handles backtick at end of string", () => {
        expect.hasAssertions();

        const script = '$a = "test`"';
        const tokens = tokenize(script);
        const stringToken = tokens.find((t) => t.type === "string");

        expect(stringToken).toMatchObject({
            type: "string",
            value: '"test`"',
        });
    });

    it("handles backtick at end of file in attribute", () => {
        expect.hasAssertions();

        const script = '[ValidateScript({"test`"})]';
        const tokens = tokenize(script);
        const attrToken = tokens.find((t) => t.type === "attribute");

        expect(attrToken).toMatchObject({
            type: "attribute",
            value: '[ValidateScript({"test`"})]',
        });
    });

    it.each([
        {
            name: "handles Windows line endings in here-strings correctly",
            script: '@"\r\nLine 1\r\nLine 2\r\n"@',
        },
        {
            name: "handles UNIX line endings in here-strings correctly",
            script: '@"\nLine 1\nLine 2\n"@',
        },
        {
            name: "handles here-string closing at exact position",
            script: '@"\ntest\n"@',
        },
    ])("$name", ({ script }) => {
        expect.hasAssertions();

        const tokens = tokenize(script);
        const heredoc = tokens.find((t) => t.type === "heredoc");

        expect(heredoc).toMatchObject({
            type: "heredoc",
            value: script,
        });
    });

    it("handles decimal point at end of file", () => {
        expect.hasAssertions();

        const script = "$a = 1.";
        const tokens = tokenize(script);
        const numbers = tokens.filter((t) => t.type === "number");

        expect(numbers).toHaveLength(1);
        expect(numbers[0]?.value).toBe("1");
    });

    it("handles decimal number with proper bounds checking", () => {
        expect.hasAssertions();

        const script = "$a = 1.5";
        const tokens = tokenize(script);
        const number = tokens.find((t) => t.type === "number");

        expect(number).toMatchObject({
            type: "number",
            value: "1.5",
        });
    });

    it("treats zero-width and NBSP characters as whitespace", () => {
        expect.hasAssertions();

        const script = "function\u{200B}Foo { $x\u{A0}= 1\u{200B}}\u{FEFF}";
        const tokens = tokenize(script);

        const keyword = tokens.find((t) => t.type === "keyword");
        const identifier = tokens.find(
            (t) => t.type === "identifier" && t.value === "Foo"
        );
        const variable = tokens.find(
            (t) => t.type === "variable" && t.value === "$x"
        );

        expect(keyword?.value.toLowerCase()).toBe("function");
        expect(identifier).toMatchObject({ type: "identifier", value: "Foo" });
        expect(variable).toMatchObject({ type: "variable", value: "$x" });
        expect(tokens.filter((t) => t.type === "unknown")).toHaveLength(0);
    });

    it("tokenizes the call operator", () => {
        expect.hasAssertions();

        const script = `& $scriptBlock`;
        const tokens = tokenize(script);

        const callOperator = tokens.find(
            (t) => t.type === "operator" && t.value === "&"
        );
        const variable = tokens.find(
            (t) => t.type === "variable" && t.value === "$scriptBlock"
        );

        expect(callOperator).toMatchObject({ type: "operator", value: "&" });
        expect(variable).toMatchObject({
            type: "variable",
            value: "$scriptBlock",
        });
        expect(tokens.filter((t) => t.type === "unknown")).toHaveLength(0);
    });

    it("tokenizes splatted commands as identifiers", () => {
        expect.hasAssertions();

        const script = `& @commandArgs`;
        const tokens = tokenize(script);

        const splat = tokens.find(
            (t) => t.type === "identifier" && t.value === "@commandArgs"
        );

        expect(splat).toMatchObject({
            type: "identifier",
            value: "@commandArgs",
        });
        expect(tokens.filter((t) => t.type === "unknown")).toHaveLength(0);
    });

    it("recognizes numeric suffixes and multipliers", () => {
        expect.hasAssertions();

        const script = `$values = @(123u, 0xFFu, 42KB, 1.5e3f, 99l, 5mb)`;
        const tokens = tokenize(script);

        const numbers = tokens
            .filter((t) => t.type === "number")
            .map((t) => t.value);

        expect(numbers).toContain("123u");
        expect(numbers).toContain("0xFFu");
        expect(numbers).toContain("42KB");
        expect(numbers).toContain("1.5e3f");
        expect(numbers).toContain("99l");
        expect(numbers).toContain("5mb");
    });

    it("tokenizes merging redirection without explicit stream number", () => {
        expect.hasAssertions();

        const script = `Write-Output hi >&3`;
        const tokens = tokenize(script);

        const mergeRedirection = tokens.find(
            (t) => t.type === "operator" && t.value === ">&3"
        );

        expect(mergeRedirection).toMatchObject({
            type: "operator",
            value: ">&3",
        });
    });

    it("treats bare $_ at end of input as the special pipeline variable", () => {
        expect.hasAssertions();

        const script = `$_`;
        const tokens = tokenize(script);

        const variables = tokens.filter((t) => t.type === "variable");

        expect(variables).toHaveLength(1);
        expect(variables[0]?.value).toBe("$_");
    });

    it("treats $_ followed by identifier characters as a regular variable name", () => {
        expect.hasAssertions();

        const script = `$_foo`;
        const tokens = tokenize(script);

        const variables = tokens.filter((t) => t.type === "variable");

        expect(variables).toHaveLength(1);
        expect(variables[0]?.value).toBe("$_foo");
    });
});
