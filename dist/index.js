import { doc } from 'prettier';

// src/options.ts
var pluginOptions = {
  powershellIndentStyle: {
    category: "PowerShell",
    type: "choice",
    default: "spaces",
    description: "Indent PowerShell code using spaces or tabs.",
    choices: [
      { value: "spaces", description: "Use spaces for indentation." },
      { value: "tabs", description: "Use tabs for indentation." }
    ]
  },
  powershellIndentSize: {
    category: "PowerShell",
    type: "int",
    default: 2,
    description: "Number of indentation characters for each level.",
    range: { start: 1, end: 8, step: 1 }
  },
  powershellTrailingComma: {
    category: "PowerShell",
    type: "choice",
    default: "multiline",
    description: "Control trailing commas for array and hashtable literals.",
    choices: [
      {
        value: "none",
        description: "Never add a trailing comma or semicolon."
      },
      {
        value: "multiline",
        description: "Add trailing comma/semicolon when the literal spans multiple lines."
      },
      {
        value: "all",
        description: "Always add trailing comma/semicolon when possible."
      }
    ]
  },
  powershellSortHashtableKeys: {
    category: "PowerShell",
    type: "boolean",
    default: false,
    description: "Sort hashtable keys alphabetically when formatting."
  },
  powershellBlankLinesBetweenFunctions: {
    category: "PowerShell",
    type: "int",
    default: 1,
    description: "Number of blank lines to ensure between function declarations.",
    range: { start: 0, end: 3, step: 1 }
  },
  powershellBlankLineAfterParam: {
    category: "PowerShell",
    type: "boolean",
    default: true,
    description: "Insert a blank line after param(...) blocks inside script blocks."
  },
  powershellBraceStyle: {
    category: "PowerShell",
    type: "choice",
    default: "1tbs",
    description: "Control placement of opening braces for script blocks and functions.",
    choices: [
      {
        value: "1tbs",
        description: "One True Brace Style \u2013 keep opening braces on the same line."
      },
      {
        value: "allman",
        description: "Allman style \u2013 place opening braces on the next line."
      }
    ]
  },
  powershellLineWidth: {
    category: "PowerShell",
    type: "int",
    default: 120,
    description: "Maximum preferred line width for PowerShell documents.",
    range: { start: 40, end: 200, step: 1 }
  },
  powershellPreferSingleQuote: {
    category: "PowerShell",
    type: "boolean",
    default: false,
    description: "Prefer single-quoted strings when no interpolation is required."
  },
  powershellKeywordCase: {
    category: "PowerShell",
    type: "choice",
    default: "preserve",
    description: "Normalise the casing of PowerShell keywords.",
    choices: [
      {
        value: "preserve",
        description: "Leave keyword casing unchanged."
      },
      { value: "lower", description: "Convert keywords to lower-case." },
      { value: "upper", description: "Convert keywords to upper-case." },
      {
        value: "pascal",
        description: "Capitalise keywords (PascalCase)."
      }
    ]
  },
  powershellRewriteAliases: {
    category: "PowerShell",
    type: "boolean",
    default: false,
    description: "Rewrite common cmdlet aliases to their canonical names."
  },
  powershellRewriteWriteHost: {
    category: "PowerShell",
    type: "boolean",
    default: false,
    description: "Rewrite Write-Host invocations to Write-Output to discourage host-only output."
  }
};
var defaultOptions = {
  tabWidth: 2
};
function resolveOptions(options) {
  const indentStyle = options.powershellIndentStyle ?? "spaces";
  const rawIndentOverride = options.powershellIndentSize;
  const normalizedIndentOverride = Number(rawIndentOverride);
  const normalizedTabWidth = Number(options.tabWidth);
  const indentSize = Number.isFinite(normalizedIndentOverride) && normalizedIndentOverride > 0 ? Math.floor(normalizedIndentOverride) : Number.isFinite(normalizedTabWidth) && normalizedTabWidth > 0 ? Math.floor(normalizedTabWidth) : 2;
  if (indentStyle === "tabs") {
    options.useTabs = true;
  } else {
    options.useTabs = false;
  }
  options.tabWidth = indentSize;
  const trailingComma = options.powershellTrailingComma ?? "multiline";
  const sortHashtableKeys = Boolean(options.powershellSortHashtableKeys);
  const rawBlankLines = Number(
    options.powershellBlankLinesBetweenFunctions ?? 1
  );
  const normalizedBlankLines = Number.isFinite(rawBlankLines) ? rawBlankLines : 1;
  const blankLinesBetweenFunctions = Math.max(
    0,
    Math.min(3, Math.floor(normalizedBlankLines))
  );
  let blankLineAfterParam = true;
  if (options.powershellBlankLineAfterParam === false) {
    blankLineAfterParam = false;
  }
  const braceStyle = options.powershellBraceStyle ?? "1tbs";
  const lineWidth = Math.max(
    40,
    Math.min(200, Number(options.powershellLineWidth ?? 120))
  );
  const preferSingleQuote = options.powershellPreferSingleQuote === true;
  const keywordCase = options.powershellKeywordCase ?? "preserve";
  const rewriteAliases = options.powershellRewriteAliases === true;
  const rewriteWriteHost = options.powershellRewriteWriteHost === true;
  if (!options.printWidth || options.printWidth > lineWidth) {
    options.printWidth = lineWidth;
  }
  return {
    indentStyle,
    indentSize,
    trailingComma,
    sortHashtableKeys,
    blankLinesBetweenFunctions,
    blankLineAfterParam,
    braceStyle,
    lineWidth,
    preferSingleQuote,
    keywordCase,
    rewriteAliases,
    rewriteWriteHost
  };
}

// src/tokenizer.ts
var KEYWORDS = /* @__PURE__ */ new Set([
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
  "default"
]);
var POWERSHELL_OPERATORS = /* @__PURE__ */ new Set([
  // Comparison operators
  "-eq",
  "-ne",
  "-gt",
  "-ge",
  "-lt",
  "-le",
  "-like",
  "-notlike",
  "-match",
  "-notmatch",
  "-contains",
  "-notcontains",
  "-in",
  "-notin",
  "-is",
  "-isnot",
  // Case-sensitive variants
  "-ceq",
  "-cne",
  "-cgt",
  "-cge",
  "-clt",
  "-cle",
  "-clike",
  "-cnotlike",
  "-cmatch",
  "-cnotmatch",
  "-ccontains",
  "-cnotcontains",
  "-cin",
  "-cnotin",
  // Case-insensitive explicit variants
  "-ieq",
  "-ine",
  "-igt",
  "-ige",
  "-ilt",
  "-ile",
  "-ilike",
  "-inotlike",
  "-imatch",
  "-inotmatch",
  "-icontains",
  "-inotcontains",
  "-iin",
  "-inotin",
  // Logical operators
  "-and",
  "-or",
  "-xor",
  "-not",
  // Bitwise operators
  "-band",
  "-bor",
  "-bxor",
  "-bnot",
  "-shl",
  "-shr",
  // String operators
  "-split",
  "-join",
  "-replace",
  "-f",
  // Type operators
  "-as",
  // Other operators
  "-creplace",
  "-ireplace",
  "-csplit",
  "-isplit"
]);
var PUNCTUATION = /* @__PURE__ */ new Set([
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ",",
  ";",
  ".",
  ":"
]);
var WHITESPACE_PATTERN = /[\s\u00A0\u200B\u2060\uFEFF]/;
var IDENTIFIER_START_PATTERN = /[A-Za-z_]/;
var UNICODE_VAR_CHAR_PATTERN = /^[\p{L}\p{N}_:-]$/u;
var HEX_DIGIT_PATTERN = /[0-9A-Fa-f]/;
var BINARY_DIGIT_PATTERN = /[01]/;
var DECIMAL_DIGIT_PATTERN = /[0-9]/;
var NUMBER_SUFFIX_PATTERN = /[dDfFlLuU]/;
var UNICODE_IDENTIFIER_START_PATTERN = /[\p{L}_]/u;
var UNICODE_IDENTIFIER_CHAR_PATTERN = /[\p{L}\p{N}_-]/u;
var UNICODE_IDENTIFIER_AFTER_DASH_PATTERN = /[-\p{L}]/u;
function tokenize(source) {
  const tokens = [];
  const length = source.length;
  let index = 0;
  const push = (token) => {
    tokens.push(token);
  };
  const readCodePoint = (position) => {
    const codePoint = source.codePointAt(position);
    if (codePoint === void 0) {
      return null;
    }
    const text = String.fromCodePoint(codePoint);
    return {
      codePoint,
      text,
      width: text.length
    };
  };
  const isWhitespaceCharacter = (ch) => {
    switch (ch) {
      case " ":
      case "	":
      case "\f":
      case "\v":
      case "\xA0":
      case "\u200B":
      case "\u2060":
      case "\uFEFF":
        return true;
      default:
        return false;
    }
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
    if (isWhitespaceCharacter(char)) {
      index += 1;
      continue;
    }
    if (char === "<" && index + 1 < length && source[index + 1] === "#") {
      let scanIndex = index + 2;
      while (scanIndex < length) {
        if (scanIndex + 1 < length && source[scanIndex] === "#" && source[scanIndex + 1] === ">") {
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
        end
      });
      index = end;
      continue;
    }
    if (char === "#") {
      index += 1;
      while (index < length && source[index] !== "\r" && source[index] !== "\n") {
        index += 1;
      }
      push({
        type: "comment",
        value: source.slice(start + 1, index).trimEnd(),
        start,
        end: index
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
                if (scanIndex + 1 < length) {
                  scanIndex += 2;
                } else {
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
          end: attributeEnd
        });
        index = attributeEnd;
        continue;
      }
    }
    if (char === "@" && (source[index + 1] === '"' || source[index + 1] === "'")) {
      const quoteChar = source[index + 1];
      const quote = quoteChar === '"' ? "double" : "single";
      let scanIndex = index + 2;
      let closing = -1;
      while (scanIndex < length) {
        if (scanIndex + 1 < length && source[scanIndex] === quoteChar && source[scanIndex + 1] === "@") {
          const prevChar = source[scanIndex - 1];
          const prevPrev = source[scanIndex - 2];
          const atImmediateClosing = scanIndex === index + 2;
          const atUnixLineStart = prevChar === "\n";
          const atWindowsLineStart = prevChar === "\n" && prevPrev === "\r";
          if (atImmediateClosing || atUnixLineStart || atWindowsLineStart) {
            closing = scanIndex;
            break;
          }
        }
        scanIndex += 1;
      }
      let end = length;
      if (closing !== -1) {
        end = closing + 2;
      }
      push({
        type: "heredoc",
        value: source.slice(index, end),
        start,
        end,
        quote
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
        quote
      });
      continue;
    }
    if (char === "@" && (source[index + 1] === "{" || source[index + 1] === "(")) {
      const value = `@${source[index + 1]}`;
      index += 2;
      push({ type: "operator", value, start, end: index });
      continue;
    }
    if (char === "@" && index + 1 < length && (UNICODE_IDENTIFIER_START_PATTERN.test(source[index + 1]) || source[index + 1] === "_")) {
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
        type: "identifier",
        value: source.slice(start, scanIndex),
        start,
        end: scanIndex
      });
      index = scanIndex;
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
    if (char === "&" && source[index + 1] === "&") {
      index += 2;
      push({ type: "operator", value: "&&", start, end: index });
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
      if (source[index] === "&" && /[1-6]/.test(source[index + 1] ?? "")) {
        value += "&" + source[index + 1];
        index += 2;
      }
      push({ type: "operator", value, start, end: index });
      continue;
    }
    if (/[2-6*]/.test(char) && source[index + 1] === ">") {
      let value = char + ">";
      index += 2;
      if (source[index] === ">") {
        value += ">";
        index += 1;
      }
      if (source[index] === "&" && /[1-6]/.test(source[index + 1])) {
        value += "&" + source[index + 1];
        index += 2;
      }
      push({ type: "operator", value, start, end: index });
      continue;
    }
    if (char === "&") {
      index += 1;
      push({ type: "operator", value: "&", start, end: index });
      continue;
    }
    if (char === "1" && source[index + 1] === ">" && source[index + 2] === "&" && /[2-6]/.test(source[index + 3])) {
      const value = "1>&" + source[index + 3];
      index += 4;
      push({ type: "operator", value, start, end: index });
      continue;
    }
    if (char === "$") {
      index += 1;
      if (index < length) {
        const nextChar = source[index];
        if (nextChar === "$" || nextChar === "^" || nextChar === "?") {
          index += 1;
          push({
            type: "variable",
            value: source.slice(start, index),
            start,
            end: index
          });
          continue;
        }
        if (nextChar === "_") {
          const afterUnderscore = index + 1;
          if (afterUnderscore < length) {
            const peek = readCodePoint(afterUnderscore);
            if (peek && UNICODE_VAR_CHAR_PATTERN.test(peek.text)) {
              index += 1;
            } else {
              index += 1;
              push({
                type: "variable",
                value: source.slice(start, index),
                start,
                end: index
              });
              continue;
            }
          } else {
            index += 1;
            push({
              type: "variable",
              value: source.slice(start, index),
              start,
              end: index
            });
            continue;
          }
        }
      }
      while (index < length) {
        const peek = readCodePoint(index);
        if (!peek) {
          break;
        }
        const currentChar = peek.text;
        if (UNICODE_VAR_CHAR_PATTERN.test(currentChar)) {
          index += peek.width;
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
        end: index
      });
      continue;
    }
    if (/[0-9]/.test(char)) {
      index += 1;
      if (char === "0" && index < length && (source[index] === "x" || source[index] === "X")) {
        index += 1;
        while (index < length && HEX_DIGIT_PATTERN.test(source[index])) {
          index += 1;
        }
        if (index < length && (source[index] === "L" || source[index] === "l" || source[index] === "U" || source[index] === "u")) {
          index += 1;
        }
        if (index + 1 < length) {
          const suffix = source.slice(index, index + 2).toUpperCase();
          if ([
            "KB",
            "MB",
            "GB",
            "TB",
            "PB"
          ].includes(suffix)) {
            index += 2;
          }
        }
        push({
          type: "number",
          value: source.slice(start, index),
          start,
          end: index
        });
        continue;
      }
      if (char === "0" && index < length && (source[index] === "b" || source[index] === "B")) {
        index += 1;
        while (index < length && BINARY_DIGIT_PATTERN.test(source[index])) {
          index += 1;
        }
        if (index < length && (source[index] === "U" || source[index] === "u" || source[index] === "L" || source[index] === "l")) {
          index += 1;
        }
        push({
          type: "number",
          value: source.slice(start, index),
          start,
          end: index
        });
        continue;
      }
      while (index < length && DECIMAL_DIGIT_PATTERN.test(source[index])) {
        index += 1;
      }
      if (index + 1 < length && source[index] === "." && DECIMAL_DIGIT_PATTERN.test(source[index + 1])) {
        index += 2;
        while (index < length && DECIMAL_DIGIT_PATTERN.test(source[index])) {
          index += 1;
        }
      }
      if (index < length && (source[index] === "e" || source[index] === "E")) {
        index += 1;
        if (index < length && (source[index] === "+" || source[index] === "-")) {
          index += 1;
        }
        while (index < length && DECIMAL_DIGIT_PATTERN.test(source[index])) {
          index += 1;
        }
      }
      if (index < length && NUMBER_SUFFIX_PATTERN.test(source[index])) {
        index += 1;
      }
      if (index + 1 < length) {
        const suffix = source.slice(index, index + 2).toUpperCase();
        if ([
          "KB",
          "MB",
          "GB",
          "TB",
          "PB"
        ].includes(suffix)) {
          index += 2;
        }
      }
      push({
        type: "number",
        value: source.slice(start, index),
        start,
        end: index
      });
      continue;
    }
    if (char === "-" && source.slice(index, index + 3) === "--%") {
      let endIndex = index + 3;
      while (endIndex < length && source[endIndex] !== "\n" && source[endIndex] !== "\r") {
        endIndex += 1;
      }
      push({
        type: "operator",
        value: source.slice(start, endIndex),
        start,
        end: endIndex
      });
      index = endIndex;
      continue;
    }
    const startCodePoint = readCodePoint(index);
    if (startCodePoint && UNICODE_IDENTIFIER_START_PATTERN.test(startCodePoint.text)) {
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
        push({ type: "keyword", value: raw, start, end: index });
      } else if (POWERSHELL_OPERATORS.has(lower)) {
        push({ type: "operator", value: raw, start, end: index });
      } else {
        push({ type: "identifier", value: raw, start, end: index });
      }
      continue;
    }
    if (startCodePoint && startCodePoint.text === "-") {
      const afterDash = readCodePoint(index + startCodePoint.width);
      if (afterDash && UNICODE_IDENTIFIER_AFTER_DASH_PATTERN.test(afterDash.text)) {
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
          push({ type: "keyword", value: raw, start, end: index });
        } else if (POWERSHELL_OPERATORS.has(lower)) {
          push({ type: "operator", value: raw, start, end: index });
        } else {
          push({ type: "identifier", value: raw, start, end: index });
        }
        continue;
      }
    }
    index += 1;
    push({ type: "unknown", value: char, start, end: index });
  }
  return tokens;
}

// src/parser.ts
var FALLBACK_OPERATOR_TOKENS = /* @__PURE__ */ new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "&",
  "|",
  "^",
  "!",
  "?",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "??"
]);
function extendNodeLocation(node, end) {
  if (end > node.loc.end) {
    node.loc = { ...node.loc, end };
  }
}
var Parser = class _Parser {
  constructor(tokens, source) {
    this.tokens = tokens;
    this.source = source;
    this.tokenIndex = 0;
  }
  parseScript(terminators = /* @__PURE__ */ new Set()) {
    const body = [];
    const start = this.tokens.length > 0 ? this.tokens[0].start : 0;
    const appendNode = (node) => {
      if (!node) {
        return;
      }
      const last = body[body.length - 1];
      if (last && shouldMergeNodes(last, node)) {
        mergeNodes(last, node);
      } else {
        body.push(node);
      }
    };
    while (!this.isEOF()) {
      const token = this.peek();
      if (terminators.has(token.value) && token.type === "punctuation") {
        break;
      }
      if (this.classifyStatementTerminator(token, 0) === "semicolon") {
        this.advance();
        const nextToken = this.peek();
        if (nextToken && nextToken.type === "comment" && this.isInlineComment(nextToken)) {
          const commentNode = this.createCommentNode(
            this.advance(),
            true
          );
          appendNode(commentNode);
        }
        continue;
      }
      if (token.type === "newline") {
        const blank = this.consumeBlankLines();
        appendNode(blank);
        continue;
      }
      if (token.type === "comment" || token.type === "block-comment") {
        const commentToken = this.advance();
        const commentNode = this.createCommentNode(commentToken, false);
        if (body.length > 0) {
          const previousNode = body[body.length - 1];
          let lookaheadOffset = 0;
          let nextToken;
          while ((nextToken = this.peek(lookaheadOffset)) !== void 0) {
            if (nextToken.type === "newline") {
              lookaheadOffset += 1;
              continue;
            }
            break;
          }
          if (previousNode.type === "Pipeline") {
            const lastSegment = previousNode.segments[previousNode.segments.length - 1];
            const lastPart = lastSegment?.parts[lastSegment.parts.length - 1];
            const belongsToBlock = Boolean(
              lastPart && lastPart.type === "ScriptBlock" && (commentNode.loc.start < lastPart.loc.end || nextToken && nextToken.type === "punctuation" && nextToken.value === "}")
            );
            if (belongsToBlock && lastPart && lastPart.type === "ScriptBlock" && lastSegment) {
              lastPart.body.push(commentNode);
              extendNodeLocation(lastPart, commentNode.loc.end);
              extendNodeLocation(
                lastSegment,
                commentNode.loc.end
              );
              extendNodeLocation(
                previousNode,
                commentNode.loc.end
              );
              continue;
            }
          }
        }
        appendNode(commentNode);
        continue;
      }
      if (this.isFunctionDeclaration()) {
        appendNode(this.parseFunction());
        continue;
      }
      const statement = this.parseStatement();
      if (statement) {
        appendNode(statement);
      } else {
        this.advance();
      }
    }
    const end = body.length > 0 ? body[body.length - 1].loc.end : start;
    return {
      type: "Script",
      body,
      loc: { start, end }
    };
  }
  parseFunction() {
    const startToken = this.advance();
    const headerTokens = [startToken];
    while (!this.isEOF()) {
      const token = this.peek();
      if (token.type === "comment") {
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
      type: "FunctionDeclaration",
      header: headerExpression,
      body,
      loc: { start: startToken.start, end }
    };
  }
  parseStatement() {
    const segments = [[]];
    let trailingComment;
    const structureStack = [];
    let lineContinuation = false;
    while (!this.isEOF()) {
      const token = this.peek();
      const terminatorType = this.classifyStatementTerminator(
        token,
        structureStack.length
      );
      if (terminatorType === "newline") {
        if (lineContinuation) {
          this.advance();
          lineContinuation = false;
          continue;
        }
        if (structureStack.length > 0) {
          const newlineToken = this.advance();
          segments[segments.length - 1].push(newlineToken);
          continue;
        }
        if (structureStack.length === 0 && this.isPipelineContinuationAfterNewline()) {
          this.advance();
          continue;
        }
        break;
      }
      if (terminatorType === "semicolon") {
        break;
      }
      if (terminatorType === "closing-brace" || terminatorType === "closing-paren") {
        break;
      }
      if (token.type === "comment") {
        if (structureStack.length === 0 && this.isInlineComment(token)) {
          trailingComment = this.createCommentNode(
            this.advance(),
            true
          );
        }
        if (structureStack.length === 0) {
          break;
        }
        const currentSegment2 = segments[segments.length - 1];
        currentSegment2.push(this.advance());
        continue;
      }
      if (token.type === "block-comment") {
        if (structureStack.length === 0) {
          break;
        }
        const currentSegment2 = segments[segments.length - 1];
        currentSegment2.push(this.advance());
        continue;
      }
      if (token.type === "operator" && token.value === "|") {
        if (structureStack.length > 0) {
          const currentSegment2 = segments[segments.length - 1];
          currentSegment2.push(this.advance());
          lineContinuation = false;
          continue;
        }
        this.advance();
        segments.push([]);
        lineContinuation = false;
        continue;
      }
      if (token.type === "unknown" && token.value === "`") {
        this.advance();
        lineContinuation = true;
        continue;
      }
      const currentSegment = segments[segments.length - 1];
      currentSegment.push(this.advance());
      lineContinuation = false;
      if (isOpeningToken(token)) {
        structureStack.push(token.value);
      } else if (isClosingToken(token)) {
        structureStack.pop();
      }
    }
    const filteredSegments = segments.filter(
      (segment) => segment.length > 0
    );
    if (filteredSegments.length === 0) {
      return null;
    }
    const expressionSegments = filteredSegments.map(
      (segmentTokens) => buildExpressionFromTokens(segmentTokens, this.source)
    );
    const start = expressionSegments[0].loc.start;
    const end = expressionSegments[expressionSegments.length - 1].loc.end;
    const pipelineNode = {
      type: "Pipeline",
      segments: expressionSegments,
      loc: { start, end }
    };
    if (trailingComment) {
      pipelineNode.trailingComment = trailingComment;
    }
    return pipelineNode;
  }
  classifyStatementTerminator(token, structureDepth) {
    if (!token) {
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
  parseScriptBlock() {
    const openToken = this.peek();
    if (!openToken || openToken.type !== "punctuation" || openToken.value !== "{") {
      return {
        type: "ScriptBlock",
        body: [],
        loc: { start: openToken?.start ?? 0, end: openToken?.end ?? 0 }
      };
    }
    this.advance();
    const { contentTokens, closingToken } = this.collectBalancedTokens(openToken);
    const nestedParser = new _Parser(contentTokens, this.source);
    const script = nestedParser.parseScript(/* @__PURE__ */ new Set());
    const closingEnd = closingToken?.end ?? openToken.end;
    const bodyEnd = script.body.length > 0 ? script.body[script.body.length - 1].loc.end : closingEnd;
    const end = Math.max(closingEnd, bodyEnd);
    return {
      type: "ScriptBlock",
      body: script.body,
      loc: { start: openToken.start, end }
    };
  }
  collectBalancedTokens(startToken) {
    const contentTokens = [];
    const stack = [startToken.value];
    while (!this.isEOF()) {
      const token = this.advance();
      if (isOpeningToken(token)) {
        stack.push(token.value);
        contentTokens.push(token);
        continue;
      }
      if (isClosingToken(token)) {
        if (stack.length <= 1) {
          return { contentTokens, closingToken: token };
        }
        stack.pop();
        contentTokens.push(token);
        continue;
      }
      contentTokens.push(token);
    }
    return { contentTokens };
  }
  consumeBlankLines() {
    let count = 0;
    const start = this.peek().start;
    let end = start;
    while (!this.isEOF()) {
      const token = this.peek();
      if (!token || token.type !== "newline") {
        break;
      }
      const current = this.advance();
      count += 1;
      end = current.end;
    }
    return {
      type: "BlankLine",
      count,
      loc: { start, end }
    };
  }
  createCommentNode(token, inline) {
    const style = token.type === "block-comment" ? "block" : "line";
    const isInline = style === "line" && inline && this.isInlineComment(token);
    return {
      type: "Comment",
      value: token.value,
      inline: isInline,
      style,
      loc: { start: token.start, end: token.end }
    };
  }
  isInlineComment(token) {
    if (token.type !== "comment") {
      return false;
    }
    if (this.source.length === 0) {
      return false;
    }
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
      if (!/\s/.test(char)) {
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
  isPipelineContinuationAfterNewline() {
    let offset = 1;
    let next;
    while ((next = this.peek(offset)) !== void 0) {
      if (next.type === "newline") {
        offset += 1;
        continue;
      }
      if (next.type === "comment") {
        return false;
      }
      if (next.type === "operator" && next.value === "|") {
        return true;
      }
      return false;
    }
    return false;
  }
  isFunctionDeclaration() {
    const token = this.peek();
    return Boolean(
      token && token.type === "keyword" && token.value.toLowerCase() === "function"
    );
  }
  peek(offset = 0) {
    return this.tokens[this.tokenIndex + offset];
  }
  advance() {
    const token = this.tokens[this.tokenIndex];
    this.tokenIndex += 1;
    return token;
  }
  isEOF() {
    return this.tokenIndex >= this.tokens.length;
  }
};
function isOpeningToken(token) {
  if (token.type === "operator") {
    return token.value === "@{" || token.value === "@(";
  }
  return token.type === "punctuation" && (token.value === "{" || token.value === "(" || token.value === "[");
}
function isClosingToken(token) {
  return token.type === "punctuation" && (token.value === "}" || token.value === ")" || token.value === "]");
}
function shouldMergeNodes(previous, next) {
  if (previous.type === "Pipeline" && next.type === "Comment") {
    return Boolean(next.inline);
  }
  if (previous.type === "BlankLine" && next.type === "BlankLine") {
    return true;
  }
  return false;
}
function mergeNodes(previous, next) {
  if (previous.type === "Pipeline" && next.type === "Comment") {
    previous.trailingComment = next;
    extendNodeLocation(previous, next.loc.end);
    return;
  }
  if (previous.type === "BlankLine" && next.type === "BlankLine") {
    previous.count += next.count;
    extendNodeLocation(previous, next.loc.end);
    return;
  }
}
function buildExpressionFromTokens(tokens, source = "") {
  const firstToken = tokens.find((token) => token.type !== "newline");
  const lastToken = [...tokens].reverse().find((token) => token.type !== "newline");
  if (!firstToken || !lastToken) {
    return {
      type: "Expression",
      parts: [],
      loc: {
        start: tokens[0]?.start ?? 0,
        end: tokens[tokens.length - 1]?.end ?? 0
      }
    };
  }
  const parts = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token.type === "newline") {
      index += 1;
      continue;
    }
    if (token.type === "operator" && token.value === "@{") {
      const { node, nextIndex } = parseHashtablePart(
        tokens,
        index,
        source
      );
      parts.push(node);
      index = nextIndex;
      continue;
    }
    if (token.type === "operator" && token.value === "@(" || token.type === "punctuation" && token.value === "[") {
      const { node, nextIndex } = parseArrayPart(tokens, index, source);
      parts.push(node);
      index = nextIndex;
      continue;
    }
    if (token.type === "punctuation" && token.value === "{") {
      const { node, nextIndex } = parseScriptBlockPart(
        tokens,
        index,
        source
      );
      parts.push(node);
      index = nextIndex;
      continue;
    }
    if (token.type === "punctuation" && token.value === "(") {
      const { node, nextIndex } = parseParenthesisPart(
        tokens,
        index,
        source
      );
      parts.push(node);
      index = nextIndex;
      continue;
    }
    if (token.type === "heredoc") {
      parts.push(createHereStringNode(token));
      index += 1;
      continue;
    }
    if (token.type === "attribute") {
      parts.push(createTextNode(token));
      index += 1;
      continue;
    }
    parts.push(createTextNode(token));
    index += 1;
  }
  const expressionEnd = parts.length > 0 ? parts[parts.length - 1].loc.end : lastToken.end;
  return {
    type: "Expression",
    parts,
    loc: {
      start: firstToken.start,
      end: expressionEnd
    }
  };
}
function parseHashtablePart(tokens, startIndex, source = "") {
  const startToken = tokens[startIndex];
  const { contentTokens, endIndex, closingToken } = collectStructureTokens(
    tokens,
    startIndex
  );
  const entries = splitHashtableEntries(contentTokens).map(
    (entryTokens) => buildHashtableEntry(entryTokens, source)
  );
  const end = closingToken?.end ?? contentTokens[contentTokens.length - 1]?.end ?? startToken.end;
  return {
    node: {
      type: "Hashtable",
      entries,
      loc: { start: startToken.start, end }
    },
    nextIndex: endIndex
  };
}
function resolveStructureEnd(startToken, closingToken, contentTokens) {
  if (closingToken) {
    return closingToken.end;
  }
  const lastContent = contentTokens.length > 0 ? contentTokens[contentTokens.length - 1] : void 0;
  if (lastContent) {
    return lastContent.end;
  }
  return startToken.end;
}
function parseArrayPart(tokens, startIndex, source = "") {
  const startToken = tokens[startIndex];
  const { contentTokens, endIndex, closingToken } = collectStructureTokens(
    tokens,
    startIndex
  );
  const elements = splitArrayElements(contentTokens).map(
    (elementTokens) => buildExpressionFromTokens(elementTokens, source)
  );
  const kind = startToken.value === "@(" ? "implicit" : "explicit";
  const end = resolveStructureEnd(startToken, closingToken, contentTokens);
  return {
    node: {
      type: "ArrayLiteral",
      elements,
      kind,
      loc: { start: startToken.start, end }
    },
    nextIndex: endIndex
  };
}
function parseParenthesisPart(tokens, startIndex, source = "") {
  const startToken = tokens[startIndex];
  const { contentTokens, endIndex, closingToken } = collectStructureTokens(
    tokens,
    startIndex
  );
  const elements = splitArrayElements(contentTokens).map(
    (elementTokens) => buildExpressionFromTokens(elementTokens, source)
  );
  const hasComma = hasTopLevelComma(contentTokens);
  const hasNewline = contentTokens.some((token) => token.type === "newline");
  const end = resolveStructureEnd(startToken, closingToken, contentTokens);
  return {
    node: {
      type: "Parenthesis",
      elements,
      hasComma,
      hasNewline,
      loc: { start: startToken.start, end }
    },
    nextIndex: endIndex
  };
}
function parseScriptBlockPart(tokens, startIndex, source = "") {
  const startToken = tokens[startIndex];
  const { contentTokens, endIndex, closingToken } = collectStructureTokens(
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
  const bodyEnd = script.body.length > 0 ? script.body[script.body.length - 1].loc.end : closingEnd;
  const end = Math.max(closingEnd, bodyEnd);
  return {
    node: {
      type: "ScriptBlock",
      body: script.body,
      loc: { start: startToken.start, end }
    },
    nextIndex: endIndex
  };
}
function createHereStringNode(token) {
  const quote = token.quote ?? "double";
  return {
    type: "HereString",
    quote,
    value: token.value,
    loc: { start: token.start, end: token.end }
  };
}
function createTextNode(token) {
  const tokenTypeToRole = {
    identifier: "word",
    keyword: "keyword",
    number: "number",
    variable: "variable",
    string: "string",
    operator: "operator",
    punctuation: "punctuation"
  };
  let role = tokenTypeToRole[token.type] ?? "unknown";
  if ((role === "unknown" || role === "word") && FALLBACK_OPERATOR_TOKENS.has(token.value)) {
    role = "operator";
  }
  return {
    type: "Text",
    value: token.value,
    role,
    loc: { start: token.start, end: token.end }
  };
}
function collectStructureTokens(tokens, startIndex) {
  const contentTokens = [];
  const stack = [tokens[startIndex].value];
  let index = startIndex + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (isOpeningToken(token)) {
      stack.push(token.value);
      contentTokens.push(token);
      index += 1;
      continue;
    }
    if (isClosingToken(token)) {
      if (stack.length === 1) {
        return {
          contentTokens,
          endIndex: index + 1,
          closingToken: token
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
function splitTopLevelTokens(tokens, options = {}) {
  const result = [];
  let current = [];
  const stack = [];
  const state = options.createInitialState ? options.createInitialState() : {};
  const flush = (force = false) => {
    if (!force && current.length === 0) {
      return;
    }
    const maybeSegment = options.onFlush?.(current, state, result, force);
    const segment = maybeSegment ?? current;
    if (segment.length > 0) {
      result.push(segment);
    }
    current = [];
  };
  for (const token of tokens) {
    const topLevel = stack.length === 0;
    const context = {
      token,
      state,
      current,
      stack,
      topLevel
    };
    if (token.type === "newline" && topLevel) {
      if (options.splitOnNewline?.(context)) {
        flush();
      }
      continue;
    }
    if (topLevel && token.type === "punctuation" && options.delimiterValues?.includes(token.value)) {
      if (options.shouldSplitOnDelimiter?.(context) ?? true) {
        flush();
      }
      continue;
    }
    const decision = options.onToken?.(context);
    if (decision === "skip") {
      continue;
    }
    options.onBeforeAddToken?.(context);
    if (isOpeningToken(token)) {
      stack.push(token.value);
      current.push(token);
    } else if (isClosingToken(token)) {
      stack.pop();
      current.push(token);
    } else {
      current.push(token);
    }
    options.onAfterAddToken?.({
      token,
      state,
      current,
      stack,
      topLevel: stack.length === 0
    });
  }
  flush(true);
  return result;
}
function splitHashtableEntries(tokens) {
  const segments = splitTopLevelTokens(tokens, {
    delimiterValues: [";"],
    createInitialState: () => ({
      hasEquals: false,
      justSawEquals: false,
      pendingComments: []
    }),
    splitOnNewline: (context) => {
      if (context.current.length === 0) {
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
    shouldSplitOnDelimiter: (context) => {
      if (context.current.length === 0) {
        return false;
      }
      if (context.state.pendingComments.length > 0) {
        context.current.push(...context.state.pendingComments);
        context.state.pendingComments = [];
      }
      return true;
    },
    onToken: (context) => {
      if (context.token.type === "comment" || context.token.type === "block-comment") {
        context.state.pendingComments.push(context.token);
        return "skip";
      }
    },
    onBeforeAddToken: (context) => {
      if (context.state.pendingComments.length > 0) {
        context.current.push(...context.state.pendingComments);
        context.state.pendingComments = [];
      }
    },
    onAfterAddToken: (context) => {
      const { token, state, topLevel } = context;
      if (topLevel && token.type === "operator" && token.value === "=") {
        state.hasEquals = true;
        state.justSawEquals = true;
        return;
      }
      if (token.type !== "newline" && token.type !== "comment" && token.type !== "block-comment") {
        state.justSawEquals = false;
      }
    },
    onFlush: (segment, state, segments2, _force) => {
      if (state.pendingComments.length > 0) {
        if (segment.length > 0) {
          segment.push(...state.pendingComments);
        } else if (segments2.length > 0) {
          segments2[segments2.length - 1].push(
            ...state.pendingComments
          );
        }
        state.pendingComments = [];
      }
      state.hasEquals = false;
      state.justSawEquals = false;
      return segment;
    }
  });
  return segments;
}
function buildHashtableEntry(tokens, source = "") {
  const leadingComments = [];
  const trailingComments = [];
  const otherTokens = [];
  let equalsIndex = -1;
  let foundEquals = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "comment" || token.type === "block-comment") {
      if (!foundEquals) {
        leadingComments.push(token);
      } else {
        trailingComments.push(token);
      }
    } else {
      if (token.type === "operator" && token.value === "=" && !foundEquals) {
        equalsIndex = otherTokens.length;
        foundEquals = true;
      }
      otherTokens.push(token);
    }
  }
  const keyTokens = equalsIndex === -1 ? otherTokens : otherTokens.slice(0, equalsIndex);
  const valueTokens = equalsIndex === -1 ? [] : otherTokens.slice(equalsIndex + 1);
  const keyExpression = buildExpressionFromTokens(keyTokens, source);
  const valueExpression = valueTokens.length > 0 ? buildExpressionFromTokens(valueTokens, source) : buildExpressionFromTokens([], source);
  const key = extractKeyText(keyTokens);
  const start = keyTokens[0]?.start ?? valueTokens[0]?.start ?? 0;
  const end = (valueTokens[valueTokens.length - 1] ?? keyTokens[keyTokens.length - 1])?.end ?? start;
  const entry = {
    type: "HashtableEntry",
    key,
    rawKey: keyExpression,
    value: valueExpression,
    loc: { start, end }
  };
  if (leadingComments.length > 0) {
    entry.leadingComments = leadingComments.map((token) => ({
      type: "Comment",
      value: token.value,
      inline: false,
      style: token.type === "block-comment" ? "block" : "line",
      loc: { start: token.start, end: token.end }
    }));
  }
  if (trailingComments.length > 0) {
    const trailingNodes = [];
    let referenceEnd = valueTokens[valueTokens.length - 1]?.end ?? keyTokens[keyTokens.length - 1]?.end ?? tokens[0]?.start ?? 0;
    for (const token of trailingComments) {
      const inline = token.type === "comment" && isInlineSpacing(source, referenceEnd, token.start);
      trailingNodes.push({
        type: "Comment",
        value: token.value,
        inline,
        style: token.type === "block-comment" ? "block" : "line",
        loc: { start: token.start, end: token.end }
      });
      referenceEnd = token.end;
    }
    if (trailingNodes.length > 1) {
      for (const comment of trailingNodes) {
        comment.inline = false;
      }
    }
    if (trailingNodes.length > 0) {
      entry.trailingComments = trailingNodes;
    }
  }
  return entry;
}
function isInlineSpacing(source, start, end) {
  if (start === void 0 || end === void 0) {
    return false;
  }
  for (let index = start; index < end; index += 1) {
    const char = source[index];
    if (char === "\n" || char === "\r") {
      return false;
    }
    switch (char) {
      case " ":
      case "	":
      case "\f":
      case "\v":
      case "\xA0":
      case "\u200B":
      case "\u2060":
      case "\uFEFF":
        break;
      default:
        return false;
    }
  }
  return true;
}
function extractKeyText(tokens) {
  const text = tokens.filter((token) => token.type !== "newline").map((token) => token.value).join(" ").trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1);
  }
  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1);
  }
  return text;
}
function splitArrayElements(tokens) {
  return splitTopLevelTokens(tokens, {
    delimiterValues: [","],
    splitOnNewline: (context) => context.current.length > 0
  });
}
function hasTopLevelComma(tokens) {
  const stack = [];
  for (const token of tokens) {
    if (isOpeningToken(token)) {
      stack.push(token.value);
      continue;
    }
    if (isClosingToken(token)) {
      stack.pop();
      continue;
    }
    if (stack.length === 0 && token.type === "punctuation" && token.value === ",") {
      return true;
    }
  }
  return false;
}
function parsePowerShell(source, options) {
  resolveOptions(options);
  const tokens = tokenize(source);
  const parser = new Parser(tokens, source);
  return parser.parseScript();
}
var locStart = (node) => node.loc.start;
var locEnd = (node) => node.loc.end;

// src/printer.ts
var {
  group,
  indent,
  line,
  softline,
  hardline,
  join,
  ifBreak,
  lineSuffix,
  dedentToRoot,
  align
} = doc.builders;
var powerShellPrinter = {
  print(path, options) {
    const node = path.getValue();
    if (!node) {
      return "";
    }
    const resolved = resolveOptions(options);
    return printNode(node, resolved);
  }
};
function printNode(node, options) {
  switch (node.type) {
    case "Script":
      return printScript(node, options);
    case "ScriptBlock":
      return printScriptBlock(node, options);
    case "FunctionDeclaration":
      return printFunction(node, options);
    case "Pipeline":
      return printPipeline(node, options);
    case "Expression":
      return printExpression(node, options);
    case "Text":
      return printText(node, options);
    case "Comment":
      return printComment(node);
    case "BlankLine":
      return Array.from({ length: node.count }, () => hardline);
    case "ArrayLiteral":
      return printArray(node, options);
    case "Hashtable":
      return printHashtable(node, options);
    case "HashtableEntry":
      return printHashtableEntry(node, options);
    case "HereString":
      return printHereString(node);
    case "Parenthesis":
      return printParenthesis(node, options);
    default:
      return "";
  }
}
function concatDocs(docs) {
  if (docs.length === 0) {
    return "";
  }
  let acc = docs[0];
  for (let index = 1; index < docs.length; index += 1) {
    acc = [acc, docs[index]];
  }
  return acc;
}
function indentStatement(docToIndent, options) {
  const indentUnit = options.indentStyle === "tabs" ? "	" : " ".repeat(options.indentSize);
  return [indentUnit, align(indentUnit.length, docToIndent)];
}
function printScript(node, options) {
  const bodyDoc = printStatementList(node.body, options, false);
  if (!bodyDoc) {
    return "";
  }
  return [bodyDoc, hardline];
}
function printStatementList(body, options, indentStatements) {
  const docs = [];
  let previous = null;
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
    if (entry.type === "Comment" && previous && entry.loc.start < previous.loc.end && docs.length > 0) {
      const commentDoc = indentStatements ? indentStatement(printed, options) : printed;
      const lastIndex = docs.length - 1;
      const priorDoc = docs[lastIndex];
      docs[lastIndex] = priorDoc ? concatDocs([
        priorDoc,
        hardline,
        commentDoc
      ]) : commentDoc;
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
function determineBlankLines(previous, current, pendingBlankLines, options) {
  let base = pendingBlankLines > 0 ? pendingBlankLines : 1;
  const desiredFunctionSpacing = options.blankLinesBetweenFunctions + 1;
  if (previous.type === "FunctionDeclaration" && current.type === "FunctionDeclaration" || previous.type === "FunctionDeclaration" && current.type !== "BlankLine" || current.type === "FunctionDeclaration" && previous.type !== "BlankLine") {
    base = Math.max(base, desiredFunctionSpacing);
  }
  if (options.blankLineAfterParam && isParamStatement(previous)) {
    base = Math.max(base, 2);
  }
  return base;
}
function printScriptBlock(node, options) {
  if (node.body.length === 0) {
    return "{}";
  }
  const bodyDoc = printStatementList(node.body, options, true);
  return group([
    "{",
    hardline,
    bodyDoc,
    hardline,
    "}"
  ]);
}
function printFunction(node, options) {
  const headerDoc = printExpression(node.header, options);
  const bodyDoc = printScriptBlock(node.body, options);
  if (options.braceStyle === "allman") {
    return group([
      headerDoc,
      hardline,
      bodyDoc
    ]);
  }
  return group([
    headerDoc,
    " ",
    bodyDoc
  ]);
}
function printPipeline(node, options) {
  const segmentDocs = node.segments.map(
    (segment) => printExpression(segment, options)
  );
  if (segmentDocs.length === 0) {
    return "";
  }
  let pipelineDoc = segmentDocs[0];
  if (segmentDocs.length > 1) {
    const shouldAlwaysBreak = segmentDocs.length > 3;
    const restDocs = segmentDocs.slice(1).map((segmentDoc) => [line, ["| ", segmentDoc]]);
    if (shouldAlwaysBreak) {
      pipelineDoc = [
        segmentDocs[0],
        indent(restDocs.flatMap((docItem) => docItem))
      ];
    } else {
      pipelineDoc = group([
        segmentDocs[0],
        indent(restDocs.flatMap((docItem) => docItem))
      ]);
    }
  }
  if (node.trailingComment) {
    if (node.trailingComment.inline) {
      pipelineDoc = [
        pipelineDoc,
        lineSuffix([" #", node.trailingComment.value])
      ];
    } else {
      pipelineDoc = [
        pipelineDoc,
        hardline,
        printComment(node.trailingComment)
      ];
    }
  }
  return pipelineDoc;
}
function looksLikeCommentText(text) {
  const trimmed = text.trim();
  if (trimmed.length <= MINIMUM_COMMENT_LENGTH) {
    return false;
  }
  if (trimmed.startsWith("$") || trimmed.startsWith("[") || trimmed.startsWith("(") || trimmed.startsWith("{") || trimmed.startsWith("@")) {
    return false;
  }
  if (trimmed.includes("=") || trimmed.includes("->") || trimmed.includes("::") || trimmed.match(/\b(function|param|if|foreach|while)\b/i)) {
    return false;
  }
  const hasSpaces = trimmed.includes(" ");
  const wordCount = trimmed.split(/\s+/).length;
  return hasSpaces && wordCount >= 3;
}
function printExpression(node, options) {
  const docs = [];
  const filteredParts = node.parts.filter((part) => !shouldSkipPart(part));
  const normalizedParts = [];
  for (let index = 0; index < filteredParts.length; index += 1) {
    const current = filteredParts[index];
    if (current.type === "Text" && current.role === "operator") {
      const next = filteredParts[index + 1];
      if (next && next.type === "Text" && next.role === "operator") {
        const combinedValue = current.value + next.value;
        if (CONCATENATED_OPERATOR_PAIRS.has(combinedValue)) {
          normalizedParts.push({
            ...current,
            value: combinedValue,
            loc: { start: current.loc.start, end: next.loc.end }
          });
          index += 1;
          continue;
        }
      }
    }
    normalizedParts.push(current);
  }
  let previous = null;
  for (let index = 0; index < normalizedParts.length; index += 1) {
    const part = normalizedParts[index];
    if (part.type === "Parenthesis" && isParamKeyword(previous)) {
      docs.push(printParamParenthesis(part, options));
      previous = part;
      continue;
    }
    if (part.type === "Text" && part.role === "unknown" && previous && !part.value.trim().startsWith("#") && looksLikeCommentText(part.value)) {
      docs.push(lineSuffix([" # ", part.value.trim()]));
      previous = part;
      continue;
    }
    if (previous) {
      if (part.type === "Parenthesis" && previous.type === "Text" && previous.role === "word" && index >= 2) {
        const beforeWord = normalizedParts[index - 2];
        if (beforeWord && beforeWord.type === "Text" && (beforeWord.value === "." || beforeWord.value === "::")) {
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
function gapBetween(previous, current) {
  const prevSymbol = getSymbol(previous);
  const currentSymbol = getSymbol(current);
  if (current.type === "ArrayLiteral" && current.kind === "explicit" && Boolean(previous)) {
    return null;
  }
  if (current.type === "Text" && current.role === "operator" && (current.value === "++" || current.value === "--")) {
    return null;
  }
  if (previous.type === "Text" && previous.role === "operator" && current.type === "Text" && current.role === "operator") {
    const combined = previous.value + current.value;
    if (CONCATENATED_OPERATOR_PAIRS.has(combined)) {
      return null;
    }
  }
  if (current.type === "Parenthesis") {
    if (previous && previous.type === "Text") {
      if (previous.value.toLowerCase() === "param") {
        return null;
      }
      if (previous.role === "keyword") {
        return " ";
      }
      if (previous.role === "operator") {
        return " ";
      }
      if (previous.role === "word") {
        return " ";
      }
      const prevLower = previous.value.toLowerCase();
      if (prevLower.startsWith("-") && (prevLower === "-not" || prevLower === "-and" || prevLower === "-or" || prevLower === "-xor")) {
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
  if (prevSymbol && currentSymbol && SYMBOL_NO_GAP.has(`${prevSymbol}:${currentSymbol}`)) {
    return null;
  }
  if (prevSymbol && currentSymbol) {
    const pair = `${prevSymbol}${currentSymbol}`;
    if (CONCATENATED_OPERATOR_PAIRS.has(pair)) {
      return null;
    }
  }
  if (prevSymbol === "=" || currentSymbol === "=") {
    return " ";
  }
  if (current.type === "ScriptBlock" || current.type === "Hashtable" || current.type === "ArrayLiteral") {
    return " ";
  }
  return " ";
}
function isParamStatement(node) {
  if (!node || node.type !== "Pipeline") {
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
  if (!firstPart || firstPart.type !== "Text") {
    return false;
  }
  return firstPart.value.toLowerCase() === "param";
}
var NO_SPACE_BEFORE = /* @__PURE__ */ new Set([
  ")",
  "]",
  "}",
  ",",
  ";",
  ".",
  "::",
  ":",
  ">",
  "<"
]);
var NO_SPACE_AFTER = /* @__PURE__ */ new Set([
  "(",
  "[",
  "{",
  ".",
  "::",
  ":",
  "@",
  ">",
  "<",
  ">>",
  "2>",
  "2>>",
  "3>",
  "3>>",
  "4>",
  "4>>",
  "5>",
  "5>>",
  "6>",
  "6>>",
  "*>",
  "*>>",
  "2>&1",
  "3>&1",
  "4>&1",
  "5>&1",
  "6>&1",
  "*>&1",
  "1>&2",
  "2>&2",
  "3>&2",
  "4>&2",
  "5>&2",
  "6>&2",
  "*>&2"
]);
var MINIMUM_COMMENT_LENGTH = 10;
var SYMBOL_NO_GAP = /* @__PURE__ */ new Set([
  ".:word",
  "::word",
  "word:(",
  "word:["
]);
var CONCATENATED_OPERATOR_PAIRS = /* @__PURE__ */ new Set([
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "??"
]);
function getSymbol(node) {
  if (!node) {
    return null;
  }
  if (node.type === "Text" && (node.role === "punctuation" || node.role === "operator")) {
    return node.value;
  }
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
function isParamKeyword(node) {
  return Boolean(
    node && node.type === "Text" && node.value.toLowerCase() === "param"
  );
}
var KEYWORD_CASE_TRANSFORMS = {
  preserve: (value) => value,
  lower: (value) => value.toLowerCase(),
  upper: (value) => value.toUpperCase(),
  pascal: (value) => value.length === 0 ? value : value[0].toUpperCase() + value.slice(1).toLowerCase()
};
var CMDLET_ALIAS_MAP = {
  gi: "Get-Item",
  gci: "Get-ChildItem",
  ls: "Get-ChildItem",
  dir: "Get-ChildItem",
  ld: "Get-ChildItem",
  la: "Get-ChildItem",
  gcm: "Get-Command",
  gm: "Get-Member",
  gps: "Get-Process",
  ps: "Get-Process",
  gwmi: "Get-WmiObject",
  gsv: "Get-Service",
  cat: "Get-Content",
  gc: "Get-Content",
  echo: "Write-Output",
  write: "Write-Output",
  "%": "ForEach-Object",
  foreach: "ForEach-Object",
  "?": "Where-Object",
  where: "Where-Object"
};
var DISALLOWED_CMDLET_REWRITE = /* @__PURE__ */ new Map([["write-host", "Write-Output"]]);
function printText(node, options) {
  if (node.role === "string") {
    return normalizeStringLiteral(node.value, options);
  }
  let value = node.value;
  if (node.role === "keyword") {
    const transform = KEYWORD_CASE_TRANSFORMS[options.keywordCase] ?? KEYWORD_CASE_TRANSFORMS.preserve;
    value = transform(value);
  }
  if (options.rewriteAliases && (node.role === "word" || node.role === "operator" || node.role === "unknown")) {
    const aliasKey = value.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(CMDLET_ALIAS_MAP, aliasKey)) {
      value = CMDLET_ALIAS_MAP[aliasKey];
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
function printComment(node) {
  if (node.style === "block") {
    return node.value;
  }
  return ["#", node.value];
}
function printArray(node, options) {
  const open = node.kind === "implicit" ? "@(" : "[";
  const close = node.kind === "implicit" ? ")" : "]";
  if (node.elements.length === 0) {
    return [open, close];
  }
  const groupId = Symbol("array");
  const elementDocs = node.elements.map(
    (element) => printExpression(element, options)
  );
  const shouldBreak = elementDocs.length > 1;
  const separator = [",", line];
  return group(
    [
      open,
      indent([
        shouldBreak ? line : softline,
        join(separator, elementDocs)
      ]),
      shouldBreak ? line : softline,
      close
    ],
    { id: groupId }
  );
}
function printHashtable(node, options) {
  const entries = options.sortHashtableKeys ? [...node.entries].sort(
    (a, b) => a.key.localeCompare(b.key, void 0, { sensitivity: "base" })
  ) : node.entries;
  if (entries.length === 0) {
    return "@{}";
  }
  const groupId = Symbol("hashtable");
  const entryDocs = entries.map((entry, index) => {
    const entryDoc = printHashtableEntry(entry, options);
    const isLast = index === entries.length - 1;
    const separator = isLast ? trailingCommaDoc(options, groupId, true, ";") : ifBreak("", ";", { groupId });
    return [entryDoc, separator];
  });
  return group(
    [
      "@{",
      indent([line, join(line, entryDocs)]),
      line,
      "}"
    ],
    {
      id: groupId
    }
  );
}
function printHashtableEntry(node, options) {
  const keyDoc = printExpression(node.rawKey, options);
  const valueDoc = printExpression(node.value, options);
  const firstPart = node.value.parts[0];
  const startsWithKeyword = firstPart && firstPart.type === "Text" && firstPart.role === "keyword" && /^(if|switch|foreach|while|for)$/i.test(firstPart.value);
  let entryDoc;
  if (startsWithKeyword) {
    entryDoc = group([
      keyDoc,
      " = ",
      valueDoc
    ]);
  } else {
    entryDoc = group([
      keyDoc,
      " =",
      indent([line, valueDoc])
    ]);
  }
  if (node.leadingComments && node.leadingComments.length > 0) {
    const commentDocs = node.leadingComments.map(
      (comment) => printComment(comment)
    );
    entryDoc = [
      join(hardline, commentDocs),
      hardline,
      entryDoc
    ];
  }
  if (node.trailingComments && node.trailingComments.length > 0) {
    for (const comment of node.trailingComments) {
      if (comment.inline) {
        entryDoc = [entryDoc, lineSuffix([" ", printComment(comment)])];
      } else {
        entryDoc = [
          entryDoc,
          hardline,
          printComment(comment)
        ];
      }
    }
  }
  return entryDoc;
}
function printHereString(node) {
  return dedentToRoot(node.value);
}
function printParamParenthesis(node, options) {
  if (node.elements.length === 0) {
    return "()";
  }
  if (node.elements.length <= 1 && !node.hasNewline) {
    return printParenthesis(node, options);
  }
  const groupId = Symbol("param");
  const elementDocs = [];
  let pendingAttributes = [];
  const flushAttributes = (nextDoc) => {
    if (pendingAttributes.length === 0) {
      if (nextDoc) {
        elementDocs.push(nextDoc);
      }
      return;
    }
    const attributeDoc = pendingAttributes.length === 1 ? pendingAttributes[0] : join(hardline, pendingAttributes);
    if (nextDoc) {
      elementDocs.push(
        group([
          attributeDoc,
          hardline,
          nextDoc
        ])
      );
    } else {
      elementDocs.push(attributeDoc);
    }
    pendingAttributes = [];
  };
  for (let index = 0; index < node.elements.length; index += 1) {
    const element = node.elements[index];
    if (isCommentExpression(element)) {
      continue;
    }
    if (isAttributeExpression(element)) {
      pendingAttributes.push(printExpression(element, options));
      continue;
    }
    let printed = printExpression(element, options);
    const nextElement = node.elements[index + 1];
    if (nextElement && isCommentExpression(nextElement)) {
      const commentText = extractCommentText(nextElement);
      if (commentText) {
        printed = [printed, lineSuffix([" ", commentText])];
        index += 1;
      }
    }
    flushAttributes(printed);
  }
  flushAttributes();
  const separator = [",", hardline];
  return group(
    [
      "(",
      indent([hardline, join(separator, elementDocs)]),
      hardline,
      ")"
    ],
    {
      id: groupId
    }
  );
}
function isAttributeExpression(node) {
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
function isCommentExpression(node) {
  if (node.parts.length !== 1) {
    return false;
  }
  const part = node.parts[0];
  if (part.type !== "Text") {
    return false;
  }
  const trimmed = part.value.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("<#")) {
    return true;
  }
  return looksLikeCommentText(trimmed);
}
function extractCommentText(node) {
  if (!isCommentExpression(node)) {
    return null;
  }
  const part = node.parts[0];
  if (part.type !== "Text") {
    return null;
  }
  const trimmed = part.value.trim();
  if (trimmed.startsWith("#")) {
    return trimmed;
  }
  return `# ${trimmed}`;
}
function printParenthesis(node, options) {
  if (node.elements.length === 0) {
    return "()";
  }
  const groupId = Symbol("parenthesis");
  const elementDocs = node.elements.map(
    (element) => printExpression(element, options)
  );
  if (elementDocs.length === 1 && !node.hasNewline) {
    return group(
      [
        "(",
        indent([softline, elementDocs[0]]),
        softline,
        ")"
      ],
      {
        id: groupId
      }
    );
  }
  const hasComma = node.hasComma;
  const forceMultiline = node.hasNewline || !node.hasComma && elementDocs.length > 1;
  const separator = hasComma ? [",", forceMultiline ? hardline : line] : hardline;
  const leadingLine = hasComma ? forceMultiline ? hardline : line : hardline;
  const trailingLine = hasComma ? forceMultiline ? hardline : line : hardline;
  return group(
    [
      "(",
      indent([leadingLine, join(separator, elementDocs)]),
      trailingLine,
      ")"
    ],
    {
      id: groupId
    }
  );
}
function trailingCommaDoc(options, groupId, hasElements, delimiter) {
  switch (options.trailingComma) {
    case "all":
      return delimiter;
    case "multiline":
      return ifBreak(delimiter, "", { groupId });
    case "none":
    default:
      return "";
  }
}
function normalizeStringLiteral(value, options) {
  if (!options.preferSingleQuote) {
    return value;
  }
  if (!value.startsWith('"') || !value.endsWith('"')) {
    return value;
  }
  const inner = value.slice(1, -1);
  if (/^\(\?[imxsU]/.test(inner) || /\[[^\]]+\]/.test(inner) || /\bWrite-(Warning|Error|Host|Output)\b/.test(inner)) {
    return value;
  }
  if (inner.includes("'")) {
    return value;
  }
  if (/[`$"\n]/.test(inner)) {
    return value;
  }
  return `'${inner}'`;
}
function shouldSkipPart(part) {
  if (part.type === "Text") {
    const trimmed = part.value.trim();
    if (trimmed === "`") {
      return true;
    }
  }
  return false;
}

// src/index.ts
var languages = [
  {
    name: "PowerShell",
    parsers: ["powershell"],
    extensions: [
      ".ps1",
      ".psm1",
      ".psd1"
    ],
    tmScope: "source.powershell",
    aceMode: "powershell",
    linguistLanguageId: 131,
    vscodeLanguageIds: ["powershell"]
  }
];
var parsers = {
  powershell: {
    parse: parsePowerShell,
    astFormat: "powershell-ast",
    locStart,
    locEnd,
    hasPragma() {
      return false;
    }
  }
};
var printers = {
  "powershell-ast": powerShellPrinter
};
var plugin = {
  languages,
  parsers,
  printers,
  options: pluginOptions,
  defaultOptions
};
var index_default = plugin;

export { index_default as default };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map