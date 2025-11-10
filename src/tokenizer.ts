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
            let searchIndex = index + 2;
            while (searchIndex < length - 1) {
                if (
                    source[searchIndex] === "#" &&
                    source[searchIndex + 1] === ">"
                ) {
                    searchIndex += 2;
                    break;
                }
                searchIndex += 1;
            }
            const end = searchIndex >= length ? length : searchIndex;
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
            while (lookahead < length && /\s/.test(source[lookahead])) {
                lookahead += 1;
            }
            if (lookahead < length && /[A-Za-z_]/.test(source[lookahead])) {
                let depth = 1;
                let searchIndex = index + 1;
                while (searchIndex < length && depth > 0) {
                    const current = source[searchIndex];
                    if (current === "'" || current === '"') {
                        const quote = current;
                        searchIndex += 1;
                        while (searchIndex < length) {
                            const ch = source[searchIndex];
                            if (ch === "`") {
                                searchIndex += 2;
                                continue;
                            }
                            if (ch === quote) {
                                searchIndex += 1;
                                break;
                            }
                            searchIndex += 1;
                        }
                        continue;
                    }
                    if (current === "[") {
                        depth += 1;
                        searchIndex += 1;
                        continue;
                    }
                    if (current === "]") {
                        depth -= 1;
                        searchIndex += 1;
                        if (depth === 0) {
                            break;
                        }
                        continue;
                    }
                    searchIndex += 1;
                }
                const attributeEnd = depth === 0 ? searchIndex : length;
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
            let searchIndex = index + 2;
            let closing = -1;
            while (searchIndex < length - 1) {
                if (
                    source[searchIndex] === quoteChar &&
                    source[searchIndex + 1] === "@"
                ) {
                    const prevChar = source[searchIndex - 1];
                    const prevPrev = source[searchIndex - 2];
                    const atImmediateClosing = searchIndex === index + 2;
                    const atUnixLineStart = prevChar === "\n";
                    const atWindowsLineStart =
                        prevChar === "\r" && prevPrev === "\n";
                    if (
                        atImmediateClosing ||
                        atUnixLineStart ||
                        atWindowsLineStart
                    ) {
                        closing = searchIndex;
                        break;
                    }
                }
                searchIndex += 1;
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
                const c = source[index];
                if (/^[A-Za-z0-9_:-]$/.test(c)) {
                    index += 1;
                    continue;
                }
                if (c === "{") {
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
            while (index < length && /[0-9]/.test(source[index])) {
                index += 1;
            }
            if (source[index] === "." && /[0-9]/.test(source[index + 1])) {
                index += 2;
                while (index < length && /[0-9]/.test(source[index])) {
                    index += 1;
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
            /[A-Za-z_]/.test(char) ||
            (char === "-" &&
                index + 1 < length &&
                /[-A-Za-z]/.test(source[index + 1]))
        ) {
            index += 1;
            while (index < length && /[A-Za-z0-9_-]/.test(source[index])) {
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
