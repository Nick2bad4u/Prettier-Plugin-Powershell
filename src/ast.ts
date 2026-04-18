export interface ArrayLiteralNode extends BaseNode {
    elements: ExpressionNode[];
    kind: "explicit" | "implicit";
    type: "ArrayLiteral";
}

export interface BaseNode {
    loc: SourceLocation;
    type: string;
}

export interface BlankLineNode extends BaseNode {
    count: number;
    type: "BlankLine";
}

export interface CommentNode extends BaseNode {
    inline: boolean;
    style: "block" | "line";
    type: "Comment";
    value: string;
}

export interface ExpressionNode extends BaseNode {
    parts: ExpressionPartNode[];
    type: "Expression";
}

export type ExpressionPartNode =
    | ArrayLiteralNode
    | HashtableNode
    | HereStringNode
    | ParenthesisNode
    | ScriptBlockNode
    | TextNode;

export interface FunctionDeclarationNode extends BaseNode {
    body: ScriptBlockNode;
    header: ExpressionNode;
    type: "FunctionDeclaration";
}

export interface HashtableEntryNode extends BaseNode {
    key: string;
    leadingComments?: CommentNode[];
    rawKey: ExpressionNode;
    trailingComments?: CommentNode[];
    type: "HashtableEntry";
    value: ExpressionNode;
}

export interface HashtableNode extends BaseNode {
    entries: HashtableEntryNode[];
    type: "Hashtable";
}

export interface HereStringNode extends BaseNode {
    quote: "double" | "single";
    type: "HereString";
    value: string;
}

export interface ParenthesisNode extends BaseNode {
    elements: ExpressionNode[];
    hasComma: boolean;
    hasNewline: boolean;
    type: "Parenthesis";
}

export interface PipelineNode extends BaseNode {
    segments: ExpressionNode[];
    trailingComment?: CommentNode;
    type: "Pipeline";
}

export interface ScriptBlockNode extends BaseNode {
    body: ScriptBodyNode[];
    type: "ScriptBlock";
}

export type ScriptBodyNode =
    | BlankLineNode
    | CommentNode
    | FunctionDeclarationNode
    | PipelineNode;

export interface ScriptNode extends BaseNode {
    body: ScriptBodyNode[];
    type: "Script";
}

export interface SourceLocation {
    end: number;
    start: number;
}

export interface TextNode extends BaseNode {
    role: TokenRole;
    type: "Text";
    value: string;
}

export type TokenRole =
    | "keyword"
    | "number"
    | "operator"
    | "punctuation"
    | "string"
    | "unknown"
    | "variable"
    | "word";

/**
 * Creates a deep clone of an AST node, including nested arrays and objects.
 * This ensures that modifications to the cloned node don't affect the
 * original.
 */
export function cloneNode<T extends BaseNode>(node: T): T {
    const cloned = {
        ...node,
        loc: { ...node.loc },
    } as T;

    // Deep clone nested arrays to prevent shared references
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("body" in cloned && Array.isArray((cloned as any).body)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cloned as any).body = [...(cloned as any).body];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("parts" in cloned && Array.isArray((cloned as any).parts)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cloned as any).parts = [...(cloned as any).parts];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("segments" in cloned && Array.isArray((cloned as any).segments)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cloned as any).segments = [...(cloned as any).segments];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("elements" in cloned && Array.isArray((cloned as any).elements)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cloned as any).elements = [...(cloned as any).elements];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("entries" in cloned && Array.isArray((cloned as any).entries)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cloned as any).entries = [...(cloned as any).entries];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("parameters" in cloned && Array.isArray((cloned as any).parameters)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cloned as any).parameters = [...(cloned as any).parameters];
    }

    return cloned;
}

export function createLocation(
    start: number,
    end: number = start
): SourceLocation {
    const normalizedStart = Number.isFinite(start)
        ? Math.max(0, Math.floor(start))
        : 0;
    const candidateEnd = Number.isFinite(end)
        ? Math.floor(end)
        : normalizedStart;
    const normalizedEnd =
        Math.max(candidateEnd, normalizedStart);
    return {
        end: normalizedEnd,
        start: normalizedStart,
    } satisfies SourceLocation;
}

/**
 * Type guard to check if a node is an ArrayLiteralNode.
 */
export function isArrayLiteralNode(node: BaseNode): node is ArrayLiteralNode {
    return node.type === "ArrayLiteral";
}

/**
 * Type guard to check if a node is a CommentNode.
 */
export function isCommentNode(node: BaseNode): node is CommentNode {
    return node.type === "Comment";
}

/**
 * Type guard to check if a node is a FunctionDeclarationNode.
 */
export function isFunctionDeclarationNode(
    node: BaseNode
): node is FunctionDeclarationNode {
    return node.type === "FunctionDeclaration";
}

/**
 * Type guard to check if a node is a HashtableNode.
 */
export function isHashtableNode(node: BaseNode): node is HashtableNode {
    return node.type === "Hashtable";
}

/**
 * Type guard to check if a node is a HereStringNode.
 */
export function isHereStringNode(node: BaseNode): node is HereStringNode {
    return node.type === "HereString";
}

export function isNodeType<
    Type extends BaseNode["type"],
    Node extends BaseNode = BaseNode,
>(
    node: Node | null | undefined,
    type: Type
): node is Extract<Node, { type: Type }> {
    return Boolean(node && node.type === type);
}

/**
 * Type guard to check if a node is a PipelineNode.
 */
export function isPipelineNode(node: BaseNode): node is PipelineNode {
    return node.type === "Pipeline";
}

/**
 * Type guard to check if a node is a ScriptBlockNode.
 */
export function isScriptBlockNode(node: BaseNode): node is ScriptBlockNode {
    return node.type === "ScriptBlock";
}

/**
 * Type guard to check if a node is a ScriptNode.
 */
export function isScriptNode(node: BaseNode): node is ScriptNode {
    return node.type === "Script";
}

export const runtimeExports: Readonly<{
    cloneNode: typeof cloneNode;
    createLocation: typeof createLocation;
    isArrayLiteralNode: typeof isArrayLiteralNode;
    isCommentNode: typeof isCommentNode;
    isFunctionDeclarationNode: typeof isFunctionDeclarationNode;
    isHashtableNode: typeof isHashtableNode;
    isHereStringNode: typeof isHereStringNode;
    isNodeType: typeof isNodeType;
    isPipelineNode: typeof isPipelineNode;
    isScriptBlockNode: typeof isScriptBlockNode;
    isScriptNode: typeof isScriptNode;
}> = Object.freeze({
    cloneNode,
    createLocation,
    isArrayLiteralNode,
    isCommentNode,
    isFunctionDeclarationNode,
    isHashtableNode,
    isHereStringNode,
    isNodeType,
    isPipelineNode,
    isScriptBlockNode,
    isScriptNode,
});
