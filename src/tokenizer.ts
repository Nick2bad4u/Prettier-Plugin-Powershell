import type { HereStringNode } from "./ast.js";

export type TokenType =
    | "newline"
    | "identifier"
    | "keyword"
    | "variable"
    | "number"
    | "string"
    | "heredoc"
    | "comment"
    | "block-comment"
    | "attribute"
    | "punctuation"
    | "operator"
    | "unknown";

export interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;
    quote?: "single" | "double";
}

const KEYWORDS = new Set([
    "function",
    "if",
    "elseif",
    "else",
    "for",
    "foreach",
    "while",
    "switch",
    "try",
    "catch",
    "finally",
    "param",
    "class",
]);

const PUNCTUATION = new Set([
    "{",
    "}",
    "(",
    ")",
    "[",
    "]",
    ",",
    ";",
    ".",
    ":",
]);

// Cached regex patterns for performance
const WHITESPACE_PATTERN = /\s/;
const IDENTIFIER_START_PATTERN = /[A-Za-z_]/;
const UNICODE_VAR_CHAR_PATTERN = /^[\p{L}\p{N}_:-]$/u;
const HEX_DIGIT_PATTERN = /[0-9A-Fa-f]/;
const BINARY_DIGIT_PATTERN = /[01]/;
const DECIMAL_DIGIT_PATTERN = /[0-9]/;
const NUMBER_SUFFIX_PATTERN = /[dDfFlL]/;
const UNICODE_IDENTIFIER_START_PATTERN = /[\p{L}_]/u;
const UNICODE_IDENTIFIER_CHAR_PATTERN = /[\p{L}\p{N}_-]/u;
const UNICODE_IDENTIFIER_AFTER_DASH_PATTERN = /[-\p{L}]/u;

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    const length = source.length;
    let index = 0;

    const push = (token: Token) => {
        tokens.push(token);
    };

    while (index < length) {
        const char = source[index];
        const start = index;

        if (char === "\r" || char === "\n") {
            if (char === "\r" && source[index + 1] === "\n") {
                index += 2;
                push({ type: "newline", value: "\r\n", start, end: index });
            } else {
                index += 1;
                push({ type: "newline", value: "\n", start, end: index });
            }
            continue;
        }

        if (char === " " || char === "\t" || char === "\f") {
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
            const end = scanIndex >= length ? length : scanIndex;
            push({
                type: "block-comment",
                value: source.slice(start, end),
                start,
                end,
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
                type: "comment",
                value: source.slice(start + 1, index).trimEnd(),
                start,
                end: index,
            });
            continue;
        }

        if (char === "[") {
            let lookahead = index + 1;
            while (lookahead < length && WHITESPACE_PATTERN.test(source[lookahead])) {
                lookahead += 1;
            }
            if (lookahead < length && IDENTIFIER_START_PATTERN.test(source[lookahead])) {
                let depth = 1;
                let scanIndex = index + 1;
                while (scanIndex < length && depth > 0) {
                    const current = source[scanIndex];
                    if (current === "'" || current === '"') {
                        const quote = current;
                        scanIndex += 1;
                        while (scanIndex < length) {
                            const currentChar = source[scanIndex];
                            if (currentChar === "`") {
                                // Only advance by 2 if there is a character after the backtick
                                if (scanIndex + 1 < length) {
                                    scanIndex += 2;
                                } else {
                                    // Backtick is the last character, advance by 1 and exit loop
                                    scanIndex += 1;
                                    break;
                                }
                                continue;
                            }
                            if (currentChar === quote) {
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
                        if (depth === 0) {
                            break;
                        }
                        continue;
                    }
                    scanIndex += 1;
                }
                const attributeEnd = depth === 0 ? scanIndex : length;
                push({
                    type: "attribute",
                    value: source.slice(start, attributeEnd),
                    start,
                    end: attributeEnd,
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
            let scanIndex = index + 2;
            let closing = -1;
            while (scanIndex < length) {
                if (
                    scanIndex + 1 < length &&
                    source[scanIndex] === quoteChar &&
                    source[scanIndex + 1] === "@"
                ) {
                    const prevChar = source[scanIndex - 1];
                    const prevPrev = source[scanIndex - 2];
                    const atImmediateClosing = scanIndex === index + 2;
                    const atUnixLineStart = prevChar === "\n";
                    const atWindowsLineStart =
                        prevChar === "\n" && prevPrev === "\r";
                    if (
                        atImmediateClosing ||
                        atUnixLineStart ||
                        atWindowsLineStart
                    ) {
                        closing = scanIndex;
                        break;
                    }
                }
                scanIndex += 1;
            }

            let end = length;
            /* c8 ignore next */
            if (closing !== -1) {
                end = closing + 2;
            }

            push({
                type: "heredoc",
                value: source.slice(index, end),
                start,
                end,
                quote,
            });
            index = end;
            continue;
        }

        if (char === "'" || char === '"') {
            const quote = char === '"' ? "double" : "single";
            index += 1;
            let escaped = false;
            while (index < length) {
                const current = source[index];
                if (escaped) {
                    escaped = false;
                } else if (current === "`") {
                    escaped = true;
                } else if (current === char) {
                    index += 1;
                    break;
                }
                index += 1;
            }
            push({
                type: "string",
                value: source.slice(start, index),
                start,
                end: index,
                quote,
            });
            continue;
        }

        if (
            char === "@" &&
            (source[index + 1] === "{" || source[index + 1] === "(")
        ) {
            const value = `@${source[index + 1]}`;
            index += 2;
            push({ type: "operator", value, start, end: index });
            continue;
        }

        if (char === ":" && source[index + 1] === ":") {
            index += 2;
            push({ type: "operator", value: "::", start, end: index });
            continue;
        }

        if (PUNCTUATION.has(char)) {
            index += 1;
            push({ type: "punctuation", value: char, start, end: index });
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
            push({ type: "operator", value, start, end: index });
            continue;
        }

        if (char === ">" || char === "<") {
            let value = char;
            if (source[index + 1] === char) {
                value += char;
                index += 2;
            } else {
                index += 1;
            }
            push({ type: "operator", value, start, end: index });
            continue;
        }

        if (char === "$") {
            index += 1;
            while (index < length) {
                const currentChar = source[index];
                // PowerShell supports Unicode variable names
                // Match Unicode letters, numbers, underscore, colon, and hyphen
                if (UNICODE_VAR_CHAR_PATTERN.test(currentChar)) {
                    index += 1;
                    continue;
                }
                if (currentChar === "{") {
                    index += 1;
                    while (index < length && source[index] !== "}") {
                        index += 1;
                    }
                    if (source[index] === "}") {
                        index += 1;
                    }
                    continue;
                }
                break;
            }
            push({
                type: "variable",
                value: source.slice(start, index),
                start,
                end: index,
            });
            continue;
        }

        if (/[0-9]/.test(char)) {
            index += 1;

            // Check for hex number (0x...)
            if (
                char === "0" &&
                index < length &&
                (source[index] === "x" || source[index] === "X")
            ) {
                index += 1; // consume 'x' or 'X'
                while (index < length && HEX_DIGIT_PATTERN.test(source[index])) {
                    index += 1;
                }
                // Check for long suffix (L or l)
                if (index < length && (source[index] === "L" || source[index] === "l")) {
                    index += 1;
                }
                // Check for multiplier suffixes (KB, MB, GB, TB, PB)
                if (index + 1 < length) {
                    const suffix = source.slice(index, index + 2).toUpperCase();
                    if (["KB", "MB", "GB", "TB", "PB"].includes(suffix)) {
                        index += 2;
                    }
                }
                push({
                    type: "number",
                    value: source.slice(start, index),
                    start,
                    end: index,
                });
                continue;
            }

            // Check for binary number (0b...)
            if (
                char === "0" &&
                index < length &&
                (source[index] === "b" || source[index] === "B")
            ) {
                index += 1; // consume 'b' or 'B'
                while (index < length && BINARY_DIGIT_PATTERN.test(source[index])) {
                    index += 1;
                }
                push({
                    type: "number",
                    value: source.slice(start, index),
                    start,
                    end: index,
                });
                continue;
            }

            // Regular decimal number
            while (index < length && DECIMAL_DIGIT_PATTERN.test(source[index])) {
                index += 1;
            }

            // Check for decimal point
            if (index + 1 < length && source[index] === "." && DECIMAL_DIGIT_PATTERN.test(source[index + 1])) {
                index += 2;
                while (index < length && DECIMAL_DIGIT_PATTERN.test(source[index])) {
                    index += 1;
                }
            }

            // Check for scientific notation (e or E)
            if (index < length && (source[index] === "e" || source[index] === "E")) {
                index += 1;
                // Optional sign
                if (index < length && (source[index] === "+" || source[index] === "-")) {
                    index += 1;
                }
                // Exponent digits
                while (index < length && DECIMAL_DIGIT_PATTERN.test(source[index])) {
                    index += 1;
                }
            }

            // Check for type suffixes (d/D for decimal, f/F for float, l/L for long)
            if (index < length && NUMBER_SUFFIX_PATTERN.test(source[index])) {
                index += 1;
            }

            // Check for multiplier suffixes (KB, MB, GB, TB, PB)
            if (index + 1 < length) {
                const suffix = source.slice(index, index + 2).toUpperCase();
                if (["KB", "MB", "GB", "TB", "PB"].includes(suffix)) {
                    index += 2;
                }
            }

            push({
                type: "number",
                value: source.slice(start, index),
                start,
                end: index,
            });
            continue;
        }

        if (
            UNICODE_IDENTIFIER_START_PATTERN.test(char) ||
            (char === "-" &&
                index + 1 < length &&
                UNICODE_IDENTIFIER_AFTER_DASH_PATTERN.test(source[index + 1]))
        ) {
            index += 1;
            while (index < length && UNICODE_IDENTIFIER_CHAR_PATTERN.test(source[index])) {
                index += 1;
            }
            const raw = source.slice(start, index);
            const lower = raw.toLowerCase();
            if (KEYWORDS.has(lower)) {
                push({ type: "keyword", value: raw, start, end: index });
            } else {
                push({ type: "identifier", value: raw, start, end: index });
            }
            continue;
        }

        // fallback single character token
        index += 1;
        push({ type: "unknown", value: char, start, end: index });
    }

    return tokens;
}

export function normalizeHereString(node: HereStringNode): string {
    const lines = node.value.split(/\r?\n/);
    if (lines.length <= 2) {
        return node.value;
    }
    return lines.slice(1, -1).join("\n");
}
