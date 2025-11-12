import { describe, expect, it } from "vitest";

import { tokenize } from "../src/tokenizer.js";

describe("Tokenizer edge cases", () => {
    it("handles block comment at end of file", () => {
        const script = "test <#comment#>";
        const tokens = tokenize(script);
        const blockComment = tokens.find((t) => t.type === "block-comment");
        expect(blockComment).toBeDefined();
        expect(blockComment?.value).toBe("<#comment#>");
    });

    it("handles unclosed block comment at end of file", () => {
        const script = "test <#unclosed";
        const tokens = tokenize(script);
        const blockComment = tokens.find((t) => t.type === "block-comment");
        expect(blockComment).toBeDefined();
        expect(blockComment?.value).toBe("<#unclosed");
    });

    it("handles backtick at end of string", () => {
        const script = '$a = "test`"';
        const tokens = tokenize(script);
        const stringToken = tokens.find((t) => t.type === "string");
        expect(stringToken).toBeDefined();
        expect(stringToken?.value).toBe('"test`"');
    });

    it("handles backtick at end of file in attribute", () => {
        const script = '[ValidateScript({"test`"})]';
        const tokens = tokenize(script);
        const attrToken = tokens.find((t) => t.type === "attribute");
        expect(attrToken).toBeDefined();
    });

    it("handles Windows line endings in here-strings correctly", () => {
        const script = '@"\r\nLine 1\r\nLine 2\r\n"@';
        const tokens = tokenize(script);
        const heredoc = tokens.find((t) => t.type === "heredoc");
        expect(heredoc).toBeDefined();
        expect(heredoc?.value).toBe('@"\r\nLine 1\r\nLine 2\r\n"@');
    });

    it("handles Unix line endings in here-strings correctly", () => {
        const script = '@"\nLine 1\nLine 2\n"@';
        const tokens = tokenize(script);
        const heredoc = tokens.find((t) => t.type === "heredoc");
        expect(heredoc).toBeDefined();
        expect(heredoc?.value).toBe('@"\nLine 1\nLine 2\n"@');
    });

    it("handles decimal point at end of file", () => {
        const script = "$a = 1.";
        const tokens = tokenize(script);
        const numbers = tokens.filter((t) => t.type === "number");
        expect(numbers).toHaveLength(1);
        expect(numbers[0]?.value).toBe("1");
    });

    it("handles decimal number with proper bounds checking", () => {
        const script = "$a = 1.5";
        const tokens = tokenize(script);
        const number = tokens.find((t) => t.type === "number");
        expect(number).toBeDefined();
        expect(number?.value).toBe("1.5");
    });

    it("handles here-string closing at exact position", () => {
        const script = '@"\ntest\n"@';
        const tokens = tokenize(script);
        const heredoc = tokens.find((t) => t.type === "heredoc");
        expect(heredoc).toBeDefined();
        expect(heredoc?.value).toBe('@"\ntest\n"@');
    });

    it("handles block comment closing at exact last position", () => {
        const script = "<#test#>";
        const tokens = tokenize(script);
        const blockComment = tokens.find((t) => t.type === "block-comment");
        expect(blockComment).toBeDefined();
        expect(blockComment?.value).toBe("<#test#>");
    });

    it("treats zero-width and NBSP characters as whitespace", () => {
        const script = `function\u200BFoo { $x\u00A0= 1\u200B}\uFEFF`;
        const tokens = tokenize(script);

        const keyword = tokens.find((t) => t.type === "keyword");
        const identifier = tokens.find(
            (t) => t.type === "identifier" && t.value === "Foo"
        );
        const variable = tokens.find(
            (t) => t.type === "variable" && t.value === "$x"
        );

        expect(keyword?.value.toLowerCase()).toBe("function");
        expect(identifier).toBeDefined();
        expect(variable).toBeDefined();
        expect(tokens.filter((t) => t.type === "unknown")).toHaveLength(0);
    });

    it("tokenizes the call operator", () => {
        const script = `& $scriptBlock`;
        const tokens = tokenize(script);

        const callOperator = tokens.find(
            (t) => t.type === "operator" && t.value === "&"
        );
        const variable = tokens.find(
            (t) => t.type === "variable" && t.value === "$scriptBlock"
        );

        expect(callOperator).toBeDefined();
        expect(variable).toBeDefined();
        expect(tokens.filter((t) => t.type === "unknown")).toHaveLength(0);
    });

    it("tokenizes splatted commands as identifiers", () => {
        const script = `& @commandArgs`;
        const tokens = tokenize(script);

        const splat = tokens.find(
            (t) => t.type === "identifier" && t.value === "@commandArgs"
        );

        expect(splat).toBeDefined();
        expect(tokens.filter((t) => t.type === "unknown")).toHaveLength(0);
    });

    it("recognizes numeric suffixes and multipliers", () => {
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
});
