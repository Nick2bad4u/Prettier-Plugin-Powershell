/**
 * Array literal node representing both explicit `@(...)` and implicit forms.
 */
export interface ArrayLiteralNode extends BaseNode {
    elements: ExpressionNode[];
    kind: "explicit" | "implicit";
    type: "ArrayLiteral";
}

/**
 * Base shape shared by all PowerShell AST nodes.
 */
export interface BaseNode {
    loc: SourceLocation;
    type: string;
}

/**
 * Explicit blank-line placeholder node used to preserve vertical spacing.
 */
export interface BlankLineNode extends BaseNode {
    count: number;
    type: "BlankLine";
}

/**
 * Inline comment node.
 */
export interface CommentNode extends BaseNode {
    inline: boolean;
    style: "block" | "line";
    type: "Comment";
    value: string;
}

/**
 * Generic expression node.
 */
export interface ExpressionNode extends BaseNode {
    parts: ExpressionPartNode[];
    type: "Expression";
}

/**
 * Node union for parts that may appear inside an expression.
 */
export type ExpressionPartNode =
    | ArrayLiteralNode
    | HashtableNode
    | HereStringNode
    | ParenthesisNode
    | ScriptBlockNode
    | TextNode;

/**
 * Function declaration node.
 */
export interface FunctionDeclarationNode extends BaseNode {
    body: ScriptBlockNode;
    header: ExpressionNode;
    type: "FunctionDeclaration";
}

/**
 * Hashtable key-value entry node.
 */
export interface HashtableEntryNode extends BaseNode {
    key: string;
    leadingComments?: CommentNode[];
    rawKey: ExpressionNode;
    trailingComments?: CommentNode[];
    type: "HashtableEntry";
    value: ExpressionNode;
}

/**
 * Hashtable literal node.
 */
export interface HashtableNode extends BaseNode {
    entries: HashtableEntryNode[];
    type: "Hashtable";
}

/**
 * Embedded here-string node preserving delimiter quote style.
 */
export interface HereStringNode extends BaseNode {
    quote: "double" | "single";
    type: "HereString";
    value: string;
}

/**
 * Parenthesized expression node.
 */
export interface ParenthesisNode extends BaseNode {
    elements: ExpressionNode[];
    hasComma: boolean;
    hasNewline: boolean;
    type: "Parenthesis";
}

/**
 * Pipeline node, including optional trailing comment.
 */
export interface PipelineNode extends BaseNode {
    segments: ExpressionNode[];
    trailingComment?: CommentNode;
    type: "Pipeline";
}

/**
 * Script block node (`{ ... }`).
 */
export interface ScriptBlockNode extends BaseNode {
    body: ScriptBodyNode[];
    type: "ScriptBlock";
}

/**
 * Node union allowed in script and script-block bodies.
 */
export type ScriptBodyNode =
    | BlankLineNode
    | CommentNode
    | FunctionDeclarationNode
    | PipelineNode;

/**
 * Script root node.
 */
export interface ScriptNode extends BaseNode {
    body: ScriptBodyNode[];
    type: "Script";
}

/**
 * Source range boundaries expressed as zero-based offsets in the original
 * input.
 */
export interface SourceLocation {
    end: number;
    start: number;
}

/**
 * Plain text atom node emitted by the parser for unstructured expressions.
 */
export interface TextNode extends BaseNode {
    role: TokenRole;
    type: "Text";
    value: string;
}

/**
 * Text token role metadata used by printer spacing and casing logic.
 */
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
 *
 * @typeParam T - Concrete node type.
 *
 * @param node - Node to clone.
 *
 * @returns Deep-cloned node.
 */
export function cloneNode<T extends BaseNode>(node: Readonly<T>): T {
    const cloned = {
        ...node,
        loc: { ...node.loc },
    } as T;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
    if ("body" in cloned && Array.isArray((cloned as any).body)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
        (cloned as any).body = [...(cloned as any).body];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
    if ("parts" in cloned && Array.isArray((cloned as any).parts)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
        (cloned as any).parts = [...(cloned as any).parts];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
    if ("segments" in cloned && Array.isArray((cloned as any).segments)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
        (cloned as any).segments = [...(cloned as any).segments];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
    if ("elements" in cloned && Array.isArray((cloned as any).elements)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
        (cloned as any).elements = [...(cloned as any).elements];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
    if ("entries" in cloned && Array.isArray((cloned as any).entries)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
        (cloned as any).entries = [...(cloned as any).entries];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
    if ("parameters" in cloned && Array.isArray((cloned as any).parameters)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clone helper must access optional structural arrays by runtime key.
        (cloned as any).parameters = [...(cloned as any).parameters];
    }

    return cloned;
}

/**
 * Creates a normalized source location ensuring non-negative monotonically
 * increasing offsets.
 *
 * @param start - Start offset.
 * @param end - Optional end offset; defaults to `start`.
 *
 * @returns Normalized location.
 */
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
    const normalizedEnd = Math.max(candidateEnd, normalizedStart);

    return {
        end: normalizedEnd,
        start: normalizedStart,
    } satisfies SourceLocation;
}

/**
 * Determines whether a node is an array-literal node.
 */
export function isArrayLiteralNode(
    node: Readonly<BaseNode>
): node is ArrayLiteralNode {
    return node.type === "ArrayLiteral";
}

/**
 * Determines whether a node is a comment node.
 */
export function isCommentNode(node: Readonly<BaseNode>): node is CommentNode {
    return node.type === "Comment";
}

/**
 * Determines whether a node is a function-declaration node.
 */
export function isFunctionDeclarationNode(
    node: Readonly<BaseNode>
): node is FunctionDeclarationNode {
    return node.type === "FunctionDeclaration";
}

/**
 * Determines whether a node is a hashtable node.
 */
export function isHashtableNode(
    node: Readonly<BaseNode>
): node is HashtableNode {
    return node.type === "Hashtable";
}

/**
 * Determines whether a node is a here-string node.
 */
export function isHereStringNode(
    node: Readonly<BaseNode>
): node is HereStringNode {
    return node.type === "HereString";
}

/**
 * Generic runtime node-type guard.
 *
 * @typeParam Type - Requested node discriminator.
 * @typeParam Node - Candidate node union.
 *
 * @param node - Candidate node.
 * @param type - Node `type` discriminator.
 *
 * @returns Whether the candidate matches `type`.
 */
export function isNodeType<
    Type extends BaseNode["type"],
    Node extends BaseNode = BaseNode,
>(
    node: null | Readonly<Node> | undefined,
    type: Type
): node is Extract<Node, { type: Type }> {
    return node?.type === type;
}

/**
 * Determines whether a node is a pipeline node.
 */
export function isPipelineNode(node: Readonly<BaseNode>): node is PipelineNode {
    return node.type === "Pipeline";
}

/**
 * Determines whether a node is a script-block node.
 */
export function isScriptBlockNode(
    node: Readonly<BaseNode>
): node is ScriptBlockNode {
    return node.type === "ScriptBlock";
}

/**
 * Determines whether a node is the script root node.
 */
export function isScriptNode(node: Readonly<BaseNode>): node is ScriptNode {
    return node.type === "Script";
}

/**
 * Runtime export bundle used by tests that assert availability of AST helpers.
 */
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
