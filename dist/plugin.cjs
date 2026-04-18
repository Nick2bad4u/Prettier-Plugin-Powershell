'use strict';

var prettier = require('prettier');

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/options.ts
var pluginOptions = {
  powershellBlankLineAfterParam: {
    category: "PowerShell",
    default: true,
    description: "Insert a blank line after param(...) blocks inside script blocks.",
    type: "boolean"
  },
  powershellBlankLinesBetweenFunctions: {
    category: "PowerShell",
    default: 1,
    description: "Number of blank lines to ensure between function declarations.",
    range: { end: 3, start: 0, step: 1 },
    type: "int"
  },
  powershellBraceStyle: {
    category: "PowerShell",
    choices: [
      {
        description: "One True Brace Style \u2013 keep opening braces on the same line.",
        value: "1tbs"
      },
      {
        description: "Allman style \u2013 place opening braces on the next line.",
        value: "allman"
      }
    ],
    default: "1tbs",
    description: "Control placement of opening braces for script blocks and functions.",
    type: "choice"
  },
  powershellIndentSize: {
    category: "PowerShell",
    default: 4,
    description: "Number of indentation characters for each level.",
    range: { end: 8, start: 1, step: 1 },
    type: "int"
  },
  powershellIndentStyle: {
    category: "PowerShell",
    choices: [
      { description: "Use spaces for indentation.", value: "spaces" },
      { description: "Use tabs for indentation.", value: "tabs" }
    ],
    default: "spaces",
    description: "Indent PowerShell code using spaces or tabs.",
    type: "choice"
  },
  powershellKeywordCase: {
    category: "PowerShell",
    choices: [
      {
        description: "Leave keyword casing unchanged.",
        value: "preserve"
      },
      { description: "Convert keywords to lower-case.", value: "lower" },
      { description: "Convert keywords to upper-case.", value: "upper" },
      {
        description: "Capitalise keywords (PascalCase).",
        value: "pascal"
      }
    ],
    default: "lower",
    description: "Normalise the casing of PowerShell keywords (defaults to lowercase to match PSScriptAnalyzer).",
    type: "choice"
  },
  powershellLineWidth: {
    category: "PowerShell",
    default: 120,
    description: "Maximum preferred line width for PowerShell documents.",
    range: { end: 200, start: 40, step: 1 },
    type: "int"
  },
  powershellPreferSingleQuote: {
    category: "PowerShell",
    default: false,
    description: "Prefer single-quoted strings when no interpolation is required.",
    type: "boolean"
  },
  powershellPreset: {
    category: "PowerShell",
    choices: [
      {
        description: "Do not apply a preset; rely solely on explicit options.",
        value: "none"
      },
      {
        description: "Match the defaults used by Invoke-Formatter / PSScriptAnalyzer's CodeFormatting profile.",
        value: "invoke-formatter"
      }
    ],
    default: "none",
    description: "Apply a predefined bundle of formatting preferences (e.g. Invoke-Formatter parity).",
    type: "choice"
  },
  powershellRewriteAliases: {
    category: "PowerShell",
    default: false,
    description: "Rewrite common cmdlet aliases to their canonical names.",
    type: "boolean"
  },
  powershellRewriteWriteHost: {
    category: "PowerShell",
    default: false,
    description: "Rewrite Write-Host invocations to Write-Output to discourage host-only output.",
    type: "boolean"
  },
  powershellSortHashtableKeys: {
    category: "PowerShell",
    default: false,
    description: "Sort hashtable keys alphabetically when formatting.",
    type: "boolean"
  },
  powershellTrailingComma: {
    category: "PowerShell",
    choices: [
      {
        description: "Never add a trailing comma or semicolon.",
        value: "none"
      },
      {
        description: "Add trailing comma/semicolon when the literal spans multiple lines.",
        value: "multiline"
      },
      {
        description: "Always add trailing comma/semicolon when possible.",
        value: "all"
      }
    ],
    default: "none",
    description: "Control trailing commas for array and hashtable literals.",
    type: "choice"
  }
};
var defaultOptions = {
  tabWidth: 4
};
var PRESET_DEFAULTS = {
  "invoke-formatter": {
    powershellBlankLineAfterParam: true,
    powershellBlankLinesBetweenFunctions: 1,
    powershellBraceStyle: "1tbs",
    powershellIndentSize: 4,
    powershellIndentStyle: "spaces",
    powershellKeywordCase: "lower",
    powershellLineWidth: 120,
    powershellPreferSingleQuote: false,
    powershellRewriteAliases: false,
    powershellRewriteWriteHost: false,
    powershellSortHashtableKeys: false,
    powershellTrailingComma: "none",
    tabWidth: 4
  },
  none: {}
};
function resolveOptions(options) {
  const preset = options.powershellPreset ?? "none";
  applyPresetDefaults(options, preset);
  const indentStyle = options.powershellIndentStyle ?? "spaces";
  const rawIndentOverride = options.powershellIndentSize;
  const normalizedIndentOverride = Number(rawIndentOverride);
  const normalizedTabWidth = options.tabWidth;
  const indentSize = Number.isFinite(normalizedIndentOverride) && normalizedIndentOverride > 0 ? Math.floor(normalizedIndentOverride) : Number.isFinite(normalizedTabWidth) && normalizedTabWidth > 0 ? Math.floor(normalizedTabWidth) : 4;
  options.useTabs = indentStyle === "tabs";
  options.tabWidth = indentSize;
  const trailingComma = options.powershellTrailingComma ?? "none";
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
  const keywordCase = options.powershellKeywordCase ?? "lower";
  const rewriteAliases = options.powershellRewriteAliases === true;
  const rewriteWriteHost = options.powershellRewriteWriteHost === true;
  if (!options.printWidth || options.printWidth > lineWidth) {
    options.printWidth = lineWidth;
  }
  return {
    blankLineAfterParam,
    blankLinesBetweenFunctions,
    braceStyle,
    indentSize,
    indentStyle,
    keywordCase,
    lineWidth,
    preferSingleQuote,
    rewriteAliases,
    rewriteWriteHost,
    sortHashtableKeys,
    trailingComma
  };
}
function applyPresetDefaults(options, preset) {
  const overrides = PRESET_DEFAULTS[preset];
  if (overrides === void 0) {
    return;
  }
  const target = options;
  for (const [key, value] of Object.entries(overrides)) {
    if (target[key] === void 0) {
      target[key] = value;
    }
  }
}

// src/tokenizer.ts
var KEYWORDS = /* @__PURE__ */ new Set([
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
  "workflow"
]);
var POWERSHELL_OPERATORS = /* @__PURE__ */ new Set([
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
  "-xor"
]);
var PUNCTUATION = /* @__PURE__ */ new Set([
  "(",
  ")",
  ",",
  ".",
  ":",
  ";",
  "[",
  "]",
  "{",
  "}"
]);
var WHITESPACE_PATTERN = /\s/u;
var IDENTIFIER_START_PATTERN = /\p{L}|_/u;
var UNICODE_VAR_CHAR_PATTERN = /^[\p{L}\p{N}\-:_]$/u;
var HEX_DIGIT_PATTERN = /[\da-f]/i;
var BINARY_DIGIT_PATTERN = /[01]/;
var DECIMAL_DIGIT_PATTERN = /\d/;
var NUMBER_SUFFIX_PATTERN = /[dflu]/i;
var UNICODE_IDENTIFIER_START_PATTERN = /[\p{L}_]/u;
var UNICODE_IDENTIFIER_CHAR_PATTERN = /[\p{L}\p{N}\-_]/u;
var UNICODE_IDENTIFIER_AFTER_DASH_PATTERN = /[\p{L}-]/u;
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
  const consumeVariableToken = (startPosition) => {
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
  const consumeNumberToken = (startPosition) => {
    let scanIndex = startPosition + 1;
    const firstChar = source[startPosition];
    if (firstChar === "0" && scanIndex < length && (source[scanIndex] === "x" || source[scanIndex] === "X")) {
      scanIndex += 1;
      while (scanIndex < length && HEX_DIGIT_PATTERN.test(source[scanIndex])) {
        scanIndex += 1;
      }
      if (scanIndex < length && /[lu]/i.test(source[scanIndex])) {
        scanIndex += 1;
      }
    } else if (firstChar === "0" && scanIndex < length && (source[scanIndex] === "b" || source[scanIndex] === "B")) {
      scanIndex += 1;
      while (scanIndex < length && BINARY_DIGIT_PATTERN.test(source[scanIndex])) {
        scanIndex += 1;
      }
      if (scanIndex < length && /[lu]/i.test(source[scanIndex])) {
        scanIndex += 1;
      }
      return scanIndex;
    } else {
      while (scanIndex < length && DECIMAL_DIGIT_PATTERN.test(source[scanIndex])) {
        scanIndex += 1;
      }
      if (scanIndex + 1 < length && source[scanIndex] === "." && DECIMAL_DIGIT_PATTERN.test(source[scanIndex + 1])) {
        scanIndex += 2;
        while (scanIndex < length && DECIMAL_DIGIT_PATTERN.test(source[scanIndex])) {
          scanIndex += 1;
        }
      }
      if (scanIndex < length && (source[scanIndex] === "e" || source[scanIndex] === "E")) {
        scanIndex += 1;
        if (scanIndex < length && (source[scanIndex] === "+" || source[scanIndex] === "-")) {
          scanIndex += 1;
        }
        while (scanIndex < length && DECIMAL_DIGIT_PATTERN.test(source[scanIndex])) {
          scanIndex += 1;
        }
      }
      if (scanIndex < length && NUMBER_SUFFIX_PATTERN.test(source[scanIndex])) {
        scanIndex += 1;
      }
    }
    if (scanIndex + 1 < length) {
      const suffix = source.slice(scanIndex, scanIndex + 2).toUpperCase();
      if ([
        "GB",
        "KB",
        "MB",
        "PB",
        "TB"
      ].includes(suffix)) {
        scanIndex += 2;
      }
    }
    return scanIndex;
  };
  const readQuotedString = (startIndex, quoteChar) => {
    let scanIndex = startIndex;
    let escaped = false;
    while (scanIndex < length) {
      const current = source[scanIndex];
      if (escaped) {
        escaped = false;
      } else if (current === "`") {
        escaped = true;
      } else if (current === quoteChar) {
        if (scanIndex + 1 < length && source[scanIndex + 1] === quoteChar) {
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
        if (scanIndex + 1 < length && source[scanIndex] === "#" && source[scanIndex + 1] === ">") {
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
        value: source.slice(start, end)
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
        end: index,
        start,
        type: "comment",
        value: source.slice(start + 1, index).trimEnd()
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
          value: source.slice(start, attributeEnd)
        });
        index = attributeEnd;
        continue;
      }
    }
    if (char === "@" && (source[index + 1] === '"' || source[index + 1] === "'")) {
      const quoteChar = source[index + 1];
      const quote = quoteChar === '"' ? "double" : "single";
      const end = readHereStringEnd(source, index);
      push({
        end,
        quote,
        start,
        type: "heredoc",
        value: source.slice(index, end)
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
        value: source.slice(start, index)
      });
      continue;
    }
    if (char === "@" && (source[index + 1] === "{" || source[index + 1] === "(")) {
      const value = `@${source[index + 1]}`;
      index += 2;
      push({ end: index, start, type: "operator", value });
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
        end: scanIndex,
        start,
        type: "identifier",
        value: source.slice(start, scanIndex)
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
    if (char === "&" && source[index + 1] === "&") {
      index += 2;
      push({ end: index, start, type: "operator", value: "&&" });
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
        value += `&${source[index + 1]}`;
        index += 2;
      }
      push({ end: index, start, type: "operator", value });
      continue;
    }
    if (/[*2-6]/.test(char) && source[index + 1] === ">") {
      let value = `${char}>`;
      index += 2;
      if (source[index] === ">") {
        value += ">";
        index += 1;
      }
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
    if (char === "1" && source[index + 1] === ">" && source[index + 2] === "&" && /[2-6]/.test(source[index + 3])) {
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
        value: source.slice(start, index)
      });
      continue;
    }
    if (/\d/.test(char)) {
      index = consumeNumberToken(start);
      push({
        end: index,
        start,
        type: "number",
        value: source.slice(start, index)
      });
      continue;
    }
    if (char === "-" && source.slice(index, index + 3) === "--%") {
      let endIndex = index + 3;
      while (endIndex < length && source[endIndex] !== "\n" && source[endIndex] !== "\r") {
        endIndex += 1;
      }
      push({
        end: endIndex,
        start,
        type: "operator",
        value: source.slice(start, endIndex)
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
          push({ end: index, start, type: "keyword", value: raw });
        } else if (POWERSHELL_OPERATORS.has(lower)) {
          push({ end: index, start, type: "operator", value: raw });
        } else {
          push({ end: index, start, type: "identifier", value: raw });
        }
        continue;
      }
    }
    index += 1;
    push({ end: index, start, type: "unknown", value: char });
  }
  return tokens;
}
function readAttributeEnd(source, startIndex) {
  let lookahead = startIndex + 1;
  while (lookahead < source.length && WHITESPACE_PATTERN.test(source[lookahead])) {
    lookahead += 1;
  }
  if (lookahead >= source.length || !IDENTIFIER_START_PATTERN.test(source[lookahead])) {
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
function readHereStringEnd(source, startIndex) {
  const quoteChar = source[startIndex + 1];
  let scanIndex = startIndex + 2;
  while (scanIndex < source.length) {
    const maybeClosing = scanIndex + 1 < source.length && source[scanIndex] === quoteChar && source[scanIndex + 1] === "@";
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

// src/parser.ts
var FALLBACK_OPERATOR_TOKENS = /* @__PURE__ */ new Set([
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
  "|="
]);
var Parser = class _Parser {
  constructor(tokens, source) {
    __publicField(this, "tokens", tokens);
    __publicField(this, "source", source);
    __publicField(this, "tokenIndex", 0);
  }
  parseScript(terminators = /* @__PURE__ */ new Set()) {
    const body = [];
    const start = this.tokens.length > 0 ? this.tokens[0].start : 0;
    const appendNode = (node) => {
      if (!node) {
        return;
      }
      const last = body.at(-1);
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
        if (nextToken?.type === "comment" && this.isInlineComment(nextToken)) {
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
        if (body.length > 0 && this.attachCommentToPreviousScriptBlock(body, commentNode)) {
          continue;
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
    const end = body.length > 0 ? body.at(-1).loc.end : start;
    return {
      body,
      loc: { end, start },
      type: "Script"
    };
  }
  advance() {
    this.tokenIndex += 1;
    return this.tokens[this.tokenIndex - 1];
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
  attachCommentToPreviousScriptBlock(body, commentNode) {
    const previousNode = body.at(-1);
    if (previousNode?.type !== "Pipeline") {
      return false;
    }
    const nextToken = this.peekNextNonNewlineToken();
    const lastSegment = previousNode.segments.at(-1);
    const lastPart = lastSegment?.parts.at(-1);
    if (lastPart?.type !== "ScriptBlock" || lastSegment === void 0) {
      return false;
    }
    const closesCurrentBlock = nextToken?.type === "punctuation" && nextToken.value === "}";
    const belongsToBlock = commentNode.loc.start < lastPart.loc.end || closesCurrentBlock;
    if (!belongsToBlock) {
      return false;
    }
    lastPart.body.push(commentNode);
    extendNodeLocation(lastPart, commentNode.loc.end);
    extendNodeLocation(lastSegment, commentNode.loc.end);
    extendNodeLocation(previousNode, commentNode.loc.end);
    return true;
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
  consumeBlankLines() {
    let count = 0;
    const start = this.peek().start;
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
      type: "BlankLine"
    };
  }
  createCommentNode(token, inline) {
    const style = token.type === "block-comment" ? "block" : "line";
    const isInline = style === "line" && inline && this.isInlineComment(token);
    return {
      inline: isInline,
      loc: { end: token.end, start: token.start },
      style,
      type: "Comment",
      value: token.value
    };
  }
  isEOF() {
    return this.tokenIndex >= this.tokens.length;
  }
  isFunctionDeclaration() {
    const token = this.peek();
    return Boolean(
      token?.type === "keyword" && token.value.toLowerCase() === "function"
    );
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
      body,
      header: headerExpression,
      loc: { end, start: startToken.start },
      type: "FunctionDeclaration"
    };
  }
  parseScriptBlock() {
    const openToken = this.peek();
    if (openToken?.type !== "punctuation" || openToken.value !== "{") {
      return {
        body: [],
        loc: { end: openToken?.end ?? 0, start: openToken?.start ?? 0 },
        type: "ScriptBlock"
      };
    }
    this.advance();
    const { closingToken, contentTokens } = this.collectBalancedTokens(openToken);
    const nestedParser = new _Parser(contentTokens, this.source);
    const script = nestedParser.parseScript(/* @__PURE__ */ new Set());
    const closingEnd = closingToken?.end ?? openToken.end;
    const bodyEnd = script.body.length > 0 ? script.body.at(-1).loc.end : closingEnd;
    const end = Math.max(closingEnd, bodyEnd);
    return {
      body: script.body,
      loc: { end, start: openToken.start },
      type: "ScriptBlock"
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
          segments.at(-1).push(newlineToken);
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
        const currentSegment2 = segments.at(-1);
        currentSegment2.push(this.advance());
        continue;
      }
      if (token.type === "block-comment") {
        if (structureStack.length === 0) {
          break;
        }
        const currentSegment2 = segments.at(-1);
        currentSegment2.push(this.advance());
        continue;
      }
      if (token.type === "operator" && token.value === "|") {
        if (structureStack.length > 0) {
          const currentSegment2 = segments.at(-1);
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
      const currentSegment = segments.at(-1);
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
    const end = expressionSegments.at(-1).loc.end;
    const pipelineNode = {
      loc: { end, start },
      segments: expressionSegments,
      type: "Pipeline"
    };
    if (trailingComment) {
      pipelineNode.trailingComment = trailingComment;
    }
    return pipelineNode;
  }
  peek(offset = 0) {
    return this.tokens[this.tokenIndex + offset];
  }
  /**
   * Peeks the next token while skipping contiguous newline tokens.
   */
  peekNextNonNewlineToken() {
    let offset = 0;
    let token = this.peek(offset);
    while (token?.type === "newline") {
      offset += 1;
      token = this.peek(offset);
    }
    return token;
  }
};
function parsePowerShell(source, options) {
  resolveOptions(options);
  const tokens = tokenize(source);
  const parser = new Parser(tokens, source);
  return parser.parseScript();
}
function buildExpressionFromTokens(tokens, source = "") {
  const firstToken = tokens.find((token) => token.type !== "newline");
  let lastToken;
  for (let index2 = tokens.length - 1; index2 >= 0; index2 -= 1) {
    const candidate = tokens[index2];
    if (candidate.type !== "newline") {
      lastToken = candidate;
      break;
    }
  }
  if (!firstToken || !lastToken) {
    return {
      loc: {
        end: tokens.at(-1)?.end ?? 0,
        start: tokens[0]?.start ?? 0
      },
      parts: [],
      type: "Expression"
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
      const { nextIndex, node } = parseHashtablePart(
        tokens,
        index,
        source
      );
      parts.push(node);
      index = nextIndex;
      continue;
    }
    if (token.type === "operator" && token.value === "@(" || token.type === "punctuation" && token.value === "[") {
      const { nextIndex, node } = parseArrayPart(tokens, index, source);
      parts.push(node);
      index = nextIndex;
      continue;
    }
    if (token.type === "punctuation" && token.value === "{") {
      const { nextIndex, node } = parseScriptBlockPart(
        tokens,
        index,
        source
      );
      parts.push(node);
      index = nextIndex;
      continue;
    }
    if (token.type === "punctuation" && token.value === "(") {
      const { nextIndex, node } = parseParenthesisPart(
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
  const expressionEnd = parts.length > 0 ? parts.at(-1).loc.end : lastToken.end;
  return {
    loc: {
      end: expressionEnd,
      start: firstToken.start
    },
    parts,
    type: "Expression"
  };
}
function buildHashtableEntry(tokens, source = "") {
  const leadingComments = [];
  const trailingComments = [];
  const otherTokens = [];
  let equalsIndex = -1;
  let foundEquals = false;
  for (const token of tokens) {
    if (token.type === "comment" || token.type === "block-comment") {
      if (foundEquals) {
        trailingComments.push(token);
      } else {
        leadingComments.push(token);
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
  const end = (valueTokens.at(-1) ?? keyTokens.at(-1))?.end ?? start;
  const entry = {
    key,
    loc: { end, start },
    rawKey: keyExpression,
    type: "HashtableEntry",
    value: valueExpression
  };
  if (leadingComments.length > 0) {
    entry.leadingComments = leadingComments.map((token) => ({
      inline: false,
      loc: { end: token.end, start: token.start },
      style: token.type === "block-comment" ? "block" : "line",
      type: "Comment",
      value: token.value
    }));
  }
  if (trailingComments.length > 0) {
    const trailingNodes = [];
    let referenceEnd = valueTokens.at(-1)?.end ?? keyTokens.at(-1)?.end ?? tokens[0]?.start ?? 0;
    for (const token of trailingComments) {
      const inline = token.type === "comment" && isInlineSpacing(source, referenceEnd, token.start);
      trailingNodes.push({
        inline,
        loc: { end: token.end, start: token.start },
        style: token.type === "block-comment" ? "block" : "line",
        type: "Comment",
        value: token.value
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
          closingToken: token,
          contentTokens,
          endIndex: index + 1
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
function createHereStringNode(token) {
  const quote = token.quote ?? "double";
  return {
    loc: { end: token.end, start: token.start },
    quote,
    type: "HereString",
    value: token.value
  };
}
function createTextNode(token) {
  const tokenTypeToRole = {
    identifier: "word",
    keyword: "keyword",
    number: "number",
    operator: "operator",
    punctuation: "punctuation",
    string: "string",
    variable: "variable"
  };
  let role = tokenTypeToRole[token.type] ?? "unknown";
  if ((role === "unknown" || role === "word") && FALLBACK_OPERATOR_TOKENS.has(token.value)) {
    role = "operator";
  }
  let value = token.value;
  if (token.type === "comment") {
    value = `#${value}`;
  }
  return {
    loc: { end: token.end, start: token.start },
    role,
    type: "Text",
    value
  };
}
function extendNodeLocation(node, end) {
  if (end > node.loc.end) {
    node.loc = { ...node.loc, end };
  }
}
function extractElseContinuation(tokens) {
  let index = 0;
  const prefix = [];
  while (index < tokens.length && (tokens[index].type === "newline" || tokens[index].type === "comment" || tokens[index].type === "block-comment")) {
    prefix.push(tokens[index]);
    index += 1;
  }
  const keywordToken = tokens[index];
  if (keywordToken?.type !== "keyword") {
    return null;
  }
  const keyword = keywordToken.value.toLowerCase();
  if (keyword !== "else" && keyword !== "elseif") {
    return null;
  }
  const captured = [...prefix];
  const stack = [];
  for (; index < tokens.length; index += 1) {
    const token = tokens[index];
    captured.push(token);
    if (token.type === "punctuation" && token.value === "{") {
      stack.push("{");
    } else if (token.type === "punctuation" && token.value === "}") {
      if (stack.length === 0) {
        continue;
      }
      stack.pop();
      if (stack.length === 0) {
        index += 1;
        break;
      }
    }
  }
  if (stack.length > 0) {
    return null;
  }
  return {
    elseTokens: captured,
    remainingTokens: tokens.slice(index)
  };
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
function isClosingToken(token) {
  return token.type === "punctuation" && (token.value === "}" || token.value === ")" || token.value === "]");
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
      case "\uFEFF":
      case "\u200B":
      case "\u2060": {
        break;
      }
      default: {
        return false;
      }
    }
  }
  return true;
}
function isOpeningToken(token) {
  if (token.type === "operator") {
    return token.value === "@{" || token.value === "@(";
  }
  return token.type === "punctuation" && (token.value === "{" || token.value === "(" || token.value === "[");
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
  }
}
function parseArrayPart(tokens, startIndex, source = "") {
  const startToken = tokens[startIndex];
  const { closingToken, contentTokens, endIndex } = collectStructureTokens(
    tokens,
    startIndex
  );
  const elements = splitArrayElements(contentTokens).map(
    (elementTokens) => buildExpressionFromTokens(elementTokens, source)
  );
  const kind = startToken.value === "@(" ? "implicit" : "explicit";
  const end = resolveStructureEnd(startToken, closingToken, contentTokens);
  return {
    nextIndex: endIndex,
    node: {
      elements,
      kind,
      loc: { end, start: startToken.start },
      type: "ArrayLiteral"
    }
  };
}
function parseHashtablePart(tokens, startIndex, source = "") {
  const startToken = tokens[startIndex];
  const { closingToken, contentTokens, endIndex } = collectStructureTokens(
    tokens,
    startIndex
  );
  const entries = splitHashtableEntries(contentTokens).map(
    (entryTokens) => buildHashtableEntry(entryTokens, source)
  );
  const end = closingToken?.end ?? contentTokens.at(-1)?.end ?? startToken.end;
  return {
    nextIndex: endIndex,
    node: {
      entries,
      loc: { end, start: startToken.start },
      type: "Hashtable"
    }
  };
}
function parseParenthesisPart(tokens, startIndex, source = "") {
  const startToken = tokens[startIndex];
  const { closingToken, contentTokens, endIndex } = collectStructureTokens(
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
    nextIndex: endIndex,
    node: {
      elements,
      hasComma,
      hasNewline,
      loc: { end, start: startToken.start },
      type: "Parenthesis"
    }
  };
}
function parseScriptBlockPart(tokens, startIndex, source = "") {
  const startToken = tokens[startIndex];
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
  const bodyEnd = script.body.length > 0 ? script.body.at(-1).loc.end : closingEnd;
  const end = Math.max(closingEnd, bodyEnd);
  return {
    nextIndex: endIndex,
    node: {
      body: script.body,
      loc: { end, start: startToken.start },
      type: "ScriptBlock"
    }
  };
}
function resolveStructureEnd(startToken, closingToken, contentTokens) {
  if (closingToken) {
    return closingToken.end;
  }
  const lastContent = contentTokens.length > 0 ? contentTokens.at(-1) : void 0;
  if (lastContent) {
    return lastContent.end;
  }
  return startToken.end;
}
function shouldMergeNodes(previous, next) {
  return previous.type === "Pipeline" && next.type === "Comment" && next.inline || previous.type === "BlankLine" && next.type === "BlankLine";
}
function splitArrayElements(tokens) {
  return splitTopLevelTokens(tokens, {
    delimiterValues: [","],
    splitOnNewline: (context) => context.current.length > 0
  });
}
function splitHashtableEntries(tokens) {
  const rawSegments = splitTopLevelTokens(tokens, {
    createInitialState: () => ({
      hasEquals: false,
      justSawEquals: false,
      pendingComments: []
    }),
    delimiterValues: [";"],
    onAfterAddToken: (context) => {
      const { state, token, topLevel } = context;
      if (topLevel && token.type === "operator" && token.value === "=") {
        state.hasEquals = true;
        state.justSawEquals = true;
        return;
      }
      if (token.type !== "newline" && token.type !== "comment" && token.type !== "block-comment") {
        state.justSawEquals = false;
      }
    },
    onBeforeAddToken: (context) => {
      if (context.state.pendingComments.length > 0) {
        context.current.push(...context.state.pendingComments);
        context.state.pendingComments = [];
      }
    },
    onFlush: (segment, state, segments2) => {
      if (state.pendingComments.length > 0) {
        if (segment.length > 0) {
          segment.push(...state.pendingComments);
        } else if (segments2.length > 0) {
          segments2.at(-1).push(...state.pendingComments);
        }
        state.pendingComments = [];
      }
      state.hasEquals = false;
      state.justSawEquals = false;
      return segment;
    },
    onToken: (context) => {
      if (context.token.type === "comment" || context.token.type === "block-comment") {
        context.state.pendingComments.push(context.token);
        return "skip";
      }
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
    }
  });
  const segments = [];
  for (const segment of rawSegments) {
    if (segments.length > 0) {
      const continuation = extractElseContinuation(segment);
      if (continuation) {
        segments.at(-1).push(...continuation.elseTokens);
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
      current,
      stack,
      state,
      token,
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
      current,
      stack,
      state,
      token,
      topLevel: stack.length === 0
    });
  }
  flush(true);
  return result;
}
var locStart = (node) => node.loc.start;
var locEnd = (node) => node.loc.end;
var {
  align,
  dedentToRoot,
  group,
  hardline,
  ifBreak,
  indent,
  join,
  line,
  lineSuffix,
  softline
} = prettier.doc.builders;
var powerShellPrinter = {
  print(path, options) {
    const node = path.node;
    if (node === void 0) {
      return "";
    }
    const resolved = resolveOptions(options);
    return printNode(node, resolved);
  }
};
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
    if (previous?.type === "Text") {
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
function indentStatement(docToIndent, options) {
  const indentUnit = options.indentStyle === "tabs" ? "	" : " ".repeat(options.indentSize);
  return [indentUnit, align(indentUnit.length, docToIndent)];
}
function isParamStatement(node) {
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
function looksLikeCommentText(text) {
  const trimmed = text.trim();
  if (trimmed.length <= MINIMUM_COMMENT_LENGTH) {
    return false;
  }
  if (trimmed.startsWith("$") || trimmed.startsWith("[") || trimmed.startsWith("(") || trimmed.startsWith("{") || trimmed.startsWith("@")) {
    return false;
  }
  if (trimmed.includes("=") || trimmed.includes("->") || trimmed.includes("::") || /\b(?:foreach|function|if|param|while)\b/i.test(trimmed)) {
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
      if (next?.type === "Text" && next.role === "operator") {
        const combinedValue = current.value + next.value;
        if (CONCATENATED_OPERATOR_PAIRS.has(combinedValue)) {
          normalizedParts.push({
            ...current,
            loc: { end: next.loc.end, start: current.loc.start },
            value: combinedValue
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
    let part = normalizedParts[index];
    if (part.type === "Text" && part.role === "keyword" && previous?.type === "Text" && (previous.value === "." || previous.value === "::")) {
      part = {
        ...part,
        role: "word"
      };
    }
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
      if (part.type === "Parenthesis" && previous.type === "Text" && index >= 2) {
        const beforeWord = normalizedParts[index - 2];
        if (beforeWord?.type === "Text" && (beforeWord.value === "." || beforeWord.value === "::")) {
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
function printNode(node, options) {
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
      return [];
    }
  }
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
    pipelineDoc = shouldAlwaysBreak ? [segmentDocs[0], indent(restDocs.flat())] : group([segmentDocs[0], indent(restDocs.flat())]);
  }
  if (node.trailingComment) {
    pipelineDoc = node.trailingComment.inline ? [pipelineDoc, lineSuffix([" #", node.trailingComment.value])] : [
      pipelineDoc,
      hardline,
      printComment(node.trailingComment)
    ];
  }
  return pipelineDoc;
}
function printScript(node, options) {
  const bodyDoc = printStatementList(node.body, options, false);
  return [bodyDoc, hardline];
}
function printScriptBlock(node, options) {
  if (node.body.length === 0) {
    return group(["{", "}"]);
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
var NO_SPACE_BEFORE = /* @__PURE__ */ new Set([
  ")",
  ",",
  ".",
  ":",
  "::",
  ";",
  "<",
  ">",
  "]",
  "}"
]);
var NO_SPACE_AFTER = /* @__PURE__ */ new Set([
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
  "{"
]);
var MINIMUM_COMMENT_LENGTH = 10;
var SYMBOL_NO_GAP = /* @__PURE__ */ new Set([
  ".:word",
  "::word",
  "word:(",
  "word:["
]);
var CONCATENATED_OPERATOR_PAIRS = /* @__PURE__ */ new Set([
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
  "|="
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
    node?.type === "Text" && node.value.toLowerCase() === "param"
  );
}
var KEYWORD_CASE_TRANSFORMS = {
  lower: (value) => value.toLowerCase(),
  pascal: (value) => value.length === 0 ? value : value[0].toUpperCase() + value.slice(1).toLowerCase(),
  preserve: (value) => value,
  upper: (value) => value.toUpperCase()
};
var CMDLET_ALIAS_MAP = {
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
  write: "Write-Output"
};
var DISALLOWED_CMDLET_REWRITE = /* @__PURE__ */ new Map([["write-host", "Write-Output"]]);
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
function isSimpleExpression(node) {
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
function printArray(node, options) {
  const open = node.kind === "implicit" ? "@(" : "[";
  const close = node.kind === "implicit" ? ")" : "]";
  if (node.elements.length === 0) {
    return group([open, close]);
  }
  const groupId = /* @__PURE__ */ Symbol("array");
  const elementDocs = [];
  for (let index = 0; index < node.elements.length; index += 1) {
    const element = node.elements[index];
    if (isCommentExpression(element)) {
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
    elementDocs.push(printed);
  }
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
function printComment(node) {
  if (node.style === "block") {
    return node.value;
  }
  return ["#", node.value];
}
function printHashtable(node, options) {
  const entries = options.sortHashtableKeys ? sortHashtableEntries(node.entries) : node.entries;
  if (entries.length === 0) {
    return group(["@{}"]);
  }
  const groupId = /* @__PURE__ */ Symbol("hashtable");
  const contentDocs = [];
  for (const [index, entry] of entries.entries()) {
    const entryDoc = printHashtableEntry(entry, options);
    const isLast = index === entries.length - 1;
    const separator = isLast ? trailingCommaDoc(options, groupId, true, ";") : ifBreak("", ";", { groupId });
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
  const startsWithKeyword = firstPart?.type === "Text" && firstPart.role === "keyword" && /^(?:for|foreach|if|switch|while)$/i.test(firstPart.value);
  let entryDoc = startsWithKeyword ? group([
    keyDoc,
    " = ",
    valueDoc
  ]) : group([
    keyDoc,
    " =",
    indent([line, valueDoc])
  ]);
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
      entryDoc = comment.inline ? [entryDoc, lineSuffix([" ", printComment(comment)])] : [
        entryDoc,
        hardline,
        printComment(comment)
      ];
    }
  }
  return entryDoc;
}
function printHereString(node) {
  return dedentToRoot(node.value);
}
function printParamParenthesis(node, options) {
  if (node.elements.length === 0) {
    return group(["(", ")"]);
  }
  if (node.elements.length <= 1 && !node.hasNewline) {
    return group([
      "(",
      indent([softline, printExpression(node.elements[0], options)]),
      softline,
      ")"
    ]);
  }
  const groupId = /* @__PURE__ */ Symbol("param");
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
function printParenthesis(node, options) {
  if (node.elements.length === 0) {
    return group(["(", ")"]);
  }
  const groupId = /* @__PURE__ */ Symbol("parenthesis");
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
    if (Object.hasOwn(CMDLET_ALIAS_MAP, aliasKey)) {
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
function sortHashtableEntries(entries) {
  const ordered = [];
  for (const entry of entries) {
    const insertionIndex = ordered.findIndex(
      (candidate) => entry.key.localeCompare(candidate.key, void 0, {
        sensitivity: "base"
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
function trailingCommaDoc(options, groupId, hasElements, delimiter) {
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
function normalizeStringLiteral(value, options) {
  if (!options.preferSingleQuote) {
    return value;
  }
  if (!value.startsWith('"') || !value.endsWith('"')) {
    return value;
  }
  const inner = value.slice(1, -1);
  if (/^\(\?[Uimsx]/.test(inner) || inner.includes("[") && inner.includes("]") || /\bWrite-(?:Error|Host|Output|Warning)\b/.test(inner)) {
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
function shouldSkipPart(part) {
  if (part.type === "Text") {
    const trimmed = part.value.trim();
    if (trimmed === "`") {
      return true;
    }
  }
  return false;
}

// src/plugin.ts
var languages = [
  {
    aceMode: "powershell",
    extensions: [
      ".ps1",
      ".psm1",
      ".psd1"
    ],
    linguistLanguageId: 131,
    name: "PowerShell",
    parsers: ["powershell"],
    tmScope: "source.powershell",
    vscodeLanguageIds: ["powershell"]
  }
];
var parsers = {
  powershell: {
    astFormat: "powershell-ast",
    hasPragma() {
      return false;
    },
    locEnd,
    locStart,
    parse: parsePowerShell
  }
};
var printers = {
  "powershell-ast": powerShellPrinter
};
var plugin = {
  defaultOptions,
  languages,
  options: pluginOptions,
  parsers,
  printers
};
exports.default = plugin;

module.exports = exports.default;
//# sourceMappingURL=plugin.cjs.map

module.exports = exports.default;
//# sourceMappingURL=plugin.cjs.map