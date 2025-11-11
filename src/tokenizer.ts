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
    "enum",
    "begin",
    "process",
    "end",
    "dynamicparam",
    "filter",
    "workflow",
    "configuration",
    "inlinescript",
    "parallel",
    "sequence",
    "break",
    "continue",
    "return",
    "throw",
    "exit",
    "trap",
    "data",
    "do",
    "until",
    "default",
]);

// PowerShell operators (case-insensitive)
const POWERSHELL_OPERATORS = new Set([
    // Comparison operators
    "-eq", "-ne", "-gt", "-ge", "-lt", "-le",
    "-like", "-notlike", "-match", "-notmatch",
    "-contains", "-notcontains", "-in", "-notin",
    "-is", "-isnot",
    // Case-sensitive variants
    "-ceq", "-cne", "-cgt", "-cge", "-clt", "-cle",
    "-clike", "-cnotlike", "-cmatch", "-cnotmatch",
    "-ccontains", "-cnotcontains", "-cin", "-cnotin",
    // Case-insensitive explicit variants
    "-ieq", "-ine", "-igt", "-ige", "-ilt", "-ile",
    "-ilike", "-inotlike", "-imatch", "-inotmatch",
    "-icontains", "-inotcontains", "-iin", "-inotin",
    // Logical operators
    "-and", "-or", "-xor", "-not",
    // Bitwise operators
    "-band", "-bor", "-bxor", "-bnot", "-shl", "-shr",
    // String operators
    "-split", "-join", "-replace", "-f",
    // Type operators
    "-as",
    // Other operators
    "-creplace", "-ireplace", "-csplit", "-isplit",
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
// These are defined at module level to avoid recreation in the tokenize loop
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

/**
 * Tokenizes PowerShell source code into an array of tokens.
 *
 * This is the first stage of parsing. It breaks the source into meaningful chunks:
 * - Keywords (if, function, class, etc.)
 * - Operators (-eq, -and, &&, ||, etc.)
 * - Variables ($var, $$, $global:name, etc.)
 * - Numbers (42, 0xFF, 1.5e10, 100MB, etc.)
 * - Strings (single, double, here-strings)
 * - Comments (# line, <# block #>)
 * - Punctuation ({, }, [, ], etc.)
 *
 * The tokenizer is designed to be resilient - it will tokenize even
 * malformed PowerShell to allow the formatter to work on incomplete code.
 *
 * @param source - The PowerShell source code to tokenize
 * @returns An array of tokens with type, value, and position information
 */
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

        // Pipeline chain operators: && and ||
        if (char === "&" && source[index + 1] === "&") {
            index += 2;
            push({ type: "operator", value: "&&", start, end: index });
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
            push({ type: "operator", value, start, end: index });
            continue;
        }

        // Stream redirection operators: 2>, 3>, 4>, 5>, 6>, *>
        if (/[2-6*]/.test(char) && source[index + 1] === ">") {
            let value = char + ">";
            index += 2;
            // Check for >> (append)
            if (source[index] === ">") {
                value += ">";
                index += 1;
            }
            // Check for merging redirection: 2>&1, *>&2, etc.
            if (source[index] === "&" && /[1-6]/.test(source[index + 1])) {
                value += "&" + source[index + 1];
                index += 2;
            }
            push({ type: "operator", value, start, end: index });
            continue;
        }

        // Merging redirection for stream 1: 1>&2
        if (char === "1" && source[index + 1] === ">" && source[index + 2] === "&" && /[2-6]/.test(source[index + 3])) {
            const value = "1>&" + source[index + 3];
            index += 4;
            push({ type: "operator", value, start, end: index });
            continue;
        }

        if (char === "$") {
            index += 1;

            // Special variables: $$, $^, $?, $_
            if (index < length) {
                const nextChar = source[index];
                if (nextChar === "$" || nextChar === "^" || nextChar === "?" || nextChar === "_") {
                    index += 1;
                    push({
                        type: "variable",
                        value: source.slice(start, index),
                        start,
                        end: index,
                    });
                    continue;
                }
            }

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

        // Stop parsing token: --%
        if (char === "-" && source.slice(index, index + 3) === "--%") {
            // Consume everything until end of line as the stop parsing argument
            let endIndex = index + 3;
            while (endIndex < length && source[endIndex] !== "\n" && source[endIndex] !== "\r") {
                endIndex += 1;
            }
            push({
                type: "operator",
                value: source.slice(start, endIndex),
                start,
                end: endIndex,
            });
            index = endIndex;
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
            } else if (POWERSHELL_OPERATORS.has(lower)) {
                push({ type: "operator", value: raw, start, end: index });
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

/**
 * Normalizes a here-string by removing the opening and closing delimiters.
 *
 * PowerShell here-strings have the format:
 * @"
 * content
 * "@
 *
 * or
 *
 * @'
 * content
 * '@
 *
 * This function extracts just the content between the delimiters.
 * If the here-string is too short (malformed), returns it as-is.
 *
 * @param node - The here-string AST node
 * @returns The normalized content without delimiters
 */
export function normalizeHereString(node: HereStringNode): string {
    const lines = node.value.split(/\r?\n/);
    if (lines.length <= 2) {
        return node.value;
    }
    return lines.slice(1, -1).join("\n");
}
