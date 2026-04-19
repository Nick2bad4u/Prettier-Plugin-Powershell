import type { AstPath, Doc, ParserOptions, Printer } from "prettier";

import { doc } from "prettier";

import type {
    ArrayLiteralNode,
    CommentNode,
    ExpressionNode,
    ExpressionPartNode,
    FunctionDeclarationNode,
    HashtableEntryNode,
    HashtableNode,
    HereStringNode,
    ParenthesisNode,
    PipelineNode,
    ScriptBlockNode,
    ScriptBodyNode,
    ScriptNode,
    TextNode,
} from "./ast.js";

import { type ResolvedOptions, resolveOptions } from "./options.js";

const {
    align,
    dedentToRoot,
    group,
    hardline,
    ifBreak,
    indent,
    join,
    line,
    lineSuffix,
    softline,
} = doc.builders;

const NO_SPACE_BEFORE = new Set([
    ")",
    ",",
    ".",
    ":",
    "::",
    ";",
    "<",
    ">",
    "]",
    "}",
]);
const NO_SPACE_AFTER = new Set([
    "1>&2",
    "2>",
    "2>&1",
    "2>&2",
    "2>>",
    "3>",
    "3>&1",
    "3>&2",
    "3>>",
    "4>",
    "4>&1",
    "4>&2",
    "4>>",
    "5>",
    "5>&1",
    "5>&2",
    "5>>",
    "6>",
    "6>&1",
    "6>&2",
    "6>>",
    "(",
    "*>",
    "*>&1",
    "*>&2",
    "*>>",
    ".",
    ":",
    "::",
    "<",
    ">",
    ">>",
    "@",
    "[",
    "\\",
    "{",
]);
/**
 * Minimum character length for text to be considered comment prose. Used to
 * avoid false positives with short variable names or keywords.
 */
const MINIMUM_COMMENT_LENGTH = 10;
const SYMBOL_NO_GAP = new Set([
    ".:word",
    "::word",
    "word:(",
    "word:[",
]);
const CONCATENATED_OPERATOR_PAIRS = new Set([
    "%=",
    "&=",
    "*=",
    "++",
    "+=",
    "--",
    "-=",
    "/=",
    "??",
    "^=",
    "|=",
]);

function getSymbol(node: null | Readonly<ExpressionPartNode>): null | string {
    if (!node) {
        return null;
    }
    if (
        node.type === "Text" &&
        (node.role === "punctuation" || node.role === "operator")
    ) {
        return node.value;
    }
    if (node.type === "Text" && node.role === "unknown") {
        const val = node.value.trim();
        if (val === "@" || val === "::" || val === ":" || val === "\\") {
            return val;
        }
    }
    if (node.type === "Parenthesis") {
        return "(";
    }
    return null;
}

function isParamKeyword(node: null | Readonly<ExpressionPartNode>): boolean {
    return node?.type === "Text" && node.value.toLowerCase() === "param";
}

function normalizeStringLiteral(
    value: string,
    options: Readonly<ResolvedOptions>
): string {
    if (!options.preferSingleQuote) {
        return value;
    }

    if (!value.startsWith('"') || !value.endsWith('"')) {
        return value;
    }

    const inner = value.slice(1, -1);

    if (
        /^\(\?[Uimsx]/.test(inner) ||
        (inner.includes("[") && inner.includes("]")) ||
        /\bWrite-(?:Error|Host|Output|Warning)\b/.test(inner)
    ) {
        return value;
    }

    if (inner.includes("'")) {
        return value;
    }

    if (/[\n"$`]/.test(inner)) {
        return value;
    }

    return `'${inner}'`;
}

function shouldSkipPart(part: Readonly<ExpressionPartNode>): boolean {
    if (part.type === "Text") {
        const trimmed = part.value.trim();
        if (trimmed === "`") {
            return true;
        }
    }
    return false;
}

/**
 * The Prettier printer for PowerShell.
 *
 * This implements Prettier's Printer interface to convert PowerShell AST nodes
 * into formatted output using Prettier's document builders.
 *
 * The printer handles:
 *
 * - Indentation and spacing
 * - Line wrapping and breaking
 * - Operator formatting
 * - Comment preservation
 * - Hashtable alignment
 * - Pipeline formatting
 * - And much more!
 */
export const powerShellPrinter: Printer<ScriptNode> = {
    print(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Prettier API type
        path: AstPath<ScriptNode>,
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Prettier API type
        options: ParserOptions
    ): Doc {
        const node = path.node as
            | ExpressionPartNode
            | ScriptBodyNode
            | ScriptNode
            | undefined;
        if (node === undefined) {
            return "" as Doc;
        }
        const resolved = resolveOptions(options);
        return printNode(node, resolved);
    },
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Doc is a recursive Prettier type that cannot be made deeply readonly
function concatDocs(docs: readonly Doc[]): Doc {
    if (docs.length === 0) {
        return "" as Doc;
    }

    let acc: Doc = docs[0];
    for (let index = 1; index < docs.length; index += 1) {
        acc = [acc, docs[index]];
    }

    return acc;
}

function determineBlankLines(
    previous: Readonly<ScriptBodyNode>,
    current: Readonly<ScriptBodyNode>,
    pendingBlankLines: number,
    options: Readonly<ResolvedOptions>
): number {
    let base = pendingBlankLines > 0 ? pendingBlankLines : 1;
    const desiredFunctionSpacing = options.blankLinesBetweenFunctions + 1;

    if (
        (previous.type === "FunctionDeclaration" &&
            current.type === "FunctionDeclaration") ||
        (previous.type === "FunctionDeclaration" &&
            current.type !== "BlankLine") ||
        (current.type === "FunctionDeclaration" &&
            previous.type !== "BlankLine")
    ) {
        base = Math.max(base, desiredFunctionSpacing);
    }

    if (options.blankLineAfterParam && isParamStatement(previous)) {
        base = Math.max(base, 2);
    }

    return base;
}

function gapBetween(
    previous: Readonly<ExpressionPartNode>,
    current: Readonly<ExpressionPartNode>
): Doc | null {
    const prevSymbol = getSymbol(previous);
    const currentSymbol = getSymbol(current);

    if (current.type === "ArrayLiteral" && current.kind === "explicit") {
        return null;
    }

    if (
        current.type === "Text" &&
        current.role === "operator" &&
        (current.value === "++" || current.value === "--")
    ) {
        return null;
    }

    if (
        previous.type === "Text" &&
        previous.role === "operator" &&
        current.type === "Text" &&
        current.role === "operator"
    ) {
        const combined = previous.value + current.value;
        if (CONCATENATED_OPERATOR_PAIRS.has(combined)) {
            return null;
        }
    }

    if (current.type === "Parenthesis") {
        if (previous?.type === "Text") {
            if (previous.value.toLowerCase() === "param") {
                return null;
            }
            if (previous.role === "keyword") {
                return " ";
            }
            // Operators need space before parenthesis
            if (previous.role === "operator") {
                return " ";
            }
            // Cmdlets and functions (words) need space before parenthesis
            // Method calls are handled in printExpression
            if (previous.role === "word") {
                return " ";
            }
            // PowerShell logical operators need space before parenthesis
            const prevLower = previous.value.toLowerCase();
            if (
                prevLower.startsWith("-") &&
                (prevLower === "-not" ||
                    prevLower === "-and" ||
                    prevLower === "-or" ||
                    prevLower === "-xor")
            ) {
                return " ";
            }
            return null;
        }
        return " ";
    }

    if (previous.type === "Parenthesis") {
        if (currentSymbol !== null && NO_SPACE_BEFORE.has(currentSymbol)) {
            return null;
        }
        return " ";
    }

    if (prevSymbol === null && currentSymbol === null) {
        return " ";
    }

    if (prevSymbol === null) {
        if (currentSymbol !== null && NO_SPACE_BEFORE.has(currentSymbol)) {
            return null;
        }
        return " ";
    }

    if (NO_SPACE_AFTER.has(prevSymbol)) {
        return null;
    }

    if (currentSymbol !== null && NO_SPACE_BEFORE.has(currentSymbol)) {
        return null;
    }

    if (
        prevSymbol !== null &&
        currentSymbol !== null &&
        SYMBOL_NO_GAP.has(`${prevSymbol}:${currentSymbol}`)
    ) {
        return null;
    }

    if (prevSymbol !== null && currentSymbol !== null) {
        const pair = `${prevSymbol}${currentSymbol}`;
        if (CONCATENATED_OPERATOR_PAIRS.has(pair)) {
            return null;
        }
    }

    /* c8 ignore next */
    if (prevSymbol === "=" || currentSymbol === "=") {
        return " ";
    }

    if (
        current.type === "ScriptBlock" ||
        current.type === "Hashtable" ||
        current.type === "ArrayLiteral"
    ) {
        return " ";
    }

    return " ";
}

function indentStatement(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Prettier Doc is a recursive union not modeled as deeply readonly in upstream types
    docToIndent: Doc,
    options: Readonly<ResolvedOptions>
): Doc {
    const indentUnit =
        options.indentStyle === "tabs" ? "\t" : " ".repeat(options.indentSize);
    return [indentUnit, align(indentUnit.length, docToIndent)] as Doc;
}

function isParamStatement(node: null | Readonly<ScriptBodyNode>): boolean {
    if (node?.type !== "Pipeline") {
        return false;
    }
    if (node.segments.length === 0) {
        return false;
    }
    const firstSegment = node.segments[0];
    if (firstSegment.parts.length === 0) {
        return false;
    }
    const firstPart = firstSegment.parts.find((part) => part.type === "Text");
    if (firstPart?.type !== "Text") {
        return false;
    }
    return firstPart.value.toLowerCase() === "param";
}

/**
 * Heuristic to detect if text appears to be comment prose rather than code.
 * Uses a minimum length threshold to avoid false positives with short variable
 * names or keywords that might not have typical syntax markers.
 */
function looksLikeCommentText(text: string): boolean {
    const trimmed = text.trim();

    // Too short to determine reliably
    if (trimmed.length <= MINIMUM_COMMENT_LENGTH) {
        return false;
    }

    // Definitely code if it starts with typical PowerShell syntax
    if (
        trimmed.startsWith("$") ||
        trimmed.startsWith("[") ||
        trimmed.startsWith("(") ||
        trimmed.startsWith("{") ||
        trimmed.startsWith("@")
    ) {
        return false;
    }

    // Likely code if it contains assignment or typical operators
    if (
        trimmed.includes("=") ||
        trimmed.includes("->") ||
        trimmed.includes("::") ||
        /\b(?:foreach|function|if|param|while)\b/i.test(trimmed)
    ) {
        return false;
    }

    // If it contains spaces and looks like natural language, it's likely a comment
    const hasSpaces = trimmed.includes(" ");
    const wordCount = trimmed.split(/\s+/).length;
    return hasSpaces && wordCount >= 3;
}

function printExpression(
    node: Readonly<ExpressionNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const docs: Doc[] = [];

    const filteredParts = node.parts.filter((part) => !shouldSkipPart(part));
    const normalizedParts: ExpressionPartNode[] = [];

    for (let index = 0; index < filteredParts.length; index += 1) {
        const current = filteredParts[index];
        if (current.type === "Text" && current.role === "operator") {
            const next = filteredParts[index + 1];
            if (next?.type === "Text" && next.role === "operator") {
                const combinedValue = current.value + next.value;
                if (CONCATENATED_OPERATOR_PAIRS.has(combinedValue)) {
                    normalizedParts.push({
                        ...current,
                        loc: { end: next.loc.end, start: current.loc.start },
                        value: combinedValue,
                    });
                    index += 1;
                    continue;
                }
            }
        }
        normalizedParts.push(current);
    }

    let previous: ExpressionPartNode | null = null;

    for (let index = 0; index < normalizedParts.length; index += 1) {
        let part = normalizedParts[index];

        if (
            part.type === "Text" &&
            part.role === "keyword" &&
            previous?.type === "Text" &&
            (previous.value === "." || previous.value === "::")
        ) {
            part = {
                ...part,
                role: "word",
            };
        }

        if (part.type === "Parenthesis" && isParamKeyword(previous)) {
            docs.push(printParamParenthesis(part, options));
            previous = part;
            continue;
        }

        // Check if this is comment text (not starting with #, but appears to be prose)
        if (
            part.type === "Text" &&
            part.role === "unknown" &&
            previous &&
            !part.value.trim().startsWith("#") &&
            looksLikeCommentText(part.value)
        ) {
            // This looks like comment text - treat it as an inline comment
            docs.push(lineSuffix([" # ", part.value.trim()]));
            previous = part;
            continue;
        }

        if (previous) {
            // Special case: identifier followed by parenthesis could be method call or cmdlet
            // Check if the identifier comes after . or :: (method call - no space)
            if (
                part.type === "Parenthesis" &&
                previous.type === "Text" &&
                index >= 2
            ) {
                const beforeWord = normalizedParts[index - 2];
                if (
                    beforeWord?.type === "Text" &&
                    (beforeWord.value === "." || beforeWord.value === "::")
                ) {
                    // This is a method call - no space before (
                    docs.push(printNode(part, options));
                    previous = part;
                    continue;
                }
            }

            const separator = gapBetween(previous, part);
            if (separator !== null) {
                docs.push(separator);
            }
        }

        docs.push(printNode(part, options));
        previous = part;
    }

    return docs.length === 0 ? "" : group(docs);
}

function printFunction(
    node: Readonly<FunctionDeclarationNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const headerDoc = printExpression(node.header, options);
    const bodyDoc = printScriptBlock(node.body, options);
    if (options.braceStyle === "allman") {
        return group([
            headerDoc,
            hardline,
            bodyDoc,
        ]);
    }
    return group([
        headerDoc,
        " ",
        bodyDoc,
    ]);
}

/**
 * Main routing function that dispatches AST nodes to their specific print
 * functions.
 *
 * @param node - The AST node to print
 * @param options - Resolved printer options
 *
 * @returns A Prettier Doc representing the formatted output
 */
function printNode(
    node:
        | Readonly<ExpressionNode>
        | Readonly<ExpressionPartNode>
        | Readonly<HashtableEntryNode>
        | Readonly<ScriptBodyNode>
        | Readonly<ScriptNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    switch (node.type) {
        case "ArrayLiteral": {
            return printArray(node, options);
        }
        case "BlankLine": {
            return Array.from({ length: node.count }, () => hardline);
        }
        case "Comment": {
            return printComment(node);
        }
        case "Expression": {
            return printExpression(node, options);
        }
        case "FunctionDeclaration": {
            return printFunction(node, options);
        }
        case "Hashtable": {
            return printHashtable(node, options);
        }
        case "HashtableEntry": {
            return printHashtableEntry(node, options);
        }
        case "HereString": {
            return printHereString(node);
        }
        case "Parenthesis": {
            return printParenthesis(node, options);
        }
        case "Pipeline": {
            return printPipeline(node, options);
        }
        case "Script": {
            return printScript(node, options);
        }
        case "ScriptBlock": {
            return printScriptBlock(node, options);
        }
        case "Text": {
            return printText(node, options);
        }
        default: {
            return [] as Doc;
        }
    }
}

function printPipeline(
    node: Readonly<PipelineNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const segmentDocs = node.segments.map((segment) =>
        printExpression(segment, options)
    );
    if (segmentDocs.length === 0) {
        return "" as Doc;
    }

    let pipelineDoc: Doc = segmentDocs[0];

    if (segmentDocs.length > 1) {
        const shouldAlwaysBreak = segmentDocs.length > 3;

        const restDocs = segmentDocs
            .slice(1)
            .map((segmentDoc) => [line, ["| ", segmentDoc]]);

        // For long pipelines, force line breaks; shorter ones may fit on one line.
        pipelineDoc = shouldAlwaysBreak
            ? [segmentDocs[0], indent(restDocs.flat())]
            : group([segmentDocs[0], indent(restDocs.flat())]);
    }

    if (node.trailingComment) {
        pipelineDoc = node.trailingComment.inline
            ? [pipelineDoc, lineSuffix([" #", node.trailingComment.value])]
            : [
                  pipelineDoc,
                  hardline,
                  printComment(node.trailingComment),
              ];
    }

    return pipelineDoc;
}

function printScript(
    node: Readonly<ScriptNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const bodyDoc = printStatementList(node.body, options, false);
    return [bodyDoc, hardline];
}

function printScriptBlock(
    node: Readonly<ScriptBlockNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    if (node.body.length === 0) {
        return group(["{", "}"]);
    }

    const bodyDoc = printStatementList(node.body, options, true);
    return group([
        "{",
        hardline,
        bodyDoc,
        hardline,
        "}",
    ]);
}

function printStatementList(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- ScriptBodyNode contains mutable nested arrays
    body: readonly ScriptBodyNode[],
    options: Readonly<ResolvedOptions>,
    indentStatements: boolean
): Doc {
    const docs: Doc[] = [];
    let previous: null | ScriptBodyNode = null;
    let pendingBlankLines = 0;

    for (const entry of body) {
        if (entry.type === "BlankLine") {
            pendingBlankLines = Math.max(pendingBlankLines, entry.count);
            continue;
        }

        if (previous) {
            const blankLines = determineBlankLines(
                previous,
                entry,
                pendingBlankLines,
                options
            );
            for (let index = 0; index < blankLines; index += 1) {
                docs.push(hardline);
            }
        }

        const printed = printNode(entry, options);
        if (
            entry.type === "Comment" &&
            previous &&
            entry.loc.start < previous.loc.end &&
            docs.length > 0
        ) {
            const commentDoc = indentStatements
                ? indentStatement(printed, options)
                : printed;
            const lastIndex = docs.length - 1;
            docs[lastIndex] = concatDocs([
                docs[lastIndex],
                hardline,
                commentDoc,
            ]);
            previous = entry;
            pendingBlankLines = 0;
            continue;
        }

        docs.push(
            indentStatements ? indentStatement(printed, options) : printed
        );
        previous = entry;
        pendingBlankLines = 0;
    }

    return concatDocs(docs);
}

const KEYWORD_CASE_TRANSFORMS: Record<string, (value: string) => string> = {
    lower: (value) => value.toLowerCase(),
    pascal: (value) =>
        value.length === 0
            ? value
            : value[0].toUpperCase() + value.slice(1).toLowerCase(),
    preserve: (value) => value,
    upper: (value) => value.toUpperCase(),
};

const CMDLET_ALIAS_MAP: Record<string, string> = {
    "%": "ForEach-Object",
    "?": "Where-Object",
    cat: "Get-Content",
    dir: "Get-ChildItem",
    echo: "Write-Output",
    foreach: "ForEach-Object",
    gc: "Get-Content",
    gci: "Get-ChildItem",
    gcm: "Get-Command",
    gi: "Get-Item",
    gm: "Get-Member",
    gps: "Get-Process",
    gsv: "Get-Service",
    gwmi: "Get-WmiObject",
    la: "Get-ChildItem",
    ld: "Get-ChildItem",
    ls: "Get-ChildItem",
    ps: "Get-Process",
    where: "Where-Object",
    write: "Write-Output",
};

const DISALLOWED_CMDLET_REWRITE = new Map([["write-host", "Write-Output"]]);

/**
 * Creates and returns the PowerShell {@link Printer} instance for use as a
 * Prettier plugin.
 *
 * @returns The Prettier printer for PowerShell AST nodes.
 */
export function createPrinter(): Printer<ScriptNode> {
    return powerShellPrinter;
}

function extractCommentText(node: Readonly<ExpressionNode>): null | string {
    if (!isCommentExpression(node)) {
        return null;
    }

    const part = node.parts[0];
    if (part.type !== "Text") {
        return null;
    }

    const trimmed = part.value.trim();
    // If it already starts with #, return as is
    if (trimmed.startsWith("#")) {
        return trimmed;
    }
    // Otherwise, prepend # to make it a comment
    return `# ${trimmed}`;
}

function isAttributeExpression(node: Readonly<ExpressionNode>): boolean {
    if (node.parts.length === 0) {
        return false;
    }

    return node.parts.every((part) => {
        if (part.type !== "Text") {
            return false;
        }
        const trimmed = part.value.trim();
        return trimmed.startsWith("[") && trimmed.endsWith("]");
    });
}

function isCommentExpression(node: Readonly<ExpressionNode>): boolean {
    if (node.parts.length !== 1) {
        return false;
    }

    const part = node.parts[0];
    if (part.type !== "Text") {
        return false;
    }

    // Check if it's likely a comment based on context:
    // 1. Starts with # or <# (original inline comment)
    // 2. Appears to be comment text (no $ or [ at start, longer text)
    const trimmed = part.value.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("<#")) {
        return true;
    }

    return looksLikeCommentText(trimmed);
}

function isSimpleExpression(node: Readonly<ExpressionNode>): boolean {
    if (node.parts.length !== 1) {
        return false;
    }
    const [part] = node.parts;
    if (part.type !== "Text") {
        return false;
    }
    if (part.role === "keyword") {
        return false;
    }
    return !/[\n\r]/.test(part.value);
}

function printArray(
    node: Readonly<ArrayLiteralNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const open = node.kind === "implicit" ? "@(" : "[";
    const close = node.kind === "implicit" ? ")" : "]";
    if (node.elements.length === 0) {
        return group([open, close]);
    }
    const groupId = Symbol("array");

    // Build element docs while treating comment-only expressions as trailing
    // comments on the previous element. This preserves inline comment intent
    // for constructs like:
    //   "#000000", # Black
    // which would otherwise be parsed as two separate elements.
    const elementDocs: Doc[] = [];

    for (let index = 0; index < node.elements.length; index += 1) {
        const element = node.elements[index];

        // Skip standalone comment expressions here; they will be attached to
        // the previous real element when encountered as `nextElement` below.
        if (isCommentExpression(element)) {
            continue;
        }

        let printed = printExpression(element, options);

        const nextElement = node.elements[index + 1];
        if (nextElement !== undefined && isCommentExpression(nextElement)) {
            const commentText = extractCommentText(nextElement);
            if (commentText !== null) {
                printed = [printed, lineSuffix([" ", commentText])];
                index += 1; // Consume the comment element
            }
        }

        elementDocs.push(printed);
    }

    const shouldBreak = elementDocs.length > 1;
    const separator: Doc = [",", line];
    // PowerShell does NOT support trailing commas in arrays, so never add them

    return group(
        [
            open,
            indent([
                shouldBreak ? line : softline,
                join(separator, elementDocs),
            ]),
            shouldBreak ? line : softline,
            close,
        ],
        { id: groupId }
    );
}

function printComment(node: Readonly<CommentNode>): Doc {
    if (node.style === "block") {
        return node.value as Doc;
    }
    return ["#", node.value] as Doc;
}

function printHashtable(
    node: Readonly<HashtableNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const entries = options.sortHashtableKeys
        ? sortHashtableEntries(node.entries)
        : node.entries;

    if (entries.length === 0) {
        return group(["@{}"]);
    }
    const groupId = Symbol("hashtable");
    const contentDocs: Doc[] = [];

    for (const [index, entry] of entries.entries()) {
        const entryDoc = printHashtableEntry(entry, options);
        const isLast = index === entries.length - 1;
        const separator = isLast
            ? trailingCommaDoc(options, groupId, true, ";")
            : ifBreak("", ";", { groupId });
        contentDocs.push(entryDoc, separator);
        if (!isLast) {
            contentDocs.push(isSimpleExpression(entry.value) ? line : hardline);
        }
    }

    return group(
        [
            "@{",
            indent([line, ...contentDocs]),
            line,
            "}",
        ],
        {
            id: groupId,
        }
    );
}

function printHashtableEntry(
    node: Readonly<HashtableEntryNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const keyDoc = printExpression(node.rawKey, options);
    const valueDoc = printExpression(node.value, options);

    // Check if the value expression starts with a control flow keyword
    // (if, switch, foreach, etc.) - these should stay on the same line as '='
    const firstPart = node.value.parts[0];
    const startsWithKeyword =
        firstPart?.type === "Text" &&
        firstPart.role === "keyword" &&
        /^(?:for|foreach|if|switch|while)$/i.test(firstPart.value);

    let entryDoc: Doc = startsWithKeyword
        ? group([
              keyDoc,
              " = ",
              valueDoc,
          ])
        : group([
              keyDoc,
              " =",
              indent([line, valueDoc]),
          ]);

    // Add leading comments
    if (node.leadingComments && node.leadingComments.length > 0) {
        const commentDocs = node.leadingComments.map((comment) =>
            printComment(comment)
        );
        entryDoc = [
            join(hardline, commentDocs),
            hardline,
            entryDoc,
        ];
    }

    // Add trailing comments
    if (node.trailingComments && node.trailingComments.length > 0) {
        for (const comment of node.trailingComments) {
            entryDoc = comment.inline
                ? [entryDoc, lineSuffix([" ", printComment(comment)])]
                : [
                      entryDoc,
                      hardline,
                      printComment(comment),
                  ];
        }
    }

    return entryDoc;
}

function printHereString(node: Readonly<HereStringNode>): Doc {
    return dedentToRoot(node.value);
}

function printParamParenthesis(
    node: Readonly<ParenthesisNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    if (node.elements.length === 0) {
        return group(["(", ")"]);
    }

    if (node.elements.length <= 1 && !node.hasNewline) {
        return group([
            "(",
            indent([softline, printExpression(node.elements[0], options)]),
            softline,
            ")",
        ]);
    }

    const groupId = Symbol("param");
    const elementDocs: Doc[] = [];
    let pendingAttributes: Doc[] = [];

    const flushAttributes = (
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Doc is a recursive Prettier type
        nextDoc?: Doc
    ) => {
        if (pendingAttributes.length > 0) {
            const attributeDoc =
                pendingAttributes.length === 1
                    ? pendingAttributes[0]
                    : join(hardline, pendingAttributes);

            if (nextDoc === undefined) {
                elementDocs.push(attributeDoc);
            } else {
                elementDocs.push(
                    group([
                        attributeDoc,
                        hardline,
                        nextDoc,
                    ])
                );
            }
            pendingAttributes = [];
        } else if (nextDoc !== undefined) {
            elementDocs.push(nextDoc);
        }
    };

    for (let index = 0; index < node.elements.length; index += 1) {
        const element = node.elements[index];

        // Skip comment-only expressions - they'll be handled as trailing comments
        if (isCommentExpression(element)) {
            continue;
        }

        if (isAttributeExpression(element)) {
            pendingAttributes.push(printExpression(element, options));
            continue;
        }

        let printed = printExpression(element, options);

        // Check if the next element is a comment - if so, attach it inline
        const nextElement = node.elements[index + 1];
        if (nextElement !== undefined && isCommentExpression(nextElement)) {
            const commentText = extractCommentText(nextElement);
            if (commentText !== null) {
                printed = [printed, lineSuffix([" ", commentText])];
                index += 1; // Skip the comment element since we've consumed it
            }
        }

        flushAttributes(printed);
    }

    flushAttributes();
    const separator: Doc = [",", hardline];

    return group(
        [
            "(",
            indent([hardline, join(separator, elementDocs)]),
            hardline,
            ")",
        ],
        {
            id: groupId,
        }
    );
}

function printParenthesis(
    node: Readonly<ParenthesisNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    if (node.elements.length === 0) {
        return group(["(", ")"]);
    }
    const groupId = Symbol("parenthesis");
    const elementDocs = node.elements.map((element) =>
        printExpression(element, options)
    );
    if (elementDocs.length === 1 && !node.hasNewline) {
        return group(
            [
                "(",
                indent([softline, elementDocs[0]]),
                softline,
                ")",
            ],
            {
                id: groupId,
            }
        );
    }

    const hasComma = node.hasComma;
    const forceMultiline =
        node.hasNewline || (!node.hasComma && elementDocs.length > 1);
    const separator: Doc = hasComma
        ? [",", forceMultiline ? hardline : line]
        : hardline;
    const hasSoftBreak = hasComma && !forceMultiline;
    const leadingLine: Doc = hasSoftBreak ? line : hardline;
    const trailingLine: Doc = hasSoftBreak ? line : hardline;

    return group(
        [
            "(",
            indent([leadingLine, join(separator, elementDocs)]),
            trailingLine,
            ")",
        ],
        {
            id: groupId,
        }
    );
}

function printText(
    node: Readonly<TextNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    if (node.role === "string") {
        return normalizeStringLiteral(node.value, options);
    }

    let value = node.value;

    if (node.role === "keyword") {
        const transform =
            KEYWORD_CASE_TRANSFORMS[options.keywordCase] ??
            KEYWORD_CASE_TRANSFORMS.preserve;
        value = transform(value);
    }

    if (
        options.rewriteAliases &&
        (node.role === "word" ||
            node.role === "operator" ||
            node.role === "unknown")
    ) {
        const aliasKey = value.toLowerCase();
        if (Object.hasOwn(CMDLET_ALIAS_MAP, aliasKey)) {
            value = CMDLET_ALIAS_MAP[aliasKey];
        }
    }

    if (node.role === "word" && options.rewriteWriteHost) {
        const replacement = DISALLOWED_CMDLET_REWRITE.get(value.toLowerCase());
        if (replacement !== undefined) {
            value = replacement;
        }
    }

    return value;
}

function sortHashtableEntries(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- HashtableEntryNode contains mutable nested arrays
    entries: readonly HashtableEntryNode[]
): HashtableEntryNode[] {
    const ordered: HashtableEntryNode[] = [];

    for (const entry of entries) {
        const insertionIndex = ordered.findIndex(
            (candidate) =>
                entry.key.localeCompare(candidate.key, undefined, {
                    sensitivity: "base",
                }) < 0
        );

        if (insertionIndex === -1) {
            ordered.push(entry);
        } else {
            ordered.splice(insertionIndex, 0, entry);
        }
    }

    return ordered;
}

function trailingCommaDoc(
    options: Readonly<ResolvedOptions>,
    groupId: symbol,
    hasElements: boolean,
    delimiter: "," | ";"
): Doc {
    if (!hasElements) {
        return ifBreak("", "", { groupId });
    }

    switch (options.trailingComma) {
        case "all": {
            return ifBreak(delimiter, delimiter, { groupId });
        }
        case "multiline": {
            return ifBreak(delimiter, "", { groupId });
        }
        case "none": {
            return ifBreak("", "", { groupId });
        }
        default: {
            return ifBreak("", "", { groupId });
        }
    }
}

/**
 * Internal printer helpers exposed for white-box tests.
 */
export const __printerTestUtils: {
    concatDocs: typeof concatDocs;
    gapBetween: typeof gapBetween;
    getSymbol: typeof getSymbol;
    indentStatement: typeof indentStatement;
    isParamStatement: typeof isParamStatement;
    normalizeStringLiteral: typeof normalizeStringLiteral;
    printNode: typeof printNode;
    printParamParenthesis: typeof printParamParenthesis;
    printPipeline: typeof printPipeline;
    printScript: typeof printScript;
    printStatementList: typeof printStatementList;
    shouldSkipPart: typeof shouldSkipPart;
    trailingCommaDoc: typeof trailingCommaDoc;
} = {
    concatDocs,
    gapBetween,
    getSymbol,
    indentStatement,
    isParamStatement,
    normalizeStringLiteral,
    printNode,
    printParamParenthesis,
    printPipeline,
    printScript,
    printStatementList,
    shouldSkipPart,
    trailingCommaDoc,
};
