import {
    arrayIncludes,
    arrayJoin,
    isDefined,
    objectFromEntries,
    setHas,
    stringSplit,
} from "ts-extras";

import type { HereStringNode } from "./ast.js";

/**
 * Lexical token produced by the PowerShell tokenizer.
 */
export interface Token {
    end: number;
    quote?: "double" | "single";
    start: number;
    type: TokenType;
    value: string;
}

/**
 * Supported token categories emitted by tokenizer.
 */
export type TokenType =
    | "attribute"
    | "block-comment"
    | "comment"
    | "heredoc"
    | "identifier"
    | "keyword"
    | "newline"
    | "number"
    | "operator"
    | "punctuation"
    | "string"
    | "unknown"
    | "variable";

const KEYWORDS = new Set([
    "begin",
    "break",
    "catch",
    "class",
    "configuration",
    "continue",
    "data",
    "default",
    "do",
    "dynamicparam",
    "else",
    "elseif",
    "end",
    "enum",
    "exit",
    "filter",
    "finally",
    "for",
    "foreach",
    "function",
    "if",
    "inlinescript",
    "parallel",
    "param",
    "process",
    "return",
    "sequence",
    "switch",
    "throw",
    "trap",
    "try",
    "until",
    "while",
    "workflow",
]);

// PowerShell operators (case-insensitive)
const POWERSHELL_OPERATORS = new Set([
    // Logical operators
    "-and",
    // Type operators
    "-as",
    // Bitwise operators
    "-band",
    "-bnot",
    "-bor",
    "-bxor",
    "-ccontains",
    // Case-sensitive variants
    "-ceq",
    "-cge",
    "-cgt",
    "-cin",
    "-cle",
    "-clike",
    "-clt",
    "-cmatch",
    "-cne",
    "-cnotcontains",
    "-cnotin",
    "-cnotlike",
    "-cnotmatch",
    "-contains",
    // Other operators
    "-creplace",
    "-csplit",
    // Comparison operators
    "-eq",
    "-f",
    "-ge",
    "-gt",
    "-icontains",
    // Case-insensitive explicit variants
    "-ieq",
    "-ige",
    "-igt",
    "-iin",
    "-ile",
    "-ilike",
    "-ilt",
    "-imatch",
    "-in",
    "-ine",
    "-inotcontains",
    "-inotin",
    "-inotlike",
    "-inotmatch",
    "-ireplace",
    "-is",
    "-isnot",
    "-isplit",
    "-join",
    "-le",
    "-like",
    "-lt",
    "-match",
    "-ne",
    "-not",
    "-notcontains",
    "-notin",
    "-notlike",
    "-notmatch",
    "-or",
    "-replace",
    "-shl",
    "-shr",
    // String operators
    "-split",
    "-xor",
]);

const PUNCTUATION = new Set([
    "(",
    ")",
    ",",
    ".",
    ":",
    ";",
    "[",
    "]",
    "{",
    "}",
]);

const POWERSHELL_OPERATOR_LOOKUP: Readonly<Record<string, true | undefined>> =
    Object.freeze(
        objectFromEntries(
            Array.from(
                POWERSHELL_OPERATORS,
                (operator) => [operator, true] as const
            )
        )
    );

// Cached regex patterns for performance
// These are defined at module level to avoid recreation in the tokenize loop
const WHITESPACE_PATTERN = /\s/v;
const IDENTIFIER_START_PATTERN = /\p{L}|_/v;
const UNICODE_VAR_CHAR_PATTERN = /^[\p{L}\p{N}\-:_]$/v;
const HEX_DIGIT_PATTERN = /[\da-f]/iv;
const BINARY_DIGIT_PATTERN = /[01]/v;
const DECIMAL_DIGIT_PATTERN = /\d/v;
const NUMBER_SUFFIX_PATTERN = /[dflu]/iv;
const UNICODE_IDENTIFIER_START_PATTERN = /[\p{L}_]/v;
const UNICODE_IDENTIFIER_CHAR_PATTERN = /[\p{L}\p{N}\-_]/v;
const UNICODE_IDENTIFIER_AFTER_DASH_PATTERN = /[\p{L}\-]/v;
const NUMBER_INT_SUFFIX_PATTERN = /[lu]/iv;
const MERGED_REDIRECTION_TARGET_PATTERN = /[1-6]/v;
const STREAM_REDIRECTION_START_PATTERN = /[*2-6]/v;
const MERGED_ONE_REDIRECTION_TARGET_PATTERN = /[2-6]/v;

interface CodePointInfo {
    codePoint: number;
    text: string;
    width: number;
}

type ReadCodePoint = (position: number) => CodePointInfo | null;

/**
 * Normalizes a here-string by removing the opening and closing delimiters.
 *
 * @param node - The here-string AST node
 *
 * @returns The normalized content without delimiters
 *
 *   This function extracts just the content between the delimiters. If the
 *   here-string is too short (malformed), returns it as-is.
 */
export function normalizeHereString(node: Readonly<HereStringNode>): string {
    const lines = stringSplit(node.value.replaceAll("\r\n", "\n"), "\n");
    if (lines.length <= 2) {
        return node.value;
    }
    return arrayJoin(lines.slice(1, -1), "\n");
}

const readCodePointAt = (
    source: string,
    position: number
): CodePointInfo | null => {
    const codePoint = source.codePointAt(position);
    if (!isDefined(codePoint)) {
        return null;
    }
    const text = String.fromCodePoint(codePoint);
    return {
        codePoint,
        text,
        width: text.length,
    };
};

const isWhitespaceCharacter = (ch: string): boolean => {
    switch (ch) {
        case " ":
        case "\t":
        case "\f":
        case "\v":
        case "\u{A0}":
        case "\u{FEFF}":
        case "\u{200B}":
        case "\u{2060}": {
            return true;
        }
        default: {
            return false;
        }
    }
};

const advancePastWhitespace = (source: string, startIndex: number): number => {
    let index = startIndex;
    while (
        index < source.length &&
        WHITESPACE_PATTERN.test(source.charAt(index))
    ) {
        index += 1;
    }
    return index;
};

const readQuotedAttributeEnd = (
    source: string,
    startIndex: number,
    quoteChar: string
): number => {
    let index = startIndex;
    while (index < source.length) {
        const current = source[index];
        if (current === "`") {
            index += index + 1 < source.length ? 2 : 1;
            continue;
        }
        index += 1;
        if (current === quoteChar) {
            break;
        }
    }
    return index;
};

const readAttributeBodyEnd = (source: string, startIndex: number): number => {
    let depth = 1;
    let index = startIndex;

    while (index < source.length && depth > 0) {
        const current = source[index];
        if (current === "'" || current === '"') {
            index = readQuotedAttributeEnd(source, index + 1, current);
            continue;
        }
        if (current === "[") {
            depth += 1;
            index += 1;
            continue;
        }
        if (current === "]") {
            depth -= 1;
            index += 1;
            continue;
        }
        index += 1;
    }

    return depth === 0 ? index : source.length;
};

const readAttributeEnd = (
    source: string,
    startIndex: number
): null | number => {
    const lookahead = advancePastWhitespace(source, startIndex + 1);
    if (
        lookahead >= source.length ||
        !IDENTIFIER_START_PATTERN.test(source.charAt(lookahead))
    ) {
        return null;
    }

    return readAttributeBodyEnd(source, startIndex + 1);
};

const readHereStringEnd = (source: string, startIndex: number): number => {
    const quoteChar = source[startIndex + 1];
    let scanIndex = startIndex + 2;

    while (scanIndex < source.length) {
        const isMaybeClosing =
            scanIndex + 1 < source.length &&
            source[scanIndex] === quoteChar &&
            source[scanIndex + 1] === "@";

        if (!isMaybeClosing) {
            scanIndex += 1;
            continue;
        }

        const prevChar = source[scanIndex - 1];
        const prevPrev = source[scanIndex - 2];
        const isAtImmediateClosing = scanIndex === startIndex + 2;
        const isAtUnixLineStart = prevChar === "\n";
        const isAtWindowsLineStart = prevChar === "\n" && prevPrev === "\r";

        if (isAtImmediateClosing || isAtUnixLineStart || isAtWindowsLineStart) {
            return scanIndex + 2;
        }

        scanIndex += 1;
    }

    return source.length;
};

type PushToken = (token: Readonly<Token>) => void;

const readQuotedString = (
    source: string,
    length: number,
    startIndex: number,
    quoteChar: string
): number => {
    let scanIndex = startIndex;
    let isEscaped = false;
    while (scanIndex < length) {
        const current = source[scanIndex];
        if (isEscaped) {
            isEscaped = false;
        } else if (current === "`") {
            isEscaped = true;
        } else if (current === quoteChar) {
            if (scanIndex + 1 < length && source[scanIndex + 1] === quoteChar) {
                scanIndex += 2;
                continue;
            }
            scanIndex += 1;
            break;
        } else {
            // Unescaped, non-delimiter character inside quoted literal.
        }
        scanIndex += 1;
    }
    return scanIndex;
};

const classifyWordTokenType = (raw: string): TokenType => {
    const lower = raw.toLowerCase();
    if (setHas(KEYWORDS, lower)) {
        return "keyword";
    }
    if (POWERSHELL_OPERATOR_LOOKUP[lower] === true) {
        return "operator";
    }
    return "identifier";
};

const scanIdentifierBody = (
    length: number,
    startIndex: number,
    readCodePoint: ReadCodePoint
): number => {
    let index = startIndex;
    while (index < length) {
        const peek = readCodePoint(index);
        if (!peek || !UNICODE_IDENTIFIER_CHAR_PATTERN.test(peek.text)) {
            break;
        }
        index += peek.width;
    }
    return index;
};

const scanVariableBody = (
    source: string,
    length: number,
    startIndex: number,
    readCodePoint: ReadCodePoint
): number => {
    let scanIndex = startIndex;
    while (scanIndex < length) {
        const peek = readCodePoint(scanIndex);
        if (!peek) {
            break;
        }

        const currentChar = peek.text;
        if (UNICODE_VAR_CHAR_PATTERN.test(currentChar)) {
            scanIndex += peek.width;
            continue;
        }

        if (currentChar === "{") {
            scanIndex += 1;
            while (scanIndex < length && source[scanIndex] !== "}") {
                scanIndex += 1;
            }
            if (source[scanIndex] === "}") {
                scanIndex += 1;
            }
            continue;
        }

        break;
    }

    return scanIndex;
};

const consumeVariableToken = (
    source: string,
    length: number,
    startPosition: number,
    readCodePoint: ReadCodePoint
): number => {
    let scanIndex = startPosition + 1;

    if (scanIndex < length) {
        const nextChar = source.charAt(scanIndex);
        if (
            arrayIncludes(
                [
                    "$",
                    "?",
                    "^",
                ],
                nextChar
            )
        ) {
            return scanIndex + 1;
        }

        if (nextChar === "_") {
            const afterUnderscore = scanIndex + 1;
            if (afterUnderscore >= length) {
                return scanIndex + 1;
            }
            const peek = readCodePoint(afterUnderscore);
            if (!peek || !UNICODE_VAR_CHAR_PATTERN.test(peek.text)) {
                return scanIndex + 1;
            }
            scanIndex += 1;
        }
    }

    return scanVariableBody(source, length, scanIndex, readCodePoint);
};

const parseHexLiteral = (
    source: string,
    length: number,
    start: number
): number => {
    let scanIndex = start + 2;
    while (
        scanIndex < length &&
        HEX_DIGIT_PATTERN.test(source.charAt(scanIndex))
    ) {
        scanIndex += 1;
    }
    if (
        scanIndex < length &&
        NUMBER_INT_SUFFIX_PATTERN.test(source.charAt(scanIndex))
    ) {
        scanIndex += 1;
    }
    return scanIndex;
};

const parseBinaryLiteral = (
    source: string,
    length: number,
    start: number
): number => {
    let scanIndex = start + 2;
    while (
        scanIndex < length &&
        BINARY_DIGIT_PATTERN.test(source.charAt(scanIndex))
    ) {
        scanIndex += 1;
    }
    if (
        scanIndex < length &&
        NUMBER_INT_SUFFIX_PATTERN.test(source.charAt(scanIndex))
    ) {
        scanIndex += 1;
    }
    return scanIndex;
};

const parseDecimalLiteral = (
    source: string,
    length: number,
    start: number
): number => {
    const parseDecimalDigits = (from: number): number => {
        let index = from;
        while (
            index < length &&
            DECIMAL_DIGIT_PATTERN.test(source.charAt(index))
        ) {
            index += 1;
        }
        return index;
    };

    const parseFraction = (from: number): number => {
        if (
            from + 1 < length &&
            source.charAt(from) === "." &&
            DECIMAL_DIGIT_PATTERN.test(source.charAt(from + 1))
        ) {
            return parseDecimalDigits(from + 2);
        }
        return from;
    };

    const parseExponent = (from: number): number => {
        if (
            from >= length ||
            (source.charAt(from) !== "e" && source.charAt(from) !== "E")
        ) {
            return from;
        }

        let index = from + 1;
        if (
            index < length &&
            (source.charAt(index) === "+" || source.charAt(index) === "-")
        ) {
            index += 1;
        }
        return parseDecimalDigits(index);
    };

    const parseSuffix = (from: number): number => {
        if (from < length && NUMBER_SUFFIX_PATTERN.test(source.charAt(from))) {
            return from + 1;
        }
        return from;
    };

    const withDigits = parseDecimalDigits(start + 1);
    const withFraction = parseFraction(withDigits);
    const withExponent = parseExponent(withFraction);
    return parseSuffix(withExponent);
};

const consumeNumberToken = (
    source: string,
    length: number,
    startPosition: number
): number => {
    const firstChar = source[startPosition];
    const secondChar = source.charAt(startPosition + 1);
    const hasRadixPrefix = firstChar === "0" && startPosition + 1 < length;

    if (hasRadixPrefix && (secondChar === "b" || secondChar === "B")) {
        return parseBinaryLiteral(source, length, startPosition);
    }

    let scanIndex = parseDecimalLiteral(source, length, startPosition);
    if (hasRadixPrefix && arrayIncludes(["X", "x"], secondChar)) {
        scanIndex = parseHexLiteral(source, length, startPosition);
    }

    if (scanIndex + 1 < length) {
        const suffix = source.slice(scanIndex, scanIndex + 2).toUpperCase();
        if (
            arrayIncludes(
                [
                    "GB",
                    "KB",
                    "MB",
                    "PB",
                    "TB",
                ],
                suffix
            )
        ) {
            scanIndex += 2;
        }
    }

    return scanIndex;
};

const consumeNewlineToken = (
    source: string,
    length: number,
    index: number,
    push: PushToken
): null | number => {
    const char = source.charAt(index);
    if (char !== "\r" && char !== "\n") {
        return null;
    }

    if (
        char === "\r" &&
        index + 1 < length &&
        source.charAt(index + 1) === "\n"
    ) {
        const end = index + 2;
        push({ end, start: index, type: "newline", value: "\r\n" });
        return end;
    }

    const end = index + 1;
    push({ end, start: index, type: "newline", value: "\n" });
    return end;
};

const consumeWhitespace = (source: string, index: number): null | number => {
    const char = source.charAt(index);
    if (!isWhitespaceCharacter(char)) {
        return null;
    }
    return index + 1;
};

const consumeBlockCommentToken = (
    source: string,
    length: number,
    index: number,
    push: PushToken
): null | number => {
    if (
        source.charAt(index) !== "<" ||
        index + 1 >= length ||
        source.charAt(index + 1) !== "#"
    ) {
        return null;
    }

    let scanIndex = index + 2;
    while (scanIndex < length) {
        if (
            scanIndex + 1 < length &&
            source[scanIndex] === "#" &&
            source[scanIndex + 1] === ">"
        ) {
            scanIndex += 2;
            break;
        }
        scanIndex += 1;
    }

    const end = Math.min(scanIndex, length);
    push({
        end,
        start: index,
        type: "block-comment",
        value: source.slice(index, end),
    });
    return end;
};

const consumeLineCommentToken = (
    source: string,
    length: number,
    index: number,
    push: PushToken
): null | number => {
    if (source.charAt(index) !== "#") {
        return null;
    }

    let scanIndex = index + 1;
    while (
        scanIndex < length &&
        source[scanIndex] !== "\r" &&
        source[scanIndex] !== "\n"
    ) {
        scanIndex += 1;
    }

    push({
        end: scanIndex,
        start: index,
        type: "comment",
        value: source.slice(index + 1, scanIndex).trimEnd(),
    });
    return scanIndex;
};

const consumeAttributeToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    if (source.charAt(index) !== "[") {
        return null;
    }

    const attributeEnd = readAttributeEnd(source, index);
    if (attributeEnd === null) {
        return null;
    }

    push({
        end: attributeEnd,
        start: index,
        type: "attribute",
        value: source.slice(index, attributeEnd),
    });
    return attributeEnd;
};

const consumeHereStringToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    if (
        source.charAt(index) !== "@" ||
        (source[index + 1] !== '"' && source[index + 1] !== "'")
    ) {
        return null;
    }

    const quoteChar = source[index + 1];
    const quote = quoteChar === '"' ? "double" : "single";
    const end = readHereStringEnd(source, index);
    push({
        end,
        quote,
        start: index,
        type: "heredoc",
        value: source.slice(index, end),
    });
    return end;
};

const consumeQuotedStringToken = (
    source: string,
    length: number,
    index: number,
    push: PushToken
): null | number => {
    const char = source.charAt(index);
    if (char !== "'" && char !== '"') {
        return null;
    }

    const quote = char === '"' ? "double" : "single";
    const end = readQuotedString(source, length, index + 1, char);
    push({
        end,
        quote,
        start: index,
        type: "string",
        value: source.slice(index, end),
    });
    return end;
};

const consumeAtOperatorToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    if (
        source.charAt(index) !== "@" ||
        (source[index + 1] !== "{" && source[index + 1] !== "(")
    ) {
        return null;
    }

    const nextChar = source.charAt(index + 1);
    const end = index + 2;
    push({
        end,
        start: index,
        type: "operator",
        value: `@${nextChar}`,
    });
    return end;
};

const consumeAtIdentifierToken = (
    source: string,
    length: number,
    index: number,
    readCodePoint: ReadCodePoint,
    push: PushToken
): null | number => {
    if (source.charAt(index) !== "@" || index + 1 >= length) {
        return null;
    }

    const nextChar = source.charAt(index + 1);
    if (!UNICODE_IDENTIFIER_START_PATTERN.test(nextChar) && nextChar !== "_") {
        return null;
    }

    const end = scanIdentifierBody(length, index + 2, readCodePoint);
    push({
        end,
        start: index,
        type: "identifier",
        value: source.slice(index, end),
    });
    return end;
};

const consumeColonColonToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    if (source.charAt(index) !== ":" || source[index + 1] !== ":") {
        return null;
    }

    const end = index + 2;
    push({ end, start: index, type: "operator", value: "::" });
    return end;
};

const consumePunctuationToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    const char = source.charAt(index);
    if (!setHas(PUNCTUATION, char)) {
        return null;
    }

    const end = index + 1;
    push({ end, start: index, type: "punctuation", value: char });
    return end;
};

const consumePipeOrEqualsToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    const char = source.charAt(index);
    if (char !== "|" && char !== "=") {
        return null;
    }

    let end = index + 1;
    let value = char;
    if (source.charAt(index + 1) === char) {
        end = index + 2;
        value += char;
    }

    push({ end, start: index, type: "operator", value });
    return end;
};

const consumePipelineChainToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    if (source.charAt(index) !== "&" || source.charAt(index + 1) !== "&") {
        return null;
    }

    const end = index + 2;
    push({ end, start: index, type: "operator", value: "&&" });
    return end;
};

const consumeAngleRedirectionToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    const char = source.charAt(index);
    if (char !== ">" && char !== "<") {
        return null;
    }

    let value = char;
    let end = index + 1;
    if (source.charAt(index + 1) === char) {
        value += char;
        end = index + 2;
    }

    if (
        source.charAt(end) === "&" &&
        MERGED_REDIRECTION_TARGET_PATTERN.test(source.charAt(end + 1))
    ) {
        value += `&${source.charAt(end + 1)}`;
        end += 2;
    }

    push({ end, start: index, type: "operator", value });
    return end;
};

const consumeStreamRedirectionToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    const char = source.charAt(index);
    if (
        !STREAM_REDIRECTION_START_PATTERN.test(char) ||
        source.charAt(index + 1) !== ">"
    ) {
        return null;
    }

    let value = `${char}>`;
    let end = index + 2;
    if (source.charAt(end) === ">") {
        value += ">";
        end += 1;
    }

    if (
        source.charAt(end) === "&" &&
        MERGED_REDIRECTION_TARGET_PATTERN.test(source.charAt(end + 1))
    ) {
        value += `&${source.charAt(end + 1)}`;
        end += 2;
    }

    push({ end, start: index, type: "operator", value });
    return end;
};

const consumeAmpersandToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    if (source.charAt(index) !== "&") {
        return null;
    }

    const end = index + 1;
    push({ end, start: index, type: "operator", value: "&" });
    return end;
};

const consumeMergeRedirectionOneToken = (
    source: string,
    index: number,
    push: PushToken
): null | number => {
    if (
        source.charAt(index) !== "1" ||
        source.charAt(index + 1) !== ">" ||
        source.charAt(index + 2) !== "&" ||
        !MERGED_ONE_REDIRECTION_TARGET_PATTERN.test(source.charAt(index + 3))
    ) {
        return null;
    }

    const end = index + 4;
    const value = `1>&${source.charAt(index + 3)}`;
    push({ end, start: index, type: "operator", value });
    return end;
};

const consumeVariableLexemeToken = (
    source: string,
    length: number,
    index: number,
    readCodePoint: ReadCodePoint,
    push: PushToken
): null | number => {
    if (source.charAt(index) !== "$") {
        return null;
    }

    const end = consumeVariableToken(source, length, index, readCodePoint);
    push({
        end,
        start: index,
        type: "variable",
        value: source.slice(index, end),
    });
    return end;
};

const consumeNumberLexemeToken = (
    source: string,
    length: number,
    index: number,
    push: PushToken
): null | number => {
    if (!DECIMAL_DIGIT_PATTERN.test(source.charAt(index))) {
        return null;
    }

    const end = consumeNumberToken(source, length, index);
    push({
        end,
        start: index,
        type: "number",
        value: source.slice(index, end),
    });
    return end;
};

const consumeStopParsingToken = (
    source: string,
    length: number,
    index: number,
    push: PushToken
): null | number => {
    if (
        source.charAt(index) !== "-" ||
        source.slice(index, index + 3) !== "--%"
    ) {
        return null;
    }

    let end = index + 3;
    while (end < length && source[end] !== "\n" && source[end] !== "\r") {
        end += 1;
    }

    push({
        end,
        start: index,
        type: "operator",
        value: source.slice(index, end),
    });
    return end;
};

const consumeIdentifierToken = (
    source: string,
    length: number,
    index: number,
    readCodePoint: ReadCodePoint,
    push: PushToken
): null | number => {
    const startCodePoint = readCodePoint(index);
    if (
        !startCodePoint ||
        !UNICODE_IDENTIFIER_START_PATTERN.test(startCodePoint.text)
    ) {
        return null;
    }

    const end = scanIdentifierBody(
        length,
        index + startCodePoint.width,
        readCodePoint
    );
    const raw = source.slice(index, end);
    push({ end, start: index, type: classifyWordTokenType(raw), value: raw });
    return end;
};

const consumeDashIdentifierToken = (
    source: string,
    length: number,
    index: number,
    readCodePoint: ReadCodePoint,
    push: PushToken
): null | number => {
    const startCodePoint = readCodePoint(index);
    if (startCodePoint?.text !== "-") {
        return null;
    }

    const afterDash = readCodePoint(index + startCodePoint.width);
    if (
        !afterDash ||
        !UNICODE_IDENTIFIER_AFTER_DASH_PATTERN.test(afterDash.text)
    ) {
        return null;
    }

    const end = scanIdentifierBody(
        length,
        index + startCodePoint.width,
        readCodePoint
    );
    const raw = source.slice(index, end);
    push({ end, start: index, type: classifyWordTokenType(raw), value: raw });
    return end;
};

const consumeUnknownToken = (
    source: string,
    index: number,
    push: PushToken
): number => {
    const end = index + 1;
    push({ end, start: index, type: "unknown", value: source.charAt(index) });
    return end;
};

/**
 * Tokenizes PowerShell source code into an array of tokens.
 *
 * This is the first stage of parsing. It breaks the source into meaningful
 * chunks:
 *
 * - Keywords (if, function, class, etc.)
 * - Operators (-eq, -and, &&, ||, etc.)
 * - Variables ($var, $$, $global:name, etc.)
 * - Numbers (42, 0xFF, 1.5e10, 100MB, etc.)
 * - Strings (single, double, here-strings)
 * - Comments (line comments and block comments)
 * - Punctuation (braces, brackets, commas, and operators)
 *
 * The tokenizer is designed to be resilient - it will tokenize even malformed
 * PowerShell to allow the formatter to work on incomplete code.
 *
 * @param source - The PowerShell source code to tokenize
 *
 * @returns An array of tokens with type, value, and position information
 */
export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    const length = source.length;
    let index = 0;

    const push = (token: Readonly<Token>) => {
        tokens.push(token);
    };

    const readCodePoint = (position: number): CodePointInfo | null =>
        readCodePointAt(source, position);

    while (index < length) {
        index = consumeTokenAt(source, length, index, readCodePoint, push);
    }

    return tokens;
}

function consumeLexemeTokenAt(
    source: string,
    length: number,
    index: number,
    readCodePoint: ReadCodePoint,
    push: PushToken
): null | number {
    return (
        consumeAtIdentifierToken(source, length, index, readCodePoint, push) ??
        consumeVariableLexemeToken(
            source,
            length,
            index,
            readCodePoint,
            push
        ) ??
        consumeNumberLexemeToken(source, length, index, push) ??
        consumeStopParsingToken(source, length, index, push) ??
        consumeIdentifierToken(source, length, index, readCodePoint, push) ??
        consumeDashIdentifierToken(
            source,
            length,
            index,
            readCodePoint,
            push
        ) ??
        null
    );
}

function consumeOperatorTokenAt(
    source: string,
    index: number,
    push: PushToken
): null | number {
    return (
        consumeColonColonToken(source, index, push) ??
        consumePunctuationToken(source, index, push) ??
        consumePipeOrEqualsToken(source, index, push) ??
        consumePipelineChainToken(source, index, push) ??
        consumeAngleRedirectionToken(source, index, push) ??
        consumeStreamRedirectionToken(source, index, push) ??
        consumeAmpersandToken(source, index, push) ??
        consumeMergeRedirectionOneToken(source, index, push) ??
        null
    );
}

function consumeStructuralTokenAt(
    source: string,
    length: number,
    index: number,
    push: PushToken
): null | number {
    return (
        consumeNewlineToken(source, length, index, push) ??
        consumeWhitespace(source, index) ??
        consumeBlockCommentToken(source, length, index, push) ??
        consumeLineCommentToken(source, length, index, push) ??
        consumeAttributeToken(source, index, push) ??
        consumeHereStringToken(source, index, push) ??
        consumeQuotedStringToken(source, length, index, push) ??
        consumeAtOperatorToken(source, index, push) ??
        null
    );
}

function consumeTokenAt(
    source: string,
    length: number,
    index: number,
    readCodePoint: ReadCodePoint,
    push: PushToken
): number {
    return (
        consumeStructuralTokenAt(source, length, index, push) ??
        consumeOperatorTokenAt(source, index, push) ??
        consumeLexemeTokenAt(source, length, index, readCodePoint, push) ??
        consumeUnknownToken(source, index, push)
    );
}
