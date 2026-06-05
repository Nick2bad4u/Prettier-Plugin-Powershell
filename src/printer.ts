// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair -- This file is the main Prettier printer implementation and necessarily contains complex logic that is difficult to break down further without sacrificing readability or performance. We can revisit this if specific issues arise, but for now we will allow complexity in service of a clear and maintainable overall structure.
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- Doc array is intentionally mutated while printing */

import {
    type AstPath,
    type Doc,
    doc,
    type ParserOptions,
    type Printer,
} from "prettier";
import {
    arrayFirst,
    arrayJoin,
    isDefined,
    isEmpty,
    objectHasOwn,
    safeCastTo,
    setHas,
} from "ts-extras";

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
const SYMBOL_NO_GAP: ReadonlySet<string> = new Set([
    ".:word",
    "::word",
    "word:(",
    "word:[",
]);
const CONCATENATED_OPERATOR_PAIRS: ReadonlySet<string> = new Set([
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

/**
 * Indicates the gap-between decision for two adjacent expression parts:
 *
 * - `"none"` — no separator (parts are concatenated directly)
 * - `"space"` — a single space separator
 * - `"defer"` — fall through to the next rule in the evaluation chain
 */
type GapDecision = "defer" | "none" | "space";

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
        /^\(\?[Uimsx]/v.test(inner) ||
        (inner.includes("[") && inner.includes("]")) ||
        /\bWrite-(?:Error|Host|Output|Warning)\b/v.test(inner)
    ) {
        return value;
    }

    if (inner.includes("'")) {
        return value;
    }

    if (/[\n"$`]/v.test(inner)) {
        return value;
    }

    return `'${inner}'`;
}

function shouldSkipPart(part: Readonly<ExpressionPartNode>): boolean {
    return part.type === "Text" && part.value.trim() === "`";
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
    /**
     * Inserts a `# @format` pragma comment at the top of the file so that
     * Prettier's `--insert-pragma` / `insertPragma: true` option works for
     * PowerShell files.
     */
    insertPragma(text: string): string {
        return `# @format\n${text}`;
    },

    print(path: AstPath<ScriptNode>, options: ParserOptions): Doc {
        const node = safeCastTo<
            ExpressionPartNode | ScriptBodyNode | ScriptNode | undefined
        >(path.node);
        let result: Doc = "";
        if (isDefined(node)) {
            const resolved = resolveOptions(options);
            result = printNode(node, resolved);
        }
        return result;
    },
};

function appendCommentToLastDoc(
    docs: Doc[],
    printed: Doc,
    indentStatements: boolean,
    options: Readonly<ResolvedOptions>
): void {
    const commentDoc = indentStatements
        ? indentStatement(printed, options)
        : printed;
    const lastIndex = docs.length - 1;
    const lastDoc = docs[lastIndex];
    if (!isDefined(lastDoc)) {
        return;
    }

    docs[lastIndex] = concatDocs([
        lastDoc,
        hardline,
        commentDoc,
    ]);
}

function buildPipelineSegmentsDoc(
    firstSegmentDoc: Doc,
    segmentDocs: readonly Doc[]
): Doc {
    let result: Doc = firstSegmentDoc;

    if (segmentDocs.length > 1) {
        const shouldAlwaysBreak = segmentDocs.length > 3;
        const restDocs = segmentDocs
            .slice(1)
            .map((segmentDoc) => [line, ["| ", segmentDoc]]);

        result = shouldAlwaysBreak
            ? [firstSegmentDoc, indent(restDocs.flat())]
            : group([firstSegmentDoc, indent(restDocs.flat())]);
    }

    return result;
}

function concatDocs(docs: readonly Doc[]): Doc {
    let result: Doc = "";

    if (!isEmpty(docs)) {
        const firstDoc = arrayFirst(docs);
        if (isDefined(firstDoc)) {
            let acc: Doc = firstDoc;
            for (let index = 1; index < docs.length; index += 1) {
                const docPart = docs[index];
                if (!isDefined(docPart)) {
                    continue;
                }
                acc = [acc, docPart];
            }
            result = acc;
        }
    }

    return result;
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

function evaluateGapRules(
    previous: Readonly<ExpressionPartNode>,
    current: Readonly<ExpressionPartNode>,
    prevSymbol: null | string,
    currentSymbol: null | string
): GapDecision {
    if (isNoGapCurrentPart(previous, current)) {
        return "none";
    }

    if (current.type === "Parenthesis") {
        return spacingBeforeParenthesis(previous);
    }

    const structuralSpacing = evaluateStructuralSpacing(
        previous,
        current,
        currentSymbol
    );
    if (structuralSpacing !== "defer") {
        return structuralSpacing;
    }

    return evaluateSymbolSpacing(prevSymbol, currentSymbol);
}

function evaluateStructuralSpacing(
    previous: Readonly<ExpressionPartNode>,
    current: Readonly<ExpressionPartNode>,
    currentSymbol: null | string
): GapDecision {
    if (previous.type === "Parenthesis") {
        return currentSymbol !== null && setHas(NO_SPACE_BEFORE, currentSymbol)
            ? "none"
            : "space";
    }

    if (
        current.type === "ScriptBlock" ||
        current.type === "Hashtable" ||
        current.type === "ArrayLiteral"
    ) {
        return "space";
    }

    return "defer";
}

function evaluateSymbolSpacing(
    prevSymbol: null | string,
    currentSymbol: null | string
): GapDecision {
    if (prevSymbol === null && currentSymbol === null) {
        return "space";
    }

    if (prevSymbol === null) {
        return currentSymbol !== null && setHas(NO_SPACE_BEFORE, currentSymbol)
            ? "none"
            : "space";
    }

    if (setHas(NO_SPACE_AFTER, prevSymbol)) {
        return "none";
    }

    if (currentSymbol === null) {
        return "space";
    }

    if (setHas(NO_SPACE_BEFORE, currentSymbol)) {
        return "none";
    }

    const spacingKey: string = arrayJoin(
        [String(prevSymbol), String(currentSymbol)],
        ":"
    );
    if (setHas(SYMBOL_NO_GAP, spacingKey)) {
        return "none";
    }

    const combinedOperator: string = arrayJoin(
        [String(prevSymbol), String(currentSymbol)],
        ""
    );
    if (setHas(CONCATENATED_OPERATOR_PAIRS, combinedOperator)) {
        return "none";
    }

    return "space";
}

function gapBetween(
    previous: Readonly<ExpressionPartNode>,
    current: Readonly<ExpressionPartNode>
): Doc | null {
    const prevSymbol = getSymbol(previous);
    const currentSymbol = getSymbol(current);
    const decision = evaluateGapRules(
        previous,
        current,
        prevSymbol,
        currentSymbol
    );
    return decision === "none" ? null : " ";
}

function indentStatement(
    docToIndent: Doc,
    options: Readonly<ResolvedOptions>
): Doc {
    const indentUnit =
        options.indentStyle === "tabs" ? "\t" : " ".repeat(options.indentSize);
    return safeCastTo<Doc>([indentUnit, align(indentUnit.length, docToIndent)]);
}

function isNoGapCurrentPart(
    previous: Readonly<ExpressionPartNode>,
    current: Readonly<ExpressionPartNode>
): boolean {
    if (current.type === "ArrayLiteral" && current.kind === "explicit") {
        return true;
    }

    if (
        current.type === "Text" &&
        current.role === "operator" &&
        (current.value === "++" || current.value === "--")
    ) {
        return true;
    }

    if (
        previous.type === "Text" &&
        previous.role === "operator" &&
        current.type === "Text" &&
        current.role === "operator"
    ) {
        return setHas(
            CONCATENATED_OPERATOR_PAIRS,
            previous.value + current.value
        );
    }

    return false;
}

function isParamStatement(node: null | Readonly<ScriptBodyNode>): boolean {
    if (node?.type !== "Pipeline") {
        return false;
    }
    if (isEmpty(node.segments)) {
        return false;
    }
    const firstSegment = arrayFirst(node.segments);
    if (!isDefined(firstSegment) || isEmpty(firstSegment.parts)) {
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
        /\b(?:foreach|function|if|param|while)\b/iv.test(trimmed)
    ) {
        return false;
    }

    // If it contains spaces and looks like natural language, it's likely a comment
    const hasSpaces = trimmed.includes(" ");
    const wordCount = (trimmed.match(/\S+/gv) ?? []).length;
    return hasSpaces && wordCount >= 3;
}

function mergeOperatorPair(
    current: Readonly<ExpressionPartNode>,
    next: Readonly<ExpressionPartNode> | undefined
): ExpressionPartNode | undefined {
    if (current.type !== "Text" || current.role !== "operator") {
        return undefined;
    }

    if (next?.type !== "Text" || next.role !== "operator") {
        return undefined;
    }

    const combinedValue = current.value + next.value;
    if (!setHas(CONCATENATED_OPERATOR_PAIRS, combinedValue)) {
        return undefined;
    }

    return {
        ...current,
        loc: { end: next.loc.end, start: current.loc.start },
        value: combinedValue,
    };
}

function normalizeExpressionParts(
    node: Readonly<ExpressionNode>
): ExpressionPartNode[] {
    // eslint-disable-next-line typefest/prefer-ts-extras-not -- direct predicate keeps array element typing precise under noUncheckedIndexedAccess
    const filteredParts = node.parts.filter((part) => !shouldSkipPart(part));
    const normalizedParts: ExpressionPartNode[] = [];

    for (let index = 0; index < filteredParts.length; index += 1) {
        const current = filteredParts[index];
        if (!isDefined(current)) {
            continue;
        }

        const merged = mergeOperatorPair(current, filteredParts[index + 1]);
        if (merged) {
            normalizedParts.push(merged);
            index += 1;
            continue;
        }

        normalizedParts.push(current);
    }

    return normalizedParts;
}

function normalizeKeywordAfterMemberAccess(
    part: Readonly<ExpressionPartNode>,
    previous: null | Readonly<ExpressionPartNode>
): ExpressionPartNode {
    if (
        part.type === "Text" &&
        part.role === "keyword" &&
        previous?.type === "Text" &&
        (previous.value === "." || previous.value === "::")
    ) {
        return {
            ...part,
            role: "word",
        };
    }

    return part;
}

function printExpression(
    node: Readonly<ExpressionNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const docs: Doc[] = [];
    const normalizedParts = normalizeExpressionParts(node);

    let previous: ExpressionPartNode | null = null;

    for (let index = 0; index < normalizedParts.length; index += 1) {
        const current = normalizedParts[index];
        let part = current;
        if (!isDefined(part)) {
            continue;
        }

        part = normalizeKeywordAfterMemberAccess(part, previous);

        const specialDoc = printSpecialExpressionPart(
            part,
            previous,
            normalizedParts,
            index,
            options
        );
        if (specialDoc) {
            if (specialDoc.skipSeparator === true) {
                docs.push(specialDoc.doc);
            } else {
                pushExpressionDoc(docs, specialDoc.doc, previous, part);
            }
            previous = part;
            continue;
        }

        pushExpressionDoc(docs, printNode(part, options), previous, part);
        previous = part;
    }

    return isEmpty(docs) ? "" : group(docs);
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
            return safeCastTo<Doc>([]);
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
    const firstSegmentDoc = arrayFirst(segmentDocs);
    let result: Doc = "";

    if (!isEmpty(segmentDocs) && isDefined(firstSegmentDoc)) {
        result = withPipelineTrailingComment(
            buildPipelineSegmentsDoc(firstSegmentDoc, segmentDocs),
            node.trailingComment
        );
    }

    return result;
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
    if (isEmpty(node.body)) {
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

function printSpecialExpressionPart(
    part: Readonly<ExpressionPartNode>,
    previous: null | Readonly<ExpressionPartNode>,
    normalizedParts: readonly ExpressionPartNode[],
    index: number,
    options: Readonly<ResolvedOptions>
): null | { doc: Doc; skipSeparator?: boolean } {
    if (part.type === "Parenthesis" && isParamKeyword(previous)) {
        return {
            doc: printParamParenthesis(part, options),
            skipSeparator: true,
        };
    }

    if (
        part.type === "Text" &&
        part.role === "unknown" &&
        isDefined(previous) &&
        !part.value.trim().startsWith("#") &&
        looksLikeCommentText(part.value)
    ) {
        return { doc: lineSuffix([" # ", part.value.trim()]) };
    }

    if (
        part.type === "Parenthesis" &&
        previous?.type === "Text" &&
        index >= 2
    ) {
        const beforeWord = normalizedParts[index - 2];
        if (
            beforeWord?.type === "Text" &&
            (beforeWord.value === "." || beforeWord.value === "::")
        ) {
            return { doc: printNode(part, options), skipSeparator: true };
        }
    }

    return null;
}

function printStatementList(
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
        if (shouldAppendCommentToPreviousDoc(entry, previous, docs.length)) {
            appendCommentToLastDoc(docs, printed, indentStatements, options);
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

function pushExpressionDoc(
    docs: Doc[],
    nextDoc: Doc,
    previous: null | Readonly<ExpressionPartNode>,
    part: Readonly<ExpressionPartNode>
): void {
    if (previous !== null) {
        const separator = gapBetween(previous, part);
        if (separator !== null) {
            docs.push(separator);
        }
    }

    docs.push(nextDoc);
}

function shouldAppendCommentToPreviousDoc(
    entry: Readonly<ScriptBodyNode>,
    previous: null | Readonly<ScriptBodyNode>,
    docsLength: number
): boolean {
    return (
        entry.type === "Comment" &&
        previous !== null &&
        entry.loc.start < previous.loc.end &&
        docsLength > 0
    );
}

function spacingBeforeParenthesis(
    previous: Readonly<ExpressionPartNode>
): GapDecision {
    if (previous.type !== "Text") {
        return "space";
    }

    if (previous.value.toLowerCase() === "param") {
        return "none";
    }

    if (previous.role === "keyword" || previous.role === "operator") {
        return "space";
    }

    if (previous.role === "word") {
        return "space";
    }

    const prevLower = previous.value.toLowerCase();
    const isLogicalOperator =
        prevLower.startsWith("-") &&
        (prevLower === "-not" ||
            prevLower === "-and" ||
            prevLower === "-or" ||
            prevLower === "-xor");

    return isLogicalOperator ? "space" : "none";
}

function withPipelineTrailingComment(
    pipelineDoc: Doc,
    trailingComment: Readonly<CommentNode> | undefined
): Doc {
    let result: Doc = pipelineDoc;

    if (trailingComment) {
        result = trailingComment.inline
            ? [pipelineDoc, lineSuffix([" #", trailingComment.value])]
            : [
                  pipelineDoc,
                  hardline,
                  printComment(trailingComment),
              ];
    }

    return result;
}

const KEYWORD_CASE_TRANSFORMS: Record<string, (value: string) => string> = {
    lower: (value) => value.toLowerCase(),
    pascal: (value) => {
        if (value.length === 0) {
            return value;
        }
        const first = value[0];
        if (!isDefined(first)) {
            return value;
        }
        return first.toUpperCase() + value.slice(1).toLowerCase();
    },
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

    const part = arrayFirst(node.parts);
    if (!isDefined(part) || part.type !== "Text") {
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

function flushPendingAttributes(
    elementDocs: Doc[],

    pendingAttributes: Doc[],
    nextDoc?: Doc
): Doc[] {
    if (isEmpty(pendingAttributes)) {
        if (isDefined(nextDoc)) {
            elementDocs.push(nextDoc);
        }
        return pendingAttributes;
    }

    const attributeDoc: Doc =
        pendingAttributes.length === 1
            ? (arrayFirst(pendingAttributes) ??
              join(hardline, pendingAttributes))
            : join(hardline, pendingAttributes);

    if (isDefined(nextDoc)) {
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

    return [];
}

function isAttributeExpression(node: Readonly<ExpressionNode>): boolean {
    if (isEmpty(node.parts)) {
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

    const part = arrayFirst(node.parts);
    if (!isDefined(part) || part.type !== "Text") {
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

function isPrintableParamElement(
    element: Readonly<ExpressionNode> | undefined
): element is Readonly<ExpressionNode> {
    return isDefined(element) && !isCommentExpression(element);
}

function isSimpleExpression(node: Readonly<ExpressionNode>): boolean {
    if (node.parts.length !== 1) {
        return false;
    }
    const part = arrayFirst(node.parts);
    if (!isDefined(part) || part.type !== "Text") {
        return false;
    }
    if (part.role === "keyword") {
        return false;
    }
    return !/[\n\r]/v.test(part.value);
}

function printArray(
    node: Readonly<ArrayLiteralNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const open = node.kind === "implicit" ? "@(" : "[";
    const close = node.kind === "implicit" ? ")" : "]";
    if (isEmpty(node.elements)) {
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
        if (!isDefined(element) || isCommentExpression(element)) {
            continue;
        }

        let printed = printExpression(element, options);

        const nextElement = node.elements[index + 1];
        if (isDefined(nextElement) && isCommentExpression(nextElement)) {
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
        return safeCastTo<Doc>(node.value);
    }
    return safeCastTo<Doc>(["#", node.value]);
}

function printHashtable(
    node: Readonly<HashtableNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    const entries = options.sortHashtableKeys
        ? sortHashtableEntries(node.entries)
        : node.entries;

    if (isEmpty(entries)) {
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
    const firstPart = arrayFirst(node.value.parts);
    const startsWithKeyword =
        firstPart?.type === "Text" &&
        firstPart.role === "keyword" &&
        /^(?:for|foreach|if|switch|while)$/iv.test(firstPart.value);

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

function printParamElementWithTrailingComment(
    element: Readonly<ExpressionNode>,
    nextElement: Readonly<ExpressionNode> | undefined,
    options: Readonly<ResolvedOptions>
): { consumedTrailingComment: boolean; doc: Doc } {
    let printed: Doc = printExpression(element, options);
    if (!isDefined(nextElement) || !isCommentExpression(nextElement)) {
        return { consumedTrailingComment: false, doc: printed };
    }

    const commentText = extractCommentText(nextElement);
    if (commentText === null) {
        return { consumedTrailingComment: false, doc: printed };
    }

    printed = [printed, lineSuffix([" ", commentText])];
    return { consumedTrailingComment: true, doc: printed };
}

function printParamParenthesis(
    node: Readonly<ParenthesisNode>,
    options: Readonly<ResolvedOptions>
): Doc {
    if (isEmpty(node.elements)) {
        return group(["(", ")"]);
    }

    if (node.elements.length <= 1 && !node.hasNewline) {
        const onlyElement = arrayFirst(node.elements);
        if (!isDefined(onlyElement)) {
            return group(["(", ")"]);
        }
        return group([
            "(",
            indent([softline, printExpression(onlyElement, options)]),
            softline,
            ")",
        ]);
    }

    const groupId = Symbol("param");
    const elementDocs: Doc[] = [];
    let pendingAttributes: Doc[] = [];

    for (let index = 0; index < node.elements.length; index += 1) {
        const element = node.elements[index];

        if (!isPrintableParamElement(element)) {
            continue;
        }

        if (isAttributeExpression(element)) {
            pendingAttributes.push(printExpression(element, options));
            continue;
        }

        const printedResult = printParamElementWithTrailingComment(
            element,
            node.elements[index + 1],
            options
        );
        if (printedResult.consumedTrailingComment) {
            index += 1;
        }

        pendingAttributes = flushPendingAttributes(
            elementDocs,
            pendingAttributes,
            printedResult.doc
        );
    }

    flushPendingAttributes(elementDocs, pendingAttributes);
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
    if (isEmpty(node.elements)) {
        return group(["(", ")"]);
    }
    const groupId = Symbol("parenthesis");
    const elementDocs = node.elements.map((element) =>
        printExpression(element, options)
    );
    const firstElementDoc = arrayFirst(elementDocs);
    if (elementDocs.length === 1 && !node.hasNewline) {
        if (!isDefined(firstElementDoc)) {
            return group(["(", ")"]);
        }
        return group(
            [
                "(",
                indent([softline, firstElementDoc]),
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
            KEYWORD_CASE_TRANSFORMS["preserve"];
        if (isDefined(transform)) {
            value = transform(value);
        }
    }

    if (
        options.rewriteAliases &&
        (node.role === "word" ||
            node.role === "operator" ||
            node.role === "unknown")
    ) {
        const aliasKey = value.toLowerCase();
        if (objectHasOwn(CMDLET_ALIAS_MAP, aliasKey)) {
            value = CMDLET_ALIAS_MAP[aliasKey] ?? value;
        }
    }

    if (node.role === "word" && options.rewriteWriteHost) {
        const replacement = DISALLOWED_CMDLET_REWRITE.get(value.toLowerCase());
        if (isDefined(replacement)) {
            value = replacement;
        }
    }

    return value;
}

function sortHashtableEntries(
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
export const printerTestUtils: {
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
