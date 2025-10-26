export interface SourceLocation {
  start: number;
  end: number;
}

export interface BaseNode {
  type: string;
  loc: SourceLocation;
}

export interface ScriptNode extends BaseNode {
  type: 'Script';
  body: ScriptBodyNode[];
}

export type ScriptBodyNode = PipelineNode | FunctionDeclarationNode | CommentNode | BlankLineNode;

export interface BlankLineNode extends BaseNode {
  type: 'BlankLine';
  count: number;
}

export interface CommentNode extends BaseNode {
  type: 'Comment';
  value: string;
  inline: boolean;
}

export interface FunctionDeclarationNode extends BaseNode {
  type: 'FunctionDeclaration';
  header: ExpressionNode;
  body: ScriptBlockNode;
}

export interface ScriptBlockNode extends BaseNode {
  type: 'ScriptBlock';
  body: ScriptBodyNode[];
}

export interface PipelineNode extends BaseNode {
  type: 'Pipeline';
  segments: ExpressionNode[];
  trailingComment?: CommentNode;
}

export interface ExpressionNode extends BaseNode {
  type: 'Expression';
  parts: ExpressionPartNode[];
}

export type ExpressionPartNode =
  | TextNode
  | HashtableNode
  | ArrayLiteralNode
  | ScriptBlockNode
  | HereStringNode
  | ParenthesisNode;

export type TokenRole =
  | 'word'
  | 'operator'
  | 'punctuation'
  | 'string'
  | 'number'
  | 'variable'
  | 'keyword'
  | 'unknown';

export interface TextNode extends BaseNode {
  type: 'Text';
  value: string;
  role: TokenRole;
}

export interface HereStringNode extends BaseNode {
  type: 'HereString';
  quote: 'double' | 'single';
  value: string;
}

export interface HashtableNode extends BaseNode {
  type: 'Hashtable';
  entries: HashtableEntryNode[];
}

export interface HashtableEntryNode extends BaseNode {
  type: 'HashtableEntry';
  key: string;
  rawKey: ExpressionNode;
  value: ExpressionNode;
}

export interface ArrayLiteralNode extends BaseNode {
  type: 'ArrayLiteral';
  elements: ExpressionNode[];
  kind: 'implicit' | 'explicit';
}

export interface ParenthesisNode extends BaseNode {
  type: 'Parenthesis';
  elements: ExpressionNode[];
  hasComma: boolean;
  hasNewline: boolean;
}
