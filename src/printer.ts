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
    print(path: AstPath, options: ParserOptions) {
        const node = path.getValue() as
            | ExpressionPartNode
            | ScriptBodyNode
            | ScriptNode
            | undefined;
        if (!node) {
            return "";
        }
        const resolved = resolveOptions(options);
        return printNode(node, resolved);
    },
};

function concatDocs(docs: Doc[]): Doc {
    if (docs.length === 0) {
        return "";
    }
    let acc: Doc = docs[0];
    for (let index = 1; index < docs.length; index += 1) {
        acc = [acc, docs[index]] as Doc;
    }
    return acc;
}

function determineBlankLines(
    previous: ScriptBodyNode,
    current: ScriptBodyNode,
    pendingBlankLines: number,
    options: ResolvedOptions
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
    previous: ExpressionPartNode,
    current: ExpressionPartNode
): Doc | null {
    const prevSymbol = getSymbol(previous);
    const currentSymbol = getSymbol(current);

    if (
        current.type === "ArrayLiteral" &&
        current.kind === "explicit" &&
        Boolean(previous)
    ) {
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
        if (currentSymbol && NO_SPACE_BEFORE.has(currentSymbol)) {
            return null;
        }
        return " ";
    }

    if (!prevSymbol && !currentSymbol) {
        return " ";
    }

    if (!prevSymbol) {
        if (currentSymbol && NO_SPACE_BEFORE.has(currentSymbol)) {
            return null;
        }
        return " ";
    }

    if (NO_SPACE_AFTER.has(prevSymbol)) {
        return null;
    }

    if (currentSymbol && NO_SPACE_BEFORE.has(currentSymbol)) {
        return null;
    }

    if (
        prevSymbol &&
        currentSymbol &&
        SYMBOL_NO_GAP.has(`${prevSymbol}:${currentSymbol}`)
    ) {
        return null;
    }

    if (prevSymbol && currentSymbol) {
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

function indentStatement(docToIndent: Doc, options: ResolvedOptions): Doc {
    const indentUnit =
        options.indentStyle === "tabs" ? "\t" : " ".repeat(options.indentSize);
    return [indentUnit, align(indentUnit.length, docToIndent)] as Doc;
}

function isParamStatement(node: null | ScriptBodyNode): boolean {
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
        /\b(foreach|function|if|param|while)\b/i.test(trimmed)
    ) {
        return false;
    }

    // If it contains spaces and looks like natural language, it's likely a comment
    const hasSpaces = trimmed.includes(" ");
    const wordCount = trimmed.split(/\s+/).length;
    return hasSpaces && wordCount >= 3;
}

function printExpression(node: ExpressionNode, options: ResolvedOptions): Doc {
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
            if (separator) {
                docs.push(separator);
            }
        }

        docs.push(printNode(part, options));
        previous = part;
    }

    return docs.length === 0 ? "" : group(docs);
}

function printFunction(
    node: FunctionDeclarationNode,
    options: ResolvedOptions
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
        | ExpressionNode
        | ExpressionPartNode
        | HashtableEntryNode
        | ScriptBodyNode
        | ScriptNode,
    options: ResolvedOptions
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
            return "";
        }
    }
}

function printPipeline(node: PipelineNode, options: ResolvedOptions): Doc {
    const segmentDocs = node.segments.map((segment) =>
        printExpression(segment, options)
    );
    if (segmentDocs.length === 0) {
        return "";
    }

    let pipelineDoc: Doc = segmentDocs[0];

    if (segmentDocs.length > 1) {
        // For long pipelines, always break to improve readability
        const shouldAlwaysBreak = segmentDocs.length > 3;

        const restDocs = segmentDocs
            .slice(1)
            .map((segmentDoc) => [line, ["| ", segmentDoc]]);

        if (shouldAlwaysBreak) {
            // Force line breaks for long pipelines
            pipelineDoc = [
                segmentDocs[0],
                indent(restDocs.flat()),
            ];
        } else {
            pipelineDoc = group([
                segmentDocs[0],
                indent(restDocs.flat()),
            ]);
        }
    }

    if (node.trailingComment) {
        pipelineDoc = node.trailingComment.inline ? [
                pipelineDoc,
                lineSuffix([" #", node.trailingComment.value]),
            ] : [
                pipelineDoc,
                hardline,
                printComment(node.trailingComment),
            ];
    }

    return pipelineDoc;
}

function printScript(node: ScriptNode, options: ResolvedOptions): Doc {
    const bodyDoc = printStatementList(node.body, options, false);
    if (!bodyDoc) {
        return "";
    }
    return [bodyDoc, hardline];
}

function printScriptBlock(
    node: ScriptBlockNode,
    options: ResolvedOptions
): Doc {
    if (node.body.length === 0) {
        return "{}";
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
    body: ScriptBodyNode[],
    options: ResolvedOptions,
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
            const priorDoc = docs[lastIndex];
            docs[lastIndex] = priorDoc
                ? concatDocs([
                      priorDoc,
                      hardline,
                      commentDoc,
                  ])
                : commentDoc;
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

function getSymbol(node: ExpressionPartNode | null): null | string {
    if (!node) {
        return null;
    }
    if (
        node.type === "Text" &&
        (node.role === "punctuation" || node.role === "operator")
    ) {
        return node.value;
    }
    // Handle special characters that may be role="unknown"
    if (node.type === "Text" && node.role === "unknown") {
        const val = node.value.trim();
        if (val === "@" || val === "::" || val === ":") {
            return val;
        }
    }
    if (node.type === "Parenthesis") {
        return "(";
    }
    return null;
}

function isParamKeyword(node: ExpressionPartNode | null): boolean {
    return Boolean(
        node?.type === "Text" && node.value.toLowerCase() === "param"
    );
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

export function createPrinter(): Printer<ScriptNode> {
    return powerShellPrinter;
}

function extractCommentText(node: ExpressionNode): null | string {
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

function isAttributeExpression(node: ExpressionNode): boolean {
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

function isCommentExpression(node: ExpressionNode): boolean {
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

function isSimpleExpression(node: ExpressionNode): boolean {
    if (node.parts.length !== 1) {
        return false;
    }
    const [part] = node.parts;
    if (!part) {
        return true;
    }
    if (part.type !== "Text") {
        return false;
    }
    if (part.role === "keyword") {
        return false;
    }
    return !/\r|\n/.test(part.value);
}

function printArray(node: ArrayLiteralNode, options: ResolvedOptions): Doc {
    const open = node.kind === "implicit" ? "@(" : "[";
    const close = node.kind === "implicit" ? ")" : "]";
    if (node.elements.length === 0) {
        return [open, close];
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
        if (nextElement && isCommentExpression(nextElement)) {
            const commentText = extractCommentText(nextElement);
            if (commentText) {
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

function printComment(node: CommentNode): Doc {
    if (node.style === "block") {
        return node.value;
    }
    return ["#", node.value];
}

function printHashtable(node: HashtableNode, options: ResolvedOptions): Doc {
    const entries = options.sortHashtableKeys
        ? [...node.entries].sort((a, b) =>
              a.key.localeCompare(b.key, undefined, { sensitivity: "base" })
          )
        : node.entries;

    if (entries.length === 0) {
        return "@{}";
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
    node: HashtableEntryNode,
    options: ResolvedOptions
): Doc {
    const keyDoc = printExpression(node.rawKey, options);
    const valueDoc = printExpression(node.value, options);

    // Check if the value expression starts with a control flow keyword
    // (if, switch, foreach, etc.) - these should stay on the same line as '='
    const firstPart = node.value.parts[0];
    const startsWithKeyword =
        firstPart?.type === "Text" &&
        firstPart.role === "keyword" &&
        /^(for|foreach|if|switch|while)$/i.test(firstPart.value);

    let entryDoc: Doc;
    if (startsWithKeyword) {
        // Keep keyword expressions on the same line as the '=' sign
        entryDoc = group([
            keyDoc,
            " = ",
            valueDoc,
        ]);
    } else {
        entryDoc = group([
            keyDoc,
            " =",
            indent([line, valueDoc]),
        ]);
    }

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
            entryDoc = comment.inline ? [entryDoc, lineSuffix([" ", printComment(comment)])] : [
                    entryDoc,
                    hardline,
                    printComment(comment),
                ];
        }
    }

    return entryDoc;
}

function printHereString(node: HereStringNode): Doc {
    return dedentToRoot(node.value);
}

function printParamParenthesis(
    node: ParenthesisNode,
    options: ResolvedOptions
): Doc {
    if (node.elements.length === 0) {
        return "()";
    }

    if (node.elements.length <= 1 && !node.hasNewline) {
        return printParenthesis(node, options);
    }

    const groupId = Symbol("param");
    const elementDocs: Doc[] = [];
    let pendingAttributes: Doc[] = [];

    const flushAttributes = (nextDoc?: Doc) => {
        if (pendingAttributes.length === 0) {
            if (nextDoc) {
                elementDocs.push(nextDoc);
            }
            return;
        }

        const attributeDoc =
            pendingAttributes.length === 1
                ? pendingAttributes[0]
                : join(hardline, pendingAttributes);

        if (nextDoc) {
            elementDocs.push(
                group([
                    attributeDoc,
                    hardline,
                    nextDoc,
                ])
            );
        } else {
            elementDocs.push(attributeDoc);
        }
        pendingAttributes = [];
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
        if (nextElement && isCommentExpression(nextElement)) {
            const commentText = extractCommentText(nextElement);
            if (commentText) {
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
    node: ParenthesisNode,
    options: ResolvedOptions
): Doc {
    if (node.elements.length === 0) {
        return "()";
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
    const leadingLine = hasComma
        ? forceMultiline
            ? hardline
            : line
        : hardline;
    const trailingLine = hasComma
        ? forceMultiline
            ? hardline
            : line
        : hardline;

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

function printText(node: TextNode, options: ResolvedOptions): Doc {
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
            value = CMDLET_ALIAS_MAP[aliasKey]!;
        }
    }

    if (node.role === "word" && options.rewriteWriteHost) {
        const replacement = DISALLOWED_CMDLET_REWRITE.get(value.toLowerCase());
        if (replacement) {
            value = replacement;
        }
    }

    return value;
}

function trailingCommaDoc(
    options: ResolvedOptions,
    groupId: symbol,
    hasElements: boolean,
    delimiter: "," | ";"
): Doc {
    if (!hasElements) {
        return "";
    }
    switch (options.trailingComma) {
        case "all": {
            return delimiter;
        }
        case "multiline": {
            return ifBreak(delimiter, "", { groupId });
        }
        case "none":
        default: {
            return "";
        }
    }
}

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

function normalizeStringLiteral(
    value: string,
    options: ResolvedOptions
): string {
    if (!options.preferSingleQuote) {
        return value;
    }

    if (!value.startsWith('"') || !value.endsWith('"')) {
        return value;
    }

    const inner = value.slice(1, -1);

    // Skip normalization for regex-like pattern strings to avoid altering embedded quoting
    // Heuristics: starts with (? or contains unescaped character classes or anchors typical of patterns.
    if (
        /^\(\?[Uimsx]/.test(inner) ||
        /\[[^\]]+]/.test(inner) ||
        /\bWrite-(Error|Host|Output|Warning)\b/.test(inner)
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

function shouldSkipPart(part: ExpressionPartNode): boolean {
    if (part.type === "Text") {
        const trimmed = part.value.trim();
        if (trimmed === "`") {
            return true;
        }
    }
    return false;
}
