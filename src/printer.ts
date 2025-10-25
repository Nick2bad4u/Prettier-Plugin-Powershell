import type { AstPath, Doc, ParserOptions, Printer } from 'prettier';
import { doc } from 'prettier';
import {
  type ArrayLiteralNode,
  type BlankLineNode,
  type CommentNode,
  type ExpressionNode,
  type ExpressionPartNode,
  type FunctionDeclarationNode,
  type HashtableEntryNode,
  type HashtableNode,
  type HereStringNode,
  type ParenthesisNode,
  type PipelineNode,
  type ScriptBlockNode,
  type ScriptBodyNode,
  type ScriptNode,
  type TextNode
} from './ast.js';
import { resolveOptions, type ResolvedOptions } from './options.js';

const { group, indent, line, softline, hardline, join, ifBreak, lineSuffix, dedentToRoot } =
  doc.builders;

export const powerShellPrinter: Printer<ScriptNode> = {
  print(path: AstPath, options: ParserOptions) {
    const node = path.getValue() as ScriptNode | ScriptBodyNode | ExpressionPartNode | undefined;
    if (!node) {
      return '';
    }
    const resolved = resolveOptions(options);
    return printNode(node, resolved);
  }
};

function printNode(
  node:
    | ScriptNode
    | ScriptBodyNode
    | ExpressionNode
    | ExpressionPartNode
    | HashtableEntryNode,
  options: ResolvedOptions
): Doc {
  switch (node.type) {
    case 'Script':
      return printScript(node, options);
    case 'ScriptBlock':
      return printScriptBlock(node, options);
    case 'FunctionDeclaration':
      return printFunction(node, options);
    case 'Pipeline':
      return printPipeline(node, options);
    case 'Expression':
      return printExpression(node, options);
    case 'Text':
      return printText(node);
    case 'Comment':
      return printComment(node);
    case 'BlankLine':
      return Array.from({ length: node.count }, () => hardline);
    case 'ArrayLiteral':
      return printArray(node, options);
    case 'Hashtable':
      return printHashtable(node, options);
    case 'HashtableEntry':
      return printHashtableEntry(node, options);
    case 'HereString':
      return printHereString(node);
    case 'Parenthesis':
      return printParenthesis(node, options);
    default:
      return '';
  }
}

function concatDocs(docs: Doc[]): Doc {
  if (docs.length === 0) {
    return '';
  }
  let acc: Doc = docs[0]!;
  for (let index = 1; index < docs.length; index += 1) {
    acc = [acc, docs[index]!] as Doc;
  }
  return acc;
}

function printScript(node: ScriptNode, options: ResolvedOptions): Doc {
  const bodyDoc = printStatementList(node.body, options);
  if (!bodyDoc) {
    return '';
  }
  return [bodyDoc, hardline];
}

function printStatementList(body: ScriptBodyNode[], options: ResolvedOptions): Doc {
  const docs: Doc[] = [];
  let previous: ScriptBodyNode | null = null;
  let pendingBlankLines = 0;

  for (const entry of body) {
    if (entry.type === 'BlankLine') {
      pendingBlankLines += entry.count;
      continue;
    }

    if (previous) {
      const blankLines = determineBlankLines(previous, entry, pendingBlankLines, options);
      for (let index = 0; index < blankLines; index += 1) {
        docs.push(hardline);
      }
    }

    docs.push(printNode(entry, options));
    previous = entry;
    pendingBlankLines = 0;
  }

  return concatDocs(docs);
}

function determineBlankLines(
  previous: ScriptBodyNode,
  current: ScriptBodyNode,
  pendingBlankLines: number,
  options: ResolvedOptions
): number {
  let base = pendingBlankLines > 0 ? pendingBlankLines : 1;
  const desiredFunctionSpacing = options.blankLinesBetweenFunctions + 1;

  if (
    (previous.type === 'FunctionDeclaration' && current.type === 'FunctionDeclaration') ||
    (previous.type === 'FunctionDeclaration' && current.type !== 'BlankLine') ||
    (current.type === 'FunctionDeclaration' && previous.type !== 'BlankLine')
  ) {
    base = Math.max(base, desiredFunctionSpacing);
  }

  if (options.blankLineAfterParam && isParamStatement(previous)) {
    base = Math.max(base, 2);
  }

  return base;
}

function printScriptBlock(node: ScriptBlockNode, options: ResolvedOptions): Doc {
  if (node.body.length === 0) {
    return '{}';
  }

  const bodyDoc = printStatementList(node.body, options);
  return group([
    '{',
    indent([hardline, bodyDoc]),
    hardline,
    '}'
  ]);
}

function printFunction(node: FunctionDeclarationNode, options: ResolvedOptions): Doc {
  const headerDoc = printExpression(node.header, options);
  const bodyDoc = printScriptBlock(node.body, options);
  return group([headerDoc, ' ', bodyDoc]);
}

function printPipeline(node: PipelineNode, options: ResolvedOptions): Doc {
  const segmentDocs = node.segments.map((segment) => printExpression(segment, options));
  if (segmentDocs.length === 0) {
    return '';
  }

  let pipelineDoc: Doc = segmentDocs[0]!;

  if (segmentDocs.length > 1) {
    const restDocs = segmentDocs.slice(1).map((segmentDoc) => ['| ', segmentDoc] as Doc);
    pipelineDoc = group([
      segmentDocs[0]!,
      indent(restDocs.flatMap((docItem) => [line, docItem]))
    ]);
  }

  if (node.trailingComment) {
    pipelineDoc = [pipelineDoc, lineSuffix([' #', node.trailingComment.value])];
  }

  return pipelineDoc;
}

function printExpression(node: ExpressionNode, options: ResolvedOptions): Doc {
  const docs: Doc[] = [];
  let previous: ExpressionPartNode | null = null;

  for (const part of node.parts) {
    if (part.type === 'Parenthesis' && isParamKeyword(previous)) {
      docs.push(printParamParenthesis(part, options));
      previous = part;
      continue;
    }

    if (previous && shouldInsertSpace(previous, part)) {
      docs.push(' ');
    }
    docs.push(printNode(part, options));
    previous = part;
  }

  return docs.length === 0 ? '' : group(docs);
}

function shouldInsertSpace(previous: ExpressionPartNode, current: ExpressionPartNode): boolean {
  const prevSymbol = getSymbol(previous);
  const currentSymbol = getSymbol(current);

  if (current.type === 'Parenthesis') {
    if (previous.type === 'Text' && previous.value.toLowerCase() === 'param') {
      return false;
    }
    if (previous.type === 'Text' && previous.role === 'keyword') {
      return true;
    }
    return true;
  }

  if (previous.type === 'Parenthesis') {
    if (currentSymbol && NO_SPACE_BEFORE.has(currentSymbol)) {
      return false;
    }
    return true;
  }

  if (!prevSymbol && !currentSymbol) {
    return true;
  }

  if (!prevSymbol) {
    if (currentSymbol && NO_SPACE_BEFORE.has(currentSymbol)) {
      return false;
    }
    return true;
  }

  if (NO_SPACE_AFTER.has(prevSymbol)) {
    return false;
  }

  if (currentSymbol && NO_SPACE_BEFORE.has(currentSymbol)) {
    return false;
  }

  if (prevSymbol && currentSymbol && SYMBOL_NO_GAP.has(`${prevSymbol}:${currentSymbol}`)) {
    return false;
  }

  if (prevSymbol === '=' || currentSymbol === '=') {
    return true;
  }

  if (current.type === 'ScriptBlock' || current.type === 'Hashtable' || current.type === 'ArrayLiteral') {
    if (prevSymbol && NO_SPACE_BEFORE_BLOCK.has(prevSymbol)) {
      return false;
    }
    return true;
  }

  return true;
}

function isParamStatement(node: ScriptBodyNode | null): boolean {
  if (!node || node.type !== 'Pipeline') {
    return false;
  }
  if (node.segments.length === 0) {
    return false;
  }
  const firstSegment = node.segments[0]!;
  if (firstSegment.parts.length === 0) {
    return false;
  }
  const firstPart = firstSegment.parts.find((part) => part.type === 'Text');
  if (!firstPart || firstPart.type !== 'Text') {
    return false;
  }
  return firstPart.value.toLowerCase() === 'param';
}

const NO_SPACE_BEFORE = new Set([')', ']', '}', ',', ';', '.', '::']);
const NO_SPACE_AFTER = new Set(['(', '[', '{', '.']);
const NO_SPACE_BEFORE_BLOCK = new Set(['(', '{', '=']);
const SYMBOL_NO_GAP = new Set(['.:word', '::word', 'word:(', 'word:[']);

function getSymbol(node: ExpressionPartNode | null): string | null {
  if (!node) {
    return null;
  }
  if (node.type === 'Text' && (node.role === 'punctuation' || node.role === 'operator')) {
    return node.value;
  }
  if (node.type === 'Parenthesis') {
    return '(';
  }
  return null;
}

function isParamKeyword(node: ExpressionPartNode | null): boolean {
  return Boolean(node && node.type === 'Text' && node.value.toLowerCase() === 'param');
}

function printText(node: TextNode): Doc {
  return node.value;
}

function printComment(node: CommentNode): Doc {
  return ['#', node.value];
}

function printArray(node: ArrayLiteralNode, options: ResolvedOptions): Doc {
  const open = node.kind === 'implicit' ? '@(' : '[';
  const close = node.kind === 'implicit' ? ')' : ']';
  if (node.elements.length === 0) {
    return [open, close];
  }
  const groupId = Symbol('array');
  const elementDocs = node.elements.map((element) => printExpression(element, options));
  const shouldBreak = elementDocs.length > 1;
  const separator: Doc = [',', line];
  const trailing = trailingCommaDoc(options, groupId, elementDocs.length > 0, ',');

  return group([
    open,
    indent([
      shouldBreak ? line : softline,
      join(separator, elementDocs)
    ]),
    trailing,
    shouldBreak ? line : softline,
    close
  ], { id: groupId });
}

function printHashtable(node: HashtableNode, options: ResolvedOptions): Doc {
  const entries = options.sortHashtableKeys
    ? [...node.entries].sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: 'base' }))
    : node.entries;

  if (entries.length === 0) {
    return '@{}';
  }

  const groupId = Symbol('hashtable');

  const entryDocs = entries.map((entry, index) => {
    const entryDoc = printHashtableEntry(entry, options);
    const isLast = index === entries.length - 1;
    const separator = isLast ? trailingCommaDoc(options, groupId, true, ';') : ifBreak('', ';', { groupId });
    return [entryDoc, separator];
  });

  return group([
    '@{',
    indent([line, join(line, entryDocs)]),
    line,
    '}'
  ], { id: groupId });
}

function printHashtableEntry(node: HashtableEntryNode, options: ResolvedOptions): Doc {
  const keyDoc = printExpression(node.rawKey, options);
  const valueDoc = printExpression(node.value, options);
  return group([keyDoc, ' =', indent([line, valueDoc])]);
}

function printHereString(node: HereStringNode): Doc {
  return dedentToRoot(node.value);
}

function printParamParenthesis(node: ParenthesisNode, options: ResolvedOptions): Doc {
  if (node.elements.length === 0) {
    return '()';
  }

  if (node.elements.length <= 1 && !node.hasNewline) {
    return printParenthesis(node, options);
  }

  const groupId = Symbol('param');
  const elementDocs = node.elements.map((element) => printExpression(element, options));
  const separator: Doc = [',', hardline];

  return group([
    '(',
    indent([hardline, join(separator, elementDocs)]),
    hardline,
    ')'
  ], { id: groupId });
}

function printParenthesis(node: ParenthesisNode, options: ResolvedOptions): Doc {
  if (node.elements.length === 0) {
    return '()';
  }
  const groupId = Symbol('parenthesis');
  const elementDocs = node.elements.map((element) => printExpression(element, options));
  if (elementDocs.length === 1 && !node.hasNewline) {
    return group([
      '(',
      indent([softline, elementDocs[0]!]),
      softline,
      ')'
    ], { id: groupId });
  }

  const hasComma = node.hasComma;
    const forceMultiline = node.hasNewline || (!node.hasComma && elementDocs.length > 1);
    const separator: Doc = hasComma
      ? [',', forceMultiline ? hardline : line]
      : (forceMultiline ? hardline : line);

  return group([
    '(',
    indent([
        forceMultiline ? hardline : hasComma ? line : softline,
      join(separator, elementDocs)
    ]),
      forceMultiline ? hardline : hasComma ? line : softline,
    ')'
  ], { id: groupId });
}

function trailingCommaDoc(
  options: ResolvedOptions,
  groupId: symbol,
  hasElements: boolean,
  delimiter: ',' | ';'
): Doc {
  if (!hasElements) {
    return '';
  }
  switch (options.trailingComma) {
    case 'all':
      return delimiter;
    case 'multiline':
      return ifBreak(delimiter, '', { groupId });
    case 'none':
    default:
      return '';
  }
}

export function createPrinter(): Printer<ScriptNode> {
  return powerShellPrinter;
}
