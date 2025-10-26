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
  TextNode
} from './ast.js';
import type { Token } from './tokenizer.js';
import { tokenize } from './tokenizer.js';
import type { ParserOptions } from 'prettier';
import { resolveOptions } from './options.js';

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[], private readonly source: string) {}

  parseScript(terminators: Set<string> = new Set()): ScriptNode {
    const body: ScriptBodyNode[] = [];
    const start = this.tokens.length > 0 ? this.tokens[0]!.start : 0;

    while (!this.isEOF()) {
      const token = this.peek();
      if (!token) {
        break;
      }

      if (terminators.has(token.value) && token.type === 'punctuation') {
        break;
      }

      if (token.type === 'newline') {
        const blank = this.consumeBlankLines();
        if (blank) {
          body.push(blank);
        }
        continue;
      }

      if (token.type === 'comment') {
        const commentToken = this.advance();
        body.push(this.createCommentNode(commentToken, false));
        continue;
      }

      if (this.isFunctionDeclaration()) {
        body.push(this.parseFunction());
        continue;
      }

      const statement = this.parseStatement();
      if (statement) {
        body.push(statement);
      } else {
        // avoid infinite loops
        this.advance();
      }
    }

    const end = body.length > 0 ? body[body.length - 1]!.loc.end : start;
    return {
      type: 'Script',
      body,
      loc: { start, end }
    } satisfies ScriptNode;
  }

  private parseFunction(): FunctionDeclarationNode {
    const startToken = this.advance(); // function keyword
    const headerTokens: Token[] = [startToken];

    while (!this.isEOF()) {
      const token = this.peek();
      if (!token) {
        break;
      }
      if (token.type === 'comment') {
        break;
      }
      if (token.type === 'punctuation' && token.value === '{') {
        break;
      }
      headerTokens.push(this.advance());
    }

    const headerExpression = buildExpressionFromTokens(headerTokens);
    const body = this.parseScriptBlock();
    const end = body.loc.end;

    return {
      type: 'FunctionDeclaration',
      header: headerExpression,
      body,
      loc: { start: startToken.start, end }
    } satisfies FunctionDeclarationNode;
  }

  private parseStatement(): PipelineNode | null {
    const startToken = this.peek();
    if (!startToken) {
      return null;
    }

    const segments: Token[][] = [[]];
    let trailingComment: CommentNode | undefined;

    const structureStack: string[] = [];
    let lineContinuation = false;

    while (!this.isEOF()) {
      const token = this.peek();
      if (!token) {
        break;
      }

      if (token.type === 'newline') {
        if (lineContinuation) {
          this.advance();
          lineContinuation = false;
          continue;
        }
        if (structureStack.length > 0) {
          const newlineToken = this.advance();
          segments[segments.length - 1]!.push(newlineToken);
          continue;
        }
        if (structureStack.length === 0 && this.isPipelineContinuationAfterNewline()) {
          this.advance();
          continue;
        }
        break;
      }

      if (token.type === 'punctuation' && token.value === ';' && structureStack.length === 0) {
        this.advance();
        break;
      }

      if (token.type === 'punctuation' && token.value === '}' && structureStack.length === 0) {
        break;
      }

      if (token.type === 'comment') {
        trailingComment = this.createCommentNode(this.advance(), true);
        break;
      }

      if (token.type === 'operator' && token.value === '|') {
        this.advance();
        segments.push([]);
        lineContinuation = false;
        continue;
      }

      if (token.type === 'unknown' && token.value === '`') {
        this.advance();
        lineContinuation = true;
        continue;
      }

      const currentSegment = segments[segments.length - 1]!;
      currentSegment.push(this.advance());
      lineContinuation = false;

      if (isOpeningToken(token)) {
        structureStack.push(token.value);
      } else if (isClosingToken(token)) {
        structureStack.pop();
      }
    }

    const filteredSegments = segments.filter((segment) => segment.length > 0);
    if (filteredSegments.length === 0) {
      return null;
    }

    const expressionSegments = filteredSegments.map((segmentTokens) =>
      buildExpressionFromTokens(segmentTokens),
    );
    const end = expressionSegments[expressionSegments.length - 1]!.loc.end;

    return {
      type: 'Pipeline',
      segments: expressionSegments,
      trailingComment,
      loc: { start: startToken.start, end }
    } satisfies PipelineNode;
  }

  private parseScriptBlock(): ScriptBlockNode {
    const openToken = this.peek();
    if (!openToken || openToken.type !== 'punctuation' || openToken.value !== '{') {
      return {
        type: 'ScriptBlock',
        body: [],
        loc: { start: openToken?.start ?? 0, end: openToken?.end ?? 0 }
      } satisfies ScriptBlockNode;
    }
    this.advance();

    const { contentTokens, closingToken } = this.collectBalancedTokens(openToken);
    const nestedParser = new Parser(contentTokens, this.source);
    const script = nestedParser.parseScript(new Set());
    const end = closingToken?.end ?? openToken.end;

    return {
      type: 'ScriptBlock',
      body: script.body,
      loc: { start: openToken.start, end }
    } satisfies ScriptBlockNode;
  }

  private collectBalancedTokens(startToken: Token): { contentTokens: Token[]; closingToken?: Token } {
    const contentTokens: Token[] = [];
    const stack: string[] = [startToken.value];

    while (!this.isEOF()) {
      const token = this.advance();
      if (!token) {
        break;
      }

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

  private consumeBlankLines(): BlankLineNode | null {
    let count = 0;
    let start = this.peek()?.start ?? 0;
    let end = start;
    while (!this.isEOF()) {
      const token = this.peek();
      if (!token || token.type !== 'newline') {
        break;
      }
      const current = this.advance();
      count += 1;
      end = current.end;
    }
    if (count === 0) {
      return null;
    }
    return {
      type: 'BlankLine',
      count,
      loc: { start, end }
    } satisfies BlankLineNode;
  }

  private createCommentNode(token: Token, inline: boolean): CommentNode {
    return {
      type: 'Comment',
      value: token.value,
      inline,
      loc: { start: token.start, end: token.end }
    } satisfies CommentNode;
  }

  private isPipelineContinuationAfterNewline(): boolean {
    let offset = 1;
    while (true) {
      const next = this.peek(offset);
      if (!next) {
        return false;
      }
      if (next.type === 'newline') {
        offset += 1;
        continue;
      }
      if (next.type === 'comment') {
        return false;
      }
      if (next.type === 'operator' && next.value === '|') {
        return true;
      }
      return false;
    }
  }

  private isFunctionDeclaration(): boolean {
    const token = this.peek();
    return Boolean(token && token.type === 'keyword' && token.value.toLowerCase() === 'function');
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.index + offset];
  }

  private advance(): Token {
    const token = this.tokens[this.index];
    this.index += 1;
    return token!;
  }

  private isEOF(): boolean {
    return this.index >= this.tokens.length;
  }
}

function isOpeningToken(token: Token): boolean {
  if (token.type === 'operator') {
    return token.value === '@{' || token.value === '@(';
  }
  return token.type === 'punctuation' && (token.value === '{' || token.value === '(' || token.value === '[');
}

function isClosingToken(token: Token): boolean {
  return token.type === 'punctuation' && (token.value === '}' || token.value === ')' || token.value === ']');
}

function buildExpressionFromTokens(tokens: Token[]): ExpressionNode {
  const firstToken = tokens.find((token) => token.type !== 'newline');
  const lastToken = [...tokens].reverse().find((token) => token.type !== 'newline');
  if (!firstToken || !lastToken) {
    return {
      type: 'Expression',
      parts: [],
      loc: { start: tokens[0]?.start ?? 0, end: tokens[tokens.length - 1]?.end ?? 0 }
    } satisfies ExpressionNode;
  }

  const parts: ExpressionPartNode[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index]!;

    if (token.type === 'newline') {
      index += 1;
      continue;
    }

    if (token.type === 'operator' && token.value === '@{') {
      const { node, nextIndex } = parseHashtablePart(tokens, index);
      parts.push(node);
      index = nextIndex;
      continue;
    }

    if (
      (token.type === 'operator' && token.value === '@(') ||
      (token.type === 'punctuation' && token.value === '[')
    ) {
      const { node, nextIndex } = parseArrayPart(tokens, index);
      parts.push(node);
      index = nextIndex;
      continue;
    }

    if (token.type === 'punctuation' && token.value === '{') {
      const { node, nextIndex } = parseScriptBlockPart(tokens, index);
      parts.push(node);
      index = nextIndex;
      continue;
    }

    if (token.type === 'punctuation' && token.value === '(') {
      const { node, nextIndex } = parseParenthesisPart(tokens, index);
      parts.push(node);
      index = nextIndex;
      continue;
    }

    if (token.type === 'heredoc') {
      parts.push(createHereStringNode(token));
      index += 1;
      continue;
    }

    parts.push(createTextNode(token));
    index += 1;
  }

  return {
    type: 'Expression',
    parts,
    loc: {
      start: firstToken.start,
      end: lastToken.end
    }
  } satisfies ExpressionNode;
}

function parseHashtablePart(tokens: Token[], startIndex: number): { node: HashtableNode; nextIndex: number } {
  const startToken = tokens[startIndex]!;
  const { contentTokens, endIndex, closingToken } = collectStructureTokens(tokens, startIndex);
  const entries = splitHashtableEntries(contentTokens).map((entryTokens) =>
    buildHashtableEntry(entryTokens),
  );
  const end = closingToken?.end ?? (contentTokens[contentTokens.length - 1]?.end ?? startToken.end);
  return {
    node: {
      type: 'Hashtable',
      entries,
      loc: { start: startToken.start, end }
    },
    nextIndex: endIndex
  };
}

function parseArrayPart(tokens: Token[], startIndex: number): { node: ArrayLiteralNode; nextIndex: number } {
  const startToken = tokens[startIndex]!;
  const { contentTokens, endIndex, closingToken } = collectStructureTokens(tokens, startIndex);
  const elements = splitArrayElements(contentTokens).map((elementTokens) =>
    buildExpressionFromTokens(elementTokens),
  );
  const kind = startToken.value === '@(' ? 'implicit' : 'explicit';
  const end = closingToken?.end ?? (contentTokens[contentTokens.length - 1]?.end ?? startToken.end);
  return {
    node: {
      type: 'ArrayLiteral',
      elements,
      kind,
      loc: { start: startToken.start, end }
    },
    nextIndex: endIndex
  } satisfies { node: ArrayLiteralNode; nextIndex: number };
}

function parseParenthesisPart(tokens: Token[], startIndex: number): { node: ParenthesisNode; nextIndex: number } {
  const startToken = tokens[startIndex]!;
  const { contentTokens, endIndex, closingToken } = collectStructureTokens(tokens, startIndex);
  const elements = splitArrayElements(contentTokens).map((elementTokens) =>
    buildExpressionFromTokens(elementTokens),
  );
  const hasComma = hasTopLevelComma(contentTokens);
  const hasNewline = contentTokens.some((token) => token.type === 'newline');
  const end = closingToken?.end ?? (contentTokens[contentTokens.length - 1]?.end ?? startToken.end);
  return {
    node: {
      type: 'Parenthesis',
      elements,
      hasComma,
      hasNewline,
      loc: { start: startToken.start, end }
    },
    nextIndex: endIndex
  };
}

function parseScriptBlockPart(tokens: Token[], startIndex: number): { node: ScriptBlockNode; nextIndex: number } {
  const startToken = tokens[startIndex]!;
  const { contentTokens, endIndex, closingToken } = collectStructureTokens(tokens, startIndex);
  const nestedParser = new Parser(contentTokens, '');
  const script = nestedParser.parseScript();
  const end = closingToken?.end ?? (contentTokens[contentTokens.length - 1]?.end ?? startToken.end);
  return {
    node: {
      type: 'ScriptBlock',
      body: script.body,
      loc: { start: startToken.start, end }
    },
    nextIndex: endIndex
  };
}

function createHereStringNode(token: Token): HereStringNode {
  const quote = token.quote ?? 'double';
  return {
    type: 'HereString',
    quote,
    value: token.value,
    loc: { start: token.start, end: token.end }
  } satisfies HereStringNode;
}

function createTextNode(token: Token): TextNode {
  const role = token.type === 'identifier'
    ? 'word'
    : token.type === 'keyword'
    ? 'keyword'
    : token.type === 'number'
    ? 'number'
    : token.type === 'variable'
    ? 'variable'
    : token.type === 'string'
    ? 'string'
    : token.type === 'operator'
    ? 'operator'
    : token.type === 'punctuation'
    ? 'punctuation'
    : 'unknown';

  return {
    type: 'Text',
    value: token.value,
    role,
    loc: { start: token.start, end: token.end }
  } satisfies TextNode;
}

function collectStructureTokens(
  tokens: Token[],
  startIndex: number
): { contentTokens: Token[]; endIndex: number; closingToken?: Token } {
  const contentTokens: Token[] = [];
  const stack: string[] = [tokens[startIndex]!.value];
  let index = startIndex + 1;

  while (index < tokens.length) {
    const token = tokens[index]!;

    if (isOpeningToken(token)) {
      stack.push(token.value);
      contentTokens.push(token);
      index += 1;
      continue;
    }

    if (isClosingToken(token)) {
      if (stack.length === 1) {
        return { contentTokens, endIndex: index + 1, closingToken: token };
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

function splitHashtableEntries(tokens: Token[]): Token[][] {
  const entries: Token[][] = [];
  let current: Token[] = [];
  const stack: string[] = [];

  for (const token of tokens) {
    if (token.type === 'newline' && stack.length === 0) {
      if (current.length > 0) {
        entries.push(current);
        current = [];
      }
      continue;
    }

    if (token.type === 'punctuation' && token.value === ';' && stack.length === 0) {
      if (current.length > 0) {
        entries.push(current);
        current = [];
      }
      continue;
    }

    if (isOpeningToken(token)) {
      stack.push(token.value);
      current.push(token);
      continue;
    }

    if (isClosingToken(token)) {
      if (stack.length > 0) {
        stack.pop();
      }
      current.push(token);
      continue;
    }

    current.push(token);
  }

  if (current.length > 0) {
    entries.push(current);
  }

  return entries;
}

function buildHashtableEntry(tokens: Token[]): HashtableEntryNode {
  const equalsIndex = findTopLevelEquals(tokens);
  const keyTokens = equalsIndex === -1 ? tokens : tokens.slice(0, equalsIndex);
  const valueTokens = equalsIndex === -1 ? [] : tokens.slice(equalsIndex + 1);
  const keyExpression = buildExpressionFromTokens(keyTokens);
  const valueExpression = valueTokens.length > 0 ? buildExpressionFromTokens(valueTokens) : buildExpressionFromTokens([]);
  const key = extractKeyText(keyTokens);
  const start = keyTokens[0]?.start ?? (valueTokens[0]?.start ?? 0);
  const end = (valueTokens[valueTokens.length - 1] ?? keyTokens[keyTokens.length - 1])?.end ?? start;

  return {
    type: 'HashtableEntry',
    key,
    rawKey: keyExpression,
    value: valueExpression,
    loc: { start, end }
  } satisfies HashtableEntryNode;
}

function findTopLevelEquals(tokens: Token[]): number {
  const stack: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (isOpeningToken(token)) {
      stack.push(token.value);
      continue;
    }
    if (isClosingToken(token)) {
      stack.pop();
      continue;
    }
    if (stack.length === 0 && token.type === 'operator' && token.value === '=') {
      return index;
    }
  }
  return -1;
}

function extractKeyText(tokens: Token[]): string {
  const text = tokens
    .filter((token) => token.type !== 'newline')
    .map((token) => token.value)
    .join(' ')
    .trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1);
  }
  if (text.startsWith('\'') && text.endsWith('\'')) {
    return text.slice(1, -1);
  }
  return text;
}

function splitArrayElements(tokens: Token[]): Token[][] {
  const elements: Token[][] = [];
  let current: Token[] = [];
  const stack: string[] = [];

  for (const token of tokens) {
    if (token.type === 'newline' && stack.length === 0) {
      if (current.length > 0) {
        elements.push(current);
        current = [];
      }
      continue;
    }

    if (token.type === 'punctuation' && token.value === ',' && stack.length === 0) {
      elements.push(current);
      current = [];
      continue;
    }

    if (isOpeningToken(token)) {
      stack.push(token.value);
      current.push(token);
      continue;
    }

    if (isClosingToken(token)) {
      if (stack.length > 0) {
        stack.pop();
      }
      current.push(token);
      continue;
    }

    current.push(token);
  }

  if (current.length > 0) {
    elements.push(current);
  }

  return elements;
}

function hasTopLevelComma(tokens: Token[]): boolean {
  const stack: string[] = [];
  for (const token of tokens) {
    if (isOpeningToken(token)) {
      stack.push(token.value);
      continue;
    }
    if (isClosingToken(token)) {
      if (stack.length > 0) {
        stack.pop();
      }
      continue;
    }
    if (stack.length === 0 && token.type === 'punctuation' && token.value === ',') {
      return true;
    }
  }
  return false;
}

export function parsePowerShell(source: string, options: ParserOptions): ScriptNode {
  resolveOptions(options);
  const tokens = tokenize(source);
  const parser = new Parser(tokens, source);
  return parser.parseScript();
}

export const locStart = (node: { loc: { start: number } }): number => node.loc.start;
export const locEnd = (node: { loc: { end: number } }): number => node.loc.end;
