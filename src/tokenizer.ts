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

// Cached regex patterns for performance
// These are defined at module level to avoid recreation in the tokenize loop
const WHITESPACE_PATTERN = /\s/u;
const IDENTIFIER_START_PATTERN = /\p{L}|_/u;
const UNICODE_VAR_CHAR_PATTERN = /^[\p{L}\p{N}\-:_]$/u;
const HEX_DIGIT_PATTERN = /[\da-f]/i;
const BINARY_DIGIT_PATTERN = /[01]/;
const DECIMAL_DIGIT_PATTERN = /\d/;
const NUMBER_SUFFIX_PATTERN = /[dflu]/i;
const UNICODE_IDENTIFIER_START_PATTERN = /[\p{L}_]/u;
const UNICODE_IDENTIFIER_CHAR_PATTERN = /[\p{L}\p{N}\-_]/u;
const UNICODE_IDENTIFIER_AFTER_DASH_PATTERN = /[\p{L}-]/u;

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
export function normalizeHereString(node: HereStringNode): string {
    const lines = node.value.split(/\r?\n/);
    if (lines.length <= 2) {
        return node.value;
    }
    return lines.slice(1, -1).join("\n");
}

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

    const push = (token: Token) => {
        tokens.push(token);
    };

    const readCodePoint = (
        position: number
    ): null | { codePoint: number; text: string; width: number } => {
        const codePoint = source.codePointAt(position);
        if (codePoint === undefined) {
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
            case "\u00A0":
            case "\uFEFF":
            case "\u200B":
            case "\u2060": {
                return true;
            }
            default: {
                return false;
            }
        }
    };

    const consumeVariableToken = (startPosition: number): number => {
        let scanIndex = startPosition + 1;

        if (scanIndex < length) {
            const nextChar = source[scanIndex];
            if (nextChar === "$" || nextChar === "^" || nextChar === "?") {
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

    const consumeNumberToken = (startPosition: number): number => {
        let scanIndex = startPosition + 1;
        const firstChar = source[startPosition];

        if (
            firstChar === "0" &&
            scanIndex < length &&
            (source[scanIndex] === "x" || source[scanIndex] === "X")
        ) {
            scanIndex += 1;
            while (
                scanIndex < length &&
                HEX_DIGIT_PATTERN.test(source[scanIndex])
            ) {
                scanIndex += 1;
            }
            if (scanIndex < length && /[lu]/i.test(source[scanIndex])) {
                scanIndex += 1;
            }
        } else if (
            firstChar === "0" &&
            scanIndex < length &&
            (source[scanIndex] === "b" || source[scanIndex] === "B")
        ) {
            scanIndex += 1;
            while (
                scanIndex < length &&
                BINARY_DIGIT_PATTERN.test(source[scanIndex])
            ) {
                scanIndex += 1;
            }
            if (scanIndex < length && /[lu]/i.test(source[scanIndex])) {
                scanIndex += 1;
            }
            return scanIndex;
        } else {
            while (
                scanIndex < length &&
                DECIMAL_DIGIT_PATTERN.test(source[scanIndex])
            ) {
                scanIndex += 1;
            }

            if (
                scanIndex + 1 < length &&
                source[scanIndex] === "." &&
                DECIMAL_DIGIT_PATTERN.test(source[scanIndex + 1])
            ) {
                scanIndex += 2;
                while (
                    scanIndex < length &&
                    DECIMAL_DIGIT_PATTERN.test(source[scanIndex])
                ) {
                    scanIndex += 1;
                }
            }

            if (
                scanIndex < length &&
                (source[scanIndex] === "e" || source[scanIndex] === "E")
            ) {
                scanIndex += 1;
                if (
                    scanIndex < length &&
                    (source[scanIndex] === "+" || source[scanIndex] === "-")
                ) {
                    scanIndex += 1;
                }
                while (
                    scanIndex < length &&
                    DECIMAL_DIGIT_PATTERN.test(source[scanIndex])
                ) {
                    scanIndex += 1;
                }
            }

            if (
                scanIndex < length &&
                NUMBER_SUFFIX_PATTERN.test(source[scanIndex])
            ) {
                scanIndex += 1;
            }
        }

        if (scanIndex + 1 < length) {
            const suffix = source.slice(scanIndex, scanIndex + 2).toUpperCase();
            if (
                [
                    "GB",
                    "KB",
                    "MB",
                    "PB",
                    "TB",
                ].includes(suffix)
            ) {
                scanIndex += 2;
            }
        }

        return scanIndex;
    };

    const readQuotedString = (
        startIndex: number,
        quoteChar: string
    ): number => {
        let scanIndex = startIndex;
        let escaped = false;
        while (scanIndex < length) {
            const current = source[scanIndex];
            if (escaped) {
                escaped = false;
            } else if (current === "`") {
                escaped = true;
            } else if (current === quoteChar) {
                if (
                    scanIndex + 1 < length &&
                    source[scanIndex + 1] === quoteChar
                ) {
                    scanIndex += 2;
                    continue;
                }
                scanIndex += 1;
                break;
            }
            scanIndex += 1;
        }
        return scanIndex;
    };

    while (index < length) {
        const char = source[index];
        const start = index;

        if (char === "\r" || char === "\n") {
            if (char === "\r" && source[index + 1] === "\n") {
                index += 2;
                push({ end: index, start, type: "newline", value: "\r\n" });
            } else {
                index += 1;
                push({ end: index, start, type: "newline", value: "\n" });
            }
            continue;
        }

        if (isWhitespaceCharacter(char)) {
            index += 1;
            continue;
        }

        if (char === "<" && index + 1 < length && source[index + 1] === "#") {
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
                start,
                type: "block-comment",
                value: source.slice(start, end),
            });
            index = end;
            continue;
        }

        if (char === "#") {
            index += 1;
            while (
                index < length &&
                source[index] !== "\r" &&
                source[index] !== "\n"
            ) {
                index += 1;
            }
            push({
                end: index,
                start,
                type: "comment",
                value: source.slice(start + 1, index).trimEnd(),
            });
            continue;
        }

        if (char === "[") {
            const attributeEnd = readAttributeEnd(source, index);
            if (attributeEnd !== null) {
                push({
                    end: attributeEnd,
                    start,
                    type: "attribute",
                    value: source.slice(start, attributeEnd),
                });
                index = attributeEnd;
                continue;
            }
        }

        if (
            char === "@" &&
            (source[index + 1] === '"' || source[index + 1] === "'")
        ) {
            const quoteChar = source[index + 1];
            const quote = quoteChar === '"' ? "double" : "single";
            const end = readHereStringEnd(source, index);

            push({
                end,
                quote,
                start,
                type: "heredoc",
                value: source.slice(index, end),
            });
            index = end;
            continue;
        }

        if (char === "'" || char === '"') {
            const quote = char === '"' ? "double" : "single";
            index = readQuotedString(index + 1, char);
            push({
                end: index,
                quote,
                start,
                type: "string",
                value: source.slice(start, index),
            });
            continue;
        }

        if (
            char === "@" &&
            (source[index + 1] === "{" || source[index + 1] === "(")
        ) {
            const value = `@${source[index + 1]}`;
            index += 2;
            push({ end: index, start, type: "operator", value });
            continue;
        }

        if (
            char === "@" &&
            index + 1 < length &&
            (UNICODE_IDENTIFIER_START_PATTERN.test(source[index + 1]) ||
                source[index + 1] === "_")
        ) {
            let scanIndex = index + 2;
            while (scanIndex < length) {
                const peek = readCodePoint(scanIndex);
                if (!peek) {
                    break;
                }
                if (!UNICODE_IDENTIFIER_CHAR_PATTERN.test(peek.text)) {
                    break;
                }
                scanIndex += peek.width;
            }
            push({
                end: scanIndex,
                start,
                type: "identifier",
                value: source.slice(start, scanIndex),
            });
            index = scanIndex;
            continue;
        }

        if (char === ":" && source[index + 1] === ":") {
            index += 2;
            push({ end: index, start, type: "operator", value: "::" });
            continue;
        }

        if (PUNCTUATION.has(char)) {
            index += 1;
            push({ end: index, start, type: "punctuation", value: char });
            continue;
        }

        if (char === "|" || char === "=") {
            let value = char;
            if (source[index + 1] === char) {
                value += char;
                index += 2;
            } else {
                index += 1;
            }
            push({ end: index, start, type: "operator", value });
            continue;
        }

        // Pipeline chain operators: && and ||
        if (char === "&" && source[index + 1] === "&") {
            index += 2;
            push({ end: index, start, type: "operator", value: "&&" });
            continue;
        }

        // Redirection operators: >, >>, <, 2>, 2>>, 3>, etc.
        if (char === ">" || char === "<") {
            let value = char;
            if (source[index + 1] === char) {
                value += char;
                index += 2;
            } else {
                index += 1;
            }
            if (
                source[index] === "&" &&
                /[1-6]/.test(source[index + 1] ?? "")
            ) {
                value += `&${source[index + 1]}`;
                index += 2;
            }
            push({ end: index, start, type: "operator", value });
            continue;
        }

        // Stream redirection operators: 2>, 3>, 4>, 5>, 6>, *>
        if (/[*2-6]/.test(char) && source[index + 1] === ">") {
            let value = `${char}>`;
            index += 2;
            // Check for >> (append)
            if (source[index] === ">") {
                value += ">";
                index += 1;
            }
            // Check for merging redirection: 2>&1, *>&2, etc.
            if (source[index] === "&" && /[1-6]/.test(source[index + 1])) {
                value += `&${source[index + 1]}`;
                index += 2;
            }
            push({ end: index, start, type: "operator", value });
            continue;
        }

        if (char === "&") {
            index += 1;
            push({ end: index, start, type: "operator", value: "&" });
            continue;
        }

        // Merging redirection for stream 1: 1>&2
        if (
            char === "1" &&
            source[index + 1] === ">" &&
            source[index + 2] === "&" &&
            /[2-6]/.test(source[index + 3])
        ) {
            const value = `1>&${source[index + 3]}`;
            index += 4;
            push({ end: index, start, type: "operator", value });
            continue;
        }

        if (char === "$") {
            index = consumeVariableToken(start);
            push({
                end: index,
                start,
                type: "variable",
                value: source.slice(start, index),
            });
            continue;
        }

        if (/\d/.test(char)) {
            index = consumeNumberToken(start);
            push({
                end: index,
                start,
                type: "number",
                value: source.slice(start, index),
            });
            continue;
        }

        // Stop parsing token: --%
        if (char === "-" && source.slice(index, index + 3) === "--%") {
            // Consume everything until end of line as the stop parsing argument
            let endIndex = index + 3;
            while (
                endIndex < length &&
                source[endIndex] !== "\n" &&
                source[endIndex] !== "\r"
            ) {
                endIndex += 1;
            }
            push({
                end: endIndex,
                start,
                type: "operator",
                value: source.slice(start, endIndex),
            });
            index = endIndex;
            continue;
        }

        const startCodePoint = readCodePoint(index);
        if (
            startCodePoint &&
            UNICODE_IDENTIFIER_START_PATTERN.test(startCodePoint.text)
        ) {
            index += startCodePoint.width;
            while (index < length) {
                const peek = readCodePoint(index);
                if (!peek || !UNICODE_IDENTIFIER_CHAR_PATTERN.test(peek.text)) {
                    break;
                }
                index += peek.width;
            }
            const raw = source.slice(start, index);
            const lower = raw.toLowerCase();
            if (KEYWORDS.has(lower)) {
                push({ end: index, start, type: "keyword", value: raw });
            } else if (POWERSHELL_OPERATORS.has(lower)) {
                push({ end: index, start, type: "operator", value: raw });
            } else {
                push({ end: index, start, type: "identifier", value: raw });
            }
            continue;
        }

        if (startCodePoint?.text === "-") {
            const afterDash = readCodePoint(index + startCodePoint.width);
            if (
                afterDash &&
                UNICODE_IDENTIFIER_AFTER_DASH_PATTERN.test(afterDash.text)
            ) {
                index += startCodePoint.width;
                while (index < length) {
                    const peek = readCodePoint(index);
                    if (
                        !peek ||
                        !UNICODE_IDENTIFIER_CHAR_PATTERN.test(peek.text)
                    ) {
                        break;
                    }
                    index += peek.width;
                }
                const raw = source.slice(start, index);
                const lower = raw.toLowerCase();
                if (KEYWORDS.has(lower)) {
                    push({ end: index, start, type: "keyword", value: raw });
                } else if (POWERSHELL_OPERATORS.has(lower)) {
                    push({ end: index, start, type: "operator", value: raw });
                } else {
                    push({ end: index, start, type: "identifier", value: raw });
                }
                continue;
            }
        }

        // Fallback single character token
        index += 1;
        push({ end: index, start, type: "unknown", value: char });
    }

    return tokens;
}

function readAttributeEnd(source: string, startIndex: number): null | number {
    let lookahead = startIndex + 1;
    while (
        lookahead < source.length &&
        WHITESPACE_PATTERN.test(source[lookahead])
    ) {
        lookahead += 1;
    }

    if (
        lookahead >= source.length ||
        !IDENTIFIER_START_PATTERN.test(source[lookahead])
    ) {
        return null;
    }

    let depth = 1;
    let scanIndex = startIndex + 1;
    while (scanIndex < source.length && depth > 0) {
        const current = source[scanIndex];
        if (current === "'" || current === '"') {
            scanIndex += 1;
            while (scanIndex < source.length) {
                const quotedChar = source[scanIndex];
                if (quotedChar === "`") {
                    scanIndex += scanIndex + 1 < source.length ? 2 : 1;
                    continue;
                }
                if (quotedChar === current) {
                    scanIndex += 1;
                    break;
                }
                scanIndex += 1;
            }
            continue;
        }
        if (current === "[") {
            depth += 1;
            scanIndex += 1;
            continue;
        }
        if (current === "]") {
            depth -= 1;
            scanIndex += 1;
            continue;
        }
        scanIndex += 1;
    }

    return depth === 0 ? scanIndex : source.length;
}

function readHereStringEnd(source: string, startIndex: number): number {
    const quoteChar = source[startIndex + 1];
    let scanIndex = startIndex + 2;

    while (scanIndex < source.length) {
        const maybeClosing =
            scanIndex + 1 < source.length &&
            source[scanIndex] === quoteChar &&
            source[scanIndex + 1] === "@";

        if (!maybeClosing) {
            scanIndex += 1;
            continue;
        }

        const prevChar = source[scanIndex - 1];
        const prevPrev = source[scanIndex - 2];
        const atImmediateClosing = scanIndex === startIndex + 2;
        const atUnixLineStart = prevChar === "\n";
        const atWindowsLineStart = prevChar === "\n" && prevPrev === "\r";

        if (atImmediateClosing || atUnixLineStart || atWindowsLineStart) {
            return scanIndex + 2;
        }

        scanIndex += 1;
    }

    return source.length;
}
