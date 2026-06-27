import type { ParserOptions } from "prettier";

import {
    arrayAt,
    arrayFirst,
    arrayIncludes,
    arrayJoin,
    isDefined,
    isEmpty,
    isPresent,
    setHas,
} from "ts-extras";

import type {
    ArrayLiteralNode,
    BlankLineNode,
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
    SourceLocation,
    TextNode,
    TokenRole,
} from "./ast.js";

import { resolveOptions } from "./options.js";
import { type Token, tokenize } from "./tokenizer.js";

const FALLBACK_OPERATOR_TOKENS = new Set([
    "!",
    "%",
    "%=",
    "&",
    "&=",
    "*",
    "*=",
    "+",
    "++",
    "+=",
    "-",
    "--",
    "-=",
    "/",
    "/=",
    "?",
    "??",
    "^",
    "^=",
    "|",
    "|=",
]);
const BLOCK_COMMENT_TOKEN_TYPE = "block-comment";
const COMMENT_TOKEN_TYPE = "comment";
const CLOSING_PUNCTUATION_TOKENS = [
    ")",
    "]",
    "}",
] as const;
const INLINE_WHITESPACE_CHARACTERS = new Set([
    " ",
    "\t",
    "\f",
    "\v",
    "\u{A0}",
    "\u{FEFF}",
    "\u{200B}",
    "\u{2060}",
]);
const OPENING_PUNCTUATION_TOKENS = [
    "(",
    "[",
    "{",
] as const;
const STATEMENT_BREAK_TERMINATORS = [
    "closing-brace",
    "closing-paren",
    "semicolon",
] as const;

interface SplitContext<TState> {
    current: Token[];
    isTopLevel: boolean;
    stack: string[];
    state: TState;
    token: Token;
}

type SplitDecision = "skip" | undefined;

interface SplitOptions<TState = Record<string, never>> {
    createInitialState?: () => TState;
    delimiterValues?: string[];
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Callback receives context with mutable Token array that it may push to
    onAfterAddToken?: (context: SplitContext<TState>) => void;
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Callback receives context with mutable Token array that it may push to
    onBeforeAddToken?: (context: SplitContext<TState>) => void;
    onFlush?: (
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Segment and segments arrays are mutated by the flush handler
        segment: Token[],
        state: TState,
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Segment and segments arrays are mutated by the flush handler
        segments: Token[][],
        shouldForce: boolean
    ) => Token[] | undefined;
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Callback receives context with mutable Token array that it may push to
    onToken?: (context: SplitContext<TState>) => SplitDecision;
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Callback receives context with mutable Token array that it may push to
    shouldSplitOnDelimiter?: (context: SplitContext<TState>) => boolean;
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Callback receives context with mutable Token array that it may push to
    splitOnNewline?: (context: SplitContext<TState>) => boolean;
}

interface StatementParseState {
    lineContinuation: boolean;
    segments: Token[][];
    structureStack: string[];
    trailingComment?: CommentNode;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- node.loc is mutated to extend the location
function extendNodeLocation(node: { loc: SourceLocation }, end: number): void {
    if (end > node.loc.end) {
        node.loc = { ...node.loc, end };
    }
}

function isClosingToken(token: Readonly<Token>): boolean {
    return (
        token.type === "punctuation" &&
        arrayIncludes(CLOSING_PUNCTUATION_TOKENS, token.value)
    );
}

function isOpeningToken(token: Readonly<Token>): boolean {
    if (token.type === "operator") {
        return token.value === "@{" || token.value === "@(";
    }

    return (
        token.type === "punctuation" &&
        arrayIncludes(OPENING_PUNCTUATION_TOKENS, token.value)
    );
}

function mergeNodes(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- mergeNodes intentionally mutates previous node fields when coalescing adjacent nodes
    previous: ScriptBodyNode,
    next: Readonly<ScriptBodyNode>
): void {
    if (previous.type === "Pipeline" && next.type === "Comment") {
        previous.trailingComment = next;
        extendNodeLocation(previous, next.loc.end);
        return;
    }

    if (previous.type === "BlankLine" && next.type === "BlankLine") {
        previous.count += next.count;
        extendNodeLocation(previous, next.loc.end);
    }
}

const shouldMergeNodes = (
    previous: Readonly<ScriptBodyNode>,
    next: Readonly<ScriptBodyNode>
): boolean =>
    (previous.type === "Pipeline" && next.type === "Comment" && next.inline) ||
    (previous.type === "BlankLine" && next.type === "BlankLine");

const isInlineSpacing = (
    source: string,
    start: number,
    end: number
): boolean => {
    if (!isDefined(start) || !isDefined(end)) {
        return false;
    }
    for (let index = start; index < end; index += 1) {
        const char = source[index];
        if (char === "\n" || char === "\r") {
            return false;
        }
        if (!isDefined(char)) {
            return false;
        }
        if (!setHas(INLINE_WHITESPACE_CHARACTERS, char)) {
            return false;
        }
    }
    return true;
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
const hasTopLevelComma = (tokens: readonly Token[]): boolean => {
    const stack: string[] = [];
    for (const token of tokens) {
        if (isOpeningToken(token)) {
            stack.push(token.value);
            continue;
        }
        if (isClosingToken(token)) {
            stack.pop();
            continue;
        }
        if (
            isEmpty(stack) &&
            token.type === "punctuation" &&
            token.value === ","
        ) {
            return true;
        }
    }
    return false;
};

interface HashtableEntryCommentContext {
    readonly keyTokens: readonly Token[];
    readonly leadingComments: readonly Token[];
    readonly source: string;
    readonly tokens: readonly Token[];
    readonly trailingComments: readonly Token[];
    readonly valueTokens: readonly Token[];
}

type HashtableEntryCommentFields = Pick<
    HashtableEntryNode,
    "leadingComments" | "trailingComments"
>;

class Parser {
    private readonly source: string;
    private tokenIndex = 0;
    private readonly tokens: readonly Token[];

    public constructor(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
        tokens: readonly Token[],
        source: string
    ) {
        this.tokens = tokens;
        this.source = source;
    }

    public parseScript(
        terminators: ReadonlySet<string> = new Set<string>()
    ): ScriptNode {
        const body: ScriptBodyNode[] = [];
        const firstToken = arrayFirst(this.tokens);
        const start = isDefined(firstToken) ? firstToken.start : 0;

        while (!this.isEOF()) {
            const token = this.peek();

            if (!isDefined(token)) {
                break;
            }

            if (this.shouldStopAtTerminator(token, terminators)) {
                break;
            }

            if (this.consumeTopLevelToken(body, token) === "continue") {
                continue;
            }

            const statement = this.parseStatement();
            if (statement) {
                this.appendScriptNode(body, statement);
            } else {
                // Avoid infinite loops
                this.advance();
            }
        }

        const lastBodyNode = arrayAt(body, -1);
        const end = lastBodyNode ? lastBodyNode.loc.end : start;
        return {
            body,
            loc: { end, start },
            type: "Script",
        } satisfies ScriptNode;
    }

    public parseStatementForTest(): null | PipelineNode {
        return this.parseStatement();
    }

    private advance(): Token {
        this.tokenIndex += 1;
        const token = this.tokens[this.tokenIndex - 1];
        if (!isDefined(token)) {
            throw new Error("Unexpected end of token stream");
        }
        return token;
    }

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- Kept as instance method to preserve class member ordering and parser flow consistency
    private appendScriptNode(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- ScriptBodyNode array is intentionally mutated while parsing
        body: ScriptBodyNode[],
        node: null | Readonly<ScriptBodyNode> | undefined
    ): void {
        if (!isPresent(node)) {
            return;
        }

        const last = arrayAt(body, -1);
        if (isDefined(last) && shouldMergeNodes(last, node)) {
            mergeNodes(last, node);
            return;
        }

        body.push(node);
    }

    /**
     * Attempts to attach a standalone comment token to the trailing script
     * block of the previous pipeline expression.
     *
     * @param body - Current script body buffer.
     * @param commentNode - Comment node to attach.
     *
     * @returns Whether the comment was attached to the previous node.
     */
    private attachCommentToPreviousScriptBlock(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- ScriptBodyNode contains mutable nested arrays
        body: readonly ScriptBodyNode[],
        commentNode: Readonly<CommentNode>
    ): boolean {
        const previousNode = arrayAt(body, -1);
        if (previousNode?.type !== "Pipeline") {
            return false;
        }

        const nextToken = this.peekNextNonNewlineToken();
        const lastSegment = arrayAt(previousNode.segments, -1);
        if (!isDefined(lastSegment)) {
            return false;
        }
        const lastPart = arrayAt(lastSegment.parts, -1);
        if (lastPart?.type !== "ScriptBlock") {
            return false;
        }

        const isClosesCurrentBlock =
            nextToken?.type === "punctuation" && nextToken.value === "}";
        const isBelongsToBlock =
            commentNode.loc.start < lastPart.loc.end || isClosesCurrentBlock;

        if (!isBelongsToBlock) {
            return false;
        }

        lastPart.body.push(commentNode);
        extendNodeLocation(lastPart, commentNode.loc.end);
        extendNodeLocation(lastSegment, commentNode.loc.end);
        extendNodeLocation(previousNode, commentNode.loc.end);

        return true;
    }

    private collectBalancedTokens(startToken: Readonly<Token>): {
        closingToken?: Token;
        contentTokens: Token[];
    } {
        const contentTokens: Token[] = [];
        const stack: string[] = [startToken.value];

        while (!this.isEOF()) {
            const token = this.advance();

            if (isOpeningToken(token)) {
                stack.push(token.value);
                contentTokens.push(token);
                continue;
            }

            if (isClosingToken(token)) {
                if (stack.length <= 1) {
                    return { closingToken: token, contentTokens };
                }
                stack.pop();
                contentTokens.push(token);
                continue;
            }

            contentTokens.push(token);
        }

        return { contentTokens };
    }

    private consumeBlankLines(): BlankLineNode {
        let count = 0;
        const start = this.peek()?.start ?? 0;
        let end = start;
        while (!this.isEOF()) {
            const token = this.peek();
            if (token?.type !== "newline") {
                break;
            }
            const current = this.advance();
            count += 1;
            end = current.end;
        }
        return {
            count,
            loc: { end, start },
            type: "BlankLine",
        } satisfies BlankLineNode;
    }

    private consumeStatementBlockComment(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Parser state is intentionally mutated during statement consumption
        state: StatementParseState
    ): "break" | "continue" {
        if (isEmpty(state.structureStack)) {
            return "break";
        }

        this.pushTokenToCurrentSegment(state.segments, this.advance());
        return "continue";
    }

    private consumeStatementComment(
        token: Readonly<Token>,
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Parser state is intentionally mutated during statement consumption
        state: StatementParseState
    ): "break" | "continue" {
        if (isEmpty(state.structureStack) && this.isInlineComment(token)) {
            state.trailingComment = this.createCommentNode(
                this.advance(),
                true
            );
        }

        if (isEmpty(state.structureStack)) {
            return "break";
        }

        this.pushTokenToCurrentSegment(state.segments, this.advance());
        return "continue";
    }

    private consumeStatementNewline(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Parser state is intentionally mutated during statement consumption
        state: StatementParseState
    ): "break" | "continue" {
        if (state.lineContinuation) {
            this.advance();
            state.lineContinuation = false;
            return "continue";
        }

        /* c8 ignore next */
        if (state.structureStack.length > 0) {
            this.pushTokenToCurrentSegment(state.segments, this.advance());
            return "continue";
        }

        if (this.isPipelineContinuationAfterNewline()) {
            this.advance();
            return "continue";
        }

        return "break";
    }

    private consumeStatementPipe(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Parser state is intentionally mutated during statement consumption
        state: StatementParseState
    ): "continue" {
        if (state.structureStack.length > 0) {
            this.pushTokenToCurrentSegment(state.segments, this.advance());
            state.lineContinuation = false;
            return "continue";
        }

        this.advance();
        state.segments.push([]);
        state.lineContinuation = false;
        return "continue";
    }

    private consumeStatementToken(
        token: Readonly<Token>,
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Parser state is intentionally mutated during statement consumption
        state: StatementParseState
    ): "break" | "continue" | "none" {
        const terminatorType = classifyStatementTerminator(
            token,
            state.structureStack.length
        );

        if (arrayIncludes(STATEMENT_BREAK_TERMINATORS, terminatorType)) {
            return "break";
        }

        if (terminatorType === "newline") {
            return this.consumeStatementNewline(state);
        }

        if (token.type === COMMENT_TOKEN_TYPE) {
            return this.consumeStatementComment(token, state);
        }

        if (token.type === BLOCK_COMMENT_TOKEN_TYPE) {
            return this.consumeStatementBlockComment(state);
        }

        if (token.type === "operator" && token.value === "|") {
            return this.consumeStatementPipe(state);
        }

        /* c8 ignore next */
        if (token.type === "unknown" && token.value === "`") {
            this.advance();
            state.lineContinuation = true;
            return "continue";
        }

        return "none";
    }

    private consumeTopLevelToken(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- ScriptBodyNode array is intentionally mutated while parsing
        body: ScriptBodyNode[],
        token: Readonly<Token>
    ): "continue" | "statement" {
        if (classifyStatementTerminator(token, 0) === "semicolon") {
            this.advance();
            const nextToken = this.peek();
            if (
                nextToken?.type === COMMENT_TOKEN_TYPE &&
                this.isInlineComment(nextToken)
            ) {
                this.appendScriptNode(
                    body,
                    this.createCommentNode(this.advance(), true)
                );
            }
            return "continue";
        }

        if (token.type === "newline") {
            this.appendScriptNode(body, this.consumeBlankLines());
            return "continue";
        }

        if (
            token.type === COMMENT_TOKEN_TYPE ||
            token.type === BLOCK_COMMENT_TOKEN_TYPE
        ) {
            const commentNode = this.createCommentNode(this.advance(), false);
            if (
                body.length > 0 &&
                this.attachCommentToPreviousScriptBlock(body, commentNode)
            ) {
                return "continue";
            }
            this.appendScriptNode(body, commentNode);
            return "continue";
        }

        if (this.isFunctionDeclaration()) {
            this.appendScriptNode(body, this.parseFunction());
            return "continue";
        }

        return "statement";
    }

    private createCommentNode(
        token: Readonly<Token>,
        isInlineArgument: boolean
    ): CommentNode {
        const style =
            token.type === BLOCK_COMMENT_TOKEN_TYPE ? "block" : "line";
        const isInline =
            style === "line" && isInlineArgument && this.isInlineComment(token);

        return {
            inline: isInline,
            loc: { end: token.end, start: token.start },
            style,
            type: "Comment",
            value: token.value,
        } satisfies CommentNode;
    }

    private isEOF(): boolean {
        return this.tokenIndex >= this.tokens.length;
    }

    private isFunctionDeclaration(): boolean {
        const token = this.peek();
        return (
            token?.type === "keyword" &&
            token.value.toLowerCase() === "function"
        );
    }

    private isInlineComment(token: Readonly<Token>): boolean {
        if (token.type !== COMMENT_TOKEN_TYPE) {
            return false;
        }
        // Empty source means no context, treat as not inline
        if (this.source.length === 0) {
            return false;
        }
        // Comment at position 0 is at the beginning, not inline
        if (token.start === 0) {
            return false;
        }

        let cursor = token.start - 1;
        while (cursor >= 0) {
            const char = this.source[cursor];
            if (char === "\n") {
                return false;
            }
            if (char === "\r") {
                return false;
            }
            if (!isDefined(char)) {
                return false;
            }
            if (!/\s/v.test(char)) {
                return true;
            }
            cursor -= 1;
        }

        return false;
    }

    /**
     * Checks if there's a pipeline continuation (|) after newlines. This
     * handles multi-line pipelines where the pipe operator appears on a
     * subsequent line.
     */
    private isPipelineContinuationAfterNewline(): boolean {
        let offset = 1;
        while (true) {
            const next = this.peek(offset);
            if (!isDefined(next)) {
                return false;
            }
            if (next.type === "newline") {
                offset += 1;
                continue;
            }
            if (next.type === COMMENT_TOKEN_TYPE) {
                return false;
            }
            return next.type === "operator" && next.value === "|";
        }
    }

    private parseFunction(): FunctionDeclarationNode {
        const startToken = this.advance(); // Function keyword
        const headerTokens: Token[] = [startToken];

        while (!this.isEOF()) {
            const token = this.peek();

            if (!isDefined(token)) {
                break;
            }
            if (token.type === COMMENT_TOKEN_TYPE) {
                break;
            }
            if (token.type === "punctuation" && token.value === "{") {
                break;
            }
            headerTokens.push(this.advance());
        }

        const headerExpression = buildExpressionFromTokens(
            headerTokens,
            this.source
        );
        const body = this.parseScriptBlock();
        const end = body.loc.end;

        return {
            body,
            header: headerExpression,
            loc: { end, start: startToken.start },
            type: "FunctionDeclaration",
        } satisfies FunctionDeclarationNode;
    }

    private parseScriptBlock(): ScriptBlockNode {
        const openToken = this.peek();
        if (openToken?.type !== "punctuation" || openToken.value !== "{") {
            return {
                body: [],
                loc: { end: openToken?.end ?? 0, start: openToken?.start ?? 0 },
                type: "ScriptBlock",
            } satisfies ScriptBlockNode;
        }
        this.advance();

        const { closingToken, contentTokens } =
            this.collectBalancedTokens(openToken);
        const nestedParser = new Parser(contentTokens, this.source);
        const script = nestedParser.parseScript(new Set());
        const closingEnd = closingToken?.end ?? openToken.end;
        const lastScriptBodyNode = arrayAt(script.body, -1);
        const bodyEnd = lastScriptBodyNode
            ? lastScriptBodyNode.loc.end
            : closingEnd;
        const end = Math.max(closingEnd, bodyEnd);

        return {
            body: script.body,
            loc: { end, start: openToken.start },
            type: "ScriptBlock",
        } satisfies ScriptBlockNode;
    }

    private parseStatement(): null | PipelineNode {
        const state: StatementParseState = {
            lineContinuation: false,
            segments: [[]],
            structureStack: [],
        };

        while (!this.isEOF()) {
            const token = this.peek();

            if (!isDefined(token)) {
                break;
            }

            const action = this.consumeStatementToken(token, state);
            if (action === "break") {
                break;
            }
            if (action === "continue") {
                continue;
            }

            this.pushTokenToCurrentSegment(state.segments, this.advance());
            state.lineContinuation = false;

            if (isOpeningToken(token)) {
                state.structureStack.push(token.value);
            } else if (isClosingToken(token)) {
                state.structureStack.pop();
            } else {
                // Non-structural tokens do not modify nesting depth.
            }
        }

        const filteredSegments = state.segments.filter(
            (segment) => segment.length > 0
        );
        if (isEmpty(filteredSegments)) {
            return null;
        }

        const expressionSegments = filteredSegments.map((segmentTokens) =>
            buildExpressionFromTokens(segmentTokens, this.source)
        );
        const firstExpressionSegment = arrayFirst(expressionSegments);
        if (!isDefined(firstExpressionSegment)) {
            return null;
        }
        const start = firstExpressionSegment.loc.start;
        const lastExpressionSegment = arrayAt(expressionSegments, -1);
        const end = lastExpressionSegment
            ? lastExpressionSegment.loc.end
            : start;

        const pipelineNode: PipelineNode = {
            loc: { end, start },
            segments: expressionSegments,
            type: "Pipeline",
        };

        if (state.trailingComment) {
            pipelineNode.trailingComment = state.trailingComment;
        }

        return pipelineNode;
    }

    private peek(offset = 0): Token | undefined {
        return this.tokens[this.tokenIndex + offset];
    }

    /**
     * Peeks the next token while skipping contiguous newline tokens.
     */
    private peekNextNonNewlineToken(): Token | undefined {
        let offset = 0;
        let token = this.peek(offset);
        while (token?.type === "newline") {
            offset += 1;
            token = this.peek(offset);
        }
        return token;
    }

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- Kept as instance method to preserve class member ordering and parser flow consistency
    private pushTokenToCurrentSegment(
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Nested token arrays are intentionally mutated while parsing
        segments: Token[][],
        token: Readonly<Token>
    ): void {
        const currentSegment = arrayAt(segments, -1);
        if (currentSegment) {
            currentSegment.push(token);
        }
    }

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- Kept as instance method to preserve class member ordering and parser flow consistency
    private shouldStopAtTerminator(
        token: Readonly<Token>,
        terminators: ReadonlySet<string>
    ): boolean {
        return token.type === "punctuation" && setHas(terminators, token.value);
    }
}

/**
 * Parses PowerShell source code into an Abstract Syntax Tree (AST).
 *
 * This is the main entry point for parsing. It tokenizes the source, creates a
 * parser instance, and builds the AST representing the script structure.
 *
 * The parser is designed to be resilient and will attempt to parse even
 * malformed code to provide the best formatting experience possible.
 *
 * @param source - The PowerShell source code to parse
 * @param options - Parser options (currently used for resolving configuration)
 *
 * @returns A ScriptNode representing the root of the AST
 */
export function parsePowerShell(
    source: string,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Prettier API type
    options: ParserOptions
): ScriptNode {
    resolveOptions(options);
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    return parser.parseScript();
}

/**
 * Parses PowerShell source with custom terminator tokens.
 *
 * This is used internally for parsing sub-sections of scripts where certain
 * tokens should stop parsing (e.g., closing braces, specific keywords).
 *
 * @param source - The PowerShell source code to parse
 * @param terminators - Set of token values that should stop parsing
 *
 * @returns A ScriptNode representing the parsed section
 */
export function parseScriptWithTerminators(
    source: string,
    terminators: ReadonlySet<string>
): ScriptNode {
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    return parser.parseScript(terminators);
}

function buildExpressionFromTokens(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    source = ""
): ExpressionNode {
    const { firstToken, lastToken } = findExpressionBoundaryTokens(tokens);
    if (!firstToken || !lastToken) {
        return {
            loc: {
                end: arrayAt(tokens, -1)?.end ?? 0,
                start: arrayFirst(tokens)?.start ?? 0,
            },
            parts: [],
            type: "Expression",
        } satisfies ExpressionNode;
    }

    const parts: ExpressionPartNode[] = [];
    let index = 0;

    while (index < tokens.length) {
        const parsedPart = parseExpressionPartFromToken(tokens, index, source);
        if (!parsedPart) {
            index += 1;
            continue;
        }

        parts.push(parsedPart.node);
        index = parsedPart.nextIndex;
    }

    const lastPart = arrayAt(parts, -1);
    const expressionEnd = lastPart?.loc.end ?? lastToken.end;

    return {
        loc: {
            end: expressionEnd,
            start: firstToken.start,
        },
        parts,
        type: "Expression",
    } satisfies ExpressionNode;
}

function findExpressionBoundaryTokens(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[]
): { firstToken?: Token; lastToken?: Token } {
    const firstToken = tokens.find((token) => token.type !== "newline");
    let lastToken: null | Token = null;

    for (let index = tokens.length - 1; index >= 0; index -= 1) {
        const candidate = tokens[index];
        if (!isDefined(candidate) || candidate.type === "newline") {
            continue;
        }

        lastToken = candidate;
        break;
    }

    return {
        ...(firstToken && { firstToken }),
        ...(lastToken !== null && { lastToken }),
    };
}

function parseExpressionPartFromToken(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    index: number,
    source: string
): undefined | { nextIndex: number; node: ExpressionPartNode } {
    const token = tokens[index];
    if (!isDefined(token) || token.type === "newline") {
        return undefined;
    }

    if (token.type === "operator" && token.value === "@{") {
        return parseHashtablePart(tokens, index, source);
    }

    if (
        (token.type === "operator" && token.value === "@(") ||
        (token.type === "punctuation" && token.value === "[")
    ) {
        return parseArrayPart(tokens, index, source);
    }

    if (token.type === "punctuation" && token.value === "{") {
        return parseScriptBlockPart(tokens, index, source);
    }

    if (token.type === "punctuation" && token.value === "(") {
        return parseParenthesisPart(tokens, index, source);
    }

    if (token.type === "heredoc") {
        return {
            nextIndex: index + 1,
            node: createHereStringNode(token),
        };
    }

    return {
        nextIndex: index + 1,
        node: createTextNode(token),
    };
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
const extractKeyText = (tokens: readonly Token[]): string => {
    const text = arrayJoin(
        tokens
            .filter((token) => token.type !== "newline")
            .map((token) => token.value),
        " "
    ).trim();
    if (text.startsWith('"') && text.endsWith('"')) {
        return text.slice(1, -1);
    }
    if (text.startsWith("'") && text.endsWith("'")) {
        return text.slice(1, -1);
    }
    return text;
};

function buildHashtableEntry(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token model is mutable and used per parser conventions; deep-readonly token graph is not currently modeled
    tokens: readonly Token[],
    source = ""
): HashtableEntryNode {
    const { equalsIndex, leadingComments, otherTokens, trailingComments } =
        partitionHashtableEntryTokens(tokens);

    const keyTokens =
        equalsIndex === -1 ? otherTokens : otherTokens.slice(0, equalsIndex);
    const valueTokens =
        equalsIndex === -1 ? [] : otherTokens.slice(equalsIndex + 1);
    const keyExpression = buildExpressionFromTokens(keyTokens, source);
    const valueExpression = buildExpressionFromTokens(
        isEmpty(valueTokens) ? [] : valueTokens,
        source
    );
    const key = extractKeyText(keyTokens);

    // Calculate start/end based on non-comment tokens like original logic
    const start =
        arrayFirst(keyTokens)?.start ?? arrayFirst(valueTokens)?.start ?? 0;
    const end =
        (arrayAt(valueTokens, -1) ?? arrayAt(keyTokens, -1))?.end ?? start;

    const entry: HashtableEntryNode = {
        key,
        loc: { end, start },
        rawKey: keyExpression,
        type: "HashtableEntry",
        value: valueExpression,
    };
    const commentFields = buildHashtableEntryCommentFields({
        keyTokens,
        leadingComments,
        source,
        tokens,
        trailingComments,
        valueTokens,
    });

    return { ...entry, ...commentFields };
}

function buildHashtableEntryCommentFields(
    context: Readonly<HashtableEntryCommentContext>
): Partial<HashtableEntryCommentFields> {
    const leadingComments = isEmpty(context.leadingComments)
        ? undefined
        : context.leadingComments.map((token) =>
              createCommentNodeFromToken(token, false)
          );
    const trailingNodes = buildHashtableEntryTrailingComments(context);

    if (isDefined(leadingComments) && !isEmpty(trailingNodes)) {
        return { leadingComments, trailingComments: trailingNodes };
    }

    if (isDefined(leadingComments)) {
        return { leadingComments };
    }

    if (!isEmpty(trailingNodes)) {
        return { trailingComments: trailingNodes };
    }

    return {};
}

function buildHashtableEntryTrailingComments(
    context: Readonly<HashtableEntryCommentContext>
): CommentNode[] {
    if (isEmpty(context.trailingComments)) {
        return [];
    }

    const referenceEnd =
        arrayAt(context.valueTokens, -1)?.end ??
        arrayAt(context.keyTokens, -1)?.end ??
        arrayFirst(context.tokens)?.start ??
        0;

    return buildTrailingCommentNodes(
        context.trailingComments,
        context.source,
        referenceEnd
    );
}

function buildTrailingCommentNodes(
    trailingComments: readonly Readonly<Token>[],
    source: string,
    referenceStart: number
): CommentNode[] {
    const trailingNodes: CommentNode[] = [];
    let referenceEnd = referenceStart;

    for (const token of trailingComments) {
        const isInline =
            token.type === COMMENT_TOKEN_TYPE &&
            isInlineSpacing(source, referenceEnd, token.start);

        trailingNodes.push(createCommentNodeFromToken(token, isInline));
        referenceEnd = token.end;
    }

    if (trailingNodes.length > 1) {
        for (const comment of trailingNodes) {
            comment.inline = false;
        }
    }

    return trailingNodes;
}

function captureElseContinuationTokens(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    index: number,
    prefix: readonly Readonly<Token>[]
): { elseTokens: Token[]; nextIndex: number; terminated: boolean } {
    const elseTokens: Token[] = [...prefix];
    const stack: string[] = [];
    let nextIndex = index;

    for (; nextIndex < tokens.length; nextIndex += 1) {
        const token = tokens[nextIndex];
        if (!isDefined(token)) {
            continue;
        }

        elseTokens.push(token);
        if (token.type === "punctuation" && token.value === "{") {
            stack.push("{");
            continue;
        }

        if (token.type === "punctuation" && token.value === "}") {
            if (isEmpty(stack)) {
                continue;
            }

            stack.pop();
            if (isEmpty(stack)) {
                return {
                    elseTokens,
                    nextIndex: nextIndex + 1,
                    terminated: true,
                };
            }
        }
    }

    return { elseTokens, nextIndex, terminated: false };
}

function classifyStatementTerminator(
    token: Readonly<Token> | undefined,
    structureDepth: number
): "closing-brace" | "closing-paren" | "newline" | "semicolon" | null {
    if (!isDefined(token)) {
        return null;
    }
    if (token.type === "newline") {
        return structureDepth === 0 ? "newline" : null;
    }
    if (structureDepth === 0 && token.type === "punctuation") {
        if (token.value === ";") {
            return "semicolon";
        }
        if (token.value === "}") {
            return "closing-brace";
        }
        if (token.value === ")") {
            return "closing-paren";
        }
    }
    return null;
}

function collectStructureTokens(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    startIndex: number
): { closingToken?: Token; contentTokens: Token[]; endIndex: number } {
    const contentTokens: Token[] = [];
    const startToken = tokens[startIndex];
    if (!isDefined(startToken)) {
        return { contentTokens, endIndex: startIndex };
    }
    const stack: string[] = [startToken.value];
    let index = startIndex + 1;

    while (index < tokens.length) {
        const token = tokens[index];
        if (!isDefined(token)) {
            index += 1;
            continue;
        }

        if (isOpeningToken(token)) {
            stack.push(token.value);
            contentTokens.push(token);
            index += 1;
            continue;
        }

        if (isClosingToken(token)) {
            if (stack.length === 1) {
                return {
                    closingToken: token,
                    contentTokens,
                    endIndex: index + 1,
                };
            }
            stack.pop();
            contentTokens.push(token);
            index += 1;
            continue;
        }

        contentTokens.push(token);
        index += 1;
    }

    return { contentTokens, endIndex: tokens.length };
}

function consumeElseContinuationPrefix(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[]
): { index: number; prefix: Token[] } {
    let index = 0;
    const prefix: Token[] = [];

    while (index < tokens.length) {
        const currentToken = tokens[index];
        if (!isDefined(currentToken)) {
            index += 1;
            continue;
        }

        if (
            currentToken.type !== "newline" &&
            currentToken.type !== COMMENT_TOKEN_TYPE &&
            currentToken.type !== BLOCK_COMMENT_TOKEN_TYPE
        ) {
            break;
        }

        prefix.push(currentToken);
        index += 1;
    }

    return { index, prefix };
}

function createCommentNodeFromToken(
    token: Readonly<Token>,
    isInline: boolean
): CommentNode {
    return {
        inline: isInline,
        loc: { end: token.end, start: token.start },
        style: token.type === BLOCK_COMMENT_TOKEN_TYPE ? "block" : "line",
        type: "Comment",
        value: token.value,
    } satisfies CommentNode;
}

function createHereStringNode(token: Readonly<Token>): HereStringNode {
    const quote = token.quote ?? "double";
    return {
        loc: { end: token.end, start: token.start },
        quote,
        type: "HereString",
        value: token.value,
    } satisfies HereStringNode;
}

function createTextNode(token: Readonly<Token>): TextNode {
    const tokenTypeToRole: Record<string, TokenRole> = {
        identifier: "word",
        keyword: "keyword",
        number: "number",
        operator: "operator",
        punctuation: "punctuation",
        string: "string",
        variable: "variable",
    };
    let role: TokenRole = tokenTypeToRole[token.type] ?? "unknown";

    if (
        (role === "unknown" || role === "word") &&
        setHas(FALLBACK_OPERATOR_TOKENS, token.value)
    ) {
        role = "operator";
    }

    let value = token.value;

    // Preserve the fact that this originated from a `#` line comment so that
    // downstream printers can recognise it as comment text rather than code.
    // The tokenizer stores the comment text *after* the `#`, including any
    // leading whitespace (e.g. " Black"), so we simply re-prepend `#` here.
    if (token.type === COMMENT_TOKEN_TYPE) {
        value = `#${value}`;
    }

    return {
        loc: { end: token.end, start: token.start },
        role,
        type: "Text",
        value,
    } satisfies TextNode;
}

function extractElseContinuation(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[]
): null | { elseTokens: Token[]; remainingTokens: Token[] } {
    const { index, prefix } = consumeElseContinuationPrefix(tokens);

    const keywordToken = tokens[index];
    if (keywordToken?.type !== "keyword") {
        return null;
    }
    const keyword = keywordToken.value.toLowerCase();
    if (keyword !== "else" && keyword !== "elseif") {
        return null;
    }

    const captured = captureElseContinuationTokens(tokens, index, prefix);
    if (!captured.terminated) {
        return null;
    }

    return {
        elseTokens: captured.elseTokens,
        remainingTokens: tokens.slice(captured.nextIndex),
    };
}

function getTopLevelSeparatorDecision<TState>(
    token: Readonly<Token>,
    isTopLevel: boolean,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Split callbacks intentionally rely on mutable context contracts
    context: SplitContext<TState>,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Split callbacks intentionally rely on mutable option callback signatures
    options: SplitOptions<TState>
): "consume" | "flush" | "none" {
    if (!isTopLevel) {
        return "none";
    }

    if (token.type === "newline") {
        return options.splitOnNewline?.(context) === true ? "flush" : "consume";
    }

    if (
        token.type === "punctuation" &&
        options.delimiterValues?.includes(token.value) === true
    ) {
        return (options.shouldSplitOnDelimiter?.(context) ?? true)
            ? "flush"
            : "consume";
    }

    return "none";
}

function parseArrayPart(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    startIndex: number,
    source = ""
): { nextIndex: number; node: ArrayLiteralNode } {
    const startToken = tokens[startIndex];
    if (!isDefined(startToken)) {
        return {
            nextIndex: startIndex + 1,
            node: {
                elements: [],
                kind: "explicit",
                loc: { end: 0, start: 0 },
                type: "ArrayLiteral",
            },
        };
    }
    const { closingToken, contentTokens, endIndex } = collectStructureTokens(
        tokens,
        startIndex
    );
    const elements = splitArrayElements(contentTokens).map((elementTokens) =>
        buildExpressionFromTokens(elementTokens, source)
    );
    /* c8 ignore next */
    const kind = startToken.value === "@(" ? "implicit" : "explicit";
    const end = resolveStructureEnd(startToken, closingToken, contentTokens);
    return {
        nextIndex: endIndex,
        node: {
            elements,
            kind,
            loc: { end, start: startToken.start },
            type: "ArrayLiteral",
        },
    } satisfies { nextIndex: number; node: ArrayLiteralNode };
}

function parseHashtablePart(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    startIndex: number,
    source = ""
): { nextIndex: number; node: HashtableNode } {
    const startToken = tokens[startIndex];
    if (!isDefined(startToken)) {
        return {
            nextIndex: startIndex + 1,
            node: {
                entries: [],
                loc: { end: 0, start: 0 },
                type: "Hashtable",
            },
        };
    }
    const { closingToken, contentTokens, endIndex } = collectStructureTokens(
        tokens,
        startIndex
    );
    const entries = splitHashtableEntries(contentTokens).map((entryTokens) =>
        buildHashtableEntry(entryTokens, source)
    );
    const end =
        closingToken?.end ?? arrayAt(contentTokens, -1)?.end ?? startToken.end;
    return {
        nextIndex: endIndex,
        node: {
            entries,
            loc: { end, start: startToken.start },
            type: "Hashtable",
        },
    };
}

function parseParenthesisPart(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    startIndex: number,
    source = ""
): { nextIndex: number; node: ParenthesisNode } {
    const startToken = tokens[startIndex];
    if (!isDefined(startToken)) {
        return {
            nextIndex: startIndex + 1,
            node: {
                elements: [],
                hasComma: false,
                hasNewline: false,
                loc: { end: 0, start: 0 },
                type: "Parenthesis",
            },
        };
    }
    const { closingToken, contentTokens, endIndex } = collectStructureTokens(
        tokens,
        startIndex
    );
    const elements = splitArrayElements(contentTokens).map((elementTokens) =>
        buildExpressionFromTokens(elementTokens, source)
    );
    const hasComma = hasTopLevelComma(contentTokens);
    const hasNewline = contentTokens.some((token) => token.type === "newline");
    const end = resolveStructureEnd(startToken, closingToken, contentTokens);
    return {
        nextIndex: endIndex,
        node: {
            elements,
            hasComma,
            hasNewline,
            loc: { end, start: startToken.start },
            type: "Parenthesis",
        },
    };
}

function parseScriptBlockPart(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    startIndex: number,
    source = ""
): { nextIndex: number; node: ScriptBlockNode } {
    const startToken = tokens[startIndex];
    if (!isDefined(startToken)) {
        return {
            nextIndex: startIndex + 1,
            node: {
                body: [],
                loc: { end: 0, start: 0 },
                type: "ScriptBlock",
            },
        };
    }
    const { closingToken, contentTokens, endIndex } = collectStructureTokens(
        tokens,
        startIndex
    );
    const nestedParser = new Parser(contentTokens, source);
    const script = nestedParser.parseScript();
    const closingEnd = resolveStructureEnd(
        startToken,
        closingToken,
        contentTokens
    );
    const lastScriptNode = arrayAt(script.body, -1);
    const bodyEnd = lastScriptNode ? lastScriptNode.loc.end : closingEnd;
    const end = Math.max(closingEnd, bodyEnd);
    return {
        nextIndex: endIndex,
        node: {
            body: script.body,
            loc: { end, start: startToken.start },
            type: "ScriptBlock",
        },
    };
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
function parseStatementForTest(tokens: readonly Token[]): null | PipelineNode {
    const parser = new Parser(tokens, "");
    return parser.parseStatementForTest();
}

function partitionHashtableEntryTokens(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token model is mutable and used per parser conventions
    tokens: readonly Token[]
): {
    equalsIndex: number;
    leadingComments: Token[];
    otherTokens: Token[];
    trailingComments: Token[];
} {
    const leadingComments: Token[] = [];
    const trailingComments: Token[] = [];
    const otherTokens: Token[] = [];
    let equalsIndex = -1;
    let isFoundEquals = false;

    for (const token of tokens) {
        if (
            token.type === COMMENT_TOKEN_TYPE ||
            token.type === BLOCK_COMMENT_TOKEN_TYPE
        ) {
            if (isFoundEquals) {
                trailingComments.push(token);
            } else {
                leadingComments.push(token);
            }
            continue;
        }

        if (
            token.type === "operator" &&
            token.value === "=" &&
            !isFoundEquals
        ) {
            equalsIndex = otherTokens.length;
            isFoundEquals = true;
        }
        otherTokens.push(token);
    }

    return { equalsIndex, leadingComments, otherTokens, trailingComments };
}

function pushTopLevelToken(
    token: Readonly<Token>,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Split buffer is intentionally mutated while tokenizing structures
    current: Token[],
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Stack is intentionally mutated while tracking nesting
    stack: string[]
): void {
    if (isOpeningToken(token)) {
        stack.push(token.value);
        current.push(token);
        return;
    }

    if (isClosingToken(token)) {
        stack.pop();
        current.push(token);
        return;
    }

    current.push(token);
}

function resolveStructureEnd(
    startToken: Readonly<Token>,
    closingToken: Readonly<Token> | undefined,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    contentTokens: readonly Token[]
): number {
    if (closingToken) {
        return closingToken.end;
    }
    const lastContent =
        contentTokens.length > 0 ? arrayAt(contentTokens, -1) : undefined;
    if (lastContent) {
        return lastContent.end;
    }
    return startToken.end;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
function splitArrayElements(tokens: readonly Token[]): Token[][] {
    return splitTopLevelTokens(tokens, {
        delimiterValues: [","],
        splitOnNewline: (context) => context.current.length > 0,
    });
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
function splitHashtableEntries(tokens: readonly Token[]): Token[][] {
    interface HashtableSplitState {
        hasEquals: boolean;
        justSawEquals: boolean;
        pendingComments: Token[];
    }

    const rawSegments = splitTopLevelTokens<HashtableSplitState>(tokens, {
        createInitialState: () => ({
            hasEquals: false,
            justSawEquals: false,
            pendingComments: [],
        }),
        delimiterValues: [";"],
        onAfterAddToken: (context) => {
            const { isTopLevel, state, token } = context;
            if (
                isTopLevel &&
                token.type === "operator" &&
                token.value === "="
            ) {
                state.hasEquals = true;
                state.justSawEquals = true;
                return;
            }
            if (
                token.type !== "newline" &&
                token.type !== COMMENT_TOKEN_TYPE &&
                token.type !== BLOCK_COMMENT_TOKEN_TYPE
            ) {
                state.justSawEquals = false;
            }
        },
        onBeforeAddToken: (context) => {
            if (isEmpty(context.state.pendingComments)) {
                return;
            }

            context.current.push(...context.state.pendingComments);
            context.state.pendingComments = [];
        },
        onFlush: (segment, state, segments) => {
            if (state.pendingComments.length > 0) {
                if (segment.length > 0) {
                    segment.push(...state.pendingComments);
                } else if (segments.length > 0) {
                    const previousSegment = arrayAt(segments, -1);
                    if (previousSegment) {
                        previousSegment.push(...state.pendingComments);
                    } else {
                        segments.push([...state.pendingComments]);
                    }
                } else {
                    segments.push([...state.pendingComments]);
                }
                state.pendingComments = [];
            }
            state.hasEquals = false;
            state.justSawEquals = false;
            return segment;
        },

        onToken: (context): SplitDecision => {
            if (
                context.token.type === COMMENT_TOKEN_TYPE ||
                context.token.type === BLOCK_COMMENT_TOKEN_TYPE
            ) {
                context.state.pendingComments.push(context.token);
                return "skip";
            }
            return undefined;
        },
        shouldSplitOnDelimiter: (context) => {
            if (isEmpty(context.current)) {
                return false;
            }
            if (context.state.pendingComments.length > 0) {
                context.current.push(...context.state.pendingComments);
                context.state.pendingComments = [];
            }
            return true;
        },
        splitOnNewline: (context) => {
            if (isEmpty(context.current)) {
                return false;
            }
            if (!context.state.hasEquals || context.state.justSawEquals) {
                return false;
            }
            if (context.state.pendingComments.length > 0) {
                context.current.push(...context.state.pendingComments);
                context.state.pendingComments = [];
            }
            return true;
        },
    });

    const segments: Token[][] = [];
    for (const segment of rawSegments) {
        if (segments.length > 0) {
            const continuation = extractElseContinuation(segment);
            if (continuation) {
                const previousSegment = arrayAt(segments, -1);
                if (previousSegment) {
                    previousSegment.push(...continuation.elseTokens);
                }
                if (continuation.remainingTokens.length > 0) {
                    segments.push(continuation.remainingTokens);
                }
                continue;
            }
        }
        segments.push(segment);
    }

    return segments;
}

function splitTopLevelTokens<TState = Record<string, never>>(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
    tokens: readonly Token[],
    options: SplitOptions<TState> = {}
): Token[][] {
    const result: Token[][] = [];
    let current: Token[] = [];
    const stack: string[] = [];
    const state = options.createInitialState
        ? options.createInitialState()
        : // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- default state is only used when callers do not supply typed state
          ({} as TState);

    const flush = (shouldForce = false) => {
        if (!shouldForce && isEmpty(current)) {
            return;
        }
        const maybeSegment = options.onFlush?.(
            current,
            state,
            result,
            shouldForce
        );
        const segment = maybeSegment ?? current;
        if (segment.length > 0) {
            result.push(segment);
        }
        current = [];
    };

    for (const token of tokens) {
        const isTopLevel = isEmpty(stack);
        const context: SplitContext<TState> = {
            current,
            isTopLevel,
            stack,
            state,
            token,
        };

        const separatorDecision = getTopLevelSeparatorDecision(
            token,
            isTopLevel,
            context,
            options
        );
        if (separatorDecision === "flush") {
            flush();
            continue;
        }
        if (separatorDecision === "consume") {
            continue;
        }

        const decision = options.onToken?.(context);
        if (decision === "skip") {
            continue;
        }

        options.onBeforeAddToken?.(context);

        pushTopLevelToken(token, current, stack);

        options.onAfterAddToken?.({
            current,
            isTopLevel: isEmpty(stack),
            stack,
            state,
            token,
        });
    }

    flush(true);

    return result;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Token contains mutable properties that cannot be made deeply readonly
const findTopLevelEquals = (tokens: readonly Token[]): number => {
    const stack: string[] = [];
    for (const [index, token] of tokens.entries()) {
        if (isOpeningToken(token)) {
            stack.push(token.value);
            continue;
        }
        if (isClosingToken(token)) {
            stack.pop();
            continue;
        }
        if (
            isEmpty(stack) &&
            token.type === "operator" &&
            token.value === "="
        ) {
            return index;
        }
    }
    return -1;
};

/**
 * Internal parser helpers exposed for white-box tests.
 */
export const parserTestUtils: {
    buildExpressionFromTokens: typeof buildExpressionFromTokens;
    buildHashtableEntry: typeof buildHashtableEntry;
    collectStructureTokens: typeof collectStructureTokens;
    createHereStringNode: typeof createHereStringNode;
    createTextNode: typeof createTextNode;
    extractKeyText: typeof extractKeyText;
    findTopLevelEquals: typeof findTopLevelEquals;
    hasTopLevelComma: typeof hasTopLevelComma;
    isClosingToken: typeof isClosingToken;
    isOpeningToken: typeof isOpeningToken;
    parseScriptWithTerminators: typeof parseScriptWithTerminators;
    parseStatementForTest: typeof parseStatementForTest;
    resolveStructureEnd: typeof resolveStructureEnd;
    splitArrayElements: typeof splitArrayElements;
    splitHashtableEntries: typeof splitHashtableEntries;
    splitTopLevelTokens: typeof splitTopLevelTokens;
} = {
    buildExpressionFromTokens,
    buildHashtableEntry,
    collectStructureTokens,
    createHereStringNode,
    createTextNode,
    extractKeyText,
    findTopLevelEquals,
    hasTopLevelComma,
    isClosingToken,
    isOpeningToken,
    parseScriptWithTerminators,
    parseStatementForTest,
    resolveStructureEnd,
    splitArrayElements,
    splitHashtableEntries,
    splitTopLevelTokens,
};

/**
 * Returns the starting location offset used by Prettier.
 */
export const locStart = (node: Readonly<{ loc: { start: number } }>): number =>
    node.loc.start;

/**
 * Returns the ending location offset used by Prettier.
 */
export const locEnd = (node: Readonly<{ loc: { end: number } }>): number =>
    node.loc.end;
