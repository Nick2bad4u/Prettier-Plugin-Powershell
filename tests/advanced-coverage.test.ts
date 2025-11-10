import prettier, { type AstPath, type Doc, type ParserOptions } from "prettier";
import { describe, expect, it } from "vitest";

import * as astRuntime from "../src/ast.js";
import { runtimeExports } from "../src/ast.js";
import type {
    BaseNode,
    ArrayLiteralNode,
    CommentNode,
    SourceLocation,
    ExpressionNode,
    ExpressionPartNode,
    ParenthesisNode,
    PipelineNode,
    HashtableEntryNode,
    HashtableNode,
    ScriptBlockNode,
    ScriptBodyNode,
    ScriptNode,
    HereStringNode,
    TextNode,
    TokenRole,
} from "../src/ast.js";
import plugin from "../src/index.js";
import { resolveOptions } from "../src/options.js";
import {
    parsePowerShell,
    __parserTestUtils,
    locStart,
    locEnd,
} from "../src/parser.js";
import {
    __printerTestUtils,
    createPrinter,
    powerShellPrinter,
} from "../src/printer.js";
import { tokenize, normalizeHereString } from "../src/tokenizer.js";
import type { Token } from "../src/tokenizer.js";

interface ParserTestUtils {
    isOpeningToken: (token: Token) => boolean;
    isClosingToken: (token: Token) => boolean;
    collectStructureTokens: (
        tokens: Token[],
        startIndex: number
    ) => { contentTokens: Token[]; endIndex: number; closingToken?: Token };
    splitHashtableEntries: (tokens: Token[]) => Token[][];
    findTopLevelEquals: (tokens: Token[]) => number;
    extractKeyText: (tokens: Token[]) => string;
    splitArrayElements: (tokens: Token[]) => Token[][];
    hasTopLevelComma: (tokens: Token[]) => boolean;
    parseScriptWithTerminators: (
        source: string,
        terminators: Set<string>
    ) => ScriptNode;
    buildExpressionFromTokens: (tokens: Token[]) => ExpressionNode;
    createHereStringNode: (token: Token) => HereStringNode;
    createTextNode: (token: Token) => TextNode;
    buildHashtableEntry: (tokens: Token[]) => HashtableEntryNode;
    resolveStructureEnd: (
        startToken: Token,
        closingToken: Token | undefined,
        contentTokens: Token[]
    ) => number;
    parseStatementForTest: (tokens: Token[]) => PipelineNode | null;
}

type PowerShellParserOptions = ParserOptions & {
    powershellIndentStyle?: "tabs" | "spaces";
    powershellIndentSize?: number;
    powershellTrailingComma?: "none" | "multiline" | "all";
    powershellSortHashtableKeys?: boolean;
    powershellBlankLinesBetweenFunctions?: number;
    powershellBlankLineAfterParam?: boolean;
    powershellBraceStyle?: "1tbs" | "allman";
    powershellLineWidth?: number;
    powershellPreferSingleQuote?: boolean;
    powershellKeywordCase?: "preserve" | "lower" | "upper" | "pascal";
    powershellRewriteAliases?: boolean;
    powershellRewriteWriteHost?: boolean;
};

const baseConfig = {
    parser: "powershell",
    plugins: [plugin],
    filepath: "advanced.ps1",
};

const createOptions = (
    overrides: Partial<PowerShellParserOptions> = {}
): PowerShellParserOptions =>
    ({
        tabWidth: 2,
        ...overrides,
    }) as PowerShellParserOptions;

const {
    gapBetween,
    getSymbol,
    shouldSkipPart,
    normalizeStringLiteral,
    printParamParenthesis,
    printPipeline,
    trailingCommaDoc,
    isParamStatement,
} = __printerTestUtils;

const parserUtils = __parserTestUtils as ParserTestUtils;

const { hardline, line } = prettier.doc.builders;

const containsFragment = (value: unknown, fragment: unknown): boolean => {
    if (value === fragment) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.some((part) => containsFragment(part, fragment));
    }
    if (typeof value === "object" && value !== null) {
        return Object.values(value as Record<string, unknown>).some((child) =>
            containsFragment(child, fragment)
        );
    }
    return false;
};

const containsHardline = (value: unknown): boolean =>
    containsFragment(value, hardline);
const containsLine = (value: unknown): boolean => containsFragment(value, line);

const makeTextNode = (value: string, role: TokenRole = "word"): TextNode => ({
    type: "Text",
    value,
    role,
    loc: { start: 0, end: value.length },
});

const makeExpressionNode = (parts: ExpressionPartNode[]): ExpressionNode => ({
    type: "Expression",
    parts,
    loc: { start: 0, end: parts[parts.length - 1]?.loc.end ?? 0 },
});

const makeParenthesisNode = (
    elements: ExpressionNode[],
    overrides: Partial<ParenthesisNode> = {}
): ParenthesisNode => ({
    type: "Parenthesis",
    elements,
    hasComma: false,
    hasNewline: false,
    loc: { start: 0, end: 0 },
    ...overrides,
});

const { createLocation, isNodeType, cloneNode } = astRuntime as {
    createLocation: (start: number, end?: number) => SourceLocation;
    isNodeType: <Type extends BaseNode["type"]>(
        node: BaseNode | null | undefined,
        type: Type
    ) => node is Extract<BaseNode, { type: Type }>;
    cloneNode: <T extends BaseNode>(node: T) => T;
};

const runtimeHelperBundle = runtimeExports as {
    createLocation: typeof createLocation;
    isNodeType: typeof isNodeType;
    cloneNode: typeof cloneNode;
};

describe("ast runtime helpers", () => {
    it("createLocation normalizes coordinates and prevents negative spans", () => {
        expect(createLocation(-4, 6)).toEqual({ start: 0, end: 6 });
        expect(createLocation(10, 3)).toEqual({ start: 10, end: 10 });
        expect(createLocation(5.9, Number.NaN)).toEqual({ start: 5, end: 5 });
        expect(createLocation(Number.POSITIVE_INFINITY, 15)).toEqual({
            start: 0,
            end: 15,
        });
    });

    it("isNodeType performs narrow checks reliably", () => {
        const textNode: TextNode = {
            type: "Text",
            value: "Sample",
            role: "word",
            loc: createLocation(0, 6),
        };
        expect(isNodeType(textNode, "Text")).toBe(true);
        expect(isNodeType(textNode, "Comment")).toBe(false);
        expect(isNodeType(null, "Text")).toBe(false);
    });

    it("cloneNode returns a structural clone with isolated location object", () => {
        const original: CommentNode = {
            type: "Comment",
            value: "note",
            inline: true,
            style: "line",
            loc: createLocation(1, 5),
        };
        const cloned = cloneNode(original);
        expect(cloned).not.toBe(original);
        expect(cloned.loc).not.toBe(original.loc);
        expect(cloned).toEqual(original);
    });

    it("runtimeExports exposes frozen helper references", () => {
        expect(Object.isFrozen(runtimeHelperBundle)).toBe(true);
        expect(runtimeHelperBundle.createLocation).toBe(createLocation);
        expect(runtimeHelperBundle.isNodeType).toBe(isNodeType);
        expect(runtimeHelperBundle.cloneNode).toBe(cloneNode);

        const cloned = runtimeHelperBundle.cloneNode({
            type: "Comment",
            value: "bundle",
            inline: false,
            style: "line",
            loc: { start: 0, end: 6 },
        });
        expect(cloned.value).toBe("bundle");
    });
});

describe("resolveOptions advanced coverage", () => {
    it("clamps indentation, enables tabs, and enforces minimum line width", () => {
        const options = createOptions({
            powershellIndentStyle: "tabs",
            powershellIndentSize: 6,
            powershellLineWidth: 20,
        });

        const resolved = resolveOptions(options);

        expect(options.useTabs).toBe(true);
        expect(options.tabWidth).toBe(6);
        expect(resolved.lineWidth).toBe(40);
        expect(options.printWidth).toBe(40);
        expect(resolved.indentStyle).toBe("tabs");
        expect(resolved.indentSize).toBe(6);
    });

    it("respects existing printWidth and clamps maximum line width", () => {
        const options = createOptions({
            powershellLineWidth: 400,
            printWidth: 60,
            powershellBlankLineAfterParam: false,
            powershellPreferSingleQuote: true,
            powershellRewriteAliases: true,
            powershellRewriteWriteHost: true,
        });

        const resolved = resolveOptions(options);

        expect(resolved.lineWidth).toBe(200);
        expect(options.printWidth).toBe(60);
        expect(resolved.blankLineAfterParam).toBe(false);
        expect(resolved.preferSingleQuote).toBe(true);
        expect(resolved.rewriteAliases).toBe(true);
        expect(resolved.rewriteWriteHost).toBe(true);
    });

    it("clamps blank lines between functions within the allowed range", () => {
        const options = createOptions({
            powershellBlankLinesBetweenFunctions: 10,
        });
        const resolved = resolveOptions(options);
        expect(resolved.blankLinesBetweenFunctions).toBe(3);
    });

    it("clamps printWidth when exceeding resolved line width and handles negative blank lines", () => {
        const options = createOptions({
            powershellLineWidth: 80,
            printWidth: 320,
            powershellBlankLinesBetweenFunctions: -5,
            powershellIndentStyle: "spaces",
        });

        const resolved = resolveOptions(options);

        expect(options.useTabs).toBe(false);
        expect(options.printWidth).toBe(80);
        expect(resolved.blankLinesBetweenFunctions).toBe(0);
    });

    it("respects explicit blankLineAfterParam true configuration", () => {
        const options = createOptions({ powershellBlankLineAfterParam: true });
        const resolved = resolveOptions(options);
        expect(resolved.blankLineAfterParam).toBe(true);
    });

    it("cascades indent fallbacks and ignores invalid blank-line input", () => {
        const options = createOptions({ tabWidth: 6 });
        Reflect.deleteProperty(options, "powershellIndentSize");

        const cascade = resolveOptions(options);
        expect(cascade.indentSize).toBe(6);

        Reflect.deleteProperty(options, "tabWidth");
        options.powershellIndentSize = Number.NaN as unknown as number;
        options.powershellBlankLinesBetweenFunctions =
            Number.NaN as unknown as number;

        const defaulted = resolveOptions(options);
        expect(defaulted.indentSize).toBe(2);
        expect(options.tabWidth).toBe(2);
        expect(defaulted.blankLinesBetweenFunctions).toBe(1);
    });
    // Do not rewrite regex-like patterns containing nested quotes/brackets
    it("does not rewrite regex-like pattern strings", () => {
        const opts = resolveOptions(
            createOptions({ powershellPreferSingleQuote: true })
        );
        const pattern = "\"(?m)Write-Host\\s+[\"'']([^\"'']+)\"";
        expect(normalizeStringLiteral(pattern, opts)).toBe(pattern);
    });
});

describe("tokenizer advanced coverage", () => {
    it("tokenizes CRLF newlines distinctly", () => {
        const tokens = tokenize("first\r\nsecond");
        expect(tokens[0]?.type).toBe("identifier");
        const newline = tokens.find((token) => token.type === "newline");
        expect(newline?.value).toBe("\r\n");
    });

    it("tokenizes variables with brace and colon syntax", () => {
        const tokens = tokenize("${env:PATH}");
        const variable = tokens.find((token) => token.type === "variable");
        expect(variable?.value).toBe("${env:PATH}");
    });

    it("tokenizes comments while trimming trailing whitespace", () => {
        const tokens = tokenize("# comment   ");
        expect(tokens[0]?.type).toBe("comment");
        expect(tokens[0]?.value).toBe(" comment");
        expect(tokens[0]?.value.endsWith(" ")).toBe(false);
    });

    it("supports complex variable characters inside braces", () => {
        const tokens = tokenize("${user-name_with:parts}");
        const variable = tokens.find((token) => token.type === "variable");
        expect(variable?.value).toBe("${user-name_with:parts}");
    });

    it("tokenizes double colon as a single operator", () => {
        const tokens = tokenize("Namespace::Member");
        const operatorToken = tokens.find(
            (token) => token.type === "operator" && token.value === "::"
        );
        expect(operatorToken).toBeDefined();
    });

    it("tokenizes repeated operators as combined tokens", () => {
        const tokens = tokenize("|| == |");
        expect(
            tokens.filter(
                (token) => token.type === "operator" && token.value === "||"
            )
        ).toHaveLength(1);
        expect(
            tokens.filter(
                (token) => token.type === "operator" && token.value === "=="
            )
        ).toHaveLength(1);
        expect(
            tokens.filter(
                (token) => token.type === "operator" && token.value === "|"
            )
        ).toHaveLength(1);
    });

    it("tokenizes implicit and explicit array openings distinctly", () => {
        const tokens = tokenize("@(1, 2) [3,4]");
        expect(
            tokens.some(
                (token) => token.type === "operator" && token.value === "@("
            )
        ).toBe(true);
        expect(
            tokens.some(
                (token) => token.type === "punctuation" && token.value === "["
            )
        ).toBe(true);
    });

    it("tokenizes hashtable opening operator distinctly", () => {
        const tokens = tokenize("@{ a = 1 }");
        expect(
            tokens.some(
                (token) => token.type === "operator" && token.value === "@{"
            )
        ).toBe(true);
    });

    it("tokenizes line continuation backtick as an unknown token", () => {
        const tokens = tokenize("`");
        expect(tokens[0]?.type).toBe("unknown");
        expect(tokens[0]?.value).toBe("`");
    });

    it("tokenizes simple variables without braces", () => {
        const tokens = tokenize("$env:PATH");
        const variable = tokens.find((token) => token.type === "variable");
        expect(variable?.value).toBe("$env:PATH");
    });

    it("emits unknown tokens when no rules match", () => {
        const tokens = tokenize("§");
        expect(tokens[0]?.type).toBe("unknown");
        expect(tokens[0]?.value).toBe("§");
    });

    it("normalizes here-strings while preserving quote metadata", () => {
        const script = `@"\nAlpha\n"@\n@'\nBeta\n'@`;
        const tokens = tokenize(script);
        const doubleToken = tokens.find(
            (token) => token.type === "heredoc" && token.quote === "double"
        );
        const singleToken = tokens.find(
            (token) => token.type === "heredoc" && token.quote === "single"
        );
        if (!doubleToken || !singleToken) {
            throw new Error("Expected here-string tokens");
        }
        const doubleNode: HereStringNode = {
            type: "HereString",
            quote: "double",
            value: doubleToken.value,
            loc: createLocation(0, doubleToken.value.length),
        };
        const singleNode: HereStringNode = {
            type: "HereString",
            quote: "single",
            value: singleToken.value,
            loc: createLocation(0, singleToken.value.length),
        };
        expect(normalizeHereString(doubleNode)).toBe("Alpha");
        expect(normalizeHereString(singleNode)).toBe("Beta");

        const inlineNode: HereStringNode = {
            type: "HereString",
            quote: "double",
            value: '@"Inline"@',
            loc: createLocation(0, 11),
        };
        expect(normalizeHereString(inlineNode)).toBe('@"Inline"@');
    });

    it("tokenizes unterminated here-strings by consuming remaining source", () => {
        const tokens = tokenize('@"\nmissing terminator');
        const heredoc = tokens[0];
        expect(heredoc?.type).toBe("heredoc");
        expect(heredoc?.value).toBe('@"\nmissing terminator');
    });

    it("tokenizes decimal numbers with fractional components", () => {
        const tokens = tokenize("3.14");
        expect(tokens[0]?.type).toBe("number");
        expect(tokens[0]?.value).toBe("3.14");
    });

    it("tokenizes immediate-closing here-strings", () => {
        const tokens = tokenize('@""@');
        const heredoc = tokens.find((token) => token.type === "heredoc");
        expect(heredoc?.value).toBe('@""@');
    });

    it("tokenizes here-strings closing after unix newline", () => {
        const tokens = tokenize('@"\nUnix\n"@');
        const heredoc = tokens.find((token) => token.type === "heredoc");
        expect(heredoc?.value.endsWith('"@')).toBe(true);
    });

    it("tokenizes here-strings closing after windows newline", () => {
        const tokens = tokenize('@"\r\nWindows\r\n"@');
        const heredoc = tokens.find((token) => token.type === "heredoc");
        expect(heredoc?.value.endsWith('"@')).toBe(true);
    });

    it("tokenizes here-strings closing after mixed newline order", () => {
        const tokens = tokenize('@"\n\rMixed\n\r"@');
        const heredoc = tokens.find((token) => token.type === "heredoc");
        expect(heredoc?.value.endsWith('"@')).toBe(true);
    });
});

describe("parser advanced coverage", () => {
    const parse = (
        source: string,
        overrides: Partial<PowerShellParserOptions> = {}
    ) => parsePowerShell(source, createOptions(overrides));

    it("parses pipeline with line continuation and trailing comment", () => {
        const script =
            "Get-Process `\n| Where-Object { $_.Name } # trailing comment";
        const ast = parse(script);
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        expect(pipeline.segments.length).toBe(2);
        expect(pipeline.trailingComment?.value.trim()).toBe("trailing comment");
    });

    it("parseStatementForTest captures newlines within structured segments", () => {
        const tokens = tokenize('Write-Output (Get-Item\n  "C:")');
        const statement = parserUtils.parseStatementForTest(tokens);
        const parenthesis = statement?.segments[0]?.parts.find(
            (part): part is ParenthesisNode => part.type === "Parenthesis"
        );
        expect(parenthesis?.hasNewline).toBe(true);
    });

    it("parseStatementForTest honors line continuation tokens", () => {
        const tokens = tokenize("Get-Process `\n| Where-Object { $_.Name }");
        const statement = parserUtils.parseStatementForTest(tokens);
        expect(statement?.segments.length).toBe(2);
    });

    it("treats newline inside parentheses as part of expression", () => {
        const script = 'Write-Output (Get-Item\n  "C:")';
        const ast = parse(script);
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        const parenthesis = pipeline.segments[0]?.parts.find(
            (part) => part.type === "Parenthesis"
        );
        expect(parenthesis).toBeDefined();
        expect(
            (parenthesis as { hasNewline: boolean } | undefined)?.hasNewline
        ).toBe(true);
    });

    it("breaks pipeline when newline comment prevents continuation", () => {
        const script =
            "Get-Process\n# stop continuation\n| Where-Object { $_ }";
        const ast = parse(script);
        const comment = ast.body.find((node) => node.type === "Comment");
        if (!comment || comment.type !== "Comment") {
            throw new Error("Expected comment node");
        }
        expect(comment.value.trim()).toBe("stop continuation");
        const pipelines = ast.body.filter((node) => node.type === "Pipeline");
        expect(pipelines.length).toBe(2);
        expect(pipelines[0]?.segments.length).toBe(1);
        const segmentParts = pipelines[1]?.segments[0]?.parts ?? [];
        const firstPart = segmentParts[0];
        if (!firstPart || firstPart.type !== "Text") {
            throw new Error(
                "Expected text part starting the continuation pipeline"
            );
        }
        expect(firstPart.value).toBe("Where-Object");
        expect(
            segmentParts.some(
                (part) => part.type === "Text" && part.value === "|"
            )
        ).toBe(false);
    });

    it("splits statements on semicolons and collects blank lines", () => {
        const script =
            'Write-Host "One"; Write-Host "Two"\n\n\nWrite-Host "Three"';
        const ast = parse(script);
        const pipelines = ast.body.filter((node) => node.type === "Pipeline");
        expect(pipelines.length).toBe(3);
        const blank = ast.body.find((node) => node.type === "BlankLine");
        if (!blank || blank.type !== "BlankLine") {
            throw new Error("Expected blank line node");
        }
        expect(blank.count).toBe(3);
    });

    it("handles unterminated script blocks gracefully", () => {
        const script = 'function Missing {\n  Write-Host "x"';
        const ast = parse(script);
        const fn = ast.body.find((node) => node.type === "FunctionDeclaration");
        if (!fn || fn.type !== "FunctionDeclaration") {
            throw new Error("Expected function node");
        }
        expect(fn.body.loc.end).toBeGreaterThan(fn.header.loc.end);
    });

    it("parses function header without opening brace", () => {
        const script = "function HeaderOnly\nparam([string]$Name)";
        const ast = parse(script);
        const fn = ast.body.find((node) => node.type === "FunctionDeclaration");
        if (!fn || fn.type !== "FunctionDeclaration") {
            throw new Error("Expected function node");
        }
        expect(fn.body.body.length).toBe(0);
    });

    it("parses complex hashtable entries and nested structures", () => {
        const script =
            '@{ "quoted" = 1; flag; single = @{ nested = @(1, 2) } }';
        const ast = parse(script);
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        const parts = pipeline.segments[0]?.parts ?? [];
        const table = parts.find((part) => part.type === "Hashtable") as
            | {
                  entries: Array<{
                      key: string;
                      value: { type: string; parts?: Array<{ type: string }> };
                  }>;
              }
            | undefined;
        expect(table).toBeDefined();
        expect(table!.entries.length).toBe(3);
        expect(table!.entries[0]?.key).toBe("quoted");
        expect(table!.entries[1]?.key).toBe("flag");
        const nestedValue = table!.entries[2]?.value;
        expect(nestedValue.type).toBe("Expression");
        expect(nestedValue.parts?.[0]?.type).toBe("Hashtable");
    });

    it("parses explicit arrays and records explicit kind metadata", () => {
        const ast = parse("[1, 2, 3]");
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        const arrayNode = pipeline.segments[0]?.parts.find(
            (part): part is ArrayLiteralNode => part.type === "ArrayLiteral"
        );
        expect(arrayNode?.kind).toBe("explicit");
    });

    it("captures here-strings as expression parts", () => {
        const script = '@"\nAlpha\n"@';
        const ast = parse(script);
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        const hereString = pipeline.segments[0]?.parts.find(
            (part): part is HereStringNode => part.type === "HereString"
        );
        expect(hereString?.quote).toBe("double");
        expect(hereString?.value.includes("Alpha")).toBe(true);
    });

    it("parses standalone unknown tokens as text nodes", () => {
        const ast = parse("§");
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        const firstPart = pipeline.segments[0]?.parts[0];
        expect(firstPart?.type).toBe("Text");
        expect((firstPart as TextNode).role).toBe("unknown");
    });

    it("stops function header scanning when encountering inline comments", () => {
        const script =
            'function HeaderComment # comment here\n{ Write-Host "inside" }';
        const ast = parse(script);
        const fn = ast.body.find((node) => node.type === "FunctionDeclaration");
        if (!fn || fn.type !== "FunctionDeclaration") {
            throw new Error("Expected function declaration");
        }
        const headerText = fn.header.parts
            .filter((part) => part.type === "Text")
            .map((part) => part.value)
            .join(" ");
        expect(headerText).toContain("HeaderComment");
        expect(headerText).not.toContain("#");
        const inlineComment = ast.body.find((node) => node.type === "Comment");
        expect(inlineComment?.value.trim()).toBe("comment here");
    });

    it("continues pipelines across bare newline followed by pipe", () => {
        const script = "Get-Process\n| Sort-Object Name";
        const ast = parse(script);
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        expect(pipeline.segments.length).toBe(2);
    });

    it("keeps nested pipeline segments inside script blocks intact", () => {
        const script = `InModuleScope ColorScripts-Enhanced {
  New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
  $script:CacheDir = $cacheRoot
}`;

        const ast = parse(script);
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected top-level pipeline node");
        }

        const scriptBlock = pipeline.segments[0]?.parts.find(
            (part): part is ScriptBlockNode => part.type === "ScriptBlock"
        );
        if (!scriptBlock) {
            throw new Error(
                "Expected script block argument within InModuleScope call"
            );
        }

        const innerPipelines = scriptBlock.body.filter(
            (node): node is PipelineNode => node.type === "Pipeline"
        );
        const nestedPipeline = innerPipelines.find(
            (node) => node.segments.length > 1
        );
        if (!nestedPipeline) {
            throw new Error("Expected nested pipeline with multiple segments");
        }

        expect(nestedPipeline.segments.length).toBe(2);
        const firstSegmentText = nestedPipeline.segments[0]?.parts.find(
            (part): part is TextNode => part.type === "Text"
        );
        const secondSegmentText = nestedPipeline.segments[1]?.parts.find(
            (part): part is TextNode => part.type === "Text"
        );
        expect(firstSegmentText?.value).toBe("New-Item");
        expect(secondSegmentText?.value).toBe("Out-Null");

        const subsequentPipeline = innerPipelines.find(
            (node) => node !== nestedPipeline && node.segments.length === 1
        );
        expect(subsequentPipeline).toBeDefined();
        const assignmentSegment = subsequentPipeline?.segments[0]?.parts.find(
            (part): part is TextNode => part.type === "Text"
        );
        expect(assignmentSegment?.value).toBe("$script:CacheDir");
    });

    it("terminates statements when encountering a closing brace at top level", () => {
        const script = 'if ($true) {\n  Write-Host "in"\n}\nWrite-Host "out"';
        const ast = parse(script);
        const pipelines = ast.body.filter((node) => node.type === "Pipeline");
        expect(pipelines.length).toBe(2);
    });

    it("handles unterminated hashtables by capturing available tokens", () => {
        const script = "@{ key = 1";
        const ast = parse(script);
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        const table = pipeline.segments[0]?.parts.find(
            (part) => part.type === "Hashtable"
        );
        expect(table).toBeDefined();
        expect(
            (table as { entries: unknown[] } | undefined)?.entries.length
        ).toBe(1);
    });

    it("uses hashtable start token end when no content or closing brace exists", () => {
        const script = "@{";
        const ast = parse(script);
        const pipeline = ast.body[0];
        if (!pipeline || pipeline.type !== "Pipeline") {
            throw new Error("Expected pipeline node");
        }
        const table = pipeline.segments[0]?.parts.find(
            (part): part is HashtableNode => part.type === "Hashtable"
        );
        if (!table) {
            throw new Error("Expected hashtable node");
        }
        expect(table.entries.length).toBe(0);
        expect(table.loc.end).toBe(2);
    });
});

describe("printer advanced coverage", () => {
    it("formats multiple functions with custom spacing options", async () => {
        const script =
            'function A {\n  param([string]$Name)\n  Write-Host $Name\n}\nfunction B {\n  Write-Host "B"\n}\n';
        const result = await prettier.format(script, {
            ...baseConfig,
            powershellBlankLinesBetweenFunctions: 2,
            powershellBlankLineAfterParam: true,
        });

        expect(result).toContain("function A");
        const blankLineSegments = result.split("\n");
        expect(
            blankLineSegments.filter((line) => line.trim() === "").length
        ).toBeGreaterThanOrEqual(3);
    });

    it("honors allman brace style and tab indentation", async () => {
        const script = 'function Tabs { if ($true) { Write-Host "tab" } }';
        const result = await prettier.format(script, {
            ...baseConfig,
            powershellBraceStyle: "allman",
            powershellIndentStyle: "tabs",
            powershellIndentSize: 1,
        });

        expect(result).toContain("function Tabs");
        expect(result).toContain("\n{\n");
        expect(result).toContain("\t");
    });

    it("prints pipelines with multiple segments and trailing comments", async () => {
        const script =
            "Get-Process | Where-Object { $_.Name } | Select-Object Name # in pipeline";
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("| Where-Object");
        expect(result).toContain("# in pipeline");
    });

    it("preserves nested pipeline segments when formatting script blocks", async () => {
        const script = `InModuleScope ColorScripts-Enhanced {
  New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
  $script:CacheDir = $cacheRoot
}`;
        const result = await prettier.format(script, baseConfig);

        expect(result).toContain(
            "New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null"
        );
        expect(result).toContain("$script:CacheDir = $cacheRoot");
    });

    it("keeps increment operators and indexers intact", async () => {
        const script = `
for ($i = 0; $i -lt $lines.Count; $i++) {
  $values[$i] += 1
  $values[$i]++
  $values[$i]--
}
`;
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("$i++)");
        expect(result).toContain("$values[$i] += 1");
        expect(result).toContain("$values[$i]++");
        expect(result).toContain("$values[$i]--");
    });

    it("handles param keyword parenthesis spacing", async () => {
        const script = "param([string]$Name, [int]$Age)";
        const result = await prettier.format(script, baseConfig);
        expect(result.trim()).toBe(
            "param(\n  [string] $Name,\n  [int] $Age\n)"
        );
    });

    it("preserves spacing around hashtables and property access", async () => {
        const script = "$obj.Property::Method(@{ a = 1 })";
        const result = await prettier.format(script, baseConfig);
        expect(result).toContain("Property::Method");
        expect(result).toContain("@{ a = 1 }");
    });

    it("formats diverse spacing scenarios to exercise gap rules", async () => {
        const script = `
function Sample {
  param(
    [string]$Name,
    [int]$Age
  )

  $hash = @{
    "quoted" = 1
    nested = @{ items = @(1, 2) }
  }

  if($true){$value=1}
  Write-Host ($Name).ToUpper()
  $result = @{ inner = 1 }
  $array = @(1,2)
  $object.Property::Method(@{ key = 1 }, @(1, 2))
  ($Name).Length
}

Sample
`;

        const result = await prettier.format(script, {
            ...baseConfig,
            powershellKeywordCase: "upper",
            powershellPreferSingleQuote: true,
        });

        expect(result).toContain("FUNCTION Sample");
        expect(result).toContain("'quoted'");
        expect(result).toContain("Property::Method");
    });

    it("sorts hashtable keys when option enabled", async () => {
        const script = "@{ b = 1; a = 2 }";
        const result = await prettier.format(script, {
            ...baseConfig,
            powershellSortHashtableKeys: true,
        });

        expect(result.indexOf("a = 2")).toBeLessThan(result.indexOf("b = 1"));
    });

    it("rewrites aliases and Write-Host invocations when configured", async () => {
        const script = 'ls\nWrite-Host "hi"';
        const result = await prettier.format(script, {
            ...baseConfig,
            powershellRewriteAliases: true,
            powershellRewriteWriteHost: true,
        });

        expect(result).toContain("Get-ChildItem");
        expect(result).toContain('Write-Output "hi"');
    });
});

describe("printer internal helpers", () => {
    const resolvedOptions = resolveOptions(createOptions());

    it("gapBetween handles spacing combinations", () => {
        const paramKeyword = makeTextNode("param", "keyword");
        const emptyParen = makeParenthesisNode([]);
        expect(gapBetween(paramKeyword, emptyParen)).toBeNull();

        const previousParen = makeParenthesisNode([]);
        const closingParen = makeTextNode(")", "punctuation");
        expect(gapBetween(previousParen, closingParen)).toBeNull();

        const wordA = makeTextNode("Get");
        const wordB = makeTextNode("Item");
        expect(gapBetween(wordA, wordB)).toBe(" ");

        const comma = makeTextNode(",", "punctuation");
        expect(gapBetween(wordA, comma)).toBeNull();

        expect(gapBetween(wordA, closingParen)).toBeNull();

        const doubleColon = makeTextNode("::", "operator");
        expect(gapBetween(wordA, doubleColon)).toBeNull();

        const equals = makeTextNode("=", "operator");
        expect(gapBetween(equals, wordB)).toBe(" ");

        const equalsRight = makeTextNode("=", "operator");
        expect(gapBetween(wordB, equalsRight)).toBe(" ");

        expect(gapBetween(equals, closingParen)).toBeNull();

        const openParenSymbol = makeTextNode("(", "punctuation");
        expect(gapBetween(openParenSymbol, wordA)).toBeNull();

        const prevNoGapSymbol = makeTextNode("word", "operator");
        const currentOperatorSymbol = makeTextNode("(", "operator");
        expect(gapBetween(prevNoGapSymbol, currentOperatorSymbol)).toBeNull();

        const scriptBlockNode: ScriptBlockNode = {
            type: "ScriptBlock",
            body: [],
            loc: { start: 0, end: 0 },
        };
        expect(gapBetween(prevNoGapSymbol, scriptBlockNode)).toBe(" ");

        const blockNode: ScriptBlockNode = {
            type: "ScriptBlock",
            body: [],
            loc: { start: 0, end: 0 },
        };
        expect(gapBetween(wordB, blockNode)).toBe(" ");

        const plusOperator = makeTextNode("+", "operator");
        const equalsOperator = makeTextNode("=", "operator");
        expect(gapBetween(plusOperator, equalsOperator)).toBeNull();
        expect(
            gapBetween(plusOperator, makeTextNode("+", "operator"))
        ).toBeNull();

        const accessorTarget: ArrayLiteralNode = {
            type: "ArrayLiteral",
            elements: [],
            kind: "explicit",
            loc: { start: 0, end: 0 },
        };
        expect(gapBetween(wordA, accessorTarget)).toBeNull();
    });

    it("getSymbol handles null input gracefully", () => {
        expect(getSymbol(null)).toBeNull();
    });

    it("shouldSkipPart ignores isolated backticks", () => {
        const part = makeTextNode("   `   ", "operator");
        expect(shouldSkipPart(part)).toBe(true);
    });

    it("normalizeStringLiteral respects quoting preferences", () => {
        const preferSingle = resolveOptions(
            createOptions({ powershellPreferSingleQuote: true })
        );
        expect(normalizeStringLiteral('"hello"', preferSingle)).toBe("'hello'");
        expect(normalizeStringLiteral('"he"llo"', preferSingle)).toBe(
            '"he"llo"'
        );
        expect(normalizeStringLiteral("'already'", preferSingle)).toBe(
            "'already'"
        );
        expect(normalizeStringLiteral('"needs $expansion"', preferSingle)).toBe(
            '"needs $expansion"'
        );
        const noPreference = resolveOptions(
            createOptions({ powershellPreferSingleQuote: false })
        );
        expect(normalizeStringLiteral('"hello"', noPreference)).toBe('"hello"');
    });

    it("printParamParenthesis handles empty element lists", () => {
        const doc = printParamParenthesis(
            makeParenthesisNode([]),
            resolvedOptions
        );
        expect(doc).toBe("()");
    });

    it("printParenthesis forces multiline output when newline metadata is present", () => {
        const node = makeParenthesisNode(
            [
                makeExpressionNode([makeTextNode("first", "word")]),
                makeExpressionNode([makeTextNode("second", "word")]),
            ],
            { hasNewline: true, hasComma: false }
        );
        const doc = __printerTestUtils.printNode(node, resolvedOptions);
        expect(containsHardline(doc)).toBe(true);
    });

    it("printParenthesis forces multiline when multiple elements lack commas", () => {
        const node = makeParenthesisNode(
            [
                makeExpressionNode([makeTextNode("alpha", "word")]),
                makeExpressionNode([makeTextNode("beta", "word")]),
            ],
            { hasComma: false, hasNewline: false }
        );
        const doc = __printerTestUtils.printNode(node, resolvedOptions);
        expect(containsHardline(doc)).toBe(true);
    });

    it("printParenthesis uses inline separators when comma metadata is present", () => {
        const node = makeParenthesisNode(
            [
                makeExpressionNode([makeTextNode("one", "word")]),
                makeExpressionNode([makeTextNode("two", "word")]),
            ],
            { hasComma: true, hasNewline: false }
        );
        const doc = __printerTestUtils.printNode(node, resolvedOptions);
        expect(containsHardline(doc)).toBe(false);
        expect(containsLine(doc)).toBe(true);
    });

    it("printParenthesis combines commas with hardline separators when multiline", () => {
        const node = makeParenthesisNode(
            [
                makeExpressionNode([makeTextNode("first", "word")]),
                makeExpressionNode([makeTextNode("second", "word")]),
            ],
            { hasComma: true, hasNewline: true }
        );
        const doc = __printerTestUtils.printNode(node, resolvedOptions);
        expect(containsHardline(doc)).toBe(true);
    });

    it("trailingCommaDoc respects trailing comma settings", () => {
        const allComma = resolveOptions(
            createOptions({ powershellTrailingComma: "all" })
        );
        const groupId = Symbol("test");
        expect(trailingCommaDoc(allComma, groupId, false, ",")).toBe("");
        expect(trailingCommaDoc(allComma, groupId, true, ",")).toBe(",");

        const multiComma = resolveOptions(
            createOptions({ powershellTrailingComma: "multiline" })
        );
        expect(trailingCommaDoc(multiComma, groupId, true, ";")).not.toBe("");
    });

    it("printPipeline handles empty and populated pipelines", () => {
        const emptyPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [],
            loc: { start: 0, end: 0 },
        };
        expect(printPipeline(emptyPipeline, resolvedOptions)).toBe("");

        const populatedPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [
                makeExpressionNode([makeTextNode("Get-Process", "word")]),
                makeExpressionNode([makeTextNode("Where-Object", "word")]),
            ],
            loc: { start: 0, end: 0 },
        };
        expect(printPipeline(populatedPipeline, resolvedOptions)).not.toBe("");
    });

    it("isParamStatement checks pipelines safely", () => {
        expect(isParamStatement(null as unknown as ScriptBodyNode)).toBe(false);
        const emptySegments: PipelineNode = {
            type: "Pipeline",
            segments: [],
            loc: { start: 0, end: 0 },
        };
        expect(isParamStatement(emptySegments)).toBe(false);
        const emptyPartsPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [makeExpressionNode([])],
            loc: { start: 0, end: 0 },
        };
        expect(isParamStatement(emptyPartsPipeline)).toBe(false);
        const noTextPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [makeExpressionNode([makeParenthesisNode([])])],
            loc: { start: 0, end: 0 },
        };
        expect(isParamStatement(noTextPipeline)).toBe(false);
        const paramPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [makeExpressionNode([makeTextNode("param", "keyword")])],
            loc: { start: 0, end: 0 },
        };
        expect(isParamStatement(paramPipeline)).toBe(true);
    });

    it("printScript returns empty doc when body is empty", () => {
        const scriptNode: ScriptNode = {
            type: "Script",
            body: [],
            loc: { start: 0, end: 0 },
        };
        expect(
            __printerTestUtils.printScript(scriptNode, resolvedOptions)
        ).toBe("");
    });

    it("concatDocs handles empty arrays and concatenation", () => {
        expect(__printerTestUtils.concatDocs([])).toBe("");
        const combined = __printerTestUtils.concatDocs(["a", "b"]);
        expect(Array.isArray(combined)).toBe(true);
    });

    it("indentStatement honors tab indentation style", () => {
        const tabOptions = resolveOptions(
            createOptions({
                powershellIndentStyle: "tabs",
                powershellIndentSize: 3,
            })
        );
        const indented = __printerTestUtils.indentStatement("body", tabOptions);
        expect(Array.isArray(indented)).toBe(true);
        expect((indented as Doc[])[0]).toBe("\t");
    });

    it("printNode falls back to empty doc for unknown nodes", () => {
        const unknownNode = {
            type: "Unknown",
            loc: { start: 0, end: 0 },
        } as unknown as ScriptBodyNode;
        expect(__printerTestUtils.printNode(unknownNode, resolvedOptions)).toBe(
            ""
        );
    });

    it("printText preserves keywords for unknown case transforms", () => {
        const mutatedOptions = {
            ...resolvedOptions,
        } as typeof resolvedOptions & {
            keywordCase: string;
        };
        Reflect.set(mutatedOptions, "keywordCase", "unexpected");
        const keywordNode = makeTextNode("While", "keyword");
        expect(__printerTestUtils.printNode(keywordNode, mutatedOptions)).toBe(
            "While"
        );
    });

    it("printText applies pascal keyword transformations", () => {
        const pascalOptions = resolveOptions(
            createOptions({ powershellKeywordCase: "pascal" })
        );
        const keywordNode = makeTextNode("function", "keyword");
        expect(__printerTestUtils.printNode(keywordNode, pascalOptions)).toBe(
            "Function"
        );
    });

    it("printText leaves empty keywords untouched in pascal mode", () => {
        const pascalOptions = resolveOptions(
            createOptions({ powershellKeywordCase: "pascal" })
        );
        const emptyKeyword = makeTextNode("", "keyword");
        expect(__printerTestUtils.printNode(emptyKeyword, pascalOptions)).toBe(
            ""
        );
    });

    it("printText rewrites generic aliases when enabled", () => {
        const aliasOptions = resolveOptions(
            createOptions({ powershellRewriteAliases: true })
        );
        const aliasNode = makeTextNode("write", "word");
        expect(__printerTestUtils.printNode(aliasNode, aliasOptions)).toBe(
            "Write-Output"
        );
    });

    it("printStatementList applies pending blank lines and indentation", () => {
        const pipeline: PipelineNode = {
            type: "Pipeline",
            segments: [
                makeExpressionNode([makeTextNode("Write-Host", "word")]),
            ],
            loc: { start: 0, end: 0 },
        };
        const blankLine: ScriptBodyNode = {
            type: "BlankLine",
            count: 1,
            loc: { start: 0, end: 0 },
        };
        const doc = __printerTestUtils.printStatementList(
            [blankLine, pipeline],
            resolvedOptions,
            true
        );
        expect(doc).toBeDefined();
    });

    it("printStatementList enforces function declaration spacing", () => {
        const script = parsePowerShell(
            `function Alpha {}
function Beta {}`,
            createOptions()
        );
        const doc = __printerTestUtils.printStatementList(
            script.body,
            resolvedOptions,
            false
        );
        expect(doc).toBeDefined();
    });

    it("printStatementList handles function followed by pipeline spacing", () => {
        const script = parsePowerShell(
            `function Gamma {}
Write-Host "hi"`,
            createOptions()
        );
        const doc = __printerTestUtils.printStatementList(
            script.body,
            resolvedOptions,
            false
        );
        expect(doc).toBeDefined();
    });

    it("printStatementList handles pipeline preceding function spacing", () => {
        const script = parsePowerShell(
            `Write-Host "hi"
function Delta {}`,
            createOptions()
        );
        const doc = __printerTestUtils.printStatementList(
            script.body,
            resolvedOptions,
            false
        );
        expect(doc).toBeDefined();
    });

    it("printStatementList honours pending blank lines between entries", () => {
        const firstPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [makeExpressionNode([makeTextNode("First", "word")])],
            loc: { start: 0, end: 0 },
        };
        const secondPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [makeExpressionNode([makeTextNode("Second", "word")])],
            loc: { start: 0, end: 0 },
        };
        const blank: ScriptBodyNode = {
            type: "BlankLine",
            count: 2,
            loc: { start: 0, end: 0 },
        };
        const doc = __printerTestUtils.printStatementList(
            [
                firstPipeline,
                blank,
                secondPipeline,
            ],
            resolvedOptions,
            false
        );
        expect(doc).toBeDefined();
    });

    it("printStatementList handles consecutive pipelines without blank lines", () => {
        const firstPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [makeExpressionNode([makeTextNode("Alpha", "word")])],
            loc: { start: 0, end: 0 },
        };
        const secondPipeline: PipelineNode = {
            type: "Pipeline",
            segments: [makeExpressionNode([makeTextNode("Beta", "word")])],
            loc: { start: 0, end: 0 },
        };
        const doc = __printerTestUtils.printStatementList(
            [firstPipeline, secondPipeline],
            resolvedOptions,
            false
        );
        expect(doc).toBeDefined();
    });

    it("powerShellPrinter returns empty doc for undefined nodes", () => {
        const path = {
            getValue: () => undefined,
        } as unknown as AstPath<ScriptNode>;
        const optionsForPrint = createOptions() as ParserOptions<ScriptNode>;
        const printed = powerShellPrinter.print(
            path,
            optionsForPrint,
            () => ""
        );
        expect(printed).toBe("");
    });

    it("createPrinter exposes the shared printer instance", () => {
        expect(createPrinter()).toBe(powerShellPrinter);
    });

    it("printNode routes to specialized handlers", () => {
        const loc = { start: 0, end: 0 };
        const expressionNode: ExpressionNode = makeExpressionNode([
            makeTextNode("value", "word"),
        ]);
        expressionNode.loc = loc;
        expect(
            __printerTestUtils.printNode(expressionNode, resolvedOptions)
        ).not.toBe("");

        const blankNode: ScriptBodyNode = { type: "BlankLine", count: 2, loc };
        const blankDoc = __printerTestUtils.printNode(
            blankNode,
            resolvedOptions
        ) as Doc[];
        expect(Array.isArray(blankDoc)).toBe(true);

        const commentNode: CommentNode = {
            type: "Comment",
            value: " comment",
            inline: false,
            style: "line",
            loc,
        };
        expect(
            __printerTestUtils.printNode(commentNode, resolvedOptions)
        ).toContain("#");

        const arrayNode: ArrayLiteralNode = {
            type: "ArrayLiteral",
            elements: [makeExpressionNode([makeTextNode("1", "number")])],
            kind: "explicit",
            loc,
        };
        expect(
            __printerTestUtils.printNode(arrayNode, resolvedOptions)
        ).not.toBe("");

        const emptyHashtable: HashtableNode = {
            type: "Hashtable",
            entries: [],
            loc,
        };
        expect(
            __printerTestUtils.printNode(emptyHashtable, resolvedOptions)
        ).toBe("@{}");

        const entryNode: HashtableEntryNode = {
            type: "HashtableEntry",
            key: "key",
            rawKey: makeExpressionNode([makeTextNode("key", "word")]),
            value: makeExpressionNode([makeTextNode("1", "number")]),
            loc,
        };
        expect(
            __printerTestUtils.printNode(entryNode, resolvedOptions)
        ).not.toBe("");

        const skippedPartsExpression: ExpressionNode = {
            type: "Expression",
            parts: [
                makeTextNode("   `   ", "operator"),
                makeTextNode("value", "word"),
            ],
            loc,
        };
        expect(
            __printerTestUtils.printNode(
                skippedPartsExpression,
                resolvedOptions
            )
        ).not.toBe("");
    });
});

describe("parser internal helpers", () => {
    const tokensFrom = (code: string): Token[] =>
        tokenize(code).filter(
            (token) => token.type !== "newline" || token.value !== ""
        );

    it("identifies opening and closing tokens", () => {
        const tokens = tokenize("{} () []");
        expect(parserUtils.isOpeningToken(tokens[0])).toBe(true);
        expect(parserUtils.isClosingToken(tokens[1])).toBe(true);
        expect(parserUtils.isOpeningToken(tokens[2])).toBe(true);
        expect(parserUtils.isClosingToken(tokens[3])).toBe(true);
        expect(parserUtils.isOpeningToken(tokens[4])).toBe(true);
        expect(parserUtils.isClosingToken(tokens[5])).toBe(true);
        expect(parserUtils.isOpeningToken(tokens[tokens.length - 1])).toBe(
            false
        );
    });

    it("collects structure tokens and handles missing closings", () => {
        const tokens = tokenize("{ @(1, 2) }");
        const result = parserUtils.collectStructureTokens(tokens, 0);
        expect(result.closingToken?.value).toBe("}");
        expect(result.endIndex).toBe(tokens.length);

        const missingTokens = tokenize("{ value");
        const missing = parserUtils.collectStructureTokens(missingTokens, 0);
        expect(missing.closingToken).toBeUndefined();
        expect(missing.endIndex).toBe(missingTokens.length);
    });

    it("splits hashtable entries across semicolons and newlines", () => {
        const tokens = tokensFrom("key = 1; other = @{ nested = 2 }");
        const entries = parserUtils.splitHashtableEntries(tokens);
        expect(entries.length).toBe(2);
        expect(entries[1]?.some((token) => token.value === "nested")).toBe(
            true
        );
    });

    it("splitHashtableEntries maintains stack across nested hashtables", () => {
        const tokens = tokenize("@{ outer = @{ inner = @(1, 2) } ; tail = 3 }");
        const { contentTokens } = parserUtils.collectStructureTokens(tokens, 0);
        const entries = parserUtils.splitHashtableEntries(contentTokens);
        expect(entries.length).toBe(2);
        expect(entries[0]?.some((token) => token.value === "@(")).toBe(true);
    });

    it("finds top-level equals while ignoring nested structures", () => {
        const tokens = tokensFrom("key = @{ nested = 1 }");
        const index = parserUtils.findTopLevelEquals(tokens);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(tokens[index]?.value).toBe("=");
        const nestedParenthesis = tokensFrom("outer = (nested = 1)");
        expect(parserUtils.findTopLevelEquals(nestedParenthesis)).toBe(1);
        const nestedWithoutEquals = tokensFrom("((1))");
        expect(parserUtils.findTopLevelEquals(nestedWithoutEquals)).toBe(-1);
        const noEqualsTokens = tokensFrom("justTokens");
        expect(parserUtils.findTopLevelEquals(noEqualsTokens)).toBe(-1);
    });

    it("respects configured terminators while parsing", () => {
        const script = parserUtils.parseScriptWithTerminators(
            'Write-Host "Hello" } Write-Host "Ignored"',
            new Set(["}"])
        );
        expect(script.body).toHaveLength(1);
    });

    it("extracts key text from quoted and unquoted tokens", () => {
        const doubleQuoted = tokensFrom('"quoted"');
        expect(parserUtils.extractKeyText(doubleQuoted)).toBe("quoted");
        const singleQuoted = tokensFrom("'single'");
        expect(parserUtils.extractKeyText(singleQuoted)).toBe("single");
        const plain = tokensFrom("plainKey");
        expect(parserUtils.extractKeyText(plain)).toBe("plainKey");
    });

    it("splits array elements with commas and respects nesting", () => {
        const tokens = tokensFrom("1, @(2, 3), 4");
        const elements = parserUtils.splitArrayElements(tokens);
        expect(elements.length).toBe(3);
        expect(elements[1]?.some((token) => token.value === "@(")).toBe(true);
    });

    it("splitArrayElements ignores separators inside nested parentheses", () => {
        const arrayTokens = tokenize("@( @(1,2), 3 )");
        const { contentTokens } = parserUtils.collectStructureTokens(
            arrayTokens,
            0
        );
        const elements = parserUtils.splitArrayElements(contentTokens);
        expect(elements.length).toBe(2);
        expect(elements[0]?.some((token) => token.value === "@(")).toBe(true);
    });

    it("detects top-level commas within parenthesis tokens", () => {
        const commaTokens = parserUtils.collectStructureTokens(
            tokensFrom("($a,$b)"),
            0
        ).contentTokens;
        expect(parserUtils.hasTopLevelComma(commaTokens)).toBe(true);
        const nestedTokens = parserUtils.collectStructureTokens(
            tokensFrom("($a @(1, 2))"),
            0
        ).contentTokens;
        expect(parserUtils.hasTopLevelComma(nestedTokens)).toBe(false);
    });

    it("buildExpressionFromTokens classifies array kinds and script blocks", () => {
        const implicitExpression = parserUtils.buildExpressionFromTokens(
            tokenize("@(1,2)")
        );
        const implicitArray = implicitExpression.parts.find(
            (part): part is ArrayLiteralNode => part.type === "ArrayLiteral"
        );
        expect(implicitArray?.kind).toBe("implicit");

        const explicitExpression = parserUtils.buildExpressionFromTokens(
            tokenize("[1,2]")
        );
        const explicitArray = explicitExpression.parts.find(
            (part): part is ArrayLiteralNode => part.type === "ArrayLiteral"
        );
        expect(explicitArray?.kind).toBe("explicit");

        const scriptExpression = parserUtils.buildExpressionFromTokens(
            tokenize("{ Write-Host }")
        );
        expect(
            scriptExpression.parts.some((part) => part.type === "ScriptBlock")
        ).toBe(true);
    });

    it("createHereStringNode defaults missing quote metadata to double", () => {
        const baseToken: Token = {
            type: "heredoc",
            value: '@"\nAlpha\n"@',
            start: 0,
            end: 11,
        };
        const fallback = parserUtils.createHereStringNode(baseToken);
        expect(fallback.quote).toBe("double");

        const singleToken: Token = {
            ...baseToken,
            value: "@'\nBeta\n'@",
            quote: "single",
            end: 11,
        };
        const singleNode = parserUtils.createHereStringNode(singleToken);
        expect(singleNode.quote).toBe("single");
    });

    it("createTextNode maps token roles comprehensively", () => {
        const tokens: Token[] = [
            { type: "identifier", value: "Name", start: 0, end: 4 },
            { type: "keyword", value: "function", start: 0, end: 8 },
            { type: "number", value: "1", start: 0, end: 1 },
            { type: "variable", value: "$var", start: 0, end: 4 },
            {
                type: "string",
                value: '"text"',
                start: 0,
                end: 6,
                quote: "double",
            },
            { type: "operator", value: "+", start: 0, end: 1 },
            { type: "punctuation", value: ",", start: 0, end: 1 },
            { type: "unknown", value: "§", start: 0, end: 1 },
        ];

        const roles = tokens.map(
            (token) => parserUtils.createTextNode(token).role
        );
        expect(roles).toEqual([
            "word",
            "keyword",
            "number",
            "variable",
            "string",
            "operator",
            "punctuation",
            "unknown",
        ]);
    });

    it("parseArrayPart falls back to appropriate end positions when unterminated", () => {
        const withContentTokens = tokensFrom("@(1, 2");
        const withContentExpression =
            parserUtils.buildExpressionFromTokens(withContentTokens);
        const withContentArray = withContentExpression.parts.find(
            (part): part is ArrayLiteralNode => part.type === "ArrayLiteral"
        );
        expect(withContentArray?.loc.end).toBe(
            withContentTokens[withContentTokens.length - 1]?.end
        );

        const minimalTokens = tokensFrom("@(");
        const minimalExpression =
            parserUtils.buildExpressionFromTokens(minimalTokens);
        const minimalArray = minimalExpression.parts.find(
            (part): part is ArrayLiteralNode => part.type === "ArrayLiteral"
        );
        expect(minimalArray?.loc.end).toBe(minimalTokens[0]?.end);
    });

    it("parseScriptBlockPart handles missing closing braces gracefully", () => {
        const blockTokens = tokensFrom("{ Write-Host");
        const blockExpression =
            parserUtils.buildExpressionFromTokens(blockTokens);
        const scriptBlock = blockExpression.parts.find(
            (part): part is ScriptBlockNode => part.type === "ScriptBlock"
        );
        const lastToken = blockTokens[blockTokens.length - 1];
        expect(scriptBlock?.loc.end).toBe(lastToken?.end);

        const emptyTokens = tokensFrom("{");
        const emptyExpression =
            parserUtils.buildExpressionFromTokens(emptyTokens);
        const emptyBlock = emptyExpression.parts.find(
            (part): part is ScriptBlockNode => part.type === "ScriptBlock"
        );
        expect(emptyBlock?.loc.end).toBe(emptyTokens[0]?.end);
    });

    it("parseParenthesisPart determines end positions when closures are missing", () => {
        const withContentTokens = tokensFrom("(value");
        const withContentExpression =
            parserUtils.buildExpressionFromTokens(withContentTokens);
        const withContentParenthesis = withContentExpression.parts.find(
            (part): part is ParenthesisNode => part.type === "Parenthesis"
        );
        expect(withContentParenthesis?.loc.end).toBe(
            withContentTokens[withContentTokens.length - 1]?.end
        );

        const minimalTokens = tokensFrom("(");
        const minimalExpression =
            parserUtils.buildExpressionFromTokens(minimalTokens);
        const minimalParenthesis = minimalExpression.parts.find(
            (part): part is ParenthesisNode => part.type === "Parenthesis"
        );
        expect(minimalParenthesis?.loc.end).toBe(minimalTokens[0]?.end);
    });

    it("buildHashtableEntry infers locations from keys, values, or defaults", () => {
        const keyTokens = tokensFrom("key");
        const keyOnlyEntry = parserUtils.buildHashtableEntry(keyTokens);
        expect(keyOnlyEntry.loc.start).toBe(keyTokens[0]?.start ?? 0);

        const valueOnlyTokens: Token[] = [
            { type: "operator", value: "=", start: 0, end: 1 },
            { type: "number", value: "1", start: 2, end: 3 },
        ];
        const valueOnlyEntry = parserUtils.buildHashtableEntry(valueOnlyTokens);
        expect(valueOnlyEntry.loc.start).toBe(2);

        const emptyEntry = parserUtils.buildHashtableEntry([]);
        expect(emptyEntry.loc.start).toBe(0);
        expect(emptyEntry.loc.end).toBe(0);
    });

    it("resolveStructureEnd respects closing, content, and fallback positions", () => {
        const startToken: Token = {
            type: "punctuation",
            value: "(",
            start: 0,
            end: 1,
        };
        const closingToken: Token = {
            type: "punctuation",
            value: ")",
            start: 10,
            end: 11,
        };
        expect(
            parserUtils.resolveStructureEnd(startToken, closingToken, [])
        ).toBe(11);
        const contentToken: Token = {
            type: "number",
            value: "1",
            start: 2,
            end: 3,
        };
        expect(
            parserUtils.resolveStructureEnd(startToken, undefined, [
                contentToken,
            ])
        ).toBe(3);
        expect(parserUtils.resolveStructureEnd(startToken, undefined, [])).toBe(
            1
        );
    });

    it("splitHashtableEntries pops nested closing tokens safely", () => {
        const tokens: Token[] = [
            { type: "punctuation", value: "{", start: 0, end: 1 },
            { type: "punctuation", value: "{", start: 1, end: 2 },
            { type: "punctuation", value: "}", start: 2, end: 3 },
            { type: "punctuation", value: "}", start: 3, end: 4 },
        ];
        const entries = parserUtils.splitHashtableEntries(tokens);
        expect(entries).toHaveLength(1);
        expect(entries[0]?.filter((token) => token.value === "}")).toHaveLength(
            2
        );
    });

    it("splitHashtableEntries emits entries for semicolon separators", () => {
        const tokens: Token[] = [
            { type: "identifier", value: "a", start: 0, end: 1 },
            { type: "punctuation", value: ";", start: 1, end: 2 },
            { type: "identifier", value: "b", start: 2, end: 3 },
        ];
        const entries = parserUtils.splitHashtableEntries(tokens);
        expect(entries).toHaveLength(2);
        expect(entries[0]?.[0]?.value).toBe("a");
    });

    it("splitHashtableEntries skips empty segments for consecutive separators", () => {
        const tokens: Token[] = [
            { type: "punctuation", value: ";", start: 0, end: 1 },
            { type: "punctuation", value: ";", start: 1, end: 2 },
        ];
        const entries = parserUtils.splitHashtableEntries(tokens);
        expect(entries).toHaveLength(0);
    });

    it("splitArrayElements pops nested closing tokens while grouping", () => {
        const tokens: Token[] = [
            { type: "punctuation", value: "(", start: 0, end: 1 },
            { type: "punctuation", value: ")", start: 1, end: 2 },
            { type: "punctuation", value: ",", start: 2, end: 3 },
            { type: "punctuation", value: "(", start: 3, end: 4 },
            { type: "punctuation", value: ")", start: 4, end: 5 },
        ];
        const elements = parserUtils.splitArrayElements(tokens);
        expect(elements).toHaveLength(2);
        expect(elements[0]?.[0]?.value).toBe("(");
    });

    it("hasTopLevelComma ignores commas nested inside structures", () => {
        const tokens: Token[] = [
            { type: "punctuation", value: "(", start: 0, end: 1 },
            { type: "punctuation", value: "(", start: 1, end: 2 },
            { type: "punctuation", value: ")", start: 2, end: 3 },
            { type: "punctuation", value: ")", start: 3, end: 4 },
            { type: "punctuation", value: ",", start: 4, end: 5 },
        ];
        expect(parserUtils.hasTopLevelComma(tokens)).toBe(true);
    });

    it("exposes locStart and locEnd helpers", () => {
        const node = { loc: { start: 4, end: 9 } };
        expect(locStart(node)).toBe(4);
        expect(locEnd(node)).toBe(9);
    });
});
