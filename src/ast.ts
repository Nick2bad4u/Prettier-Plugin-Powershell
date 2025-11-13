export interface SourceLocation {
    start: number;
    end: number;
}

export interface BaseNode {
    type: string;
    loc: SourceLocation;
}

export interface ScriptNode extends BaseNode {
    type: "Script";
    body: ScriptBodyNode[];
}

export type ScriptBodyNode =
    | PipelineNode
    | FunctionDeclarationNode
    | CommentNode
    | BlankLineNode;

export interface BlankLineNode extends BaseNode {
    type: "BlankLine";
    count: number;
}

export interface CommentNode extends BaseNode {
    type: "Comment";
    value: string;
    inline: boolean;
    style: "line" | "block";
}

export interface FunctionDeclarationNode extends BaseNode {
    type: "FunctionDeclaration";
    header: ExpressionNode;
    body: ScriptBlockNode;
}

export interface ScriptBlockNode extends BaseNode {
    type: "ScriptBlock";
    body: ScriptBodyNode[];
}

export interface PipelineNode extends BaseNode {
    type: "Pipeline";
    segments: ExpressionNode[];
    trailingComment?: CommentNode;
}

export interface ExpressionNode extends BaseNode {
    type: "Expression";
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
    | "word"
    | "operator"
    | "punctuation"
    | "string"
    | "number"
    | "variable"
    | "keyword"
    | "unknown";

export interface TextNode extends BaseNode {
    type: "Text";
    value: string;
    role: TokenRole;
}

export interface HereStringNode extends BaseNode {
    type: "HereString";
    quote: "double" | "single";
    value: string;
}

export interface HashtableNode extends BaseNode {
    type: "Hashtable";
    entries: HashtableEntryNode[];
}

export interface HashtableEntryNode extends BaseNode {
    type: "HashtableEntry";
    key: string;
    rawKey: ExpressionNode;
    value: ExpressionNode;
    leadingComments?: CommentNode[];
    trailingComments?: CommentNode[];
}

export interface ArrayLiteralNode extends BaseNode {
    type: "ArrayLiteral";
    elements: ExpressionNode[];
    kind: "implicit" | "explicit";
}

export interface ParenthesisNode extends BaseNode {
    type: "Parenthesis";
    elements: ExpressionNode[];
    hasComma: boolean;
    hasNewline: boolean;
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
        candidateEnd < normalizedStart ? normalizedStart : candidateEnd;
    return {
        start: normalizedStart,
        end: normalizedEnd,
    } satisfies SourceLocation;
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    if ("body" in cloned && Array.isArray((cloned as any).body)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        (cloned as any).body = [...(cloned as any).body];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    if ("parts" in cloned && Array.isArray((cloned as any).parts)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        (cloned as any).parts = [...(cloned as any).parts];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    if ("segments" in cloned && Array.isArray((cloned as any).segments)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        (cloned as any).segments = [...(cloned as any).segments];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    if ("elements" in cloned && Array.isArray((cloned as any).elements)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        (cloned as any).elements = [...(cloned as any).elements];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    if ("entries" in cloned && Array.isArray((cloned as any).entries)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        (cloned as any).entries = [...(cloned as any).entries];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    if ("parameters" in cloned && Array.isArray((cloned as any).parameters)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        (cloned as any).parameters = [...(cloned as any).parameters];
    }

    return cloned;
}

/**
 * Type guard to check if a node is a ScriptNode.
 */
export function isScriptNode(node: BaseNode): node is ScriptNode {
    return node.type === "Script";
}

/**
 * Type guard to check if a node is a PipelineNode.
 */
export function isPipelineNode(node: BaseNode): node is PipelineNode {
    return node.type === "Pipeline";
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
 * Type guard to check if a node is a ScriptBlockNode.
 */
export function isScriptBlockNode(node: BaseNode): node is ScriptBlockNode {
    return node.type === "ScriptBlock";
}

/**
 * Type guard to check if a node is a HashtableNode.
 */
export function isHashtableNode(node: BaseNode): node is HashtableNode {
    return node.type === "Hashtable";
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
 * Type guard to check if a node is a HereStringNode.
 */
export function isHereStringNode(node: BaseNode): node is HereStringNode {
    return node.type === "HereString";
}

export const runtimeExports: Readonly<{
    createLocation: typeof createLocation;
    isNodeType: typeof isNodeType;
    cloneNode: typeof cloneNode;
    isScriptNode: typeof isScriptNode;
    isPipelineNode: typeof isPipelineNode;
    isFunctionDeclarationNode: typeof isFunctionDeclarationNode;
    isScriptBlockNode: typeof isScriptBlockNode;
    isHashtableNode: typeof isHashtableNode;
    isArrayLiteralNode: typeof isArrayLiteralNode;
    isCommentNode: typeof isCommentNode;
    isHereStringNode: typeof isHereStringNode;
}> = Object.freeze({
    createLocation,
    isNodeType,
    cloneNode,
    isScriptNode,
    isPipelineNode,
    isFunctionDeclarationNode,
    isScriptBlockNode,
    isHashtableNode,
    isArrayLiteralNode,
    isCommentNode,
    isHereStringNode,
});
