import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";
import { tokenize } from "../src/tokenizer.js";

import { formatAndAssert } from "./utils/format-and-assert.js";
import { assertPowerShellParses } from "./utils/powershell.js";

const baseConfig = {
    parser: "powershell",
    plugins: [plugin],
    filepath: "test.ps1",
};

describe("Coverage - Tokenizer edge cases", () => {
    it("handles carriage return only newlines", async () => {
        const input = "function Foo {\r$x = 1\r}";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("function Foo");
    });

    it("handles here-string with closing at line start after CRLF", () => {
        const input = `@"\r\nHello\r\n"@`;
        const tokens = tokenize(input);
        const heredoc = tokens.find((t) => t.type === "heredoc");
        expect(heredoc).toBeDefined();
    });

    it("handles here-string with closing not at line start", () => {
        const input = `@"\nHello world"@`;
        const tokens = tokenize(input);
        const heredoc = tokens.find((t) => t.type === "heredoc");
        expect(heredoc).toBeDefined();
    });

    it("handles normalizeHereString with 2 or fewer lines", async () => {
        const { normalizeHereString } = await import("../src/tokenizer.js");
        const node = {
            type: "HereString" as const,
            quote: "double" as const,
            value: '@"\n"@',
            loc: { start: 0, end: 5 },
        };
        const result = normalizeHereString(node);
        expect(result).toBe('@"\n"@');
    });

    it("handles string with escape at end", () => {
        const tokens = tokenize('"test`"');
        const string = tokens.find((t) => t.type === "string");
        expect(string).toBeDefined();
    });

    it("handles variable with unclosed braces", () => {
        const tokens = tokenize("${unclosed");
        const variable = tokens.find((t) => t.type === "variable");
        expect(variable).toBeDefined();
    });

    it("handles number without decimal part", () => {
        const tokens = tokenize("42.");
        expect(tokens.some((t) => t.type === "number")).toBe(true);
    });

    it("handles identifier starting with dash", () => {
        const tokens = tokenize("-Parameter");
        const identifier = tokens.find((t) => t.type === "identifier");
        expect(identifier?.value).toBe("-Parameter");
    });

    it("handles normalizeHereString with multiple lines", async () => {
        const { normalizeHereString } = await import("../src/tokenizer.js");
        const node = {
            type: "HereString" as const,
            quote: "double" as const,
            value: '@"\nLine1\nLine2\nLine3\n"@',
            loc: { start: 0, end: 20 },
        };
        const result = normalizeHereString(node);
        expect(result).toBe("Line1\nLine2\nLine3");
    });

    it("handles form feed whitespace", () => {
        const tokens = tokenize("$x\f=\f1");
        const identifiers = tokens.filter(
            (t) => t.type === "variable" || t.type === "operator"
        );
        expect(identifiers.length).toBeGreaterThan(0);
    });

    it("handles unterminated here-string", () => {
        const tokens = tokenize('@"\nHello');
        const heredoc = tokens.find((t) => t.type === "heredoc");
        expect(heredoc).toBeDefined();
    });

    it("handles single-quoted here-string", () => {
        const input = `@'
Hello
'@`;
        const tokens = tokenize(input);
        const heredoc = tokens.find((t) => t.type === "heredoc");
        expect(heredoc?.quote).toBe("single");
    });

    it("handles unterminated string with escape", () => {
        const tokens = tokenize('"Hello`');
        const string = tokens.find((t) => t.type === "string");
        expect(string).toBeDefined();
    });

    it("handles double equals operator", () => {
        const tokens = tokenize("$x == 1");
        const operator = tokens.find((t) => t.value === "==");
        expect(operator?.type).toBe("operator");
    });

    it("handles double pipe operator", () => {
        const tokens = tokenize("$x || $y");
        const operator = tokens.find((t) => t.value === "||");
        expect(operator?.type).toBe("operator");
    });

    it("handles variable with braces", async () => {
        const input = "${my-var}";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("${my-var}");
    });

    it("handles decimal numbers", () => {
        const tokens = tokenize("3.14");
        const number = tokens.find((t) => t.type === "number");
        expect(number?.value).toBe("3.14");
    });

    it("handles unknown characters", () => {
        const tokens = tokenize("~");
        const unknown = tokens.find((t) => t.type === "unknown");
        expect(unknown?.value).toBe("~");
    });

    it("handles here-string without closing delimiter found", () => {
        const tokens = tokenize('@"\nHello world');
        const heredoc = tokens.find((t) => t.type === "heredoc");
        expect(heredoc).toBeDefined();
        expect(heredoc?.value.length).toBeGreaterThan(0);
    });

    it("handles single character variable", () => {
        const tokens = tokenize("$x");
        const variable = tokens.find((t) => t.type === "variable");
        expect(variable?.value).toBe("$x");
    });
});

describe("Coverage - Parser edge cases", () => {
    it("handles empty script blocks", async () => {
        const input = "function Foo {}";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("function Foo {}");
    });

    it("handles multiple consecutive newlines after comment", async () => {
        const input = `# comment


Write-Host "test"`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("# comment");
    });

    it("handles pipeline continuation after multiple newlines", async () => {
        const input = `Get-Process

| Where-Object { $true }`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("|");
    });

    it("handles hashtable entries with quoted keys", async () => {
        const input = `@{ "my-key" = 1; 'other-key' = 2 }`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("my-key");
    });

    it("handles hashtable entry without equals sign", async () => {
        const input = `@{ key }`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles nested structures in hashtable entries", async () => {
        const input = `@{ key = @{ nested = 1 } }`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("nested");
    });

    it("handles array elements separated by newlines", async () => {
        const input = `@(
1
2
3
)`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("1");
    });

    it("handles array with nested structures", async () => {
        const input = `@(
@{ a = 1 },
@{ b = 2 }
)`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("a");
    });

    it("handles hashtable with newline separators", async () => {
        const input = `@{
a = 1
b = 2
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("a");
    });

    it("handles function without body tokens", async () => {
        const input = "function Test";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles pipeline with no segments", async () => {
        const input = "";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("");
    });

    it("handles comments at start of expression", async () => {
        const input = `function Foo {
# comment
Write-Host "Hi"
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("# comment");
    });

    it("handles statements with trailing semicolons inside blocks", async () => {
        const input = `{
$x = 1;
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles closing brace without statement", async () => {
        const input = "if ($true) { }";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("if");
    });

    it("handles multi-element arrays with explicit syntax", async () => {
        const input = "[1, 2, 3]";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("[");
    });

    it("handles empty hashtables", async () => {
        const input = "@{}";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("@{}");
    });

    it("handles empty parentheses", async () => {
        const input = "Get-Process()";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("()");
    });

    it("handles parentheses without commas or newlines", async () => {
        const input = "($x $y)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });
});

describe("Coverage - Printer edge cases", () => {
    it("handles tab indentation style", async () => {
        const input = `function Foo {
Write-Host "Hi"
}`;
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellIndentStyle: "tabs",
            },
            "coverage.result"
        );
        expect(result).toContain("\t");
    });

    it("handles text nodes with operator role", async () => {
        const input = "-eq";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("-eq");
    });

    it("handles text nodes with punctuation role", async () => {
        const input = "$x.Property";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain(".");
    });

    it("handles space after opening punctuation", async () => {
        const input = "($x)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("($x)");
    });

    it("handles space before closing punctuation", async () => {
        const input = "$array[0]";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("[0]");
    });

    it("handles symbol pairs without gap", async () => {
        const input = "$obj::Method";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("::");
    });

    it("handles getSymbol returning null for non-text nodes", async () => {
        const input = "@{ a = 1 }";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles uppercase keyword casing", async () => {
        const input = "function Foo { if ($true) { } }";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellKeywordCase: "upper",
            },
            "coverage.result"
        );
        expect(result).toContain("FUNCTION");
        expect(result).toContain("IF");
    });

    it("handles pascal keyword casing", async () => {
        const input = "function Foo { if ($true) { } }";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellKeywordCase: "pascal",
            },
            "coverage.result"
        );
        expect(result).toContain("Function");
        expect(result).toContain("If");
    });

    it("handles single quotes with embedded single quote", async () => {
        const input = `"It's working"`;
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellPreferSingleQuote: true,
            },
            "coverage.result"
        );
        expect(result.trim()).toBe(`"It's working"`);
    });

    it("handles single quotes with special characters", async () => {
        const input = `"Hello$world"`;
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellPreferSingleQuote: true,
            },
            "coverage.result"
        );
        expect(result).toContain('"');
    });

    it("handles non-string quote normalization", async () => {
        const input = `$var`;
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellPreferSingleQuote: true,
            },
            "coverage.result"
        );
        expect(result.trim()).toBe("$var");
    });

    it("rewrites various aliases", async () => {
        const input = "gi | gci | dir | cat | echo | ps | where | ?";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellRewriteAliases: true,
            },
            "coverage.result"
        );
        expect(result).toContain("Get-Item");
        expect(result).toContain("Get-ChildItem");
        expect(result).toContain("Get-Content");
        expect(result).toContain("Write-Output");
        expect(result).toContain("Get-Process");
        expect(result).toContain("Where-Object");
    });

    it("never adds trailing comma to arrays (PowerShell doesn't support this)", async () => {
        const input = "@(1, 2)";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellTrailingComma: "all",
            },
            "coverage.result"
        );
        // PowerShell arrays don't support trailing commas
        expect(result).not.toMatch(/,\s*\)/);
    });

    it("handles trailing comma set to none", async () => {
        const input = `@(
1,
2
)`;
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellTrailingComma: "none",
            },
            "coverage.result"
        );
        expect(result).not.toMatch(/2,/);
    });

    it("handles hashtable with trailing semicolon set to all", async () => {
        const input = "@{ a = 1; b = 2 }";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellTrailingComma: "all",
            },
            "coverage.result"
        );
        expect(result).toMatch(/2;/);
    });

    it("handles zero blank lines between functions", async () => {
        const input = `function A {}
function B {}`;
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellBlankLinesBetweenFunctions: 0,
            },
            "coverage.result"
        );
        expect(
            result.split("\n").filter((l) => l.trim() === "").length
        ).toBeGreaterThanOrEqual(0);
    });

    it("handles extreme line width values", async () => {
        const input = 'Write-Host "test"';
        const result1 = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellLineWidth: 30,
            },
            "coverage.result1"
        );
        expect(result1).toBeDefined();

        const result2 = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellLineWidth: 250,
            },
            "coverage.result2"
        );
        expect(result2).toBeDefined();
    });

    it("handles script blocks in expressions", async () => {
        const input = 'Get-Process | Where-Object { $_.Name -eq "test" }';
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("Where-Object");
    });

    it("handles array literals in expressions", async () => {
        const input = "$x = @(1, 2, 3)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("@(");
    });

    it("handles hashtables in expressions", async () => {
        const input = "$x = @{ a = 1 }";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("@{");
    });

    it("skips punctuation tokens correctly", async () => {
        const input = "Write-Host.Invoke()";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain(".");
    });

    it("handles no space before block structures", async () => {
        const input = '$x={ Write-Host "test" }';
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("$x = {");
    });

    it("handles operators with spacing", async () => {
        const input = "$x=$y+$z";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain(" = ");
    });

    it("handles single-element arrays without breaking", async () => {
        const input = "@(1)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("@(1)");
    });

    it("handles explicit array with single element", async () => {
        const input = "[1]";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("[1]");
    });

    it("handles empty keyword case transformation", async () => {
        const input = "";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellKeywordCase: "pascal",
            },
            "coverage.result"
        );
        expect(result.trim()).toBe("");
    });

    it("handles printWidth affecting options", async () => {
        const input = 'Write-Host "test"';
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                printWidth: 200,
                powershellLineWidth: 100,
            },
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles comment nodes", async () => {
        const input = "# This is a comment";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("# This is a comment");
    });

    it("handles blank lines with specific count", async () => {
        const input = 'Write-Host "A"\n\n\nWrite-Host "B"';
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("Write-Host");
    });

    it("handles allman brace style for functions", async () => {
        const input = 'function Test { Write-Host "Hi" }';
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellBraceStyle: "allman",
            },
            "coverage.result"
        );
        expect(result).toContain("function Test\n{");
    });

    it("handles rewriting unknown role aliases", async () => {
        const input = "~";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellRewriteAliases: true,
            },
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles param with single element and newline", async () => {
        const input = `function Foo {
param(
[string] $Name
)
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("param");
    });

    it("handles parenthesis with multiple elements without comma", async () => {
        const input = "($x $y $z)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles parenthesis with comma and no newline", async () => {
        const input = "($x, $y)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles empty array literal", async () => {
        const input = "@()";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("@()");
    });

    it("handles explicit empty array", async () => {
        const input = "[]";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("[]");
    });

    it("handles array with shouldBreak false", async () => {
        const input = "@(1)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("@(1)");
    });

    it("handles hashtable entry without trailing separator", async () => {
        const input = `@{
a = 1
b = 2
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("a");
    });

    it("handles array with nested structures and commas", async () => {
        const input = `@(
@{ a = 1 },
@{ b = 2 }
)`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("a");
    });

    it("handles hashtable with newline-separated entries", async () => {
        const input = `@{
a = 1
b = 2
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("b");
    });

    it("handles function header without body", async () => {
        const input = "function Test";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles statement with only semicolons", async () => {
        const input = ";;;";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles newlines in nested structures during statement parsing", async () => {
        const input = `{
$x = @{
a = 1
}
}`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("a");
    });

    it("handles backtick line continuation", async () => {
        const input = 'Write-Host `\n"test"';
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).not.toContain("`");
    });

    it("handles backtick before pipe operator", async () => {
        const input = "Get-Process `\n| Where-Object";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("|");
    });

    it("handles multiple consecutive comments after newlines", async () => {
        const input = `# comment1\n\n\n# comment2\nWrite-Host "test"`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("# comment1");
        expect(result).toContain("# comment2");
    });

    it("handles pipeline continuation after comment in multiline", async () => {
        const input = `Get-Process | Where-Object`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("|");
    });

    it("handles hashtable key extraction with quotes", async () => {
        const input = `@{ "quoted-key" = 1; 'single-key' = 2 }`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("quoted-key");
        expect(result).toContain("single-key");
    });

    it("handles array element split with nested structures", async () => {
        const input = `@(@{ a = 1 }, @{ b = 2 })`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain("a");
    });

    it("handles closing token in array split", async () => {
        const input = `@(1, [2, 3], 4)`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles empty expressions in various contexts", async () => {
        const input = "()";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("()");
    });

    it("handles various symbol combinations for spacing", async () => {
        const input = "$obj.Property";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toContain(".");
    });

    it("handles parenthesis with hasNewline but not hasComma", async () => {
        const input = `(
$x
$y
)`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles parenthesis with both hasNewline and hasComma", async () => {
        const input = `(
$x,
$y
)`;
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles shouldBreak true for arrays", async () => {
        const input = "@(1, 2, 3)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles hashtable entry with ifBreak for semicolon", async () => {
        const input = `@{
a = 1
b = 2
c = 3
}`;
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellTrailingComma: "multiline",
            },
            "coverage.result"
        );
        expect(result).toContain("a");
    });

    it("handles explicit array with multiple elements", async () => {
        const input = "[1, 2, 3, 4]";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles hashtable entry is last flag correctly", async () => {
        const input = "@{ a = 1; b = 2; c = 3 }";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellTrailingComma: "none",
            },
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles single element parenthesis without newline", async () => {
        const input = "($single)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("($single)");
    });

    it("handles multi-element parenthesis without newline or comma", async () => {
        const input = "($x $y $z)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles forceMultiline scenarios in parenthesis", async () => {
        const input1 = `(
$a
$b
)`;
        const result1 = await formatAndAssert(
            input1,
            baseConfig,
            "coverage.result1"
        );
        expect(result1).toBeDefined();

        const input2 = "($a, $b)";
        const result2 = await formatAndAssert(
            input2,
            baseConfig,
            "coverage.result2"
        );
        expect(result2).toBeDefined();
    });

    it("handles array elements without breaking", async () => {
        const input = "@(42)";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result.trim()).toBe("@(42)");
    });

    it("handles normalizeStringLiteral for non-quoted strings", async () => {
        const input = "$variable";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellPreferSingleQuote: true,
            },
            "coverage.result"
        );
        expect(result.trim()).toBe("$variable");
    });

    it("handles string normalization with backtick", async () => {
        const input = '"Hello`nworld"';
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellPreferSingleQuote: true,
            },
            "coverage.result"
        );
        expect(result).toContain('"');
    });

    it("handles shouldSkipPart for backtick tokens", async () => {
        const input = "Write-Host `\n$value";
        const result = await formatAndAssert(
            input,
            baseConfig,
            "coverage.result"
        );
        expect(result).not.toContain("`");
    });
});

describe("Coverage - Options edge cases", () => {
    it("handles invalid blank lines between functions (too high)", async () => {
        const input = "function A {}\nfunction B {}";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellBlankLinesBetweenFunctions: 10,
            },
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles invalid blank lines between functions (negative)", async () => {
        const input = "function A {}\nfunction B {}";
        const result = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellBlankLinesBetweenFunctions: -5,
            },
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("uses default tabWidth when not specified", async () => {
        const input = "function Foo { $x = 1 }";
        const result = await formatAndAssert(
            input,
            {
                parser: "powershell",
                plugins: [plugin],
                filepath: "test.ps1",
            },
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("handles all combinations of keyword case transforms", async () => {
        const input =
            "function Test { if ($true) { foreach ($x in @()) { } } }";

        for (const caseOption of [
            "preserve",
            "lower",
            "upper",
            "pascal",
        ]) {
            const result = await formatAndAssert(
                input,
                {
                    ...baseConfig,
                    powershellKeywordCase: caseOption,
                },
                "coverage.result"
            );
            expect(result).toBeDefined();
        }
    });

    it("handles all trailing comma options for hashtables", async () => {
        const input = "@{ a = 1; b = 2 }";

        for (const commaOption of [
            "none",
            "multiline",
            "all",
        ]) {
            const result = await formatAndAssert(
                input,
                {
                    ...baseConfig,
                    powershellTrailingComma: commaOption,
                },
                "coverage.result"
            );
            expect(result).toBeDefined();
        }
    });

    it("sets printWidth from powershellLineWidth when printWidth is not specified", async () => {
        const input = 'Write-Host "test"';
        const result = await formatAndAssert(
            input,
            {
                parser: "powershell",
                plugins: [plugin],
                filepath: "test.ps1",
                powershellLineWidth: 80,
            },
            "coverage.result"
        );
        expect(result).toBeDefined();
    });

    it("keeps existing printWidth when it is lower than powershellLineWidth", async () => {
        const input = 'Write-Host "test"';
        const result = await formatAndAssert(
            input,
            {
                parser: "powershell",
                plugins: [plugin],
                filepath: "test.ps1",
                printWidth: 60,
                powershellLineWidth: 120,
            },
            "coverage.result"
        );
        assertPowerShellParses(result, "coverage.result");
        expect(result).toBeDefined();
    });

    it("handles all boolean option combinations", async () => {
        const input = "function Foo { param([string] $x) Write-Host $x }";

        // Test all combinations of boolean flags
        const result1 = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellSortHashtableKeys: true,
                powershellBlankLineAfterParam: true,
                powershellPreferSingleQuote: true,
                powershellRewriteAliases: true,
                powershellRewriteWriteHost: true,
            },
            "coverage.result1"
        );
        assertPowerShellParses(result1, "coverage.result1");
        expect(result1).toBeDefined();

        const result2 = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellSortHashtableKeys: false,
                powershellBlankLineAfterParam: false,
                powershellPreferSingleQuote: false,
                powershellRewriteAliases: false,
                powershellRewriteWriteHost: false,
            },
            "coverage.result2"
        );
        assertPowerShellParses(result2, "coverage.result2");
        expect(result2).toBeDefined();
    });

    it("handles tabs vs spaces indentation branches", async () => {
        const input = 'function Foo { Write-Host "Hi" }';

        const spacesResult = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellIndentStyle: "spaces",
            },
            "coverage.spacesResult"
        );
        expect(spacesResult).not.toMatch(/\t/);

        const tabsResult = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellIndentStyle: "tabs",
            },
            "coverage.tabsResult"
        );
        expect(tabsResult).toMatch(/\t/);
    });

    it("handles all trailingComma option values", async () => {
        const input = "@{ a = 1 }";

        const noneResult = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellTrailingComma: "none",
            },
            "coverage.noneResult"
        );
        expect(noneResult).toBeDefined();

        const multilineResult = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellTrailingComma: "multiline",
            },
            "coverage.multilineResult"
        );
        expect(multilineResult).toBeDefined();

        const allResult = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellTrailingComma: "all",
            },
            "coverage.allResult"
        );
        expect(allResult).toBeDefined();
    });

    it("handles all braceStyle option values", async () => {
        const input = "function Foo { }";

        const oneTbsResult = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellBraceStyle: "1tbs",
            },
            "coverage.oneTbsResult"
        );
        expect(oneTbsResult).toBeDefined();

        const allmanResult = await formatAndAssert(
            input,
            {
                ...baseConfig,
                powershellBraceStyle: "allman",
            },
            "coverage.allmanResult"
        );
        expect(allmanResult).toBeDefined();
    });

    it("handles all keywordCase option values", async () => {
        const input = "function Foo { if ($true) { } }";

        for (const caseValue of [
            "preserve",
            "lower",
            "upper",
            "pascal",
        ] as const) {
            const result = await formatAndAssert(
                input,
                {
                    ...baseConfig,
                    powershellKeywordCase: caseValue,
                },
                "coverage.result"
            );
            expect(result).toBeDefined();
        }
    });
});

describe("Coverage - Index exports", () => {
    it("exports plugin with hasPragma function", () => {
        expect(plugin.parsers?.powershell?.hasPragma).toBeDefined();
        const hasPragma = plugin.parsers?.powershell?.hasPragma;
        if (hasPragma) {
            expect(hasPragma("")).toBe(false);
        }
    });

    it("exports languages array", () => {
        expect(plugin.languages).toBeDefined();
        expect(Array.isArray(plugin.languages)).toBe(true);
    });

    it("exports parsers object", () => {
        expect(plugin.parsers).toBeDefined();
    });

    it("exports printers object", () => {
        expect(plugin.printers).toBeDefined();
    });

    it("exports options", () => {
        expect(plugin.options).toBeDefined();
    });

    it("exports defaultOptions", () => {
        expect(plugin.defaultOptions).toBeDefined();
    });
});
